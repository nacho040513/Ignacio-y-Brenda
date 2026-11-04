import { getTimelineDocuments, deleteTimelineDocument } from './firestore-collections.js';
import { formatDate } from './firestore-fields.js';
import { escapeHtml, resolveAssetPath, revealOnScroll } from './dom-utils.js';

const container = document.getElementById('timeline-container');
const deleteDialog = document.getElementById('timeline-delete-dialog');
const deleteDescription = document.getElementById('timeline-delete-description');
const feedback = document.getElementById('timeline-feedback');

function tagsMarkup(tags) {
  if (!tags.length) return '';
  const pills = tags.map((tag) => `<span class="font-label-caps text-label-caps px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full">${escapeHtml(tag)}</span>`).join('');
  return `<div class="mt-6 flex gap-2 flex-wrap">${pills}</div>`;
}

function placeMarkup(lugar) {
  if (!lugar) return '';
  return `<div class="flex items-center gap-1 text-on-surface-variant mb-4 font-label-caps text-label-caps opacity-70">
    <span class="material-symbols-outlined text-[16px]">location_on</span>
    <span>${escapeHtml(lugar)}</span>
  </div>`;
}

function imageMarkup(event) {
  const source = resolveAssetPath(event.rutaImagen);
  if (!source) return '';
  return `<div class="aspect-[4/3] rounded-lg overflow-hidden mb-6 relative group/img">
    <img class="w-full h-full object-cover" alt="${escapeHtml(event.titulo)}" src="${escapeHtml(source)}" loading="lazy" decoding="async"/>
  </div>`;
}

function favoriteMarkup(favorito) {
  if (!favorito) return '';
  return `<span class="material-symbols-outlined absolute top-5 right-5 text-primary text-[22px]" style="font-variation-settings: 'FILL' 1;" title="Favorito" aria-label="Favorito">favorite</span>`;
}

function eventMarkup(event, index) {
  // Se alternan lado y color de punto para mantener el patrón en zigzag del diseño.
  const reversed = index % 2 === 1;
  const dotColor = event.favorito ? 'bg-primary' : (reversed ? 'bg-primary' : 'bg-secondary-container');
  // Los favoritos llevan borde y sombra más marcados para que destaquen en el recorrido.
  const cardStyle = event.favorito
    ? 'border-2 border-primary/40 shadow-md'
    : 'border border-outline-variant/10 shadow-sm';
  return `<div class="fade-in-scroll timeline-event relative md:flex ${reversed ? 'md:flex-row-reverse' : ''} items-center justify-between group">
    <div class="timeline-dot timeline-dot--mobile md:hidden absolute left-0 w-6 h-6 rounded-full ${dotColor} border-4 border-background z-10 flex items-center justify-center top-0 mt-6" style="left: 0;"></div>
    <div class="timeline-dot timeline-dot--desktop hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full ${dotColor} z-10"></div>
    <div class="hidden md:block w-5/12"></div>
    <div class="w-full md:w-5/12 pl-12 md:pl-0">
      <article class="bg-[#FDFCF8] rounded-xl p-6 ${cardStyle} relative">
        ${favoriteMarkup(event.favorito)}
        <button class="timeline-delete${event.favorito ? ' timeline-delete--with-favorite' : ''}" type="button" data-timeline-delete="${escapeHtml(event.id)}" data-timeline-title="${escapeHtml(event.titulo || 'este recuerdo')}" aria-label="Eliminar ${escapeHtml(event.titulo || 'este recuerdo')}" title="Eliminar recuerdo"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
        <p class="font-headline-md text-headline-md text-primary mb-2 pr-20">${escapeHtml(formatDate(event.fecha))}</p>
        <h2 class="font-body-lg text-body-lg font-medium text-on-surface mb-2">${escapeHtml(event.titulo || 'Momento sin título')}</h2>
        ${placeMarkup(event.lugar)}
        ${imageMarkup(event)}
        ${event.descripcion ? `<p class="font-quote-it text-quote-it text-on-surface-variant italic">"${escapeHtml(event.descripcion)}"</p>` : ''}
        ${tagsMarkup(event.tags)}
      </article>
    </div>
  </div>`;
}

