let rulesData = {};
let activeCategory = null;

async function loadData() {
  try {
    // We use the timestamp ?t= to ensure we always get the latest list from the server
    // logic checks later if it actually matches our cache.
    const res = await fetch(`data/rules.md?t=${Date.now()}`);
    if (!res.ok) throw new Error("Network response was not ok");
    
    const text = await res.text();
    rulesData = parseMarkdown(text);
    renderMenu();
  } catch (e) {
    console.error("Could not load rules:", e);
    // Optional: Show an error card in the menu if data fails completely
    document.getElementById('menu').innerHTML = `<div class="card" style="color:red">Error loading data. Check internet.</div>`;
  }
}
// this works commented out to try images
// function parseMarkdown(md) {
//   const lines = md.split('\n');
//   let currentCategory = null;
//   let currentTitle = null;
//   let data = {};

//   lines.forEach(line => {
//     const cleanLine = line.trim();
//     if (cleanLine.startsWith('# ')) {
//       currentCategory = cleanLine.replace('# ', '').trim();
//       data[currentCategory] = [];
//     } else if (cleanLine.startsWith('## ')) {
//       currentTitle = cleanLine.replace('## ', '').trim();
//       if (currentCategory) {
//         data[currentCategory].push({ title: currentTitle, content: '' });
//       }
//     } else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
//       if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
//         const lastRule = data[currentCategory][data[currentCategory].length - 1];
//         lastRule.content += `<li>${cleanLine.substring(2)}</li>`;
//       }
//     }
//   });
//   return data;
// }
// trying images
function parseMarkdown(md) {
  const lines = md.split('\n');
  let currentCategory = null;
  let currentTitle = null;
  let data = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
    
    // Skip empty lines
    if (!cleanLine) return;

    // 1. Category
    if (cleanLine.startsWith('# ')) {
      currentCategory = cleanLine.replace('# ', '').trim();
      data[currentCategory] = [];
    } 
    // 2. Title
    else if (cleanLine.startsWith('## ')) {
      currentTitle = cleanLine.replace('## ', '').trim();
      if (currentCategory) {
        data[currentCategory].push({ title: currentTitle, content: '' });
      }
    } 
    // 3. Bullet Points
    else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        const text = cleanLine.substring(2);
        lastRule.content += `<li>${text}</li>`;
      }
    }
    // 4. EVERYTHING ELSE (Images, Paragraphs, Notes) <<-- NEW!
    else {
      if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        // Add it as a raw div, not a list item
        lastRule.content += `<div style="margin-top:10px; margin-bottom:10px;">${cleanLine}</div>`;
      }
    }
  });
  return data;
}

function renderMenu() {
  const menu = document.getElementById('menu');
  menu.innerHTML = '';
  Object.keys(rulesData).forEach(catName => {
    const btn = document.createElement('div');
    btn.className = 'button';
    btn.innerText = catName;
    btn.onclick = (e) => { e.stopPropagation(); toggleCategory(catName); };
    menu.appendChild(btn);
  });
}

function toggleCategory(catName) {
  const content = document.getElementById('content');
  if (activeCategory === catName) {
    content.innerHTML = '';
    activeCategory = null;
    return;
  }
  activeCategory = catName;
  renderCategory(catName);
}

function renderCategory(catName) {
  const content = document.getElementById('content');
  content.innerHTML = `<h2 style="text-align:center; color:#94a3b8; margin-bottom:15px;">${catName}</h2>`;
  const items = rulesData[catName];
  if (items) {
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.onclick = (e) => e.stopPropagation();
      card.innerHTML = `<strong style="color:#38bdf8; font-size:1.1em;">${item.title}</strong><ul style="padding-left:20px; margin-top:10px; line-height:1.5;">${item.content}</ul>`;
      content.appendChild(card);
    });
  }
}

document.addEventListener('click', () => {
  if (activeCategory) {
    document.getElementById('content').innerHTML = '';
    activeCategory = null;
  }
});

// SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'UPDATE_AVAILABLE') {
        const toast = document.getElementById('update-toast');
        toast.classList.remove('hidden');
        toast.onclick = () => window.location.reload();
      }
    });
  });
}

// RESET LOGIC (Keeping this for you!)
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!confirm("Force refresh all data?")) return;
  
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) await registration.unregister();
  }
  const keys = await caches.keys();
  for (const key of keys) await caches.delete(key);
  
  window.location.reload(true);
});

// THEME TOGGLE LOGIC
const themeBtn = document.getElementById('theme-toggle');
const body = document.body;

// 1. Check Saved Preference on Load
const savedTheme = localStorage.getItem('ops-theme');
if (savedTheme === 'light') {
  body.classList.add('light-mode');
  themeBtn.innerText = '🌙'; // Switch icon to Moon
}

// 2. Toggle on Click
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    
    // Save preference
    if (body.classList.contains('light-mode')) {
      localStorage.setItem('ops-theme', 'light');
      themeBtn.innerText = '🌙'; // Moon mode available
    } else {
      localStorage.setItem('ops-theme', 'dark');
      themeBtn.innerText = '☀️'; // Sun mode available
    }
  });
}

// ... (Reset Logic)
// ... (Start App)
loadData();