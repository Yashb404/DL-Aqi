🌆 Delhi AQI Visualization
A high-resolution air quality visualization system for Delhi, using AI-powered super-resolution techniques to enhance satellite imagery and provide detailed street-level AQI insights.

📌 Project Overview
This project has two main components:

🧠 Backend (Flask + SRCNN)
Processes NO₂ concentration GeoTIFF data from Google Earth Engine.

Uses a Super-Resolution Convolutional Neural Network (SRCNN) model to upscale low-res imagery.

Converts satellite data into high-resolution AQI layers.

Exposes a REST API to serve processed data.

🌐 Frontend (Next.js + MapLibre GL)
Interactive, mobile-responsive web application for exploring AQI levels across Delhi.

Displays AQI using heatmaps and point data, styled with EPA color standards.

Clickable map points provide detailed AQI information.

Includes forecast data for upcoming days.

🚀 Features
🔬 AI-Enhanced Resolution: Upscales satellite images using a trained SRCNN model

🗺️ Interactive Map: Zoom, pan, and click to explore air quality data

🎨 EPA Color Coding: AQI points and heatmap follow EPA guidelines

📱 Responsive UI: Optimized for both desktop and mobile use

📍 Detailed Info: Click on a point to view location-specific AQI values

📈 Forecast Mode: View predicted AQI trends for the coming days

🛠️ Setup Instructions
📦 Backend (Flask + SRCNN)
Navigate to the backend directory:

bash
Copy
Edit
cd Backend
Create and activate a virtual environment:

bash
Copy
Edit
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
Install the dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Add your GeoTIFF files to the data/ directory (see Backend/data/README.md for details).

Start the backend server:

bash
Copy
Edit
python app.py
Server runs on: http://localhost:5000

🌍 Frontend (Next.js + MapLibre)
Navigate to the frontend directory:

bash
Copy
Edit
cd Frontend
Install dependencies:

bash
Copy
Edit
npm install
Create a .env.local file with the following:

ini
Copy
Edit
NEXT_PUBLIC_API_URL=http://localhost:5000
Start the development server:

bash
Copy
Edit
npm run dev
App will be live at: http://localhost:3000

📊 Data Sources
NO₂ and methane concentration data from Google Earth Engine

Processed and converted to AQI values using standard EPA methodology

Stored and managed as GeoTIFF files before AI enhancement

