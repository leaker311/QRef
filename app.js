let rulesData = {};
let activeCategory = null;

// 1. DATA LOADING
async function loadData() {
  try {
    // Timestamp forces fresh check, Service Worker handles actual caching
    const res = await fetch(`data/rules.md?t=${Date.now()}`);
    if (!res.ok) throw new Error("Network response was not ok");
    
    const text = await res.text();
    rulesData = parseMarkdown(text);
    renderMenu();
  } catch (e) {
    console.error("Could not load rules:", e);
    document.getElementById('menu').innerHTML = `<div style="grid-column:1/-1; color:red; text-align:center;">Error loading data. Check internet.</div>`;
  }
}

// 2. PARSER (Supports Images and Text)
function parseMarkdown(md) {
  const lines = md.split('\n');
  let currentCategory = null;
  let currentTitle = null;
  let data = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine) return; // Skip empty lines

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
      // Catch-all for Images/Paragraphs
      if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        lastRule.content += `<div style="margin-top:10px; margin-bottom:10px;">${cleanLine}</div>`;
      }
    }
  });
  return data;
}

// 3. RENDER MENU (Grid + Hidden Drawer)
function renderMenu() {
  const menu = document.getElementById('menu');
  menu.innerHTML = '';

  // Create the SINGLE shared drawer
  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.id = 'active-drawer';
  
  const categories = Object.keys(rulesData);
  
  categories.forEach((catName, index) => {
    const btn = document.createElement('div');
    btn.className = 'grid-btn';
    btn.innerText = catName;
    
    // Click Handler
    btn.onclick = (e) => {
      e.stopPropagation(); 
      toggleGridCategory(catName, btn, index, categories.length, drawer);
    };

    menu.appendChild(btn);
  });
}

// 4. TOGGLE LOGIC (The "Grid Math")
function toggleGridCategory(catName, clickedBtn, index, totalItems, drawer) {
  const menu = document.getElementById('menu');
  const allBtns = document.querySelectorAll('.grid-btn');

  // A. CLOSE if clicking the same button
  if (activeCategory === catName) {
    drawer.classList.remove('open');
    clickedBtn.classList.remove('active');
    activeCategory = null;
    // Remove drawer from DOM after animation
    setTimeout(() => { if(!activeCategory) drawer.remove(); }, 400);
    return;
  }

  // B. SWITCHING to a new button
  
  // 1. Reset UI
  allBtns.forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
  activeCategory = catName;

  // 2. Fill Content
  renderCategoryContent(catName, drawer);

  // 3. Find Insertion Point (After the current ROW)
  // Even index (0, 2) is Left -> insert after Next (1, 3)
  // Odd index (1, 3) is Right -> insert after Self
  let targetIndex = (index % 2 === 0) ? index + 1 : index;
  
  // If we are at the very last item, just use that
  if (targetIndex >= totalItems) targetIndex = index;

  const referenceNode = allBtns[targetIndex];

  // 4. Insert Drawer
  if (referenceNode && referenceNode.nextSibling) {
    menu.insertBefore(drawer, referenceNode.nextSibling);
  } else {
    menu.appendChild(drawer);
  }

  // 5. Open Animation
  // Small delay ensures the DOM has updated before we animate CSS
  setTimeout(() => { drawer.classList.add('open'); }, 10);
}

// 5. RENDER CONTENT (Inside Drawer)
function renderCategoryContent(catName, container) {
  container.innerHTML = `<div style="text-align:right; margin-bottom:10px; color:#64748b; font-size:12px; font-weight:bold;">TAP BUTTON TO CLOSE</div>`;
  
  const items = rulesData[catName];
  if (items) {
    items.forEach(item => {
      const block = document.createElement('div');
      block.style.marginBottom = "20px";
      block.innerHTML = `
        <strong style="color:var(--highlight); font-size:1.1em; display:block; margin-bottom:5px;">
          ${item.title}
        </strong>
        <div style="padding-left: 10px; border-left: 2px solid var(--highlight); line-height: 1.6;">
          ${item.content}
        </div>
      `;
      container.appendChild(block);
    });
  }
}

// --- SETUP & UTILS ---

// Theme Toggle
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;
const savedTheme = localStorage.getItem('ops-theme');
if (savedTheme === 'light') {
  body.classList.add('light-mode');
  if(themeBtn) themeBtn.innerText = '🌙';
}
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    localStorage.setItem('ops-theme', isLight ? 'light' : 'dark');
    themeBtn.innerText = isLight ? '🌙' : '☀️';
  });
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'UPDATE_AVAILABLE') {
        const toast = document.getElementById('update-toast');
        if(toast) {
          toast.classList.remove('hidden');
          toast.onclick = () => window.location.reload();
        }
      }
    });
  });
}

// Reset Logic
const resetBtn = document.getElementById('reset-btn');
if(resetBtn) {
  resetBtn.addEventListener('click', async () => {
    if (!confirm("Force refresh all data?")) return;
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    const keys = await caches.keys();
    for (const key of keys) await caches.delete(key);
    window.location.reload(true);
  });
}

// Start
loadData();