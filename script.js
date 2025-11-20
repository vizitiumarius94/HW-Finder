// script.js

// ------------------- INITIALIZATION -------------------
let carsData = {};
// EXPOSE GLOBALLY FOR POPUP.JS
window.carsData = carsData; 

let wantedCars = JSON.parse(localStorage.getItem('wantedCars') || '[]');
let ownedCars = JSON.parse(localStorage.getItem('ownedCars') || '[]');
let filteredCarsCache = []; // Stores the cars matching the current criteria

const searchBar = document.getElementById('searchBar');
const clearBtn = document.getElementById('clearSearch');
const resultsDiv = document.getElementById('results');
// REMOVED: popup, detailsDiv, popupClose
const searchOldCases = document.getElementById('searchOldCases');

const wantedPageBtn = document.getElementById('wantedPageBtn');
const seriesPageBtn = document.getElementById('seriesPageBtn');
const ownedPageBtn = document.getElementById('ownedPageBtn');
const duplicatesPageBtn = document.getElementById('duplicatesPageBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// NOTE: mainTitle element is no longer needed for the 'c-refresh' method.

// ------------------- NEW FILTER STATE & ELEMENTS -------------------
const filterState = {
    year: [],
    caseLetter: [],
    series: [],
    hw_number: [],
    color: [],
    unownedOnly: false,
    th: false,
    sth: false,
    showDuds: false, // NEW STATE VARIABLE
};

// CRITICAL: These MUST match the IDs in your HTML structure.
const filterContainers = {
    year: document.getElementById('yearFilterContainer'), 
    caseLetter: document.getElementById('caseLetterFilterContainer'), 
    series: document.getElementById('seriesFilterContainer'), 
    hw_number: document.getElementById('hwNumberFilterContainer'), 
    color: document.getElementById('colorFilterContainer') 
};

const filterChipBar = document.getElementById('activeFiltersBar'); 

const unownedOnlyCheckbox = document.getElementById('unownedOnlyCheckbox');
const thCheckbox = document.getElementById('thCheckbox');
const sthCheckbox = document.getElementById('sthCheckbox');

// NEW ELEMENTS
const dudsCheckboxWrapper = document.getElementById('dudsCheckboxWrapper');
const showDudsCheckbox = document.getElementById('showDudsCheckbox');


// ------------------- SERVICE WORKER + UPDATE POPUP -------------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then(reg => {
    function showUpdate(worker) {
        const banner = document.createElement('div');
        banner.innerHTML = `
            <div style="position:fixed; bottom:10px; left:50%; transform:translateX(-50%); background:#ff5722; color:white; padding:10px 20px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.3); font-family:sans-serif; z-index:9999;">
                🔄 A new version is available.
                <button style="margin-left:10px; padding:5px 10px; border:none; background:white; color:#ff5722; border-radius:5px; cursor:pointer; font-weight:bold;">Reload</button>
            </div>
        `;
        const button = banner.querySelector('button');
        button.addEventListener('click', () => {
            worker.postMessage({ action: 'skipWaiting' });
        });
        document.body.appendChild(banner);
    }
    if (reg.waiting) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdate(newWorker);
            }
        });
    });
  }).catch(err => console.error("SW registration failed:", err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// ------------------- CACHE REFRESH KEYWORD LOGIC -------------------

function manualHardRefresh() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Keyword detected. Requesting FULL hard cache refresh from Service Worker.');
        
        // **FIX 1: Create a MessageChannel for bi-directional communication**
        const messageChannel = new MessageChannel();
        const port = messageChannel.port1;

        // Listen for the response on the port we kept (port1)
        port.addEventListener('message', function handler(event) {
            if (event.data.action === 'cacheHardRefreshed') {
                notification.innerHTML = '✅ **All Caches Refreshed!** Reloading page...';
                
                // Clean up the listener and reload the entire application
                port.removeEventListener('message', handler);
                setTimeout(() => {
                    document.getElementById('refreshNotification')?.remove(); // Use optional chaining for safety
                    window.location.reload(); 
                }, 1000);
            }
        });
        port.start(); // Start the port to begin listening

        // Show a temporary message to the user
        const notification = document.createElement('div');
        notification.id = 'refreshNotification';
        notification.innerHTML = '🔄 **FULL Cache Refresh Started.** Please wait...';
        notification.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#e91e63; color:white; padding:10px 20px; border-radius:5px; box-shadow:0 4px 6px rgba(0,0,0,0.2); z-index:10000; font-weight:bold;';
        document.body.appendChild(notification);
        
        // **FIX 2: Send the port (port2) to the Service Worker**
        navigator.serviceWorker.controller.postMessage({
            action: 'manualHardRefreshAll' 
        }, [messageChannel.port2]); // Pass port2 for the Service Worker to use for replies

    } else {
        alert("Service Worker not active. Cannot manually refresh cache.");
    }
}


