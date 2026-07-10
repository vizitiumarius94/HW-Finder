(() => {
  // =====================
  // WARNING (client-side only)
  // =====================
  // This "login" is only to hide the UI. Anyone can bypass it by editing JS.
  // Since you asked for the first download-based version, we keep it simple.

  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin';

  const STORAGE_KEY = 'adminCarsDraftSession';

  const loginView = document.getElementById('loginView');
  const adminView = document.getElementById('adminView');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  const yearSelect = document.getElementById('yearSelect');
  const caseSelect = document.getElementById('caseSelect');
  const caseSearch = document.getElementById('caseSearch');

  const thSelect = document.getElementById('thSelect');
  const sthSelect = document.getElementById('sthSelect');
  const thPreview = document.getElementById('thPreview');
  const sthPreview = document.getElementById('sthPreview');
  const thSthSave = document.getElementById('thSthSave');

  const carsList = document.getElementById('carsList');
  const addCarBtn = document.getElementById('addCarBtn');
  const exportBtnAdmin = document.getElementById('exportBtnAdmin');

  // Draft state
  let originalData = null;
  let draftData = null;

  let currentYear = '';
  let currentCaseLetter = '';

  // =====================
  // Helpers
  // =====================
  function setLoggedIn(loggedIn) {
    if (loggedIn) {
      loginView.style.display = 'none';
      adminView.style.display = 'block';
    } else {
      loginView.style.display = 'block';
      adminView.style.display = 'none';
    }
  }

  function isLoggedIn() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function showLoginError(msg) {
    loginError.style.display = 'block';
    loginError.textContent = msg;
  }

  function clearLoginError() {
    loginError.style.display = 'none';
    loginError.textContent = '';
  }

  function getCaseObject() {
    if (!draftData || !currentYear || !currentCaseLetter) return null;
    const yearObj = draftData[currentYear];
    if (!yearObj || !Array.isArray(yearObj.cases)) return null;
    return yearObj.cases.find(c => c && c.letter === currentCaseLetter) || null;
  }

  function ensureThSthShape(caseObj) {
    if (!caseObj.th || typeof caseObj.th !== 'object') caseObj.th = { name: '', image: '' };
    if (!caseObj.sth || typeof caseObj.sth !== 'object') caseObj.sth = { name: '', image: '' };
  }

  function getAllCarsInCase(caseObj) {
    if (!caseObj || !Array.isArray(caseObj.cars)) return [];
    return caseObj.cars;
  }

  function normalizeText(v) {
    return String(v ?? '').toLowerCase().trim();
  }

  function renderThSthSelects() {
    const caseObj = getCaseObject();
    if (!caseObj) return;

    ensureThSthShape(caseObj);

    const cars = getAllCarsInCase(caseObj);
    const options = cars.map((car, idx) => {
      const label = `${car.name || 'N/A'} (${car.color || 'N/A'})`;
      return { label, carIndex: idx };
    });

    // Deduplicate by (name+color)
    const seen = new Set();
    const deduped = [];
    options.forEach(o => {
      if (seen.has(o.label)) return;
      seen.add(o.label);
      deduped.push(o);
    });

    const thCurrentLabel = caseObj.th?.name
      ? `${caseObj.th.name} (${caseObj.th.color || 'N/A'})`
      : '';

    const sthCurrentLabel = caseObj.sth?.name
      ? `${caseObj.sth.name} (${caseObj.sth.color || 'N/A'})`
      : '';

    thSelect.innerHTML = '';
    sthSelect.innerHTML = '';

    const noneOpt1 = document.createElement('option');
    noneOpt1.value = '';
    noneOpt1.textContent = '(none)';
    thSelect.appendChild(noneOpt1);

    const noneOpt2 = document.createElement('option');
    noneOpt2.value = '';
    noneOpt2.textContent = '(none)';
    sthSelect.appendChild(noneOpt2);

    deduped.forEach(o => {
      const optTh = document.createElement('option');
      optTh.value = o.carIndex;
      optTh.textContent = o.label;
      thSelect.appendChild(optTh);

      const optS = document.createElement('option');
      optS.value = o.carIndex;
      optS.textContent = o.label;
      sthSelect.appendChild(optS);
    });

    // Better mapping for current: by name+color from car list
    function findCurrentIndex(target) {
      if (!target?.name) return '';
      const name = target.name;
      const image = target.image;
      const byImage = cars.findIndex(c => c.image === image);
      if (byImage !== -1) return String(byImage);
      const byName = cars.findIndex(c => c.name === name);
      if (byName !== -1) return String(byName);
      return '';
    }

    thSelect.value = String(findCurrentIndex(caseObj.th)) || '';
    sthSelect.value = String(findCurrentIndex(caseObj.sth)) || '';

    // Preview
    function updatePreview(which, selectEl, previewEl) {
      const idx = parseInt(selectEl.value, 10);
      if (Number.isFinite(idx) && idx >= 0) {
        const car = cars[idx];
        previewEl.src = car?.image || 'images/images-coming-soon.png';
      } else {
        previewEl.src = 'images/images-coming-soon.png';
      }
    }

    thSelect.onchange = () => updatePreview('th', thSelect, thPreview);
    sthSelect.onchange = () => updatePreview('sth', sthSelect, sthPreview);

    updatePreview('th', thSelect, thPreview);
    updatePreview('sth', sthSelect, sthPreview);
  }

  function makeCarRowUI(car, idx, iid) {
    const row = document.createElement('div');
    row.style.background = '#fff';
    row.style.border = '1px solid #ddd';
    row.style.borderRadius = '10px';
    row.style.padding = '12px';

    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.justifyContent = 'space-between';
    title.style.gap = '10px';

    const left = document.createElement('div');
    left.innerHTML = `<strong>Car ${idx + 1}</strong>`;

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️ Delete';
    delBtn.style.background = '#dc3545';
    delBtn.style.color = '#fff';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '8px';
    delBtn.style.padding = '8px 12px';

    title.appendChild(left);
    title.appendChild(delBtn);

    const img = document.createElement('img');
    img.src = car.image || 'images/images-coming-soon.png';
    img.alt = car.name || 'car image';
    img.style.width = '140px';
    img.style.height = '70px';
    img.style.objectFit = 'contain';
    img.style.border = '1px solid #eee';
    img.style.borderRadius = '8px';
    img.style.background = '#fafafa';

    const formGrid = document.createElement('div');
    formGrid.style.display = 'grid';
    formGrid.style.gridTemplateColumns = '180px 1fr';
    formGrid.style.gap = '10px 14px';
    formGrid.style.marginTop = '10px';

    // Image picker
    const imgPicker = document.createElement('div');
    imgPicker.style.display = 'flex';
    imgPicker.style.flexDirection = 'column';
    imgPicker.style.gap = '8px';
    imgPicker.appendChild(img);

    const imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/*';

    const imgSetBtn = document.createElement('button');
    imgSetBtn.type = 'button';
    imgSetBtn.textContent = '📸 Use selected file (local draft)';
    imgSetBtn.className = 'action-btn';
    imgSetBtn.style.marginRight = '0';
    imgSetBtn.style.width = '100%';

    imgPicker.appendChild(imgInput);
    imgPicker.appendChild(imgSetBtn);

    formGrid.appendChild(imgPicker);

    const fields = document.createElement('div');
    fields.style.display = 'flex';
    fields.style.flexDirection = 'column';
    fields.style.gap = '10px';

    function mkField(label, value, id) {
      const wrap = document.createElement('label');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '6px';
      wrap.style.fontWeight = '700';
      wrap.innerHTML = `${label}<input id="${id}" type="text" value="${escapeHtml(value)}" style="padding:10px; border:1px solid #ccc; border-radius:8px;" />`;
      return wrap;
    }

    const nameId = `${iid}-name`;
    const hwId = `${iid}-hw`;
    const colorId = `${iid}-color`;
    const seriesId = `${iid}-series`;
    const seriesNumId = `${iid}-sernum`;

    fields.appendChild(mkField('Name', car.name || '', nameId));
    fields.appendChild(mkField('HW#', car.hw_number || '', hwId));
    fields.appendChild(mkField('Color', car.color || '', colorId));
    fields.appendChild(mkField('Series', car.series || '', seriesId));
    fields.appendChild(mkField('Series #', car.series_number || '', seriesNumId));

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = '✅ Update car';
    saveBtn.className = 'action-btn';
    saveBtn.style.marginRight = '0';
    saveBtn.style.width = 'fit-content';

    fields.appendChild(saveBtn);

    formGrid.appendChild(fields);

    row.appendChild(title);
    row.appendChild(formGrid);

    delBtn.onclick = () => {
      const caseObj = getCaseObject();
      if (!caseObj) return;
      caseObj.cars.splice(idx, 1);
      persistAndRerender();
    };

    saveBtn.onclick = () => {
      const caseObj = getCaseObject();
      if (!caseObj) return;
      const target = caseObj.cars[idx];
      if (!target) return;
      target.name = document.getElementById(nameId).value.trim();
      target.hw_number = document.getElementById(hwId).value.trim();
      target.color = document.getElementById(colorId).value.trim();
      target.series = document.getElementById(seriesId).value.trim();
      target.series_number = document.getElementById(seriesNumId).value.trim();
      // car.image is only set when image file chosen
      persistAndRerender();
    };

    imgSetBtn.onclick = async () => {
      const file = imgInput.files && imgInput.files[0];
      if (!file) {
        alert('Pick an image file first');
        return;
      }
      // Draft keeps image as object URL (works until reload)
      // If you want a permanent images/ path, you must upload/copy images manually.
      const url = URL.createObjectURL(file);
      img.src = url;

      const caseObj = getCaseObject();
      if (!caseObj) return;
      const target = caseObj.cars[idx];
      if (!target) return;
      target.image = url;

      // Also keep previews in sync (TH/STH)
      renderThSthSelects();
    };

    return row;
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  }

  function persistAndRerender() {
    // Store draft in session for the current tab
    try {
      sessionStorage.setItem(STORAGE_KEY + ':draft', JSON.stringify(draftData));
    } catch {
      // ignore
    }
    renderCars();
  }

  function renderCars() {
    carsList.innerHTML = '';
    const caseObj = getCaseObject();
    if (!caseObj) return;

    const cars = getAllCarsInCase(caseObj);
    const q = normalizeText(caseSearch.value);

    const filtered = q
      ? cars.filter(car => {
          return (
            normalizeText(car.name).includes(q) ||
            normalizeText(car.hw_number).includes(q) ||
            normalizeText(car.color).includes(q) ||
            normalizeText(car.series).includes(q) ||
            normalizeText(car.series_number).includes(q)
          );
        })
      : cars;

    filtered.forEach((car, fIdx) => {
      // fIdx is filtered index; map back to real idx
      const realIdx = cars.indexOf(car);
      const iid = `car-${currentYear}-${currentCaseLetter}-${realIdx}`;
      const row = makeCarRowUI(car, realIdx, iid);
      carsList.appendChild(row);
    });

    // TH/STH dropdowns reflect cars list
    renderThSthSelects();
  }

  function updateThSthFromSelections() {
    const caseObj = getCaseObject();
    if (!caseObj) return;
    ensureThSthShape(caseObj);

    const cars = getAllCarsInCase(caseObj);

    const thIdx = thSelect.value === '' ? -1 : parseInt(thSelect.value, 10);
    const sthIdx = sthSelect.value === '' ? -1 : parseInt(sthSelect.value, 10);

    if (thIdx >= 0 && cars[thIdx]) {
      caseObj.th.name = cars[thIdx].name || '';
      caseObj.th.image = cars[thIdx].image || '';
      // Some data.json variants don't store color in th/sth. We'll keep only name+image.
      // If you also want color stored, it is safe to add: caseObj.th.color = cars[thIdx].color
    } else {
      caseObj.th.name = '';
      caseObj.th.image = '';
    }

    if (sthIdx >= 0 && cars[sthIdx]) {
      caseObj.sth.name = cars[sthIdx].name || '';
      caseObj.sth.image = cars[sthIdx].image || '';
    } else {
      caseObj.sth.name = '';
      caseObj.sth.image = '';
    }

    persistAndRerender();
  }

  function downloadObject(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =====================
  // Init
  // =====================
  loginBtn.addEventListener('click', () => {
    clearLoginError();
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;

    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // ignore
      }
      setLoggedIn(true);
      initData();
    } else {
      showLoginError('Wrong username/password');
    }
  });

  yearSelect.addEventListener('change', () => {
    currentYear = yearSelect.value;
    currentCaseLetter = '';
    caseSelect.innerHTML = '';
    if (!draftData || !currentYear) return;

    const yearObj = draftData[currentYear];
    const cases = Array.isArray(yearObj?.cases) ? yearObj.cases.map(c => c.letter).filter(Boolean) : [];
    cases.sort();

    caseSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select case';
    caseSelect.appendChild(placeholder);

    cases.forEach(letter => {
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      caseSelect.appendChild(opt);
    });

    carsList.innerHTML = '';
    thSelect.innerHTML = '';
    sthSelect.innerHTML = '';
    thPreview.src = 'images/images-coming-soon.png';
    sthPreview.src = 'images/images-coming-soon.png';
  });

  caseSelect.addEventListener('change', () => {
    currentCaseLetter = caseSelect.value;
    renderCars();
  });

  caseSearch.addEventListener('input', () => {
    renderCars();
  });

  thSthSave.addEventListener('click', () => {
    updateThSthFromSelections();
  });

  addCarBtn.addEventListener('click', () => {
    const caseObj = getCaseObject();
    if (!caseObj) return;
    ensureThSthShape(caseObj);
    if (!Array.isArray(caseObj.cars)) caseObj.cars = [];

    caseObj.cars.push({
      name: 'New Car',
      image: 'images/images-coming-soon.png',
      hw_number: '',
      color: '',
      series: '',
      series_number: ''
    });

    persistAndRerender();
  });

  exportBtnAdmin.addEventListener('click', () => {
    if (!draftData) return;
    downloadObject(draftData, 'data.json');
  });

  async function initData() {
    if (draftData) return;

    // If there is a draft in session, use it; else load original data.json
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY + ':draft');
      if (raw) {
        draftData = JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    if (!draftData) {
      const res = await fetch('data.json');
      originalData = await res.json();
      draftData = structuredClone(originalData);
    }

    // populate years
    const years = Object.keys(draftData || {}).sort();
    yearSelect.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });

    // default to latest year
    currentYear = years[years.length - 1] || '';
    yearSelect.value = currentYear;

    // trigger cases load manually
    const yearObj = draftData[currentYear];
    const cases = Array.isArray(yearObj?.cases) ? yearObj.cases.map(c => c.letter).filter(Boolean) : [];
    cases.sort();

    caseSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select case';
    caseSelect.appendChild(placeholder);

    cases.forEach(letter => {
      const opt = document.createElement('option');
      opt.value = letter;
      opt.textContent = letter;
      caseSelect.appendChild(opt);
    });

    currentCaseLetter = cases[0] || '';
    caseSelect.value = currentCaseLetter;

    renderCars();
  }

  // Initial login gate
  if (isLoggedIn()) {
    setLoggedIn(true);
    initData();
  } else {
    setLoggedIn(false);
  }

  // Ensure admin button doesn't break nav.js
  const adminPageBtn = document.getElementById('adminPageBtn');
  if (adminPageBtn) {
    adminPageBtn.addEventListener('click', () => {
      // stay
    });
  }
})();

