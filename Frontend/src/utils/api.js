// src/utils/api.js
import axios from 'axios';

// Base URL for your backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchAirQualityData(bounds) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/get_air_quality`, bounds);
    return response.data;
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    throw error;
  }
}

export async function fetchAirQualityForecast(latitude, longitude) {
  try {
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