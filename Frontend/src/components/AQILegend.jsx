// src/components/AQILegend.jsx
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function AQILegend() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const legendItems = [
    { color: '#00E400', label: 'Good (0-50)' },
    { color: '#FFFF00', label: 'Moderate (51-100)' },
    { color: '#FF7E00', label: 'Unhealthy for Sensitive Groups (101-150)' },
    { color: '#FF0000', label: 'Unhealthy (151-200)' },
    { color: '#99004C', label: 'Very Unhealthy (201-300)' },
    { color: '#7E0023', label: 'Hazardous (301+)' }
  ];

  return (
    <div className={styles.legend}>
      <div className={styles.legendTitle}>Air Quality Index</div>
      <div className={styles.legendItem}>
        <div className={styles.colorBox} style={{ backgroundColor: '#00E400' }}></div>
        <span>0-50: Good</span>
      </div>
      
      <div className={styles.legendItem}>
        <div className={styles.colorBox} style={{ backgroundColor: '#FFFF00' }}></div>
        <span>51-100: Moderate</span>
      </div>
      
      <div className={styles.legendItem}>
        <div className={styles.colorBox} style={{ backgroundColor: '#FF7E00' }}></div>
        <span>101-150: Unhealthy for Sensitive Groups</span>
      </div>
      
      <div className={styles.legendItem}>
        <div className={styles.colorBox} style={{ backgroundColor: '#FF0000' }}></div>
        <span>151-200: Unhealthy</span>
      </div>
      
      <div className={styles.legendItem}>
        <div className={styles.colorBox} style={{ backgroundColor: '#99004C' }}></div>
        <span>201-300: Very Unhealthy</span>
      </div>
      
      <div className={styles.legendItem}>
        <div className={styles.colorBox} style={{ backgroundColor: '#7E0023' }}></div>
        <span>301+: Hazardous</span>
      </div>
    </div>
  );
}