import { db } from './firebase-client.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

async function getPublicIp() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`IP lookup returned ${response.status}`);
    const result = await response.json();
    return typeof result.ip === 'string' ? result.ip : 'No disponible';
  } catch (error) {
    console.warn('No se pudo consultar la IP pública del acceso.', error);
    return 'No disponible';
  } finally {
    window.clearTimeout(timeout);
  }
}

function getDeviceDetails() {
  const userAgent = navigator.userAgent || 'No disponible';
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const tipo = isTablet ? 'tableta' : /Mobi|Android|iPhone|iPod/i.test(userAgent) ? 'móvil' : 'escritorio';
  const plataforma = navigator.userAgentData?.platform || navigator.platform || 'No disponible';
  const navegador = /Edg\//.test(userAgent) ? 'Microsoft Edge'
    : /OPR\//.test(userAgent) ? 'Opera'
      : /Firefox\//.test(userAgent) ? 'Firefox'
        : /Chrome\//.test(userAgent) ? 'Chrome'
          : /Safari\//.test(userAgent) ? 'Safari'
            : 'Otro';

  return { tipo, plataforma, navegador, userAgent };
}

export async function recordLoginAccess(user) {
  const ip = await getPublicIp();
  await addDoc(collection(db, 'Ingresos'), {
    uid: user.uid,
    usuario: user.displayName || user.email || 'Usuario sin correo',
    correo: user.email || '',
    fecha: serverTimestamp(),
    dispositivo: getDeviceDetails(),
    ip
  });
}
