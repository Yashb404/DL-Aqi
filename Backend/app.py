import os
import numpy as np
import rasterio
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from PIL import Image
import json
import cv2
import traceback

app = Flask(__name__)
CORS(app)

# Define the SRCNN model architecture manually instead of loading it
print("Creating SRCNN model manually...")
model = tf.keras.models.Sequential([
    tf.keras.layers.InputLayer(input_shape=(None, None, 1)),
    tf.keras.layers.Conv2D(64, (9, 9), activation='relu', padding='same'),
    tf.keras.layers.Conv2D(32, (1, 1), activation='relu', padding='same'),
    tf.keras.layers.Conv2D(1, (5, 5), activation='linear', padding='same')
])
model.compile(optimizer='adam', loss='mse', metrics=['mae'])

# Try to load weights if the file exists
model_path = os.path.join(os.path.dirname(__file__), 'model', 'srcnn_model.h5')
if os.path.exists(model_path):
    try:
        model.load_weights(model_path)
        print(f"Model weights loaded from {model_path}")
    except Exception as e:
        print(f"Warning: Could not load model weights. Using randomly initialized weights. Error: {e}")
        print("This is fine for demonstration purposes, but will not provide accurate super-resolution.")
else:
    print(f"Warning: Model file not found at {model_path}. Using randomly initialized weights.")
    print("This is fine for demonstration purposes, but will not provide accurate super-resolution.")

# GeoTIFF file path - update this to your actual file path
GEOTIFF_PATH = os.path.join(os.path.dirname(__file__), 'data', 'Delhi_NO2_Jan2023.tif')

# Check if the GeoTIFF file exists
if not os.path.exists(GEOTIFF_PATH):
    print(f"Warning: GeoTIFF file not found at {GEOTIFF_PATH}")
    print("The API will still run, but will return mock data instead of actual AQI data.")

# Cache the transformation parameters
transform = None
bounds = None
# Set default bounds for Delhi
DEFAULT_BOUNDS = (77.0, 28.4, 77.4, 28.8)  # (left, bottom, right, top) or (west, south, east, north)

# Initialize the geotiff data
def init_geotiff():
    global transform, bounds
    try:
        if os.path.exists(GEOTIFF_PATH):
            with rasterio.open(GEOTIFF_PATH) as src:
                transform = src.transform
                bounds = src.bounds
                print(f"GeoTIFF loaded: {GEOTIFF_PATH}")
                print(f"Bounds: {bounds}")
        else:
            raise FileNotFoundError(f"GeoTIFF file not found: {GEOTIFF_PATH}")
    except Exception as e:
        print(f"Error loading GeoTIFF: {e}")
        # Set default bounds for Delhi
        bounds = DEFAULT_BOUNDS
        print(f"Using default bounds for Delhi: {bounds}")

# Convert pixel coordinates to geographic coordinates
def pixel_to_geo(row, col):
    try:
        if transform is not None:
            return rasterio.transform.xy(transform, row, col)
        else:
            # Fallback with mock data if transform isn't available
            lon = bounds[0] + (bounds[2] - bounds[0]) * (col / 1000)
            lat = bounds[1] + (bounds[3] - bounds[1]) * (row / 1000)
            return lon, lat
    except Exception as e:
        print(f"Error in pixel_to_geo: {e}")
        # Emergency fallback
        lon = DEFAULT_BOUNDS[0] + (DEFAULT_BOUNDS[2] - DEFAULT_BOUNDS[0]) * (col / 1000)
        lat = DEFAULT_BOUNDS[1] + (DEFAULT_BOUNDS[3] - DEFAULT_BOUNDS[1]) * (row / 1000)
        return lon, lat

# Convert geographic coordinates to pixel coordinates
def geo_to_pixel(lon, lat):
    try:
        if transform is not None:
            return rasterio.transform.rowcol(transform, lon, lat)
        else:
            # Fallback with mock data if transform isn't available
            row = int(1000 * (lat - bounds[1]) / (bounds[3] - bounds[1]))
            col = int(1000 * (lon - bounds[0]) / (bounds[2] - bounds[0]))
            return row, col
    except Exception as e:
        print(f"Error in geo_to_pixel: {e}")
        # Emergency fallback
        row = int(1000 * (lat - DEFAULT_BOUNDS[1]) / (DEFAULT_BOUNDS[3] - DEFAULT_BOUNDS[1]))
        col = int(1000 * (lon - DEFAULT_BOUNDS[0]) / (DEFAULT_BOUNDS[2] - DEFAULT_BOUNDS[0]))
        return row, col

