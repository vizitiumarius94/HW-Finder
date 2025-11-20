// owned.js

// Helpers (These specific helpers are kept here for clear local dependency management)
function getOwnedCars() {
  const cars = JSON.parse(localStorage.getItem('ownedCars') || '[]');
  cars.forEach(car => {
    // Ensure quantity property exists
    if (typeof car.quantity === 'undefined') {
      car.quantity = 1; 
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

// Expose groupSelect globally
const ownedCarsContainer = document.getElementById('ownedCarsContainer');
const groupSelect = document.getElementById('groupSelect');
const searchBar = document.getElementById('searchBar'); // ⬅️ NEW: Reference search bar																						   
window.groupSelect = groupSelect;

// --- CRITICAL CHANGE START: Fetch data before rendering ---
// fetchCarData is assumed to be defined in utils.js and sets window.carsData
fetchCarData().then(() => {
														
    renderOwnedCars('case');

    // Change grouping
    groupSelect.addEventListener('change', () => {
													  
        renderOwnedCars(groupSelect.value, searchBar ? searchBar.value : ''); 
    });
    
    // Search input listener ⬅️ NEW
    if (searchBar) {
        searchBar.addEventListener('input', () => { 
            // Trigger refresh on input, passing current grouping
            renderOwnedCars(groupSelect.value, searchBar.value); 
        });
    }
});
	 
// --- CRITICAL CHANGE END ---
function renderOwnedCars(groupBy, searchTerm = '') { // ⬅️ UPDATED signature to accept searchTerm
  ownedCarsContainer.innerHTML = '';

  // Expose renderOwnedCars globally for utils.js to use
  window.renderOwnedCars = renderOwnedCars;

  // 🧮 Show total count
  const ownedCountElem = document.getElementById('ownedCount');
  const ownedCars = getOwnedCars();
  
	
  // ⬅️ NEW: Filtering Logic
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  const filteredCars = (normalizedSearch.length > 0) 
    ? ownedCars.filter(item => {
        const car = item.car;
        // Safety check for malformed data
        if (!item || !car) return false; 
        
        return (
          car.name?.toLowerCase().includes(normalizedSearch) ||
          car.series?.toLowerCase().includes(normalizedSearch) ||
          String(car.hw_number).includes(normalizedSearch) ||
          car.color?.toLowerCase().includes(normalizedSearch)
        );
      })
    : ownedCars; // Use all cars if search is empty							
														   
    // Display message if no cars are found
  if (filteredCars.length === 0) {
      ownedCarsContainer.innerHTML = '<p class="no-results">' + 
        (normalizedSearch.length > 0 
            ? 'No cars found matching your criteria.' 
            : 'Your collection is currently empty.') + 
        '</p>';
      return;
  }

  const totalOwned = ownedCars.reduce((sum, car) => sum + (car.quantity || 1), 0);
  if (ownedCountElem) {
																							
      ownedCountElem.textContent = `You own ${totalOwned} Hot Wheels in your collection`;
  }

  const groups = {};
  const wantedCars = getWantedCars();

   filteredCars.forEach(item => { // ⬅️ Iterate over filteredCars
    // Safety check for malformed grouping data
    if (!item || !item.year || !item.caseLetter || !item.car || !item.car.series) {
        console.error("Skipping malformed car data entry:", item);
        return; 
    }

    const key = groupBy === 'case'
      ? `${item.year} - ${item.caseLetter}`
      : `${item.car.series} (${item.year})`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  // Extract series number helper (re-defined locally as it's small and frequently used for sorting)
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

    // --- START: Individual Card Rendering Loop ---
    groups[groupName].forEach(item => {
      const card = document.createElement('div');
      card.classList.add('result-card');
      
      // APPLY HUNT STYLING: Calls function, applies borders, and gets icons (from utils.js)
      const huntIconHtml = applyHuntStyling(card, item.year, item.caseLetter, item.car);

      const isWanted = wantedCars.some(w => w.car.image === item.car.image);
      const quantity = item.quantity || 1;
      const duplicates = quantity - 1; // ⬅️ DUPLICATE COUNT CALCULATION

      card.innerHTML = `
        <img class="car-image" src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          ${huntIconHtml} 
          <p class="quantity-line">
            Quantity: <span class="quantity-value" data-image="${item.car.image}" data-qty="${quantity}">${quantity}</span>
          </p>
          <p>
            <button class="decrease-btn" data-action="decrement">-</button>
            <button class="increase-btn" data-action="increment">+</button>
          </p>
          <p style="color: ${duplicates > 0 ? '#E91E63' : '#666'}; font-weight: ${duplicates > 0 ? '600' : '400'};">
            Duplicates: ${duplicates} </p>
          <button class="unowned-btn">Unmark Owned</button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      // Select buttons and elements
      const unownedBtn = card.querySelector('.unowned-btn');
      const addWantedBtn = card.querySelector('.add-wanted-btn');
      const addQtyBtn = card.querySelector('.increase-btn');
      const decQtyBtn = card.querySelector('.decrease-btn');
      const qtySpan = card.querySelector('.quantity-value'); 

      // Helper to update quantity
      const updateQuantity = (change) => {
        const owned = getOwnedCars();
        const idx = owned.findIndex(o => o.car.image === item.car.image);
        if (idx !== -1) {
          const currentQty = item.quantity || 1;
          let newQty = currentQty + change;
          
          if (newQty < 1) newQty = 1; // Minimum quantity is 1
          
          owned[idx].quantity = newQty;
          setOwnedCars(owned);
          renderOwnedCars(groupBy); // Full refresh of the owned view
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
          // Safety check to prevent duplicates in wanted list
          if (!wanted.some(w => w.car.image === item.car.image)) {
            wanted.push({ year: item.year, caseLetter: item.caseLetter, car: item.car });
            setWantedCars(wanted);
          }
          renderOwnedCars(groupBy); // Refresh to update wanted status
        });
      }
      
      // ✅ Click event for quantity prompt
      if (qtySpan) {
          qtySpan.addEventListener('click', (e) => {
              e.stopPropagation(); 
              
              const currentQty = parseInt(qtySpan.dataset.qty, 10);
              const newQtyStr = prompt(`Enter new quantity for ${item.car.name}:`, currentQty);
              
              if (newQtyStr === null) return; 
              
              const newQty = parseInt(newQtyStr, 10);
              
              if (isNaN(newQty) || newQty < 1) {
                  alert('Please enter a valid number (minimum 1).');
                  return;
              }

              let owned = getOwnedCars();
              const idx = owned.findIndex(o => o.car.image === item.car.image);
              
              if (idx !== -1) {
                  owned[idx].quantity = newQty;
                  setOwnedCars(owned); 
                  renderOwnedCars(groupBy);
              }
          });
      }


      // ✅ Click event to show car details pop-up (from popup.js)
      card.addEventListener('click', e => {
        // Don't trigger details if clicking any button or the quantity span
        if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button') || e.target.classList.contains('quantity-value')) return;
          
        const year = item.year;
        const caseLetter = item.caseLetter;
        const car = item.car;
        
        // Use the global helper exposed by utils.js
        const carsData = window.getCarData(); 
        let parentCase = null;
        
        if (carsData[year] && carsData[year].cases) {
          carsData[year].cases.forEach(hCase => {
            if (hCase.letter === caseLetter) {
              if (hCase.cars.some(carInCase => carInCase.image === car.image)) {
                parentCase = hCase;
              }
            }
          });
        }

        if (parentCase) {
          // Call the global showDetails function
          if (typeof window.showDetails === 'function') {
             window.showDetails(year, parentCase, car); 
          }
        } else {
          alert("Case details not available in the loaded data.");
        }
      });

      grid.appendChild(card);
    });
    // --- END: Individual Card Rendering Loop ---

    groupDiv.appendChild(grid);
    ownedCarsContainer.appendChild(groupDiv);
  });
}