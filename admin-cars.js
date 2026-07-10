const LOGIN_USER = 'admin';
const LOGIN_PASS = 'admin';
// Change this to match your local preference.
// Real protection requires the backend; the UI gate only prevents accidental edits.

let serverBaseUrl = 'http://localhost:8000';

// Optional: allow override via query string: ?server=http://...
try {
  const url = new URL(window.location.href);
  const s = url.searchParams.get('server');
  if (s) serverBaseUrl = s;
} catch (_) {}

let dataJson = null;
let currentYear = null;
let currentCase = null;
let selectedCarIndex = null; // index within case.cars

const loginSection = document.getElementById('loginSection');
const editorSection = document.getElementById('editorSection');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const yearSelect = document.getElementById('yearSelect');
const caseSelect = document.getElementById('caseSelect');
const carsList = document.getElementById('carsList');
const rowEditor = document.getElementById('rowEditor');

const addCarBtn = document.getElementById('addCarBtn');
const saveRowBtn = document.getElementById('saveRowBtn');
const deleteRowBtn = document.getElementById('deleteRowBtn');

const commitAllBtn = document.getElementById('commitAllBtn');
const commitMsg = document.getElementById('commitMsg');
const adminStatus = document.getElementById('adminStatus');

function setAdminStatus(msg, isError=false) {
  if (!adminStatus) return;
  adminStatus.textContent = msg;
  adminStatus.style.color = isError ? '#d32f2f' : '#2e7d32';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
    .replaceAll("'", '&#039;');
}

function renderCarsList() {
  carsList.innerHTML = '';
  const yearObj = dataJson?.[currentYear];
  const caseObj = yearObj?.cases?.find(c => c.letter === currentCase);
  const cars = caseObj?.cars ?? [];

  cars.forEach((car, idx) => {
    const item = document.createElement('div');
    item.style.background = '#fff';
    item.style.borderRadius = '8px';
    item.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
    item.style.padding = '12px';
    item.style.cursor = 'pointer';

    const primary = `${car.name || ''} (${car.hw_number || ''})`;
    const secondary = `${car.series || ''} | ${car.color || ''}`;

    item.innerHTML = `
      <div style="font-weight:700; color:#2C3E50;">${escapeHtml(primary)}</div>
      <div style="font-size:0.9em; color:#666; margin-top:4px;">${escapeHtml(secondary)}</div>
    `;

    item.addEventListener('click', () => {
      selectedCarIndex = idx;
      renderRowEditor();
      document.querySelectorAll('#carsList > div').forEach(d => d.style.outline = 'none');
      item.style.outline = '2px solid #007BFF';
    });

    carsList.appendChild(item);
  });

  if (cars.length === 0) {
    carsList.innerHTML = '<p style="color:#999;">No cars in this case yet.</p>';
  }
}

function getCurrentCaseObj() {
  const yearObj = dataJson?.[currentYear];
  if (!yearObj) return null;
  return yearObj.cases?.find(c => c.letter === currentCase) || null;
}

function renderRowEditor() {
  const caseObj = getCurrentCaseObj();
  const cars = caseObj?.cars ?? [];

  if (selectedCarIndex === null || selectedCarIndex < 0 || selectedCarIndex >= cars.length) {
    rowEditor.innerHTML = '<p style="color:#666;">Select a car row to edit.</p>';
    return;
  }

  const car = cars[selectedCarIndex];

  rowEditor.innerHTML = `
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <div style="flex:1 1 200px;">
        <label>Name</label>
        <input id="f_name" class="select-btn" style="width:100%; padding:10px;" value="${escapeHtml(car.name)}" />
      </div>
      <div style="flex:1 1 200px;">
        <label>Image URL (e.g. images/xxx.jpg)</label>
        <input id="f_image" class="select-btn" style="width:100%; padding:10px;" value="${escapeHtml(car.image)}" />
      </div>
      <div style="flex:1 1 120px;">
        <label>HW#</label>
        <input id="f_hw_number" class="select-btn" style="width:100%; padding:10px;" value="${escapeHtml(car.hw_number)}" />
      </div>
      <div style="flex:1 1 200px;">
        <label>Color</label>
        <input id="f_color" class="select-btn" style="width:100%; padding:10px;" value="${escapeHtml(car.color)}" />
      </div>
      <div style="flex:1 1 240px;">
        <label>Series</label>
        <input id="f_series" class="select-btn" style="width:100%; padding:10px;" value="${escapeHtml(car.series)}" />
      </div>
      <div style="flex:1 1 140px;">
        <label>Series #</label>
        <input id="f_series_number" class="select-btn" style="width:100%; padding:10px;" value="${escapeHtml(car.series_number)}" />
      </div>
    </div>

    <div style="margin-top:12px; background:#f8f9fa; padding:10px; border-radius:8px; display:flex; gap:12px; align-items:center;">
      <img id="rowPreview" src="${escapeHtml(car.image)}" style="width:90px; height:60px; object-fit:contain; background:#fff; border:1px solid #eee; border-radius:6px;" />
      <div style="color:#666; font-weight:600;">Click Save Row to update this entry.</div>
    </div>
  `;

  const preview = document.getElementById('rowPreview');
  const imageInput = document.getElementById('f_image');
  imageInput?.addEventListener('input', () => {
    preview.src = imageInput.value;
  });
}

