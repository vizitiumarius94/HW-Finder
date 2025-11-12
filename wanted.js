const wantedListDiv = document.getElementById('wantedList');
const backBtn = document.getElementById('backBtn');

// Helpers
function getWantedCars() {
  return JSON.parse(localStorage.getItem('wantedCars') || '[]');
}
function setWantedCars(cars) {
  localStorage.setItem('wantedCars', JSON.stringify(cars));
}

// Back to main search page
backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Load wanted cars as full cards
function loadWantedCars() {
  const wanted = getWantedCars();
  wantedListDiv.innerHTML = '';

  if (!wanted.length) {
    wantedListDiv.innerHTML = '<p class="no-results">No cars in your Wanted list yet.</p>';
    return;
  }

  wanted.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('result-card');
    card.innerHTML = `
      <img src="${item.car.image}" alt="${item.car.name}">
      <div class="card-info">
        <h3>${item.car.name}</h3>
        <p><strong>Year:</strong> ${item.year}</p>
        <p><strong>Case:</strong> ${item.caseLetter}</p>
        <p><strong>Series:</strong> ${item.car.series} (#${item.car.series_number})</p>
        <p><strong>HW Number:</strong> ${item.car.hw_number}</p>
        <p><strong>Color:</strong> ${item.car.color}</p>
        <button class="remove-from-list-btn">Remove</button>
      </div>
    `;

    // Updated class name in query selector
    card.querySelector('.remove-from-list-btn').addEventListener('click', () => {
      let wanted = getWantedCars().filter(w => w.car.image !== item.car.image);
      setWantedCars(wanted);
      loadWantedCars(); // refresh list
    });

    wantedListDiv.appendChild(card);
  });
}

loadWantedCars();