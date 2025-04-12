import { useRef, useCallback, useState } from 'react';
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
    DELHI_BOUNDS
  } = useAQI();
  
  const mapRef = useRef(null);
  const [visibleLayers, setVisibleLayers] = useState({
    heatmap: true,
    points: true
  });
  
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
        
        {/* Heatmap Layer - optimized component */}
        {visibleLayers.heatmap && aqiData && (
          <HeatmapLayer 
            aqiData={aqiData} 
            zoom={viewState.zoom} 
          />
        )}
        
        {/* Points Layer */}
        {aqiData && visibleLayers.points && (
          <Source type="geojson" data={aqiData}>
            <Layer {...pointLayer} />
          </Source>
        )}
        
        <AQILegend />
      </Map>
      
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