// ------------------- CHIP/TAG FILTER LOGIC -------------------

function renderFilterOptions(field, optionsSet) {
    const container = filterContainers[field];
    if (!container) return; 
    
    const contentDiv = container.querySelector('.dropdown-content');
    if (!contentDiv) return; 

    // Find or create the list container (ul)
    let ul = contentDiv.querySelector('.filter-options');
    if (!ul) {
        ul = document.createElement('ul');
        ul.classList.add('filter-options');
        contentDiv.appendChild(ul);
    }
    ul.innerHTML = ''; 

    const sortedOptions = Array.from(optionsSet).filter(Boolean).sort((a, b) => {
        if (field === 'hw_number') {
            const numA = parseInt(String(a).match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(String(b).match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
        }
        return String(a).localeCompare(String(b));
    });

    sortedOptions.forEach(optionValue => {
        const li = document.createElement('li');
        li.textContent = optionValue;
        li.dataset.value = optionValue;
        li.dataset.field = field;
        
        // Highlight if currently selected
        if (filterState[field].includes(optionValue)) {
            li.classList.add('selected');
        }
        
        li.addEventListener('click', handleFilterChange);
        ul.appendChild(li);
    });
}

function renderActiveChips() {
    if (!filterChipBar) {
        console.error("Filter chip bar element (#activeFiltersBar) not found in HTML.");
        return; 
    }
    
    filterChipBar.innerHTML = ''; 

    ['year', 'caseLetter', 'series', 'hw_number', 'color'].forEach(field => {
        filterState[field].forEach(value => {
            addFilterChip(field, value);
        });
    });

    if (filterState.unownedOnly) addFilterChip('checkbox', 'Unowned Only', 'unownedOnly');
    if (filterState.th) addFilterChip('checkbox', 'Treasure Hunts', 'th');
    if (filterState.sth) addFilterChip('checkbox', 'Super TH', 'sth');
    
    // NEW: Render the Show Duds chip
    if (filterState.showDuds) addFilterChip('checkbox', 'Show Duds', 'showDuds');
}

function addFilterChip(field, value, stateKey = null) {
    const chip = document.createElement('span');
    chip.classList.add('filter-chip');
    chip.textContent = value;
    
    const closeBtn = document.createElement('span');
    closeBtn.textContent = ' ×'; // Changed from \u00D7 to ' ×' to prevent &nbsp issues
    closeBtn.classList.add('chip-close');
    
    chip.dataset.field = field;
    chip.dataset.value = value;
    chip.dataset.stateKey = stateKey || field;

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFilterChip(chip);
    });
    
    chip.appendChild(closeBtn);
    filterChipBar.appendChild(chip);
}

