
README.md


# Vehicle Movement Tracker: India Gate to Red Fort Simulation

## Objective
This project is a frontend-only web application that simulates a vehicle moving along a predefined route on a map. It displays the vehicle's live position and draws its route using static dummy data, fulfilling the requirements of a Frontend Developer Intern assignment.

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

````

## Setup & Running Locally

To run this project on your local machine:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/yourusername/Route-Runner.git](https://github.com/yourusername/Route-Runner.git)
    cd Route-Runner
    ```
    *(Replace `yourusername` with your GitHub username)*
2.  **Obtain a Google Maps API Key:**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Create a project, enable the **Maps JavaScript API**, and set up billing (required by Google for API usage, even for free tier).
    * Generate an API Key.
    * **Important:** For local testing, you may need to temporarily add `http://127.0.0.1:PORT/*` (e.g., `http://127.0.0.1:5500/*`) to your API key's HTTP referrer restrictions in the Google Cloud Console.
3.  **Insert API Key:**
    * Open `vehicle-tracker.html`.
    * Find the line starting with `<script async defer loading="async" src="https://maps.googleapis.com/maps/api/js?key=..."`.
    * Ensure your actual Google Maps API Key is correctly inserted there.
4.  **Open with a Local Server:**
    * Due to fetching `dummy-route.json` locally, the application needs to be served from a local web server (e.g., using Python's `http.server`, Node.js `http-server`, or VS Code's Live Server extension).
    * Navigate to `http://127.0.0.1:YOUR_PORT/vehicle-tracker.html` in your browser.

## Deployment

This project is designed for frontend-only deployment and is currently hosted on **GitHub Pages**.

### GitHub Pages Setup:

1.  Ensure all project files (`vehicle-tracker.html`, `.css`, `.js`, `dummy-route.json`) are in the **root** of your repository.
2.  Add an empty file named `.nojekyll` to the repository root.
3.  In your GitHub repository settings, navigate to **Pages**.
4.  Under "Build and deployment", set "Source" to **"Deploy from a branch"**.
5.  Select your primary branch (e.g., `main`) and the folder as **`/ (root)`**.
6.  **Crucially, restrict your Google Maps API Key** in Google Cloud Console to your GitHub Pages URL (e.g., `https://yourusername.github.io/your-repository-name/*`).

## Evaluation Criteria (from Assignment)

* **Code Structure & Quality:** Organized, modular, and well-documented code.
* **Functionality:** Accurate and smooth simulation of vehicle movement.
* **User Interface:** Clean, usable, and responsive frontend design.
* **Flexibility:** Ability to extend the solution with additional features or vehicles.
````
