let carsData = {};

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    carsData = data;
  });

const searchBar = document.getElementById('searchBar');
const resultsDiv = document.getElementById('results');
const detailsDiv = document.getElementById('details');

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
}