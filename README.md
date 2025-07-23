
README.md


# Vehicle Movement Tracker: India Gate to Red Fort Simulation

## Objective
This project is a frontend-only web application that simulates a vehicle moving along a predefined route on a map. It displays the vehicle's live position and draws its route using static dummy data.

## Features

* **Map Integration:** Utilizes the **Google Maps JavaScript API** to display an interactive map.
* **Static Dummy Data:** Fetches route coordinates from a local `dummy-route.json` file, specifically representing a path from **India Gate to Red Fort in New Delhi**.
* **Simulated Real-Time Movement:**
    * A custom car marker (a red car icon) animates smoothly along the loaded route.
    * The route path is dynamically drawn as a polyline, extending as the vehicle progresses.
* **Interactive Controls:** Provides basic controls including a Play/Pause button to start/stop the simulation and a Reset button to restart it. A speed slider allows adjusting animation speed.
* **Real-time Metadata Display:** Shows the vehicle's current coordinates (latitude and longitude), elapsed time since the simulation started, and simulated speed.
* **Responsive & Visually Pleasing UI:** The application is designed to be responsive, ensuring a clean and usable interface across various desktop and mobile browsers. It includes a custom background and loading indicators for a better user experience.

## Technologies Used

* **HTML5:** For structuring the web application.
* **CSS3:** For styling the user interface, ensuring responsiveness and visual appeal.
* **JavaScript (Vanilla JS):** For implementing all client-side logic, vehicle movement simulation, and map interactions.
* **Google Maps JavaScript API:** The primary mapping library used for rendering the map, markers, and polylines.
* **Local JSON Data:** `dummy-route.json` serves as the static data source for the vehicle's predefined route.
* **Flaticon (CDN):** Source for the generic car icon.

## Project Structure

```

.
├── vehicle-tracker.html
├── vehicle-tracker.css
├── vehicle-tracker.js
├── dummy-route.json
├── images/
│   └── sport-car.png (or your custom car image)
│   └── .gitkeep
└── .nojekyll
