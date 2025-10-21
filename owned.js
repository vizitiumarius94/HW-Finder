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

  // 🧮 Show total count
  const ownedCountElem = document.getElementById('ownedCount');
  const ownedCars = getOwnedCars();
  const totalOwned = ownedCars.reduce((sum, car) => sum + (car.quantity || 1), 0);
  ownedCountElem.textContent = `You own ${totalOwned} Hot Wheels in your collection`;

  const groups = {};
  const wantedCars = getWantedCars();

  ownedCars.forEach(item => {
    const key = groupBy === 'case'
      ? `${item.year} - ${item.caseLetter}`
      : `${item.car.series} (${item.year})`;
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
      const card = document.createElement('div');
      card.classList.add('result-card');

      const isWanted = wantedCars.some(w => w.car.image === item.car.image);

      card.innerHTML = `
        <img class="car-image" src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          <p class="quantity-line">
            Quantity: <span class="quantity-value">${item.quantity || 1}</span>
            <button class="add-qty-btn">+</button>
          </p>
          <p>Duplicates: ${(item.quantity || 1) - 1}</p>
          <button class="unowned-btn">Unmark Owned</button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      // Select buttons and elements
      const unownedBtn = card.querySelector('.unowned-btn');
      const addWantedBtn = card.querySelector('.add-wanted-btn');
      const addQtyBtn = card.querySelector('.add-qty-btn');

      // ✅ Unmark Owned
      unownedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = getOwnedCars().filter(o => o.car.image !== item.car.image);
        setOwnedCars(updated);
        renderOwnedCars(groupBy);
      });

      // ✅ Add to Wanted
      if (addWantedBtn) {
        addWantedBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wanted = getWantedCars();
          wanted.push({ year: item.year, caseLetter: item.caseLetter, car: item.car });
          setWantedCars(wanted);
          addWantedBtn.style.display = 'none';
        });
      }

      // ✅ Quantity + button
      addQtyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newQtyStr = prompt('Enter new quantity:', item.quantity || 1);
        if (newQtyStr === null) return;
        const newQty = parseInt(newQtyStr, 10);
        if (isNaN(newQty) || newQty < 0) {
          alert('Please enter a valid number.');
          return;
        }

        const owned = getOwnedCars();
        const idx = owned.findIndex(o => o.car.image === item.car.image);
        if (idx !== -1) {
          owned[idx].quantity = newQty;
          setOwnedCars(owned);
          renderOwnedCars(groupBy);
        }
      });

      grid.appendChild(card);
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
