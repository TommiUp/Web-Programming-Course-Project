// map.js

// Map Initialization
let map = L.map('map', { minZoom: -3 });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Global Variables
let GeoJsonData = null;
let currentColorMode = 'migration'; // Default mode is migration
let markers = [];  // To store the draggable markers
const maxMarkers = 2;
let isDraggingMarker = false;
let tempMarkerImg = null;

// Function to update the color based on the current mode (migration or population)
function getColorBasedOnMode(municipalityCode) {
    if (currentColorMode === 'migration') {
        const positiveMigration = positiveMigrationData[municipalityCode];
        const negativeMigration = negativeMigrationData[municipalityCode];
        let hue = 120;
        if (negativeMigration !== 0) {
            hue = Math.min(((positiveMigration / negativeMigration) ** 3) * 60, 120);
        }
        return `hsl(${hue}, 75%, 50%)`;
    } else if (currentColorMode === 'population') {
        const population = populationData[municipalityCode];
        if (population) {
            const maxPopulation = Math.max(...Object.values(populationData));
            const minPopulation = Math.min(...Object.values(populationData));

            // Logarithmic scaling for population coloring
            const logPopulation = Math.log(population - minPopulation + 1);
            const logMaxPopulation = Math.log(maxPopulation - minPopulation + 1);

            const percentage = logPopulation / logMaxPopulation; // Percentage based on log scale

            // Use color gradient
            let hue = 140 + percentage * 90;
            return `hsl(${hue}, 100%, 50%)`;
        }
        return '#ccc'; // Default color if data is unavailable
    }
}

// Function to update the color mode indicator
function updateColorModeIndicator() {
    const indicator = document.getElementById('color-mode-indicator');
    if (currentColorMode === 'migration') {
        indicator.textContent = 'Mode: Migration';
    } else {
        indicator.textContent = 'Mode: Population';
    }
}

// Function to initialize the map layer with migration and population data
function initializeMapLayer() {
    const layer = L.geoJSON(GeoJsonData, {
        style: (feature) => {
            const municipalityCode = "KU" + feature.properties.kunta.toString().padStart(3, '0');
            return { color: getColorBasedOnMode(municipalityCode), weight: 2 };
        },
        onEachFeature: (feature, layer) => {
            const municipalityCode = "KU" + feature.properties.kunta.toString().padStart(3, '0');
            const municipalityName = feature.properties.name;
            const positiveMigration = positiveMigrationData[municipalityCode];
            const negativeMigration = negativeMigrationData[municipalityCode];
            const population = populationData[municipalityCode] || "N/A";
            let popupContent;

            if (currentColorMode === 'migration') {
                // Show migration data
                popupContent = `
                    <ul>
                        <li>Municipality: ${municipalityName}</li>
                        <li>Positive Migration: ${positiveMigration}</li>
                        <li>Negative Migration: ${negativeMigration}</li>
                    </ul>
                    <button onclick="showChart('${municipalityCode}', '${municipalityName}', 'population')">View Population Chart</button>
                    <button onclick="showChart('${municipalityCode}', '${municipalityName}', 'employment')">View Employment Chart</button>
                    <button onclick="showChart('${municipalityCode}', '${municipalityName}', 'birth-death')">View Births and Deaths Chart</button>
                `;
            } else if (currentColorMode === 'population') {
                // Show population data
                popupContent = `
                    <ul>
                        <li>Municipality: ${municipalityName}</li>
                        <li>Population: ${population}</li>
                    </ul>
                    <button onclick="showChart('${municipalityCode}', '${municipalityName}', 'population')">View Population Chart</button>
                    <button onclick="showChart('${municipalityCode}', '${municipalityName}', 'employment')">View Employment Chart</button>
                    <button onclick="showChart('${municipalityCode}', '${municipalityName}', 'birth-death')">View Births and Deaths Chart</button>
                `;
            }
            layer.bindPopup(popupContent);
            layer.bindTooltip(municipalityName, { sticky: true });
        }
    }).addTo(map);

    map.fitBounds(layer.getBounds());
}

