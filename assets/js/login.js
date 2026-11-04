import { auth } from './firebase-client.js';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import './ambient-hearts.js';
import { recordLoginAccess } from './access-logs.js';

const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');
const submit = form.querySelector('button[type="submit"]');
const password = form.elements.password;
const passwordToggle = document.getElementById('toggle-password');
const allowedPages = new Set(['inicio.html', 'timeline.html', 'lugares.html', 'album.html', 'futuro.html', 'perfiles.html']);
const requestedPage = new URLSearchParams(location.search).get('next');
const destination = allowedPages.has(requestedPage) ? requestedPage : 'inicio.html';
let isSubmittingLogin = false;

function showMessage(text, type = '') {
  message.textContent = text;
  message.className = `login-message ${type}`;
}

passwordToggle.addEventListener('click', () => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  passwordToggle.textContent = visible ? 'Ocultar' : 'Mostrar';
  passwordToggle.setAttribute('aria-label', `${visible ? 'Ocultar' : 'Mostrar'} contraseña`);
  passwordToggle.setAttribute('aria-pressed', String(visible));
});

onAuthStateChanged(auth, (user) => {
  if (user && !isSubmittingLogin) window.location.replace(destination);
  else document.documentElement.classList.remove('auth-pending');
}, () => {
  document.documentElement.classList.remove('auth-pending');
  showMessage('No pudimos comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.', 'error');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  isSubmittingLogin = true;
  submit.disabled = true;
  showMessage('Verificando acceso…');
  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    try {
      showMessage('Registrando este acceso…');
      await recordLoginAccess(credential.user);
    } catch (error) {
      console.error('No se pudo guardar el ingreso en Firestore.', error);
      showMessage('Iniciamos sesión, pero no pudimos guardar el registro de acceso.', 'error');
    }
    showMessage('Acceso correcto. Redirigiendo…', 'success');
    window.location.replace(destination);
  } catch (error) {
    isSubmittingLogin = false;
    showMessage(error.code === 'auth/invalid-credential'
      ? 'Correo o contraseña incorrectos.'
      : 'No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.', 'error');
    submit.disabled = false;
  }
});
