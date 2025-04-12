# AQI Backend API

This is the backend API server for the Delhi AQI visualization application. It processes GeoTIFF data using super-resolution to provide high-resolution AQI data for the frontend visualization.

## Features

- Serves processed AQI data from GeoTIFF files
- Uses SRCNN (Super-Resolution Convolutional Neural Network) model to enhance resolution
- Provides data in GeoJSON format for easy mapping
- Dynamically adapts resolution based on zoom level

## Setup

1. Create a Python virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Ensure your GeoTIFF data is in the `data` directory (see data/README.md)

## Running the Server

Start the server with:

```
python app.py
```

The server will run on http://localhost:5000 by default.

## API Endpoints

- `POST /api/get_air_quality` - Get AQI data for a specific map region
- `POST /api/get_forecast` - Get forecast data for a specific location

## Model

The SRCNN model (`model/srcnn_model.h5`) is used to enhance the resolution of the AQI data when users zoom in to street level. 