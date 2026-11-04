import { db, auth } from './firebase-client.js';
import { addDoc, collection, doc, GeoPoint, getDocs, query, Timestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { fieldReader, readText } from './firestore-fields.js';
import { clearMediaPreview, isVideoMedia, resolveMediaUrl, showMediaPreview, uploadMediaFile, validateMediaFile } from './media-storage.js?v=hostinger-media-20261103';

const markerColors = { visitado: '#52621c', favorito: '#bd8713', pendiente: '#8c8e82' };
const form = document.querySelector('#place-form');
const editor = document.querySelector('#place-editor');
const access = document.querySelector('#place-access');
const message = document.querySelector('#place-message');
const addPlaceToggle = document.querySelector('#add-place-toggle');
const locationSearch = document.querySelector('#place-search');
const locationSearchButton = document.querySelector('#place-search-button');
const locationStatus = document.querySelector('#place-search-status');
const locationResults = document.querySelector('#place-location-results');
const mediaInput = document.querySelector('#place-media-input');
const mediaPreview = document.querySelector('#place-media-preview');
const mediaStatus = document.querySelector('#place-media-status');
const notice = document.querySelector('#place-notice');
const noticeTitle = document.querySelector('#place-notice-title');
const noticeMessage = document.querySelector('#place-notice-message');
const noticeIcon = document.querySelector('#place-notice-icon');
const noticeCache = new Map();
const placeList = document.querySelector('#place-list');
const geocodingEndpoint = 'https://nominatim.openstreetmap.org/search';
let isAdmin = false;
let chosenMarker;
let selectedLocation = null;
let lastGeocodingRequest = 0;
let savedPlaces = [];
let selectedMediaFile = null;
const placeMarkers = new Map();
let editingPlaceId = null;

const map = L.map('real-map', { scrollWheelZoom: false }).setView([3.8, -74.4], 6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
}).addTo(map);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}
function formatDate(timestamp) {
  return timestamp?.toDate ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(timestamp.toDate()) : 'Sin fecha';
}
function resolvePlaceImage(path) {
  const source = String(path || '').trim();
  if (!source) return '';
  if (/^(https?:)?\/\//i.test(source) || source.startsWith('/')) return source;
  return `../assets/${source.replace(/^\.?\/*/, '').replace(/^assets\//i, '')}`;
}
function mapDocument(document) {
  const data = document.data();
  const field = fieldReader(data);
  const point = field('ubicacion');
  if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') return null;
  const date = field('fecha', null);
  return {
    id: document.id,
    name: readText(field, 'nombre', 'Lugar sin nombre'),
    coordinates: [point.latitude, point.longitude],
    status: readText(field, 'estado', 'Pendiente').toLowerCase(),
    date: formatDate(date),
    dateSort: date?.toDate ? date.toDate().getTime() : Number.POSITIVE_INFINITY,
    description: readText(field, 'descripcion'),
    image: readText(field, 'imagen')
  };
}
function addMarker(place) {
  const color = markerColors[place.status] || markerColors.pendiente;
  const icon = L.divIcon({ className: 'memory-marker-wrapper', html: `<span class="memory-marker" style="--marker-color:${color}" aria-hidden="true"><b>♥</b></span>`, iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -30] });
  const mediaMarkup = place.image
    ? `<div class="map-popup__media" data-media-path="${escapeHtml(place.image)}"><div class="map-popup__image-placeholder">Cargando foto o video…</div></div>`
    : '<div class="map-popup__image-placeholder">Este lugar no tiene una imagen guardada.</div>';
  const coordinates = `${place.coordinates[0].toFixed(5)}, ${place.coordinates[1].toFixed(5)}`;
  const popup = `<article class="map-popup">${mediaMarkup}<p class="map-popup__status">${escapeHtml(place.status)}</p><h2>${escapeHtml(place.name)}</h2><dl class="map-popup__data"><div><dt>Fecha</dt><dd>${escapeHtml(place.date)}</dd></div><div><dt>Coordenadas</dt><dd>${escapeHtml(coordinates)}</dd></div><div><dt>Descripción</dt><dd>${escapeHtml(place.description || 'Sin descripción')}</dd></div></dl><a href="album.html">Ver el álbum</a></article>`;
  const marker = L.marker(place.coordinates, { icon, title: place.name }).addTo(map).bindPopup(popup);
  marker.on('popupopen', async ({ popup: openedPopup }) => {
    const mediaContainer = openedPopup.getElement()?.querySelector('.map-popup__media');
    if (!mediaContainer || mediaContainer.dataset.loaded === 'true') return;
    mediaContainer.dataset.loaded = 'true';
    try {
      const source = await resolveMediaUrl(mediaContainer.dataset.mediaPath);
      const media = document.createElement(isVideoMedia(mediaContainer.dataset.mediaPath) ? 'video' : 'img');
      media.className = isVideoMedia(mediaContainer.dataset.mediaPath) ? 'map-popup__video' : 'map-popup__image';
      if (media instanceof HTMLVideoElement) {
        media.controls = true;
        media.playsInline = true;
        media.preload = 'metadata';
      } else {
        media.alt = `Recuerdo de ${place.name}`;
        media.loading = 'lazy';
      }
      media.src = source;
      media.addEventListener('error', () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'map-popup__image-placeholder';
        placeholder.textContent = 'No se pudo mostrar el archivo de este lugar.';
        mediaContainer.replaceChildren(placeholder);
      }, { once: true });
      mediaContainer.replaceChildren(media);
    } catch (error) {
      console.warn('No se pudo mostrar el archivo del lugar.', error);
      mediaContainer.replaceChildren(Object.assign(document.createElement('div'), {
        className: 'map-popup__image-placeholder',
        textContent: 'No se pudo mostrar el archivo de este lugar.'
      }));
    }
  });
  if (place.id) placeMarkers.set(place.id, marker);
  return marker;
}
function renderPlaceList(places, message = '') {
  placeList.replaceChildren();
  if (!places.length) {
    const item = document.createElement('li');
    item.className = 'place-list__empty';
    item.textContent = message || 'Todavía no hay lugares guardados. Cuando agregues uno, aparecerá aquí.';
    placeList.append(item);
    return;
  }
  for (const place of places) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'place-list__button';
    button.setAttribute('aria-label', `Mostrar ${place.name} en el mapa`);
    const name = document.createElement('strong');
    name.textContent = place.name;
    const detail = document.createElement('span');
    detail.textContent = `${place.status} · ${place.date}`;
    button.append(name, detail);
    button.addEventListener('click', () => showPlaceOnMap(place.id));
    item.append(button);
    if (isAdmin) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'place-list__edit';
      edit.setAttribute('aria-label', `Editar ${place.name}`);
      edit.title = `Editar ${place.name}`;
      const pencil = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      pencil.setAttribute('viewBox', '0 0 24 24');
      pencil.setAttribute('fill', 'none');
      pencil.setAttribute('stroke', 'currentColor');
      pencil.setAttribute('stroke-width', '1.8');
      pencil.setAttribute('stroke-linecap', 'round');
      pencil.setAttribute('stroke-linejoin', 'round');
      pencil.setAttribute('aria-hidden', 'true');
      pencil.innerHTML = '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>';
      edit.append(pencil);
      edit.addEventListener('click', () => beginEditPlace(place));
      item.append(edit);
      item.classList.add('place-list__item--editable');
    }
    placeList.append(item);
  }
}

