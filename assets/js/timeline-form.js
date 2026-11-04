import { auth } from './firebase-client.js';
import { createTimelineDocument } from './firestore-collections.js';
import { loadTimeline } from './timeline-entries.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';

const trigger = document.getElementById('timeline-add');
const inputClass = 'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none';
const labelClass = 'font-label-caps text-label-caps text-on-surface-variant';

let currentUser = null;

function buildDialog() {
  const dialog = document.createElement('dialog');
  dialog.id = 'timeline-dialog';
  dialog.className = 'rounded-xl p-0 bg-transparent backdrop:bg-inverse-surface/60 backdrop:backdrop-blur-sm';
  dialog.innerHTML = `
    <form method="dialog" class="w-[min(92vw,34rem)] bg-surface text-on-surface rounded-xl shadow-xl p-6 flex flex-col gap-4" id="timeline-form">
      <div class="flex items-center justify-between">
        <h2 class="font-headline-md text-headline-md text-on-surface">Nuevo momento</h2>
        <button type="button" class="p-1 text-on-surface-variant hover:text-primary transition-colors" value="cancel" id="timeline-close" aria-label="Cerrar formulario">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <label class="flex flex-col gap-1">
        <span class="${labelClass}">Título</span>
        <input class="${inputClass}" name="titulo" required maxlength="120" placeholder="El día que nos conocimos"/>
      </label>
      <label class="flex flex-col gap-1">
        <span class="${labelClass}">Fecha</span>
        <input class="${inputClass}" name="fecha" type="date" required/>
      </label>
      <label class="flex flex-col gap-1">
        <span class="${labelClass}">Lugar</span>
        <input class="${inputClass}" name="lugar" maxlength="120" placeholder="Bogotá, Colombia"/>
      </label>
      <label class="flex flex-col gap-1">
        <span class="${labelClass}">Descripción</span>
        <textarea class="${inputClass} resize-y min-h-24" name="descripcion" maxlength="600" placeholder="Qué pasó ese día…"></textarea>
      </label>
      <label class="flex flex-col gap-1">
        <span class="${labelClass}">Tags (separados por coma)</span>
        <input class="${inputClass}" name="tags" placeholder="Amor, Aventura"/>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input class="w-5 h-5 accent-primary cursor-pointer" name="favorito" type="checkbox"/>
        <span class="material-symbols-outlined text-primary text-[20px]">favorite</span>
        <span class="${labelClass}">Marcar como favorito</span>
      </label>
      <p class="font-body-md text-body-md min-h-6" id="timeline-feedback" role="status" aria-live="polite"></p>
      <div class="flex justify-end gap-3">
        <button type="button" class="px-5 py-3 rounded-full border border-outline-variant font-label-caps text-label-caps hover:bg-surface-container-low transition-colors" id="timeline-cancel">Cancelar</button>
        <button type="submit" class="px-5 py-3 rounded-full bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary-container hover:text-on-primary-container transition-colors" id="timeline-submit">Guardar</button>
      </div>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

function parseDate(value) {
  // El input type="date" entrega "AAAA-MM-DD"; se construye en hora local para no correr un día.
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function errorMessage(error) {
  if (error?.code !== 'permission-denied') return 'No pudimos guardar este momento. Revisa tu conexión e inténtalo de nuevo.';
  return currentUser
    ? 'Tu cuenta no tiene permiso para agregar momentos. Contacta al administrador si necesitas acceso.'
    : 'Inicia sesión para agregar un momento.';
}

function wire(dialog) {
  const form = dialog.querySelector('#timeline-form');
  const feedback = dialog.querySelector('#timeline-feedback');
  const submit = dialog.querySelector('#timeline-submit');

  const say = (text, tone = 'text-on-surface-variant') => {
    feedback.textContent = text;
    feedback.className = `font-body-md text-body-md min-h-6 ${tone}`;
  };

  dialog.querySelectorAll('#timeline-close, #timeline-cancel').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });

  form.addEventListener('submit', async (event) => {
    // El formulario vive dentro de un <dialog>, así que hay que frenar el cierre automático.
    event.preventDefault();
    const data = new FormData(form);
    submit.disabled = true;
    say('Guardando…');
    try {
      await createTimelineDocument({
        titulo: data.get('titulo').trim(),
        descripcion: data.get('descripcion').trim(),
        lugar: data.get('lugar').trim(),
        fecha: parseDate(data.get('fecha')),
        favorito: data.get('favorito') === 'on',
        tags: data.get('tags').split(',').map((tag) => tag.trim()).filter(Boolean)
      });
      form.reset();
      dialog.close();
      await loadTimeline();
    } catch (error) {
      console.warn('No se pudo crear el documento en Timeline.', error);
      say(errorMessage(error), 'text-error');
    } finally {
      submit.disabled = false;
    }
  });

  trigger.addEventListener('click', () => {
    say('');
    dialog.showModal();
  });
}

if (trigger) {
  wire(buildDialog());
  onAuthStateChanged(auth, (user) => { currentUser = user; });
}
