const supabaseClient = window.supabase.createClient(HALKAS_SUPABASE_URL, HALKAS_SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
let currentCoords = null;
let foundLocation = null;
let map;
let locationMarker;
let userMarker;
let routeLayer;
let mapReady = false;

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function scrollToTarget(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelectorAll('[data-scroll]').forEach((button) => {
  button.addEventListener('click', () => scrollToTarget(button.dataset.scroll));
});

function initMap() {
  map = L.map('map', { zoomControl: true }).setView([9.56, 44.06], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  mapReady = true;
  setTimeout(() => map.invalidateSize(), 150);
}

function codeFor() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let value = '';
  bytes.forEach((b) => { value += alphabet[b % alphabet.length]; });
  return `HK-${value}`;
}

function setGpsStatus(title, subtitle, good = false) {
  $('gps-status').textContent = title;
  $('gps-status').style.color = good ? 'var(--success)' : '';
  $('coords').textContent = subtitle;
}

function captureLocation() {
  if (!navigator.geolocation) {
    setGpsStatus('Location unavailable', 'This browser does not support GPS location.');
    toast('Your browser does not support location services.');
    return;
  }
  const btn = $('locate-btn');
  btn.disabled = true;
  btn.textContent = 'Getting your exact location…';
  setGpsStatus('Finding you…', 'Allow location access when your browser asks.');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
      setGpsStatus('Location captured', `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)} · ±${Math.round(currentCoords.accuracy)}m`, true);
      $('create-btn').disabled = false;
      btn.disabled = false;
      btn.textContent = 'Refresh current location ⌖';
      if (mapReady) {
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([currentCoords.lat, currentCoords.lng], { radius: 7, color: '#5da7ff', fillColor: '#fff', fillOpacity: 1, weight: 3 }).addTo(map);
        map.setView([currentCoords.lat, currentCoords.lng], 16);
      }
      toast('Exact location captured.');
    },
    (error) => {
      btn.disabled = false;
      btn.textContent = 'Try location again ⌖';
      setGpsStatus('Could not get location', error.code === 1 ? 'Location permission was denied.' : 'Try again from an open area.');
      toast(error.code === 1 ? 'Please allow location access for Halkas.' : 'Could not get your location.');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function createLocation() {
  if (!currentCoords) return toast('Get your current location first.');
  const button = $('create-btn');
  button.disabled = true;
  button.textContent = 'Creating…';
  let created = null;
  let error = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = codeFor();
    const result = await supabaseClient.rpc('create_location', {
      p_code: code,
      p_latitude: currentCoords.lat,
      p_longitude: currentCoords.lng,
      p_label: $('location-label').value.trim() || null,
      p_note: $('location-note').value.trim() || null
    });
    created = result.data;
    error = result.error;
    if (!error) break;
    if (!String(error.message || '').toLowerCase().includes('duplicate')) break;
  }
  button.disabled = false;
  button.textContent = 'Create Halkas code';
  if (error || !created) {
    console.error(error);
    toast('Could not create the Halkas code.');
    return;
  }
  const row = Array.isArray(created) ? created[0] : created;
  const link = `${window.location.origin}${window.location.pathname}?code=${encodeURIComponent(row.code)}`;
  $('create-result').innerHTML = `
    <span class="panel-kicker">YOUR HALKAS CODE</span>
    <div class="code">${row.code}</div>
    <small style="color:#7c8ea4">Anyone with this code can find the saved location while it is active.</small>
    <div class="result-actions">
      <button class="secondary-btn" id="copy-code">Copy code</button>
      <button class="secondary-btn" id="copy-link">Copy link</button>
      <button class="whatsapp" id="share-whatsapp">Share on WhatsApp</button>
    </div>`;
  $('create-result').classList.remove('hidden');
  $('copy-code').onclick = () => copyText(row.code, 'Code copied.');
  $('copy-link').onclick = () => copyText(link, 'Halkas link copied.');
  $('share-whatsapp').onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Here is my Halkas location: ${link}`)}`, '_blank', 'noopener');
  toast(`Halkas ${row.code} created.`);
}

async function copyText(value, message) {
  try { await navigator.clipboard.writeText(value); toast(message); }
  catch { toast('Copy is not available in this browser.'); }
}

async function findLocation(codeOverride) {
  const code = (codeOverride || $('code-input').value).trim().toUpperCase();
  if (!code) return toast('Enter a Halkas code first.');
  $('code-input').value = code;
  $('find-btn').disabled = true;
  $('find-btn').textContent = '…';
  const { data, error } = await supabaseClient.rpc('lookup_location', { p_code: code });
  $('find-btn').disabled = false;
  $('find-btn').textContent = 'Find';
  if (error || !data?.length) {
    $('find-result').innerHTML = `<strong>Location not found</strong><small>That code may be wrong or expired. Check it and try again.</small>`;
    $('find-result').classList.remove('hidden');
    $('guide-panel').classList.add('hidden');
    toast('No active Halkas location found.');
    return;
  }
  foundLocation = data[0];
  const label = foundLocation.label || 'Halkas location';
  $('find-result').innerHTML = `<strong>${escapeHtml(label)}</strong><small>Code ${escapeHtml(foundLocation.code)} · active until ${new Date(foundLocation.expires_at).toLocaleDateString()}</small>${foundLocation.note ? `<small style="margin-top:8px">${escapeHtml(foundLocation.note)}</small>` : ''}`;
  $('find-result').classList.remove('hidden');
  showFoundLocation();
  $('guide-panel').classList.remove('hidden');
  $('route-result').classList.add('hidden');
  toast('Location found on the map.');
}

function showFoundLocation() {
  if (!mapReady || !foundLocation) return;
  if (locationMarker) map.removeLayer(locationMarker);
  locationMarker = L.circleMarker([foundLocation.latitude, foundLocation.longitude], { radius: 9, color: '#fff', fillColor: '#5da7ff', fillOpacity: 1, weight: 3 }).addTo(map);
  locationMarker.bindPopup(`<b>${escapeHtml(foundLocation.label || 'Halkas location')}</b><br>${escapeHtml(foundLocation.code)}`).openPopup();
  map.setView([foundLocation.latitude, foundLocation.longitude], 16);
  setTimeout(() => map.invalidateSize(), 100);
}

async function guideThere() {
  if (!foundLocation) return;
  const button = $('guide-btn');
  button.disabled = true;
  button.textContent = 'Getting route…';
  if (!navigator.geolocation) {
    button.disabled = false; button.innerHTML = 'Guide Me There <span>↗</span>';
    return toast('Location services are not available.');
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    const start = [position.coords.longitude, position.coords.latitude];
    const end = [foundLocation.longitude, foundLocation.latitude];
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.join(',')};${end.join(',')}?overview=full&geometries=geojson&steps=false`;
      const response = await fetch(url);
      const payload = await response.json();
      if (!payload.routes?.length) throw new Error('No route');
      const route = payload.routes[0];
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([position.coords.latitude, position.coords.longitude], { radius: 7, color: '#5da7ff', fillColor: '#fff', fillOpacity: 1, weight: 3 }).addTo(map);
      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(route.geometry, { style: { color: '#5da7ff', weight: 6, opacity: .9 } }).addTo(map);
      map.fitBounds(routeLayer.getBounds(), { padding: [35, 35] });
      const km = (route.distance / 1000).toFixed(1);
      const mins = Math.max(1, Math.round(route.duration / 60));
      $('route-result').textContent = `Route ready · ${km} km · about ${mins} min by road. The route is drawn directly on the Halkas map.`;
      $('route-result').classList.remove('hidden');
      $('guide-copy').textContent = 'Your current position is the starting point. Follow the route drawn on the map.';
      toast('Route calculated.');
    } catch (err) {
      console.error(err);
      toast('Could not calculate a route right now.');
    } finally {
      button.disabled = false; button.innerHTML = 'Guide Me There <span>↗</span>';
    }
  }, (error) => {
    button.disabled = false; button.innerHTML = 'Guide Me There <span>↗</span>';
    toast(error.code === 1 ? 'Allow location access so Halkas knows where you are.' : 'Could not get your current position.');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));
}

$('locate-btn').addEventListener('click', captureLocation);
$('create-btn').addEventListener('click', createLocation);
$('find-btn').addEventListener('click', () => findLocation());
$('guide-btn').addEventListener('click', guideThere);
$('code-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') findLocation(); });
$('year').textContent = new Date().getFullYear();

initMap();
const sharedCode = new URLSearchParams(window.location.search).get('code');
if (sharedCode) {
  $('code-input').value = sharedCode.toUpperCase();
  setTimeout(() => { scrollToTarget('#find'); findLocation(sharedCode); }, 250);
}
