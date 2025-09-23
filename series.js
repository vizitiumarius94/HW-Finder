let carsData = {};
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');
let wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');

const yearSelect = document.getElementById('yearSelect');
const seriesList = document.getElementById('seriesList');

const seriesPopup = document.getElementById('seriesPopup');
const seriesPopupClose = document.getElementById('seriesPopupClose');
const seriesPopupTitle = document.getElementById('seriesPopupTitle');
const seriesCarsGrid = document.getElementById('seriesCarsGrid');

const backToSearchBtn = document.getElementById('backToSearchBtn');
backToSearchBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Fetch cars data
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    carsData = data;
    populateYearSelect();
  });

// Populate year dropdown
function populateYearSelect() {
  const years = Object.keys(carsData).sort();
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

// When year changes, show series
yearSelect.addEventListener('change', () => {
  const selectedYear = yearSelect.value;
  seriesList.innerHTML = '';
  if (!selectedYear) return;

  const seriesSet = new Set();

  if (selectedYear === 'all') {
    // Loop through all years
    Object.keys(carsData).forEach(year => {
      carsData[year].cases.forEach(hwCase => {
        hwCase.cars.forEach(car => seriesSet.add(car.series));
      });
    });
  } else {
    // Only selected year
    carsData[selectedYear].cases.forEach(hwCase => {
      hwCase.cars.forEach(car => seriesSet.add(car.series));
    });
  }

  Array.from(seriesSet).sort().forEach(seriesName => {
    const card = document.createElement('div');
    card.classList.add('result-card');
    card.innerHTML = `<div class="card-info"><h3>${seriesName}</h3></div>`;
    card.addEventListener('click', () => showSeriesPopup(selectedYear, seriesName));
    seriesList.appendChild(card);
  });
});

// Show popup with cars for selected series
function showSeriesPopup(selectedYear, seriesName) {
  seriesPopupTitle.textContent = `${seriesName} (${selectedYear === 'all' ? 'All Years' : selectedYear})`;
  seriesCarsGrid.innerHTML = '';

  const yearsToCheck = selectedYear === 'all' ? Object.keys(carsData) : [selectedYear];

  yearsToCheck.forEach(year => {
    carsData[year].cases.forEach(hwCase => {
      // Collect cars for this series
      let carsForSeries = hwCase.cars.filter(car => car.series === seriesName);

      // Sort by series_number (numerical after stripping "#"), then color
      carsForSeries.sort((a, b) => {
        const numA = parseInt(String(a.series_number).replace(/[^0-9]/g, ""), 10) || 0;
        const numB = parseInt(String(b.series_number).replace(/[^0-9]/g, ""), 10) || 0;

        if (numA === numB) {
          return (a.color || '').localeCompare(b.color || '');
        }
        return numA - numB;
      });

      // Render cars
      carsForSeries.forEach(car => {
        const div = document.createElement('div');
        div.classList.add('result-card');

        let isOwned = ownedCars.some(o => o.car.image === car.image);
        let isWanted = wantedCars.some(w => w.car.image === car.image);

        div.innerHTML = `
          <img src="${car.image}" alt="${car.name}">
          <div class="card-info">
            <h4>${car.name}</h4>
            <p>HW#: ${car.hw_number} | Color: ${car.color}</p>
            <p>Year: ${year} | Case: ${hwCase.letter}</p>
            <p>${car.series} (#${car.series_number})</p>
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

        // Add to wanted button
        const addWantedBtn = div.querySelector('.add-wanted-btn');
        if (addWantedBtn) {
          addWantedBtn.addEventListener('click', () => {
            wantedCars.push({ year, caseLetter: hwCase.letter, car });
            localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
            addWantedBtn.style.display = 'none';
          });
        }

        seriesCarsGrid.appendChild(div);
      });
    });
  });

  seriesPopup.style.display = 'block';
  document.body.classList.add('popup-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Close popup
seriesPopupClose.addEventListener('click', () => {
  seriesPopup.style.display = 'none';
  document.body.classList.remove('popup-open');
});