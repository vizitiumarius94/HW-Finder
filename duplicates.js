// Helpers
function getOwnedCars() {
  const cars = JSON.parse(localStorage.getItem('ownedCars') || '[]');
  // Ensure each car has a quantity property
  cars.forEach(car => {
    if (typeof car.quantity === 'undefined') {
      car.quantity = 1; 
    }
  });
  return cars;
}
function setOwnedCars(cars) {
  localStorage.setItem('ownedCars', JSON.stringify(cars));
}

const duplicatesContainer = document.getElementById('duplicatesContainer');
const groupSelect = document.getElementById('groupSelect');
const backToSearchBtn = document.getElementById('backToSearchBtn');

backToSearchBtn.addEventListener('click', () => {
  window.location.href = 'index.html'; // Change this to your main search page URL
});

// Render duplicates initially grouped by case
renderDuplicates('case');

// Change grouping
groupSelect.addEventListener('change', () => {
  renderDuplicates(groupSelect.value);
});

function renderDuplicates(groupBy) {
  duplicatesContainer.innerHTML = '';

  // Group cars
  const groups = {};
  const ownedCars = getOwnedCars();
  // Filter for only cars where quantity is greater than 1
  const duplicates = ownedCars.filter(car => (car.quantity || 1) > 1);

  if (duplicates.length === 0) {
    duplicatesContainer.innerHTML = '<p class="no-results">No duplicates found in your collection.</p>';
    return;
  }

  duplicates.forEach(item => {
    let key;
    if (groupBy === 'case') {
      // Group by year + case, e.g. "2025 - A"
      key = `${item.year} - ${item.caseLetter}`;
    } else {
      // Group by series + year, e.g. "Factory Fresh (2025)"
      key = `${item.car.series} (${item.year})`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  // Helper to safely parse series_number
  const extractSeriesNum = (val) => {
    if (!val) return 0;
    const m = String(val).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  // Sort each group by series number
  for (let group in groups) {
    groups[group].sort((a, b) => extractSeriesNum(a.car.series_number) - extractSeriesNum(b.car.series_number));
  }

  // Render groups
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
      
      const quantity = item.quantity || 1;
      const dups = quantity - 1;

      div.innerHTML = `
        <img src="${item.car.image}" alt="${item.car.name}">
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
          <p style="color: #E91E63; font-weight: 600;">Duplicates: ${dups}</p>
          <button class="unowned-btn">Unmark Owned</button>
        </div>
      `;
      
      const unownedBtn = div.querySelector('.unowned-btn');
      const incBtn = div.querySelector('.increase-btn');
      const decBtn = div.querySelector('.decrease-btn');

      // Helper to update quantity
      const updateQuantity = (change) => {
        const currentQty = item.quantity || 1;
        let newQty = currentQty + change;
        
        if (newQty < 1) newQty = 1;
        
        const owned = getOwnedCars();
        const idx = owned.findIndex(o => o.car.image === item.car.image);
        if (idx !== -1) {
          owned[idx].quantity = newQty;
          setOwnedCars(owned);
          renderDuplicates(groupBy);
        }
      };
      
      // Event listeners for quantity control
      incBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(1);
      });

      decBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(-1);
      });
      
      // Unmark owned button (removes car entirely)
      unownedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = getOwnedCars().filter(o => o.car.image !== item.car.image);
        setOwnedCars(updated);
        renderDuplicates(groupBy);
      });

      // Default card click for prompt for safety/manual entry
      div.addEventListener('click', () => {
        const newQuantity = prompt('Enter the new quantity for this car:', quantity);
        if (newQuantity !== null && !isNaN(newQuantity) && newQuantity > 0) {
          item.quantity = parseInt(newQuantity, 10);
          setOwnedCars(ownedCars); // Save with updated quantity
          renderDuplicates(groupBy);
        }
      });

      grid.appendChild(div);
    });

    groupDiv.appendChild(grid);
    duplicatesContainer.appendChild(groupDiv);
  });
}