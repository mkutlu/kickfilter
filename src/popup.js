const STORAGE_KEY = 'blockedChannels';
const AUTO_KEY = 'autoBlockRandom';

function norm(u){ return (u||'').trim().toLowerCase(); }

function render(list, auto){
  const area = document.getElementById('list');
  area.value = (list || []).join('\n');
  const count = document.getElementById('count');
  if (count) count.textContent = String((list||[]).length);
  const autoCb = document.getElementById('autoBlock');
  if (autoCb) autoCb.checked = !!auto;
}

function load(){
  chrome.storage.sync.get({[STORAGE_KEY]: [], [AUTO_KEY]: true}, (res) => {
    if (typeof res[AUTO_KEY] === 'undefined') {
      chrome.storage.sync.set({[AUTO_KEY]: true});
      res[AUTO_KEY] = true;
    }
    render(res[STORAGE_KEY] || [], res[AUTO_KEY]);
  });
}

function save(){
  const area = document.getElementById('list');
  const raw = area && area.value ? area.value : '';
  const arr = raw.split(/\r?\n/).map(norm).filter(Boolean);
  const unique = Array.from(new Set(arr));
  const auto = document.getElementById('autoBlock').checked;
  chrome.storage.sync.set({[STORAGE_KEY]: unique, [AUTO_KEY]: auto}, () => {
    const status = document.getElementById('status');
    if (status) { status.textContent = 'Saved ✓'; setTimeout(()=> status.textContent='', 1200); }
    const count = document.getElementById('count');
    if (count) count.textContent = String(unique.length);
  });
}

function refresh(){ load(); }

async function addCurrent(){
  try {
    const tabs = await chrome.tabs.query({active:true, currentWindow:true});
    const t = tabs && tabs[0];
    const status = document.getElementById('status');
    if (!t || !t.url) { if (status) status.textContent = 'Cannot read active tab.'; return; }
    const url = new URL(t.url);
    if (url.hostname !== 'kick.com') { if (status) status.textContent = 'Open a Kick channel tab.'; return; }
    const seg = url.pathname.split('/').filter(Boolean)[0] || '';
    if (!seg) { if (status) status.textContent = 'No channel in URL.'; return; }
    const username = norm(seg);
    const area = document.getElementById('list');
    const current = area.value ? area.value.split(/\r?\n/) : [];
    if (!current.map(norm).includes(username)) {
      current.push(username);
      area.value = current.join('\n');
      const count = document.getElementById('count');
      if (count) count.textContent = String(current.filter(Boolean).length);
      if (status) { status.textContent = 'Added ✓'; setTimeout(()=> status.textContent = '', 1200); }
    } else {
      if (status) { status.textContent = 'Already in list'; setTimeout(()=> status.textContent = '', 1200); }
    }
  } catch (e) {
    const status = document.getElementById('status');
    if (status) status.textContent = 'Failed to add current.';
  }
}

document.getElementById('save').addEventListener('click', save);
document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('addCurrent').addEventListener('click', addCurrent);
document.addEventListener('DOMContentLoaded', load);

document.getElementById('autoBlock').addEventListener('change', (e) => {
  const auto = !!e.target.checked;
  chrome.storage.sync.set({[AUTO_KEY]: auto}, () => {
    try { chrome.tabs.query({active:true, currentWindow:true}, (tabs)=>{ const t=tabs&&tabs[0]; if(t&&t.id) chrome.tabs.sendMessage(t.id,{type:'kick-filter-sweep'}); }); } catch(e){}

    const status = document.getElementById('status');
    if (status) { status.textContent = auto ? 'Auto-block ON' : 'Auto-block OFF'; setTimeout(()=> status.textContent='', 1000); }
  });
});

