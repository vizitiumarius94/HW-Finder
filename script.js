// ------------------- SCRIPT -------------------
let carsData = {};
let wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');

const searchBar = document.getElementById('searchBar');
const clearBtn = document.getElementById('clearSearch');
const resultsDiv = document.getElementById('results');
const popup = document.getElementById('popup');
const detailsDiv = document.getElementById('details');
const popupClose = document.getElementById('popupClose');
const searchOldCases = document.getElementById('searchOldCases');

const wantedPageBtn = document.getElementById('wantedPageBtn');
const seriesPageBtn = document.getElementById('seriesPageBtn');
const ownedPageBtn = document.getElementById('ownedPageBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// ------------------- SERVICE WORKER + UPDATE POPUP -------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {

    function showUpdate(worker) {
      const banner = document.createElement('div');
      banner.innerHTML = `
        <div style="
          position:fixed; bottom:10px; left:50%; transform:translateX(-50%);
          background:#ff5722; color:white; padding:10px 20px;
          border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.3);
          font-family:sans-serif; z-index:9999;
        ">
          🔄 A new version is available.
          <button style="
            margin-left:10px; padding:5px 10px; border:none;
            background:white; color:#ff5722; border-radius:5px;
            cursor:pointer; font-weight:bold;
          ">Reload</button>
        </div>
      `;
      const button = banner.querySelector('button');
      button.addEventListener('click', () => {
        worker.postMessage({ action: 'skipWaiting' });
      });
      document.body.appendChild(banner);
    }

    if (reg.waiting) showUpdate(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdate(newWorker);
        }
      });
    });

  }).catch(err => console.error("SW registration failed:", err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
// ------------------- FETCH DATA -------------------
fetch('data.json')
  .then(res => res.json())
  .then(data => carsData = data);

// ------------------- SEARCH FUNCTION -------------------
function performSearch() {
  const query = searchBar.value.trim().toLowerCase();
  resultsDiv.innerHTML = '';
  if (!query) return;

  let searchType = null;
  let yearFilter = null;
  let seriesFilter = null;
  let caseFilter = null;

  // Determine search type
  if (query.startsWith('s-')) { // series search
    searchType = 'series';
    const parts = query.slice(2).split(' ');
    seriesFilter = parts[0].trim();
    if (parts[1]) yearFilter = parts[1].trim();

  } else if (query.startsWith('sth')) { // super treasure hunt
    searchType = 'sth';
    const parts = query.split('-');
    if (parts[1]) yearFilter = parts[1].trim();

  } else if (query.startsWith('th')) { // treasure hunt
    searchType = 'th';
    const parts = query.split('-');
    if (parts[1]) yearFilter = parts[1].trim();

  } else if (query.startsWith('c-')) { // case search
    searchType = 'case';
    const parts = query.slice(2).trim().split(/\s+/);
    const first = parts[0]?.trim();
    const second = parts[1]?.trim();

    // Detect if first part is a year
    if (/^\d{4}$/.test(first)) {
      yearFilter = first;
      if (second) caseFilter = second;
    } else {
      caseFilter = first;
      if (second && /^\d{4}$/.test(second)) yearFilter = second;
    }

  } else { // default: name search
    searchType = 'name';
  }

  Object.keys(carsData).forEach(yearKey => {
    // Skip old years if checkbox unchecked
    if (!searchOldCases.checked && parseInt(yearKey) < 2024) return;
    if (yearFilter && yearFilter !== yearKey) return;

    carsData[yearKey].cases.forEach(hwCase => {
      hwCase.cars.forEach(car => {
        let show = false;

        switch (searchType) {
          case 'series':
            if (car.series.toLowerCase().includes(seriesFilter)) show = true;
            break;

          case 'sth':
            if (hwCase.sth && car.hw_number === hwCase.sth.hw_number) show = true;
            break;

          case 'th':
            if (hwCase.th && car.hw_number === hwCase.th.hw_number) show = true;
            break;

          case 'case':
            if (!caseFilter) {
              // c-2025 → show all cases from 2025
              show = true;
            } else if (hwCase.letter.toLowerCase() === caseFilter.toLowerCase()) {
              // c-2025 a → show only case A
              show = true;
            }
            break;

          case 'name':
            if (car.name.toLowerCase().includes(query)) show = true;
            break;
        }

        if (show) {
          const card = document.createElement('div');
          card.classList.add('result-card');

          let isOwned = ownedCars.some(o => o.car.image === car.image);
          let isWanted = wantedCars.some(w => w.car.image === car.image);

          card.innerHTML = `
            <img src="${car.image}" alt="${car.name}">
            <div class="card-info">
              <h3>${car.name}</h3>
              <p>${yearKey} - ${hwCase.letter}</p>
              <p>${car.series} (#${car.series_number})</p>
              <p>HW#: ${car.hw_number} | Color: ${car.color}</p>
              <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
                ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
              </button>
              ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
            </div>
          `;

          // Popup click
          card.addEventListener('click', e => {
            if (e.target.tagName.toLowerCase() === 'button') return;
            showDetails(yearKey, hwCase, car);
          });

          // Owned toggle
          const ownedBtn = card.querySelector('.owned-btn, .unowned-btn');
          ownedBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (isOwned) {
              ownedCars = ownedCars.filter(o => o.car.image !== car.image);
              localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
              ownedBtn.textContent = 'Mark Owned';
              ownedBtn.className = 'owned-btn';
              isOwned = false;
            } else {
              ownedCars.push({ year: yearKey, caseLetter: hwCase.letter, car });
              localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
              ownedBtn.textContent = 'Unmark Owned';
              ownedBtn.className = 'unowned-btn';
              isOwned = true;
            }
          });

          // Add to wanted
          const addWantedBtn = card.querySelector('.add-wanted-btn');
          if (addWantedBtn) {
            addWantedBtn.addEventListener('click', e => {
              e.stopPropagation();
              wantedCars.push({ year: yearKey, caseLetter: hwCase.letter, car });
              localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
              addWantedBtn.style.display = 'none';
            });
          }

          resultsDiv.appendChild(card);
        }
      });
    });
  });
}

