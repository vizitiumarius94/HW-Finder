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
const wantedPageBtn = document.getElementById('wantedPageBtn');

let currentYear = null;
let currentCase = null;

// Redirect to Wanted Cars page
wantedPageBtn.addEventListener('click', () => {
  window.location.href = 'wanted.html';
});

// Search bar input
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
          card.innerHTML = `
            <img src="${car.image}" alt="${car.name}">
            <p>${car.name}</p>
            <button class="add-btn">+ Wanted</button>
          `;
          // Open popup when clicking on image or name
          card.querySelector('img').addEventListener('click', () => showDetails(year, hwCase, car));
          card.querySelector('p').addEventListener('click', () => showDetails(year, hwCase, car));
          // Add to wanted
          card.querySelector('.add-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // prevent opening popup
            addWantedCar({ year, caseLetter: hwCase.letter, car });
          });

          resultsDiv.appendChild(card);
        }
      });
    });
  }
});

// Show popup details
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
    <button id="addWantedBtn" class="action-btn">+ Add to Wanted</button>
  `;

  document.getElementById('addWantedBtn').addEventListener('click', () => {
    addWantedCar({ year, caseLetter: hwCase.letter, car });
  });

  allCarsDiv.innerHTML = '';
  popup.style.display = 'block';
  document.body.classList.add('popup-open');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Add car to wanted list in localStorage
function addWantedCar(carObj) {
  let wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');

  const exists = wanted.some(
    w => w.car.name === carObj.car.name &&
         w.year === carObj.year &&
         w.caseLetter === carObj.caseLetter
  );

  if (!exists) {
    wanted.push(carObj);
    localStorage.setItem('wantedCars', JSON.stringify(wanted));
    alert(`${carObj.car.name} added to Wanted Cars!`);
  } else {
    alert(`${carObj.car.name} is already in Wanted Cars.`);
  }
}

// Show all cars from same year/case
showAllBtn.addEventListener('click', () => {
  if (!currentYear || !currentCase) return;

  allCarsDiv.innerHTML = `<h3>All Cars from ${currentYear} - Case ${currentCase.letter}</h3>`;

  currentCase.cars.forEach(car => {
    const div = document.createElement('div');
    div.classList.add('car-item');
    div.innerHTML = `
      <img src="${car.image}" alt="${car.name}">
      <p>${car.name}</p>
      <button class="add-btn-small">+ Wanted</button>
    `;
    // Show popup if image or name clicked
    div.querySelector('img').addEventListener('click', () => showDetails(currentYear, currentCase, car));
    div.querySelector('p').addEventListener('click', () => showDetails(currentYear, currentCase, car));
    // Add to wanted
    div.querySelector('.add-btn-small').addEventListener('click', (e) => {
      e.stopPropagation();
      addWantedCar({ year: currentYear, caseLetter: currentCase.letter, car });
    });

    allCarsDiv.appendChild(div);
  });
});

// Close popup button
popupClose.addEventListener('click', () => {
  popup.style.display = 'none';
  document.body.classList.remove('popup-open');
});

// Close popup when clicking outside
window.addEventListener('click', e => {
  if (e.target === popup) {
    popup.style.display = 'none';
    document.body.classList.remove('popup-open');
  }
});
