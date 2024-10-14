// data.js

// Data Variables
let positiveMigrationData = {};
let negativeMigrationData = {};
let populationData = {};

// Fetch data from API
async function fetchData(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        return;
    }
    return await res.json();
}

// Process migration data
function processMigrationData(data, type) {
    const values = data.dataset.value;
    const codes = data.dataset.dimension[type].category.index;
    let migrationData = {};
    Object.keys(codes).forEach(code => {
        let index = codes[code];
        migrationData[code] = values[index];
    });
    return migrationData;
}

// Fetch population data for a specific municipality (including years 2000-2021)
async function fetchPopulationData(municipalityCode) {
    const populationQuery = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": ["2000", "2001", "2002", "2003", "2004", "2005",
                        "2006", "2007", "2008", "2009", "2010", "2011",
                        "2012", "2013", "2014", "2015", "2016", "2017",
                        "2018", "2019", "2020", "2021"]
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": [municipalityCode]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["vaesto"]
                }
            }
        ],
        "response": { "format": "json-stat2" }
    };

    const populationUrl = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

    const data = await fetchData(populationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(populationQuery)
    });

    if (data) {
        const years = Object.values(data.dimension.Vuosi.category.label);
        const values = data.value;
        populationData[municipalityCode] = values[years.indexOf("2021")]; // Save 2021 value for population
        return { years, values };
    } else {
        return null;
    }
}

// Fetch employment data for a specific municipality (including years 2000-2021)
async function fetchEmploymentData(municipalityCode) {
    const employmentQuery = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": ["2000", "2001", "2002", "2003", "2004", "2005",
                        "2006", "2007", "2008", "2009", "2010", "2011",
                        "2012", "2013", "2014", "2015", "2016", "2017",
                        "2018", "2019", "2020", "2021"]
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": [municipalityCode]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["tyollisyysaste", "tyottomyysaste"]
                }
            }
        ],
        "response": { "format": "json-stat2" }
    };

    const employmentUrl = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/tyokay/statfin_tyokay_pxt_115x.px";

    const data = await fetchData(employmentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employmentQuery)
    });

    if (data) {
        const years = Object.values(data.dimension.Vuosi.category.label);
        const employmentValues = data.value.filter((_, index) => index % 2 === 0);  // Employment
        const unemploymentValues = data.value.filter((_, index) => index % 2 !== 0);  // Unemployment
        return { years, employmentValues, unemploymentValues };
    } else {
        return null;
    }
}

// Fetch birth and death data for a specific municipality (including years 2000-2021)
async function fetchBirthAndDeathData(municipalityCode) {
    const birthDeathQuery = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": ["2000", "2001", "2002", "2003", "2004", "2005",
                        "2006", "2007", "2008", "2009", "2010", "2011",
                        "2012", "2013", "2014", "2015", "2016", "2017",
                        "2018", "2019", "2020", "2021"]
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": [municipalityCode]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["vm01", "vm11"] // Births and Deaths data codes
                }
            }
        ],
        "response": { "format": "json-stat2" }
    };

    const birthDeathUrl = "https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px";

    const data = await fetchData(birthDeathUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(birthDeathQuery)
    });

    if (data) {
        const years = Object.values(data.dimension.Vuosi.category.label);
        const births = data.value.filter((_, index) => index % 2 === 0); // Births
        const deaths = data.value.filter((_, index) => index % 2 !== 0); // Deaths
        return { years, births, deaths };
    } else {
        return null;
    }
}
