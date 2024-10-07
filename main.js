// main.js

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    document.getElementById('chart-container').style.display = 'none'; // Hide chart container
    document.getElementById('map').style.display = 'block'; // Ensure map is shown
});

// Handle screen orientation change
window.addEventListener('orientationchange', () => {
    map.invalidateSize();  // Refresh map when screen orientation changes
});
