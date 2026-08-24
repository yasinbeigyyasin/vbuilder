/* VBuilder 2 — application wiring: commands, shortcuts, command palette, boot */

import { dom, bindRefs, $, $$, el } from "./dom.js";
import { iconSvg, ICONS, BLOCKS, TEXT_PRESETS, GRADIENTS } from "./icons.js";
import * as C from "./core.js";
import { on, emit } from "./core.js";
import * as canvas from "./canvas.js";
import * as panels from "./panels.js";
import * as inspector from "./inspector.js";
import * as exporter from "./export.js";
import { createStarterProject } from "./starter.js";
import * as F from "./fonts.js";
import { toast, showMenu, openModal, closeModal, confirmDialog, promptDialog, isModalOpen, isMenuOpen, closeMenu } from "./panels.js";

let exportFormat = "html";
const PREFS_KEY = "vbuilder-prefs-v2";

/* ------------------------------------------------------------------ render */

export function refresh(opts = {}) {
  syncChrome();
  canvas.render();
  panels.renderAllPanels();
  if (!opts.skipInspector) inspector.render();
  updateStatus();
}

/** Keeps the fixed chrome (device tabs, pref toggles, panel collapse) in sync with state. */
function syncChrome() {
  $$("#deviceTabs .device-tab").forEach((b) => {
    const on = b.dataset.device === C.state.device;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", String(on));
  });
  [dom.gridToggle, dom.snapToggle, dom.rulerToggle, dom.guidesToggle, dom.outlineToggle].forEach((b) => {
    if (b?.dataset.pref) b.classList.toggle("active", !!C.state.prefs[b.dataset.pref]);
  });
  const dockFor = { ellipse: "shape", line: "shape", arrow: "shape", star: "shape", image: "media", icon: "media" };
  $$("#toolDock .tool").forEach((b) => {
    const t = C.state.tool;
    b.classList.toggle("active", b.dataset.tool === t || (!!C.NODE_TYPES[t] && b.dataset.tool === (dockFor[t] || t)));
  });
  dom.canvasViewport?.classList.toggle("is-arming", !!C.NODE_TYPES[C.state.tool]);
  document.body.classList.toggle("left-hidden", !!C.state.leftCollapsed);
  document.body.classList.toggle("right-hidden", !!C.state.rightCollapsed);
}

function updateStatus() {
  if (!dom.statusBar) return;
  const p = C.page();
  dom.statusBar.innerHTML = [
    `<span>${C.escapeHtml(C.project().name)}</span>`,
    `<span class="dot"></span>`,
    `<span>${C.escapeHtml(p.name)} · ${p.nodes.length} layers</span>`,
    `<span class="dot"></span>`,
    `<span>${C.state.selection.length ? `${C.state.selection.length} selected` : "No selection"}</span>`,
    `<span class="spacer"></span>`,
    `<span>${C.DEVICES[C.state.device].label}</span>`,
  ].join("");
}

/* ---------------------------------------------------------------- elements */

function insertionParent() {
  // Only an explicitly selected frame receives new children; anything else
  // inserts at the page level where the user is looking.
  const s = C.singleSelected();
  return s?.type === "frame" ? s : null;
}

/** Centre of the visible viewport, in canvas coordinates. */
function viewportCentre() {
  const r = dom.canvasViewport?.getBoundingClientRect();
  if (!r || !r.width) return { x: C.pageRect().width / 2, y: C.pageRect().height / 2 };
  return canvas.toCanvasPoint(r.left + r.width / 2, r.top + r.height / 2);
}

function placement(defaults) {
  const parent = insertionParent();
  const size = C.pageRect();
  const count = C.page().nodes.length;
  const c = viewportCentre();
  const cascade = (count % 6) * 14;
  const base = {
    x: Math.round(c.x - C.num(defaults.width, 240) / 2 + cascade),
    y: Math.round(c.y - C.num(defaults.height, 120) / 2 + cascade),
    ...defaults,
  };
  if (parent) {
    const pr = C.propsOf(parent);
    base.x = Math.round(C.num(pr.layout ? 0 : 16));
    base.y = Math.round(C.num(pr.layout ? 0 : 16));
    if (Number.isFinite(base.width)) base.width = Math.min(base.width, Math.max(20, pr.width - 32));
    if (Number.isFinite(base.height)) base.height = Math.min(base.height, Math.max(20, pr.height - 32));
  }
  return { base, parent };
}

export function addElement(type, overrides = {}, extra = {}) {
  const preset = { frame: { width: 640, height: 360 }, rect: {}, ellipse: {}, line: { width: 320 }, arrow: {}, star: {}, text: {}, button: {}, image: {}, icon: {} }[type] || {};
  const { base, parent } = placement({ ...preset, ...overrides });
  const node = C.makeNode(type, `New ${C.NODE_TYPES[type].label}`, base, {
    parentId: parent?.id || null,
    content: type === "button" ? "Get started" : "",
    ...extra,
  });
  C.change(() => { C.page().nodes.push(node); C.setSelection([node.id]); }, `add ${type}`);
  if (type === "text" || (type === "button" && !extra.content)) canvas.beginTextEdit(node.id);
  return node;
}

/* ------------------------------------------------- Figma-style tool arming */

/** Arm a creation tool: the next canvas click/drag places the element there. */
export function armTool(type, preset = null) {
  C.state.tool = type;
  C.state.toolPreset = preset;
  refresh({ skipInspector: true });
}

export function disarmTool() {
  if (C.state.tool !== "select" && C.state.tool !== "hand") {
    C.state.tool = "select";
    C.state.toolPreset = null;
    refresh({ skipInspector: true });
  }
}

/** Place an armed tool at a canvas point (called by the canvas on click). */
export function placeArmedTool(type, point, preset = null) {
  const parent = C.frameAtPoint(point.x, point.y) || null;
  const d = C.defaultsFor(type);
  const o = preset ? { size: preset.size, weight: preset.weight, lineHeight: preset.lineHeight, letterSpacing: preset.letterSpacing || 0, transform: preset.transform || "none" } : {};
  const w = C.num(o.size ? o.size * 12 : d.width, 240);
  const h = C.num(o.size ? o.size * (preset.lineHeight || 1.35) * 2 : d.height, 120);
  const base = { ...o, width: w, height: h, x: Math.round(point.x - w / 2), y: Math.round(point.y - h / 2) };
  if (parent) {
    const pr = C.absoluteRect(parent);
    const inset = C.strokeInset(parent);
    base.x -= Math.round(pr.x + inset);
    base.y -= Math.round(pr.y + inset);
  }
  const node = C.makeNode(type, `New ${C.NODE_TYPES[type].label}`, base, {
    parentId: parent?.id || null,
    content: type === "button" ? "Get started" : "",
  });
  C.change(() => { C.page().nodes.push(node); C.setSelection([node.id]); }, `add ${type}`);
  C.state.tool = "select";
  C.state.toolPreset = null;
  refresh({ skipInspector: true });
  if (type === "text") canvas.beginTextEdit(node.id);
  return node;
}

