# Delhi AQI Visualization Frontend

This is a Next.js application that provides an interactive map visualization of air quality data for Delhi. It uses super-resolution techniques to display high-resolution AQI data when zooming in to street level.

## Features

- Interactive map visualization with MapLibre GL
- AQI data displayed as both a heatmap and point layer
- Detailed information panel for selected locations
- Proper color coding according to EPA AQI standards
- Forecast visualization for selected locations
- Responsive design for desktop and mobile

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file in the root directory with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

## Running the Application

Run the development server:

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```
npm run build
npm start
```

## Technology Stack

- **Next.js** - React framework
- **MapLibre GL** - Open-source maps library
- **Axios** - HTTP client for API requests

## Backend Connection

This frontend connects to a Flask backend API that serves processed AQI data. Make sure the backend is running at the URL specified in your environment variables.
