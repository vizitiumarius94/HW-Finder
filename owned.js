// owned.js
const clearBtn = document.getElementById('clearSearch');

// Helpers (Keep all existing helper functions)
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
const searchBar = document.getElementById('searchBar'); 
window.groupSelect = groupSelect;

// --- CRITICAL CHANGE START: Fetch data before rendering ---
// fetchCarData is assumed to be defined in utils.js and sets window.carsData
fetchCarData().then(() => {
    // Start with the default grouping (or what is selected)
    renderOwnedCars(groupSelect.value || 'case');

    // Change grouping
    groupSelect.addEventListener('change', () => {
        renderOwnedCars(groupSelect.value, searchBar ? searchBar.value : ''); 
    });
    
    // Search input listener 
    if (searchBar) {
        searchBar.addEventListener('input', () => { 
            // Trigger refresh on input, passing current grouping
            renderOwnedCars(groupSelect.value, searchBar.value); 
            clearBtn.style.display = searchBar.value ? 'block' : 'none';
        });
        clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBar.value = '';
        clearBtn.style.display = 'none';
        renderOwnedCars(groupSelect.value, '');
        searchBar.focus(); 
      });
    }
    
});
// --- CRITICAL CHANGE END ---

function renderOwnedCars(groupBy, searchTerm = '') { 
    ownedCarsContainer.innerHTML = '';

    window.renderOwnedCars = renderOwnedCars;
    
    // 🚀 NEW/UPDATED JS LOGIC: Toggle the main container class for CSS targeting
    const isSingleGroup = (groupBy === 'alphabetic' || groupBy === 'no_filter');
    
    if (isSingleGroup) {
        ownedCarsContainer.classList.add('single-group-view');
    } else {
        ownedCarsContainer.classList.remove('single-group-view');
    }
    // END NEW/UPDATED JS LOGIC
    
    const ownedCountElem = document.getElementById('ownedCount');
    const ownedCars = getOwnedCars();
    
    // Filtering Logic
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    const filteredCars = (normalizedSearch.length > 0) 
        ? ownedCars.filter(item => {
            const car = item.car;
            if (!item || !car) return false; 
            return (
                car.name?.toLowerCase().includes(normalizedSearch) ||
                car.series?.toLowerCase().includes(normalizedSearch) ||
                String(car.hw_number).includes(normalizedSearch) ||
                car.color?.toLowerCase().includes(normalizedSearch)
            );
          })
        : ownedCars;
            
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

    // 1. Grouping Logic
    if (groupBy === 'case') {
        filteredCars.forEach(item => {
            if (!item || !item.year || !item.caseLetter) return;
            const key = `${item.year} - ${item.caseLetter}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
    } else if (groupBy === 'series') {
        filteredCars.forEach(item => {
            if (!item || !item.year || !item.car || !item.car.series) return;
            const key = `${item.car.series} (${item.year})`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
    } else if (groupBy === 'year_sort') { 
        // Group by year
        filteredCars.forEach(item => {
            if (!item || !item.year) return;
            const key = String(item.year);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
    } else { 
        // 'alphabetic' and 'no_filter' all go into one single group
        const key = groupBy === 'alphabetic' ? 'All Cars (Alphabetical)'
                    : 'All Cars';
        groups[key] = filteredCars;
    }

    // Helper for series number extraction
    const extractSeriesNum = (val) => {
        if (!val) return 0;
        const m = String(val).match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
    };

    // 2. Sorting Logic (Group and inner-group sorting)
    for (let group in groups) {
        if (groupBy === 'case' || groupBy === 'series') {
            groups[group].sort((a, b) => extractSeriesNum(a.car.series_number) - extractSeriesNum(b.car.series_number));
        } else if (groupBy === 'alphabetic') {
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
                
                // Sort by priority (descending)
                if (priorityA !== priorityB) {
                    return priorityB - priorityA;
                }

                // If years are 2025 or 2024, sort by HW number ascending
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
            titleText = 'All Cars Sorted Alphabetically';
        } else if (groupBy === 'year_sort') { 
            titleText = `Year: ${groupName}`;
        } else if (groupBy === 'no_filter') { 
            titleText = 'All Cars';
        }
        
        title.textContent = titleText;
        groupDiv.appendChild(title);

        const grid = document.createElement('div');
        grid.classList.add('results-grid');
        
        // NOTE: Removed previous conditional addition of 'two-column' class here.
        // The CSS now handles the two-column view using the 'single-group-view' class on the container.

        // --- START: Individual Card Rendering Loop ---
        groups[groupName].forEach(item => {
            const card = document.createElement('div');
            card.classList.add('result-card');
            
            // Assuming applyHuntStyling is defined elsewhere
            const huntIconHtml = applyHuntStyling(card, item.year, item.caseLetter, item.car);

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
                    
                    if (newQty < 1) newQty = 1; 
                    
                    owned[idx].quantity = newQty;
                    setOwnedCars(owned);
                    renderOwnedCars(groupSelect.value, searchBar.value); 
                }
            };
            
            // Event Listeners for buttons and quantity update
            addQtyBtn.addEventListener('click', (e) => { e.stopPropagation(); updateQuantity(1); });
            decQtyBtn.addEventListener('click', (e) => { e.stopPropagation(); updateQuantity(-1); });
            unownedBtn.addEventListener('click', (e) => { 
                e.stopPropagation();
                const updated = getOwnedCars().filter(o => o.car.image !== item.car.image);
                setOwnedCars(updated);
                renderOwnedCars(groupSelect.value, searchBar.value);
            });

            if (addWantedBtn) {
                addWantedBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const wanted = getWantedCars();
                    if (!wanted.some(w => w.car.image === item.car.image)) {
                        wanted.push({ year: item.year, caseLetter: item.caseLetter, car: item.car });
                        setWantedCars(wanted);
                    }
                    renderOwnedCars(groupSelect.value, searchBar.value);
                });
            }
            
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
                        renderOwnedCars(groupSelect.value, searchBar.value);
                    }
                });
            }

            // Show car details pop-up
            card.addEventListener('click', e => {
                if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button') || e.target.classList.contains('quantity-value')) return;
                const year = item.year;
                const caseLetter = item.caseLetter;
                const car = item.car;
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