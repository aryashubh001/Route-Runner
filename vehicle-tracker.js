// Global Google Maps objects
let map;
// directionsService is no longer needed as we're using dummy data
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


// Function called by the Google Maps API when it's fully loaded (specified in vehicle-tracker.html callback)
async function initMap() {
    // Initialize the map
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: initialCenterLat, lng: initialCenterLng }, // Initial center (India Gate coordinates)
        zoom: 17, // Good zoom for street level
        mapId: 'DEMO_MAP_ID', // You can create a custom map style in Cloud Console and link it here
        disableDefaultUI: true // Optional: Remove default UI controls like zoom, street view
    });

    // directionsService is no longer initialized or used here

    // Initialize the full route polyline (will be updated after dummy data load)
    fullRoutePolyline = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#007bff', // Blue for the full route
        strokeOpacity: 0.7,
        strokeWeight: 5
    });
    fullRoutePolyline.setMap(map);

    // Initialize the vehicle trace polyline (drawn as vehicle moves)
    vehicleTracePolyline = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#00FF00', // Bright green for the trace
        strokeOpacity: 0.9,
        strokeWeight: 6
    });
    vehicleTracePolyline.setMap(map);

    // Fetch route data from local dummy.json file
    await fetchDummyRouteData();
}

// NEW: Function to fetch dummy data from local JSON file
async function fetchDummyRouteData() {
    loadingOverlay.classList.remove('hidden'); // Show loading overlay
    try {
        const response = await fetch('./dummy-route.json'); // Fetch from local JSON
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Convert raw data to Google Maps LatLng objects for use
        const decodedPath = data.map(point => new google.maps.LatLng(point.latitude, point.longitude));
        
        // Set the full route polyline on the map
        fullRoutePolyline.setPath(decodedPath);

        // Store route points for animation, using original timestamps from JSON
        routePoints = data; 
        
        // Fit the map to the bounds of the dummy route
        if (routePoints.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            routePoints.forEach(point => {
                bounds.extend(new google.maps.LatLng(point.latitude, point.longitude));
            });
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

// Function to calculate distance between two LatLng points in kilometers (using Google's geometry library)
function calculateDistance(latlng1, latlng2) {
    const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(latlng1, latlng2);
    return distanceMeters / 1000; // Convert to kilometers
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
        if (fullRoutePolyline.getPath().getLength() > 0) {
            map.fitBounds(fullRoutePolyline.getBounds());
        }
        return;
    }

    const currentPointData = routePoints[currentIndex];
    // Create a new Google Maps LatLng object for the current position
    const currentLatLng = new google.maps.LatLng(currentPointData.latitude, currentPointData.longitude);

    if (!vehicleMarker) {
        // Create vehicle marker if it doesn't exist
        vehicleMarker = new google.maps.Marker({
            position: currentLatLng,
            map: map, // Assign to the map
            icon: {
                url: 'https://cdn-icons-png.flaticon.com/512/1046/1046777.png', // Red car icon
                scaledSize: new google.maps.Size(40, 40), // Size of the icon
                anchor: new google.maps.Point(20, 40) // Point of the icon which will correspond to marker's location
            },
            title: 'Vehicle'
        });
        
        // Set initial start time for elapsed time calculation
        startTime = new Date(currentPointData.timestamp);
    } else {
        // Update existing marker's position
        vehicleMarker.setPosition(currentLatLng);
    }

    // Add current point to the vehicle's trace polyline
    const path = vehicleTracePolyline.getPath();
    path.push(currentLatLng);
    vehicleTracePolyline.setPath(path); // Update the polyline on the map

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
        const prevLatLng = new google.maps.LatLng(prevPointData.latitude, prevPointData.longitude);

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
    clearInterval(animationInterval); // Stop any ongoing animation
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
    currentIndex = 0; // Reset index to the start of the route

    // Remove vehicle marker from map if it exists
    if (vehicleMarker) {
        vehicleMarker.setMap(null); // Remove marker from map
        vehicleMarker = null; // Clear reference
    }
    
    // Clear vehicle trace polyline
    if (vehicleTracePolyline) {
        vehicleTracePolyline.setPath([]); // Clear the path
    }

    // Reset metadata display
    currentCoordsSpan.textContent = 'N/A';
    elapsedTimeSpan.textContent = '00:00:00';
    currentSpeedSpan.textContent = 'N/A';

    // Reset map view to the start of the fetched route if available
    if (routePoints.length > 0) {
        map.setCenter(new google.maps.LatLng(routePoints[0].latitude, routePoints[0].longitude));
        map.setZoom(17);
    } else {
         // Fallback to initial general view if no route data
         map.setCenter({ lat: initialCenterLat, lng: initialCenterLng }); 
         map.setZoom(17); // Keep zoom consistent
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
        // Start/resume animation only if route data is available
        if (routePoints.length > 0) {
            // Set interval for animation. 'animationSpeed' determines how fast points are processed.
            animationInterval = setInterval(updateVehiclePosition, animationSpeed);
            playPauseBtn.textContent = 'Pause';
        } else {
            alert('No route data available to start simulation. Please wait for dummy data to load.');
        }
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

// The Google Maps API will call initMap() automatically when it's ready.
