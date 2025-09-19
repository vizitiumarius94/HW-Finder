let carsData = {};
let wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');

const searchBar = document.getElementById('searchBar');
const resultsDiv = document.getElementById('results');
const popup = document.getElementById('popup');
const detailsDiv = document.getElementById('details');
const allCarsDiv = document.getElementById('allCars');
const popupClose = document.getElementById('popupClose');

const wantedPageBtn = document.getElementById('wantedPageBtn');
const seriesPageBtn = document.getElementById('seriesPageBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const showAllBtn = document.getElementById('showAllBtn');

// Fetch cars data
fetch('data.json')
  .then(res => res.json())
  .then(data => carsData = data);

// ------------------- SEARCH FUNCTIONALITY -------------------
searchBar.addEventListener('input', () => {
  const query = searchBar.value.toLowerCase();
  resultsDiv.innerHTML = '';
  if (!query) return;

  for (const year in carsData) {
    carsData[year].cases.forEach(hwCase => {
      hwCase.cars.forEach(car => {
        const combinedYearSeries = `${year}-${car.series}`.toLowerCase();
        const combinedYearCase = `${year}${hwCase.letter}`.toLowerCase();

        if (
          car.name.toLowerCase().includes(query) ||
          combinedYearSeries.includes(query) ||
          combinedYearCase.includes(query) ||
          car.series.toLowerCase().includes(query) ||
          year.includes(query) ||
          hwCase.letter.toLowerCase().includes(query)
        ) {
          const card = document.createElement('div');
          card.classList.add('result-card');
          card.innerHTML = `
            <img src="${car.image}" alt="${car.name}">
            <div class="card-info">
              <h3>${car.name}</h3>
              <p>${year} - ${hwCase.letter}</p>
              <p>${car.series} (#${car.series_number})</p>
              <p>HW#: ${car.hw_number} | Color: ${car.color}</p>
            </div>
          `;
          card.addEventListener('click', () => showDetails(year, hwCase, car));
          resultsDiv.appendChild(card);
        }
      });
    });
  }
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

  allCarsDiv.innerHTML = '';

  const addBtn = document.getElementById('addWantedBtn');
  if (wantedCars.some(w => w.car.image === car.image)) addBtn.style.display = 'none';
  else addBtn.addEventListener('click', () => {
    wantedCars.push({ year, caseLetter: hwCase.letter, car });
    localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
    addBtn.style.display = 'none';
  });

  // ------------------- SHOW ALL CARS FROM CASE -------------------
  showAllBtn.onclick = () => {
    allCarsDiv.innerHTML = '';
    hwCase.cars.forEach(c => {
      const div = document.createElement('div');
      div.classList.add('result-card');

      let isOwned = ownedCars.some(o => o.car.image === c.image);
      let isWanted = wantedCars.some(w => w.car.image === c.image);

      div.innerHTML = `
        <img src="${c.image}" alt="${c.name}">
        <div class="card-info">
          <h4>${c.name}</h4>
          <p>${c.series} (#${c.series_number})</p>
          <p>HW#: ${c.hw_number} | Color: ${c.color}</p>
          <p>Year: ${year} | Case: ${hwCase.letter}</p>
          <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
            ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
          </button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      // Owned/unowned toggle
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

      // Add to wanted button
      const addWantedBtn = div.querySelector('.add-wanted-btn');
      if (addWantedBtn) {
        addWantedBtn.addEventListener('click', () => {
          wantedCars.push({ year, caseLetter: hwCase.letter, car: c });
          localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
          addWantedBtn.style.display = 'none';
        });
      }

      allCarsDiv.appendChild(div);
    });
    allCarsDiv.scrollIntoView({ behavior: 'smooth' });
  };

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

// ------------------- EXPORT & IMPORT BOTH WANTED + OWNED -------------------
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