/** Image tool: click sets the drop point, then the file picker opens. */
export function requestImageAt(point = null) {
  if (dom.fileInput) {
    if (point) dom.fileInput.dataset.point = `${Math.round(point.x)},${Math.round(point.y)}`;
    else delete dom.fileInput.dataset.point;
    dom.fileInput.click();
  }
}

export const addTextWithPreset = (preset) => addElement("text", {
  size: preset.size, weight: preset.weight, lineHeight: preset.lineHeight, letterSpacing: preset.letterSpacing || 0,
  transform: preset.transform || "none", width: Math.round(preset.size * 12), height: Math.round(preset.size * preset.lineHeight * 2),
}, {});

export const addIcon = (name) => addElement("icon", { icon: name, fills: [{ type: "solid", color: "#e8eaef", opacity: 100 }] });

export const addGradientRect = (pair) => addElement("rect", {
  width: 320, height: 200,
  fills: [{ type: "linear", angle: 135, opacity: 100, stops: [{ at: 0, color: pair[0] }, { at: 100, color: pair[1] }] }],
});

export function insertBlock(index) {
  const block = BLOCKS[index];
  if (!block) return;
  const size = C.pageRect();
  C.change(() => {
    const created = new Map();
    block.items.forEach((spec) => {
      const node = C.makeNode(spec.type, spec.name, { ...spec.base, x: C.num(spec.base.x) + Math.round(size.width * 0.04), y: C.num(spec.base.y) + 80 },
        { parentId: spec.parent ? created.get(spec.parent)?.id || null : null, content: spec.content ?? "" });
      created.set(spec.key, node);
      C.page().nodes.push(node);
    });
    C.setSelection([created.get("root")?.id].filter(Boolean));
  }, `insert ${block.label}`);
  toast(`${block.label} inserted`, "success");
}

/* ------------------------------------------------------------------ images */

/* Accept any common image format, even when the OS reports no MIME type. */
const EXT_MIME = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon", tif: "image/tiff", tiff: "image/tiff",
};
const isImageFile = (f) => {
  if (f.type && f.type !== "application/octet-stream") return f.type.startsWith("image/");
  return !!EXT_MIME[(f.name.split(".").pop() || "").toLowerCase()];
};
const fixMime = (dataUrl, name) => {
  const mime = EXT_MIME[(name.split(".").pop() || "").toLowerCase()];
  return mime && /^data:(application\/octet-stream|binary\/octet-stream|)/.test(dataUrl) ? dataUrl.replace(/^data:[^;,]*/, `data:${mime}`) : dataUrl;
};
const probeSize = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
  img.onerror = () => resolve({ w: 0, h: 0 });
  img.src = src;
});

export async function addNodeFromAsset(asset, point = null) {
  const size = C.pageRect();
  const ratio = asset.w > 4 && asset.h > 4 ? asset.h / asset.w : 0.66;
  const w = Math.max(80, Math.min(480, Math.round(size.width * 0.34)));
  const { base, parent } = placement({
    width: w, height: Math.max(60, Math.round(w * ratio)),
    ...(point ? { x: Math.round(point.x), y: Math.round(point.y) } : {}),
  });
  const node = C.makeNode("image", asset.name.replace(/\.[^.]+$/, "") || "Image", base, {
    parentId: parent?.id || null, assetId: asset.id, alt: asset.name.replace(/\.[^.]+$/, ""),
  });
  C.change(() => { C.page().nodes.push(node); C.setSelection([node.id]); }, "add image");
}

