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
        MODEL_LOADED = True
    except Exception as e:
        print(f"Error: Could not load model weights. Error: {e}")
        print("The model will not provide accurate super-resolution.")
        MODEL_LOADED = False
else:
    print(f"Error: Model file not found at {model_path}")
    print("Please ensure the model weights file exists.")
    MODEL_LOADED = False

# GeoTIFF file path - update this to your actual file path
GEOTIFF_PATH = os.path.join(os.path.dirname(__file__), 'data', 'Delhi_NO2_Jan2023.tif')

# Check if the GeoTIFF file exists
if not os.path.exists(GEOTIFF_PATH):
    print(f"Error: GeoTIFF file not found at {GEOTIFF_PATH}")
    print("Please ensure the GeoTIFF file exists in the data directory.")
    GEOTIFF_EXISTS = False
else:
    GEOTIFF_EXISTS = True

# Cache the transformation parameters
transform = None
bounds = None
# Set default bounds for Delhi
DEFAULT_BOUNDS = (77.0, 28.4, 77.4, 28.8)  # (left, bottom, right, top) or (west, south, east, north)

# Initialize the geotiff data
def init_geotiff():
    global transform, bounds, GEOTIFF_EXISTS
    try:
        if os.path.exists(GEOTIFF_PATH):
            with rasterio.open(GEOTIFF_PATH) as src:
                transform = src.transform
                bounds = src.bounds
                print(f"GeoTIFF loaded: {GEOTIFF_PATH}")
                print(f"Bounds: {bounds}")
                GEOTIFF_EXISTS = True
        else:
            raise FileNotFoundError(f"GeoTIFF file not found: {GEOTIFF_PATH}")
    except Exception as e:
        print(f"Error loading GeoTIFF: {e}")
       
        bounds = DEFAULT_BOUNDS
        print(f"Using default bounds for Delhi: {bounds}")
        GEOTIFF_EXISTS = False


def pixel_to_geo(row, col):
    try:
        if transform is not None:
            return rasterio.transform.xy(transform, row, col)
        else:
         
            lon = bounds[0] + (bounds[2] - bounds[0]) * (col / 1000)
            lat = bounds[1] + (bounds[3] - bounds[1]) * (row / 1000)
            return lon, lat
    except Exception as e:
        print(f"Error in pixel_to_geo: {e}")
        
        lon = DEFAULT_BOUNDS[0] + (DEFAULT_BOUNDS[2] - DEFAULT_BOUNDS[0]) * (col / 1000)
        lat = DEFAULT_BOUNDS[1] + (DEFAULT_BOUNDS[3] - DEFAULT_BOUNDS[1]) * (row / 1000)
        return lon, lat

# Convert geographic coordinates to pixel coordinates
def geo_to_pixel(lon, lat):
    try:
        if transform is not None:
            
            row, col = rasterio.transform.rowcol(transform, lon, lat)
            
            
            print(f"Converted geo ({lon}, {lat}) to pixel ({row}, {col})")
            
            
            if row < 0 or col < 0 or row > 10000 or col > 10000:
                print(f"Suspicious pixel coordinates: ({row}, {col}), using fallback")
                raise ValueError("Pixel coordinates out of reasonable bounds")
                
            return row, col
        else:
            
            print(f"No transform available, using bounds-based calculation for ({lon}, {lat})")
            if bounds is not None:
                
                norm_x = (lon - bounds[0]) / (bounds[2] - bounds[0])
                norm_y = (lat - bounds[1]) / (bounds[3] - bounds[1])
                
                
                img_height = 1000
                img_width = 1000
                
                
                row = int(img_height * (1 - norm_y))
                col = int(img_width * norm_x)
                
                print(f"Bounds-based conversion: ({lon}, {lat}) -> ({row}, {col})")
                return row, col
            else:
                
                return fallback_geo_to_pixel(lon, lat)
    except Exception as e:
        print(f"Error in geo_to_pixel for ({lon}, {lat}): {e}")
        print(f"Using emergency fallback conversion")
        return fallback_geo_to_pixel(lon, lat)


