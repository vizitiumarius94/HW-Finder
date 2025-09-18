const wantedListDiv = document.getElementById('wantedList');
const clearBtn = document.getElementById('clearWanted');

// Load wanted cars from localStorage
function loadWantedCars() {
  const wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
  wantedListDiv.innerHTML = '';

  if (wanted.length === 0) {
    wantedListDiv.innerHTML = '<p>No wanted cars yet.</p>';
    return;
  }

  wanted.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('result-card');
    div.innerHTML = `
      <img src="${item.car.image}" alt="${item.car.name}">
      <p>${item.car.name}</p>
      <small>${item.year} - Case ${item.caseLetter}</small>
    `;
    wantedListDiv.appendChild(div);
  });
}

// Clear all wanted cars
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all wanted cars?')) {
    localStorage.removeItem('wantedCars');
    loadWantedCars();
  }
});

loadWantedCars();
