export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

// El observer inline de las páginas corre en DOMContentLoaded, así que no alcanza a ver
// las tarjetas que se inyectan después de leer Firestore; estas necesitan su propio observer.
export function revealOnScroll(elements) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });
  elements.forEach((element) => observer.observe(element));
}

// Las rutas guardadas en Firestore son relativas a /assets ("img/Viajes/foto.png").
export function resolveAssetPath(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
  return `../assets/${path.replace(/^\.?\/*/, '').replace(/^assets\//i, '')}`;
}