function removeFilterChip(chipElement) {
    const field = chipElement.dataset.field;
    const value = chipElement.dataset.value;
    const stateKey = chipElement.dataset.stateKey;

    if (field === 'checkbox') {
        filterState[stateKey] = false;
        const checkbox = document.getElementById(stateKey + 'Checkbox');
        if (checkbox) checkbox.checked = false;
        
        // NEW: If removing STH, hide and reset the Duds filter
        if (stateKey === 'sth') {
            dudsCheckboxWrapper.style.display = 'none'; 
            filterState.showDuds = false;
            if (showDudsCheckbox) showDudsCheckbox.checked = false;
            
            // Also remove the duds chip if it exists (redundant but safe)
            document.querySelector('[data-state-key="showDuds"]')?.remove();
        }
        
    } else {
        // Multi-select removal: filter out the specific value
        filterState[field] = filterState[field].filter(v => v !== value);
        
        // Optional: Close the dropdown content after removal for a cleaner UI
        const container = filterContainers[field];
        if (container) {
            const toggleCheckbox = container.querySelector('.dropdown-toggle');
            if (toggleCheckbox) toggleCheckbox.checked = false;
        }
    }
    
    // 🔥 CRITICAL FIX: Immediately remove the chip from the DOM
    chipElement.remove();
    
    performSearch();
}

/**
 * Gets unique options for the cascading filters based on currently filtered cars.
 */
function getAvailableOptionsForFiltering(targetField) {
    const options = new Set();
    
    // --- 1. Handle Non-Cascading Fields (Year & Case) ---
    if (targetField === 'year' || targetField === 'caseLetter') {
        const allCars = getAllCarsForInitialLoad();
        
        allCars.forEach(item => {
            let value;
            if (targetField === 'year') {
                if (!searchOldCases.checked && parseInt(item.year) < 2024) return;
                value = item.year;
            } else if (targetField === 'caseLetter') {
                value = item.caseLetter || (item.hwCase ? item.hwCase.letter : null);
            }
            if (value) options.add(value);
        });
        return options;
    }

    // --- 2. Handle Cascading Fields (Series, HW#, Color) ---
    
    const allCars = getAllCarsForInitialLoad();
    const query = searchBar.value.trim().toLowerCase(); 

    // Prepare active filters
    const activeFilters = {};
    for (const key in filterState) {
        if (Array.isArray(filterState[key]) && filterState[key].length > 0) {
            activeFilters[key] = filterState[key].map(v => String(v).toLowerCase()).filter(v => v !== "");
        }
    }

    allCars.forEach(item => {
        let passesOtherFilters = true;
        const yearKey = item.year;
        const car = item.car;
        const hwCase = item.hwCase;

        // Apply 'Search Old Cases' check here
        if (!searchOldCases.checked && parseInt(yearKey) < 2024) return;

        // Check if the car matches the search query first
        if (query.length > 0 && !car.name.toLowerCase().includes(query)) {
             passesOtherFilters = false;
        }

        if (!passesOtherFilters) return;

        // Helper to check if a filter is active and if the item does NOT match any selected value
        const checkFilter = (field, itemValue) => {
            if (activeFilters[field] && activeFilters[field].length > 0 && 
                field !== targetField && 
                !activeFilters[field].includes(String(itemValue).toLowerCase())) {
                return false;
            }
            return true;
        };

        // Check Year (must pass)
        if (!checkFilter('year', yearKey)) passesOtherFilters = false;

        // Check Case Letter (must pass)
        if (!checkFilter('caseLetter', hwCase.letter)) passesOtherFilters = false;
        
        // Check Series
        if (!checkFilter('series', car.series)) passesOtherFilters = false;
        
        // Check HW Number
        if (!checkFilter('hw_number', car.hw_number)) passesOtherFilters = false;

        // Check Color
        if (!checkFilter('color', car.color)) passesOtherFilters = false;
        
        // Check Checkboxes (These apply regardless of the target field)
        // We skip TH/STH logic here since we only want to generate options based on ALL possible cars
        if (filterState.unownedOnly) {
            const isOwned = ownedCars.some(o => o.car.image === car.image);
            if (isOwned) passesOtherFilters = false;
        }


        if (passesOtherFilters) {
            // If the car passes all *other* filters AND the search query, extract the option
            let value;
            switch (targetField) {
                case 'series':
                    value = car.series;
                    break;
                case 'hw_number':
                    value = car.hw_number;
                    break;
                case 'color':
                    value = car.color;
                    break;
            }
            if (value) options.add(value);
        }
    });
    
    return options;
}

