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
      