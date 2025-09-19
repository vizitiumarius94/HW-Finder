let carsData = {};
let wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');

const searchBar = document.getElementById('searchBar');
const resultsDiv = document.getElementById('results');
const popup = document.getElementById('popup');
const detailsDiv = document.getElementById('details');
const popupClose = document.getElementById('popupClose');

const wantedPageBtn = document.getElementById('wantedPageBtn');
const seriesPageBtn = document.getElementById('seriesPageBtn');
const ownedPageBtn = document.getElementById('ownedPageBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// ------------------- FETCH DATA -------------------
fetch('data.json')
  .then(res => res.json())
  .then(data => carsData = data);

// ------------------- SEARCH FUNCTIONALITY -------------------
searchBar.addEventListener('input', () => {
  const query = searchBar.value.trim().toLowerCase();
  resultsDiv.innerHTML = '';
  if (!query) return;

  let yearFilter = null;
  let seriesFilter = null;

  if (query.includes('-')) {
    const parts = query.split('-');
    if (!isNaN(parts[0])) {
      yearFilter = parts[0];
      seriesFilter = parts.slice(1).join('-').trim();
    } else if (parts[0] === 's') {
      seriesFilter = parts.slice(1).join('-').trim();
    }
  }

  Object.keys(carsData).forEach(year => {
    if (yearFilter && year !== yearFilter) return;

    carsData[year].cases.forEach(hwCase => {
      hwCase.cars.forEach(car => {
        if (
          (seriesFilter && car.series.toLowerCase().includes(seriesFilter)) ||
          (!seriesFilter && car.name.toLowerCase().includes(query))
        ) {
          const card = document.createElement('div');
          card.classList.add('result-card');

          let isOwned = ownedCars.some(o => o.car.image === car.image);
          let isWanted = wantedCars.some(w => w.car.image === car.image);

          card.innerHTML = `
            <img src="${car.image}" alt="${car.name}">
            <div class="card-info">
              <h3>${car.name}</h3>
              <p>${year} - ${hwCase.letter}</p>
              <p>${car.series} (#${car.series_number})</p>
              <p>HW#: ${car.hw_number} | Color: ${car.color}</p>
              <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
                ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
              </button>
              ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
            </div>
          `;

          // ----------------- Add click listener for popup -----------------
          card.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'button') return;
            showDetails(year, hwCase, car);
          });

          // ----------------- Owned/unowned toggle -----------------
          const ownedBtn = card.querySelector('.owned-btn, .unowned-btn');
          ownedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isOwned) {
              ownedCars = ownedCars.filter(o => o.car.image !== car.image);
              localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
              ownedBtn.textContent = 'Mark Owned';
              ownedBtn.className = 'owned-btn';
              isOwned = false;
            } else {
              ownedCars.push({ year, caseLetter: hwCase.letter, car });
              localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
              ownedBtn.textContent = 'Unmark Owned';
              ownedBtn.className = 'unowned-btn';
              isOwned = true;
            }
          });

          // ----------------- Add to wanted button -----------------
          const addWantedBtn = card.querySelector('.add-wanted-btn');
          if (addWantedBtn) {
            addWantedBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              wantedCars.push({ year, caseLetter: hwCase.letter, car });
              localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
              addWantedBtn.style.display = 'none';
            });
          }

          resultsDiv.appendChild(card);
        }
      });
    });
  });
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
        <p>${hwCase.th.name}</p>
        <img src="${hwCase.th.image}" alt="TH" style="max-width:150px;">
        <h3>Super Treasure Hunt:</h3>
        <p>${hwCase.sth.name}</p>
        <img src="${hwCase.sth.image}" alt="STH" style="max-width:150px;">
        <button id="addWantedBtn" class="action-btn">+ Add to Wanted</button>
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

// ------------------- EXPORT & IMPORT -------------------
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

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (imported.wantedCars) {
        imported.wantedCars.forEach(item => {
          if (!wantedCars.some(w => w.car.image === item.car.image)) wantedCars.push(item);
        });
      }
      if (imported.ownedCars) {
        imported.ownedCars.forEach(item => {
          if (!ownedCars.some(o => o.car.image === item.car.image)) ownedCars.push(item);
        });
      }
      localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
      localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
      alert("Import successful!");
    } catch(err) {
      alert("Failed to import: " + err.message);
    }
  };
  reader.readAsText(file);
});