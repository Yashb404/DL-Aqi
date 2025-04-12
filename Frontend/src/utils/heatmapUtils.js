/**
 * Interpolates additional points to create a smoother heatmap
 * @param {Object} geoJson - GeoJSON data with AQI points
 * @param {number} factor - Interpolation factor (higher = more points)
 * @returns {Object} Enhanced GeoJSON with interpolated points
 */
export function interpolateHeatmapData(geoJson, factor = 2) {
  if (!geoJson || !geoJson.features || geoJson.features.length < 2) {
    return geoJson;
  }
  
  const originalFeatures = [...geoJson.features];
  const interpolatedFeatures = [...originalFeatures];
  
  // Build a spatial grid for faster neighbor lookup
  const grid = {};
  originalFeatures.forEach(feature => {
    const [lon, lat] = feature.geometry.coordinates;
    const gridKey = `${Math.floor(lon * 100)}:${Math.floor(lat * 100)}`;
    if (!grid[gridKey]) grid[gridKey] = [];
    grid[gridKey].push(feature);
  });
  
  // Find nearest neighbors for each point
  originalFeatures.forEach(feature => {
    const [lon, lat] = feature.geometry.coordinates;
    const baseAqi = feature.properties.aqi;
    
    // Look for points in adjacent grid cells
    const gridLon = Math.floor(lon * 100);
    const gridLat = Math.floor(lat * 100);
    
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const neighborKey = `${gridLon + i}:${gridLat + j}`;
        const neighbors = grid[neighborKey] || [];
        
        neighbors.forEach(neighbor => {
          if (neighbor === feature) return; // Skip self
          
          const [nLon, nLat] = neighbor.geometry.coordinates;
          const neighborAqi = neighbor.properties.aqi;
          
          // Create interpolated points between this point and its neighbor
          for (let step = 1; step < factor; step++) {
            const ratio = step / factor;
            const interpLon = lon + (nLon - lon) * ratio;
            const interpLat = lat + (nLat - lat) * ratio;
            
            // Weighted average of AQI values
            const interpAqi = Math.round(baseAqi + (neighborAqi - baseAqi) * ratio);
            
            interpolatedFeatures.push({
              type: 'Feature',
              properties: {
                aqi: interpAqi,
                intensity: interpAqi / 500, // Normalize to 0-1
                interpolated: true // Mark as interpolated
              },
              geometry: {
                type: 'Point',
                coordinates: [interpLon, interpLat]
              }
            });
          }
        });
      }
    }
  });
  
  return {
    type: 'FeatureCollection',
    features: interpolatedFeatures
  };
}

/**
 * Creates a continuous heatmap grid using inverse distance weighting
 * @param {Object} geoJson - GeoJSON data with AQI points
 * @param {number} resolution - Grid resolution (higher = more detailed)
 * @returns {Object} Grid GeoJSON for heatmap
 */
export function createDensityGrid(geoJson, resolution = 30) {
  if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
    return geoJson;
  }
  
  // Find bounds of the data
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  
  geoJson.features.forEach(feature => {
    const [lon, lat] = feature.geometry.coordinates;
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  
  // Add some padding
  const lonPadding = (maxLon - minLon) * 0.1;
  const latPadding = (maxLat - minLat) * 0.1;
  minLon -= lonPadding;
  maxLon += lonPadding;
  minLat -= latPadding;
  maxLat += latPadding;
  
  // Create a grid of points
  const gridFeatures = [];
  const lonStep = (maxLon - minLon) / resolution;
  const latStep = (maxLat - minLat) / resolution;
  
  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      const lon = minLon + i * lonStep;
      const lat = minLat + j * latStep;
      
      // Calculate AQI at this grid point using inverse distance weighting
      let weightedSum = 0;
      let weightSum = 0;
      
      geoJson.features.forEach(feature => {
        const [fLon, fLat] = feature.geometry.coordinates;
        const distance = Math.sqrt(
          Math.pow(lon - fLon, 2) + Math.pow(lat - fLat, 2)
        );
        
        // Avoid division by zero
        const weight = distance < 0.0001 ? 1000 : 1 / (distance * distance);
        weightedSum += feature.properties.aqi * weight;
        weightSum += weight;
      });
      
      const gridAqi = Math.round(weightedSum / weightSum);
      
      gridFeatures.push({
        type: 'Feature',
        properties: {
          aqi: gridAqi,
          intensity: gridAqi / 500, // Normalize to 0-1
          grid: true // Mark as grid point
        },
        geometry: {
          type: 'Point',
          coordinates: [lon, lat]
        }
      });
    }
  }
  
  return {
    type: 'FeatureCollection',
    features: gridFeatures
  };
} 