import { createAlbumDocument, getAlbumDocuments, getAlbumLocationReferences, updateAlbumDocument } from './firestore-collections.js';
import { formatDate } from './firestore-fields.js';
import { escapeHtml, resolveAssetPath } from './dom-utils.js';
import { clearMediaPreview, isVideoMedia, resolveMediaUrl, showMediaPreview, uploadMediaFile, validateMediaFile } from './media-storage.js';

const container = document.getElementById('gallery-container');
const activePill = ['bg-primary', 'text-on-primary'];
const idlePill = ['border', 'border-outline-variant', 'text-on-surface-variant', 'hover:bg-surface-container-low'];
const emptyState = document.getElementById('gallery-empty');
const addButton = document.getElementById('album-add-open');
const dialog = document.getElementById('album-add-dialog');
const form = document.getElementById('album-entry-form');
const feedback = document.getElementById('album-form-feedback');
const pageFeedback = document.getElementById('album-page-feedback');
const locationSelect = document.getElementById('album-location-select');
const locationStatus = document.getElementById('album-location-status');
const locationFilter = document.getElementById('location-filter');
const saveButton = form.querySelector('[type="submit"]');
const placeSearchInput = document.getElementById('album-place-search');
const placeSearchButton = document.getElementById('album-place-search-button');
const placeSearchStatus = document.getElementById('album-place-status');
const placeSearchResults = document.getElementById('album-place-results');
const albumMediaInput = document.getElementById('album-media-input');
const albumMediaPreview = document.getElementById('album-media-preview');
const albumMediaStatus = document.getElementById('album-media-status');
const normalize = (value) => String(value || '').trim().toLocaleLowerCase('es-CO').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const albumCategories = ['Viajes', 'Momentos', 'Favoritos', 'Casa', 'Celebraciones'];
let activeCategory = 'todos';
let selectedMapPlace = null;
let selectedMediaFile = null;
let lastGeocodingRequest = 0;
const geocodingCache = new Map();
const locationNames = new Map();
const photosById = new Map();
let editingPhoto = null;

// Se alternan las proporciones para conservar el ritmo visual del masonry original.
const aspectRatios = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/3]'];

function cardMarkup(photo, index) {
  const title = photo.titulo || photo.categoria || 'Recuerdo sin título';
  const place = photo.lugar || photo.categoria || 'Sin lugar';
  const mediaSource = photo.mediaUrl || resolveAssetPath(photo.rutaImagen);
  const searchable = normalize(photo.categoria);
  const relatedLocation = locationNames.get(photo.idUbicaciones) || '';
  const formattedDate = formatDate(photo.fecha, 'Sin fecha');
  const mediaMarkup = mediaSource
    ? isVideoMedia(photo.rutaImagen)
      ? `<video class="w-full h-auto object-cover rounded-sm border border-black/5 ${aspectRatios[index % aspectRatios.length]}" muted playsinline preload="none" aria-label="Video de ${escapeHtml(title)}"><source src="${escapeHtml(mediaSource)}"/></video>`
      : `<img class="w-full h-auto object-cover rounded-sm border border-black/5 ${aspectRatios[index % aspectRatios.length]}" alt="${escapeHtml(title)}" src="${escapeHtml(mediaSource)}" loading="lazy" decoding="async"/>`
    : `<div class="memory-image-placeholder ${aspectRatios[index % aspectRatios.length]}" role="img" aria-label="${escapeHtml(title)}: no hay imagen disponible"><span class="material-symbols-outlined" aria-hidden="true">image_not_supported</span></div>`;
  return `<div class="masonry-item" data-document-id="${escapeHtml(photo.id)}" data-media-src="${escapeHtml(mediaSource)}" data-categoria="${escapeHtml(searchable)}" data-categoria-label="${escapeHtml(photo.categoria || '')}" data-favorito="${photo.favorito ? 'true' : 'false'}" data-id-ubicaciones="${escapeHtml(photo.idUbicaciones || '')}" data-ubicacion-nombre="${escapeHtml(relatedLocation)}" data-titulo="${escapeHtml(title)}" data-lugar="${escapeHtml(photo.lugar || '')}" data-fecha="${escapeHtml(formattedDate)}" data-ruta-imagen="${escapeHtml(photo.rutaImagen || '')}" data-tags="${escapeHtml(JSON.stringify(photo.tags || []))}" data-descripcion="${escapeHtml(photo.descripcion || '')}">
    <div class="polaroid">
      <button class="memory-card__open" type="button" aria-label="Abrir ${escapeHtml(title)} en vista previa" ${mediaSource ? '' : 'disabled'}>
        ${mediaMarkup}
        <span class="memory-card__details">
          <span class="memory-card__title">${escapeHtml(title)}</span>
          <span class="memory-card__meta">
            <span class="font-label-caps text-label-caps flex items-center gap-1 text-[10px]"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span> ${escapeHtml(place)}</span>
            <span class="font-label-caps text-label-caps text-[10px]">${escapeHtml(formattedDate)}</span>
          </span>
        </span>
      </button>
      <button class="album-card-edit" type="button" data-album-edit="${escapeHtml(photo.id)}" aria-label="Editar ${escapeHtml(title)}" title="Editar ${escapeHtml(title)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
      </button>
    </div>
  </div>`;
}

