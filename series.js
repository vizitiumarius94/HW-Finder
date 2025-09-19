let carsData = {};
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');

const yearListDiv = document.getElementById('yearList');
const seriesListDiv = document.getElementById('seriesList');
const seriesCarsDiv = document.getElementById('seriesCars');
const backBtn = document.getElementById('backBtn');

backBtn.addEventListener('click', () => window.location.href = 'index.html');

// Load cars data
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    carsData = data;
    renderYearList();
  });

// Display all years
function renderYearList() {
  yearListDiv.innerHTML = '';
  Object.keys(carsData).sort().forEach(year => {
    const div = document.createElement('div');
    div.classList.add('result-card');
    div.innerHTML = `<h3>${year}</h3>`;
    div.addEventListener('click', () => renderSeriesList(year));
    yearListDiv.appendChild(div);
  });
}

// Display series for selected year
function renderSeriesList(year) {
  seriesListDiv.innerHTML = '';
  seriesCarsDiv.innerHTML = '';
  const seriesSet = new Set();

  carsData[year].cases.forEach(hwCase => {
    hwCase.cars.forEach(car => seriesSet.add(car.series));
  });

  Array.from(seriesSet).sort().forEach(seriesName => {
    const div = document.createElement('div');
    div.classList.add('result-card');
    div.innerHTML = `<h3>${seriesName}</h3>`;
    div.addEventListener('click', () => renderSeriesCars(year, seriesName));
    seriesListDiv.appendChild(div);
  });
}

// Display cars for selected series
function renderSeriesCars(year, seriesName) {
  seriesCarsDiv.innerHTML = `<h2>${year} - ${seriesName}</h2>`;
  const carsArray = [];

  carsData[year].cases.forEach(hwCase => {
    hwCase.cars.forEach(car => {
      if (car.series === seriesName) {
        carsArray.push({ car, year, caseLetter: hwCase.letter });
      }
    });
  });

  const grid = document.createElement('div');
  grid.classList.add('results-grid');

  carsArray.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('car-item');
    let isOwned = ownedCars.some(o => o.car.image === item.car.image);

    card.innerHTML = `
      <img src="${item.car.image}" alt="${item.car.name}">
      <div class="card-info">
        <h4>${item.car.name}</h4>
        <p><strong>Year:</strong> ${item.year}</p>
        <p><strong>Case:</strong> ${item.caseLetter}</p>
        <p><strong>Series:</strong> ${item.car.series} (#${item.car.series_number})</p>
        <p><strong>HW Number:</strong> ${item.car.hw_number}</p>
        <p><strong>Color:</strong> ${item.car.color}</p>
        <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
          ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
        </button>
      </div>
    `;

    const btn = card.querySelector('button');
    btn.addEventListener('click', () => {
      if (isOwned) {
        ownedCars = ownedCars.filter(o => o.car.image !== item.car.image);
        btn.textContent = 'Mark Owned';
        btn.className = 'owned-btn';
        isOwned = false;
      } else {
        ownedCars.push(item);
        btn.textContent = 'Unmark Owned';
        btn.className = 'unowned-btn';
        isOwned = true;
      }
      localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
    });

    grid.appendChild(card);
  });

  seriesCarsDiv.appendChild(grid);
}