export async function addImageFiles(files, point = null, replaceId = null) {
  const list = files.filter(isImageFile);
  const skipped = files.length - list.length;
  if (skipped > 0) toast(`${skipped} file(s) skipped — not an image`, "error");
  if (!list.length) return;
  for (const file of list) {
    const src = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(fixMime(String(reader.result), file.name));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!src) { toast(`Could not read ${file.name}`, "error"); continue; }
    const { w, h } = await probeSize(src);
    if (!w && !h && file.type !== "image/svg+xml") { toast(`${file.name} could not be decoded as an image`, "error"); continue; }
    if (replaceId) {
      const node = C.node(replaceId);
      if (!node) continue;
      C.change(() => {
        const existing = C.project().assets.find((a) => a.id === node.assetId);
        if (existing) { existing.src = src; existing.name = file.name; existing.w = w; existing.h = h; }
        else {
          const a = { id: C.uid("img"), name: file.name, src, w, h, sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB` };
          C.project().assets.push(a);
          node.assetId = a.id;
        }
        node.alt = node.alt || file.name.replace(/\.[^.]+$/, "");
      }, "replace image");
      toast("Image replaced", "success");
      continue;
    }
    const a = { id: C.uid("img"), name: file.name, src, w, h, sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB` };
    C.change(() => { C.project().assets.push(a); }, "add asset");
    await addNodeFromAsset(a, point);
    toast("Image placed on canvas", "success");
  }
}

/* ------------------------------------------------------- clipboard & edit */

export function copySelection() {
  const nodes = C.selected();
  if (!nodes.length) return;
  C.state.clipboard = C.deepClone(nodes);
  toast(`${nodes.length} layer(s) copied`, "success");
}

export function cutSelection() { copySelection(); deleteSelected(true); }

export function pasteClipboard() {
  if (!C.state.clipboard?.length) { toast("Clipboard is empty", "error"); return; }
  C.change(() => {
    const map = new Map();
    const clones = C.state.clipboard.map((raw) => {
      const clone = C.normalizeNode(C.deepClone(raw));
      map.set(raw.id, C.uid(clone.type.slice(0, 3)));
      return clone;
    });
    clones.forEach((clone) => {
      clone.id = map.get(clone.id) || clone.id;
      clone.parentId = map.get(clone.parentId) || (C.node(clone.parentId) ? clone.parentId : null);
      C.setProps(clone, { x: C.num(C.propsOf(clone).x) + 24, y: C.num(C.propsOf(clone).y) + 24 });
      C.page().nodes.push(clone);
    });
    C.setSelection(clones.map((c) => c.id));
  }, "paste");
  toast("Pasted", "success");
}

export function duplicateSelected() {
  const nodes = C.selected();
  if (!nodes.length) return;
  C.change(() => {
    const map = new Map();
    const source = nodes.concat(nodes.flatMap((n) => C.descendantsOf(n.id)));
    const clones = source.map((n) => { const c = C.deepClone(n); map.set(n.id, C.uid(n.type.slice(0, 3))); return c; });
    clones.forEach((clone, i) => {
      clone.id = map.get(clone.id) || clone.id;
      clone.parentId = map.get(clone.parentId) || (C.node(clone.parentId) ? clone.parentId : null);
      if (source[i] && !source[i].parentId) C.setProps(clone, { x: C.num(C.propsOf(clone).x) + 24, y: C.num(C.propsOf(clone).y) + 24 });
      if (i === 0) clone.name = `${clone.name} copy`;
      C.page().nodes.push(clone);
    });
    C.setSelection([map.get(nodes[0].id)].filter(Boolean));
  }, "duplicate");
  toast("Duplicated", "success");
}

export function deleteSelected(silent = false) {
  const nodes = C.selected();
  if (!nodes.length) return;
  C.change(() => {
    nodes.forEach((n) => {
      C.descendantsOf(n.id).forEach((child) => {
        const pos = {};
        C.DEVICE_ORDER.forEach((d) => { pos[d] = C.absoluteRect(child, d); });
        child.parentId = null;
        C.DEVICE_ORDER.forEach((d) => C.setProps(child, { x: Math.round(pos[d].x), y: Math.round(pos[d].y) }, d));
      });
    });
    const ids = new Set(nodes.flatMap((n) => [n.id, ...C.descendantsOf(n.id).map((d) => d.id)]));
    C.page().nodes = C.page().nodes.filter((n) => !ids.has(n.id));
    C.setSelection([]);
  }, "delete");
  if (!silent) toast(`${nodes.length} layer(s) deleted`, "success");
}

export function groupSelected() {
  const nodes = C.selected();
  if (nodes.length < 2) { toast("Select two or more layers to group", "error"); return; }
  const box = C.boundingBox();
  C.change(() => {
    const frame = C.makeNode("frame", "Group", {
      x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height),
      fills: [], strokes: [], radius: { tl: 0, tr: 0, br: 0, bl: 0 }, responsiveBehavior: "scale",
    }, { parentId: nodes[0].parentId || null });
    C.page().nodes.push(frame);
    nodes.forEach((n) => {
      const r = C.absoluteRect(n);
      n.parentId = frame.id;
      C.setProps(n, { x: Math.round(r.x - box.x), y: Math.round(r.y - box.y) });
    });
    C.setSelection([frame.id]);
  }, "group");
  toast("Grouped into a frame", "success");
}

export function ungroupSelected() {
  const frames = C.selected().filter((n) => n.type === "frame");
  if (!frames.length) { toast("Select a frame to ungroup", "error"); return; }
  const released = [];
  C.change(() => {
    frames.forEach((frame) => {
      const kids = C.descendantsOf(frame.id).filter((n) => n.parentId === frame.id);
      kids.forEach((child) => {
        const r = C.absoluteRect(child);
        child.parentId = frame.parentId || null;
        C.setProps(child, { x: Math.round(r.x), y: Math.round(r.y) });
        released.push(child.id);
      });
      C.page().nodes = C.page().nodes.filter((n) => n.id !== frame.id);
    });
  }, "ungroup");
  // Keep the released layers selected — losing the selection here breaks every follow-up command.
  C.setSelection(released);
  toast(`Ungrouped ${released.length} layer(s)`, "success");
}

export function nudge(dx, dy) {
  const nodes = C.selected().filter((n) => !n.locked);
  if (!nodes.length) return;
  C.change(() => nodes.forEach((n) => {
    const p = C.propsOf(n);
    C.setProps(n, { x: Math.round(C.num(p.x) + dx), y: Math.round(C.num(p.y) + dy) });
  }), "nudge");
}

export function fitPageHeight() {
  let bottom = 0;
  C.page().nodes.filter((n) => !n.parentId && n.visible).forEach((n) => {
    const r = C.absoluteRect(n);
    bottom = Math.max(bottom, r.y + r.height);
  });
  const height = Math.max(200, Math.round(bottom + 80));
  C.change(() => {
    if (C.state.device === "desktop") C.page().height = height;
    else C.page().responsive[C.state.device] = { ...(C.page().responsive[C.state.device] || {}), height };
  }, "fit height");
  toast(`Frame height set to ${height}px`, "success");
}

export function previewAnimation(ids) {
  ids.forEach((id) => {
    const target = dom.artboard?.querySelector(`[data-id="${id}"]`);
    const n = C.node(id);
    if (!target || !n) return;
    const a = C.propsOf(n).animation;
    target.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }],
      { duration: C.num(a.duration, 600), easing: C.EASINGS[a.easing] || "ease", delay: C.num(a.delay), fill: "both" });
  });
}

/* ------------------------------------------------------------------- pages */

export function switchPage(id) {
  if (C.project().activePageId === id) return;
  C.change(() => { C.project().activePageId = id; }, "switch page");
  C.setSelection([]);
  canvas.fit();
  toast(`Switched to ${C.page().name}`, "success");
}

export function addPage() {
  const p = C.blankPage(`Page ${C.project().pages.length + 1}`, C.page().width, C.page().height);
  p.background = C.page().background;
  C.change(() => { C.project().pages.push(p); C.project().activePageId = p.id; }, "add page");
  C.setSelection([]);
  canvas.fit();
  toast("Page added", "success");
}

export function duplicatePage(id) {
  const source = C.project().pages.find((p) => p.id === id);
  if (!source) return;
  const copy = C.normalizePage(C.deepClone(source));
  copy.id = C.uid("pg");
  copy.name = `${source.name} copy`;
  const map = new Map();
  copy.nodes.forEach((n) => map.set(n.id, C.uid(n.type.slice(0, 3))));
  copy.nodes.forEach((n) => { n.id = map.get(n.id); n.parentId = map.get(n.parentId) || null; });
  C.change(() => { C.project().pages.push(copy); C.project().activePageId = copy.id; }, "duplicate page");
  C.setSelection([]);
  toast("Page duplicated", "success");
}

export async function deletePage(id) {
  if (C.project().pages.length === 1) { toast("A project needs at least one page", "error"); return; }
  const p = C.project().pages.find((x) => x.id === id);
  if (!await confirmDialog("Delete page?", `"${p?.name}" and its ${p?.nodes.length || 0} layers will be removed.`, { confirmLabel: "Delete", danger: true })) return;
  C.change(() => {
    C.project().pages = C.project().pages.filter((x) => x.id !== id);
    if (C.project().activePageId === id) C.project().activePageId = C.project().pages[0].id;
  }, "delete page");
  C.setSelection([]);
  toast("Page deleted", "success");
}

export function setDevice(device) {
  C.state.device = device;
  C.state.view.mode = "fit";
  C.state.view.panX = 0; C.state.view.panY = 0;
  refresh();
  emit("view");
}

export function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(C.state.prefs)); } catch { /* private mode */ }
  refresh();
}

/* ----------------------------------------------------------- context menus */

