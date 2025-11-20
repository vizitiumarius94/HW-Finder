// popup.js

// NOTE: Assumes popup, details, and popupClose elements are in the main HTML.
const popup = document.getElementById('popup');
const detailsDiv = document.getElementById('details');
const popupClose = document.getElementById('popupClose');

// This helper must be available globally to find the data.
// It relies on 'carsData' being available from the main data load file (script.js).
function getCarData() {
    // Attempt to access the global carsData defined in script.js
    if (typeof window.carsData !== 'undefined') {
        return window.carsData;
    }
    console.error("carsData is not available globally!");
    return {};
}

// Helper to extract series number for sorting
const extractSeriesNumber = val => {
    if (!val) return 0;
    const m = String(val).match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
};

// --- CORE POPUP FUNCTION (Extracted from script.js) ---
function showDetails(year, hwCase, car) {
    // The wantedCars/ownedCars variables need to be updated from localStorage
    // since this file doesn't maintain its own copy.
    const wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');
    
    // --- 1. DETECT STATUS ---
    let isCarTH = false;
    let isCarSTH = false;
    
    // Check if the selected car IS the TH or STH for this case
    if (hwCase.th && car.hw_number === hwCase.th.hw_number && car.image === hwCase.th.image) {
        isCarTH = true;
    }
    if (hwCase.sth && car.hw_number === hwCase.sth.hw_number && car.image === hwCase.sth.image) {
        isCarSTH = true;
    }
    
    const hasCaseTH = !!hwCase.th;
    const hasCaseSTH = !!hwCase.sth;

    // Defined colors based on your style.css TH/STH borders
    const sthColor = 'style="color: #FFD700; text-shadow: 0px 0 9px #ffd700;"';
    const thColor = 'style="color: #C0C0C0; text-shadow: 0px 0 px #C0C0C0;"';
    
    const carNameStyle = isCarSTH ? sthColor : (isCarTH ? thColor : '');

    // --- 2. GENERATE HTML ---

    detailsDiv.innerHTML = `
        <div class="card-detail">
        <img src="${car.image}" alt="${car.name}">
        <div class="card-info">
            <h2 ${carNameStyle}>${car.name}</h2>
            <p><strong>Year:</strong> ${year}</p>
            <p><strong>Case:</strong> ${hwCase.letter}</p>
            <p><strong>Series:</strong> ${car.series} (#${car.series_number})</p>
            <p><strong>HW Number:</strong> ${car.hw_number}</p>
            <p><strong>Color:</strong> ${car.color}</p>
            
            <h3 ${hasCaseTH ? thColor : ''}>Treasure Hunt:</h3>
            <p ${hasCaseTH ? thColor : ''}>${hwCase.th?.name || 'N/A'}</p>
            ${hwCase.th?.image ? `<img src="${hwCase.th.image}" alt="TH" style="max-width:150px;">` : ''}
            
            <h3 ${hasCaseSTH ? sthColor : ''}>Super Treasure Hunt:</h3>
            <p ${hasCaseSTH ? sthColor : ''}>${hwCase.sth?.name || 'N/A'}</p>
            ${hwCase.sth?.image ? `<img src="${hwCase.sth.image}" alt="STH" style="max-width:150px;">` : ''}
            
            <p></p>
            <button id="addWantedBtn" class="add-wanted-btn action-btn">+ Add to Wanted</button>
            <p></p>
            <button id="showAllCaseBtn" class="action-btn">Show All Cars from Case ${hwCase.letter}</button>
            <p></p>
            <button id="showAllSeriesBtn" class="action-btn">Show All Cars from Series ${car.series} (${year})</button>
            <p></p>
            <div id="allCarsGrid" class="results-grid"></div>
        </div>
        </div>
    `;

    // --- 3. EVENT LISTENERS ---
    const addBtn = document.getElementById('addWantedBtn');
    // Check if wantedCars contains this car (using image path for unique ID)
    if (wantedCars.some(w => w.car.image === car.image)) {
        addBtn.style.display = 'none';
    } else {
        addBtn.addEventListener('click', () => {
            const currentWanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
            currentWanted.push({ year, caseLetter: hwCase.letter, car });
            localStorage.setItem('wantedCars', JSON.stringify(currentWanted));
            addBtn.style.display = 'none';
            // Trigger a UI update on the calling page (if possible)
            if (typeof window.performSearch === 'function') window.performSearch();
        });
    }

    const allCarsGrid = document.getElementById('allCarsGrid');

    document.getElementById('showAllCaseBtn').addEventListener('click', e => {
        e.stopPropagation();
        allCarsGrid.innerHTML = '';
        hwCase.cars.forEach(c => renderCarCard(year, hwCase.letter, c, allCarsGrid));
    });

    document.getElementById('showAllSeriesBtn').addEventListener('click', e => {
        e.stopPropagation();
        allCarsGrid.innerHTML = '';
        const data = getCarData();

        const collected = data[year].cases.flatMap(hwCaseItem =>
            hwCaseItem.cars
                .filter(c => c.series === car.series)
                .map(c => ({ year, caseLetter: hwCaseItem.letter, car: c }))
        );

        collected.sort((a, b) => {
            const numA = extractSeriesNumber(a.car.series_number);
            const numB = extractSeriesNumber(b.car.series_number);
            if (numA !== numB) return numA - numB;

            const hwA = parseInt(String(a.car.hw_number).match(/\d+/)?.[0] || '0', 10);
            const hwB = parseInt(String(b.car.hw_number).match(/\d+/)?.[0] || '0', 10);
            if (hwA !== hwB) return hwA - hwB;

            return (a.car.color || '').localeCompare(b.car.color || '');
        });

        // NOTE: renderCarCard must also be exposed globally or moved to this file
        collected.forEach(entry => window.renderCarCard(entry.year, entry.caseLetter, entry.car, allCarsGrid));
    });

    popup.style.display = 'block';
    document.body.classList.add('popup-open');
    //window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- POPUP CLOSE LISTENER ---
if (popupClose) {
    popupClose.addEventListener('click', () => {
        popup.style.display = 'none';
        document.body.classList.remove('popup-open');
    });
}


// --- EXPOSE GLOBALLY ---
window.showDetails = showDetails;
window.getCarData = getCarData; // Keep getCarData exposed as well