let rulesData = {};
let activeCategory = null;

// ── SERVICE WORKER ────────────────────────────────────────────────────────────
// FIX: Register the SW and attach the message listener BEFORE calling loadData().
// Previously the listener was at the bottom of the file, so if the SW sent
// UPDATE_AVAILABLE before that code ran the message was silently dropped.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
      const toast = document.getElementById('update-toast');
      if (toast) {
        toast.classList.remove('hidden');
        toast.onclick = () => window.location.reload();
      }
    }
  });
}

// ── DATA LOADING ──────────────────────────────────────────────────────────────
async function loadData() {
  try {
    // No cache-buster here — we WANT the SW to serve from cache first.
    const res = await fetch('data/rules.md');
    if (!res.ok) throw new Error('Network response was not ok');

    const text = await res.text();
    rulesData = parseMarkdown(text);
    renderMenu();

    // Ping version.json to trigger the SW's background version check.
    // The SW handles everything; we don't need to do anything with the result.
    checkForUpdates();

  } catch (e) {
    console.error('Could not load rules:', e);
    document.getElementById('menu').innerHTML =
      `<div style="grid-column:1/-1; color:red; text-align:center;">Error loading data. Check internet.</div>`;
  }
}

async function checkForUpdates() {
  try {
    // Fetching version.json triggers the SW's version-compare logic.
    // The SW will postMessage UPDATE_AVAILABLE if a new version exists.
    await fetch('./version.json');
  } catch (e) {
    console.log('Offline, skipping update check.');
  }
}

// ── PARSER (Supports Images and Text) ────────────────────────────────────────
function parseMarkdown(md) {
  const lines = md.split('\n');
  let currentCategory = null;
  let currentTitle = null;
  let data = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    if (cleanLine.startsWith('# ')) {
      currentCategory = cleanLine.replace('# ', '').trim();
      data[currentCategory] = [];
    } else if (cleanLine.startsWith('## ')) {
      currentTitle = cleanLine.replace('## ', '').trim();
      if (currentCategory) {
        data[currentCategory].push({ title: currentTitle, content: '' });
      }
    } else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        lastRule.content += `<li>${cleanLine.substring(2)}</li>`;
      }
    } else {
      if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        lastRule.content += `<div style="margin-top:10px; margin-bottom:10px;">${cleanLine}</div>`;
      }
    }
  });
  return data;
}

// ── RENDER MENU (Grid + Hidden Drawer) ───────────────────────────────────────
function renderMenu() {
  const menu = document.getElementById('menu');
  menu.innerHTML = '';

  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'active-drawer';

  const categories = Object.keys(rulesData);

  categories.forEach((catName, index) => {
    const btn = document.createElement('div');
    btn.className = 'grid-btn';
    btn.innerText = catName;

    btn.onclick = (e) => {
      e.stopPropagation();
      toggleGridCategory(catName, btn, index, categories.length, drawer);
    };

    menu.appendChild(btn);
  });
}

function toggleGridCategory(catName, clickedBtn, index, totalItems, drawer) {
  const menu = document.getElementById('menu');
  const allBtns = document.querySelectorAll('.grid-btn');

  if (activeCategory === catName) {
    drawer.classList.remove('open');
    clickedBtn.classList.remove('active');
    activeCategory = null;
    setTimeout(() => { if (!activeCategory) drawer.remove(); }, 350);
    return;
  }

  allBtns.forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
  activeCategory = catName;

  renderCategoryContent(catName, drawer);

  let targetIndex = (index % 2 === 0) ? index + 1 : index;
  if (targetIndex >= totalItems) targetIndex = index;

  const referenceNode = allBtns[targetIndex];

  if (referenceNode && referenceNode.nextSibling) {
    menu.insertBefore(drawer, referenceNode.nextSibling);
  } else {
    menu.appendChild(drawer);
  }

  drawer.classList.remove('open');
  void drawer.offsetHeight; // force reflow
  drawer.classList.add('open');
}

function renderCategoryContent(catName, container) {
  container.innerHTML = '';
  container.innerHTML =
    `<div style="text-align:right; margin-bottom:15px; color:#64748b; font-size:12px; font-weight:bold; letter-spacing:0.5px;">TAP BUTTON TO CLOSE</div>`;

  const items = rulesData[catName];

  if (!items || items.length === 0) {
    container.innerHTML +=
      `<div style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">No data found for this category.</div>`;
    return;
  }

  items.forEach(item => {
    const block = document.createElement('div');
    block.style.marginBottom = '25px';
    block.innerHTML = `
      <strong style="color:var(--highlight); font-size:1.2em; display:block; margin-bottom:8px;">
        ${item.title}
      </strong>
      <div style="padding-left: 15px; border-left: 3px solid var(--highlight); color: var(--text-main); line-height: 1.6; font-size: 16px;">
        ${item.content}
      </div>
    `;
    container.appendChild(block);
  });
}

// ── THEME TOGGLE ─────────────────────────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;
const savedTheme = localStorage.getItem('ops-theme');
if (savedTheme === 'light') {
  body.classList.add('light-mode');
  if (themeBtn) themeBtn.innerText = '🌙';
}
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    localStorage.setItem('ops-theme', isLight ? 'light' : 'dark');
    themeBtn.innerText = isLight ? '🌙' : '☀️';
  });
}

// ── START ─────────────────────────────────────────────────────────────────────
loadData();
