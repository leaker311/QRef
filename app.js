// GLOBAL ERROR TRAP: Catches syntax errors and prints them to the screen
window.onerror = function(message, source, lineno, colno, error) {
  const debug = document.getElementById('debug-console');
  if (debug) debug.innerText += `\nCRITICAL ERROR: ${message} at line ${lineno}`;
};

// APP VARIABLES
let rulesData = {};
let activeCategory = null;

// MAIN LOADER
async function loadData() {
  const debug = document.getElementById('debug-console');
  try {
    debug.innerText += "\n[1] Fetching rules.md...";
    
    // Add timestamp to FORCE fresh data (Bypass all caches for debugging)
    const res = await fetch(`data/rules.md?t=${Date.now()}`);
    
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    const text = await res.text();
    debug.innerText += `\n[2] Downloaded ${text.length} chars.`;
    
    // Check if we accidentally downloaded a 404 HTML page instead of Markdown
    if (text.includes("<!DOCTYPE html>")) {
      throw new Error("Found HTML instead of Markdown. Check filename.");
    }

    // Parse
    rulesData = parseMarkdown(text);
    const categoryCount = Object.keys(rulesData).length;
    debug.innerText += `\n[3] Parsed ${categoryCount} categories.`;
    
    // Render
    renderMenu();
    debug.innerText += "\n[4] UI Rendered.";
    
    // If successful, hide debug box after 3 seconds
    // setTimeout(() => { debug.style.display = 'none'; }, 3000);

  } catch (e) {
    debug.innerText += `\nERROR: ${e.message}`;
    console.error(e);
  }
}

// PARSER
function parseMarkdown(md) {
  const lines = md.split('\n');
  let currentCategory = null;
  let currentTitle = null;
  let data = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
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
        const text = cleanLine.substring(2);
        lastRule.content += `<li>${text}</li>`;
      }
    }
  });
  return data;
}

// UI RENDERERS
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
  content.innerHTML = `<h2 style="text-align:center; color:#94a3b8;">${catName}</h2>`;
  const items = rulesData[catName];
  if (items) {
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.onclick = (e) => e.stopPropagation();
      card.innerHTML = `<strong style="color:#38bdf8;">${item.title}</strong><ul style="padding-left:20px; margin-top:10px;">${item.content}</ul>`;
      content.appendChild(card);
    });
  }
}

// EVENT LISTENERS
document.addEventListener('click', () => {
  if (activeCategory) {
    document.getElementById('content').innerHTML = '';
    activeCategory = null;
  }
});

// HARD RESET LOGIC
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    if (!confirm("Reset everything?")) return;
    resetBtn.innerText = "Nuking...";
    
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    const keys = await caches.keys();
    for (const key of keys) await caches.delete(key);
    
    window.location.reload(true);
  });
}

// INIT
loadData();