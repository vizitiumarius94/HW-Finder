const wantedListDiv = document.getElementById('wantedList');
const backBtn = document.getElementById('backBtn');

backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Load wanted cars
function loadWantedCars() {
  const wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
  wantedListDiv.innerHTML = '';

  if (!wanted.length) {
    wantedListDiv.innerHTML = '<p>No cars in your Wanted list yet.</p>';
    return;
  }

  wanted.forEach((item, index) => {
    const card = document.createElement('div');
    card.classList.add('result-card');
    card.innerHTML = `
      <img src="${item.car.image}" alt="${item.car.name}">
      <p>${item.car.name}</p>
      <p><strong>Year:</strong> ${item.year}</p>
      <p><strong>Case:</strong> ${item.caseLetter}</p>
      <button class="remove-btn">Remove</button>
    `;

    // Remove from Wanted
    card.querySelector('.remove-btn').addEventListener('click', () => {
      let wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
      wanted = wanted.filter(w => w.car.image !== item.car.image);
      localStorage.setItem('wantedCars', JSON.stringify(wanted));
      loadWantedCars(); // refresh list
    });

    wantedListDiv.appendChild(card);
  });
}

loadWantedCars();
