// Helpers
function getOwnedCars() {
  return JSON.parse(localStorage.getItem('ownedCars') || '[]');
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

const ownedCarsContainer = document.getElementById('ownedCarsContainer');
const groupSelect = document.getElementById('groupSelect');
const backToSearchBtn = document.getElementById('backToSearchBtn');

backToSearchBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Render cars initially grouped by case
renderOwnedCars('case');

// Change grouping
groupSelect.addEventListener('change', () => {
  renderOwnedCars(groupSelect.value);
});

function renderOwnedCars(groupBy) {
  ownedCarsContainer.innerHTML = '';

  // Group cars
  const groups = {};
  const ownedCars = getOwnedCars();
  const wantedCars = getWantedCars();

  ownedCars.forEach(item => {
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

      let isWanted = wantedCars.some(w => w.car.image === item.car.image);

      div.innerHTML = `
        <img src="${item.car.image}" alt="${item.car.name}">
        <div class="card-info">
          <h4>${item.car.name}</h4>
          <p>${item.car.series} (#${item.car.series_number})</p>
          <p>HW#: ${item.car.hw_number} | Color: ${item.car.color}</p>
          <p>Year: ${item.year} | Case: ${item.caseLetter}</p>
          <button class="unowned-btn">Unmark Owned</button>
          ${!isWanted ? '<button class="add-wanted-btn">+ Add to Wanted</button>' : ''}
        </div>
      `;

      // Unmark owned
      const unownedBtn = div.querySelector('.unowned-btn');
      unownedBtn.addEventListener('click', () => {
        let ownedCars = getOwnedCars().filter(o => o.car.image !== item.car.image);
        setOwnedCars(ownedCars);
        renderOwnedCars(groupBy);
      });

      // Add to wanted
      const addWantedBtn = div.querySelector('.add-wanted-btn');
      if (addWantedBtn) {
        addWantedBtn.addEventListener('click', () => {
          let wantedCars = getWantedCars();
          wantedCars.push({ year: item.year, caseLetter: item.caseLetter, car: item.car });
          setWantedCars(wantedCars);
          addWantedBtn.style.display = 'none';
        });
      }

      grid.appendChild(div);
    });

    groupDiv.appendChild(grid);
    ownedCarsContainer.appendChild(groupDiv);
  });
}