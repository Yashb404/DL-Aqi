"use client"

import { useEffect, useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { interpolateHeatmapData, createDensityGrid } from '../utils/heatmapUtils';
import { getAqiColor } from '../utils/colors';

export default function HeatmapLayer({ aqiData, zoom }) {
  console.log('HeatmapLayer rendering with data:', 
    aqiData ? `${aqiData.features?.length || 0} features` : 'no data',
    'zoom:', zoom);
    
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(true); // Enable debug mode by default
  
  // Debug aqiData
  useEffect(() => {
    if (aqiData) {
      console.log(`Received AQI data with ${aqiData.features?.length || 0} features`);
      if (aqiData.features && aqiData.features.length > 0) {
        console.log('First feature:', JSON.stringify(aqiData.features[0]));
      }
      if (aqiData.metadata) {
        console.log('Data metadata:', aqiData.metadata);
      }
    }
  }, [aqiData]);
  
  // Basic direct rendering layer, skipping interpolation for debugging
  const basicPointLayer = useMemo(() => ({
    id: 'debug-aqi-points',
    type: 'circle',
    paint: {
      'circle-radius': 6,
      'circle-color': '#ff0000',
      'circle-opacity': 0.7,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff'
    }
  }), []);
  
  // Heatmap layer style configuration
  const heatmapLayer = useMemo(() => ({
    id: 'aqi-heat',
    type: 'heatmap',
    paint: {
      // Weight by the intensity (normalized AQI value)
      'heatmap-weight': ['get', 'intensity'],
      
      // Higher zoom level = more intense heatmap
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        8, 1,
        12, 2,
        15, 3
      ],
      
      // Color ramp based on the AQI standards
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0, 228, 0, 0)',      // Transparent for zero density
        0.1, 'rgba(0, 228, 0, 0.7)',  // Green - Good
        0.3, 'rgba(255, 255, 0, 0.8)', // Yellow - Moderate
        0.5, 'rgba(255, 126, 0, 0.8)', // Orange - Unhealthy for Sensitive Groups
        0.7, 'rgba(255, 0, 0, 0.8)',   // Red - Unhealthy
        0.9, 'rgba(153, 0, 76, 0.8)'   // Purple - Very unhealthy
      ],
      
      // Radius increases with zoom level for better detail
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, 15,
        11, 20,
        15, 30
      ],
      
      // Opacity decrease slightly with zoom to see points better
      'heatmap-opacity': [
        'interpolate', ['linear'], ['zoom'],
        8, 0.9,
        15, 0.7
      ]
    }
  }), []);
  
  // Process data for heatmap visualization
  useEffect(() => {
    const processHeatmapData = async () => {
      // Reset states when we get new data
      setError(null);
      
      if (!aqiData || !aqiData.features || aqiData.features.length === 0) {
        console.warn('No AQI data available for heatmap processing');
        setProcessedData(null);
        return;
      }
      
      setLoading(true);
      
      try {
        // Check if we have valid features to process
        if (!Array.isArray(aqiData.features)) {
          throw new Error(`Invalid features data: ${typeof aqiData.features}`);
        }
        
        console.log(`Processing ${aqiData.features.length} features for heatmap at zoom level ${zoom}`);
        
        // Use setTimeout to prevent UI blocking
        setTimeout(() => {
          try {
            // Ensure colors are properly set for points
            const processedFeatures = aqiData.features.map(feature => {
              if (!feature.properties || typeof feature.properties.aqi !== 'number') {
                console.warn('Invalid feature data:', feature);
                // Provide default values if missing
                return {
                  ...feature,
                  properties: {
                    aqi: 100,
                    intensity: 0.2,
                    color: "#FFFF00"
                  }
                };
              }
              
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  // Normalize AQI value to 0-1 range for intensity
                  intensity: feature.properties.aqi / 500,
                  color: getAqiColor(feature.properties.aqi)
                }
              };
            });
            
            // Use the appropriate processing method based on zoom level
            let enhancedData;
            if (zoom < 12) {
              // For lower zoom, use a density grid (fewer points, better performance)
              enhancedData = createDensityGrid({
                type: 'FeatureCollection',
                features: processedFeatures
              }, 40);
            } else {
              // For higher zoom, interpolate between points for more detail
              enhancedData = interpolateHeatmapData({
                type: 'FeatureCollection',
                features: processedFeatures
              }, 3);
            }
            
            console.log(`Generated ${enhancedData.features.length} points for heatmap`);
            if (enhancedData.features.length > 0) {
              console.log('Sample processed point:', enhancedData.features[0]);
            }
            
            setProcessedData(enhancedData);
            setLoading(false);
          } catch (err) {
            console.error('Error in heatmap processing:', err);
            setError(`Processing error: ${err.message}`);
            setLoading(false);
          }
        }, 0);
      } catch (error) {
        console.error('Error setting up heatmap data:', error);
        setError(`Error: ${error.message}`);
        setLoading(false);
      }
    };
    
    processHeatmapData();
  }, [aqiData, zoom]);
  
  if (error) {
    console.error('Heatmap error:', error);
  }
  
  // If no data at all, show a more visible debug message
  if (!aqiData || !aqiData.features) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#ffcccc',
        color: 'red',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 1000
      }}>
        No heatmap data available
      </div>
    );
  }
  
  // If we have input data but no processed data, show processing status
  if (!processedData) {
    return (
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '10px',
        background: 'rgba(255,255,255,0.8)',
        padding: '5px 10px',
        borderRadius: '4px',
        zIndex: 1000
      }}>
        Processing heatmap data ({aqiData.features.length} points)...
      </div>
    );
  }
  
  return (
    <>
      {loading && (
        <div style={{
          position: 'absolute',
          bottom: 70,
          left: 20,
          background: 'rgba(255,255,255,0.8)',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12
        }}>
          Processing heatmap...
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          bottom: 30,
          left: 20,
          background: 'rgba(255,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12
        }}>
          Heatmap error: {error}
        </div>
      )}
      
      {/* Debug view - raw data points */}
      {debugMode && aqiData && (
        <Source type="geojson" data={aqiData}>
          <Layer {...basicPointLayer} />
        </Source>
      )}
      
      {/* Regular heatmap view */}
      <Source type="geojson" data={processedData}>
        <Layer {...heatmapLayer} />
      </Source>
      
      {/* Debug control */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'white',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        zIndex: 1000
      }}>
        <label>
          <input 
            type="checkbox" 
            checked={debugMode}
            onChange={() => setDebugMode(!debugMode)}
          /> Debug View
        </label>
        <div style={{fontSize: '10px', marginTop: '2px'}}>
          Points: {processedData.features.length}
        </div>
      </div>
    </>
  );
} 