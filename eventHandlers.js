// eventHandlers.js

// Download Chart button
document.getElementById('download-chart-png').addEventListener('click', downloadChartPNG);

// Change color mode button
document.getElementById('change-color-hue').addEventListener('click', () => {
    currentColorMode = currentColorMode === 'migration' ? 'population' : 'migration';
    map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });
    initializeMapLayer(); // Re-initialize the map layer with the new color mode

    updateColorModeIndicator();
});

// Marker drag and drop for desktop
const markerImg = document.getElementById('draggable-marker');
markerImg.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', 'marker');
});

map.getContainer().addEventListener('dragover', (event) => {
    event.preventDefault();
});

map.getContainer().addEventListener('drop', async (event) => {
    event.preventDefault();
    const latLng = map.mouseEventToLatLng(event);
    await addMarkerAtPosition(latLng);
});

// Touch events for mobile devices
markerImg.addEventListener('touchstart', (event) => {
    event.preventDefault();
    isDraggingMarker = true;

    // Create a temporary marker image to follow the touch
    tempMarkerImg = document.createElement('img');
    tempMarkerImg.src = markerImg.src;
    tempMarkerImg.style.position = 'absolute';
    tempMarkerImg.style.width = '30px';
    tempMarkerImg.style.height = '50px';
    tempMarkerImg.style.pointerEvents = 'none'; // Make sure the image doesn't capture touch events
    tempMarkerImg.style.zIndex = '10000';
    document.body.appendChild(tempMarkerImg);

    // Position the temporary image at the touch point
    const touch = event.touches[0];
    tempMarkerImg.style.left = `${touch.clientX - 15}px`;
    tempMarkerImg.style.top = `${touch.clientY - 50}px`;
});

document.addEventListener('touchmove', (event) => {
    if (isDraggingMarker && tempMarkerImg) {
        const touch = event.touches[0];
        tempMarkerImg.style.left = `${touch.clientX - 15}px`;
        tempMarkerImg.style.top = `${touch.clientY - 50}px`;
    }
});

document.addEventListener('touchend', async (event) => {
    if (isDraggingMarker && tempMarkerImg) {
        // Get the position where the touch ended
        const touch = event.changedTouches[0];
        const x = touch.clientX;
        const y = touch.clientY;

        // Convert the screen coordinates to map coordinates
        const mapContainer = map.getContainer();
        const rect = mapContainer.getBoundingClientRect();
        const containerPoint = L.point(x - rect.left, y - rect.top);
        const latLng = map.containerPointToLatLng(containerPoint);

        // Add the marker at the position
        await addMarkerAtPosition(latLng);

        // Clean up
        document.body.removeChild(tempMarkerImg);
        tempMarkerImg = null;
        isDraggingMarker = false;
    }
});

// Close chart button
document.getElementById('close-chart').addEventListener('click', closeChart);

// Add prediction button
document.getElementById('add-prediction').addEventListener('click', addDataPrediction);

// Generate New Data button
document.getElementById('generate-new-data').addEventListener('click', generateNewData);

// Other functions related to events

function closeChart() {
    document.getElementById('chart-container').style.display = 'none';
    document.getElementById('map').style.display = 'block';
    document.getElementById('change-color-hue').style.visibility = 'visible';
    document.getElementById('color-mode-indicator').style.visibility = 'visible';
    document.getElementById('add-prediction').style.display = 'none';

    // Reset chart
    if (chartInstance) {
        chartInstance = null;
        originalChartData = null;
    }

    // Keep 'Generate New Data' button visible if two markers are still present
    if (markers.length >= 2) {
        document.getElementById('generate-new-data').style.display = 'block';
    } else {
        document.getElementById('generate-new-data').style.display = 'none';
    }

    map.invalidateSize(); // Ensures the map is properly resized and event listeners work
}

async function generateNewData() {
    // Check that there are 2 markers
    if (markers.length !== 2) {
        alert('Please place two markers on the map.');
        return;
    }

    // Get the municipalities of the 2 markers
    const marker1 = markers[0];
    const marker2 = markers[1];

    // Get the positions of the markers
    const position1 = marker1.getLatLng();
    const position2 = marker2.getLatLng();

    // Get the municipality info for each marker
    const municipalityInfo1 = await getMunicipalityInfoByCoords(position1.lat, position1.lng);
    const municipalityInfo2 = await getMunicipalityInfoByCoords(position2.lat, position2.lng);

    if (municipalityInfo1 && municipalityInfo2) {
        const { name: name1, municipalityCode: code1 } = municipalityInfo1;
        const { name: name2, municipalityCode: code2 } = municipalityInfo2;

        // Fetch population data for both municipalities
        const data1 = await fetchPopulationData(code1);
        const data2 = await fetchPopulationData(code2);

        // Proceed only if data is available
        if (data1 && data2) {
            // Show a modal or form to the user to select operation
            showDataCombinationOptions(data1, data2, name1, name2);
        }
    }
}

function showDataCombinationOptions(data1, data2, name1, name2) {
    // Display the modal
    const modal = document.getElementById('data-combination-modal');
    modal.style.display = 'block';

    // Close modal when 'X' is clicked
    document.getElementById('close-modal').onclick = () => {
        modal.style.display = 'none';
    };

    // Handle 'Generate Chart' button click
    document.getElementById('generate-chart').onclick = () => {
        const operation = document.getElementById('data-operation').value;

        // Combine the data based on selected operation
        const combinedValues = combineData(data1.values, data2.values, operation);

        // Prepare chart data
        const chartData = {
            labels: data1.years,
            datasets: [
                { name: `${name1}`, values: data1.values },
                { name: `${name2}`, values: data2.values },
                { name: `Combined (${operation})`, values: combinedValues }
            ]
        };

        // Close the form and show the chart
        modal.style.display = 'none';
        showCombinedChart(chartData, operation, name1, name2);
    };
}

function downloadChartPNG() {
    if (chartInstance) {
        const chartElement = document.getElementById('chart');
        const svgElement = chartElement.querySelector('svg');

        if (svgElement) {
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);

            // Add namespaces if they are missing
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
                source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
            }

            // Convert SVG source to URI data scheme
            const svgData = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

            const image = new Image();
            image.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const context = canvas.getContext('2d');

                // Fill canvas with white background
                context.fillStyle = 'white';
                context.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the SVG image onto the canvas
                context.drawImage(image, 0, 0);

                const imgData = canvas.toDataURL('image/png');

                // Create a download link and trigger click
                const downloadLink = document.createElement('a');
                downloadLink.href = imgData;
                downloadLink.download = 'chart.png';

                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            };
            image.src = svgData;
        }
    }
}
