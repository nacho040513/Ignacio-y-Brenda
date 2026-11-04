import { auth } from './firebase-client.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { resolveAssetPath } from './dom-utils.js';

const previewUrls = new WeakMap();
const previewTokens = new WeakMap();
export const MAX_MEDIA_FILE_SIZE = 100 * 1024 * 1024;

export function isVideoMedia(source) {
  const value = typeof source === 'string' ? source : source?.type || '';
  return /^video\//i.test(value) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i.test(value);
}

export function validateMediaFile(file) {
  if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
    return 'Elige una imagen o un video compatible.';
  }
  if (file.size > MAX_MEDIA_FILE_SIZE) return 'El archivo supera el límite de 100 MB.';
  return '';
}

function waitForAuthUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, () => {
      unsubscribe();
      resolve(null);
    });
  });
}

export async function uploadMediaFile(file, folder, onProgress = () => {}) {
  const validationError = validateMediaFile(file);
  if (validationError) throw new Error(validationError);
  if (!['Albun', 'Ubicaciones'].includes(folder)) throw new Error('La carpeta de destino no es válida.');
  const user = await waitForAuthUser();
  if (!user) {
    const error = new Error('Inicia sesión para subir archivos.');
    error.code = 'unauthenticated';
    throw error;
  }
  const idToken = await user.getIdToken();
  const formData = new FormData();
  formData.append('folder', folder);
  formData.append('file', file, file.name);
  const endpoint = new URL('../../api/upload-media.php', import.meta.url);

  const result = await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', endpoint);
    request.setRequestHeader('Authorization', `Bearer ${idToken}`);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    request.addEventListener('load', () => {
      let response;
      try { response = JSON.parse(request.responseText); } catch { response = {}; }
      if (request.status >= 200 && request.status < 300 && response.path) {
        resolve(response);
        return;
      }
      const error = new Error(response.error || 'No se pudo guardar el archivo en Hostinger.');
      if (response.code) error.code = response.code;
      error.isHostingerUploadError = true;
      reject(error);
    });
    request.addEventListener('error', () => {
      const error = new Error('No pudimos conectar con Hostinger para subir el archivo.');
      error.isHostingerUploadError = true;
      reject(error);
    });
    request.addEventListener('abort', () => {
      const error = new Error('La carga del archivo fue cancelada.');
      error.isHostingerUploadError = true;
      reject(error);
    });
    request.send(formData);
  });
  return { path: result.path, url: resolveAssetPath(result.path) };
}

export async function resolveMediaUrl(path) {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('/')) return value;
  return resolveAssetPath(value);
}

export async function showMediaPreview(container, { file = null, path = '', alt = 'Vista previa del archivo' } = {}) {
  const token = Symbol('preview');
  previewTokens.set(container, token);
  const oldObjectUrl = previewUrls.get(container);
  if (oldObjectUrl) URL.revokeObjectURL(oldObjectUrl);
  previewUrls.delete(container);
  container.replaceChildren();
  container.hidden = true;

  let source = '';
  if (file) {
    source = URL.createObjectURL(file);
    previewUrls.set(container, source);
  } else if (path) {
    try {
      source = await resolveMediaUrl(path);
    } catch {
      source = '';
    }
  }
  if (!source || previewTokens.get(container) !== token) return;

  const media = document.createElement(isVideoMedia(file?.type || path) ? 'video' : 'img');
  media.className = 'upload-preview__media';
  if (media instanceof HTMLVideoElement) {
    media.controls = true;
    media.playsInline = true;
    media.preload = 'metadata';
  } else {
    media.alt = alt;
  }
  media.src = source;
  media.addEventListener('error', () => {
    const error = document.createElement('span');
    error.className = 'upload-preview__error';
    error.textContent = 'No se pudo mostrar el archivo. Selecciona otro para reemplazarlo.';
    container.replaceChildren(error);
  }, { once: true });
  container.replaceChildren(media);
  container.hidden = false;
}

export function clearMediaPreview(container) {
  previewTokens.set(container, Symbol('cleared'));
  const objectUrl = previewUrls.get(container);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  previewUrls.delete(container);
  container.replaceChildren();
  container.hidden = true;
}
