
# CampusVoiceNav

A high-performance, voice-enabled campus navigation web application built with React, Leaflet, and the Web Speech API. This app runs entirely in the browser and requires no external backend for routing or data management.

## Features

- **GeoJSON Walkway Graph**: Parse standard GeoJSON `LineString` features into a navigable adjacency list.
- **Dijkstra Routing**: Optimized shortest-path calculation for pedestrian walkways.
- **Voice Interaction**: Control navigation using voice commands ("Navigate to Building A") and receive turn-by-turn spoken feedback.
- **Junction Detection**: Intelligently identifies junctions based on graph degree and bearing changes.
- **Map Matching**: Snapsa GPS coordinates to the nearest walkway segment for a smooth user experience.
- **Mobile Responsive**: Designed for both desktop preparation and on-the-go campus use.

## How to Use

1. **Upload Data**: Click the "Upload Campus GeoJSON" button. Your file should contain:
   - `LineString` or `MultiLineString` features representing paths.
   - `Point` features with a `name` property for buildings/POIs.
2. **Select Start**:
   - Use the "Use My Location" button (requires GPS permission).
   - Click anywhere on the map to set a custom start point.
   - Select a location from the searchable POI list.
3. **Select Destination**:
   - Click a POI marker on the map.
   - Select from the POI list in the sidebar.
4. **Navigate**:
   - Once a route is computed, click "START NAVIGATION".
   - The app will track your position and speak instructions as you approach junctions.
   - Use the Microphone button to issue voice commands like "Stop navigation" or "Navigate to [Building Name]".

## Deployment

This app is a static web application and is compatible with **Firebase Hosting**.

### Steps:
1. Ensure you have the [Firebase CLI](https://firebase.google.com/docs/cli) installed.
2. Run your build process:
   ```bash
   npm run build
   ```
3. Initialize Firebase (if not already done):
   ```bash
   firebase init hosting
   ```
4. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```

## Local Development

1. Open the project folder.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run dev`.
4. Access via `http://localhost:5173`.