def fallback_geo_to_pixel(lon, lat):
    
    min_lon, min_lat, max_lon, max_lat = DEFAULT_BOUNDS
    
    
    bounded_lon = max(min_lon, min(lon, max_lon))
    bounded_lat = max(min_lat, min(lat, max_lat))
    
    
    norm_x = (bounded_lon - min_lon) / (max_lon - min_lon)
    norm_y = (bounded_lat - min_lat) / (max_lat - min_lat)
    
    
    col = int(500 * norm_x)
    row = int(500 * (1 - norm_y))  
    
    print(f"Fallback conversion: ({lon}, {lat}) -> ({row}, {col})")
    return row, col


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
            return jsonify({"error": "Invalid bounds parameters"}), 400
        
        # For too large areas, provide less detailed data but still use real data when possible
        use_super_resolution = not (abs(lat_max - lat_min) > 2 or abs(lon_max - lon_min) > 2)
    
        if not GEOTIFF_EXISTS:
            print("Warning: GeoTIFF file not found, using mock data")
            return generate_aqi_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
            
        try:
            with rasterio.open(GEOTIFF_PATH) as src:
                try:
                    # Convert geographic bounds to pixel coordinates
                    row_min, col_min = geo_to_pixel(lon_min, lat_max)  # Upper left
                    row_max, col_max = geo_to_pixel(lon_max, lat_min)  # Lower right
                    
                    print(f"Initial window: rows({row_min},{row_max}), cols({col_min},{col_max})")
                    
                    # Ensure coordinates are within bounds and properly ordered
                    row_min = max(0, min(row_min, src.height - 1))
                    row_max = max(0, min(row_max, src.height - 1))
                    col_min = max(0, min(col_min, src.width - 1))
                    col_max = max(0, min(col_max, src.width - 1))
                    
                    # Swap if needed to ensure row_min < row_max and col_min < col_max
                    if row_min > row_max:
                        row_min, row_max = row_max, row_min
                    if col_min > col_max:
                        col_min, col_max = col_max, col_min
                    
                    # Ensure we have a valid window size (at least 1x1)
                    if row_min == row_max:
                        row_max = min(row_min + 1, src.height - 1)
                    if col_min == col_max:
                        col_max = min(col_min + 1, src.width - 1)
                    
                    print(f"Adjusted window: rows({row_min},{row_max}), cols({col_min},{col_max})")
                    
                    # Make sure we have a valid window
                    if row_min >= row_max or col_min >= col_max:
                        print(f"Invalid window after adjustment: rows({row_min},{row_max}), cols({col_min},{col_max})")
                        return generate_aqi_data(lat_min, lat_max, lon_min, lon_max, zoom_level)
                    
                    # Read data within bounds
                    window = ((row_min, row_max), (col_min, col_max))
                    raster_data = src.read(1, window=window)
                    
                    # Check if we got any valid data
                    if raster_data.size == 0 or np.all(np.isnan(raster_data)):
                        print("Empty or NaN data from raster")
                        return jsonify({"error": "No valid data in selected region"}), 400
                    
                    # If zoom level is high and model is loaded, apply super-resolution
                    if zoom_level >= 12 and use_super_resolution and MODEL_LOADED:
                        print(f"Applying super-resolution at zoom level {zoom_level}")
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
                            
                            # Apply model for super-resolution
                            print("Running SRCNN model for super-resolution...")
                            data_sr = model.predict(data_input, verbose=0)[0, :, :, 0]
                            print(f"Super-resolution complete: Input shape {data_input.shape} → Output shape {data_sr.shape}")
                            
                            # Scale back
                            if data_max != data_min:
                                raster_data = (data_sr * (data_max - data_min) + data_min).astype(np.float32)
                            else:
                                raster_data = np.full_like(data_sr, data_min, dtype=np.float32)
                        except Exception as e:
                            print(f"Error in super-resolution: {e}")
                            print(traceback.format_exc())
                            
                    else:
                        if zoom_level >= 12 and not MODEL_LOADED:
                            print("Super-resolution not applied: Model not loaded")
                        elif zoom_level >= 12 and not use_super_resolution:
                            print("Super-resolution not applied: Area too large")
                        else:
                            print(f"Super-resolution not needed at zoom level {zoom_level}")
                    
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
                                    aqi = min(500, max(0, int(value * 500 / 255)))
                                    
                                    # Get coordinates
                                    lon, lat = pixel_to_geo(row_min + i, col_min + j)
                                    
                                    features.append({
                                        "type": "Feature",
                                        "properties": {
                                            "aqi": aqi,
                                            "color": get_aqi_color(aqi),
                                            "is_model_data": True
                                        },
                                        "geometry": {
                                            "type": "Point",
                                            "coordinates": [lon, lat]
                                        }
                                    })
                                except Exception as e:
                                    print(f"Error processing point at ({i},{j}): {e}")
                                    continue
                    
                    # If we have no features (maybe all NaNs), return appropriate error
                    if not features:
                        print("No valid features found in raster data")
                        return jsonify({"error": "No valid data points in selected region"}), 400
                    
                    return jsonify({
                        "type": "FeatureCollection",
                        "features": features,
                        "metadata": {
                            "used_model": MODEL_LOADED and zoom_level >= 12 and use_super_resolution,
                            "zoom_level": zoom_level,
                            "real_data": True
                        }
                    })
                except Exception as e:
                    print(f"Error processing raster: {e}")
                    print(traceback.format_exc())
                    return jsonify({"error": f"Error processing raster data: {str(e)}"}), 500
        except Exception as e:
            print(f"Error opening GeoTIFF: {e}")
            print(traceback.format_exc())
            return jsonify({"error": f"Error opening GeoTIFF file: {str(e)}"}), 500
            
    except Exception as e:
        print(f"Unhandled exception in get_air_quality: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Unhandled server error: {str(e)}"}), 500

