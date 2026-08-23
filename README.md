# vbuilder

A local-first visual canvas that turns a single-page design into vanilla HTML, CSS, JavaScript, and local assets.

## Run locally

Because VBuilder uses browser storage and local file APIs, serve the folder with any static HTTP server:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Version 1

- Fluid desktop output at any desktop width (1440 × 900 is the reference frame)
- Tablet and mobile canvas presets
- Automatic responsive adaptation with manual breakpoint overrides
- Text, images, shapes, sections, and visual buttons
- Undo/redo and keyboard movement
- Local autosave in IndexedDB
- Editable `.vbuilder` project files
- Client-side ZIP export with `index.html`, `styles.css`, `script.js`, and `assets/`

No project data or images are uploaded to a server.
