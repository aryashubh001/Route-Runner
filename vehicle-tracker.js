// Global Leaflet and OSM objects
let map;
let fullRoutePolyline;
let vehicleTracePolyline;
let vehicleMarker;

let routePoints = []; // Stores the parsed LatLng objects for animation
let currentIndex = 0;
let animationInterval;
let isPlaying = false;
let startTime;
let animationSpeed = 2000;

// Dynamic route variables
let startMarker, endMarker;
let isSelectingStart = true; // State tracker for click events

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
const initialCenterLat = 28.6129;
const initialCenterLng = 77.2295;

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
        color: '#007bff',
        opacity: 0.7,
        weight: 5
    }).addTo(map);

    // Initialize the vehicle trace polyline
    vehicleTracePolyline = L.polyline([], {
        color: '#00FF00',
        opacity: 0.9,
        weight: 6
    }).addTo(map);

    // Add a click event listener to the map to set start and end points
    map.on('click', onMapClick);

    // Initial state: hide controls until a route is generated
    toggleControls(false);
}

// Handler for map click events
async function onMapClick(e) {
    if (isPlaying) return; // Ignore clicks during playback

    const latlng = e.latlng;

    if (isSelectingStart) {
        // First click: Set the start marker
        if (startMarker) map.removeLayer(startMarker);
        if (endMarker) map.removeLayer(endMarker);
        if (fullRoutePolyline) fullRoutePolyline.setLatLngs([]);
        
        startMarker = L.marker(latlng).addTo(map)
            .bindPopup("Start Point").openPopup();
        
        // Reset everything for a new route selection
        routePoints = [];
        currentIndex = 0;
        isSelectingStart = false;
        toggleControls(false);
        alert('Start point set. Now click on the map to select the end point.');

    } else {
        // Second click: Set the end marker and calculate the route
        if (endMarker) map.removeLayer(endMarker);
        endMarker = L.marker(latlng).addTo(map)
            .bindPopup("End Point").openPopup();

        loadingOverlay.classList.remove('hidden');
        await getRoute(startMarker.getLatLng(), endMarker.getLatLng());
        loadingOverlay.classList.add('hidden');
        
        isSelectingStart = true; // Reset state for the next route selection
    }
}

// Function to get a route from the OSRM API
async function getRoute(start, end) {
    // OSRM API URL
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(osrmUrl);
        if (!response.ok) {
            throw new Error(`OSRM API error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Extract the GeoJSON coordinates from the response
        const geojsonPath = data.routes[0].geometry.coordinates;
        
        // Convert GeoJSON (lng, lat) to Leaflet (lat, lng)
        const leafletPath = geojsonPath.map(coord => L.latLng(coord[1], coord[0]));
        
        // Set the full route polyline
        fullRoutePolyline.setLatLngs(leafletPath);
        
        // Store the points for animation
        // For simplicity, we'll use a fixed timestamp for each point
        routePoints = leafletPath.map((latlng, index) => ({
            latitude: latlng.lat,
            longitude: latlng.lng,
            timestamp: new Date().getTime() + (index * 2000) // Dummy timestamps
        }));
        
        // Fit the map to the new route
        map.fitBounds(fullRoutePolyline.getBounds());
        
        toggleControls(true); // Enable controls
        alert('Route generated! Click Play to start the simulation.');

    } catch (error) {
        console.error('Error fetching route:', error);
        alert('Failed to generate route. Error: ' + error.message);
        toggleControls(false);
    }
}

// Helper function to show/hide controls
function toggleControls(show) {
    if (show) {
        playPauseBtn.disabled = false;
        resetBtn.disabled = false;
        speedSlider.disabled = false;
    } else {
        playPauseBtn.disabled = true;
        resetBtn.disabled = true;
        speedSlider.disabled = true;
    }
}

// Function to calculate distance between two LatLng points in kilometers (using Haversine formula)
function calculateDistance(latlng1, latlng2) {
    const R = 6371;
    const dLat = (latlng2.lat - latlng1.lat) * Math.PI / 180;
    const dLon = (latlng2.lng - latlng1.lng) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latlng1.lat * Math.PI / 180) * Math.cos(latlng2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
    if (currentIndex >= routePoints.length) {
        clearInterval(animationInterval);
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
        console.log('Route simulation complete.');
        if (fullRoutePolyline.getLatLngs().length > 0) {
            map.fitBounds(fullRoutePolyline.getBounds());
        }
        return;
    }

    const currentPointData = routePoints[currentIndex];
    const currentLatLng = L.latLng(currentPointData.latitude, currentPointData.longitude);

    if (!vehicleMarker) {
        const vehicleIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/aryashubh001/Route-Runner/main/images/my-car.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        vehicleMarker = L.marker(currentLatLng, { icon: vehicleIcon }).addTo(map);
        startTime = new Date(currentPointData.timestamp);
    } else {
        vehicleMarker.setLatLng(currentLatLng);
    }

    const path = vehicleTracePolyline.getLatLngs();
    path.push(currentLatLng);
    vehicleTracePolyline.setLatLngs(path);

    map.panTo(currentLatLng);

    currentCoordsSpan.textContent = `${currentPointData.latitude.toFixed(6)}, ${currentPointData.longitude.toFixed(6)}`;

    if (startTime && currentPointData.timestamp) {
        const currentTime = new Date(currentPointData.timestamp);
        const elapsedMilliseconds = currentTime - startTime;
        const totalSeconds = Math.floor(elapsedMilliseconds / 1000);
        elapsedTimeSpan.textContent = formatTime(totalSeconds);
    }

    if (currentIndex > 0 && currentPointData.timestamp && routePoints[currentIndex - 1].timestamp) {
        const prevPointData = routePoints[currentIndex - 1];
        const prevLatLng = L.latLng(prevPointData.latitude, prevPointData.longitude);

        const distanceKm = calculateDistance(prevLatLng, currentLatLng);
        const timeDiffSeconds = (new Date(currentPointData.timestamp) - new Date(prevPointData.timestamp)) / 1000;

        if (timeDiffSeconds > 0) {
            const speedKmh = (distanceKm / timeDiffSeconds) * 3600;
            currentSpeedSpan.textContent = speedKmh.toFixed(2);
        } else {
            currentSpeedSpan.textContent = '0.00';
        }
    } else {
        currentSpeedSpan.textContent = '0.00';
    }

    currentIndex++;
}

// Function to reset the simulation
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

    // Clear start and end markers
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    
    // Clear route polyline
    if (fullRoutePolyline) fullRoutePolyline.setLatLngs([]);

    currentCoordsSpan.textContent = 'N/A';
    elapsedTimeSpan.textContent = '00:00:00';
    currentSpeedSpan.textContent = 'N/A';
    
    // Reset control states
    isSelectingStart = true;
    toggleControls(false);
    map.setView([initialCenterLat, initialCenterLng], 17);
    alert('Please click on the map to select a new start point.');
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
            alert('No route data available. Click on the map to set a route.');
        }
    }
    isPlaying = !isPlaying;
});

resetBtn.addEventListener('click', () => {
    resetSimulation();
});

speedSlider.addEventListener('input', (event) => {
    const multiplier = parseFloat(event.target.value);
    speedValueSpan.textContent = `${multiplier}x`;
    animationSpeed = 2000 / multiplier;

    if (isPlaying) {
        clearInterval(animationInterval);
        animationInterval = setInterval(updateVehiclePosition, animationSpeed);
    }
});

// Call initMap() when the page is loaded
document.addEventListener('DOMContentLoaded', initMap);