function applyFilter(categoria = activeCategory) {
  let visible = 0;
  container.querySelectorAll('.masonry-item').forEach((item) => {
    const matchesCategory = categoria === 'todos'
      || (categoria === 'marcados' ? item.dataset.favorito === 'true' : normalize(item.dataset.categoriaLabel) === categoria);
    const matchesLocation = !locationFilter.value || item.dataset.idUbicaciones === locationFilter.value;
    const matches = matchesCategory && matchesLocation;
    item.classList.toggle('hidden', !matches);
    if (matches) visible += 1;
  });
  emptyState.hidden = visible > 0;
  if (!visible) emptyState.textContent = locationFilter.value
    ? 'No hay recuerdos que coincidan con esta ubicación y este filtro.'
    : 'No hay recuerdos en esta categoría todavía.';
}

function wireFilters() {
  const filterContainer = document.getElementById('category-filters');
  if (filterContainer.dataset.wired) return;
  filterContainer.dataset.wired = 'true';
  filterContainer.addEventListener('click', (event) => {
    const pill = event.target.closest('button[data-filter]');
    if (!pill) return;
    const selected = normalize(pill.dataset.filter || pill.innerText);
    filterContainer.querySelectorAll('button').forEach((other) => {
      other.classList.remove(...activePill);
      other.classList.add(...idlePill);
      other.setAttribute('aria-pressed', 'false');
    });
    pill.classList.remove(...idlePill);
    pill.classList.add(...activePill);
    pill.setAttribute('aria-pressed', 'true');
    activeCategory = selected;
    applyFilter();
  });
}

wireFilters();
locationFilter.addEventListener('change', () => applyFilter());

