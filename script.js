// ------------------- SCRIPT -------------------
let carsData = {};
let wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');

const searchBar = document.getElementById('searchBar');
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

// ------------------- FETCH DATA -------------------
fetch('data.x')
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
    const parts = query.slice(2).split(' ');
    caseFilter = parts[0].trim();
    if (parts[1]) yearFilter = parts[1].trim();
  } else { // default: name search
    searchType = 'name';
  }

  Object.keys(carsData).forEach(yearKey => {
    // Skip years <2023 if checkbox is unchecked
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
            if (hwCase.letter.toLowerCase() === caseFilter) show = true;
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

// Trigger search on input and checkbox change
searchBar.addEventListener('input', performSearch);
searchOldCases.addEventListener('change', performSearch);

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
        <button id="addWantedBtn" class="action-btn">+ Add to Wanted</button>
        <button id="showAllCaseBtn" class="action-btn">Show All Cars from Case ${hwCase.letter}</button>
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

  const showAllBtn = document.getElementById('showAllCaseBtn');
  const allCarsGrid = document.getElementById('allCarsGrid');

  showAllBtn.addEventListener('click', () => {
    allCarsGrid.innerHTML = '';
    hwCase.cars.forEach(c => {
      const div = document.createElement('div');
      div.classList.add('result-card');

      let isOwned = ownedCars.some(o => o.car.image === c.image);
      let isWanted = wantedCars.some(w => w.car.image === c.image);

      div.innerHTML = `
        <img src="${c.image}" alt="${c.name}">
        <div class="card-info">
          <h3>${c.name}</h3>
          <p>${year} - ${hwCase.letter}</p>
          <p>${c.series} (#${c.series_number})</p>
          <p>HW#: ${c.hw_number} | Color: ${c.color}</p>
          <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
            ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
          </button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      const ownedBtn = div.querySelector('.owned-btn, .unowned-btn');
      ownedBtn.addEventListener('click', () => {
        if (isOwned) {
          ownedCars = ownedCars.filter(o => o.car.image !== c.image);
          localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
          ownedBtn.textContent = 'Mark Owned';
          ownedBtn.className = 'owned-btn';
          isOwned = false;
        } else {
          ownedCars.push({ year, caseLetter: hwCase.letter, car: c });
          localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
          ownedBtn.textContent = 'Unmark Owned';
          ownedBtn.className = 'unowned-btn';
          isOwned = true;
        }
      });

      const addWantedBtn = div.querySelector('.add-wanted-btn');
      if (addWantedBtn) {
        addWantedBtn.addEventListener('click', () => {
          wantedCars.push({ year, caseLetter: hwCase.letter, car: c });
          localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
          addWantedBtn.style.display = 'none';
        });
      }

      allCarsGrid.appendChild(div);
    });
  });

  popup.style.display = 'block';
  document.body.classList.add('popup-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  a.download = 'hotwheels_data.x';
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
