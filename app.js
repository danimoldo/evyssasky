// DOM Elements
const searchBtn = document.getElementById('search-btn');
const flightInput = document.getElementById('flight-input');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const resultState = document.getElementById('result-state');
const errorMessage = document.getElementById('error-message');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const apiKeyInput = document.getElementById('api-key-input');

// State
let apiKey = localStorage.getItem('aviationStackApiKey') || '514b211ac77002a7544d1f7f49efba53';
if (apiKey) apiKeyInput.value = apiKey;

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
flightInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('aviationStackApiKey', apiKey);
    } else {
        localStorage.removeItem('aviationStackApiKey');
    }
    settingsModal.classList.add('hidden');
    alert('Settings saved!');
});

// Main Search Handler
async function handleSearch() {
    const flightNumber = flightInput.value.trim().toUpperCase();
    if (!flightNumber) return;

    // Reset UI
    hideAllSections();
    loadingState.classList.remove('hidden');

    try {
        let data;
        if (apiKey) {
            data = await fetchRealFlightData(flightNumber);
        } else {
            // Simulate network delay for mock
            await new Promise(resolve => setTimeout(resolve, 1500));
            data = getMockFlightData(flightNumber);
        }

        renderFlightData(data);
    } catch (error) {
        console.error(error);
        showError(error.message || 'Failed to fetch flight data.');
    }
}

