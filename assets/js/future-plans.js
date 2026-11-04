import {
  createFutureDocument,
  deleteFutureDocument,
  getFutureDocuments,
  updateFutureDocument
} from './firestore-collections.js';

const goalForm = document.getElementById('goal-form');
const bucketForm = document.getElementById('bucket-form');
const goalList = document.getElementById('goal-list');
const bucketList = document.getElementById('bucket-list');
const goalSummary = document.getElementById('goals-summary');
const bucketSummary = document.getElementById('bucket-summary');
const feedback = document.getElementById('future-feedback');
const editDialog = document.getElementById('future-edit-dialog');
const editForm = document.getElementById('future-edit-form');
const editFeedback = document.getElementById('future-edit-feedback');
const editDateLabel = document.getElementById('future-edit-date-label');
const plans = { goals: [], dreams: [] };

function report(message, isError = false) {
  feedback.textContent = message;
  feedback.dataset.state = isError ? 'error' : 'success';
  feedback.hidden = !message;
}

function errorMessage(error, action) {
  console.warn(`No se pudo ${action} en la colección Futuro.`, error);
  return error?.code === 'permission-denied'
    ? 'Tu cuenta no tiene permiso para realizar este cambio. Contacta al administrador si necesitas acceso.'
    : `No pudimos ${action}. Revisa tu conexión e inténtalo de nuevo.`;
}

function dateLabel(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function createIconButton(icon, label, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'future-item__icon-button';
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  button.title = label;
  const glyph = document.createElement('span');
  glyph.className = 'material-symbols-outlined';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = icon;
  button.append(glyph);
  return button;
}

function createPlanRow(item, type) {
  const row = document.createElement('li');
  row.className = `future-item${item.done ? ' is-done' : ''}`;
  row.dataset.id = item.id;
  row.dataset.type = type;

  const label = document.createElement('label');
  label.className = 'future-item__label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(item.done);
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute('aria-label', `${item.done ? 'Marcar pendiente' : 'Marcar cumplido'}: ${item.title}`);
  const title = document.createElement('span');
  title.textContent = item.title;
  label.append(checkbox, title);
  row.append(label);

  if (type === 'goal' && item.date) {
    const date = document.createElement('time');
    date.className = 'future-item__date';
    date.dateTime = item.date;
    date.textContent = dateLabel(item.date);
    row.append(date);
  }

  const actions = document.createElement('div');
  actions.className = 'future-item__actions';
  actions.append(
    createIconButton('edit', `Editar ${item.title}`, 'edit'),
    createIconButton('delete', `Eliminar ${item.title}`, 'delete')
  );
  row.append(actions);
  return row;
}

function renderList(list, items, type, noun) {
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('li');
    empty.className = 'future-list__empty';
    empty.textContent = type === 'goal'
      ? 'Todavía no hay metas. Agreguen la primera para empezar a planear.'
      : 'La lista está esperando su primera aventura.';
    list.append(empty);
  } else {
    items.forEach((item) => list.append(createPlanRow(item, type)));
  }

  const completed = items.filter((item) => item.done).length;
  const summary = type === 'goal' ? goalSummary : bucketSummary;
  const plural = items.length === 1 ? noun : `${noun}s`;
  const participle = type === 'goal'
    ? (items.length === 1 ? 'completada' : 'completadas')
    : (items.length === 1 ? 'cumplido' : 'cumplidos');
  summary.textContent = `${completed} de ${items.length} ${plural} ${participle}`;
}

function render() {
  renderList(goalList, plans.goals, 'goal', 'meta');
  renderList(bucketList, plans.dreams, 'dream', 'sueño');
}

async function loadPlans() {
  goalList.innerHTML = '<li class="future-list__empty">Cargando metas…</li>';
  bucketList.innerHTML = '<li class="future-list__empty">Cargando sueños…</li>';
  try {
    const documents = await getFutureDocuments();
    plans.goals = documents.filter((item) => item.type === 'goal');
    plans.dreams = documents.filter((item) => item.type === 'dream');
    render();
  } catch (error) {
    console.warn('No se pudieron consultar los datos de Futuro en Firestore.', error);
    goalList.innerHTML = '<li class="future-list__empty">No pudimos cargar tus metas.</li>';
    bucketList.innerHTML = '<li class="future-list__empty">No pudimos cargar tus sueños.</li>';
    report(error?.code === 'permission-denied'
      ? 'No tienes acceso a esta lista. Contacta al administrador si necesitas ayuda.'
      : 'No pudimos cargar tus metas y sueños. Revisa tu conexión e inténtalo de nuevo.', true);
  }
}

