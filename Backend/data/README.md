# AQI Data Directory

Place your GeoTIFF files in this directory. The main file needed is:

- `Delhi_NO2_Jan2023.tif` - Contains NO2 AQI data for Delhi from January 2023

## Data Format

The GeoTIFF files should have:
- Geographic projection (WGS84)
- AQI values in the first band
- Proper geotransform for accurate location mapping

## Getting Data

If you don't have the data file:
1. You can download from Google Earth Engine or similar sources
2. Ensure it has the correct name and format
3. Place it in this directory

The backend API expects this file to be present when starting the server. 