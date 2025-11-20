// duplicates.js

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
const searchBar = document.getElementById('searchBar'); 

// --- CRITICAL CHANGE START: Fetch data before rendering ---
fetchCarData().then(() => {
    // Render starting with a sensible default, maybe 'no_filter' for duplicates
    renderDuplicates('case');

    // Change grouping
    groupSelect.addEventListener('change', () => {
        renderDuplicates(groupSelect.value, searchBar.value);
    });
    
    // Search Listener
    searchBar.addEventListener('input', () => {
      renderDuplicates(groupSelect.value, searchBar.value);
    });
});
// --- CRITICAL CHANGE END ---

function renderDuplicates(groupBy, searchTerm = '') {
  duplicatesContainer.innerHTML = '';

  const ownedCars = getOwnedCars();
  // Filter for only cars where quantity is greater than 1
  let duplicates = ownedCars.filter(car => (car.quantity || 1) > 1);

  // Filtering logic on the duplicates list
  const normalizedSearch = searchTerm.toLowerCase().trim();
  if (normalizedSearch.length > 0) {
      duplicates = duplicates.filter(item => {
          const car = item.car;
          if (!car) return false;

          return (
            car.name?.toLowerCase().includes(normalizedSearch) ||
            car.series?.toLowerCase().includes(normalizedSearch) ||
            String(car.hw_number).includes(normalizedSearch) ||
            car.color?.toLowerCase().includes(normalizedSearch)
          );
      });
  }

  // 🚀 NEW JS LOGIC: Toggle the main container class for CSS targeting
  const isSingleGroup = (groupBy === 'alphabetic' || groupBy === 'no_filter');
  
  if (isSingleGroup) {
      duplicatesContainer.classList.add('single-group-view');
  } else {
      duplicatesContainer.classList.remove('single-group-view');
  }
  // END NEW JS LOGIC


  if (duplicates.length === 0) {
    duplicatesContainer.innerHTML = '<p class="no-results">No duplicates found matching your criteria.</p>'; 
    return;
  }

  const groups = {};

  // 1. Updated Grouping Logic
  if (groupBy === 'case') {
      duplicates.forEach(item => {
          if (!item || !item.year || !item.caseLetter) return;
          const key = `${item.year} - ${item.caseLetter}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
      });
  } else if (groupBy === 'series') {
      duplicates.forEach(item => {
          if (!item || !item.year || !item.car || !item.car.series) return;
          const key = `${item.car.series} (${item.year})`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
      });
  } else if (groupBy === 'year_sort') { 
      // Group by year
      duplicates.forEach(item => {
          if (!item || !item.year) return;
          const key = String(item.year);
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
      });
  } else { 
      // 'alphabetic' and 'no_filter' all go into one single group
      const key = groupBy === 'alphabetic' ? 'All Duplicates (Alphabetical)'
                  : 'All Duplicates';
      groups[key] = duplicates;
  }

  // Helper to safely parse series_number
  const extractSeriesNum = (val) => {
    if (!val) return 0;
    const m = String(val).match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  // 2. Updated Sorting Logic (Group and inner-group sorting)
  for (let group in groups) {
      if (groupBy === 'case' || groupBy === 'series') {
          // Sort by series number within groups
          groups[group].sort((a, b) => extractSeriesNum(a.car.series_number) - extractSeriesNum(b.car.series_number));
      } else if (groupBy === 'alphabetic') {
          // Sort by car name for 'alphabetic'
          groups[group].sort((a, b) => a.car.name.localeCompare(b.car.name));
      } else if (groupBy === 'year_sort') {
          // Sort by HW number within each year group
          groups[group].sort((a, b) => a.car.hw_number - b.car.hw_number); 
      } else if (groupBy === 'no_filter') {
          // Custom sort for 'no_filter' (2025, then 2024, then others)
          groups[group].sort((a, b) => {
              const yearA = a.year;
              const yearB = b.year;
              const hwA = a.car.hw_number;
              const hwB = b.car.hw_number;

              // Comparator to prioritize 2025 over all else
              const priorityA = yearA === 2025 ? 3 : yearA === 2024 ? 2 : 1;
              const priorityB = yearB === 2025 ? 3 : yearB === 2024 ? 2 : 1;
              
              if (priorityA !== priorityB) {
                  return priorityB - priorityA;
              }

              if (priorityA >= 2) {
                  return hwA - hwB;
              }

              // For all other years (priority 1), sort by year descending, then HW number ascending
              if (yearA !== yearB) {
                  return yearB - yearA;
              }
              return hwA - hwB;
          });
      }
  }

  // 3. Rendering Logic
  let sortedGroupNames;

  if (groupBy === 'year_sort') {
      // Sort years numerically (descending)
      sortedGroupNames = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));
  } else if (groupBy === 'case' || groupBy === 'series') {
      // Sort group names alphabetically for case/series
      sortedGroupNames = Object.keys(groups).sort();
  } else {
      // Fixed order for single-group views ('no_filter', 'alphabetic')
      sortedGroupNames = Object.keys(groups);
  }
  
  // Render groups
  sortedGroupNames.forEach(groupName => {
    const groupDiv = document.createElement('div');
    groupDiv.classList.add('group-container');

    const title = document.createElement('h2');
    
    let titleText;
    if (groupBy === 'case') {
        titleText = `Case: ${groupName}`;
    } else if (groupBy === 'series') {
        titleText = `Series: ${groupName}`;
    } else if (groupBy === 'alphabetic') {
        titleText = 'All Duplicates Sorted Alphabetically';
    } else if (groupBy === 'year_sort') { 
        titleText = `Year: ${groupName}`;
    } else if (groupBy === 'no_filter') { 
        titleText = 'All Duplicates';
    }

    title.textContent = titleText;
    groupDiv.appendChild(title);

    const grid = document.createElement('div');
    grid.classList.add('results-grid');
    
    // 🚀 We still need to add the 'two-column' class to the grid for proper desktop rendering 
    // when using the single-group-view container class.
    if (isSingleGroup) {
         grid.classList.add('two-column');
    }

    groups[groupName].forEach(item => {
      const div = document.createElement('div');
      div.classList.add('result-card');
      
      // APPLY HUNT STYLING: Calls function, applies borders, and gets icons
      const huntIconHtml = applyHuntStyling(div, item.year, item.caseLetter, item.car);

      const quantity = item.quantity || 1;
      const dups = quantity - 1;

      div.innerHTML = `
        <img src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          ${huntIconHtml} 
          <p class="quantity-line">
            Quantity: <span class="quantity-value">${quantity}</span>
            </p>
          <p>
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
      const qtySpan = div.querySelector('.quantity-value');


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
            // Re-render to show updated duplicates list (which filters quantity > 1)
            renderDuplicates(groupSelect.value, searchBar.value); 
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
        renderDuplicates(groupSelect.value, searchBar.value); 
      });

      // Card click for prompt for safety/manual entry
      if (qtySpan) {
          qtySpan.addEventListener('click', (e) => {
              e.stopPropagation();
              const currentQty = item.quantity || 1;
              const newQuantityStr = prompt('Enter the new quantity for this car:', currentQty);
              
              if (newQuantityStr !== null && !isNaN(newQuantityStr) && parseInt(newQuantityStr, 10) > 0) {
                  const newQty = parseInt(newQuantityStr, 10);
                  
                  const owned = getOwnedCars();
                  const idx = owned.findIndex(o => o.car.image === item.car.image);
                  if (idx !== -1) {
                      owned[idx].quantity = newQty;
                      setOwnedCars(owned);
                      renderDuplicates(groupSelect.value, searchBar.value);
                  }
              }
          });
      }

      grid.appendChild(div);
    });

    groupDiv.appendChild(grid);
    duplicatesContainer.appendChild(groupDiv);
  });
}