/**
 * Helper: Prepares a flat array of ALL cars for the initial load/no-filter state.
 */
function getAllCarsForInitialLoad() {
    const allCars = [];
    Object.keys(carsData).forEach(yearKey => {
        carsData[yearKey].cases.forEach(hwCase => {
            hwCase.cars.forEach(car => {
                allCars.push({ year: yearKey, hwCase: hwCase, car: car, caseLetter: hwCase.letter });
            });
        });
    });
    return allCars;
}

/**
 * Updates the display of all clickable filter options based on the 
 * currently filtered set of cars (cascading logic).
 */
function updateFilterOptionsUI() {
    renderFilterOptions('year', getAvailableOptionsForFiltering('year'));
    renderFilterOptions('caseLetter', getAvailableOptionsForFiltering('caseLetter'));
    renderFilterOptions('series', getAvailableOptionsForFiltering('series'));
    renderFilterOptions('hw_number', getAvailableOptionsForFiltering('hw_number'));
    renderFilterOptions('color', getAvailableOptionsForFiltering('color'));
}


// ------------------- FETCH DATA & INITIALIZE FILTERS -------------------

function fetchDataAndInitialize() {
    fetch('data.json')
      .then(res => res.json())
      .then(data => {
          carsData = data;
          // UPDATE GLOBAL DATA HERE
          window.carsData = data; 
          
          // Initialize filter options based on all data
          updateFilterOptionsUI();
          
          // Perform an initial search to show default results if needed (or just the prompt)
          performSearch(); 
      })
      .catch(err => console.error("Failed to fetch data.json:", err));
}

// Call the new initialization function at startup
fetchCarData().then(fetchDataAndInitialize);


// ------------------- CORE FILTER CHANGE HANDLER -------------------
function handleFilterChange(e) {
    
    const target = e.target;

    if (target.tagName.toLowerCase() === 'li') {
        
        e.stopPropagation(); 
        
        const field = target.dataset.field;
        const value = target.dataset.value;

        // MULTI-SELECT LOGIC: Toggle the value in the filterState array
        if (filterState[field].includes(value)) {
            filterState[field] = filterState[field].filter(v => v !== value);
        } else {
            filterState[field].push(value);
        }
        
    } else if (target.id === 'searchOldCases') { // Handle 'Search Old Cases' checkbox change
        performSearch();
        return; 
    } else {
        // Handle Checkboxes
        if (target.id === 'unownedOnlyCheckbox') filterState.unownedOnly = target.checked;
        if (target.id === 'thCheckbox') filterState.th = target.checked;
        
        // NEW: Handle STH and control Duds visibility
        if (target.id === 'sthCheckbox') {
            filterState.sth = target.checked;
            if (target.checked) {
                dudsCheckboxWrapper.style.display = 'inline-block'; // Show Duds option
            } else {
                dudsCheckboxWrapper.style.display = 'none'; // Hide Duds option
                filterState.showDuds = false; // Reset Duds state when STH is unchecked
                if (showDudsCheckbox) showDudsCheckbox.checked = false; // Uncheck Duds UI
            }
        }

        // NEW: Handle Show Duds checkbox
        if (target.id === 'showDudsCheckbox') {
            filterState.showDuds = target.checked;
        }
    }

    renderActiveChips(); 
    performSearch();
}

// Attach event listeners for checkboxes (list items are handled in renderFilterOptions)
if (unownedOnlyCheckbox) unownedOnlyCheckbox.addEventListener('click', handleFilterChange);
if (thCheckbox) thCheckbox.addEventListener('click', handleFilterChange);
if (sthCheckbox) sthCheckbox.addEventListener('click', handleFilterChange);
if (showDudsCheckbox) showDudsCheckbox.addEventListener('click', handleFilterChange); // NEW: Duds listener

// ------------------- GLOBAL DROPDOWN CLOSE LOGIC -------------------