function showPlaceOnMap(id) {
  const marker = placeMarkers.get(id);
  if (!marker) return;
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 13));
  marker.openPopup();
}

function updatePlaceCounts(places) {
  const counts = { visitado: 0, favorito: 0, pendiente: 0 };
  places.forEach(({ status }) => {
    if (Object.hasOwn(counts, status)) counts[status] += 1;
  });
  const labels = { visitado: 'visitados', favorito: 'favoritos', pendiente: 'pendientes' };
  Object.entries(counts).forEach(([status, count]) => {
    const counter = document.getElementById(`place-count-${status}`);
    if (!counter) return;
    counter.textContent = String(count);
    counter.setAttribute('aria-label', `${count} ${labels[status]}`);
  });
}

function displayPlaces() {
  savedPlaces.sort((first, second) => first.dateSort - second.dateSort || first.name.localeCompare(second.name, 'es'));
  updatePlaceCounts(savedPlaces);
  placeMarkers.forEach((marker) => marker.remove());
  placeMarkers.clear();
  const markers = savedPlaces.map(addMarker);
  renderPlaceList(savedPlaces);
  if (markers.length > 1) map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [42, 42], maxZoom: 11 });
  else if (markers.length === 1) map.setView(markers[0].getLatLng(), 12);
}

function localDateTimeValue(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resetPlaceForm() {
  form.reset();
  setMessage('');
  selectedMediaFile = null;
  clearMediaPreview(mediaPreview);
  mediaStatus.textContent = '';
  editingPlaceId = null;
  selectedLocation = null;
  if (chosenMarker) { chosenMarker.remove(); chosenMarker = undefined; }
  locationStatus.textContent = '';
  locationResults.replaceChildren();
  locationResults.hidden = true;
  form.querySelector('[type="submit"]').textContent = 'Guardar lugar';
  addPlaceToggle.textContent = 'Agregar nuevo lugar';
}

async function beginEditPlace(place) {
  resetPlaceForm();
  editingPlaceId = place.id;
  form.hidden = false;
  addPlaceToggle.setAttribute('aria-expanded', 'true');
  addPlaceToggle.textContent = 'Cancelar edición';
  form.elements.nombre.value = place.name;
  form.elements.estado.value = place.status.charAt(0).toUpperCase() + place.status.slice(1);
  form.elements.fecha.value = place.dateSort === Number.POSITIVE_INFINITY
    ? ''
    : localDateTimeValue(new Date(place.dateSort));
  form.elements.descripcion.value = place.description;
  form.elements.imagen.value = place.image;
  selectedMediaFile = null;
  mediaInput.value = '';
  mediaStatus.textContent = place.image ? 'Archivo actual. Elige otro solo si quieres reemplazarlo.' : 'Selecciona una imagen o video para este lugar.';
  await showMediaPreview(mediaPreview, { path: place.image, alt: `Archivo de ${place.name}` });
  form.elements.latitud.value = place.coordinates[0];
  form.elements.longitud.value = place.coordinates[1];
  locationSearch.value = `${place.coordinates[0].toFixed(5)}, ${place.coordinates[1].toFixed(5)}`;
  selectedLocation = { lat: place.coordinates[0], lng: place.coordinates[1], label: locationSearch.value };
  locationStatus.textContent = 'Ubicación actual. Busca otra si quieres cambiarla.';
  chosenMarker = L.marker(place.coordinates).addTo(map);
  map.setView(place.coordinates, Math.max(map.getZoom(), 14));
  form.querySelector('[type="submit"]').textContent = 'Guardar cambios';
  form.elements.nombre.focus();
}
async function loadPlaces() {
  try {
    const snapshot = await getDocs(collection(db, 'Ubicaciones'));
    savedPlaces = snapshot.docs.map(mapDocument).filter(Boolean);
    displayPlaces();
  } catch (error) {
    console.warn('No se pudo cargar Ubicaciones desde Firestore.', error);
    updatePlaceCounts([]);
    renderPlaceList([], 'No pudimos cargar los lugares. Revisa la conexión y vuelve a intentarlo.');
  }
}
function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `place-editor__message ${type}`;
}

