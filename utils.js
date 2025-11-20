// utils.js

// Global variable to hold the full car data once fetched
let globalCarsData = {};

/**
 * Fetches car data and stores it globally.
 * @returns {Promise<Object>} The car data object.
 */
function fetchCarData() {
    // Note: Assumes data.json is in the root directory
    return fetch('data.json')
        .then(res => res.json())
        .then(data => {
            globalCarsData = data;
            // Expose globally for showDetails (popup.js) and other files
            window.carsData = data; 
            return data;
        })
        .catch(err => {
            console.error("Failed to fetch data.json in utils:", err);
            return {};
        });
}

/**
 * Gets the globally loaded car data.
 */
function getCarData() {
    return globalCarsData;
}

// Expose getCarData globally for popup.js to access
window.getCarData = getCarData;

// --- NEW/UPDATED HELPERS ---

/**
 * Saves the current list of owned cars to localStorage.
 * EXPOSED GLOBALLY so card rendering functions can update state directly.
 */
function setOwnedCars(cars) {
    localStorage.setItem('ownedCars', JSON.stringify(cars));
}
window.setOwnedCars = setOwnedCars;

/**
 * Gets the current list of wanted cars from localStorage.
 */
function getWantedCars() {
    return JSON.parse(localStorage.getItem('wantedCars') || '[]');
}

/**
 * Gets the current list of owned cars from localStorage (simple array).
 */
function getOwnedCarsSimple() {
    return JSON.parse(localStorage.getItem('ownedCars') || '[]');
}

/**
 * Applies TH/STH styling (borders and icons) to a result card.
 * @param {HTMLElement} cardDiv The HTML div element of the card.
 * @param {string} year The car's model year.
 * @param {string} caseLetter The case letter (e.g., 'A', 'B').
 * @param {Object} car The car object containing name, hw_number, image, etc.
 * @returns {string} The HTML string containing the TH/STH icons, or an empty string.
 */
function applyHuntStyling(cardDiv, year, caseLetter, car) {
    const data = getCarData();
    const yearData = data[year];
    if (!yearData) return '';

    const caseData = yearData.cases.find(cs => cs.letter === caseLetter);
    if (!caseData) return '';

    let isTH = false;
    let isSTH = false;

    // Detection logic
    if (caseData.th && car.hw_number === caseData.th.hw_number && car.image === caseData.th.image) {
        isTH = true;
    }
    if (caseData.sth && car.hw_number === caseData.sth.hw_number && car.image === caseData.sth.image) {
        isSTH = true;
    }

    // Apply borders (since this affects the card div style)
    if (isSTH) {
        cardDiv.style.border = '4px solid gold';
        cardDiv.style.boxShadow = '0 0 10px gold';
    } else if (isTH) {
        cardDiv.style.border = '4px solid silver';
        cardDiv.style.boxShadow = '0 0 10px silver';
    }

    // Return the HTML string for the icons (using the hunt-badge class for sizing)
    return `
        ${isSTH ? '<p class="sth-label"><img src="images/STH.png" alt="STH" class="hunt-badge"></p>' : ''}
        ${isTH ? '<p class="th-label"><img src="images/TH.png" alt="TH" class="hunt-badge"></p>' : ''}
    `;
}

/**
 * Renders a single car card. This is used by script.js, popup.js, and owned.js.
 */