function ensureDataLoaded() {
  if (dataJson) return Promise.resolve();
  return fetch('data.json')
    .then(r => r.json())
    .then(d => { dataJson = d; });
}

function populateYearsCases() {
  yearSelect.innerHTML = '';
  const years = Object.keys(dataJson).sort();
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });

  currentYear = years[years.length - 1] || years[0] || null;
  yearSelect.value = currentYear;

  renderCasesForYear();
}

function renderCasesForYear() {
  caseSelect.innerHTML = '';
  const yearObj = dataJson?.[currentYear];
  const letters = (yearObj?.cases ?? []).map(c => c.letter).filter(Boolean).sort();
  letters.forEach(letter => {
    const opt = document.createElement('option');
    opt.value = letter;
    opt.textContent = letter;
    caseSelect.appendChild(opt);
  });

  currentCase = letters[0] || null;
  caseSelect.value = currentCase;

  selectedCarIndex = null;
  renderCarsList();
  renderRowEditor();
}

async function login() {
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;

  if (user !== LOGIN_USER || pass !== LOGIN_PASS) {
    loginError.textContent = 'Invalid credentials';
    return;
  }

  loginError.textContent = '';
  loginSection.style.display = 'none';
  editorSection.style.display = 'block';

  setAdminStatus('Loading data.json...', false);
  await ensureDataLoaded();
  populateYearsCases();
  setAdminStatus('Ready.', false);
}

loginBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  login().catch(err => {
    loginError.textContent = err?.message || String(err);
  });
});

yearSelect?.addEventListener('change', () => {
  currentYear = yearSelect.value;
  renderCasesForYear();
});

caseSelect?.addEventListener('change', () => {
  currentCase = caseSelect.value;
  selectedCarIndex = null;
  renderCarsList();
  renderRowEditor();
});

addCarBtn?.addEventListener('click', () => {
  const caseObj = getCurrentCaseObj();
  if (!caseObj) return;

  const newCar = {
    name: '',
    image: 'images/images-coming-soon.png',
    hw_number: '',
    color: '',
    series: '',
    series_number: ''
  };

  caseObj.cars = caseObj.cars || [];
  caseObj.cars.push(newCar);
  selectedCarIndex = caseObj.cars.length - 1;
  renderCarsList();
  renderRowEditor();
});

saveRowBtn?.addEventListener('click', () => {
  const caseObj = getCurrentCaseObj();
  if (!caseObj) return;
  const cars = caseObj.cars;
  if (!Array.isArray(cars) || selectedCarIndex === null) return;

  const car = cars[selectedCarIndex];
  car.name = document.getElementById('f_name').value;
  car.image = document.getElementById('f_image').value;
  car.hw_number = document.getElementById('f_hw_number').value;
  car.color = document.getElementById('f_color').value;
  car.series = document.getElementById('f_series').value;
  car.series_number = document.getElementById('f_series_number').value;

  renderCarsList();
});

deleteRowBtn?.addEventListener('click', () => {
  const caseObj = getCurrentCaseObj();
  if (!caseObj) return;
  if (selectedCarIndex === null) return;

  if (!confirm('Delete this car entry?')) return;

  caseObj.cars.splice(selectedCarIndex, 1);
  selectedCarIndex = null;
  renderCarsList();
  renderRowEditor();
});

commitAllBtn?.addEventListener('click', async () => {
  if (!dataJson) return;
  commitMsg.textContent = 'Committing...';
  commitMsg.style.color = '#333';

  try {
    const resp = await fetch(`${serverBaseUrl}/admin/commit-data-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_json: dataJson })
    });

    const body = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new Error(body?.detail || `HTTP ${resp.status}`);
    }

    commitMsg.textContent = 'Committed successfully to GitHub. Reload the website to see changes.';
    commitMsg.style.color = '#2e7d32';
  } catch (err) {
    commitMsg.textContent = 'Commit failed: ' + (err?.message || String(err));
    commitMsg.style.color = '#d32f2f';
  }
});

