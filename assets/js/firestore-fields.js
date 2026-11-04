// Algunos campos en Firestore llegan con espacios sobrantes o acentos ("Estado ", "Descripción"),
// así que se buscan por una clave normalizada en vez de por su nombre literal.
export function fieldReader(data) {
  const normalize = (key) => key.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const fields = new Map(Object.entries(data).map(([key, value]) => [normalize(key), value]));
  return (name, fallback) => fields.get(name) ?? fallback;
}

export function readText(field, name, fallback = '') {
  return String(field(name, fallback)).trim();
}

// Acepta el booleano de Firestore y también los textos que quedan al editar a mano en la consola.
export function readBool(field, name) {
  const value = field(name, false);
  if (typeof value === 'boolean') return value;
  return ['true', 'sí', 'si', '1'].includes(String(value).trim().toLowerCase());
}

export function readTags(field) {
  const tags = field('tags', []);
  return Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
}

export function formatDate(timestamp, fallback = 'Sin fecha') {
  if (!timestamp?.toDate) return fallback;
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(timestamp.toDate());
}
