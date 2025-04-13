"use client"

import { createContext, useContext, useState, useEffect } from 'react';
import { fetchAirQualityData } from '../utils/api';
import { DELHI_CENTER, DELHI_BOUNDS } from '../config/constants';

const AQIContext = createContext();

export function useAQI() {
  return useContext(AQIContext);
}

export function AQIProvider({ children }) {
  const [viewState, setViewState] = useState({
    longitude: DELHI_CENTER.longitude,
    latitude: DELHI_CENTER.latitude,
    zoom: 10.5
  });
  
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [error, setError] = useState(null);
  
  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Loading initial AQI data...");
        
        // Load data for entire Delhi region initially
        const bounds = {
          lat_min: DELHI_BOUNDS.minLatitude,
          lat_max: DELHI_BOUNDS.maxLatitude,
          lon_min: DELHI_BOUNDS.minLongitude,
          lon_max: DELHI_BOUNDS.maxLongitude,
          zoom_level: Math.floor(viewState.zoom)
        };
        
        console.log("Initial bounds:", bounds);
        const data = await fetchAirQualityData(bounds);
        
        if (!data || !data.features) {
          console.error("Invalid data received:", data);
          setError("Invalid data format received from server");
        } else {
          console.log(`Received ${data.features.length} data points`);
          setAqiData(data);
          setError(null);
        }
      } catch (error) {
        console.error("Error fetching initial AQI data:", error);
        setError(`Failed to load initial data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Fetch data when map view changes
  useEffect(() => {
    const loadData = async () => {
      if (viewState.zoom < 8) return;
      
      setLoading(true);
      try {
        // Calculate view bounds based on current viewport
        const bounds = {
          lat_min: Math.max(DELHI_BOUNDS.minLatitude, viewState.latitude - 0.1 / (viewState.zoom / 10)),
          lat_max: Math.min(DELHI_BOUNDS.maxLatitude, viewState.latitude + 0.1 / (viewState.zoom / 10)),
          lon_min: Math.max(DELHI_BOUNDS.minLongitude, viewState.longitude - 0.1 / (viewState.zoom / 10)),
          lon_max: Math.min(DELHI_BOUNDS.maxLongitude, viewState.longitude + 0.1 / (viewState.zoom / 10)),
          zoom_level: Math.floor(viewState.zoom)
        };
        
        console.log(`Fetching AQI data at zoom ${viewState.zoom}, bounds:`, bounds);
        
        // Set useMockData to true to force using mock data
        const useMockData = true; // TEMPORARY: Force mock data for testing heatmap
        let data;
        
        if (useMockData) {
          console.log("FORCING MOCK DATA FOR TESTING");
          // Import the mock data generator
          const { default: generateMockData } = await import('../utils/api.js').then(m => ({ default: m.generateMockData || function(bounds) {
            // Inline mock data generator if the import fails
            const features = [];
            const gridSize = 20;
            for (let i = 0; i < gridSize; i++) {
              for (let j = 0; j < gridSize; j++) {
                const lat = bounds.lat_min + (bounds.lat_max - bounds.lat_min) * (i / (gridSize - 1));
                const lon = bounds.lon_min + (bounds.lon_max - bounds.lon_min) * (j / (gridSize - 1));
                
                const aqi = 50 + (i + j) * 10 + Math.random() * 50;
                
                features.push({
                  type: 'Feature',
                  properties: {
                    aqi: aqi,
                    intensity: aqi / 500,
                    is_mock_data: true
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                  }
                });
                
                // Add extra points around
                for (let k = 0; k < 3; k++) {
                  const latJitter = (Math.random() - 0.5) * 0.02;
                  const lonJitter = (Math.random() - 0.5) * 0.02;
                  
                  features.push({
                    type: 'Feature',
                    properties: {
                      aqi: aqi + Math.random() * 50 - 25,
                      intensity: aqi / 500,
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
            
            return {
              type: 'FeatureCollection',
              features: features,
              metadata: {
                is_mock_data: true,
                mock_reason: 'Forced for testing'
              }
            };
          }}));
          
          data = generateMockData(bounds);
          console.log(`Using ${data.features.length} mock points instead of API data`);
        } else {
          data = await fetchAirQualityData(bounds);
        }
        
        if (!data || !data.features) {
          console.error("Invalid data received on viewport change:", data);
          setError("Invalid data format received from server");
        } else {
          console.log(`Received ${data.features.length} data points for viewport`);
          if (data.features.length > 0) {
            console.log('Sample feature:', data.features[0]);
          }
          
          // Check for missing properties in features and add them
          const processedFeatures = data.features.map(feature => {
            if (!feature.properties) {
              feature.properties = {};
            }
            
            if (typeof feature.properties.aqi !== 'number') {
              feature.properties.aqi = 100; // Default AQI
            }
            
            if (!feature.properties.intensity) {
              feature.properties.intensity = feature.properties.aqi / 500;
            }
            
            return feature;
          });
          
          // Replace the features with processed ones
          const finalData = {
            ...data,
            features: processedFeatures
          };
          
          setAqiData(finalData);
          setError(null);
        }
      } catch (error) {
        console.error("Error fetching AQI data:", error);
        setError(`Failed to update data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the API call
    const timeoutId = setTimeout(loadData, 500);
    return () => clearTimeout(timeoutId);
  }, [viewState]);
  
  // Handle point selection on map
  const handlePointClick = (point) => {
    console.log("Selected point:", point);
    setSelectedPoint(point);
  };

  const value = {
    viewState,
    setViewState,
    aqiData,
    loading,
    selectedPoint,
    handlePointClick,
    DELHI_BOUNDS,
    error
  };

  return <AQIContext.Provider value={value}>{children}</AQIContext.Provider>;
} 