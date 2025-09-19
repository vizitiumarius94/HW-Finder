const wantedListDiv = document.getElementById('wantedList');
const backBtn = document.getElementById('backBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// Back to main search page
backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Export wanted cars
exportBtn.addEventListener('click', () => {
  const wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
  if (!wanted.length) { alert("No cars in Wanted list!"); return; }
  const blob = new Blob([JSON.stringify(wanted, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "wanted_cars.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Import wanted cars
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      let existing = JSON.parse(localStorage.getItem('wantedCars') || '[]');
      imported.forEach(item => {
        const exists = existing.some(w => w.car.image === item.car.image);
        if (!exists) existing.push(item);
      });
      localStorage.setItem('wantedCars', JSON.stringify(existing));
      alert("Wanted Cars imported successfully!");
      loadWantedCars();
    } catch (err) {
      alert("Failed to import: " + err.message);
    }
  };
  reader.readAsText(file);
});

// Load wanted cars as full cards
function loadWantedCars() {
  const wanted = JSON.parse(localStorage.getItem('wantedCars') || '[]');
  wantedListDiv.innerHTML = '';

  if (!wanted.length) {
    wantedListDiv.innerHTML = '<p>No cars in your Wanted list yet.</p>';
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
        <button class="remove-btn">Remove</button>
      </div>
    `;

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
