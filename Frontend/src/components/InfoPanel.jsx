// src/components/InfoPanel.jsx
import styles from '../styles/Home.module.css';
import { getAqiColor, getAqiCategory } from '../utils/colors';

export default function InfoPanel({ point, description }) {
  if (!point) return null;
  
  const aqiColor = getAqiColor(point.aqi);
  const aqiCategory = getAqiCategory(point.aqi);
  
  // Format coordinates to 4 decimal places
  const latitude = point.latitude.toFixed(4);
  const longitude = point.longitude.toFixed(4);

  return (
    <div className={styles.infoPanel}>
      <h2>Air Quality Details</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
        <div 
          style={{ 
            backgroundColor: aqiColor, 
            width: '60px', 
            height: '60px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderRadius: '4px',
            color: point.aqi > 150 ? 'white' : 'black',
            fontWeight: 'bold'
          }}
        >
          {Math.round(point.aqi)}
        </div>
        
        <div>
          <div className={styles.aqiLabel}>Air Quality Index</div>
          <div style={{ fontWeight: 'bold', color: aqiColor }}>{aqiCategory}</div>
        </div>
      </div>
      
      <p>{description}</p>
      
      <table className={styles.detailsTable}>
        <tbody>
          <tr>
            <td>Location</td>
            <td>{latitude}, {longitude}</td>
          </tr>
          <tr>
            <td>PM2.5</td>
            <td>{Math.round(point.aqi * 0.6)} μg/m³</td>
          </tr>
          <tr>
            <td>Health Recommendation</td>
            <td>{getHealthRecommendation(point.aqi)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Health recommendations based on AQI value
function getHealthRecommendation(aqi) {
  if (aqi <= 50) {
    return "It's a great day to be active outside.";
  } else if (aqi <= 100) {
    return "Unusually sensitive people should consider reducing prolonged outdoor exertion.";
  } else if (aqi <= 150) {
    return "People with respiratory or heart disease, the elderly and children should limit prolonged exertion.";
  } else if (aqi <= 200) {
    return "Everyone should limit prolonged exertion outdoors.";
  } else if (aqi <= 300) {
    return "Everyone should avoid all outdoor exertion.";
  } else {
    return "Health alert: everyone should avoid all outdoor activity.";
  }
}