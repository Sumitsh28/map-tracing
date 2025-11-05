
# Drone Path & Wind Deviation Visualizer

This is an advanced, interactive 3D/2D visualizer built with Next.js, React Three Fiber, and Leaflet. It's designed to plot a drone's flight path based on a set of coordinates and simulate realistic deviations caused by environmental factors like wind.

The application provides a "playground" to see, in real-time, how different wind speeds and directions would affect the drone's actual path compared to its ideal intended path.

## 🌐 Core Features

* **Dual View Modes**: Seamlessly switch between a 2D map (powered by Leaflet) and an interactive 3D scene (powered by React Three Fiber).

* **Dynamic Path Input**: Load flight paths by either typing coordinates directly into a text area or uploading a formatted JSON file.

* **Realistic Wind Deviation**: The app simulates a realistic flight path by calculating wind-based drift at 500-meter intervals, showing the deviation from the ideal path.

* **"Wind Playground" Mode**:
  * Toggle on the playground to input custom wind speed and direction.
  * See a side-by-side comparison: the simulated path (purple) appears, and a new playground path (cyan) animates to show the difference.

* **Interactive 3D Tour**: In 3D mode, start an animated "fly-through" tour that follows the drone's path, complete with camera controls and auto-rotation.

* **Data Handling**: Download the generated waypoint data (including deviations and timestamps) as a JSON file.

## 🛠️ Tech Stack & APIs

This project uses a modern web stack to handle 2D mapping, 3D rendering, and data visualization.

### Frontend

* React
* Next.js (App Router): Used for server-side components and API routes.
* Tailwind CSS: For all styling and UI components.
* Lucide React: For lightweight icons.

### 2D Mapping

* Leaflet.js & React-Leaflet: For rendering the interactive 2D map.
* Esri/ArcGIS API: Provides the satellite and reference tile layers for the 2D map.

### 3D Visualization

* Three.js: The core 3D graphics library.
* React Three Fiber (@react-three/fiber): The React renderer for Three.js.
* Drei (@react-three/drei): A helper library for R3F, used for OrbitControls, Line, and useTexture.

### Backend & APIs

* Next.js API Routes: Used to create a custom backend endpoint (/api/get-map-image).
* Mapbox API: This backend endpoint fetches high-resolution static satellite images from Mapbox, which are then used as the texture for the 3D map plane.

## 💨 Core Calculations (Wind Deviation Algorithm)

To simulate a realistic path, the algorithm runs these calculations for every small step (e.g., every 500 meters) of the path.

### 1. Time & Drift Distance

First, we figure out how long the drone is exposed to the wind on this small step and how far the wind pushes it.

* **Time for Step**: We calculate the time ($t$) it takes the drone to fly the small step distance ($d_{\text{step}}$) at its cruising speed ($v_{\text{drone}}$).

  $$
  t_{\text{hours}} = \frac{d_{\text{step\_km}}}{v_{\text{drone\_kmph}}}
  $$

  JavaScript

  ```javascript
  const step_time_hours = step_dist_km / DRONE_SPEED_KMPH;
  ```

* **Drift Distance**: We find the total distance ($d_{\text{drift}}$) the wind ($v_{\text{wind}}$) pushes the drone during that time.

  $$
  d_{\text{drift\_km}} = v_{\text{wind\_kmph}} \times t_{\text{hours}}
  $$

  JavaScript

  ```javascript
  const drift_km = data.windSpeed * step_time_hours;
  ```

### 2. Wind Vector Components

Next, we break that total drift distance into North/South and East/West components using trigonometry. We use the wind's direction ($\theta$), where $0^\circ$ is North.

* **North/South (Y) Component**: The total drift multiplied by the cosine of the wind angle.

  $$
  d_{\text{drift\_y\_km}} = d_{\text{drift\_km}} \times \cos(\theta_{\text{rad}})
  $$

  JavaScript

  ```javascript
  const drift_y_km = drift_km * Math.cos(windDirectionRad);
  ```

* **East/West (X) Component**: The total drift multiplied by the sine of the wind angle.

  $$
  d_{\text{drift\_x\_km}} = d_{\text{drift\_km}} \times \sin(\theta_{\text{rad}})
  $$

  JavaScript

  ```javascript
  const drift_x_km = drift_km * Math.sin(windDirectionRad);
  ```

### 3. Coordinate Conversion

Finally, we convert those drift distances in kilometers into changes in latitude and longitude degrees.

* **Latitude Drift**: This is a simple conversion, as the distance between latitude lines is constant (approx. $111.1 \text{ km/degree}$).

  $$
  \Delta_{\text{lat}} = \frac{d_{\text{drift\_y\_km}}}{111.1}
  $$

  JavaScript

  ```javascript
  const drift_lat = drift_y_km / KM_PER_DEG_LAT;
  ```

* **Longitude Drift**: This is more complex because longitude lines get closer together near the poles. The distance depends on the cosine of the current latitude ($\phi_{\text{lat}}$).

  $$
  d_{\text{km\_per\_deg\_lng}} = 111.1 \times \cos(\phi_{\text{lat\_rad}})
  $$

  $$
  \Delta_{\text{lng}} = \frac{d_{\text{drift\_x\_km}}}{d_{\text{km\_per\_deg\_lng}}}
  $$

  JavaScript

  ```javascript
  const km_per_deg_lng = KM_PER_DEG_LAT * Math.cos(toRad(idealPoint.lat));
  const drift_lng = drift_x_km / km_per_deg_lng;
  ```

### 4. Final Realistic Point

We add these degree-based drift values to the original "ideal" point's coordinates to get the new, "realistic" point.

$$
p_{\text{realistic}} = (\text{lat}_{\text{ideal}} + \Delta_{\text{lat}}, \text{lng}_{\text{ideal}} + \Delta_{\text{lng}})
$$

JavaScript

```javascript
const realisticPoint: Coordinate = {
  lat: idealPoint.lat + drift_lat,
  lng: idealPoint.lng + drift_lng,
};
```

## 🚀 How to Use

1. **Input Coordinates**: Paste coordinates into the text area (e.g., 25.26, 82.99) or upload a coordinates.json file.

2. **Load Points**: Click "Load Points" to see the initial markers on the 2D map.

3. **(Optional) Use Playground**: Toggle on the "Wind Playground" and adjust the sliders for wind speed and direction.

4. **Visualize**: Click "Start Visualization".
   * Playground OFF: A single cyan line will animate, showing the simulated path.
   * Playground ON: A static purple line (the original simulation) will appear. A new cyan line will animate, showing the path based on your custom playground settings.

5. **Explore**:
   * Click the "3D Path" button to switch to the 3D scene.
   * In 3D, use "Start 3D Tour" to fly along the path or "Start Rotation" to orbit.
   * Click "Download Waypoint Data" to save the original simulated path (including all waypoints and deviation data) as a JSON file.

## 📁 Sample coordinates.json

Create a file named coordinates.json with an array of coordinate pairs (latitude, longitude) to upload.

```json
[
  [25.2630, 82.9922],
  [25.3176, 82.9739],
  [25.2847, 83.0066],
  [25.2630, 82.9922]
]
```