function setFeedback(element, text, state = '') {
  element.textContent = text;
  element.dataset.state = state;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

async function loadLocationOptions() {
  saveButton.disabled = true;
  try {
    const locations = await getAlbumLocationReferences();
    locationNames.clear();
    locations.forEach((location) => locationNames.set(location.id, location.nombre));
    const placeholder = new Option('Sin relación', '', true, false);
    locationSelect.replaceChildren(placeholder, ...locations.map((location) => {
      const option = document.createElement('option');
      option.value = location.id;
      option.textContent = location.nombre;
      return option;
    }));
    locationSelect.disabled = false;
    if (locations.length) {
      locationStatus.textContent = 'Si aplica, puedes vincular una ubicación guardada.';
      locationFilter.replaceChildren(new Option('Todas las ubicaciones', ''));
      locationFilter.append(...locations.map((location) => new Option(location.nombre, location.id)));
      saveButton.disabled = false;
    } else {
      locationStatus.textContent = 'No hay ubicaciones guardadas; puedes continuar sin vincular una.';
      locationFilter.replaceChildren(new Option('Todas las ubicaciones', ''));
      saveButton.disabled = false;
    }
  } catch (error) {
    console.warn('No se pudieron cargar los IDs de Ubicaciones para el formulario.', error);
    locationSelect.replaceChildren(new Option('Sin relación', '', true, false));
    locationSelect.disabled = false;
    locationStatus.textContent = 'No pudimos cargar las ubicaciones; puedes guardar sin vincular una.';
    locationFilter.replaceChildren(new Option('Todas las ubicaciones', ''));
    saveButton.disabled = false;
  }
}

function resetAlbumForm() {
  form.reset();
  Array.from(form.elements.Categoria.options).forEach((option) => {
    if (option.value && !albumCategories.includes(option.value)) option.remove();
  });
  editingPhoto = null;
  selectedMapPlace = null;
  selectedMediaFile = null;
  clearMediaPreview(albumMediaPreview);
  albumMediaStatus.textContent = '';
  placeSearchStatus.textContent = '';
  placeSearchResults.replaceChildren();
  placeSearchResults.hidden = true;
  saveButton.textContent = 'Guardar recuerdo';
  document.getElementById('album-dialog-title').textContent = 'Agregar al álbum';
  document.querySelector('.album-form__eyebrow').textContent = 'Nuevo recuerdo';
  setFeedback(feedback, '');
}

addButton.addEventListener('click', () => {
  resetAlbumForm();
  pageFeedback.hidden = true;
  dialog.showModal();
  form.elements.Categoria.focus();
});
document.getElementById('album-add-close').addEventListener('click', () => dialog.close());
document.getElementById('album-add-cancel').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', resetAlbumForm);
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
const locationOptionsReady = loadLocationOptions();

albumMediaInput.addEventListener('change', async () => {
  const file = albumMediaInput.files?.[0] || null;
  selectedMediaFile = null;
  if (!file) {
    albumMediaStatus.textContent = editingPhoto ? 'Se conservará el archivo actual.' : '';
    return;
  }
  const validationError = validateMediaFile(file);
  if (validationError) {
    albumMediaInput.value = '';
    albumMediaStatus.textContent = validationError;
    return;
  }
  selectedMediaFile = file;
  albumMediaStatus.textContent = 'Vista previa del archivo seleccionado.';
  await showMediaPreview(albumMediaPreview, { file, alt: file.name });
});

container.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-album-edit]');
  if (!editButton) return;
  event.preventDefault();
  event.stopPropagation();
  const photo = photosById.get(editButton.dataset.albumEdit);
  if (!photo) return;
  await locationOptionsReady;
  resetAlbumForm();
  editingPhoto = photo;
  pageFeedback.hidden = true;
  if (photo.categoria && !Array.from(form.elements.Categoria.options).some((option) => option.value === photo.categoria)) {
    form.elements.Categoria.add(new Option(photo.categoria, photo.categoria));
  }
  form.elements.Categoria.value = photo.categoria || '';
  placeSearchInput.value = photo.lugar || '';
  form.elements.RutaImagen.value = photo.rutaImagen || '';
  albumMediaStatus.textContent = photo.rutaImagen ? 'Archivo actual. Elige otro solo si quieres reemplazarlo.' : 'Selecciona una imagen o video para este recuerdo.';
  await showMediaPreview(albumMediaPreview, { path: photo.rutaImagen, alt: `Archivo de ${photo.titulo || photo.categoria || 'este recuerdo'}` });
  form.elements.Tags.value = (photo.tags || []).join(', ');
  form.elements.Fecha.value = photo.fecha?.toDate
    ? (() => {
      const date = photo.fecha.toDate();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    })()
    : '';
  if (photo.idUbicaciones && !Array.from(locationSelect.options).some((option) => option.value === photo.idUbicaciones)) {
    locationSelect.add(new Option(locationNames.get(photo.idUbicaciones) || 'Ubicación actual', photo.idUbicaciones));
  }
  locationSelect.value = photo.idUbicaciones || '';
  locationStatus.textContent = 'Conserva la ubicación o selecciona otra para cambiarla.';
  saveButton.textContent = 'Guardar cambios';
  document.getElementById('album-dialog-title').textContent = 'Editar recuerdo';
  document.querySelector('.album-form__eyebrow').textContent = 'Actualizar recuerdo';
  dialog.showModal();
  form.elements.Categoria.focus();
});

