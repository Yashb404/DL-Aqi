"use client"

// src/utils/api.js
import axios from 'axios';

// Base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchAirQualityData(bounds) {
  try {
    console.log(`Sending request to ${API_BASE_URL}/api/get_air_quality with bounds:`, bounds);
    
    const response = await axios.post(`${API_BASE_URL}/api/get_air_quality`, bounds);
    
    // Validate response structure
    if (!response.data || typeof response.data !== 'object') {
      console.error('Invalid response format:', response.data);
      throw new Error('Invalid response format from server');
    }
    
    if (!response.data.features || !Array.isArray(response.data.features)) {
      console.error('Missing or invalid features array in response:', response.data);
      throw new Error('Response missing features array');
    }
    
    console.log(`Received ${response.data.features.length} features from API`);
    
    // Log some details about the data
    if (response.data.features.length > 0) {
      console.log('First feature sample:', response.data.features[0]);
    }
    
    if (response.data.metadata) {
      console.log('Response metadata:', response.data.metadata);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    
    if (error.response) {
      // The request was made and the server responded with an error status
      console.error('Server response error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    }
    
    // Generate mock data to ensure visualization works
    console.warn('Using mock data due to API error');
    return generateMockData(bounds);
  }
}

// Generate mock data for visualization when API fails
export function generateMockData(bounds) {
  const { lat_min, lat_max, lon_min, lon_max } = bounds;
  const features = [];
  
  // Create a denser grid of mock points
  const gridSize = 20; // Increase from 10 to 20
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = lat_min + (lat_max - lat_min) * (i / (gridSize - 1));
      const lon = lon_min + (lon_max - lon_min) * (j / (gridSize - 1));
      
      // Generate a pattern of AQI values
      const baseAqi = 50 + (i + j) * 10; 
      const aqi = Math.min(500, Math.max(0, baseAqi + Math.random() * 50 - 25));
      
      // Add main point
      features.push({
        type: 'Feature',
        properties: {
          aqi: aqi,
          color: getAqiColorFromValue(aqi),
          intensity: aqi / 500,
          is_mock_data: true
        },
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        }
      });
      
      // Add some random additional points around this one (for more density)
      const numExtraPoints = 3;
      for (let k = 0; k < numExtraPoints; k++) {
        const latJitter = (Math.random() - 0.5) * 0.02; // Small random offset
        const lonJitter = (Math.random() - 0.5) * 0.02;
        
        const extraAqi = Math.min(500, Math.max(0, aqi + (Math.random() * 50 - 25)));
        
        features.push({
          type: 'Feature',
          properties: {
            aqi: extraAqi,
            color: getAqiColorFromValue(extraAqi),
            intensity: extraAqi / 500,
            is_mock_data: true
          },
          geometry: {
            type: 'Point',
            coordinates: [lon + lonJitter, lat + latJitter]
          }
        });
      }
    }
  }
  
  console.log(`Generated ${features.length} mock points for visualization`);
  
  return {
    type: 'FeatureCollection',
    features: features,
    metadata: {
      is_mock_data: true,
      mock_reason: 'API error fallback'
    }
  };
}

// Simple AQI color function for mock data
function getAqiColorFromValue(aqi) {
  if (aqi <= 50) return "#00E400";      // Good
  if (aqi <= 100) return "#FFFF00";     // Moderate
  if (aqi <= 150) return "#FF7E00";     // Unhealthy for Sensitive Groups
  if (aqi <= 200) return "#FF0000";     // Unhealthy
  if (aqi <= 300) return "#99004C";     // Very Unhealthy
  return "#7E0023";                     // Hazardous
}

export async function fetchAirQualityForecast(latitude, longitude) {
  try {
    console.log(`Sending forecast request for coordinates (${latitude}, ${longitude})`);
    
    const response = await axios.post(`${API_BASE_URL}/api/get_forecast`, {
      latitude,
      longitude
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    throw error;
  }
}

export async function checkBackendStatus() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test`);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('Backend status check failed:', error);
    return false;
  }
}

export async function getModelStatus() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/model_status`);
    return response.data;
  } catch (error) {
    console.error('Failed to get model status:', error);
    return null;
  }
}