export function showCanvasMenu(event) {
  const point = canvas.toCanvasPoint(event.clientX, event.clientY);
  const hit = C.nodeAtPoint(point.x, point.y);
  if (hit && !C.state.selection.includes(hit.id)) C.setSelection([hit.id]);
  const has = C.state.selection.length > 0;
  const pref = (key) => () => { C.state.prefs[key] = !C.state.prefs[key]; savePrefs(); };
  showMenu(event, [
    { label: "Add" },
    { label: "Frame", icon: "frame", shortcut: "F", run: () => armTool("frame") },
    { label: "Rectangle", icon: "square", shortcut: "R", run: () => armTool("rect") },
    { label: "Text", icon: "type", shortcut: "T", run: () => armTool("text") },
    { label: "Button", icon: "rectangle-horizontal", shortcut: "B", run: () => armTool("button") },
    { label: "Image…", icon: "image", run: () => armTool("image") },
    ...(has ? [
      { separator: true },
      { label: "Selection" },
      { label: "Copy", icon: "copy", shortcut: "⌘C", run: copySelection },
      { label: "Duplicate", icon: "copy", shortcut: "⌘D", run: duplicateSelected },
      { label: "Group", icon: "group", shortcut: "⌘G", disabled: C.state.selection.length < 2, run: groupSelected },
      { label: "Bring to front", icon: "bring-front", shortcut: "]", run: () => { C.change(() => C.zMove(C.state.selection, "front"), "z-order"); refresh({ skipInspector: true }); } },
      { label: "Send to back", icon: "send-back", shortcut: "[", run: () => { C.change(() => C.zMove(C.state.selection, "back"), "z-order"); refresh({ skipInspector: true }); } },
      { label: "Delete", icon: "trash", shortcut: "⌫", danger: true, run: () => deleteSelected() },
    ] : []),
    { separator: true },
    { label: "Paste", icon: "clipboard", shortcut: "⌘V", disabled: !C.state.clipboard, run: pasteClipboard },
    { label: "Fit frame to content", icon: "maximize", run: fitPageHeight },
    { separator: true },
    { label: "View" },
    { label: "Zoom to fit", icon: "minimize", shortcut: "0", run: () => canvas.fit() },
    { label: "Zoom to 100%", icon: "maximize", shortcut: "1", run: () => canvas.setZoom(1) },
    { label: "Snap to objects", icon: "magnet", checked: C.state.prefs.snap, run: pref("snap") },
    { label: "Grid", icon: "grid", checked: C.state.prefs.showGrid, run: pref("showGrid") },
    { label: "Rulers", icon: "ruler", checked: C.state.prefs.showRulers, run: pref("showRulers") },
    { label: "Smart guides", icon: "align-center", checked: C.state.prefs.showGuides, run: pref("showGuides") },
    { label: "Interactive outlines", icon: "mouse", checked: C.state.prefs.showOutline, run: pref("showOutline") },
  ]);
}

export function showLayerMenu(event, node) {
  const multi = C.state.selection.length > 1;
  const frames = C.page().nodes.filter((n) => n.type === "frame" && n.id !== node.id && !C.isDescendant(n.id, node.id));
  const z = (mode, label, icon, shortcut) => ({
    label, icon, shortcut,
    run: () => { C.change(() => C.zMove(C.state.selection, mode), "z-order"); refresh({ skipInspector: true }); },
  });
  showMenu(event, [
    { label: "Edit" },
    { label: "Rename", icon: "type", run: async () => { const v = await promptDialog("Rename layer", node.name); if (v) C.change(() => { node.name = v; }, "rename"); } },
    { label: multi ? `Duplicate ${C.state.selection.length} layers` : "Duplicate", icon: "copy", shortcut: "⌘D", run: duplicateSelected },
    { label: "Copy", icon: "clipboard", shortcut: "⌘C", run: copySelection },
    { label: "Copy CSS", icon: "code", run: () => { navigator.clipboard?.writeText(exporter.nodeCss(node, C.state.device)); toast("CSS copied", "success"); } },
    { separator: true },
    { label: "Arrange" },
    { label: "Group selection", icon: "group", shortcut: "⌘G", disabled: C.state.selection.length < 2, run: groupSelected },
    { label: "Ungroup", icon: "ungroup", shortcut: "⌘⇧G", disabled: node.type !== "frame", run: ungroupSelected },
    ...(frames.length ? [...frames.slice(0, 6).map((f) => ({
      label: `Into · ${f.name}`, icon: "frame", checked: node.parentId === f.id, run: () => { C.change(() => C.state.selection.forEach((id) => C.reparent(id, f.id)), "reparent"); },
    }))] : []),
    ...(node.parentId ? [{ label: "Move to page", icon: "file-text", run: () => { C.change(() => C.state.selection.forEach((id) => C.reparent(id, null)), "reparent"); } }] : []),
    z("front", "Bring to front", "bring-front", "]"),
    z("forward", "Bring forward", "arrow-up", "⌘ ]"),
    z("backward", "Send backward", "arrow-down", "⌘ ["),
    z("back", "Send to back", "send-back", "["),
    { separator: true },
    { label: "Layer" },
    { label: node.visible ? "Hide" : "Show", icon: node.visible ? "eye-off" : "eye", run: () => C.change(() => C.state.selection.forEach((id) => { C.node(id).visible = !C.node(id).visible; }), "visibility") },
    { label: node.locked ? "Unlock" : "Lock", icon: node.locked ? "unlock" : "lock", run: () => C.change(() => C.state.selection.forEach((id) => { C.node(id).locked = !C.node(id).locked; }), "lock") },
    { label: multi ? `Delete ${C.state.selection.length} layers` : "Delete", icon: "trash", shortcut: "⌫", danger: true, run: () => deleteSelected() },
  ]);
}

/* --------------------------------------------------------- command palette */