// ------------------- SEARCH BAR + CLEAR BUTTON ------------------
// Trigger search on input
searchBar.addEventListener('input', () => {
  performSearch();
  clearBtn.style.display = searchBar.value ? 'block' : 'none';
});

// Trigger search on checkbox change
searchOldCases.addEventListener('change', performSearch);

// Clear button logic
clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  searchBar.value = '';
  clearBtn.style.display = 'none';
  performSearch();
  searchBar.focus(); // keep typing immediately
});
// ------------------- SHOW DETAILS POPUP -------------------
function showDetails(year, hwCase, car) {
  detailsDiv.innerHTML = `
    <div class="card-detail">
      <img src="${car.image}" alt="${car.name}">
      <div class="card-info">
        <h2>${car.name}</h2>
        <p><strong>Year:</strong> ${year}</p>
        <p><strong>Case:</strong> ${hwCase.letter}</p>
        <p><strong>Series:</strong> ${car.series} (#${car.series_number})</p>
        <p><strong>HW Number:</strong> ${car.hw_number}</p>
        <p><strong>Color:</strong> ${car.color}</p>
        <h3>Treasure Hunt:</h3>
        <p>${hwCase.th?.name || 'N/A'}</p>
        ${hwCase.th?.image ? `<img src="${hwCase.th.image}" alt="TH" style="max-width:150px;">` : ''}
        <h3>Super Treasure Hunt:</h3>
        <p>${hwCase.sth?.name || 'N/A'}</p>
        ${hwCase.sth?.image ? `<img src="${hwCase.sth.image}" alt="STH" style="max-width:150px;">` : ''}
        <p></p>
        <button id="addWantedBtn" class="action-btn">+ Add to Wanted</button>
        <p></p>
        <button id="showAllCaseBtn" class="action-btn">Show All Cars from Case ${hwCase.letter}</button>
        <p></p>
        <button id="showAllSeriesBtn" class="action-btn">Show All Cars from Series ${car.series} (${year})</button>
        <p></p>
        <div id="allCarsGrid" class="results-grid"></div>
      </div>
    </div>
  `;

  const addBtn = document.getElementById('addWantedBtn');
  if (wantedCars.some(w => w.car.image === car.image)) addBtn.style.display = 'none';
  else addBtn.addEventListener('click', () => {
    wantedCars.push({ year, caseLetter: hwCase.letter, car });
    localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
    addBtn.style.display = 'none';
  });

  const allCarsGrid = document.getElementById('allCarsGrid');

  // Helper: extract first numeric part from series_number
  const extractSeriesNumber = val => {
    if (!val) return 0;
    const m = String(val).match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  };

  // Show all cars from this case
  document.getElementById('showAllCaseBtn').addEventListener('click', e => {
    e.stopPropagation();
    allCarsGrid.innerHTML = '';
    hwCase.cars.forEach(c => renderCarCard(year, hwCase.letter, c, allCarsGrid));
  });

  // Show all cars from this series (across all cases)
  document.getElementById('showAllSeriesBtn').addEventListener('click', e => {
    e.stopPropagation();
    allCarsGrid.innerHTML = '';

    // Collect all cars from all cases of this series
    const collected = carsData[year].cases.flatMap(hwCaseItem =>
      hwCaseItem.cars
        .filter(c => c.series === car.series)
        .map(c => ({ year, caseLetter: hwCaseItem.letter, car: c }))
    );

    // Sort cars by series_number, then HW number, then color
    collected.sort((a, b) => {
      const numA = extractSeriesNumber(a.car.series_number);
      const numB = extractSeriesNumber(b.car.series_number);
      if (numA !== numB) return numA - numB;

      const hwA = parseInt(String(a.car.hw_number).match(/\d+/)?.[0] || '0', 10);
      const hwB = parseInt(String(b.car.hw_number).match(/\d+/)?.[0] || '0', 10);
      if (hwA !== hwB) return hwA - hwB;

      return (a.car.color || '').localeCompare(b.car.color || '');
    });

    collected.forEach(entry => renderCarCard(entry.year, entry.caseLetter, entry.car, allCarsGrid));
  });

  popup.style.display = 'block';
  document.body.classList.add('popup-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// ------------------- RENDER CAR CARD HELPER -------------------
function renderCarCard(year, caseLetter, c, container) {
  const div = document.createElement('div');
  div.classList.add('result-card');

  let isOwned = ownedCars.some(o => o.car.image === c.image);
  let isWanted = wantedCars.some(w => w.car.image === c.image);

  div.innerHTML = `
    <img src="${c.image}" alt="${c.name}">
    <div class="card-info">
      <h3>${c.name}</h3>
      <p>${year} - ${caseLetter}</p>
      <p>${c.series} (#${c.series_number})</p>
      <p>HW#: ${c.hw_number} | Color: ${c.color}</p>
      <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
        ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
      </button>
      ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
    </div>
  `;

  // Owned toggle
  const ownedBtn = div.querySelector('.owned-btn, .unowned-btn');
  ownedBtn.addEventListener('click', () => {
    if (isOwned) {
      ownedCars = ownedCars.filter(o => o.car.image !== c.image);
      localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
      ownedBtn.textContent = 'Mark Owned';
      ownedBtn.className = 'owned-btn';
      isOwned = false;
    } else {
      ownedCars.push({ year, caseLetter, car: c });
      localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
      ownedBtn.textContent = 'Unmark Owned';
      ownedBtn.className = 'unowned-btn';
      isOwned = true;
    }
  });

  // Wanted toggle
  const addWantedBtn = div.querySelector('.add-wanted-btn');
  if (addWantedBtn) {
    addWantedBtn.addEventListener('click', () => {
      wantedCars.push({ year, caseLetter, car: c });
      localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
      addWantedBtn.style.display = 'none';
    });
  }

  container.appendChild(div);
}
// ------------------- POPUP CLOSE -------------------
popupClose.addEventListener('click', () => {
  popup.style.display = 'none';
  document.body.classList.remove('popup-open');
});

// ------------------- NAVIGATION -------------------
wantedPageBtn.addEventListener('click', () => window.location.href = 'wanted.html');
seriesPageBtn.addEventListener('click', () => window.location.href = 'series.html');
ownedPageBtn.addEventListener('click', () => window.location.href = 'owned.html');

// ------------------- EXPORT -------------------
exportBtn.addEventListener('click', () => {
  if (!wantedCars.length && !ownedCars.length) return alert("No data to export!");
  const dataToExport = { wantedCars, ownedCars };
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hotwheels_data.json';
  a.click();
  URL.revokeObjectURL(url);
});

// ------------------- IMPORT -------------------
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result);
      wantedCars = imported.wantedCars || [];
      ownedCars = imported.ownedCars || [];
      localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
      localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
      alert("Import successful! Existing data replaced.");
      performSearch();
    } catch(err) {
      alert("Failed to import: " + err.message);
    }
  };
  reader.readAsText(file);
});