// Map Initialization
const map = L.map('map').setView([17.385044, 78.486671], 15); // Default center, will be updated by init()

// Using CartoDB DarkMatter for a visually striking map style
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// Define custom icon for the vehicle
const carIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', // Replace with your local path like 'images/car.png'
    iconSize: [40, 40], // Size of the icon
    iconAnchor: [20, 40], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -40] // Optional: adjust if you add a popup to the marker
});

// Global Variables
let vehicleMarker;
let routePolyline;
let routePoints = []; // Stores the actual LatLng objects for the polyline
let currentIndex = 0;
let animationInterval;
let isPlaying = false;
let startTime; // To track elapsed time for simulation
let animationSpeed = 2000; // Default interval in ms (2 seconds per point)

// DOM Elements
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const speedSlider = document.getElementById('speedSlider');
const speedValueSpan = document.getElementById('speedValue');
const currentCoordsSpan = document.getElementById('currentCoords');
const elapsedTimeSpan = document.getElementById('elapsedTime');
const currentSpeedSpan = document.getElementById('currentSpeed');
const loadingOverlay = document.getElementById('loadingOverlay');

// Function to fetch dummy data
async function fetchRouteData() {
    loadingOverlay.classList.remove('hidden'); // Show loading overlay
    try {
        const response = await fetch('dummy-route.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching dummy route data:', error);
        alert('Failed to load route data. Please check your dummy-route.json file or network.');
        return [];
    } finally {
        loadingOverlay.classList.add('hidden'); // Hide loading overlay
    }
}

// Function to calculate distance between two LatLng points in kilometers (Haversine formula)
function calculateDistance(latlng1, latlng2) {
    const R = 6371e3; // metres
    const φ1 = latlng1.lat * Math.PI / 180; // φ, λ in radians
    const φ2 = latlng2.lat * Math.PI / 180;
    const Δφ = (latlng2.lat - latlng1.lat) * Math.PI / 180;
    const Δλ = (latlng2.lng - latlng1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return (R * c) / 1000; // in kilometers
}

// Function to format time from seconds to HH:MM:SS
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:` +
           `${String(minutes).padStart(2, '0')}:` +
           `${String(seconds).padStart(2, '0')}`;
}

// Function to update vehicle position and draw route
function updateVehiclePosition() {
    if (currentIndex >= routePoints.length) {
        // Simulation complete
        clearInterval(animationInterval);
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
        console.log('Route simulation complete.');
        // Optionally, recenter map on the full route or end point
        if (routePolyline) {
             map.flyToBounds(routePolyline.getBounds(), { padding: L.point(50, 50) });
        }
        return;
    }

    const currentPoint = routePoints[currentIndex];
    const latlng = L.latLng(currentPoint.latitude, currentPoint.longitude);

    if (!vehicleMarker) {
        // Create marker if it doesn't exist
        vehicleMarker = L.marker(latlng, { icon: carIcon }).addTo(map);
        // Create polyline if it doesn't exist (or was reset)
        routePolyline = L.polyline([], { color: '#00FF00', weight: 6, opacity: 0.9 }).addTo(map); // Bright green
        startTime = new Date(currentPoint.timestamp);
    } else {
        // Update marker position
        vehicleMarker.setLatLng(latlng);
    }

    // Extend the polyline with the current point
    routePolyline.addLatLng(latlng);

    // Optionally, pan the map to follow the vehicle
    map.panTo(latlng, { animate: true, duration: animationSpeed / 1000 * 0.8 }); // Smooth pan

    // Update metadata
    currentCoordsSpan.textContent = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;

    // Calculate elapsed time
    if (startTime && currentPoint.timestamp) {
        const currentTime = new Date(currentPoint.timestamp);
        const elapsedMilliseconds = currentTime - startTime;
        const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
        elapsedTimeSpan.textContent = formatTime(totalSeconds);
    }

    // Calculate speed
    if (currentIndex > 0 && currentPoint.timestamp && routePoints[currentIndex - 1].timestamp) {
        const prevPoint = routePoints[currentIndex - 1];
        const prevLatLng = L.latLng(prevPoint.latitude, prevPoint.longitude);

        const distanceKm = calculateDistance(prevLatLng, latlng);
        const timeDiffSeconds = (new Date(currentPoint.timestamp) - new Date(prevPoint.timestamp)) / 1000;

        if (timeDiffSeconds > 0) {
            const speedKmh = (distanceKm / timeDiffSeconds) * 3600; // km/h
            currentSpeedSpan.textContent = speedKmh.toFixed(2);
        } else {
            currentSpeedSpan.textContent = '0.00'; // No movement
        }
    } else {
        currentSpeedSpan.textContent = '0.00'; // First point, no previous to calculate speed
    }

    currentIndex++;
}

// Function to reset the simulation to its initial state
function resetSimulation() {
    clearInterval(animationInterval); // Stop any ongoing animation
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
    currentIndex = 0; // Reset index to the start of the route

    // Remove vehicle marker from map if it exists
    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null; // Clear reference
    }
    // Remove route polyline from map if it exists
    if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null; // Clear reference, will be recreated on next play
    }

    // Reset metadata display
    currentCoordsSpan.textContent = 'N/A';
    elapsedTimeSpan.textContent = '00:00:00';
    currentSpeedSpan.textContent = 'N/A';

    // Reset map view to the first point of the route if data is available
    if (routePoints.length > 0) {
        map.setView([routePoints[0].latitude, routePoints[0].longitude], 15);
    }
}

// Event Listeners for Controls

// Play/Pause Button
playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        clearInterval(animationInterval);
        playPauseBtn.textContent = 'Play';
    } else {
        // If restarting from the end of the route, reset first
        if (currentIndex >= routePoints.length) {
            resetSimulation();
        }
        // Start/resume animation
        animationInterval = setInterval(updateVehiclePosition, animationSpeed);
        playPauseBtn.textContent = 'Pause';
    }
    isPlaying = !isPlaying; // Toggle playing state
});

// Reset Button
resetBtn.addEventListener('click', () => {
    resetSimulation();
});

// Speed Slider
speedSlider.addEventListener('input', (event) => {
    const multiplier = parseFloat(event.target.value);
    speedValueSpan.textContent = `${multiplier}x`;
    // Calculate new interval: inverse of multiplier (e.g., 2x speed means 2000/2 = 1000ms interval)
    animationSpeed = 2000 / multiplier;

    // If currently playing, clear the old interval and start a new one with the updated speed
    if (isPlaying) {
        clearInterval(animationInterval);
        animationInterval = setInterval(updateVehiclePosition, animationSpeed);
    }
});

// Initialize the application on page load
async function init() {
    const data = await fetchRouteData();
    if (data.length > 0) {
        routePoints = data;
        // Set initial map view to the first point of the route
        map.setView([routePoints[0].latitude, routePoints[0].longitude], 15);
        // Optionally display the initial vehicle position without starting playback
        // currentIndex = 0;
        // updateVehiclePosition();
    } else {
        console.warn("No route data found or failed to load data.");
        alert("Could not load route data. The simulation cannot start.");
    }
}

// Call init when the script loads
init();
