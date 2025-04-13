"use client"

import { useRef, useCallback, useState, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAQI } from '../context/AQIContext';
import AQILegend from './AQILegend';
import HeatmapLayer from './HeatmapLayer';
import styles from '../styles/Home.module.css';

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lon1, lat1, lon2, lat2) {
  // Convert degrees to radians
  const toRad = (value) => value * Math.PI / 180;
  
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export default function MapComponent() {
  const { 
    viewState, 
    setViewState, 
    aqiData, 
    handlePointClick,
    DELHI_BOUNDS,
    error: contextError
  } = useAQI();
  
  const mapRef = useRef(null);
  const [visibleLayers, setVisibleLayers] = useState({
    heatmap: true,
    points: true
  });
  const [dataError, setDataError] = useState(null);
  
  // Log AQI data for debugging
  useEffect(() => {
    if (contextError) {
      console.error("Context error:", contextError);
      setDataError(contextError);
    } else if (aqiData) {
      console.log(`Map received AQI data with ${aqiData.features?.length || 0} features`);
      if (!aqiData.features || aqiData.features.length === 0) {
        console.warn('No features in AQI data');
        setDataError('No AQI data points available');
      } else {
        setDataError(null);
        console.log('Sample feature:', aqiData.features[0]);
      }
    } else {
      console.log('No AQI data available');
    }
  }, [aqiData, contextError]);
  
  // Keep the viewport within Delhi bounds
  const handleMove = useCallback((evt) => {
    let newViewState = { ...evt.viewState };
    
    // Apply bounds constraints
    if (newViewState.longitude > DELHI_BOUNDS.maxLongitude) {
      newViewState.longitude = DELHI_BOUNDS.maxLongitude;
    }
    if (newViewState.longitude < DELHI_BOUNDS.minLongitude) {
      newViewState.longitude = DELHI_BOUNDS.minLongitude;
    }
    if (newViewState.latitude > DELHI_BOUNDS.maxLatitude) {
      newViewState.latitude = DELHI_BOUNDS.maxLatitude;
    }
    if (newViewState.latitude < DELHI_BOUNDS.minLatitude) {
      newViewState.latitude = DELHI_BOUNDS.minLatitude;
    }
    
    setViewState(newViewState);
  }, [setViewState, DELHI_BOUNDS]);
  
  // Toggle layer visibility
  const toggleLayer = useCallback((layer) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  }, []);
  
  // Find the closest point to the clicked location
  const findClosestPoint = useCallback((clickLng, clickLat) => {
    if (!aqiData || !aqiData.features || aqiData.features.length === 0) return null;
    
    let closestPoint = null;
    let minDistance = Infinity;
    
    aqiData.features.forEach(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      const distance = calculateDistance(clickLng, clickLat, lng, lat);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = {
          longitude: lng,
          latitude: lat,
          aqi: feature.properties.aqi,
          distance: distance // in km
        };
      }
    });
    
    // Only return if the closest point is within a reasonable distance (2km)
    return minDistance <= 2 ? closestPoint : null;
  }, [aqiData]);
  
  // AQI point layer
  const pointLayer = {
    id: 'aqi-points',
    type: 'circle',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, 3,
        16, 8
      ],
      'circle-color': [
        'interpolate',
        ['linear'],
        ['get', 'aqi'],
        0, '#00E400',    // Good (0-50)
        50, '#00E400',   // Good
        51, '#FFFF00',   // Moderate (51-100)
        100, '#FFFF00',  // Moderate
        101, '#FF7E00',  // Unhealthy for Sensitive Groups (101-150)
        150, '#FF7E00',  // Unhealthy for Sensitive Groups
        151, '#FF0000',  // Unhealthy (151-200)
        200, '#FF0000',  // Unhealthy
        201, '#99004C',  // Very Unhealthy (201-300)
        300, '#99004C',  // Very Unhealthy
        301, '#7E0023',  // Hazardous (301+)
        500, '#7E0023'   // Hazardous
      ],
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        8, 0.5,
        14, 0.8
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff'
    }
  };
  
  // Handle click on map
  const handleClick = useCallback(event => {
    // First check if a point was directly clicked
    const features = event.features || [];
    if (features.length > 0) {
      const clickedPoint = features[0];
      
      // If it's from our AQI layer
      if (clickedPoint.layer.id === 'aqi-points') {
        handlePointClick({
          longitude: clickedPoint.geometry.coordinates[0],
          latitude: clickedPoint.geometry.coordinates[1],
          aqi: clickedPoint.properties.aqi,
        });
        return;
      }
    }
    
    // If no point was directly clicked, find the closest one
    const { lng, lat } = event.lngLat;
    const closestPoint = findClosestPoint(lng, lat);
    
    if (closestPoint) {
      handlePointClick(closestPoint);
      
      // Optional: Slightly move the view to center on the selected point
      setViewState(prev => ({
        ...prev,
        longitude: closestPoint.longitude,
        latitude: closestPoint.latitude,
        transitionDuration: 500
      }));
    }
  }, [handlePointClick, findClosestPoint, setViewState]);

  return (
    <div className={styles.mapWrapper}>
      <Map
        {...viewState}
        ref={mapRef}
        onMove={handleMove}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={['aqi-points']}
        onClick={handleClick}
        minZoom={8}
        maxZoom={18}
        maxBounds={[
          [DELHI_BOUNDS.minLongitude, DELHI_BOUNDS.minLatitude], // Southwest coordinates
          [DELHI_BOUNDS.maxLongitude, DELHI_BOUNDS.maxLatitude]  // Northeast coordinates
        ]}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={true} />
        
        {/* Simple Direct Heatmap */}
        {visibleLayers.heatmap && aqiData && aqiData.features && aqiData.features.length > 0 && (
          <Source
            id="direct-heatmap"
            type="geojson"
            data={aqiData}
          >
            <Layer
              id="aqi-heat"
              type="heatmap"
              paint={{
                // Fixed weight for testing
                'heatmap-weight': 1, // Use a constant weight instead of interpolation
                
                // Much higher intensity
                'heatmap-intensity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  8, 1,
                  12, 2,
                  15, 3
                ],
                
                // Brighter colors
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(33, 102, 172, 0)',
                  0.2, 'rgb(103, 169, 207)',
                  0.4, 'rgb(209, 229, 240)',
                  0.6, 'rgb(253, 219, 199)',
                  0.8, 'rgb(239, 138, 98)',
                  1, 'rgb(178, 24, 43)'
                ],
                
                // Much larger radius for visibility
                'heatmap-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  8, 30,
                  11, 50,
                  15, 70
                ],
                
                // Full opacity
                'heatmap-opacity': 1
              }}
            />
          </Source>
        )}
        
        {/* Much simpler heatmap as fallback */}
        {aqiData && aqiData.features && aqiData.features.length > 0 && (
          <Source
            id="simple-heatmap"
            type="geojson"
            data={aqiData}
          >
            <Layer
              id="simple-heat"
              type="heatmap"
              paint={{
                'heatmap-weight': 1,
                'heatmap-intensity': 1,
                'heatmap-color': [
                  'step',
                  ['heatmap-density'],
                  'rgba(0, 0, 255, 0)',
                  0.1, '#0080ff',
                  0.3, '#00ff00',
                  0.5, '#ffff00',
                  0.7, '#ff0000',
                  1.0, '#ff0000'
                ],
                'heatmap-radius': 40,
                'heatmap-opacity': 1
              }}
            />
          </Source>
        )}
        
        {/* Big visible circles as last resort */}
        {aqiData && aqiData.features && aqiData.features.length > 0 && (
          <Source
            id="test-circles"
            type="geojson"
            data={aqiData}
          >
            <Layer
              id="data-circles"
              type="circle"
              paint={{
                'circle-radius': 20,
                'circle-color': '#ff0000',
                'circle-opacity': 0.5,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
              }}
            />
          </Source>
        )}
        
        {/* Points Layer */}
        {aqiData && aqiData.features && aqiData.features.length > 0 && visibleLayers.points && (
          <Source type="geojson" data={aqiData}>
            <Layer {...pointLayer} />
          </Source>
        )}
        
        <AQILegend />
      </Map>
      
      {/* Data status indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(255,255,255,0.9)',
        padding: '5px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 999,
      }}>
        {aqiData ? (
          <div>
            <strong>Data Points:</strong> {aqiData.features?.length || 0}
            {aqiData.metadata?.is_mock_data && (
              <span style={{color: 'orange'}}> (Mock Data)</span>
            )}
          </div>
        ) : (
          <div style={{color: 'red'}}>No Data Available</div>
        )}
      </div>
      
      {/* Data error message */}
      {dataError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000,
          textAlign: 'center',
          maxWidth: '80%'
        }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#d32f2f' }}>Data Error</h3>
          <p style={{ margin: 0 }}>{dataError}</p>
          <p style={{ fontSize: '0.9em', marginTop: '8px' }}>
            Try adjusting the map view or zoom level
          </p>
        </div>
      )}
      
      {/* Layer toggle controls */}
      <div className={styles.layerControls}>
        <button 
          className={`${styles.layerButton} ${visibleLayers.heatmap ? styles.active : ''}`}
          onClick={() => toggleLayer('heatmap')}
        >
          {visibleLayers.heatmap ? 'Hide' : 'Show'} Heatmap
        </button>
        <button
          className={`${styles.layerButton} ${visibleLayers.points ? styles.active : ''}`}
          onClick={() => toggleLayer('points')}
        >
          {visibleLayers.points ? 'Hide' : 'Show'} Points
        </button>
      </div>
    </div>
  );
}