container?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-timeline-delete]');
  if (!button) return;
  const title = button.dataset.timelineTitle || 'este recuerdo';
  if (!deleteDialog || !deleteDescription) return;
  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = '';
    feedback.removeAttribute('data-state');
  }
  deleteDescription.textContent = `“${title}” se quitará de la línea de tiempo.`;
  deleteDialog.returnValue = 'cancel';
  deleteDialog.showModal();
  await new Promise((resolve) => deleteDialog.addEventListener('close', resolve, { once: true }));
  if (deleteDialog.returnValue !== 'confirm') {
    button.focus();
    return;
  }
  button.disabled = true;
  try {
    await deleteTimelineDocument(button.dataset.timelineDelete);
    await loadTimeline();
    if (feedback) {
      feedback.textContent = 'Recuerdo eliminado.';
      feedback.hidden = false;
      feedback.dataset.state = 'success';
    }
    document.getElementById('timeline-add')?.focus();
  } catch (error) {
    console.warn('No se pudo eliminar el recuerdo de Timeline.', error);
    button.disabled = false;
    if (feedback) {
      feedback.textContent = error?.code === 'permission-denied'
      ? 'Tu cuenta no tiene permiso para eliminar este recuerdo. Contacta al administrador si necesitas acceso.'
      : 'No pudimos eliminar este recuerdo. Revisa tu conexión e inténtalo de nuevo.';
      feedback.hidden = false;
      feedback.dataset.state = 'error';
      feedback.focus?.();
    }
    button.focus();
  }
});

deleteDialog?.addEventListener('click', (event) => {
  if (event.target === deleteDialog) deleteDialog.close('cancel');
});

function alignTimelineLines() {
  const track = container?.parentElement;
  if (!track) return;
  const trackTop = track.getBoundingClientRect().top;
  const layouts = [
    ['.timeline-line--mobile', '.timeline-dot--mobile'],
    ['.timeline-line--desktop', '.timeline-dot--desktop']
  ];
  for (const [lineSelector, dotSelector] of layouts) {
    const line = track.querySelector(lineSelector);
    const dots = container.querySelectorAll(dotSelector);
    if (!line || !dots.length) continue;
    const first = dots[0].getBoundingClientRect();
    const last = dots[dots.length - 1].getBoundingClientRect();
    const start = first.top + first.height / 2 - trackTop;
    const end = last.top + last.height / 2 - trackTop;
    line.style.top = `${start}px`;
    line.style.height = `${Math.max(1, end - start)}px`;
  }
}

let lineObserver;
if (container && 'ResizeObserver' in window) {
  lineObserver = new ResizeObserver(() => requestAnimationFrame(alignTimelineLines));
  lineObserver.observe(container);
}
if (container && 'MutationObserver' in window) {
  const visibilityObserver = new MutationObserver(() => requestAnimationFrame(alignTimelineLines));
  visibilityObserver.observe(container, { subtree: true, attributes: true, attributeFilter: ['class'] });
}
window.addEventListener('resize', alignTimelineLines);

export async function loadTimeline() {
  if (!container) return;
  const empty = document.getElementById('timeline-empty');
  const lines = document.querySelectorAll('.timeline-line');
  try {
    const events = await getTimelineDocuments();
    lines.forEach((line) => { line.hidden = events.length === 0; });
    if (!events.length) {
      container.replaceChildren();
      if (empty) {
        empty.textContent = 'Todavía no hay recuerdos guardados. Pueden empezar con el botón “Añadir momento”.';
        container.append(empty);
      }
      return;
    }
    container.innerHTML = events.map(eventMarkup).join('');
    requestAnimationFrame(alignTimelineLines);
    revealOnScroll(container.querySelectorAll('.fade-in-scroll'));
  } catch (error) {
    console.warn('No se pudo cargar Timeline desde Firestore.', error);
    lines.forEach((line) => { line.hidden = true; });
    container.replaceChildren();
    if (empty) {
      empty.textContent = 'No pudimos cargar sus recuerdos. Revisa tu conexión e inténtalo de nuevo.';
      container.append(empty);
    }
  }
}

loadTimeline();
