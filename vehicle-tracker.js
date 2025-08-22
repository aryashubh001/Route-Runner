// Global Leaflet and OSM objects
let map;
let fullRoutePolyline; // To display the entire calculated route
let vehicleTracePolyline; // To display the path the vehicle has traveled
let vehicleMarker;

let routePoints = []; // Stores the parsed LatLng objects for animation
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

// Define initial map center for the route (India Gate)
const initialCenterLat = 28.6129; // India Gate latitude
const initialCenterLng = 77.2295; // India Gate longitude


// Function called by the HTML when the page loads
async function initMap() {
    // Initialize the map using Leaflet
    map = L.map('map').setView([initialCenterLat, initialCenterLng], 17);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize the full route polyline
    fullRoutePolyline = L.polyline([], {
        color: '#007bff', // Blue for the full route
        opacity: 0.7,
        weight: 5
    }).addTo(map);

    // Initialize the vehicle trace polyline (drawn as vehicle moves)
    vehicleTracePolyline = L.polyline([], {
        color: '#00FF00', // Bright green for the trace
        opacity: 0.9,
        weight: 6
    }).addTo(map);

    // Fetch route data from local dummy.json file
    await fetchDummyRouteData();
}

// Function to fetch dummy data from local JSON file
async function fetchDummyRouteData() {
    loadingOverlay.classList.remove('hidden'); // Show loading overlay
    try {
        const response = await fetch('./dummy-route.json'); // Fetch from local JSON
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Convert raw data to Leaflet LatLng objects
        const decodedPath = data.map(point => L.latLng(point.latitude, point.longitude));

        // Set the full route polyline on the map
        fullRoutePolyline.setLatLngs(decodedPath);

        // Store route points for animation, using original timestamps from JSON
        routePoints = data;

        // Fit the map to the bounds of the dummy route
        if (routePoints.length > 0) {
            const bounds = fullRoutePolyline.getBounds();
            map.fitBounds(bounds);
        }

        return routePoints;
    } catch (error) {
        console.error('Error fetching dummy route data:', error);
        alert('Failed to load dummy route data. Check your dummy-route.json file or network. Error: ' + error.message);
        return [];
    } finally {
        loadingOverlay.classList.add('hidden'); // Hide loading overlay
    }
}

// Function to calculate distance between two LatLng points in kilometers (using Haversine formula)
function calculateDistance(latlng1, latlng2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (latlng2.lat - latlng1.lat) * Math.PI / 180;
    const dLon = (latlng2.lng - latlng1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latlng1.lat * Math.PI / 180) * Math.cos(latlng2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

// Function to format total seconds into HH:MM:SS string
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:` +
           `${String(minutes).padStart(2, '0')}:` +
           `${String(seconds).padStart(2, '0')}`;
}

// Function to update vehicle position and draw trace
function updateVehiclePosition() {
    // Stop simulation if all points have been covered
    if (currentIndex >= routePoints.length) {
        clearInterval(animationInterval);
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
        console.log('Route simulation complete.');
        // Optionally fit map to the entire route after completion
        if (fullRoutePolyline.getLatLngs().length > 0) {
            map.fitBounds(fullRoutePolyline.getBounds());
        }
        return;
    }

    const currentPointData = routePoints[currentIndex];
    // Create a new Leaflet LatLng object for the current position
    const currentLatLng = L.latLng(currentPointData.latitude, currentPointData.longitude);

    if (!vehicleMarker) {
        // Create vehicle marker if it doesn't exist
        const vehicleIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/aryashubh001/Route-Runner/main/images/my-car.png',
            iconSize: [40, 40], // size of the icon
            iconAnchor: [20, 40] // point of the icon which will correspond to marker's location
        });

        vehicleMarker = L.marker(currentLatLng, {
            icon: vehicleIcon
        }).addTo(map);

        // Set initial start time for elapsed time calculation
        startTime = new Date(currentPointData.timestamp);
    } else {
        // Update existing marker's position
        vehicleMarker.setLatLng(currentLatLng);
    }

    // Add current point to the vehicle's trace polyline
    const path = vehicleTracePolyline.getLatLngs();
    path.push(currentLatLng);
    vehicleTracePolyline.setLatLngs(path); // Update the polyline on the map

    // Pan the map to follow the vehicle smoothly
    map.panTo(currentLatLng);

    // Update metadata display
    currentCoordsSpan.textContent = `${currentPointData.latitude.toFixed(6)}, ${currentPointData.longitude.toFixed(6)}`;

    // Calculate elapsed time
    if (startTime && currentPointData.timestamp) {
        const currentTime = new Date(currentPointData.timestamp);
        const elapsedMilliseconds = currentTime - startTime;
        const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
        elapsedTimeSpan.textContent = formatTime(totalSeconds);
    }

    // Calculate speed (only if there's a previous point)
    if (currentIndex > 0 && currentPointData.timestamp && routePoints[currentIndex - 1].timestamp) {
        const prevPointData = routePoints[currentIndex - 1];
        const prevLatLng = L.latLng(prevPointData.latitude, prevPointData.longitude);

        const distanceKm = calculateDistance(prevLatLng, currentLatLng);
        const timeDiffSeconds = (new Date(currentPointData.timestamp) - new Date(prevPointData.timestamp)) / 1000;

        if (timeDiffSeconds > 0) {
            const speedKmh = (distanceKm / timeDiffSeconds) * 3600; // km/h
            currentSpeedSpan.textContent = speedKmh.toFixed(2);
        } else {
            currentSpeedSpan.textContent = '0.00'; // No movement
        }
    } else {
        currentSpeedSpan.textContent = '0.00'; // First point, no previous to calculate speed
    }

    currentIndex++; // Move to the next point in the route
}

// Function to reset the simulation to its initial state
function resetSimulation() {
    clearInterval(animationInterval);
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
    currentIndex = 0;

    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null;
    }

    if (vehicleTracePolyline) {
        vehicleTracePolyline.setLatLngs([]);
    }

    currentCoordsSpan.textContent = 'N/A';
    elapsedTimeSpan.textContent = '00:00:00';
    currentSpeedSpan.textContent = 'N/A';

    if (routePoints.length > 0) {
        map.setView(L.latLng(routePoints[0].latitude, routePoints[0].longitude), 17);
    } else {
        map.setView([initialCenterLat, initialCenterLng], 17);
    }
}

// Event Listeners for Controls
playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        clearInterval(animationInterval);
        playPauseBtn.textContent = 'Play';
    } else {
        if (currentIndex >= routePoints.length) {
            resetSimulation();
        }
        if (routePoints.length > 0) {
            animationInterval = setInterval(updateVehiclePosition, animationSpeed);
            playPauseBtn.textContent = 'Pause';
        } else {
            alert('No route data
