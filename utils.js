// utils.js

// Global variable to hold the full car data once fetched
let globalCarsData = {};

/**
 * Fetches car data and stores it globally.
 * @returns {Promise<Object>} The car data object.
 */
function fetchCarData() {
    // Note: Assumes data.json is in the root directory
    return fetch('data.json')
        .then(res => res.json())
        .then(data => {
            globalCarsData = data;
            return data;
        })
        .catch(err => {
            console.error("Failed to fetch data.json in utils:", err);
            return {};
        });
}

/**
 * Gets the globally loaded car data.
 */
function getCarData() {
    return globalCarsData;
}

/**
 * Applies TH/STH styling (borders and icons) to a result card.
 * @param {HTMLElement} cardDiv The HTML div element of the card.
 * @param {string} year The car's model year.
 * @param {string} caseLetter The case letter (e.g., 'A', 'B').
 * @param {Object} car The car object containing name, hw_number, image, etc.
 * @returns {string} The HTML string containing the TH/STH icons, or an empty string.
 */
function applyHuntStyling(cardDiv, year, caseLetter, car) {
    const data = getCarData();
    const yearData = data[year];
    if (!yearData) return '';

    const caseData = yearData.cases.find(cs => cs.letter === caseLetter);
    if (!caseData) return '';

    let isTH = false;
    let isSTH = false;

    // Detection logic
    if (caseData.th && car.hw_number === caseData.th.hw_number && car.image === caseData.th.image) {
        isTH = true;
    }
    if (caseData.sth && car.hw_number === caseData.sth.hw_number && car.image === caseData.sth.image) {
        isSTH = true;
    }

    // Apply borders (since this affects the card div style)
    if (isSTH) {
        cardDiv.style.border = '4px solid gold';
        cardDiv.style.boxShadow = '0 0 10px gold';
    } else if (isTH) {
        cardDiv.style.border = '4px solid silver';
        cardDiv.style.boxShadow = '0 0 10px silver';
    }

    // Return the HTML string for the icons (using the hunt-badge class for sizing)
    return `
        ${isSTH ? '<p class="sth-label"><img src="images/STH.png" alt="STH" class="hunt-badge"></p>' : ''}
        ${isTH ? '<p class="th-label"><img src="images/TH.png" alt="TH" class="hunt-badge"></p>' : ''}
    `;
}