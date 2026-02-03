let rulesData = {};

async function loadData() {
  // 1. Fetch the raw text file
  const res = await fetch('data/rules.md');
  const text = await res.text();
  
  // 2. Parse Markdown into an object
  rulesData = parseMarkdown(text);
  
  renderMenu();
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  let currentCategory = null;
  let currentTitle = null;
  let data = {}; // Structure: { "Weather": [ {title: "Low Vis", content: "..."} ] }

  lines.forEach(line => {
    const cleanLine = line.trim();
    
    // Detect Category (# Weather)
    if (cleanLine.startsWith('# ')) {
      currentCategory = cleanLine.replace('# ', '').trim();
      data[currentCategory] = [];
    } 
    // Detect Rule Title (## Low Visibility)
    else if (cleanLine.startsWith('## ')) {
      currentTitle = cleanLine.replace('## ', '').trim();
      // Add a placeholder for this rule
      if (currentCategory) {
        data[currentCategory].push({ title: currentTitle, content: '' });
      }
    }
    // Detect Bullet Points (* Do this)
    else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      if (currentCategory && data[currentCategory].length > 0) {
        // Add text to the last rule added
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        lastRule.content += `<li>${cleanLine.substring(2)}</li>`;
      }
    }
  });
  return data;
}

function renderMenu() {
  const menu = document.getElementById('menu');
  menu.innerHTML = '';

  // Loop through the keys (Categories)
  Object.keys(rulesData).forEach(catName => {
    const btn = document.createElement('div');
    btn.className = 'button';
    btn.innerText = catName;
    btn.onclick = () => renderCategory(catName);
    menu.appendChild(btn);
  });
}

function renderCategory(catName) {
  const content = document.getElementById('content');
  // Add a "Back" button functionality if you want, or just clear/header
  content.innerHTML = `<h2>${catName}</h2>`;

  const items = rulesData[catName];
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    // Render the content as a UL list
    card.innerHTML = `
      <strong>${item.title}</strong>
      <ul style="padding-left: 20px; margin-top: 10px;">
        ${item.content}
      </ul>
    `;
    content.appendChild(card);
  });
}

// Init
loadData();