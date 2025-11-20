// wanted.js

const wantedListDiv = document.getElementById('wantedList');

// Helpers
function getWantedCars() {
  return JSON.parse(localStorage.getItem('wantedCars') || '[]');
}
function setWantedCars(cars) {
  localStorage.setItem('wantedCars', JSON.stringify(cars));
}

// --- CRITICAL CHANGE START: Fetch data before rendering ---
// fetchCarData is assumed to be defined in utils.js and sets window.carsData
fetchCarData().then(() => {
    loadWantedCars();
});
// --- CRITICAL CHANGE END ---

// Load wanted cars as full cards
function loadWantedCars() {
  const wanted = getWantedCars();
  wantedListDiv.innerHTML = '';

  if (!wanted.length) {
    wantedListDiv.innerHTML = '<p class="no-results">No cars in your Wanted list yet.</p>';
    return;
  }

  // Define the refresh function globally so remove/add buttons on other pages can call it
  window.loadWantedCars = loadWantedCars;

  wanted.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('result-card');
    
    // APPLY HUNT STYLING: Calls function, applies borders, and gets icons
    // applyHuntStyling is assumed to be defined in utils.js
    const huntIconHtml = applyHuntStyling(card, item.year, item.caseLetter, item.car);

    card.innerHTML = `
      <img src="${item.car.image}" alt="${item.car.name}">
      <div class="card-info">
        <h3>${item.car.name}</h3>
        <p><strong>Year:</strong> ${item.year}</p>
        <p><strong>Case:</strong> ${item.caseLetter}</p>
        <p><strong>Series:</strong> ${item.car.series} (#${item.car.series_number})</p>
        <p><strong>HW Number:</strong> ${item.car.hw_number}</p>
        <p><strong>Color:</strong> ${item.car.color}</p>
        ${huntIconHtml} <button class="remove-from-list-btn">Remove</button>
      </div>
    `;

    // Remove from list listener
    card.querySelector('.remove-from-list-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      let wanted = getWantedCars().filter(w => w.car.image !== item.car.image);
      setWantedCars(wanted);
      loadWantedCars(); // refresh list
    });
    
    // ADD POPUP CLICK LISTENER HERE
    card.addEventListener('click', e => {
      // Don't trigger details if clicking the Remove button
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;

      const year = item.year;
      const caseLetter = item.caseLetter;
      const car = item.car;
        
      // Use the global helper exposed by utils.js
      const carsData = window.getCarData(); 
      let parentCase = null;
        
      // Find the specific case object for this car
      if (carsData[year] && carsData[year].cases) {
        carsData[year].cases.forEach(hCase => {
          // Find case by letter AND confirm car is in that case
          if (hCase.letter === caseLetter && hCase.cars.some(carInCase => carInCase.image === car.image)) {
            parentCase = hCase;
          }
        });
      }

      if (parentCase) {
        // Call the global showDetails function exposed from popup.js
        if (typeof window.showDetails === 'function') {
             window.showDetails(year, parentCase, car); 
        }
      } else {
        alert("Case details not available in the loaded data.");
      }
    });

    wantedListDiv.appendChild(card);
  });
}