function closeAllDropdowns(event) {
    const isClickInsideFilter = event.target.closest('.custom-dropdown-container') || event.target.closest('.filter-chip');
    
    if (!isClickInsideFilter) {
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.checked = false;
        });
    }
}

// Attach the global listener to the document
document.addEventListener('click', closeAllDropdowns);


// ------------------- UPDATED PERFORM SEARCH FUNCTION WITH FILTERS -------------------
function performSearch() {
    const query = searchBar.value.trim().toLowerCase();
    resultsDiv.innerHTML = '';
    
    // CHECK FOR CACHE REFRESH KEYWORD
    if (query === 'c-refresh') {
        searchBar.value = ''; // Clear the keyword
        manualHardRefresh();  // Trigger the refresh
        return;               // Stop search execution
    }

    // --- 1. Prepare Active Filters ---
    const activeFilters = {};
    for (const key in filterState) {
        if (Array.isArray(filterState[key]) && filterState[key].length > 0) {
            activeFilters[key] = filterState[key].map(v => String(v).toLowerCase()).filter(v => v !== "");
        }
    }
    
    const isSearchActive = query.length > 0;
    const isFilterActive = Object.keys(activeFilters).some(key => activeFilters[key].length > 0) || filterState.unownedOnly || filterState.th || filterState.sth || filterState.showDuds; // NEW: Check showDuds

    // Show results ONLY if search or filter is active.
    if (!isSearchActive && !isFilterActive) {
        filteredCarsCache = []; 
        updateFilterOptionsUI(); 
        resultsDiv.innerHTML = '<p class="no-results">Start typing or select a filter to see results.</p>';
        return; 
    }
    
    filteredCarsCache = []; 

    // --- 2. Iterate Over Data and Apply ALL Filters (AND Logic) ---
    Object.keys(carsData).forEach(yearKey => {
        
        // Year Filter Check 
        if (activeFilters.year && activeFilters.year.length > 0 && !activeFilters.year.includes(yearKey)) return;
        
        // Check "Search Old Cases" (This is the primary data filter)
        if (!searchOldCases.checked && parseInt(yearKey) < 2024) return;

        carsData[yearKey].cases.forEach(hwCase => {
            
            // Case Letter Filter Check
            if (activeFilters.caseLetter && activeFilters.caseLetter.length > 0 && !activeFilters.caseLetter.includes(hwCase.letter.toLowerCase())) return;

            hwCase.cars.forEach(car => {
                let passesAllFilters = true;

                // --- A. Search Bar Logic (if active) ---
                if (isSearchActive) {
                    let searchMatches = false;
                    
                    if (car.name.toLowerCase().includes(query)) searchMatches = true;

                    // Prefix searches (for compatibility):
                    if (query.startsWith('s-') && car.series.toLowerCase().includes(query.slice(2).trim())) searchMatches = true;
                    if (query.startsWith('sth') && hwCase.sth && car.hw_number === hwCase.sth.hw_number) searchMatches = true;
                    if (query.startsWith('th') && hwCase.th && car.hw_number === hwCase.th.hw_number) searchMatches = true;
                    if (query.startsWith('c-') && hwCase.letter.toLowerCase() === query.slice(2).trim().toLowerCase()) searchMatches = true;

                    if (!searchMatches) {
                        passesAllFilters = false;
                    }
                }
                
                if (!passesAllFilters) return;

                // --- B. Dropdown Filters (AND across fields) ---
                
                // Series Filter
                if (activeFilters.series && activeFilters.series.length > 0 && !activeFilters.series.includes(car.series.toLowerCase())) {
                    passesAllFilters = false;
                }
                
                // HW Number Filter
                if (activeFilters.hw_number && activeFilters.hw_number.length > 0 && !activeFilters.hw_number.includes(car.hw_number.toLowerCase())) {
                    passesAllFilters = false;
                }

                // Color Filter
                const carColor = (car.color || '').trim().toLowerCase();
                if (activeFilters.color && activeFilters.color.length > 0 && !activeFilters.color.includes(carColor)) {
                    passesAllFilters = false;
                }
                
                if (!passesAllFilters) return;

                // --- C. Checkbox Filters (AND) ---

                // Unowned Only Checkbox
                if (filterState.unownedOnly) {
                    const isOwned = ownedCars.some(o => o.car.image === car.image);
                    if (isOwned) passesAllFilters = false;
                }

                // 🔥 UPDATED HUNT/DUD LOGIC: Use OR logic for hunts, and INCLUDE duds if requested
                if (filterState.th || filterState.sth || filterState.showDuds) {
                    
                    // Definitions based on HW number AND image URL
                    const isTH = filterState.th && hwCase.th && 
                                 car.hw_number === hwCase.th.hw_number &&
                                 car.image === hwCase.th.image;

                    const isSTH = filterState.sth && hwCase.sth && 
                                  car.hw_number === hwCase.sth.hw_number &&
                                  car.image === hwCase.sth.image;

                    // A car is a DUD if its HW number matches the STH number, but its image is NOT the STH image.
                    const isDud = filterState.showDuds && hwCase.sth && 
                                  car.hw_number === hwCase.sth.hw_number &&
                                  car.image !== hwCase.sth.image;

                    // If NO special hunt cars (TH or STH) are found, AND NO duds are requested, the car fails.
                    // If duds are requested, check if it's a Dud, TH, or STH.
                    if (!isTH && !isSTH && !isDud) {
                        // This car is not a TH, STH, or a requested Dud, so it fails the special hunt filter group.
                        passesAllFilters = false;
                    }
                    
                    // Ensure that if STH is checked, Duds is ONLY possible if showDuds is also checked.
                    // (This is implicitly handled by the isDud check being tied to filterState.showDuds)
                }
                
                if (!passesAllFilters) return;

                // --- D. If ALL criteria are met, cache and render the card ---
                if (passesAllFilters) {
                    // Cache the matching item (critical for cascading filters)
                    filteredCarsCache.push({ year: yearKey, hwCase: hwCase, car: car, caseLetter: hwCase.letter });

                    // Call the existing render function
                    renderCarCard(yearKey, hwCase.letter, car, resultsDiv);
                }
            });
        });
    });
    
    // --- 3. Final Steps: Update UI ---

    // Update the clickable filter options based on the new results (cascading)
    updateFilterOptionsUI(); 

    // If no results, display a message
    if (resultsDiv.innerHTML === '') {
        resultsDiv.innerHTML = '<p class="no-results">No cars found matching all criteria. Try broadening your filters!</p>';
    }
}

