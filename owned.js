// Helpers
function getOwnedCars() {
  const cars = JSON.parse(localStorage.getItem('ownedCars') || '[]');
  // Ensure each car has a quantity property
  cars.forEach(car => {
    if (typeof car.quantity === 'undefined') {
      car.quantity = 1; // Set default quantity to 1 if undefined
    }
  });
  return cars;
}
function setOwnedCars(cars) {
  localStorage.setItem('ownedCars', JSON.stringify(cars));
}
function getWantedCars() {
  return JSON.parse(localStorage.getItem('wantedCars') || '[]');
}
function setWantedCars(cars) {
  localStorage.setItem('wantedCars', JSON.stringify(cars));
}

const ownedCarsContainer = document.getElementById('ownedCarsContainer');
const groupSelect = document.getElementById('groupSelect');
const backToSearchBtn = document.getElementById('backToSearchBtn');

backToSearchBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Render cars initially grouped by case
renderOwnedCars('case');

// Change grouping
groupSelect.addEventListener('change', () => {
  renderOwnedCars(groupSelect.value);
});

function renderOwnedCars(groupBy) {
  ownedCarsContainer.innerHTML = '';

  // Group cars
  const groups = {};
  const ownedCars = getOwnedCars();
  const wantedCars = getWantedCars();

  ownedCars.forEach(item => {
    let key;
    if (groupBy === 'case') {
      key = `${item.year} - ${item.caseLetter}`;
    } else {
      key = `${item.car.series} (${item.year})`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const extractSeriesNum = (val) => {
    if (!val) return 0;
    const m = String(val).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  for (let group in groups) {
    groups[group].sort((a, b) => extractSeriesNum(a.car.series_number) - extractSeriesNum(b.car.series_number));
  }

  Object.keys(groups).sort().forEach(groupName => {
    const groupDiv = document.createElement('div');
    groupDiv.classList.add('group-container');

    const title = document.createElement('h2');
    title.textContent = `${groupBy === 'case' ? 'Case' : 'Series'}: ${groupName}`;
    groupDiv.appendChild(title);

    const grid = document.createElement('div');
    grid.classList.add('results-grid');

    groups[groupName].forEach(item => {
      const div = document.createElement('div');
      div.classList.add('result-card');

      const isWanted = wantedCars.some(w => w.car.image === item.car.image);

      div.innerHTML = `
        <img src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          <p>Quantity: ${item.quantity || 1}</p>
          <p>Duplicates: ${(item.quantity || 1) - 1}</p>
          <button class="unowned-btn">Unmark Owned</button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      // Unmark owned — stop the click from bubbling to parent div
      const unownedBtn = div.querySelector('.unowned-btn');
      if (unownedBtn) {
        unownedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const updated = getOwnedCars().filter(o => o.car.image !== item.car.image);
          setOwnedCars(updated);
          renderOwnedCars(groupBy);
        });
      }

      // Add to wanted — also stop propagation
      const addWantedBtn = div.querySelector('.add-wanted-btn');
      if (addWantedBtn) {
        addWantedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          let wanted = getWantedCars();
          wanted.push({ year: item.year, caseLetter: item.caseLetter, car: item.car });
          setWantedCars(wanted);
          addWantedBtn.style.display = 'none';
        });
      }

      // Card click: update quantity (update the stored ownedCars array safely)
      div.addEventListener('click', () => {
        const currentQty = item.quantity || 1;
        const quantityStr = prompt('Enter the quantity of this car:', currentQty);
        if (quantityStr === null) return; // user cancelled
        const quantity = parseInt(quantityStr, 10);
        if (isNaN(quantity) || quantity < 0) {
          alert('Please enter a valid non-negative integer.');
          return;
        }

        // Update stored ownedCars by matching on a stable key (image here)
        const stored = getOwnedCars();
        const idx = stored.findIndex(o => o.car.image === item.car.image);
        if (idx !== -1) {
          stored[idx].quantity = quantity;
          setOwnedCars(stored);
        } else {
          // fallback: add the item (shouldn't usually happen)
          const newItem = Object.assign({}, item, { quantity });
          stored.push(newItem);
          setOwnedCars(stored);
        }

        renderOwnedCars(groupBy);
      });

      grid.appendChild(div);
    });

    groupDiv.appendChild(grid);
    ownedCarsContainer.appendChild(groupDiv);
  });
}

// Function to render duplicates page
function renderDuplicatesPage() {
  const duplicatesContainer = document.getElementById('duplicatesContainer');
  duplicatesContainer.innerHTML = '';

  const ownedCars = getOwnedCars();
  const duplicates = ownedCars.filter(car => car.quantity > 1);

  if (duplicates.length === 0) {
    duplicatesContainer.innerHTML = '<p>No duplicates found.</p>';
    return;
  }

  const duplicatesDiv = document.createElement('div');
  duplicatesDiv.classList.add('duplicates-container');

  duplicates.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('duplicate-card');

    div.innerHTML = `
      <img src="${item.car.image}" alt="${item.car.name}">
      <div class="card-info">
        <h4>${item.car.name}</h4>
        <p>${item.car.series} (#${item.car.series_number})</p>
        <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
        <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
        <p>Quantity: ${item.quantity}</p>
        <p>Duplicates: ${item.quantity - 1}</p>
      </div>
    `;

    duplicatesDiv.appendChild(div);
  });

  duplicatesContainer.appendChild(duplicatesDiv);
}

// Event listener for the back button on the duplicates page
document.getElementById('backToMainBtn').addEventListener('click', () => {
  window.location.href = 'index.html'; // Change this to your main page URL
});
