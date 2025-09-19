let carsData = {};

fetch('data.json')
  .then(response => response.json())
  .then(data => { carsData = data; });

const searchBar = document.getElementById('searchBar');
const resultsDiv = document.getElementById('results');
const popup = document.getElementById('popup');
const detailsDiv = document.getElementById('details');
const showAllBtn = document.getElementById('showAllBtn');
const allCarsDiv = document.getElementById('allCars');
const popupClose = document.getElementById('popupClose');
const wantedPageBtn = document.getElementById('wantedPageBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

let currentYear = null;
let currentCase = null;

// Redirect to Wanted Cars page
wantedPageBtn.addEventListener('click', () => {
  window.location.href = 'wanted.html';
});

// Export wanted cars
exportBtn.addEventListener('click', () => {
  const wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
  if (!wanted.length) { alert("No cars in Wanted list!"); return; }
  const blob = new Blob([JSON.stringify(wanted, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "wanted_cars.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Import wanted cars
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      let existing = JSON.parse(localStorage.getItem('wantedCars') || '[]');
      imported.forEach(item => {
        const exists = existing.some(w => w.car.image === item.car.image);
        if (!exists) existing.push(item);
      });
      localStorage.setItem('wantedCars', JSON.stringify(existing));
      alert("Wanted Cars imported successfully!");
    } catch (err) {
      alert("Failed to import: " + err.message);
    }
  };
  reader.readAsText(file);
});

// Add car to Wanted
function addWantedCar(carObj) {
  let wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
  const exists = wanted.some(w => w.car.image === carObj.car.image);
  if (!exists) {
    wanted.push(carObj);
    localStorage.setItem('wantedCars', JSON.stringify(wanted));
    alert(`${carObj.car.name} added to Wanted Cars!`);
    return true;
  } else return false;
}

// Enhanced search: year+series, series only, or name
searchBar.addEventListener('input', () => {
  const query = searchBar.value.trim().toLowerCase();
  resultsDiv.innerHTML = '';
  if (!query) return;

  let searchYear = null;
  let searchSeries = null;
  let searchName = null;

  const yearSeriesMatch = query.match(/^(\d{4})-(.+)$/); // YYYY-Series
  const seriesOnlyMatch = query.match(/^s-(.+)$/); // s-Series

  if (yearSeriesMatch) {
    searchYear = yearSeriesMatch[1];
    searchSeries = yearSeriesMatch[2];
  } else if (seriesOnlyMatch) {
    searchSeries = seriesOnlyMatch[1];
  } else {
    searchName = query;
  }

  for (const year in carsData) {
    if (searchYear && year !== searchYear) continue;

    carsData[year].cases.forEach(hwCase => {
      hwCase.cars.forEach(car => {
        // Series filter
        if (searchSeries && !car.series.toLowerCase().includes(searchSeries)) return;
        // Name filter
        if (searchName && !car.name.toLowerCase().includes(searchName)) return;

        const card = document.createElement('div');
        card.classList.add('result-card');
        card.innerHTML = `
          <img src="${car.image}" alt="${car.name}">
          <div class="card-info">
            <h3>${car.name}</h3>
            <p><strong>Year:</strong> ${year}</p>
            <p><strong>Case:</strong> ${hwCase.letter}</p>
            <p><strong>Series:</strong> ${car.series} (#${car.series_number})</p>
            <p><strong>HW Number:</strong> ${car.hw_number}</p>
            <p><strong>Color:</strong> ${car.color}</p>
            <button class="add-btn">+ Wanted</button>
          </div>
        `;

        card.querySelector('img').addEventListener('click', () => showDetails(year, hwCase, car));
        card.querySelector('.card-info h3').addEventListener('click', () => showDetails(year, hwCase, car));

        const btn = card.querySelector('.add-btn');
        if (JSON.parse(localStorage.getItem('wantedCars') || '[]').some(w => w.car.image === car.image)) {
          btn.style.display = 'none';
        } else {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            addWantedCar({ year, caseLetter: hwCase.letter, car });
            btn.style.display = 'none';
          });
        }

        resultsDiv.appendChild(card);
      });
    });
  }
});

// Popup
function showDetails(year, hwCase, car) {
  currentYear = year;
  currentCase = hwCase;

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
        <img src="${hwCase.th.image}" alt="Treasure Hunt">
        <h3>Super Treasure Hunt:</h3>
        <p>${hwCase.sth.name}</p>
        <img src="${hwCase.sth.image}" alt="Super Treasure Hunt">
        <button id="addWantedBtn" class="action-btn">+ Add to Wanted</button>
      </div>
    </div>
  `;

  const popupBtn = document.getElementById('addWantedBtn');
  if (JSON.parse(localStorage.getItem('wantedCars') || '[]').some(w => w.car.image === car.image)) {
    popupBtn.style.display = 'none';
  } else {
    popupBtn.addEventListener('click', () => {
      addWantedCar({ year, caseLetter: hwCase.letter, car });
      popupBtn.style.display = 'none';
    });
  }

  allCarsDiv.innerHTML = '';
  popup.style.display = 'block';
  document.body.classList.add('popup-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show all cars from case
showAllBtn.addEventListener('click', () => {
  if (!currentYear || !currentCase) return;
  allCarsDiv.innerHTML = `<h3>All Cars from ${currentYear} - Case ${currentCase.letter}</h3>`;
  currentCase.cars.forEach(car => {
    const div = document.createElement('div');
    div.classList.add('car-item');
    div.innerHTML = `
      <img src="${car.image}" alt="${car.name}">
      <div class="card-info">
        <h4>${car.name}</h4>
        <p><strong>Year:</strong> ${currentYear}</p>
        <p><strong>Case:</strong> ${currentCase.letter}</p>
        <p><strong>Series:</strong> ${car.series} (#${car.series_number})</p>
        <p><strong>HW Number:</strong> ${car.hw_number}</p>
        <p><strong>Color:</strong> ${car.color}</p>
        <button class="add-btn-small">+ Wanted</button>
      </div>
    `;

    div.querySelector('img').addEventListener('click', () => showDetails(currentYear, currentCase, car));
    div.querySelector('h4').addEventListener('click', () => showDetails(currentYear, currentCase, car));

    const gridBtn = div.querySelector('.add-btn-small');
    if (JSON.parse(localStorage.getItem('wantedCars') || '[]').some(w => w.car.image === car.image)) {
      gridBtn.style.display = 'none';
    } else {
      gridBtn.addEventListener('click', e => {
        e.stopPropagation();
        addWantedCar({ year: currentYear, caseLetter: currentCase.letter, car });
        gridBtn.style.display = 'none';
      });
    }

    allCarsDiv.appendChild(div);
  });
});

// Close popup
popupClose.addEventListener('click', () => {
  popup.style.display = 'none';
  document.body.classList.remove('popup-open');
});
window.addEventListener('click', e => {
  if (e.target === popup) {
    popup.style.display = 'none';
    document.body.classList.remove('popup-open');
  }
});
