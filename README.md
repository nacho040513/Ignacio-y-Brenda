# Proyecto web de Ignacio & Brenda

Sitio web estático para compartir nuestra historia, recuerdos, lugares, sueños y perfil personal.

## Estructura final

- `index.html`: portada principal del sitio.
- `pages/`: todas las páginas de contenido.
  - `pages/inicio.html`
  - `pages/lugares.html`
  - `pages/futuro.html`
  - `pages/perfiles.html`
  - `pages/album.html`
  - `pages/timeline.html`
- `assets/css/styles.css`: estilos globales de la web.
- `assets/js/main.js`: scripts ligeros para comportamientos básicos.
- `assets/img/`: imágenes y previews del proyecto.
- `README.md`: documentación del proyecto.

## SEO básico

La portada incluye:

- `title`
- `meta description`
- estructura semántica con `header`, `main`, `section`, `footer`

Esto ayuda a que el sitio se vea más profesional y sea mejor indexado por buscadores.

## Cómo subir a Hostinger

1. En el Administrador de archivos de Hostinger, abre `public_html`.
2. Sube `index.html`, las carpetas `pages/`, `assets/` y `api/` conservando esta estructura.
3. Habilita PHP 8.1 o superior con cURL y permisos de escritura para `assets/img/Albun` y `assets/img/Ubicaciones`.
4. Los formularios envían las fotos y videos a `api/upload-media.php`. El endpoint verifica el token de Firebase y el rol `admin`, guarda el archivo en Hostinger y devuelve una ruta relativa que se registra en Firestore.
5. Configura `upload_max_filesize` en al menos `100M` y `post_max_size` en al menos `110M` para contemplar el cuerpo multipart del formulario.

El sitio es estático, pero esta carga usa el endpoint PHP del hosting. No subas `api/` dentro de otra carpeta: debe quedar como `public_html/api/upload-media.php`.

## Vista local

Puedes abrir la portada directamente en el navegador o ejecutar:

```bash
python3 -m http.server 8000
```

Luego abre:

```text
http://localhost:8000/
```

## Nota

La interfaz no requiere Node.js, npm ni un framework. Para las cargas de medios, Hostinger debe ejecutar el endpoint PHP que está en `api/`.
