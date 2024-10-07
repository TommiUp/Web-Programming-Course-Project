// chart.js

// Variables for chart
var chartInstance = null;
var originalChartData = null;

// Function to show charts
async function showChart(municipalityCode, municipalityName, type) {
    const chartContainer = document.getElementById('chart-container');
    const addPredictionBtn = document.getElementById('add-prediction');
    chartContainer.style.display = 'block';
    document.getElementById('map').style.display = 'none';
    document.getElementById('change-color-hue').style.visibility = 'hidden';
    document.getElementById('color-mode-indicator').style.visibility = 'hidden';
    const chartElement = document.getElementById('chart');
    let chartData;
    if (type === 'population') {
        // Fetch population data for the selected municipality
        const populationDataResponse = await fetchPopulationData(municipalityCode);
        if (populationDataResponse) {
            chartData = {
                labels: populationDataResponse.years,
                datasets: [{ name: "Population", values: populationDataResponse.values }]
            };
            originalChartData = { ...chartData };  // Store original data
            addPredictionBtn.style.display = 'block';  // Show prediction button
        }
    } else if (type === 'employment') {
        // Fetch employment data for the selected municipality
        const employmentData = await fetchEmploymentData(municipalityCode);
        if (employmentData) {
            chartData = {
                labels: employmentData.years,
                datasets: [
                    { name: "Employment %", values: employmentData.employmentValues },
                    { name: "Unemployment %", values: employmentData.unemploymentValues }
                ]
            };
            addPredictionBtn.style.display = 'none';
        }
    } else if (type === 'birth-death') {
        // Fetch birth and death data for the selected municipality
        const birthDeathData = await fetchBirthAndDeathData(municipalityCode);
        if (birthDeathData) {
            chartData = {
                labels: birthDeathData.years,
                datasets: [
                    { name: "Births", values: birthDeathData.births },
                    { name: "Deaths", values: birthDeathData.deaths }
                ]
            };
            addPredictionBtn.style.display = 'none';
        } else {
            return;
        }
    }

    chartInstance = new frappe.Chart(chartElement, {
        title: `${type === 'population' ? 'Population' : type === 'employment' ? 'Employment' : 'Births and Deaths'} in ${municipalityName} (2000-2021)`,
        data: chartData,
        type: type === 'population' ? 'line' : 'bar', // Population as 'line', others as 'bar'
        height: 450,
        axisOptions: {
            xAxisMode: 'tick',
            xIsSeries: true,
        },
        barOptions: {
            stacked: false,
        },
        lineOptions: {
            hideDots: 1,
        }
    });
}

// Function to add population prediction
function addDataPrediction() {
    if (chartInstance && originalChartData) {
        const values = chartInstance.data.datasets[0].values.slice();  // Clone values
        const labels = chartInstance.data.labels.slice();  // Clone labels

        // Calculate deltas (difference between consecutive years)
        const deltas = values.slice(1).map((value, index) => value - values[index]);
        const meanDelta = deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;

        // Add predicted data
        const newValue = Math.round(values[values.length - 1] + meanDelta);
        values.push(newValue);
        const lastYear = parseInt(labels[labels.length - 1]);
        labels.push((lastYear + 1).toString());

        // Update chart data
        chartInstance.update({
            labels: labels,
            datasets: [{ name: "Population", values: values }]
        });
    }
}

function showCombinedChart(chartData, operation, name1, name2) {
    // Hide map and show chart container
    const chartContainer = document.getElementById('chart-container');
    chartContainer.style.display = 'block';
    document.getElementById('map').style.display = 'none';
    document.getElementById('change-color-hue').style.visibility = 'hidden';
    document.getElementById('color-mode-indicator').style.visibility = 'hidden';
    document.getElementById('add-prediction').style.display = 'none';
    const chartElement = document.getElementById('chart');

    // Create chart instance
    chartInstance = new frappe.Chart(chartElement, {
        title: `Combined Population Data (${operation})`,
        data: chartData,
        type: 'line',
        height: 450,
        axisOptions: {
            xAxisMode: 'tick',
            xIsSeries: true,
        },
        lineOptions: {
            hideDots: 1,
        }
    });
}

// Function to combine data with switch case for operations
function combineData(values1, values2, operation) {
    // Ensure values1 and values2 are arrays of the same length
    const length = Math.min(values1.length, values2.length);
    const combinedValues = [];
    for (let i = 0; i < length; i++) {
        const val1 = values1[i];
        const val2 = values2[i];
        let combinedValue;
        switch (operation) {
            case 'add':
                combinedValue = val1 + val2;
                break;
            case 'subtract':
                combinedValue = val1 - val2;
                break;
            case 'multiply':
                combinedValue = val1 * val2;
                break;
            case 'divide':
                combinedValue = val2 !== 0 ? val1 / val2 : null;
                break;
            default:
                combinedValue = null;
                break;
        }
        combinedValues.push(combinedValue);
    }
    return combinedValues;
}
