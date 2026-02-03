let rulesData = {};
let activeCategory = null; // TRACKER: Remembers what is currently open

async function loadData() {
  try {
    const res = await fetch('data/rules.md');
    const text = await res.text();
    rulesData = parseMarkdown(text);
    renderMenu();
  } catch (e) {
    console.error("Could not load rules:", e);
  }
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  let currentCategory = null;
  let currentTitle = null;
  let data = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
    
    // 1. Detect Category (# Weather)
    if (cleanLine.startsWith('# ')) {
      currentCategory = cleanLine.replace('# ', '').trim();
      data[currentCategory] = [];
    } 
    // 2. Detect Rule Title (## Low Visibility)
    else if (cleanLine.startsWith('## ')) {
      currentTitle = cleanLine.replace('## ', '').trim();
      if (currentCategory) {
        data[currentCategory].push({ title: currentTitle, content: '' });
      }
    }
    // 3. Detect Bullet Points (* or -)
    else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
      if (currentCategory && data[currentCategory] && data[currentCategory].length > 0) {
        const lastRule = data[currentCategory][data[currentCategory].length - 1];
        // Clean the bullet characters and wrap in <li>
        const text = cleanLine.substring(2);
        lastRule.content += `<li>${text}</li>`;
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
    
    // ACTION: Add the Click Handler
    btn.onclick = (e) => {
      // STOP propagation: Don't let this click hit the background listener
      e.stopPropagation(); 
      toggleCategory(catName);
    };
    
    menu.appendChild(btn);
  });
}

function toggleCategory(catName) {
  const content = document.getElementById('content');

  // LOGIC: If clicking the SAME button that is already open...
  if (activeCategory === catName) {
    // ...Close it!
    content.innerHTML = '';
    activeCategory = null;
    return;
  }

  // LOGIC: If clicking a NEW button...
  activeCategory = catName; // Update tracker
  renderCategory(catName);  // Show data
}

function renderCategory(catName) {
  const content = document.getElementById('content');
  content.innerHTML = ''; // Clear previous content first

  // Optional: Add a header so they know what they are looking at
  content.innerHTML = `<h2 style="text-align:center; color:#94a3b8; margin-bottom:15px;">${catName}</h2>`;

  const items = rulesData[catName];
  if (items) {
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      
      // Stop clicks inside the card from closing the menu
      card.onclick = (e) => e.stopPropagation();

      card.innerHTML = `
        <strong style="color:#38bdf8; font-size:1.1em;">${item.title}</strong>
        <ul style="padding-left: 20px; margin-top: 10px; line-height: 1.5;">
          ${item.content}
        </ul>
      `;
      content.appendChild(card);
    });
  }
}

// FEATURE: Tap Anywhere Else to Close
document.addEventListener('click', (event) => {
  // If a category is open...
  if (activeCategory) {
    // ...and we clicked the empty background (not a button, handled by stopPropagation above)
    document.getElementById('content').innerHTML = '';
    activeCategory = null;
  }
});

// -------------------------------------------------------
// SERVICE WORKER SETUP (The "Ignition Key")
// -------------------------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 1. Register the Service Worker
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(err => {
        console.log('Service Worker registration failed:', err);
      });
  });

  // 2. Listen for the "New Data" message from the Service Worker
  navigator.serviceWorker.addEventListener('message', event => {
    console.log("Update message received:", event.data);
    if (event.data.type === 'UPDATE_AVAILABLE') {
      showUpdateToast();
    }
  });
}

function showUpdateToast() {
  const toast = document.getElementById('update-toast');
  if (toast) {
    toast.classList.remove('hidden');
    
    // Reload page when clicked to see the new content
    toast.onclick = () => {
      window.location.reload();
    };
  }
}

// Start the app
loadData();