// Real API Call
async function fetchRealFlightData(flightNumber) {
    // AviationStack API endpoint
    // Note: Free tier doesn't support HTTPS on some endpoints, but we'll try HTTPS first.
    // If it fails due to mixed content (if hosted on HTTPS), user needs upgrade.
    // For local file, HTTP is fine.
    // Use allorigins proxy to bypass Mixed Content (HTTPS -> HTTP) block
    const targetUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`;
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.error) {
        throw new Error(result.error.info || 'API Error');
    }

    if (!result.data || result.data.length === 0) {
        throw new Error('Flight not found.');
    }

    // Return the most recent/relevant flight
    return result.data[0];
}

// Mock Data Generator
function getMockFlightData(flightNumber) {
    // Deterministic mock based on flight number hash or just random
    const airlines = ['American Airlines', 'British Airways', 'Lufthansa', 'Emirates', 'Delta', 'Singapore Airlines'];
    const airports = [
        { code: 'JFK', city: 'New York', timezone: 'America/New_York' },
        { code: 'LHR', city: 'London', timezone: 'Europe/London' },
        { code: 'DXB', city: 'Dubai', timezone: 'Asia/Dubai' },
        { code: 'SIN', city: 'Singapore', timezone: 'Asia/Singapore' },
        { code: 'FRA', city: 'Frankfurt', timezone: 'Europe/Berlin' },
        { code: 'LAX', city: 'Los Angeles', timezone: 'America/Los_Angeles' },
        { code: 'HND', city: 'Tokyo', timezone: 'Asia/Tokyo' }
    ];

    const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
    const dep = airports[Math.floor(Math.random() * airports.length)];
    let arr = airports[Math.floor(Math.random() * airports.length)];
    while (arr.code === dep.code) {
        arr = airports[Math.floor(Math.random() * airports.length)];
    }

    const statuses = ['active', 'scheduled', 'landed', 'delayed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // Generate times
    const now = new Date();
    const depTime = new Date(now.getTime() - Math.random() * 3600000 * 5); // 0-5 hours ago
    const arrTime = new Date(depTime.getTime() + 3600000 * (2 + Math.random() * 10)); // 2-12 hours flight

    return {
        flight_status: status,
        airline: { name: randomAirline },
        flight: { iata: flightNumber },
        departure: {
            iata: dep.code,
            airport: `${dep.city} International`,
            timezone: dep.timezone,
            scheduled: depTime.toISOString(),
            terminal: Math.floor(Math.random() * 8) + 1,
            gate: String.fromCharCode(65 + Math.floor(Math.random() * 5)) + (Math.floor(Math.random() * 20) + 1)
        },
        arrival: {
            iata: arr.code,
            airport: `${arr.city} International`,
            timezone: arr.timezone,
            scheduled: arrTime.toISOString(),
            terminal: Math.floor(Math.random() * 8) + 1,
            gate: String.fromCharCode(65 + Math.floor(Math.random() * 5)) + (Math.floor(Math.random() * 20) + 1)
        },
        aircraft: { iata: 'B777' } // Generic
    };
}

// Render Function
function renderFlightData(data) {
    hideAllSections();
    resultState.classList.remove('hidden');

    // Basic Info
    document.getElementById('airline-name').textContent = data.airline.name;
    document.getElementById('flight-num').textContent = data.flight.iata;

    // Status
    const statusEl = document.getElementById('flight-status');
    statusEl.className = 'status-badge';
    statusEl.classList.add(`status-${data.flight_status}`);
    statusEl.textContent = data.flight_status.replace('_', ' ');

    // Departure
    document.getElementById('dep-code').textContent = data.departure.iata;
    document.getElementById('dep-city').textContent = getCityFromTimezone(data.departure.timezone);
    document.getElementById('dep-time').textContent = formatTime(data.departure.scheduled);
    document.getElementById('dep-date').textContent = formatDate(data.departure.scheduled);
    document.getElementById('dep-terminal').textContent = data.departure.terminal || '-';
    document.getElementById('dep-gate').textContent = data.departure.gate || '-';

    // Arrival
    document.getElementById('arr-code').textContent = data.arrival.iata;
    document.getElementById('arr-city').textContent = getCityFromTimezone(data.arrival.timezone);
    document.getElementById('arr-time').textContent = formatTime(data.arrival.scheduled);
    document.getElementById('arr-date').textContent = formatDate(data.arrival.scheduled);

    // Aircraft
    document.getElementById('aircraft-type').textContent = data.aircraft ? data.aircraft.iata : 'Unknown';

    // Duration (Calculated)
    const start = new Date(data.departure.scheduled);
    const end = new Date(data.arrival.scheduled);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    document.getElementById('flight-duration').textContent = `${hours}h ${mins}m`;

    // Update Map
    updateMap(data);
}

// Map Logic
let map;
let flightPath;
let markers = [];

// Airport Coordinates are now loaded from airports.js (global airportData)

function initMap() {
    if (map) return;

    // Initialize map with a flat, dark theme (CartoDB Dark Matter)
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

function updateMap(data) {
    initMap();

    // Clear previous layers
    if (flightPath) map.removeLayer(flightPath);
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const depCode = data.departure.iata;
    const arrCode = data.arrival.iata;

    // Use global airportData from airports.js
    const depCoords = airportData[depCode];
    const arrCoords = airportData[arrCode];

    if (depCoords && arrCoords) {
        // Add Markers
        const depMarker = L.marker(depCoords).addTo(map)
            .bindPopup(`<b>Departure</b><br>${depCode}`);
        const arrMarker = L.marker(arrCoords).addTo(map)
            .bindPopup(`<b>Arrival</b><br>${arrCode}`);

        markers.push(depMarker, arrMarker);

        // Draw Line
        flightPath = L.polyline([depCoords, arrCoords], {
            color: '#6366f1', // Primary color
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10',
            lineCap: 'round'
        }).addTo(map);

        // Fit bounds
        map.fitBounds([depCoords, arrCoords], { padding: [50, 50] });
    } else {
        // If coords missing, just show world view
        map.setView([20, 0], 2);
        console.warn(`Map coordinates missing for route: ${depCode} -> ${arrCode}`);

        // For now, we just center the map.
    }
}

// Helpers
function hideAllSections() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    resultState.classList.add('hidden');
    // Also hide map container if hidden, but we keep it inside result-state usually?
    // Actually, map-container is outside result-state in HTML structure?
    // Let's check HTML. It's inside #result-state. Good.
}

function showError(msg) {
    hideAllSections();
    errorState.classList.remove('hidden');
    errorMessage.textContent = msg;
}

function formatTime(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(isoString) {
    if (!isoString) return '---';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getCityFromTimezone(timezone) {
    if (!timezone) return 'Unknown City';
    return timezone.split('/')[1].replace('_', ' ');
}
