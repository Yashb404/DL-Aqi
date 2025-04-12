import { useEffect, useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { interpolateHeatmapData, createDensityGrid } from '../utils/heatmapUtils';
import { getAqiColor } from '../utils/colors';

export default function HeatmapLayer({ aqiData, zoom }) {
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(false);
  
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
      if (!aqiData || !aqiData.features || aqiData.features.length === 0) {
        setProcessedData(null);
        return;
      }
      
      setLoading(true);
      
      try {
        // Use setTimeout to prevent UI blocking
        setTimeout(() => {
          // Ensure colors are properly set for points
          const processedFeatures = aqiData.features.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              // Normalize AQI value to 0-1 range for intensity
              intensity: feature.properties.aqi / 500,
              color: getAqiColor(feature.properties.aqi)
            }
          }));
          
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
          setProcessedData(enhancedData);
          setLoading(false);
        }, 0);
      } catch (error) {
        console.error('Error processing heatmap data:', error);
        setLoading(false);
      }
    };
    
    processHeatmapData();
  }, [aqiData, zoom]);
  
  if (!processedData) return null;
  
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
      
      <Source type="geojson" data={processedData}>
        <Layer {...heatmapLayer} />
      </Source>
    </>
  );
} 