const COMMANDS = () => [
  { label: "Add frame", icon: "frame", hint: "F", run: () => addElement("frame") },
  { label: "Add rectangle", icon: "square", hint: "R", run: () => addElement("rect") },
  { label: "Add ellipse", icon: "circle", hint: "O", run: () => addElement("ellipse") },
  { label: "Add line", icon: "minus", hint: "L", run: () => addElement("line") },
  { label: "Add arrow", icon: "arrow-right", run: () => addElement("arrow") },
  { label: "Add star", icon: "star", run: () => addElement("star") },
  { label: "Add text", icon: "type", hint: "T", run: () => addElement("text") },
  { label: "Add button", icon: "rectangle-horizontal", hint: "B", run: () => addElement("button") },
  { label: "Upload image", icon: "image", run: () => dom.fileInput.click() },
  { separator: true },
  ...TEXT_PRESETS.map((p) => ({ label: `Text style · ${p.label}`, icon: "type", run: () => addTextWithPreset(p) })),
  ...BLOCKS.map((b, i) => ({ label: `Insert block · ${b.label}`, icon: "layout-grid", run: () => insertBlock(i) })),
  ...GRADIENTS.map((pair, i) => ({ label: `Gradient rectangle ${i + 1}`, icon: "palette", run: () => addGradientRect(pair) })),
  { separator: true },
  { label: "Undo", icon: "undo", hint: "⌘Z", run: () => C.undo() && refresh() },
  { label: "Redo", icon: "redo", hint: "⌘⇧Z", run: () => C.redo() && refresh() },
  { label: "Select all", icon: "maximize", hint: "⌘A", run: () => C.setSelection(C.page().nodes.filter((n) => !n.parentId).map((n) => n.id)) },
  { label: "Duplicate selection", icon: "copy", hint: "⌘D", run: duplicateSelected },
  { label: "Group selection", icon: "group", hint: "⌘G", run: groupSelected },
  { label: "Ungroup", icon: "ungroup", hint: "⌘⇧G", run: ungroupSelected },
  { label: "Bring to front", icon: "bring-front", hint: "]", run: () => { C.change(() => C.zMove(C.state.selection, "front"), "z-order"); refresh({ skipInspector: true }); } },
  { label: "Send to back", icon: "send-back", hint: "[", run: () => { C.change(() => C.zMove(C.state.selection, "back"), "z-order"); refresh({ skipInspector: true }); } },
  { separator: true },
  { label: "Desktop viewport", icon: "monitor", run: () => setDevice("desktop") },
  { label: "Tablet viewport", icon: "tablet", run: () => setDevice("tablet") },
  { label: "Mobile viewport", icon: "smartphone", run: () => setDevice("mobile") },
  { label: "Zoom to fit", icon: "minimize", hint: "0", run: () => canvas.fit() },
  { label: "Zoom to 100%", icon: "maximize", hint: "1", run: () => canvas.setZoom(1) },
  { label: "Fit frame to content", icon: "maximize", run: fitPageHeight },
  { separator: true },
  { label: "Show code", icon: "code", run: () => openCode() },
  { label: "Preview site", icon: "eye", run: () => openPreview() },
  { label: "Export project", icon: "download", run: openExport },
  { label: "Save project file", icon: "save", hint: "⌘S", run: saveProjectFile },
  { label: "New project (template)", icon: "plus", run: () => newProject(true) },
  { label: "New blank project", icon: "file", run: () => newProject(false) },
  { label: "Keyboard shortcuts", icon: "keyboard", hint: "?", run: () => openModal("shortcuts") },
  { label: "Toggle grid", icon: "grid", run: () => { C.state.prefs.showGrid = !C.state.prefs.showGrid; savePrefs(); } },
  { label: "Toggle snap", icon: "magnet", run: () => { C.state.prefs.snap = !C.state.prefs.snap; savePrefs(); } },
  { label: "Toggle rulers", icon: "ruler", run: () => { C.state.prefs.showRulers = !C.state.prefs.showRulers; savePrefs(); } },
];

function openPalette() {
  dom.palette?.classList.remove("hidden");
  if (dom.paletteInput) { dom.paletteInput.value = ""; dom.paletteInput.focus(); }
  renderPalette("");
}
function closePalette() { dom.palette?.classList.add("hidden"); }

let paletteIndex = 0;
function paletteList(term) {
  const t = term.trim().toLowerCase();
  return COMMANDS().filter((c) => !c.separator && (!t || c.label.toLowerCase().includes(t)));
}

function renderPalette(term) {
  if (!dom.paletteResults) return;
  const list = paletteList(term);
  paletteIndex = C.clamp(paletteIndex, 0, Math.max(0, list.length - 1));
  dom.paletteResults.innerHTML = "";
  if (!list.length) { dom.paletteResults.appendChild(el("div", { class: "palette-empty", text: "No matching command" })); return; }
  list.forEach((cmd, i) => {
    dom.paletteResults.appendChild(el("button", {
      class: `palette-item${i === paletteIndex ? " active" : ""}`, type: "button",
      onclick: () => { closePalette(); cmd.run(); refresh(); },
      onmouseenter: () => { paletteIndex = i; renderPalette(term); },
    }, [
      el("span", { class: "palette-icon", html: iconSvg(cmd.icon || "zap", { size: 14 }) }),
      el("span", { class: "palette-label", text: cmd.label }),
      cmd.hint ? el("span", { class: "palette-hint", text: cmd.hint }) : null,
    ]));
  });
}

/* --------------------------------------------------------------- exporting */

export function setExportFormat(format) { exportFormat = format; }

function renderCodeModal() {
  const files = exporter.buildFiles(exportFormat);
  if (dom.codeLangLabel) dom.codeLangLabel.textContent = ({ html: "HTML + CSS + JS", react: "React", tailwind: "Tailwind", node: "Node.js (Express)" })[exportFormat];
  if (!dom.codeTabs) return;
  const textFiles = files.filter((f) => !f.binary);
  const active = textFiles.find((f) => f.name === dom.codeTabs.dataset.active) || textFiles[0];
  dom.codeTabs.innerHTML = "";
  textFiles.forEach((f) => {
    dom.codeTabs.appendChild(el("button", {
      class: `file-tab${f === active ? " active" : ""}`, type: "button", text: f.name.split("/").pop(),
      onclick: () => { dom.codeTabs.dataset.active = f.name; renderCodeModal(); },
    }));
  });
  dom.codeTabs.dataset.active = active?.name || "";
  if (dom.codeOutput) dom.codeOutput.value = String(active?.data || "");
}

function openCode() { renderCodeModal(); openModal("code"); }

function openPreview() {
  const page = C.page();
  const size = C.pageRect();
  if (dom.previewFrame) {
    dom.previewFrame.srcdoc = exporter.buildHtml(page, { inline: true });
    dom.previewFrame.style.width = `${size.width}px`;
    dom.previewFrame.style.height = `${Math.min(size.height, 660)}px`;
  }
  if (dom.previewLabel) dom.previewLabel.textContent = `${page.name} · ${C.DEVICES[C.state.device].label}`;
  openModal("preview");
}

export function openExport() {
  if (!dom.exportOptions) { doExport(); return; }
  dom.exportOptions.innerHTML = "";
  [["html", "HTML + CSS + JS", "Static site — works on any host"], ["react", "React component", "JSX + stylesheet for Vite/Next"],
   ["tailwind", "Tailwind HTML", "Utility classes, no custom CSS"], ["node", "Node.js bundle", "Express server + public folder"]]
    .forEach(([value, label, hint]) => {
      dom.exportOptions.appendChild(el("label", { class: `export-option${exportFormat === value ? " selected" : ""}` }, [
        el("input", { type: "radio", name: "export-format", value, checked: exportFormat === value, onchange: () => { exportFormat = value; openExport(); } }),
        el("span", { class: "export-copy" }, [el("strong", { text: label }), el("small", { text: hint })]),
      ]));
    });
  dom.exportOptions.appendChild(el("button", { class: "btn primary full", type: "button", onclick: () => { closeModal("export"); doExport(); } },
    [iconSvg("download", { size: 14 }), el("span", { text: "Download ZIP" })].flat()));
  openModal("export");
}

