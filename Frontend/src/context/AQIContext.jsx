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
  
  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load data for entire Delhi region initially
        const bounds = {
          lat_min: DELHI_BOUNDS.minLatitude,
          lat_max: DELHI_BOUNDS.maxLatitude,
          lon_min: DELHI_BOUNDS.minLongitude,
          lon_max: DELHI_BOUNDS.maxLongitude,
          zoom_level: Math.floor(viewState.zoom)
        };
        
        const data = await fetchAirQualityData(bounds);
        setAqiData(data);
      } catch (error) {
        console.error("Error fetching initial AQI data:", error);
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
        
        const data = await fetchAirQualityData(bounds);
        setAqiData(data);
      } catch (error) {
        console.error("Error fetching AQI data:", error);
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
  };

  return <AQIContext.Provider value={value}>{children}</AQIContext.Provider>;
} 