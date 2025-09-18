let carsData = {};

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    carsData = data;
  });

const searchBar = document.getElementById('searchBar');
const resultsDiv = document.getElementById('results');
const popup = document.getElementById('popup');
const detailsDiv = document.getElementById('details');
const showAllBtn = document.getElementById('showAllBtn');
const allCarsDiv = document.getElementById('allCars');
const popupClose = document.getElementById('popupClose');

let currentYear = null;
let currentCase = null;

searchBar.addEventListener('input', () => {
  const query = searchBar.value.toLowerCase();
  resultsDiv.innerHTML = '';

  if (query.length === 0) return;

  for (const year in carsData) {
    carsData[year].cases.forEach(hwCase => {
      hwCase.cars.forEach(car => {
        if (car.name.toLowerCase().includes(query)) {
          const card = document.createElement('div');
          card.classList.add('result-card');
          card.innerHTML = `<img src="${car.image}" alt="${car.name}"><p>${car.name}</p>`;
          card.addEventListener('click', () => showDetails(year, hwCase, car));
          resultsDiv.appendChild(card);
        }
      });
    });
  }
});

function showDetails(year, hwCase, car) {
  currentYear = year;
  currentCase = hwCase;

  detailsDiv.innerHTML = `
    <h2>${car.name}</h2>
    <img src="${car.image}" alt="${car.name}">
    <p><strong>Year:</strong> ${year}</p>
    <p><strong>Case:</strong> ${hwCase.letter}</p>
    <h3>Treasure Hunt:</h3>
    <p>${hwCase.th.name}</p>
    <img src="${hwCase.th.image}" alt="Treasure Hunt">
    <h3>Super Treasure Hunt:</h3>
    <p>${hwCase.sth.name}</p>
    <img src="${hwCase.sth.image}" alt="Super Treasure Hunt">
  `;

  allCarsDiv.innerHTML = ''; // reset extra list
  popup.style.display = 'block';
}

showAllBtn.addEventListener('click', () => {
  if (!currentYear || !currentCase) return;

  allCarsDiv.innerHTML = `<h3>All Cars from ${currentYear} - Case ${currentCase.letter}</h3>`;

  currentCase.cars.forEach(car => {
    const div = document.createElement('div');
    div.classList.add('car-item');
    div.innerHTML = `<img src="${car.image}" alt="${car.name}"><p>${car.name}</p>`;
    allCarsDiv.appendChild(div);
  });
});

// Close popup
popupClose.addEventListener('click', () => {
  popup.style.display = 'none';
});

// Close popup if clicking outside content
window.addEventListener('click', (e) => {
  if (e.target === popup) {
    popup.style.display = 'none';
  }
});