def generate_aqi_data(lat_min, lat_max, lon_min, lon_max, zoom_level):
    """Generate AQI data for a given region"""
    try:
        features = []
        # Adjust density based on zoom level
        grid_size = int(5 + zoom_level / 2)
        grid_size = min(max(grid_size, 5), 30)  # Keep grid size reasonable
        
        print(f"Grid size: {grid_size}x{grid_size} for zoom level {zoom_level}")
        
        for i in range(grid_size):
            for j in range(grid_size):
                try:
                    # Create a grid of points covering the region
                    lat = lat_min + (lat_max - lat_min) * (i / (grid_size - 1 or 1))
                    lon = lon_min + (lon_max - lon_min) * (j / (grid_size - 1 or 1))
                    
                    # Generate AQI value with some variability
                    base_aqi = 50 + (i + j) * 5
                    aqi = min(500, max(0, int(base_aqi + np.random.normal(0, 20))))
                    
                    features.append({
                        "type": "Feature",
                        "properties": {
                            "aqi": aqi,
                            "color": get_aqi_color(aqi),
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lon, lat]
                        }
                    })
                except Exception as e:
                    print(f"Error generating point: {e}")
                    continue
        
        # Fallback - if no points were generated, create at least one
        if not features:
            center_lat = (lat_min + lat_max) / 2
            center_lon = (lon_min + lon_max) / 2
            features.append({
                "type": "Feature",
                "properties": {
                    "aqi": 150,
                    "color": get_aqi_color(150),
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [center_lon, center_lat]
                }
            })
        
        print(f"Generated {len(features)} data points")
        
        return jsonify({
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "zoom_level": zoom_level,
                "real_data": False
            }
        })
    except Exception as e:
        print(f"Error in generate_aqi_data: {e}")
        print(traceback.format_exc())
        # Ultimate fallback - hardcoded response
        return jsonify({
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {
                    "aqi": 150,
                    "color": "#FF7E00",
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [77.2, 28.6]
                }
            }],
            "metadata": {
                "zoom_level": zoom_level,
                "real_data": False,
                "is_emergency_fallback": True
            }
        })

@app.route('/api/get_forecast', methods=['POST'])
def get_forecast():
    # This would typically connect to a forecasting model
    # But we did not implement it 
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

@app.route('/api/model_status', methods=['GET'])
def model_status():
    """Return the status of the model and data files"""
    return jsonify({
        "model_loaded": MODEL_LOADED,
        "geotiff_exists": GEOTIFF_EXISTS,
        "model_path": model_path,
        "geotiff_path": GEOTIFF_PATH
    })

if __name__ == '__main__':
    init_geotiff()
    app.run(debug=True, host='0.0.0.0', port=5000) 