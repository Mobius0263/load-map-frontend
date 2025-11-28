const API_BASE = "https://load-map.vercel.app/";
let map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const layersContainer = document.getElementById('layers');
const statusEl = document.getElementById('status');
let leafletLayers = {};

function setStatus(msg, isError=false){
  statusEl.textContent = msg;
  statusEl.style.color = isError ? 'red' : '#333';
}

async function fetchLayers(){
  setStatus('Loading layers...');
  try {
    const res = await fetch(`${API_BASE}/geojson`);
    if(!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    renderLayerList(data);
    setStatus(`Loaded ${data.length} layer(s)`);
  } catch(e){
    setStatus(e.message, true);
  }
}

function renderLayerList(items){
  layersContainer.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'layer-item';
    div.textContent = item.id;
    div.onclick = () => toggleLayer(item);
    layersContainer.appendChild(div);
  });
}

function styleByGeometry(geojson){
  return {
    color: '#0077cc',
    weight: 2,
    fillColor: '#4da3ff',
    fillOpacity: 0.3
  };
}

function fitLayer(layer){
  try { map.fitBounds(layer.getBounds(), {padding:[20,20]}); } catch(_) {}
}

function toggleLayer(item){
  if(leafletLayers[item.id]){
    map.removeLayer(leafletLayers[item.id]);
    delete leafletLayers[item.id];
    setStatus(`Removed layer ${item.id}`);
  } else {
    const layer = L.geoJSON(item.data, {style: styleByGeometry(item.data)}).addTo(map);
    leafletLayers[item.id] = layer;
    fitLayer(layer);
    setStatus(`Added layer ${item.id}`);
  }
}

async function uploadFile(){
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if(!file){ setStatus('Select a file first', true); return; }
  const formData = new FormData();
  formData.append('file', file, file.name);
  setStatus('Uploading...');
  try {
    const res = await fetch(`${API_BASE}/geojson/upload`, {method:'POST', body: formData});
    if(!res.ok){
      const err = await res.json().catch(()=>({detail:'Upload failed'}));
      throw new Error(err.detail || 'Upload failed');
    }
    const saved = await res.json();
    setStatus(`Uploaded layer ${saved.id}`);
    await fetchLayers();
    fileInput.value = '';
  } catch(e){
    setStatus(e.message, true);
  }
}

document.getElementById('uploadBtn').onclick = uploadFile;
document.getElementById('refreshBtn').onclick = fetchLayers;

fetchLayers();
