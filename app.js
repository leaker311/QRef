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
    btn.className = 'gr