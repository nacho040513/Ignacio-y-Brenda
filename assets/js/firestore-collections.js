import { db } from './firebase-client.js';
import { fieldReader, readText, readTags, readBool } from './firestore-fields.js';
import { collection, getDocs, addDoc, Timestamp, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

// Los nombres de colección son sensibles a mayúsculas: "Ubicaciones", "Albun", "Timeline", "Futuro" e "Ingresos".
export async function getAlbumDocuments() {
  const snapshot = await getDocs(collection(db, 'Albun'));
  return snapshot.docs.map((document) => {
    const field = fieldReader(document.data());
    return {
      id: document.id,
      titulo: readText(field, 'titulo') || readText(field, 'nombre'),
      descripcion: readText(field, 'descripcion'),
      categoria: readText(field, 'categoria'),
      lugar: readText(field, 'lugar'),
      rutaImagen: readText(field, 'rutaimagen'),
      fecha: field('fecha', null),
      tags: readTags(field),
      favorito: readBool(field, 'favorito'),
      idUbicaciones: readText(field, 'id_ubicaciones')
    };
  });
}

export async function getAlbumLocationReferences() {
  const snapshot = await getDocs(collection(db, 'Ubicaciones'));
  return snapshot.docs.map((document) => {
    const field = fieldReader(document.data());
    return { id: document.id, nombre: readText(field, 'nombre', 'Ubicación sin nombre') };
  });
}

export async function createAlbumDocument({ categoria, lugar, rutaImagen, tags, idUbicaciones, fecha }) {
  const reference = await addDoc(collection(db, 'Albun'), {
    Categoria: categoria,
    Lugar: lugar,
    RutaImagen: rutaImagen,
    Tags: tags,
    id_ubicaciones: idUbicaciones || null,
    Fecha: Timestamp.fromDate(fecha)
  });
  return reference.id;
}

export async function updateAlbumDocument(id, { categoria, lugar, rutaImagen, tags, idUbicaciones, fecha }) {
  await updateDoc(doc(db, 'Albun', id), {
    Categoria: categoria,
    Lugar: lugar,
    RutaImagen: rutaImagen,
    Tags: tags,
    id_ubicaciones: idUbicaciones || null,
    Fecha: Timestamp.fromDate(fecha)
  });
}

export async function getTimelineDocuments() {
  const snapshot = await getDocs(collection(db, 'Timeline'));
  return snapshot.docs.map((document) => {
    const field = fieldReader(document.data());
    return {
      id: document.id,
      titulo: readText(field, 'titulo') || readText(field, 'nombre'),
      descripcion: readText(field, 'descripcion'),
      lugar: readText(field, 'lugar'),
      rutaImagen: readText(field, 'rutaimagen'),
      fecha: field('fecha', null),
      favorito: readBool(field, 'favorito'),
      tags: readTags(field)
    };
  }).sort((first, second) => (first.fecha?.toMillis?.() ?? 0) - (second.fecha?.toMillis?.() ?? 0));
}

// Los nombres de campo replican los del documento existente en Timeline.
export async function createTimelineDocument({ titulo, descripcion, lugar, fecha, favorito, tags }) {
  const reference = await addDoc(collection(db, 'Timeline'), {
    Titulo: titulo,
    'Descripción': descripcion,
    Lugar: lugar,
    Fecha: fecha ? Timestamp.fromDate(fecha) : null,
    Favorito: Boolean(favorito),
    Tags: tags
  });
  return reference.id;
}

export async function deleteTimelineDocument(id) {
  await deleteDoc(doc(db, 'Timeline', id));
}

function localDateToDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function timestampToLocalDate(timestamp) {
  if (!timestamp?.toDate) return '';
  const date = timestamp.toDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Futuro guarda metas y sueños en una colección, diferenciados por Tipo.
export async function getFutureDocuments() {
  const snapshot = await getDocs(collection(db, 'Futuro'));
  return snapshot.docs.map((document) => {
    const field = fieldReader(document.data());
    return {
      id: document.id,
      type: readText(field, 'tipo', 'meta').toLowerCase() === 'sueño' ? 'dream' : 'goal',
      title: readText(field, 'titulo') || readText(field, 'nombre'),
      date: timestampToLocalDate(field('fecha', null)),
      done: readBool(field, 'completado')
    };
  }).sort((first, second) => first.title.localeCompare(second.title, 'es'));
}

export async function createFutureDocument({ type, title, date = '' }) {
  const reference = await addDoc(collection(db, 'Futuro'), {
    Tipo: type === 'dream' ? 'sueño' : 'meta',
    Titulo: title,
    Fecha: localDateToDate(date) ? Timestamp.fromDate(localDateToDate(date)) : null,
    Completado: false,
    CreadoEn: Timestamp.now()
  });
  return reference.id;
}

export async function updateFutureDocument(id, changes) {
  const data = { ActualizadoEn: Timestamp.now() };
  if ('title' in changes) data.Titulo = changes.title;
  if ('date' in changes) data.Fecha = localDateToDate(changes.date) ? Timestamp.fromDate(localDateToDate(changes.date)) : null;
  if ('done' in changes) data.Completado = Boolean(changes.done);
  await updateDoc(doc(db, 'Futuro', id), data);
}

export async function deleteFutureDocument(id) {
  await deleteDoc(doc(db, 'Futuro', id));
}
