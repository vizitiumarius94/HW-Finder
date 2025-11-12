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
      const quantity = item.quantity || 1;
      const duplicates = quantity - 1;

      card.innerHTML = `
        <img class="car-image" src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          <p class="quantity-line">
            Quantity: <span class="quantity-value">${quantity}</span>
            <button class="decrease-btn" data-action="decrement">-</button>
            <button class="increase-btn" data-action="increment">+</button>
          </p>
          <p style="color: ${duplicates > 0 ? '#E91E63' : '#666'}; font-weight: ${duplicates > 0 ? '600' : '400'};">
            Duplicates: ${duplicates}
          </p>
          <button class="unowned-btn">Unmark Owned</button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      // Select buttons and elements
      const unownedBtn = card.querySelector('.unowned-btn');
      const addWantedBtn = card.querySelector('.add-wanted-btn');
      const addQtyBtn = card.querySelector('.increase-btn');
      const decQtyBtn = card.querySelector('.decrease-btn');

      // Helper to update quantity
      const updateQuantity = (change) => {
        const owned = getOwnedCars();
        const idx = owned.findIndex(o => o.car.image === item.car.image);
        if (idx !== -1) {
          const currentQty = owned[idx].quantity || 1;
          let newQty = currentQty + change;
          
          if (newQty < 1) newQty = 1; // Minimum quantity is 1
          
          owned[idx].quantity = newQty;
          setOwnedCars(owned);
          renderOwnedCars(groupBy);
        }
      };
      
      // ✅ Quantity + button
      addQtyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(1);
      });
      
      // ✅ Quantity - button
      decQtyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(-1);
      });

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
      
      // Click event for prompt (if you prefer prompt over +/- buttons)
      card.addEventListener('click', () => {
        const newQtyStr = prompt('Enter new quantity:', quantity);
        if (newQtyStr === null) return;
        const newQty = parseInt(newQtyStr, 10);
        if (isNaN(newQty) || newQty < 1) {
          alert('Please enter a valid number (minimum 1).');
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

// NOTE: The renderDuplicatesPage and backToMainBtn listeners are not needed here 
// as they belong in duplicates.js and are likely remnants from older code.