function doExport() {
  const files = exporter.buildFiles(exportFormat);
  const zip = exporter.makeZip(files);
  exporter.download(zip, `${C.slugify(C.project().name) || "vbuilder-site"}-${exportFormat}.zip`);
  toast(`Exported ${files.length} files as ZIP`, "success");
}

function saveProjectFile() {
  const blob = new Blob([JSON.stringify(C.project(), null, 2)], { type: "application/json" });
  exporter.download(blob, `${C.slugify(C.project().name) || "vbuilder-project"}.vbuilder`);
  toast("Project file saved", "success");
}

async function openProjectFile(file) {
  if (!file) return;
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    C.change(() => { C.state.project = C.normalizeProject(parsed); }, "open project");
    C.resetHistory();
    C.setSelection([]);
    canvas.fit();
    toast("Project opened", "success");
  } catch {
    toast("That file is not a valid VBuilder project", "error");
  }
}

export async function newProject(template = true) {
  if (!await confirmDialog("Start a new project?", "Your current work stays in this browser until you overwrite it — save a project file first if you need it.", { confirmLabel: "New project" })) return;
  const fresh = template ? createStarterProject("Untitled project") : C.createProject("Untitled project");
  C.change(() => { C.state.project = fresh; }, "new project");
  C.resetHistory();
  C.setSelection([]);
  canvas.fit();
  toast(template ? "New project started from the template" : "New blank project created", "success");
}

/* --------------------------------------------------------------- shortcuts */

const SHORTCUTS = [
  ["Tools", [["V", "Select / move"], ["F", "Frame"], ["R", "Rectangle"], ["O", "Ellipse"], ["T", "Text"], ["B", "Button"], ["L", "Line"], ["H", "Hand (pan)"]]],
  ["Edit", [["⌘ Z", "Undo"], ["⌘ ⇧ Z", "Redo"], ["⌘ C / X / V", "Copy, cut, paste"], ["⌘ D", "Duplicate"], ["⌘ G", "Group"], ["⌘ ⇧ G", "Ungroup"], ["⌫", "Delete"], ["⌘ A", "Select all"], ["⌘ S", "Save project file"]]],
  ["Arrange", [["]", "Bring to front"], ["[", "Send to back"], ["⌘ ]", "Bring forward"], ["⌘ [", "Send backward"], ["Arrows", "Nudge 1px"], ["⇧ Arrows", "Nudge 10px"]]],
  ["Canvas", [["Space + drag", "Pan"], ["⌘ + scroll", "Zoom"], ["0", "Zoom to fit"], ["1", "Zoom to 100%"], ["⌘ K", "Command palette"], ["Alt + click", "Select parent layer"], ["?", "This dialog"], ["Esc", "Cancel tool / deselect"]]],
];

function renderShortcuts() {
  if (!dom.shortcutsModal) return;
  const host = $(".shortcuts-body", dom.shortcutsModal);
  if (!host) return;
  host.innerHTML = "";
  SHORTCUTS.forEach(([group, rows]) => {
    host.appendChild(el("div", { class: "shortcut-group" }, [
      el("h4", { text: group }),
      ...rows.map(([keys, what]) => el("div", { class: "shortcut-row" }, [
        el("kbd", { text: keys }), el("span", { text: what }),
      ])),
    ]));
  });
}

function onKeydown(event) {
  const target = event.target;
  const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target?.isContentEditable;
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key;

  if (mod && key.toLowerCase() === "k") { event.preventDefault(); openPalette(); return; }
  if (mod && key.toLowerCase() === "s") { event.preventDefault(); saveProjectFile(); return; }
  if (mod && key.toLowerCase() === "z") { event.preventDefault(); (event.shiftKey ? C.redo() : C.undo()) && refresh(); return; }
  if (mod && key.toLowerCase() === "y") { event.preventDefault(); C.redo() && refresh(); return; }
  if (mod && key.toLowerCase() === "c") { if (!typing) { event.preventDefault(); copySelection(); } return; }
  if (mod && key.toLowerCase() === "x") { if (!typing) { event.preventDefault(); cutSelection(); } return; }
  if (mod && key.toLowerCase() === "v") { if (!typing) { event.preventDefault(); pasteClipboard(); } return; }
  if (mod && key.toLowerCase() === "d") { if (!typing) { event.preventDefault(); duplicateSelected(); } return; }
  if (mod && key.toLowerCase() === "g") { if (!typing) { event.preventDefault(); event.shiftKey ? ungroupSelected() : groupSelected(); } return; }
  if (mod && key.toLowerCase() === "a") { if (!typing) { event.preventDefault(); C.setSelection(C.page().nodes.filter((n) => !n.parentId).map((n) => n.id)); } return; }

  if (!dom.palette?.classList.contains("hidden")) {
    if (key === "Escape") { event.preventDefault(); closePalette(); return; }
    const list = paletteList(dom.paletteInput?.value || "");
    if (key === "ArrowDown") { event.preventDefault(); paletteIndex = Math.min(list.length - 1, paletteIndex + 1); renderPalette(dom.paletteInput.value); return; }
    if (key === "ArrowUp") { event.preventDefault(); paletteIndex = Math.max(0, paletteIndex - 1); renderPalette(dom.paletteInput.value); return; }
    if (key === "Enter") { event.preventDefault(); list[paletteIndex]?.run(); closePalette(); refresh(); return; }
    return;
  }

  if (key === "Escape") {
    if (isMenuOpen()) { closeMenu(); return; }
    if (C.state.tool !== "select" && C.state.tool !== "hand") { disarmTool(); return; }
    if (isModalOpen()) { closeModal(); return; }
    if (C.state.selection.length) { C.setSelection([]); return; }
    return;
  }
  if (typing || mod) return;

  if (key === "?") { event.preventDefault(); renderShortcuts(); openModal("shortcuts"); return; }
  if (key === "Delete" || key === "Backspace") { event.preventDefault(); deleteSelected(); return; }
  if (key === "Enter") { const n = C.singleSelected(); if (n && (n.type === "text" || n.type === "button")) { event.preventDefault(); canvas.beginTextEdit(n.id); } return; }

  const toolKeys = { v: "select", f: "frame", r: "rect", o: "ellipse", t: "text", b: "button", l: "line", h: "hand" };
  const lower = key.toLowerCase();
  if (toolKeys[lower]) {
    event.preventDefault();
    const tool = toolKeys[lower];
    if (tool === "select" || tool === "hand") { C.state.tool = tool; refresh({ skipInspector: true }); }
    else armTool(tool);
    return;
  }
  if (key === "]") { event.preventDefault(); C.change(() => C.zMove(C.state.selection, event.shiftKey ? "front" : "forward"), "z-order"); refresh({ skipInspector: true }); return; }
  if (key === "[") { event.preventDefault(); C.change(() => C.zMove(C.state.selection, event.shiftKey ? "back" : "backward"), "z-order"); refresh({ skipInspector: true }); return; }
  if (key === "0") { event.preventDefault(); canvas.fit(); return; }
  if (key === "1") { event.preventDefault(); canvas.setZoom(1); return; }
  if (key === "=" || key === "+") { event.preventDefault(); canvas.zoomBy(1.2); return; }
  if (key === "-") { event.preventDefault(); canvas.zoomBy(1 / 1.2); return; }

  const step = event.shiftKey ? 10 : 1;
  if (key === "ArrowLeft") { event.preventDefault(); nudge(-step, 0); }
  if (key === "ArrowRight") { event.preventDefault(); nudge(step, 0); }
  if (key === "ArrowUp") { event.preventDefault(); nudge(0, -step); }
  if (key === "ArrowDown") { event.preventDefault(); nudge(0, step); }
}

