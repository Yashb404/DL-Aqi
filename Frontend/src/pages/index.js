"use client"
// src/pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import Map from '../components/Map';
import { AQIProvider } from '../context/AQIContext';
import useDeviceSize from '../hooks/useDeviceSize';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Get responsive information
  const { isMobile } = useDeviceSize();
  
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [isMobile]);

  return (
    <AQIProvider>
      <div className={styles.container}>
        <Head>
          <title>Delhi AQI Visualization</title>
          <meta name="description" content="High-resolution air quality mapping for Delhi" />
          <link rel="icon" href="/favicon.ico" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        
        <main className={styles.main}>
          {/* Sidebar */}
          <Sidebar isOpen={isSidebarOpen} />
          
          {/* Main map area */}
          <div className={styles.mapContainer}>
            <Map />
            
            {/* Mobile sidebar toggle button */}
            {isMobile && (
              <button
                style={{
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  zIndex: 1000,
                  background: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  cursor: 'pointer'
                }}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </main>
      </div>
    </AQIProvider>
  );
}