function addItem(form, type) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    if (!title) return;
    submit.disabled = true;
    report(type === 'goal' ? 'Guardando tu meta…' : 'Guardando tu sueño…');
    try {
      const id = await createFutureDocument({ type, title, date: type === 'goal' ? String(data.get('date') || '') : '' });
      const item = { id, type, title, date: type === 'goal' ? String(data.get('date') || '') : '', done: false };
      (type === 'goal' ? plans.goals : plans.dreams).unshift(item);
      render();
      form.reset();
      report(type === 'goal' ? 'Meta agregada a tu lista.' : 'Sueño agregado a tu lista.');
      form.querySelector('input[name="title"]').focus();
    } catch (error) {
      report(errorMessage(error, 'guardar el elemento'), true);
    } finally {
      submit.disabled = false;
    }
  });
}

addItem(goalForm, 'goal');
addItem(bucketForm, 'dream');

document.addEventListener('change', async (event) => {
  const checkbox = event.target.closest('.future-item__label input[data-action="toggle"]');
  if (!checkbox) return;
  const row = checkbox.closest('.future-item');
  const items = row.dataset.type === 'goal' ? plans.goals : plans.dreams;
  const item = items.find(({ id }) => id === row.dataset.id);
  if (!item) return;
  const nextValue = checkbox.checked;
  checkbox.disabled = true;
  try {
    await updateFutureDocument(item.id, { done: nextValue });
    item.done = nextValue;
    render();
    const status = row.dataset.type === 'goal'
      ? (nextValue ? 'Meta marcada como cumplida.' : 'Meta marcada como pendiente.')
      : (nextValue ? 'Sueño marcado como cumplido.' : 'Sueño marcado como pendiente.');
    report(status);
  } catch (error) {
    checkbox.checked = item.done;
    report(errorMessage(error, 'actualizar el estado'), true);
  } finally {
    checkbox.disabled = false;
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('.future-item__icon-button[data-action]');
  if (!button) return;
  const row = button.closest('.future-item');
  const items = row.dataset.type === 'goal' ? plans.goals : plans.dreams;
  const item = items.find(({ id }) => id === row.dataset.id);
  if (!item) return;

  if (button.dataset.action === 'edit') {
    editForm.elements.id.value = item.id;
    editForm.elements.type.value = row.dataset.type;
    editForm.elements.title.value = item.title;
    editForm.elements.date.value = item.date || '';
    editDateLabel.hidden = row.dataset.type !== 'goal';
    editFeedback.textContent = '';
    editDialog.showModal();
    editForm.elements.title.focus();
    return;
  }

  if (!window.confirm(`¿Eliminar “${item.title}” de tu lista? Esta acción no se puede deshacer.`)) return;
  button.disabled = true;
  try {
    await deleteFutureDocument(item.id);
    const key = row.dataset.type === 'goal' ? 'goals' : 'dreams';
    plans[key] = plans[key].filter(({ id }) => id !== item.id);
    render();
    report(row.dataset.type === 'goal' ? 'Meta eliminada de tu lista.' : 'Sueño eliminado de tu lista.');
  } catch (error) {
    button.disabled = false;
    report(errorMessage(error, 'eliminar el elemento'), true);
  }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = editForm.querySelector('[type="submit"]');
  const data = new FormData(editForm);
  const type = String(data.get('type'));
  const key = type === 'goal' ? 'goals' : 'dreams';
  const item = plans[key].find(({ id }) => id === data.get('id'));
  const title = String(data.get('title') || '').trim();
  if (!item || !title) return;
  submit.disabled = true;
  editFeedback.textContent = 'Guardando cambios…';
  try {
    const date = type === 'goal' ? String(data.get('date') || '') : '';
    await updateFutureDocument(item.id, { title, date });
    item.title = title;
    item.date = date;
    editDialog.close();
    render();
    report('Cambios guardados.');
  } catch (error) {
    editFeedback.textContent = errorMessage(error, 'actualizar el elemento');
  } finally {
    submit.disabled = false;
  }
});

document.querySelectorAll('#future-edit-close, #future-edit-cancel').forEach((button) => {
  button.addEventListener('click', () => editDialog.close());
});
editDialog.addEventListener('click', (event) => {
  if (event.target === editDialog) editDialog.close();
});

loadPlans();