# Get AQI color based on value
def get_aqi_color(aqi_value):
    if aqi_value <= 50:
        return "#00E400"  # Green - Good
    elif aqi_value <= 100:
        return "#FFFF00"  # Yellow - Moderate
    elif aqi_value <= 150:
        return "#FF7E00"  # Orange - Unhealthy for sensitive groups
    elif aqi_value <= 200:
        return "#FF0000"  # Red - Unhealthy
    elif aqi_value <= 300:
        return "#99004C"  # Purple - Very unhealthy
    else:
        return "#7E0023"  # Maroon - Hazardous

@app.route('/api/get_air_quality', methods=['POST'])
def get_air_quality():
    try:
        data = request.json
        print(f"Received request with data: {data}")
        
        # Extract bounds from request
        lat_min = data.get('lat_min', 28.4)
        lat_max = data.get('lat_max', 28.9)
        lon_min = data.get('lon_min', 76.8)
        lon_max = data.get('lon_max', 77.4)
        zoom_level = data.get('zoom_level', 10)
        
        # Validate bounds
        if not all(isinstance(x, (int, float)) for x in [lat_min, lat_max, lon_min, lon_max, zoom_level]):
            print(f"Invalid bounds: lat_min={lat_min}, lat_max={lat_max}, lon_min={lon_min}, lon_max={lon_max}")
            return generate_mock_data(28.4, 28.9, 76.8, 77.4, 10)
        
        # For too large areas, provide less detailed data
        if abs(lat_max - lat_min) > 2 or abs(lon_max - lon_min) > 2:
            print("Area too large, using simplified data")
            return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
    
        try:
            if os.path.exists(GEOTIFF_PATH):
                with rasterio.open(GEOTIFF_PATH) as src:
                    try:
                        # Convert geographic bounds to pixel coordinates
                        row_min, col_min = geo_to_pixel(lon_min, lat_max)  # Upper left
                        row_max, col_max = geo_to_pixel(lon_max, lat_min)  # Lower right
                        
                        # Ensure coordinates are within bounds
                        row_min = max(0, min(row_min, src.height - 1))
                        row_max = max(0, min(row_max, src.height - 1))
                        col_min = max(0, min(col_min, src.width - 1))
                        col_max = max(0, min(col_max, src.width - 1))
                        
                        # Make sure we have a valid window
                        if row_min >= row_max or col_min >= col_max:
                            print(f"Invalid window: rows({row_min},{row_max}), cols({col_min},{col_max})")
                            return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
                        
                        # Read data within bounds
                        window = ((row_min, row_max), (col_min, col_max))
                        raster_data = src.read(1, window=window)
                        
                        # Check if we got any valid data
                        if raster_data.size == 0 or np.all(np.isnan(raster_data)):
                            print("Empty or NaN data from raster")
                            return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
                        
                        # If zoom level is high, apply super-resolution
                        if zoom_level >= 12:
                            try:
                                # Normalize safely with handling for edge cases
                                data_min = np.nanmin(raster_data) if raster_data.size > 0 else 0
                                data_max = np.nanmax(raster_data) if raster_data.size > 0 else 255
                                
                                # Handle case where min == max (constant values)
                                if data_max == data_min:
                                    data_norm = np.zeros_like(raster_data, dtype=np.float32)
                                else:
                                    data_norm = (raster_data - data_min) / (data_max - data_min)
                                
                                # Replace NaNs with zeros
                                data_norm = np.nan_to_num(data_norm)
                                
                                data_input = np.expand_dims(np.expand_dims(data_norm, axis=0), axis=-1)
                                
                                # Apply model
                                data_sr = model.predict(data_input, verbose=0)[0, :, :, 0]
                                
                                # Scale back
                                if data_max != data_min:
                                    raster_data = (data_sr * (data_max - data_min) + data_min).astype(np.float32)
                                else:
                                    raster_data = np.full_like(data_sr, data_min, dtype=np.float32)
                            except Exception as e:
                                print(f"Error in super-resolution: {e}")
                                # Continue with original data if SR fails
                        
                        # Sample points for the response
                        # The higher the zoom level, the more points we include
                        sample_rate = max(1, int(raster_data.shape[0] * raster_data.shape[1] / (500 * zoom_level / 10)))
                        
                        features = []
                        for i in range(0, raster_data.shape[0], sample_rate):
                            for j in range(0, raster_data.shape[1], sample_rate):
                                if i < raster_data.shape[0] and j < raster_data.shape[1]:
                                    try:
                                        # Get pixel value
                                        value = float(raster_data[i, j])
                                        
                                        # Skip NaN values
                                        if np.isnan(value):
                                            continue
                                        
                                        # Convert to AQI scale (0-500)
                                        # You may need to adjust this scaling based on your data
                                        aqi = min(500, max(0, int(value * 500 / 255)))
                                        
                                        # Get coordinates
                                        lon, lat = pixel_to_geo(row_min + i, col_min + j)
                                        
                                        features.append({
                                            "type": "Feature",
                                            "properties": {
                                                "aqi": aqi,
                                                "color": get_aqi_color(aqi)
                                            },
                                            "geometry": {
                                                "type": "Point",
                                                "coordinates": [lon, lat]
                                            }
                                        })
                                    except Exception as e:
                                        print(f"Error processing point at ({i},{j}): {e}")
                                        continue
                        
                        # If we have no features (maybe all NaNs), return mock data
                        if not features:
                            print("No valid features found in raster data")
                            return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
                        
                        return jsonify({
                            "type": "FeatureCollection",
                            "features": features
                        })
                    except Exception as e:
                        print(f"Error processing raster: {e}")
                        print(traceback.format_exc())
                        return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
            else:
                # Generate mock data if GeoTIFF is missing
                return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
                
        except Exception as e:
            print(f"Error opening GeoTIFF: {e}")
            print(traceback.format_exc())
            return generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
            
    except Exception as e:
        print(f"Unhandled exception in get_air_quality: {e}")
        print(traceback.format_exc())
        # Emergency fallback - always return something
        return generate_mock_data(28.4, 28.9, 76.8, 77.4, 10)

