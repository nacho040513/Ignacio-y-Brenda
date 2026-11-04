import { auth } from './firebase-client.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import './ambient-hearts.js';

const pages = [
  { file: 'pages/inicio.html', label: 'Inicio', icon: '<path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.8v-6h-5.4v6H3.5a.5.5 0 0 1-.5-.5z"/>' },
  { file: 'pages/timeline.html', label: 'Timeline', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>' },
  { file: 'pages/lugares.html', label: 'Lugares', icon: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>' },
  { file: 'pages/album.html', label: 'Álbum', icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>' },
  { file: 'pages/futuro.html', label: 'Futuro', icon: '<path d="M5 21V4m0 1c5-4 9 4 14 0v11c-5 4-9-4-14 0"/>' },
  { file: 'pages/perfiles.html', label: 'Nosotros', icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1z"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14a5.5 5.5 0 0 1 3.5 5v1"/>' }
];

const isInsidePages = /\/pages\//.test(window.location.pathname);
const currentFile = window.location.pathname.split('/').pop() || 'index.html';
const isLoginPage = currentFile === 'login.html';
const linkFor = (file) => isInsidePages ? `../${file}` : file;
const loginUrl = linkFor('pages/login.html');

function renderNavigation(user) {
  const email = String(user.email || 'Sesión activa').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const links = pages.map(({ file, label }) => {
    const current = currentFile === file.split('/').pop();
    return `<a href="${linkFor(file)}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  const mobileLinks = pages.map(({ file, label, icon }) => {
    const current = currentFile === file.split('/').pop();
    return `<a href="${linkFor(file)}"${current ? ' aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg><span>${label}</span></a>`;
  }).join('');
  const navigation = document.createElement('header');
  navigation.className = 'site-navigation';
  navigation.innerHTML = `
    <div class="site-navigation__bar">
      <a class="site-navigation__brand" href="${linkFor('pages/inicio.html')}">Ignacio &amp; Brenda</a>
      <nav class="site-navigation__links" aria-label="Navegación principal">${links}</nav>
      <div class="site-navigation__session"><span class="site-navigation__email" title="${email}">${email}</span><button class="site-navigation__logout" type="button" aria-label="Cerrar sesión" title="Cerrar sesión"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg></button></div>
      <button class="site-navigation__toggle" type="button" aria-expanded="false" aria-controls="site-navigation-menu">Menú <span aria-hidden="true">☰</span></button>
    </div>
      <nav class="site-navigation__mobile-links" id="site-navigation-menu" aria-label="Navegación rápida">${mobileLinks}</nav>`;
  document.querySelectorAll('body > header, body > nav').forEach((element) => {
    element.classList.add('legacy-navigation');
    element.setAttribute('aria-hidden', 'true');
  });
  document.body.classList.add('has-site-navigation');
  document.body.prepend(navigation);
  const toggle = navigation.querySelector('.site-navigation__toggle');
  toggle.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  navigation.querySelectorAll('.site-navigation__mobile-links a').forEach((link) => {
    link.addEventListener('click', () => navigation.classList.remove('is-open'));
  });
  navigation.querySelector('.site-navigation__logout').addEventListener('click', async () => {
    await signOut(auth);
    window.location.replace(loginUrl);
  });
}

let firstAuthState = true;
let resolveInitialAuth;
const initialAuthState = new Promise((resolve) => { resolveInitialAuth = resolve; });
onAuthStateChanged(auth, (currentUser) => {
  if (firstAuthState) {
    firstAuthState = false;
    resolveInitialAuth(currentUser);
    return;
  }
  if (!currentUser && !isLoginPage) window.location.replace(loginUrl);
  if (currentUser && isLoginPage) window.location.replace(new URLSearchParams(location.search).get('next') || 'inicio.html');
}, () => {
  if (firstAuthState) {
    firstAuthState = false;
    resolveInitialAuth(null);
  }
});
const user = await initialAuthState;

if (isLoginPage) {
  if (user) window.location.replace(new URLSearchParams(location.search).get('next') || 'inicio.html');
  else document.documentElement.classList.remove('auth-pending');
} else if (!user) {
  const next = `${window.location.pathname.split('/').pop()}${window.location.search}`;
  window.location.replace(`${loginUrl}?next=${encodeURIComponent(next)}`);
} else {
  renderNavigation(user);
  document.documentElement.classList.remove('auth-pending');
}
