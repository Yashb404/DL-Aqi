"use client";

import { useAQI } from "../context/AQIContext";
import { getAqiColor, getAqiCategory } from "../utils/colors";
import styles from "../styles/Home.module.css";
import { useState } from "react";
import { FaInfoCircle, FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function Sidebar({ isOpen = true }) {
  const { loading, selectedPoint } = useAQI();
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className={`${styles.sidebar} ${!isOpen ? styles.hiddenSidebar : ""}`}>
      <div className={styles.logo}>
        <h1>Delhi AQI Map</h1>
        <p>High-resolution air quality visualization</p>
      </div>

      {loading && (
        <div className={styles.loadingIndicator}>
          Loading AQI data...
        </div>
      )}

      {selectedPoint && (
        <div className={styles.pointInfo}>
          <h2>Selected Location</h2>
          <div
            className={styles.aqiDisplay}
            style={{
              backgroundColor: getAqiColor(selectedPoint.aqi),
              color: selectedPoint.aqi > 150 ? "white" : "black",
            }}
          >
            <div className={styles.aqiValue}>{Math.round(selectedPoint.aqi)}</div>
            <div className={styles.aqiCategory}>
              {getAqiCategory(selectedPoint.aqi)}
            </div>
          </div>
          <div className={styles.coordinates}>
            <div>Latitude: {selectedPoint.latitude.toFixed(4)}</div>
            <div>Longitude: {selectedPoint.longitude.toFixed(4)}</div>
          </div>
          <div>
            <strong>Health Impact:</strong> {getHealthImpact(selectedPoint.aqi)}
          </div>
          <div style={{ marginTop: "12px" }}>
            <strong>Recommendation:</strong>
            <p>{getHealthRecommendation(selectedPoint.aqi)}</p>
          </div>
        </div>
      )}

      {!selectedPoint && !loading && (
        <div className={styles.instructions}>
          <h2
            onClick={() => setShowInstructions(!showInstructions)}
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            How to Use
            {showInstructions ? (
              <FaChevronUp style={{ marginLeft: "8px" }} />
            ) : (
              <FaChevronDown style={{ marginLeft: "8px" }} />
            )}
          </h2>
          {showInstructions && (
            <>
              <p>Click on any point on the map to view detailed AQI information for that location.</p>
              <p>The colors represent air quality levels:</p>
              <ul>
                <li>
                  <span style={{ color: "#00E400" }}>■</span> Good (0-50)
                </li>
                <li>
                  <span style={{ color: "#FFFF00" }}>■</span> Moderate (51-100)
                </li>
                <li>
                  <span style={{ color: "#FF7E00" }}>■</span> Unhealthy for Sensitive Groups (101-150)
                </li>
                <li>
                  <span style={{ color: "#FF0000" }}>■</span> Unhealthy (151-200)
                </li>
                <li>
                  <span style={{ color: "#99004C" }}>■</span> Very Unhealthy (201-300)
                </li>
                <li>
                  <span style={{ color: "#7E0023" }}>■</span> Hazardous (301+)
                </li>
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function getHealthImpact(aqi) {
  if (aqi <= 50) return "Minimal";
  if (aqi <= 100) return "Minor";
  if (aqi <= 150) return "Moderate";
  if (aqi <= 200) return "Significant";
  if (aqi <= 300) return "Severe";
  return "Hazardous";
}

function getHealthRecommendation(aqi) {
  if (aqi <= 50) return "It's a great day to be active outside.";
  if (aqi <= 100)
    return "Unusually sensitive people should consider reducing prolonged outdoor exertion.";
  if (aqi <= 150)
    return "People with respiratory or heart disease, the elderly and children should limit prolonged exertion.";
  if (aqi <= 200) return "Everyone should limit prolonged exertion outdoors.";
  if (aqi <= 300) return "Everyone should avoid all outdoor exertion.";
  return "Health alert: everyone should avoid all outdoor activity.";
}