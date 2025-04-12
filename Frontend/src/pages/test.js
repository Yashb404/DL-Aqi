import { useState, useEffect } from 'react';
import axios from 'axios';

// Delhi bounds
const DELHI_BOUNDS = {
  minLatitude: 28.4,    // Southern bound
  maxLatitude: 29.0,    // Northern bound
  minLongitude: 76.8,   // Western bound
  maxLongitude: 77.6    // Eastern bound
};

export default function TestPage() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const testBackend = async () => {
      try {
        // Get the API URL from environment variables
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        // Test the basic test endpoint
        const testResponse = await axios.get(`${API_URL}/api/test`);
        console.log('Test response:', testResponse.data);
        
        // Try the air quality endpoint with Delhi bounds
        const aqiResponse = await axios.post(`${API_URL}/api/get_air_quality`, {
          lat_min: DELHI_BOUNDS.minLatitude,
          lat_max: DELHI_BOUNDS.maxLatitude,
          lon_min: DELHI_BOUNDS.minLongitude,
          lon_max: DELHI_BOUNDS.maxLongitude,
          zoom_level: 10
        });
        console.log('AQI response:', aqiResponse.data);
        
        setStatus('Connection successful! Check console for details.');
      } catch (error) {
        console.error('Error testing backend:', error);
        setError(error.toString());
        setStatus('Connection failed!');
      }
    };
    
    testBackend();
  }, []);
  
  return (
    <div style={{ padding: 20 }}>
      <h1>Backend Connection Test</h1>
      <p><strong>Status:</strong> {status}</p>
      {error && (
        <div style={{ color: 'red', marginTop: 20 }}>
          <h2>Error Details:</h2>
          <pre>{error}</pre>
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <p>Check the browser console for full response details.</p>
        <p>
          <a href="/">Go back to main map</a>
        </p>
      </div>
    </div>
  );
} 