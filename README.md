# VBuilder 2

A local-first, Figma-style canvas editor that turns a visual design into real,
shippable code. Design on a true canvas — frames, auto layout, gradients,
shadows, animation, prototype logic — then export **HTML/CSS/JS**, a **React**
component, **Tailwind** markup, or a **Node/Express** bundle.

Nothing is uploaded. The project lives in IndexedDB in your browser and can be
saved as an editable `.vbuilder` file.

## Run

```bash
npm start          # python3 -m http.server 4173
# open http://localhost:4173
```

No build step, no bundler, no runtime dependencies. ES modules only.

## Check

```bash
npm run lint       # import graph + syntax across every module
npm test           # jsdom suites: model assertions + full editor smoke
```

`npm test` needs the dev dependency once: `npm install`.

## Layout

```
index.html          app shell
styles.css          editor theme (dark, one blue accent)
js/
  core.js           document model, state, history, storage, geometry, snapping, auto layout
  dom.js            cached element references + tiny element builder
  icons.js          inlined icon set, icon library, text presets, gradient presets, blocks
  canvas.js         render, viewport, selection, drag/resize/rotate, marquee, smart guides, inline text edit
  panels.js         layers / assets / elements / pages panels, context menus, toasts, tooltips, modals
  inspector.js      Design, Prototype and Inspect tabs
  export.js         CSS, HTML, runtime JS, React, Tailwind, Node bundle, ZIP
  starter.js        the template a new project opens with
  main.js           commands, shortcuts, command palette, wiring
tools/
  lint-imports.mjs  catches helpers used without being imported
  test-model.mjs    value-level assertions for alignment, layout, corners, responsive, export
  test-editor.mjs   end-to-end editor smoke over jsdom
```

## Canvas

- **Tools (Figma-style):** pick a tool (V, F, R, O, T, B, L …) then click or
  click-drag on the canvas to place it exactly where you want; the tool returns
  to Move afterwards. Pan with H / Space, alt-click selects the parent layer.
- **Navigation:** ⌘+scroll or pinch to zoom, two-finger scroll or Space+drag to
  pan, `0` fit, `1` 100%, `+`/`−` step.
- **Selection:** click, shift-click, marquee, `⌘A`. Multi-select bounding box
  with 8 resize handles and a rotation handle.
- **Smart guides** snap edges and centres to neighbouring layers and to the
  page, with optional grid snapping and rulers.
- **Frames nest.** Drop a layer onto a frame to move it inside; drop it outside
  to move it back out. `⌘G` groups, `⌘⇧G` ungroups.
- **Auto layout** on frames: row or column, gap, per-side padding, align,
  justify, and `fill` children. It maps one-to-one to flexbox on export.
- **Z-order:** `]` / `[` forward and back, `⌘]` / `⌘[` to front and back.
- **Inline text editing:** double-click or `Enter`. Placed text opens in edit mode
  immediately — just start typing; `Enter`, `Esc` or clicking away commits.
- **Fonts:** the Font menu connects to Google Fonts (search any family, Persian
  fonts included) and accepts your own woff2/ttf/otf files, stored inside the
  project and embedded in every export.
- **Layers:** drag rows with an insertion indicator (top / bottom / inside a
  frame), double-click a name to rename inline, right-click for the layer menu.
- **Starting over:** the `+` button offers a blank project or the demo template;
  a fresh browser always opens with the demo.
- **Images:** any common format (png, jpg, webp, gif, svg, avif, bmp, ico, tiff)
  can be uploaded or dropped on the canvas, even when the OS reports no MIME type;
  the layer keeps the image's real aspect ratio.

## Right panel

- **Design** — align and distribute, position, size with ratio lock, rotation
  and flip, responsive behaviour and constraints, per-corner radius with a real
  link toggle, opacity, blend mode, auto layout, unlimited fills (solid, linear
  and radial gradients with stops), strokes with inside/centre/outside align,
  effects (drop shadow, inner shadow, layer blur, background blur), full
  typography, image and icon controls, layer state and z-order.
- **Prototype** — interactions (open link, scroll to element, show/hide, play
  animation, go to page, scroll to top) and animation (12 effects, four
  triggers, duration, delay, eight easings, repeat) with an in-editor preview.
- **Inspect** — element metrics, the generated CSS for the selection with a
  copy button, and export controls.

## Left panel

Layers (nested tree, drag to reorder and reparent, visibility and lock
toggles, search), Assets (upload, reuse, drag onto the canvas), Elements
(shapes, text styles, ready-made blocks, gradient presets, ~140 icons), and
Pages (multi-page documents with rename, duplicate, reorder).

Both side panels resize by dragging the thin splitters next to them
(double-click a splitter to reset). Clicking the active rail button collapses
the left panel; the chevron in the inspector tabs hides the right panel and a
small edge tab brings it back.

## Export

| Format | Contents |
| --- | --- |
| HTML + CSS + JS | `index.html`, `styles.css`, `script.js`, `assets/`, README, project JSON |
| React | `<Page>.jsx` + the same stylesheet and runtime |
| Tailwind | single `index.html` using utility classes |
| Node.js | `server.js` (Express), `package.json`, `public/` |

Desktop output is fluid: layers are positioned with percentages and typography
with container-query units, so the page scales with the viewport. Tablet
(≤1024px) and mobile (≤767px) overrides are emitted as media queries.
Animations become CSS keyframes; scroll triggers use `IntersectionObserver`,
and `prefers-reduced-motion` is respected. Interactive layers export as real
anchors or `data-action` hooks handled by the generated runtime.

## Shortcuts

Press `?` in the app for the full list, or `⌘K` for the command palette.
