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

function toggleGridCategory(catName, clickedBtn, index, totalItems, drawer) {
  const menu = document.getElementById('menu');
  const allBtns = document.querySelectorAll('.grid-btn');

  // A. CLOSE LOGIC: If clicking the button that is already open...
  if (activeCategory === catName) {
    // 1. Start the closing animation
    drawer.classList.remove('open');
    clickedBtn.classList.remove('active');
    activeCategory = null;
    
    // 2. Wait for the CSS transition (0.3s) to finish, then remove from DOM
    setTimeout(() => { 
      if (!activeCategory) drawer.remove(); 
    }, 350);
    return;
  }

  // B. OPEN LOGIC: Switching to a new button...
  
  // 1. Reset UI (Turn off old buttons)
  allBtns.forEach(b => b.classList.remove('active'));
  
  // 2. Activate the new button
  clickedBtn.classList.add('active');
  activeCategory = catName;

  // 3. Fill the drawer with the new text
  renderCategoryContent(catName, drawer);

  // 4. CALCULATE INSERTION POINT
  // We need to put the drawer AFTER the row the user clicked.
  // In a 2-column grid:
  // - If index is EVEN (0, 2, 4) -> It's the Left button -> Insert after Next (Index + 1)
  // - If index is ODD (1, 3, 5)  -> It's the Right button -> Insert after Self (Index)
  
  let targetIndex = (index % 2 === 0) ? index + 1 : index;
  
  // Safety: If we are on the very last item, just use that index
  if (targetIndex >= totalItems) targetIndex = index;

  const referenceNode = allBtns[targetIndex];

  // 5. MOVE THE DRAWER in the DOM
  if (referenceNode && referenceNode.nextSibling) {
    menu.insertBefore(drawer, referenceNode.nextSibling);
  } else {
    menu.appendChild(drawer); // End of list
  }

  // 6. THE "DOUBLE PUMP" (CRITICAL FIX)
  // We must remove the 'open' class first to ensure it starts at 0 height
  drawer.classList.remove('open');
  
  // FORCE BROWSER REFLOW: This line looks useless, but it forces the browser 
  // to acknowledge the drawer is in the DOM *before* we try to animate it.
  void drawer.offsetHeight; 

  // 7. TRIGGER ANIMATION
  drawer.classList.add('open');
}

function renderCategoryContent(catName, container) {
  // 1. Clear previous content
  container.innerHTML = ''; 
  
  // 2. Add the "Close" label
  // This helps the user know they can tap the big button again to close it
  container.innerHTML = `<div style="text-align:right; margin-bottom:15px; color:#64748b; font-size:12px; font-weight:bold; letter-spacing:0.5px;">TAP BUTTON TO CLOSE</div>`;

  const items = rulesData[catName];

  // 3. SAFETY CHECK: If the category has no data in the .md file
  if (!items || items.length === 0) {
    container.innerHTML += `
      <div style="padding:20px; text-align:center; color:#94a3b8; font-style:italic;">
        No data found for this category.
      </div>`;
    return;
  }

  // 4. Render each Rule / Item
  items.forEach(item => {
    const block = document.createElement('div');
    block.style.marginBottom = "25px"; // Spacing between rules
    
    // We use a slight border-left to make it look like a distinct section
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