function renderCarCard(year, caseLetter, c, container) {
  const div = document.createElement('div');
  div.classList.add('result-card');

  // CRITICAL: Refresh needed data here
  const ownedCars = getOwnedCarsSimple();
  const wantedCars = getWantedCars();

  const huntIconHtml = applyHuntStyling(div, year, caseLetter, c);

  function updateCardUI() {
    let ownedCar = ownedCars.find(o => o.car.image === c.image);
    let isOwned = !!ownedCar;
    // We re-check the wanted status just before rendering
    let isWanted = getWantedCars().some(w => w.car.image === c.image); 
    const quantity = ownedCar ? (ownedCar.quantity || 1) : 0;


    div.innerHTML = `
      <img src="${c.image}" alt="${c.name}">
      <div class="card-info">
        <h3>${c.name}</h3>
        <p>${year} - ${caseLetter}</p>
        <p>${c.series} (#${c.series_number})</p>
        <p>HW#: ${c.hw_number} | Color: ${c.color}</p>
        ${huntIconHtml}   
        ${isOwned ? `
            <p class="quantity-line">
                Quantity: <span class="quantity-value" data-image="${c.image}" data-qty="${quantity}">${quantity}</span>
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

    // Helper to update quantity in the ownedCars array (must read/write directly to localStorage)
    const updateQuantity = (change) => {
        let currentOwned = getOwnedCarsSimple();
        let carToUpdate = currentOwned.find(o => o.car.image === c.image);
        if (carToUpdate) {
            let newQty = (carToUpdate.quantity || 1) + change;
            
            if (newQty < 1) {
                // If quantity drops to 0 or below, remove from owned list (Unmark Owned)
                currentOwned = currentOwned.filter(o => o.car.image !== c.image);
            } else {
                carToUpdate.quantity = newQty;
            }
            
            window.setOwnedCars(currentOwned);
            
            // Trigger UI update on the calling page
            if (typeof window.renderOwnedCars === 'function') window.renderOwnedCars(window.groupSelect.value);
            else if (typeof window.performSearch === 'function') window.performSearch();

            updateCardUI(); // Re-render the card locally
        }
    };


    const ownedBtn = div.querySelector('.owned-btn, .unowned-btn');
    if (ownedBtn) {
      ownedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentOwned = getOwnedCarsSimple();
        const currentlyOwned = currentOwned.find(o => o.car.image === c.image);
        if (currentlyOwned) {
          currentOwned = currentOwned.filter(o => o.car.image !== c.image);
        } else {
          currentOwned.push({ year, caseLetter, car: c, quantity: 1 });
        }
        window.setOwnedCars(currentOwned);
        
        if (typeof window.renderOwnedCars === 'function') window.renderOwnedCars(window.groupSelect.value);
        else if (typeof window.performSearch === 'function') window.performSearch();

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
        
        let currentWanted = getWantedCars();
        if (!currentWanted.some(w => w.car.image === c.image)) {
            currentWanted.push({ year, caseLetter, car: c });
            localStorage.setItem('wantedCars', JSON.stringify(currentWanted));
        }
        
        addWantedBtn.style.display = 'none'; // Hide the button immediately

        // Trigger the full page refresh function if available (crucial for Owned/Search pages)
        if (typeof window.renderOwnedCars === 'function') {
            window.renderOwnedCars(window.groupSelect.value);
        } else if (typeof window.performSearch === 'function') {
            window.performSearch();
        } else if (typeof window.loadWantedCars === 'function') {
             // For the wanted page itself (if implemented)
            window.loadWantedCars();
        }
      });
    }

    // --- NEW: Click listener for quantity span (Implements quantity input) ---
    // Use setTimeout(0) to ensure the innerHTML update has fully rendered the span before querying the DOM
    setTimeout(() => {
        const qtySpan = div.querySelector('.quantity-value');
        if (qtySpan) {
            qtySpan.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop the card's showDetails click listener
                
                const currentQty = parseInt(qtySpan.dataset.qty, 10);
                const newQtyStr = prompt(`Enter new quantity for ${c.name}:`, currentQty);
                
                if (newQtyStr === null) return; // User cancelled
                
                const newQty = parseInt(newQtyStr, 10);
                
                if (isNaN(newQty) || newQty < 1) {
                    alert('Please enter a valid number (minimum 1).');
                    return;
                }

                // Update the quantity in localStorage
                let owned = getOwnedCarsSimple();
                const idx = owned.findIndex(o => o.car.image === c.image);
                
                if (idx !== -1) {
                    owned[idx].quantity = newQty;
                    window.setOwnedCars(owned); 
                    
                    // Trigger refresh on the current page type
                    if (typeof window.renderOwnedCars === 'function') {
                        window.renderOwnedCars(window.groupSelect.value);
                    } else if (typeof window.performSearch === 'function') {
                        window.performSearch();
                    }
                    // No need to call updateCardUI() locally as the parent function call will refresh.
                }
            });
        }
    }, 0); 
    // --- END NEW QUANTITY INPUT ---


    div.addEventListener('click', e => {
      // Don't trigger details if clicking any button or the quantity span
      if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button') || e.target.classList.contains('quantity-value')) return;

      let parentCase = null;
      const currentCarsData = getCarData(); 
      
      if (currentCarsData[year] && currentCarsData[year].cases) {
        currentCarsData[year].cases.forEach(hCase => {
          if (hCase.letter === caseLetter && hCase.cars.some(carInCase => carInCase.image === c.image)) {
            parentCase = hCase;
          }
        });
      }

      if (parentCase) {
        // CALL GLOBAL showDetails function
        if (typeof window.showDetails === 'function') {
             window.showDetails(year, parentCase, c); 
        }
      } else {
        alert("Case details not immediately available. Try main search.");
      }
    });
  }

  updateCardUI();
  container.appendChild(div);
}

// Expose renderCarCard globally for popup.js and owned.js to use
window.renderCarCard = renderCarCard;