placeSearchInput.addEventListener('input', () => {
  selectedMapPlace = null;
  placeSearchStatus.textContent = '';
  placeSearchResults.replaceChildren();
  placeSearchResults.hidden = true;
});

placeSearchButton.addEventListener('click', async () => {
  const query = placeSearchInput.value.trim();
  if (query.length < 3) {
    placeSearchStatus.textContent = 'Escribe al menos tres caracteres para buscar.';
    placeSearchInput.focus();
    return;
  }
  const key = query.toLocaleLowerCase('es-CO');
  placeSearchButton.disabled = true;
  placeSearchButton.textContent = 'Buscando…';
  placeSearchStatus.textContent = 'Buscando el lugar en el mapa…';
  try {
    let results = geocodingCache.get(key);
    if (!results) {
      const wait = Math.max(0, 1000 - (performance.now() - lastGeocodingRequest));
      if (lastGeocodingRequest) await new Promise((resolve) => setTimeout(resolve, wait));
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '5');
      url.searchParams.set('accept-language', 'es');
      lastGeocodingRequest = performance.now();
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Geocoding HTTP ${response.status}`);
      results = await response.json();
      geocodingCache.set(key, results);
    }
    placeSearchResults.replaceChildren();
    results.forEach((result) => {
      const item = document.createElement('li');
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = result.display_name;
      option.addEventListener('click', () => {
        selectedMapPlace = result;
        placeSearchInput.value = result.display_name;
        placeSearchStatus.textContent = 'Lugar seleccionado del mapa.';
        placeSearchResults.replaceChildren();
        placeSearchResults.hidden = true;
      });
      item.append(option);
      placeSearchResults.append(item);
    });
    placeSearchResults.hidden = !results.length;
    placeSearchStatus.textContent = results.length
      ? `Selecciona uno de los ${results.length} resultados.`
      : 'No encontramos coincidencias. Prueba con una dirección más específica.';
  } catch (error) {
    console.error('No se pudo buscar el lugar en OpenStreetMap.', error);
    placeSearchStatus.textContent = 'No pudimos consultar el mapa. Revisa tu conexión e inténtalo de nuevo.';
  } finally {
    placeSearchButton.disabled = false;
    placeSearchButton.textContent = 'Buscar';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const placeName = String(data.get('Lugar') || '').trim();
  const keepsExistingPlace = editingPhoto && placeName === editingPhoto.lugar;
  if (!selectedMapPlace && !keepsExistingPlace) {
    setFeedback(feedback, 'Busca y selecciona un lugar del mapa antes de guardar.', 'error');
    placeSearchInput.focus();
    return;
  }
  const tags = String(data.get('Tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  if (!tags.length) {
    setFeedback(feedback, 'Agrega al menos una etiqueta.', 'error');
    form.elements.Tags.focus();
    return;
  }
  const currentMediaPath = String(data.get('RutaImagen') || '').trim();
  if (!selectedMediaFile && !currentMediaPath) {
    setFeedback(feedback, 'Selecciona una imagen o un video para el recuerdo.', 'error');
    albumMediaInput.focus();
    return;
  }
  const wasEditing = Boolean(editingPhoto);
  const entry = {
    categoria: String(data.get('Categoria')).trim(),
    lugar: selectedMapPlace?.display_name || placeName,
    rutaImagen: currentMediaPath,
    tags,
    idUbicaciones: String(data.get('id_ubicaciones')).trim(),
    fecha: parseLocalDate(String(data.get('Fecha')))
  };
  saveButton.disabled = true;
  setFeedback(feedback, 'Guardando tu recuerdo…');
  try {
    if (selectedMediaFile) {
      setFeedback(feedback, 'Subiendo archivo…');
      const uploaded = await uploadMediaFile(selectedMediaFile, 'Albun', (progress) => {
        setFeedback(feedback, `Subiendo archivo: ${Math.round(progress * 100)}%`);
      });
      entry.rutaImagen = uploaded.path;
    }
    if (wasEditing) await updateAlbumDocument(editingPhoto.id, entry);
    else await createAlbumDocument(entry);
    dialog.close();
    await loadGallery();
    pageFeedback.textContent = wasEditing ? 'Los cambios de tu recuerdo se guardaron.' : 'Tu recuerdo ya está en el álbum.';
    pageFeedback.hidden = false;
    addButton.focus();
  } catch (error) {
    console.error(wasEditing ? 'No se pudo actualizar el recuerdo en Albun.' : 'No se pudo guardar el recuerdo en Albun.', error);
    const message = error?.code === 'permission-denied'
      ? `Tu cuenta no tiene permiso para ${wasEditing ? 'editar' : 'agregar'} recuerdos. Contacta al administrador si necesitas acceso.`
      : error?.code === 'unauthenticated'
        ? 'Tu sesión venció. Inicia sesión de nuevo e inténtalo.'
        : error?.isHostingerUploadError
          ? error.message
          : `No pudimos ${wasEditing ? 'guardar los cambios' : 'guardar tu recuerdo'}. Revisa tu conexión e inténtalo de nuevo.`;
    setFeedback(feedback, message, 'error');
  } finally {
    saveButton.disabled = false;
  }
});

export async function loadGallery() {
  if (!container) return;
  try {
    await locationOptionsReady;
    const photos = await getAlbumDocuments();
    await Promise.all(photos.map(async (photo) => {
      try { photo.mediaUrl = await resolveMediaUrl(photo.rutaImagen); }
      catch { photo.mediaUrl = resolveAssetPath(photo.rutaImagen); }
    }));
    photosById.clear();
    photos.forEach((photo) => photosById.set(photo.id, photo));
    if (!photos.length) {
      container.replaceChildren();
      emptyState.textContent = 'Aún no hay recuerdos en el álbum. Cuando agreguen fotos, aparecerán aquí.';
      emptyState.hidden = false;
      return;
    }
    container.innerHTML = photos.map(cardMarkup).join('');
    container.querySelectorAll('.memory-card__open:not(:disabled)').forEach((button) => {
      button.addEventListener('click', () => window.openLightbox(button.closest('.masonry-item')));
    });
    // Si la ruta guardada en Firestore no existe, se cae a la imagen de marcador de posición.
    container.querySelectorAll('img, video').forEach((image) => image.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = `memory-image-placeholder ${aspectRatios.find((ratio) => image.classList.contains(ratio)) || 'aspect-square'}`;
      placeholder.setAttribute('role', 'img');
      const label = image.getAttribute('aria-label') || image.alt || 'Archivo';
      placeholder.setAttribute('aria-label', `Archivo no disponible: ${label}`);
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = 'image_not_supported';
      placeholder.append(icon);
      image.replaceWith(placeholder);
      const openButton = placeholder.closest('.memory-card__open');
      if (openButton) {
        openButton.disabled = true;
        openButton.setAttribute('aria-label', `El archivo de ${label} no está disponible`);
      }
    }, { once: true }));
    applyFilter(activeCategory);
  } catch (error) {
    console.warn('No se pudo cargar Albun desde Firestore.', error);
    emptyState.textContent = 'No pudimos cargar el álbum. Revisa tu conexión e inténtalo de nuevo.';
  }
}

loadGallery();