// EXPOSE GLOBALLY FOR POPUP.JS
window.performSearch = performSearch;

// ------------------- SEARCH BAR + CLEAR BUTTON ------------------
searchBar.addEventListener('input', () => {
  performSearch();
  clearBtn.style.display = searchBar.value ? 'block' : 'none';
});

// 🔥 CRITICAL FIX: Add the direct listener for the checkbox
searchOldCases.addEventListener('click', performSearch); // Use 'click' for immediate reaction

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  searchBar.value = '';
  clearBtn.style.display = 'none';
  performSearch();
  searchBar.focus(); 
});

// ------------------- RENDER CAR CARD HELPER (FINAL FIX) -------------------
function renderCarCard(year, caseLetter, c, container) {
  const div = document.createElement('div');
  div.classList.add('result-card');

  // --- CRITICAL CHANGE: Use centralized styling function ---
  // The styling logic is now called here in all contexts (main search, and pop-up grids)
  const huntIconHtml = applyHuntStyling(div, year, caseLetter, c);

  function updateCardUI() {
    let ownedCar = ownedCars.find(o => o.car.image === c.image);
    let isOwned = !!ownedCar;
    let isWanted = wantedCars.some(w => w.car.image === c.image);
    const quantity = ownedCar ? (ownedCar.quantity || 1) : 0;


    div.innerHTML = `
      <img src="${c.image}" alt="${c.name}">
      <div class="card-info">
      <div class="info-metadata-block">
        <h3>${c.name}</h3>
        <p>${year} - ${caseLetter}</p>
        <p>${c.series} (#${c.series_number})</p>
        <p>HW#: ${c.hw_number} | Color: ${c.color}</p>
        ${huntIconHtml}
        
        ${isOwned ? `
            <p class="quantity-line">
                Quantity: <span class="quantity-value">${quantity}</span>
            </p>
            <p>
            <button class="decrease-btn" data-action="decrement">-</button>
            <button class="increase-btn" data-action="increment">+</button>
            </p>
        ` : ''}
         <button class="${isOwned ? 'unowned-btn' : 'owned-btn'}">
          ${isOwned ? 'Unmark Owned' : 'Mark Owned'}
        </button>

        ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
      </div>
    `;

    // Helper to update quantity in the ownedCars array
    const updateQuantity = (change) => {
        let carToUpdate = ownedCars.find(o => o.car.image === c.image);
        if (carToUpdate) {
            let newQty = (carToUpdate.quantity || 1) + change;
            
            if (newQty < 1) {
                // If quantity drops to 0 or below, remove from owned list (Unmark Owned)
                ownedCars = ownedCars.filter(o => o.car.image !== c.image);
            } else {
                carToUpdate.quantity = newQty;
            }
            
            localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
            updateCardUI(); // Re-render the card
        }
    };


    const ownedBtn = div.querySelector('.owned-btn, .unowned-btn');
    if (ownedBtn) {
      ownedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentlyOwned = ownedCars.find(o => o.car.image === c.image);
        if (currentlyOwned) {
          // Unmark Owned: remove car
          ownedCars = ownedCars.filter(o => o.car.image !== c.image);
        } else {
          // Mark Owned: add car with quantity 1
          ownedCars.push({ year, caseLetter, car: c, quantity: 1 });
        }
        localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
        updateCardUI(); // Re-render the card for state change
      });
    }

    const increaseBtn = div.querySelector('.increase-btn');
    if (increaseBtn) {
      increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(1);
      });
    }

    const decreaseBtn = div.querySelector('.decrease-btn');
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuantity(-1);
      });
    }


    const addWantedBtn = div.querySelector('.add-wanted-btn');
    if (addWantedBtn) {
      addWantedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wantedCars.push({ year, caseLetter, car: c });
        localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
        updateCardUI(); // Re-render the card to hide the button
      });
    }

    div.addEventListener('click', e => {
      // Don't trigger details if clicking any button
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return;

      let parentCase = null;
      // Get data from the global source
      const currentCarsData = window.getCarData(); 
      
      if (currentCarsData[year] && currentCarsData[year].cases) {
        currentCarsData[year].cases.forEach(hCase => {
          if (hCase.letter === caseLetter && hCase.cars.some(carInCase => carInCase.image === c.image)) {
            parentCase = hCase;
          }
        });
      }

      if (parentCase) {
        // CALL GLOBAL showDetails function
        window.showDetails(year, parentCase, c); 
      } else {
        alert("Case details not immediately available. Try main search.");
      }
    });
  }

  updateCardUI();
  container.appendChild(div);
}

// EXPOSE GLOBALLY FOR POPUP.JS
window.renderCarCard = renderCarCard; 


// ------------------- EXPORT / IMPORT -------------------
exportBtn.addEventListener('click', () => {
  if (!wantedCars.length && !ownedCars.length) return alert("No data to export!");
  const dataToExport = { wantedCars, ownedCars };
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hotwheels_data.json';
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result);
      wantedCars = imported.wantedCars || [];
      ownedCars = imported.ownedCars || [];
      localStorage.setItem('wantedCars', JSON.stringify(wantedCars));
      localStorage.setItem('ownedCars', JSON.stringify(ownedCars));
      alert("Import successful! Existing data replaced.");
      performSearch();
    } catch(err) {
      alert("Failed to import: " + err.message);
    }
  };
  reader.readAsText(file);
});