function showNotice(title, text, type = 'success') {
  noticeTitle.textContent = title;
  noticeMessage.textContent = text;
  noticeIcon.textContent = type === 'success' ? '✓' : '!';
  notice.dataset.type = type;
  notice.showModal();
}

document.querySelector('#place-notice-close').addEventListener('click', () => notice.close());
notice.addEventListener('click', (event) => {
  if (event.target === notice) notice.close();
});

function selectLocation(place) {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  selectedLocation = { lat, lng, label: place.display_name };
  form.latitud.value = lat;
  form.longitud.value = lng;
  locationSearch.value = place.display_name;
  locationStatus.textContent = `Ubicación seleccionada · ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  locationResults.replaceChildren();
  locationResults.hidden = true;
  if (chosenMarker) chosenMarker.remove();
  chosenMarker = L.marker([lat, lng]).addTo(map);
  map.setView([lat, lng], Math.max(map.getZoom(), 14));
}

function renderLocationResults(places) {
  locationResults.replaceChildren();
  for (const place of places) {
    const item = document.createElement('li');
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.textContent = place.display_name;
    choice.addEventListener('click', () => selectLocation(place));
    item.append(choice);
    locationResults.append(item);
  }
  locationResults.hidden = places.length === 0;
}

locationSearch.addEventListener('input', () => {
  selectedLocation = null;
  form.latitud.value = '';
  form.longitud.value = '';
  locationStatus.textContent = '';
  locationResults.replaceChildren();
  locationResults.hidden = true;
  if (chosenMarker) { chosenMarker.remove(); chosenMarker = undefined; }
});

locationSearchButton.addEventListener('click', async () => {
  const search = locationSearch.value.trim();
  if (search.length < 3) {
    locationStatus.textContent = 'Escribe al menos tres caracteres para buscar.';
    locationSearch.focus();
    return;
  }
  const cacheKey = search.toLocaleLowerCase('es-CO');
  locationSearchButton.disabled = true;
  locationSearchButton.textContent = 'Buscando…';
  locationStatus.textContent = 'Buscando lugares en el mapa…';
  try {
    let places = noticeCache.get(cacheKey);
    if (!places) {
      const wait = Math.max(0, 1000 - (performance.now() - lastGeocodingRequest));
      if (lastGeocodingRequest) await new Promise((resolve) => setTimeout(resolve, wait));
      const url = new URL(geocodingEndpoint);
      url.searchParams.set('q', search);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '5');
      url.searchParams.set('accept-language', 'es');
      lastGeocodingRequest = performance.now();
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
      places = await response.json();
      noticeCache.set(cacheKey, places);
    }
    renderLocationResults(places);
    locationStatus.textContent = places.length
      ? `Encontramos ${places.length} resultado${places.length === 1 ? '' : 's'}. Selecciona el lugar correcto.`
      : 'No encontramos coincidencias. Prueba con otro nombre o agrega la ciudad.';
  } catch (error) {
    console.error('No se pudo buscar la ubicación.', error);
    locationStatus.textContent = 'No pudimos consultar el mapa. Revisa tu conexión e inténtalo de nuevo.';
  } finally {
    locationSearchButton.disabled = false;
    locationSearchButton.textContent = 'Buscar';
  }
});

addPlaceToggle.addEventListener('click', () => {
  const open = form.hidden;
  if (open) {
    resetPlaceForm();
    form.hidden = false;
    addPlaceToggle.setAttribute('aria-expanded', 'true');
    form.elements.nombre.focus();
  } else {
    resetPlaceForm();
    form.hidden = true;
    addPlaceToggle.setAttribute('aria-expanded', 'false');
  }
});

mediaInput.addEventListener('change', async () => {
  const file = mediaInput.files?.[0] || null;
  selectedMediaFile = null;
  if (!file) {
    mediaStatus.textContent = editingPlaceId ? 'Se conservará el archivo actual.' : '';
    return;
  }
  const validationError = validateMediaFile(file);
  if (validationError) {
    mediaInput.value = '';
    mediaStatus.textContent = validationError;
    return;
  }
  selectedMediaFile = file;
  mediaStatus.textContent = 'Vista previa del archivo seleccionado.';
  await showMediaPreview(mediaPreview, { file, alt: file.name });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isAdmin) return;
  if (!selectedLocation) {
    locationStatus.textContent = 'Busca la ubicación y selecciona uno de los resultados antes de guardar.';
    locationSearch.focus();
    return;
  }
  const submit = form.querySelector('button[type="submit"]');
  const fields = form.elements;
  const lat = Number(fields.latitud.value);
  const lng = Number(fields.longitud.value);
  const date = new Date(fields.fecha.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Number.isNaN(date.getTime())) {
    setMessage('Revisa las coordenadas y la fecha.', 'error');
    return;
  }
  if (!selectedMediaFile && !fields.imagen.value.trim()) {
    mediaStatus.textContent = 'Selecciona una imagen o un video para el lugar.';
    mediaInput.focus();
    return;
  }
  submit.disabled = true;
  setMessage('Guardando lugar…');
  try {
    if (selectedMediaFile) {
      setMessage('Subiendo archivo…');
      const uploaded = await uploadMediaFile(selectedMediaFile, 'Ubicaciones', (progress) => {
        setMessage(`Subiendo archivo: ${Math.round(progress * 100)}%`);
      });
      fields.imagen.value = uploaded.path;
    }
    const place = {
      Nombre: fields.nombre.value.trim(),
      Ubicacion: new GeoPoint(lat, lng),
      Estado: fields.estado.value,
      Fecha: Timestamp.fromDate(date),
      Descripción: fields.descripcion.value.trim(),
      Imagen: fields.imagen.value.trim()
    };
    const placeId = editingPlaceId;
    let savedId = placeId;
    if (placeId) {
      await updateDoc(doc(db, 'Ubicaciones', placeId), place);
    } else {
      const reference = await addDoc(collection(db, 'Ubicaciones'), place);
      savedId = reference.id;
    }
    const savedPlace = {
      id: savedId,
      name: place.Nombre,
      coordinates: [lat, lng],
      status: place.Estado.toLowerCase(),
      date: formatDate(place.Fecha),
      dateSort: place.Fecha.toDate().getTime(),
      description: place.Descripción,
      image: place.Imagen
    };
    const wasEditing = Boolean(placeId);
    if (wasEditing) savedPlaces = savedPlaces.map((item) => item.id === placeId ? savedPlace : item);
    else savedPlaces.push(savedPlace);
    resetPlaceForm();
    form.hidden = true;
    addPlaceToggle.setAttribute('aria-expanded', 'false');
    displayPlaces();
    showPlaceOnMap(savedId);
    setMessage(wasEditing ? 'Cambios guardados.' : 'Lugar agregado al mapa.', 'success');
    showNotice(
      wasEditing ? 'Lugar actualizado' : 'Lugar guardado',
      wasEditing ? `${place.Nombre} se actualizó correctamente.` : `${place.Nombre} se agregó correctamente al mapa.`,
      'success'
    );
  } catch (error) {
    console.error(error);
    const editing = Boolean(editingPlaceId);
    const action = editing ? 'actualizar' : 'agregar';
    const errorText = error.code === 'permission-denied'
      ? `Tu cuenta no tiene permiso para ${action} lugares. Contacta al administrador si necesitas acceso.`
      : error.code === 'unauthenticated'
        ? 'Tu sesión venció. Inicia sesión de nuevo e inténtalo.'
        : error.isHostingerUploadError
          ? error.message
          : 'No pudimos guardar el lugar. Revisa tu conexión e inténtalo de nuevo.';
    setMessage(errorText, 'error');
    showNotice(editing ? 'No pudimos actualizar el lugar' : 'No pudimos agregar el lugar', errorText, 'error');
  } finally {
    submit.disabled = false;
  }
});
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const profiles = await getDocs(query(
      collection(db, 'usuarios'),
      where('correo', '==', user.email)
    ));
    isAdmin = profiles.docs.some((profile) => profile.data().rol === 'admin');
    if (isAdmin) {
      editor.hidden = false;
      access.hidden = true;
      renderPlaceList(savedPlaces);
    } else {
      access.hidden = false;
    }
  } catch (error) {
    console.warn('No se pudo validar el rol de administrador.', error);
    access.hidden = false;
    access.querySelector('p:not(.places-eyebrow)').textContent = 'No pudimos comprobar si puedes agregar lugares. Recarga la página o inténtalo más tarde.';
  }
});

loadPlaces();