def generate_mock_data(lat_min, lat_max, lon_min, lon_max, zoom_level):
    """Generate mock AQI data for a given region"""
    try:
        features = []
        # Adjust density based on zoom level
        grid_size = int(5 + zoom_level / 2)
        grid_size = min(max(grid_size, 5), 30)  # Keep grid size reasonable
        
        for i in range(grid_size):
            for j in range(grid_size):
                try:
                    # Create a grid of points covering the region
                    lat = lat_min + (lat_max - lat_min) * (i / (grid_size - 1 or 1))
                    lon = lon_min + (lon_max - lon_min) * (j / (grid_size - 1 or 1))
                    
                    # Generate AQI values that increase from northwest to southeast
                    # This creates a mock pollution gradient
                    base_aqi = 50 + (i + j) * 5
                    # Add some random variation
                    aqi = min(500, max(0, int(base_aqi + np.random.normal(0, 20))))
                    
                    features.append({
                        "type": "Feature",
                        "properties": {
                            "aqi": aqi,
                            "color": get_aqi_color(aqi)
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lon, lat]
                        }
                    })
                except Exception as e:
                    print(f"Error generating mock point: {e}")
                    continue
        
        # Emergency fallback - if no points were generated, create at least one
        if not features:
            center_lat = (lat_min + lat_max) / 2
            center_lon = (lon_min + lon_max) / 2
            features.append({
                "type": "Feature",
                "properties": {
                    "aqi": 150,
                    "color": get_aqi_color(150)
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [center_lon, center_lat]
                }
            })
        
        return jsonify({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        print(f"Error in generate_mock_data: {e}")
        print(traceback.format_exc())
        # Ultimate fallback - hardcoded response
        return jsonify({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {
                    "aqi": 150,
                    "color": "#FF7E00"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.2, 28.6]
                }
            }]
        })

@app.route('/api/get_forecast', methods=['POST'])
def get_forecast():
    # This would typically connect to a forecasting model
    # For now, we'll return dummy data
    try:
        return jsonify({
            "forecast": [
                {"day": "Today", "aqi": 120, "color": "#FF7E00"},
                {"day": "Tomorrow", "aqi": 150, "color": "#FF7E00"},
                {"day": "Day 3", "aqi": 180, "color": "#FF0000"}
            ]
        })
    except Exception as e:
        print(f"Error in get_forecast: {e}")
        # Fallback
        return jsonify({
            "forecast": [
                {"day": "Today", "aqi": 120, "color": "#FF7E00"},
                {"day": "Tomorrow", "aqi": 150, "color": "#FF7E00"},
                {"day": "Day 3", "aqi": 180, "color": "#FF0000"}
            ]
        })

# Basic test endpoint
@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({"status": "ok", "message": "Server is running"})

if __name__ == '__main__':
    init_geotiff()
    app.run(debug=True, host='0.0.0.0', port=5000) 