/* -------------------------------------------------------------------- boot */

function bindChrome() {
  $$("#deviceTabs .device-tab").forEach((btn) => {
    btn.addEventListener("click", () => setDevice(btn.dataset.device));
    btn.addEventListener("contextmenu", (event) => showMenu(event, C.DEVICE_ORDER.map((d) => ({
      label: `${C.DEVICES[d].label} — ${C.pageRect(d).width} × ${C.pageRect(d).height}`, checked: C.state.device === d, run: () => setDevice(d),
    }))));
  });

  dom.undoBtn?.addEventListener("click", () => C.undo() && refresh());
  dom.redoBtn?.addEventListener("click", () => C.redo() && refresh());
  dom.fitBtn?.addEventListener("click", () => canvas.fit());
  dom.zoomInBtn?.addEventListener("click", () => canvas.zoomBy(1.2));
  dom.zoomOutBtn?.addEventListener("click", () => canvas.zoomBy(1 / 1.2));
  dom.zoomValue?.addEventListener("click", (event) => showMenu(event, [
    { label: "Zoom to fit", icon: "minimize", run: () => canvas.fit() },
    { label: "50%", run: () => canvas.setZoom(0.5) },
    { label: "100%", checked: Math.round(canvas.zoom() * 100) === 100, run: () => canvas.setZoom(1) },
    { label: "200%", run: () => canvas.setZoom(2) },
    { label: "400%", run: () => canvas.setZoom(4) },
  ]));
  dom.zoomValue?.addEventListener("contextmenu", (event) => { event.preventDefault(); dom.zoomValue.click(); });

  [dom.gridToggle, dom.snapToggle, dom.rulerToggle, dom.guidesToggle, dom.outlineToggle].forEach((btn) => {
    btn?.addEventListener("click", () => {
      const key = btn.dataset.pref;
      C.state.prefs[key] = !C.state.prefs[key];
      savePrefs();
    });
    btn?.addEventListener("contextmenu", (event) => showMenu(event, [
      { label: "Snap to objects", icon: "magnet", checked: C.state.prefs.snap, run: () => { C.state.prefs.snap = !C.state.prefs.snap; savePrefs(); } },
      { label: "Show grid", icon: "grid", checked: C.state.prefs.showGrid, run: () => { C.state.prefs.showGrid = !C.state.prefs.showGrid; savePrefs(); } },
      { label: "Rulers", icon: "ruler", checked: C.state.prefs.showRulers, run: () => { C.state.prefs.showRulers = !C.state.prefs.showRulers; savePrefs(); } },
      { label: "Smart guides", icon: "align-center", checked: C.state.prefs.showGuides, run: () => { C.state.prefs.showGuides = !C.state.prefs.showGuides; savePrefs(); } },
    ]));
  });

  $$("#toolDock .tool").forEach((btn) => {
    // Only real tools act; undo/redo/palette buttons own their own handlers.
    const tool = btn.dataset.tool;
    const isMode = tool === "select" || tool === "hand";
    if (!isMode && !btn.dataset.add) return;

    btn.addEventListener("click", () => {
      if (isMode) { C.state.tool = tool; refresh({ skipInspector: true }); return; }
      armTool(btn.dataset.add);
    });
    btn.addEventListener("contextmenu", (event) => {
      if (isMode) {
        showMenu(event, [
          { label: "Move tool", icon: "pointer", checked: C.state.tool === "select", run: () => { C.state.tool = "select"; refresh({ skipInspector: true }); } },
          { label: "Pan tool", icon: "hand", checked: C.state.tool === "hand", run: () => { C.state.tool = "hand"; refresh({ skipInspector: true }); } },
          { separator: true },
          { label: "Keyboard shortcuts", icon: "keyboard", run: () => { renderShortcuts(); openModal("shortcuts"); } },
        ]);
        return;
      }
      const alternatives = {
        frame: [["frame", "Frame", "frame"], ["rect", "Rectangle", "square"]],
        rect: [["rect", "Rectangle", "square"], ["frame", "Frame", "frame"]],
        shape: [["ellipse", "Ellipse", "circle"], ["rect", "Rectangle", "square"], ["line", "Line", "minus"], ["arrow", "Arrow", "arrow-right"], ["star", "Star", "star"]],
        text: [["text", "Text", "type"], ...TEXT_PRESETS.slice(0, 4).map((p, i) => [`preset${i}`, `Text · ${p.label}`, "type"])],
        media: [["image", "Image", "image"], ["icon", "Icon", "sparkles"]],
        button: [["button", "Button", "rectangle-horizontal"], ["frame", "Frame", "frame"]],
      }[tool] || [[btn.dataset.add, C.NODE_TYPES[btn.dataset.add]?.label || tool, "square"]];

      showMenu(event, [
        ...alternatives.map(([value, label, icon]) => ({
          label, icon,
          checked: btn.dataset.add === value,
          run: () => (value.startsWith("preset") ? armTool("text", TEXT_PRESETS[Number(value.slice(6))]) : armTool(value)),
        })),
        { separator: true },
        { label: "Insert from Elements panel", icon: "grid", run: () => { C.state.leftPanel = "elements"; refresh(); } },
      ]);
    });
  });

  /* ------------------------------------------------ panel splitters */
  const bindSplitter = (elm, varName, side, min, max, fallback) => {
    if (!elm) return;
    elm.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      elm.classList.add("dragging");
      const move = (ev) => {
        const w = side === "left"
          ? ev.clientX - (dom.leftRail?.getBoundingClientRect().right ?? 48)
          : window.innerWidth - ev.clientX;
        const v = C.clamp(Math.round(w), min, max);
        document.documentElement.style.setProperty(varName, `${v}px`);
        C.state.prefs[side === "left" ? "leftW" : "rightW"] = v;
      };
      const up = () => { elm.classList.remove("dragging"); window.removeEventListener("pointermove", move); savePrefs(); };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    });
    elm.addEventListener("dblclick", () => {
      document.documentElement.style.setProperty(varName, `${fallback}px`);
      delete C.state.prefs[side === "left" ? "leftW" : "rightW"];
      savePrefs();
    });
  };
  bindSplitter(dom.splitLeft, "--left", "left", 190, 420, 250);
  bindSplitter(dom.splitRight, "--right", "right", 240, 440, 296);

  dom.inspectorCollapseBtn?.addEventListener("click", () => { C.state.rightCollapsed = true; refresh(); });
  dom.inspectorReopenBtn?.addEventListener("click", () => { C.state.rightCollapsed = false; refresh(); });

  dom.paletteBtn?.addEventListener("click", openPalette);
  dom.paletteInput?.addEventListener("input", (e) => { paletteIndex = 0; renderPalette(e.target.value); });
  dom.palette?.addEventListener("click", (e) => { if (e.target === dom.palette) closePalette(); });
  dom.shortcutsBtn?.addEventListener("click", () => { renderShortcuts(); openModal("shortcuts"); });

  dom.codeBtn?.addEventListener("click", openCode);
  dom.previewBtn?.addEventListener("click", openPreview);
  dom.exportBtn?.addEventListener("click", openExport);
  dom.newProjectBtn?.addEventListener("click", (event) => showMenu(event, [
    { label: "Start blank project", icon: "file", run: () => newProject(false) },
    { label: "Start from demo template", icon: "sparkles", run: () => newProject(true) },
  ]));
  dom.newProjectBtn?.addEventListener("contextmenu", (event) => showMenu(event, [
    { label: "Start blank project", icon: "file", run: () => newProject(false) },
    { label: "Start from demo template", icon: "sparkles", run: () => newProject(true) },
  ]));
  dom.openProjectBtn?.addEventListener("click", () => dom.projectInput.click());
  dom.saveProjectBtn?.addEventListener("click", saveProjectFile);
  dom.projectName?.addEventListener("change", (e) => C.change(() => { C.state.project.name = e.target.value.trim() || "Untitled project"; }, "rename project"));

  dom.projectInput?.addEventListener("change", () => { openProjectFile(dom.projectInput.files[0]); dom.projectInput.value = ""; });

  dom.fontFileInput?.addEventListener("change", async () => {
    const file = dom.fontFileInput.files?.[0];
    dom.fontFileInput.value = "";
    if (!file) return;
    const family = await F.addCustomFontFile(file);
    if (family) toast(`Font “${family}” added — pick it from the Font menu`, "success");
    else toast("Unsupported font file — use woff2, woff, ttf or otf", "error");
  });

  // Drop image files anywhere in the app (e.g. straight from a folder).
  window.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) e.preventDefault(); });
  window.addEventListener("drop", (e) => {
    if (!e.dataTransfer?.files?.length) return;
    if (e.target.closest?.("#canvasViewport")) return; // the canvas has its own drop handler
    e.preventDefault();
    addImageFiles([...e.dataTransfer.files], canvas.toCanvasPoint(e.clientX, e.clientY));
  });
  dom.fileInput?.addEventListener("change", () => {
    const replaceId = dom.fileInput.dataset.replaceId || null;
    let point = null;
    if (dom.fileInput.dataset.point) {
      const [x, y] = dom.fileInput.dataset.point.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) point = { x, y };
    }
    addImageFiles([...(dom.fileInput.files || [])], point, replaceId);
    delete dom.fileInput.dataset.replaceId;
    delete dom.fileInput.dataset.point;
    dom.fileInput.value = "";
  });

  $$("[data-close-modal]").forEach((btn) => btn.addEventListener("click", () => closeModal(btn.dataset.closeModal)));
  $$(".modal-backdrop").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) closeModal(m.id.replace("Modal", "")); }));
  dom.codeOutput?.addEventListener("focus", (e) => e.target.select());
  $(".code-copy", dom.codeModal)?.addEventListener("click", () => { navigator.clipboard?.writeText(dom.codeOutput.value); toast("Copied", "success"); });
  $(".preview-refresh", dom.previewModal)?.addEventListener("click", openPreview);

  window.addEventListener("keydown", onKeydown);
  window.addEventListener("keyup", () => { if (C.state.tool === "hand") return; });
  window.addEventListener("beforeunload", () => { try { C.save(); } catch { /* ignore */ } });
}

