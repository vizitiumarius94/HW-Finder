// Helpers
function getOwnedCars() {
  return JSON.parse(localStorage.getItem('ownedCars') || '[]');
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
  const duplicates = ownedCars.filter(car => car.quantity > 1);

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

      div.innerHTML = `
        <img src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          <p>Quantity: ${item.quantity}</p>
          <p>Duplicates: ${item.quantity - 1}</p>
        </div>
      `;

      grid.appendChild(div);
    });

    groupDiv.appendChild(grid);
    duplicatesContainer.appendChild(groupDiv);
  });
}