// Function to get municipality info by coordinates with leaflet-pip to point on polygon
async function getMunicipalityInfoByCoords(lat, lng) {
    let foundMunicipality = null;
    const results = leafletPip.pointInLayer([lng, lat], L.geoJSON(GeoJsonData), true);
    if (results.length > 0) {
        const feature = results[0].feature;
        const municipalityCode = "KU" + feature.properties.kunta.toString().padStart(3, '0');
        const municipalityName = feature.properties.name;
        foundMunicipality = {
            name: municipalityName,
            municipalityCode: municipalityCode
        };
    }
    return foundMunicipality;
}

// Function to initialize the map with data
async function initializeMap() {
    const geoJsonUrl = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326";
    const positiveMigrationUrl = "https://statfin.stat.fi/PxWeb/sq/4bb2c735-1dc3-4c5e-bde7-2165df85e65f";
    const negativeMigrationUrl = "https://statfin.stat.fi/PxWeb/sq/944493ca-ea4d-4fd9-a75c-4975192f7b6e";

    // Fetch all required data
    const [geoJsonDataResponse, positiveMigrationResponse, negativeMigrationResponse] = await Promise.all([
        fetchData(geoJsonUrl),
        fetchData(positiveMigrationUrl),
        fetchData(negativeMigrationUrl)
    ]);
    GeoJsonData = geoJsonDataResponse;
    const fetchPopulationPromises = GeoJsonData.features.map(async (feature) => {
        const municipalityCode = "KU" + feature.properties.kunta.toString().padStart(3, '0');
        await fetchPopulationData(municipalityCode); // Fetch population data for each municipality
    });

    // Wait for all population data to be fetched
    await Promise.all(fetchPopulationPromises);

    // Process the migration data
    positiveMigrationData = processMigrationData(positiveMigrationResponse, "Tuloalue");
    negativeMigrationData = processMigrationData(negativeMigrationResponse, "Lähtöalue");

    // Initialize the map with the data
    initializeMapLayer();
}

// Function to add a marker at a given position
async function addMarkerAtPosition(latLng) {
    if (markers.length >= maxMarkers) {
        alert('You can only add two markers.');
        return;
    }

    // Add a new marker at the given location
    const newMarker = L.marker(latLng, {
        draggable: true,
        autoPan: true
    }).addTo(map);

    // Fetches municipality info and updates the tooltip
    const municipalityInfo = await getMunicipalityInfoByCoords(latLng.lat, latLng.lng);
    if (municipalityInfo) {
        const { name, municipalityCode } = municipalityInfo;
        const population = populationData[municipalityCode] || "N/A";
        const positiveMigration = positiveMigrationData[municipalityCode] || "N/A";
        const negativeMigration = negativeMigrationData[municipalityCode] || "N/A";

        newMarker.bindTooltip(
            `<div style="background-color: lightblue; color: black; padding: 5px; border-radius: 5px;">
                <strong>${name}</strong><br>
                Population: ${population}<br>
                Positive Migration: ${positiveMigration}<br>
                Negative Migration: ${negativeMigration}
            </div>`,
            { permanent: true }
        ).openTooltip();
    }

    // Event listener to update the tooltip when the marker is dragged
    newMarker.on('dragend', async (event) => {
        const position = event.target.getLatLng();
        const municipalityInfo = await getMunicipalityInfoByCoords(position.lat, position.lng);
        if (municipalityInfo) {
            const { name, municipalityCode } = municipalityInfo;
            const population = populationData[municipalityCode] || "N/A";
            const positiveMigration = positiveMigrationData[municipalityCode] || "N/A";
            const negativeMigration = negativeMigrationData[municipalityCode] || "N/A";

            newMarker.bindTooltip(
                `<div style="background-color: lightblue; color: black; padding: 5px; border-radius: 5px;">
                    <strong>${name}</strong><br>
                    Population: ${population}<br>
                    Positive Migration: ${positiveMigration}<br>
                    Negative Migration: ${negativeMigration}
                </div>`,
                { permanent: true }
            ).openTooltip();
        }
    });

    // Add the new marker to the array of markers
    markers.push(newMarker);

    // Show the generate data button if two markers are placed
    if (markers.length >= 2) {
        document.getElementById('generate-new-data').style.display = 'block';
    }
}