function hydrateIcons() {
  $$("[data-icon]").forEach((placeholder) => {
    const wrap = document.createElement("span");
    wrap.innerHTML = iconSvg(placeholder.dataset.icon, { size: Number(placeholder.dataset.size || 16) });
    placeholder.replaceWith(wrap.firstElementChild);
  });
}

async function boot() {
  bindRefs();
  hydrateIcons();
  exporter.registerIcons(ICONS);
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (prefs) Object.assign(C.state.prefs, prefs);
  } catch { /* first run */ }
  if (C.state.prefs.leftW) document.documentElement.style.setProperty("--left", `${C.state.prefs.leftW}px`);
  if (C.state.prefs.rightW) document.documentElement.style.setProperty("--right", `${C.state.prefs.rightW}px`);

  canvas.init();
  panels.init();
  inspector.init();
  bindChrome();

  C.resetHistory();
  refresh();

  const restored = await C.restore();
  if (restored?.project) {
    C.state.project = restored.project;
    C.resetHistory();
    C.setSelection([]);
    refresh();
    const when = restored.savedAt ? new Date(restored.savedAt).toLocaleString() : "earlier";
    toast(`Restored your local project (${when})`, "success");
  } else {
    C.state.project = createStarterProject();
    C.resetHistory();
    C.setSelection(["headline"]);
  }
  F.applyProjectFonts();
  F.usedGoogleFamilies().forEach(F.ensureFamily);
  canvas.fit();
  refresh();

  on("document", () => refresh({ skipInspector: document.activeElement?.closest?.("#inspectorBody") }));
  on("selection", () => refresh());
  on("history", () => {
    if (dom.undoBtn) dom.undoBtn.disabled = !C.canUndo();
    if (dom.redoBtn) dom.redoBtn.disabled = !C.canRedo();
  });
  if (dom.undoBtn) dom.undoBtn.disabled = !C.canUndo();
  if (dom.redoBtn) dom.redoBtn.disabled = !C.canRedo();
}

boot();
