# UT-GEST — PWA, Service Worker y Cache API

## Estructura

- `index.html`: documento principal. En el `<head>` referencia `./manifest.json` y carga `./pwa.js` directamente desde el `<head>` para iniciar el registro sin esperar a scripts externos.
- `manifest.json`: identidad, nombre, `start_url`, `scope`, colores e iconos instalables.
- `pwa.js`: registra el Service Worker, especifica explícitamente el ámbito, indica estado online/offline, busca actualizaciones y escribe mensajes de diagnóstico en la consola.
- `service-worker.js`: implementa la Cache API, precache del shell, limpieza de versiones y estrategias de respuesta para solicitudes GET.
- `script.js`: interacción de los módulos de la maqueta; no contiene un panel de control de caché.

## Ejecutar correctamente

El Service Worker no se instala al abrir `index.html` mediante `file://`. Debe servirse en HTTPS o en `localhost`.

### Opción A: VS Code

1. Abre la carpeta `ut-gest.github.io-main` en VS Code.
2. Inicia un servidor local, por ejemplo con la extensión Live Server.
3. Abre la URL HTTP de `localhost` que muestra Live Server.

### Opción B: Python

Desde la carpeta que contiene `index.html`, ejecuta:

```bash
python -m http.server 8000
```

Después abre `http://localhost:8000/`.

## Verlo en Chrome/Edge DevTools

1. Abre la página desde `localhost` o desde la publicación HTTPS.
2. Pulsa F12 y abre **Application**.
3. En **Manifest**, comprueba nombre, `start_url`, ámbito e iconos.
4. En **Service Workers**, comprueba que `service-worker.js` tenga estado `activated` y que el scope corresponda a la carpeta de la PWA.
5. En **Storage → Cache Storage**, abre `ut-gest-shell-v5` y verifica `index.html`, `styles.css`, `script.js`, `pwa.js`, `manifest.json` e iconos.
6. Recarga una vez después de la primera instalación para que la página ya quede controlada por el Service Worker.
7. En **Network**, activa **Offline** y recarga. El shell local debe cargarse desde caché. Los formularios siguen siendo demostrativos y no guardan datos; las gráficas pueden no mostrarse si Chart.js no se había descargado y cacheado durante una sesión online.

## Si no aparece

- Si abriste el archivo directamente, cambia a `localhost`/HTTPS: `file://` no permite instalar el Service Worker.
- En Network verifica que `manifest.json`, `service-worker.js` y `pwa.js` respondan `200`, sin `404`.
- En Console busca mensajes que empiecen con `[UT-GEST PWA]`.
- En DevTools → Application → Service Workers puedes desregistrar una versión de prueba antigua y recargar. También puedes limpiar Cache Storage para empezar de cero.
- En GitHub Pages, publica el contenido de esta carpeta de forma que `index.html`, `manifest.json`, `service-worker.js`, `pwa.js`, `script.js`, `styles.css` e `icons/` queden juntos en la ruta publicada.

## Estrategias

- Navegación: `network-first`; si falla la red, responde con el `index.html` precargado.
- Archivos del shell: `cache-first`; usa el recurso guardado y descarga/guarda la copia si no existe.
- Recursos externos permitidos: Chart.js y fuentes se guardan al solicitarse a los dominios declarados. Para probarlos offline, abre y recarga la app al menos una vez con conexión antes de activar Offline.
- La Cache API no almacena envíos de formularios: el Service Worker ignora solicitudes distintas de `GET`.
