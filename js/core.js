/*
 * VBuilder 2 — core
 * Document model, state, history, storage, geometry and layout resolution.
 * The project document is the single source of truth for the editor and every exporter.
 */

export const SCHEMA_VERSION = 2;

/* ------------------------------------------------------------------ utils */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const round = (v, p = 0) => { const f = 10 ** p; return Math.round(Number(v) * f) / f; };
export const num = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
export const deepClone = (v) => JSON.parse(JSON.stringify(v));
export const uid = (prefix = "n") =>
  `${prefix}_${(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 10)}`;
export const escapeHtml = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
export const escapeAttr = escapeHtml;
export const slugify = (v) => String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const safeClass = (v) => String(v || "node").replace(/[^a-zA-Z0-9_-]/g, "-");

/* ------------------------------------------------------------------- types */

export const NODE_TYPES = {
  frame:  { label: "Frame",     group: "layout",  icon: "frame" },
  rect:   { label: "Rectangle", group: "shape",   icon: "square" },
  ellipse:{ label: "Ellipse",   group: "shape",   icon: "circle" },
  line:   { label: "Line",      group: "shape",   icon: "minus" },
  arrow:  { label: "Arrow",     group: "shape",   icon: "arrow-right" },
  star:   { label: "Star",      group: "shape",   icon: "star" },
  text:   { label: "Text",      group: "content", icon: "type" },
  image:  { label: "Image",     group: "content", icon: "image" },
  icon:   { label: "Icon",      group: "content", icon: "sparkles" },
  button: { label: "Button",    group: "content", icon: "rectangle-horizontal" },
};

export const DEVICES = {
  desktop: { label: "Desktop", width: 1440, height: 900, media: null, fluid: true },
  tablet:  { label: "Tablet",  width: 768,  height: 1024, media: 1024 },
  mobile:  { label: "Mobile",  width: 390,  height: 844,  media: 767 },
};
export const DEVICE_ORDER = ["desktop", "tablet", "mobile"];

export const EASINGS = {
  linear: "linear",
  ease: "ease",
  "ease-in": "ease-in",
  "ease-out": "ease-out",
  "ease-in-out": "ease-in-out",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
  snap: "cubic-bezier(0.85, 0, 0.15, 1)",
};

export const ANIMATION_TYPES = {
  none: "None", fade: "Fade in", "fade-up": "Rise", "fade-down": "Drop",
  "slide-left": "Slide from left", "slide-right": "Slide from right",
  scale: "Scale up", "scale-down": "Scale down", rotate: "Spin in",
  blur: "Unblur", bounce: "Bounce", flip: "Flip", "grow-width": "Wipe in",
  pop: "Pop", pulse: "Pulse", float: "Float", shake: "Shake", wiggle: "Wiggle", spin: "Whirl",
};
export const LOOP_ANIMATIONS = new Set(["pulse", "float", "wiggle"]);

export const ACTION_TYPES = {
  none: "No action", link: "Open link", scroll: "Scroll to element",
  toggle: "Show / hide element", animate: "Play animation",
  navigate: "Go to page", back: "Scroll to top",
};

/* ---------------------------------------------------------------- defaults */

const baseProps = (o = {}) => ({
  x: 0, y: 0, width: 240, height: 120, rotation: 0, flipX: false, flipY: false,
  opacity: 100, blend: "normal",
  radius: { tl: 0, tr: 0, br: 0, bl: 0 },
  fills: [], strokes: [], effects: [],
  constraintH: "left", constraintV: "top",
  responsiveBehavior: "scale",
  layout: null, sizing: { w: "fixed", h: "fixed" },
  action: { type: "none" },
  animation: { type: "none", duration: 600, delay: 0, easing: "smooth", trigger: "load", repeat: 1 },
  ...o,
});

const textProps = (o = {}) => ({
  family: "Inter, sans-serif", size: 16, weight: 400, lineHeight: 1.5,
  letterSpacing: 0, align: "left", valign: "top", transform: "none", decoration: "none",
  ...o,
});

export function defaultsFor(type) {
  switch (type) {
    case "frame":
      return baseProps({ width: 480, height: 280, radius: { tl: 12, tr: 12, br: 12, bl: 12 },
        fills: [], strokes: [],
        responsiveBehavior: "stretch" });
    case "rect":
      return baseProps({ fills: [{ type: "solid", color: "#252832", opacity: 100 }], radius: { tl: 8, tr: 8, br: 8, bl: 8 } });
    case "ellipse":
      return baseProps({ width: 160, height: 160, fills: [{ type: "solid", color: "#252832", opacity: 100 }] });
    case "line":
      return baseProps({ width: 240, height: 2, fills: [{ type: "solid", color: "#3a3f4d", opacity: 100 }] });
    case "arrow":
      return baseProps({ width: 200, height: 24, strokes: [{ color: "#3a3f4d", width: 2, align: "center" }] });
    case "star":
      return baseProps({ width: 140, height: 140, fills: [{ type: "solid", color: "#3b82f6", opacity: 100 }] });
    case "text":
      return baseProps({ width: 320, height: 60, fills: [{ type: "solid", color: "#e8eaef", opacity: 100 }], ...textProps({ size: 20, weight: 500, lineHeight: 1.35 }), responsiveBehavior: "left" });
    case "image":
      return baseProps({ width: 400, height: 280, radius: { tl: 10, tr: 10, br: 10, bl: 10 },
        fills: [{ type: "solid", color: "#1c1f27", opacity: 100 }], objectFit: "cover", objectPosition: "center center", lockRatio: true });
    case "icon":
      return baseProps({ width: 32, height: 32, fills: [{ type: "solid", color: "#e8eaef", opacity: 100 }], icon: "sparkles", strokeWidth: 2 });
    case "button":
      return baseProps({ width: 160, height: 46, radius: { tl: 10, tr: 10, br: 10, bl: 10 },
        fills: [{ type: "solid", color: "#0d99ff", opacity: 100 }],
        effects: [{ type: "shadow", color: "#0d99ff", opacity: 30, x: 0, y: 8, blur: 24, spread: 0 }],
        ...textProps({ size: 14, weight: 600, align: "center", valign: "center" }),
        action: { type: "link", url: "#", target: "_self" }, responsiveBehavior: "left" });
    default:
      return baseProps();
  }
}

export function makeNode(type, name, base = {}, extra = {}) {
  return {
    id: extra.id || uid(type.slice(0, 3)),
    type,
    name: name || NODE_TYPES[type].label,
    parentId: extra.parentId || null,
    visible: extra.visible !== false,
    locked: extra.locked === true,
    collapsed: false,
    base: { ...defaultsFor(type), ...base },
    responsive: extra.responsive || {},
    content: extra.content ?? "",
    assetId: extra.assetId || null,
    alt: extra.alt || "",
  };
}

/* ------------------------------------------------------------- normalising */

export function blankPage(name = "Page 1", width = 1440, height = 900) {
  return { id: uid("pg"), name, width, height, background: "#101114", responsive: {}, nodes: [] };
}

export function createProject(name = "Untitled project") {
  const page = blankPage("Landing page");
  return { version: SCHEMA_VERSION, kind: "vbuilder-project", name, activePageId: page.id, pages: [page], assets: [], styles: [], fonts: [] };
}

const isObj = (v) => v && typeof v === "object";

export function normalizeNode(raw) {
  const type = NODE_TYPES[raw?.type] ? raw.type : "rect";
  const fallback = makeNode(type);
  const b = { ...fallback.base, ...(isObj(raw?.base) ? raw.base : {}) };
  b.radius = { ...fallback.base.radius, ...(isObj(b.radius) ? b.radius : {}) };
  b.sizing = { ...fallback.base.sizing, ...(isObj(b.sizing) ? b.sizing : {}) };
  b.action = { ...fallback.base.action, ...(isObj(b.action) ? b.action : {}) };
  b.animation = { ...fallback.base.animation, ...(isObj(b.animation) ? b.animation : {}) };
  b.fills = Array.isArray(b.fills) ? b.fills : [];
  b.strokes = Array.isArray(b.strokes) ? b.strokes : [];
  b.effects = Array.isArray(b.effects) ? b.effects : [];
  if (!b.layout && raw?.base?.layout === null) b.layout = null;
  return {
    ...fallback, ...(raw || {}),
    id: String(raw?.id || fallback.id),
    type, name: String(raw?.name || NODE_TYPES[type].label),
    parentId: raw?.parentId ? String(raw.parentId) : null,
    base: b,
    responsive: isObj(raw?.responsive) ? raw.responsive : {},
    content: String(raw?.content ?? ""),
    assetId: raw?.assetId || null,
    alt: String(raw?.alt || ""),
    visible: raw?.visible !== false,
    locked: raw?.locked === true,
    collapsed: raw?.collapsed === true,
  };
}

export function normalizePage(raw) {
  const fallback = blankPage();
  return {
    ...fallback, ...(isObj(raw) ? raw : {}),
    id: String(raw?.id || fallback.id),
    name: String(raw?.name || "Page"),
    width: num(raw?.width, 1440) || 1440,
    height: num(raw?.height, 900) || 900,
    background: String(raw?.background || "#101114"),
    responsive: isObj(raw?.responsive) ? raw.responsive : {},
    nodes: Array.isArray(raw?.nodes) ? raw.nodes.map(normalizeNode) : [],
  };
}

export function normalizeProject(raw) {
  if (!isObj(raw)) return createProject();
  // v1 documents had a single `page` + `nodes`; lift them into the page list.
  let pages = Array.isArray(raw.pages) ? raw.pages.map(normalizePage) : [];
  if (!pages.length) {
    const legacy = normalizePage({ ...(isObj(raw.page) ? raw.page : {}), nodes: raw.nodes });
    pages = [legacy];
  }
  const project = {
    version: SCHEMA_VERSION, kind: "vbuilder-project",
    name: String(raw.name || "Untitled project"),
    activePageId: String(raw.activePageId || pages[0].id),
    pages,
    assets: Array.isArray(raw.assets) ? raw.assets.filter((a) => isObj(a) && a.id) : [],
    styles: Array.isArray(raw.styles) ? raw.styles : [],
    fonts: Array.isArray(raw.fonts) ? raw.fonts.filter((f) => isObj(f) && f.family && f.src) : [],
  };
  if (!project.pages.some((p) => p.id === project.activePageId)) project.activePageId = project.pages[0].id;
  return project;
}

/* ------------------------------------------------------------------ state */

export const state = {
  project: createProject(),
  selection: [],
  device: "desktop",
  tool: "select",
  toolPreset: null,
  clipboard: null,
  view: { mode: "fit", zoom: 0.72, computedZoom: 0.72, panX: 0, panY: 0 },
  prefs: { snap: true, gridSize: 8, showGrid: false, showRulers: false, showGuides: true, showOutline: false },
  leftPanel: "layers",
  leftCollapsed: false,
  rightCollapsed: false,
  inspectorTab: "design",
  interaction: null,
  editingTextId: null,
  hoveredId: null,
  marquee: null,
  guides: [],
};

export const listeners = new Map();
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}
export function emit(event, payload) {
  listeners.get(event)?.forEach((fn) => { try { fn(payload); } catch (err) { console.error(`[vbuilder:${event}]`, err); } });
  listeners.get("*")?.forEach((fn) => { try { fn({ event, payload }); } catch (err) { console.error(err); } });
}

/* --------------------------------------------------------- document access */

export const project = () => state.project;
export function page(id = state.project.activePageId) {
  return state.project.pages.find((p) => p.id === id) || state.project.pages[0];
}
export const nodes = (p = page()) => p.nodes;
export const node = (id) => page().nodes.find((n) => n.id === id) || null;
export const asset = (id) => state.project.assets.find((a) => a.id === id) || null;

export function childrenOf(parentId, p = page()) {
  return p.nodes.filter((n) => (n.parentId || null) === (parentId || null));
}
export function visibleChildren(parentId, p = page()) {
  return childrenOf(parentId, p).filter((n) => n.visible);
}
export function descendantsOf(id, p = page()) {
  const out = [];
  const walk = (pid) => p.nodes.filter((n) => n.parentId === pid).forEach((n) => { out.push(n); walk(n.id); });
  walk(id);
  return out;
}
export function isDescendant(nodeId, ancestorId) {
  let current = node(nodeId);
  const seen = new Set();
  while (current?.parentId && !seen.has(current.id)) {
    if (current.parentId === ancestorId) return true;
    seen.add(current.id);
    current = node(current.parentId);
  }
  return false;
}
export const selected = () => state.selection.map(node).filter(Boolean);
export const singleSelected = () => (state.selection.length === 1 ? node(state.selection[0]) : null);

/* ------------------------------------------------------------ measurements */

export function pageRect(device = state.device) {
  const p = page();
  const preset = DEVICES[device];
  const base = device === "desktop" ? { width: p.width, height: p.height } : { width: preset.width, height: preset.height };
  const o = p.responsive?.[device] || {};
  return { x: 0, y: 0, width: Math.max(240, num(o.width, base.width) || base.width), height: Math.max(200, num(o.height, base.height) || base.height) };
}

/** The coordinate space a node is positioned inside. */
export function containerRect(n, device = state.device) {
  const parent = n.parentId ? node(n.parentId) : null;
  if (!parent) return { x: 0, y: 0, ...pick(pageRect(device), "width", "height") };
  const pr = nodeRect(parent, device);
  const b = strokeInset(parent, device);
  return { x: b, y: b, width: Math.max(1, pr.width - b * 2), height: Math.max(1, pr.height - b * 2) };
}
const pick = (o, ...keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

export function strokeInset(n, device) {
  const p = propsOf(n, device);
  const s = (p.strokes || []).find((x) => x.width > 0);
  return s ? (s.align === "outside" ? 0 : s.width / 2) : 0;
}
/** Shorthand used by the inspector so alignment lines up with the frame's content box. */
export const frameInset = strokeInset;

/** Auto layout resolves children deterministically; free frames keep stored x/y. */
export function layoutChildren(frame, device = state.device) {
  const L = frame.base.layout;
  const rect = nodeRect(frame, device);
  const kids = visibleChildren(frame.id).filter((k) => !k.base.layout || true);
  if (!L) return new Map();
  const inset = strokeInset(frame, device);
  const pad = { t: num(L.pad?.t), r: num(L.pad?.r), b: num(L.pad?.b), l: num(L.pad?.l) };
  const horiz = L.mode === "row";
  const innerW = Math.max(1, rect.width - inset * 2 - pad.l - pad.r);
  const innerH = Math.max(1, rect.height - inset * 2 - pad.t - pad.b);
  const gap = Math.max(0, num(L.gap));

  const measure = (k) => {
    const kp = { ...k.base, ...(k.responsive?.[device] || {}) };
    const w = k.base.sizing?.w === "fill" ? 0 : Math.max(1, num(kp.width, 10));
    const h = k.base.sizing?.h === "fill" ? 0 : Math.max(1, num(kp.height, 10));
    return { w, h };
  };
  const sizes = kids.map(measure);
  const fillW = kids.filter((k, i) => k.base.sizing?.w === "fill" && horiz).length;
  const fillH = kids.filter((k, i) => k.base.sizing?.h === "fill" && !horiz).length;
  const fixedMain = sizes.reduce((sum, s, i) => sum + (horiz ? (kids[i].base.sizing?.w === "fill" ? 0 : s.w) : (kids[i].base.sizing?.h === "fill" ? 0 : s.h)), 0);
  const mainSpace = horiz ? innerW : innerH;
  const totalGap = gap * Math.max(0, kids.length - 1);
  const fillSize = fillW || fillH ? Math.max(0, (mainSpace - fixedMain - totalGap) / (horiz ? Math.max(1, fillW) : Math.max(1, fillH))) : 0;

  const mainExtent = fixedMain + totalGap + fillSize * (horiz ? fillW : fillH);
  let cursor = horiz
    ? inset + pad.l + (L.justify === "center" ? (innerW - mainExtent) / 2 : L.justify === "end" ? innerW - mainExtent : L.justify === "between" ? 0 : 0)
    : inset + pad.t + (L.justify === "center" ? (innerH - mainExtent) / 2 : L.justify === "end" ? innerH - mainExtent : 0);
  const betweenGap = L.justify === "between" && kids.length > 1 ? Math.max(gap, (mainSpace - fixedMain - fillSize * (horiz ? fillW : fillH)) / (kids.length - 1)) : gap;

  const out = new Map();
  kids.forEach((k, i) => {
    const s = sizes[i];
    const w = horiz && k.base.sizing?.w === "fill" ? fillSize : s.w;
    const h = !horiz && k.base.sizing?.h === "fill" ? fillSize : s.h;
    const crossSize = horiz ? h : w;
    const crossSpace = horiz ? innerH : innerW;
    const crossStart = horiz ? inset + pad.t : inset + pad.l;
    const cross = L.align === "center" ? crossStart + (crossSpace - crossSize) / 2
      : L.align === "end" ? crossStart + crossSpace - crossSize
      : L.align === "stretch" ? crossStart
      : crossStart;
    const x = horiz ? cursor : cross;
    const y = horiz ? cross : cursor;
    out.set(k.id, { x: Math.round(x), y: Math.round(y), width: Math.round(Math.max(1, horiz && L.align === "stretch" ? w : w)), height: Math.round(Math.max(1, !horiz && L.align === "stretch" ? h : (L.align === "stretch" ? (horiz ? innerH : innerW) : h))) });
    cursor += (horiz ? w : h) + (i < kids.length - 1 ? betweenGap : 0);
  });
  return out;
}

/** Effective properties for a node on a device: base → auto-adapt → override → layout. */
export function propsOf(n, device = state.device) {
  const override = device === "desktop" ? {} : (n.responsive?.[device] || {});
  let p = { ...n.base, ...override };
  if (n.parentId) {
    const parent = node(n.parentId);
    if (parent) {
      const map = layoutChildren(parent, device);
      if (map.has(n.id)) p = { ...p, ...map.get(n.id) };
    }
  }
  return p;
}

export function nodeRect(n, device = state.device) {
  const p = propsOf(n, device);
  return { x: num(p.x), y: num(p.y), width: Math.max(1, num(p.width, 1)), height: Math.max(1, num(p.height, 1)) };
}

export function absoluteRect(n, device = state.device, seen = new Set()) {
  const r = nodeRect(n, device);
  if (!n.parentId || seen.has(n.id)) return r;
  const parent = node(n.parentId);
  if (!parent) return r;
  seen.add(n.id);
  const pr = absoluteRect(parent, device, seen);
  const inset = strokeInset(parent, device);
  return { x: pr.x + inset + r.x, y: pr.y + inset + r.y, width: r.width, height: r.height };
}

export function boundingBox(ids = state.selection, device = state.device) {
  const rects = ids.map((id) => node(id)).filter(Boolean).map((n) => absoluteRect(n, device));
  if (!rects.length) return null;
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export const rotationOf = (ids = state.selection) => {
  const set = new Set(ids.map((id) => node(id)).filter(Boolean).map((n) => num(propsOf(n).rotation)));
  return set.size === 1 ? [...set][0] : 0;
};

/* ----------------------------------------------------------------- editing */

export function setProps(n, patch, device = state.device) {
  if (device === "desktop") Object.assign(n.base, patch);
  else { n.responsive ||= {}; n.responsive[device] = { ...(n.responsive[device] || {}), ...patch }; }
}
export function setPropsFor(ids, patch, device = state.device) {
  ids.map(node).filter(Boolean).forEach((n) => setProps(n, patch, device));
}
export function clearOverride(n, device = state.device) {
  if (device !== "desktop" && n.responsive) delete n.responsive[device];
}
export const hasOverride = (n, device = state.device) => device !== "desktop" && Object.keys(n.responsive?.[device] || {}).length > 0;

export function setSelection(ids, { additive = false } = {}) {
  const list = [...new Set(Array.isArray(ids) ? ids : [ids])].filter((id) => node(id));
  state.selection = additive ? [...new Set([...state.selection, ...list])] : list;
  emit("selection");
  emit("document");
}
export const toggleSelection = (id) =>
  setSelection(state.selection.includes(id) ? state.selection.filter((x) => x !== id) : [...state.selection, id], { additive: false }) ||
  setSelection([...new Set([...state.selection, id])]);

export function reparent(id, parentId, device = state.device) {
  const n = node(id);
  if (!n || id === parentId || (parentId && isDescendant(parentId, id))) return;
  const global = absoluteRect(n, device);
  const parent = parentId ? node(parentId) : null;
  const pg = parent ? absoluteRect(parent, device) : { x: 0, y: 0 };
  const inset = parent ? strokeInset(parent, device) : 0;
  n.parentId = parentId || null;
  setProps(n, { x: Math.round(global.x - pg.x - inset), y: Math.round(global.y - pg.y - inset) }, device);
}

export function reorder(id, targetIndex) {
  const p = page();
  const from = p.nodes.findIndex((n) => n.id === id);
  if (from < 0) return;
  const [moved] = p.nodes.splice(from, 1);
  p.nodes.splice(clamp(targetIndex, 0, p.nodes.length), 0, moved);
}

export function zMove(ids, mode) {
  const p = page();
  const list = ids.map(node).filter(Boolean);
  if (!list.length) return;
  const order = (a, b) => p.nodes.indexOf(a) - p.nodes.indexOf(b);
  list.sort(order);
  if (mode === "front" || mode === "back") {
    (mode === "front" ? [...list].reverse() : list).forEach((n) => {
      p.nodes.splice(p.nodes.indexOf(n), 1);
      mode === "front" ? p.nodes.push(n) : p.nodes.unshift(n);
    });
    return;
  }
  const step = mode === "forward" ? 1 : -1;
  const seq = mode === "forward" ? [...list].reverse() : list;
  seq.forEach((n) => {
    const i = p.nodes.indexOf(n);
    const j = i + step;
    if (j < 0 || j >= p.nodes.length) return;
    const neighbour = p.nodes[j];
    if (neighbour.parentId !== n.parentId) return;
    p.nodes.splice(i, 1);
    p.nodes.splice(j, 0, n);
  });
}

/* ----------------------------------------------------------------- history */

const HISTORY_LIMIT = 80;
const history = { stack: [], index: -1 };

export const snapshot = () => JSON.stringify(state.project);
export function resetHistory() {
  history.stack = [snapshot()];
  history.index = 0;
  emit("history");
}
export function record(before, label = "change") {
  const after = snapshot();
  if (before === after) return false;
  history.stack = history.stack.slice(0, history.index + 1);
  history.stack.push(after);
  if (history.stack.length > HISTORY_LIMIT) history.stack.shift();
  history.index = history.stack.length - 1;
  emit("history");
  return true;
}
/** While `live.on`, mutations skip history (used for per-keystroke input);
    callers then push a single undo step with record(beforeSnapshot, label). */
export const live = { on: false };

export function change(mutator, label = "change") {
  if (live.on) {
    mutator();
    emit("document", { label });
    scheduleSave();
    return false;
  }
  const before = snapshot();
  mutator();
  const changed = record(before, label);
  emit("document", { label });
  if (changed) scheduleSave();
  return changed;
}
export function undo() {
  if (history.index <= 0) return false;
  history.index -= 1;
  state.project = normalizeProject(JSON.parse(history.stack[history.index]));
  state.selection = state.selection.filter((id) => node(id));
  emit("document"); emit("history"); scheduleSave();
  return true;
}
export function redo() {
  if (history.index >= history.stack.length - 1) return false;
  history.index += 1;
  state.project = normalizeProject(JSON.parse(history.stack[history.index]));
  state.selection = state.selection.filter((id) => node(id));
  emit("document"); emit("history"); scheduleSave();
  return true;
}
export const canUndo = () => history.index > 0;
export const canRedo = () => history.index < history.stack.length - 1;

/* ----------------------------------------------------------------- storage */

const DB_NAME = "vbuilder-2";
const DB_STORE = "projects";
const LS_KEY = "vbuilder-project-v2";
let dbPromise = null;
let saveTimer = null;

const openDb = () => (dbPromise ||= new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, { keyPath: "id" }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
}));

export async function save() {
  const payload = { id: "current", project: deepClone(state.project), savedAt: Date.now() };
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(payload);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch { /* storage full — non fatal */ }
  }
}
export const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); };

export async function restore() {
  try {
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
      const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get("current");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (record?.project) return { project: normalizeProject(record.project), savedAt: record.savedAt };
  } catch {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const parsed = JSON.parse(raw); return { project: normalizeProject(parsed.project || parsed), savedAt: parsed.savedAt }; }
    } catch (err) { console.warn("restore failed", err); }
  }
  return null;
}

/* ------------------------------------------------------------ hit testing */

export function nodeAtPoint(x, y, { ignore = null, device = state.device } = {}) {
  const hits = [];
  const z = state.view.computedZoom || 1;
  const walk = (parentId, depth) => {
    visibleChildren(parentId).forEach((n) => {
      if (n.id === ignore || n.locked) return;
      const r = absoluteRect(n, device);
      // Tiny layers (icons etc.) get a generous hit area on screen, so they
      // stay easy to grab even when zoomed out.
      const pad = n.type !== "frame" && (r.width * z < 16 || r.height * z < 16) ? 5 / z : 0;
      if (x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad) {
        hits.push({ node: n, depth, area: r.width * r.height });
      }
      if (n.type === "frame") walk(n.id, depth + 1);
    });
  };
  walk(null, 0);
  if (!hits.length) return null;
  // Deepest first, then smallest area — the classic "click through to the child" rule.
  hits.sort((a, b) => b.depth - a.depth || a.area - b.area);
  return hits[0].node;
}

export function frameAtPoint(x, y, { exclude = null, device = state.device } = {}) {
  const candidates = page().nodes
    .filter((n) => n.type === "frame" && n.visible && n.id !== exclude && !(exclude && isDescendant(n.id, exclude)))
    .map((n) => ({ n, r: absoluteRect(n, device) }))
    .filter(({ r }) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height);
  candidates.sort((a, b) => a.r.width * a.r.height - b.r.width * b.r.height);
  return candidates[0]?.n || null;
}

/* --------------------------------------------------------------- snapping */

const SNAP_TOLERANCE = 6;

/** Returns { x, y, guides } after snapping a moving bounding box against the page. */
export function snapBox(box, { ignoreIds = [], device = state.device } = {}) {
  if (!state.prefs.snap) return { x: box.x, y: box.y, guides: [] };
  const z = state.view.computedZoom || 1;
  const tol = SNAP_TOLERANCE / z;
  const pr = pageRect(device);
  const targets = { x: [0, pr.width / 2, pr.width], y: [0, pr.height / 2, pr.height] };

  const walk = (parentId) => visibleChildren(parentId).forEach((n) => {
    if (ignoreIds.includes(n.id) || ignoreIds.some((id) => isDescendant(n.id, id))) return;
    const r = absoluteRect(n, device);
    targets.x.push(r.x, r.x + r.width / 2, r.x + r.width);
    targets.y.push(r.y, r.y + r.height / 2, r.y + r.height);
    if (n.type === "frame") walk(n.id);
  });
  walk(null);

  const edges = { x: [box.x, box.x + box.width / 2, box.x + box.width], y: [box.y, box.y + box.height / 2, box.y + box.height] };
  const guides = [];
  let dx = 0, dy = 0, bestX = tol, bestY = tol;
  edges.x.forEach((edge, i) => targets.x.forEach((t) => {
    const d = Math.abs(edge - t);
    if (d < bestX) { bestX = d; dx = t - edge; guides.x = { at: t, from: edge, kind: ["start", "center", "end"][i] }; }
  }));
  edges.y.forEach((edge, i) => targets.y.forEach((t) => {
    const d = Math.abs(edge - t);
    if (d < bestY) { bestY = d; dy = t - edge; guides.y = { at: t, from: edge, kind: ["start", "center", "end"][i] }; }
  }));

  if (state.prefs.gridSize && !guides.x) {
    const g = state.prefs.gridSize;
    const snapped = Math.round(box.x / g) * g;
    if (Math.abs(snapped - box.x) < tol) dx = snapped - box.x;
  }
  if (state.prefs.gridSize && !guides.y) {
    const g = state.prefs.gridSize;
    const snapped = Math.round(box.y / g) * g;
    if (Math.abs(snapped - box.y) < tol) dy = snapped - box.y;
  }
  return { x: Math.round(box.x + dx), y: Math.round(box.y + dy), guides: guides.x || guides.y ? [guides.x && { axis: "x", at: guides.x.at }, guides.y && { axis: "y", at: guides.y.at }].filter(Boolean) : [] };
}

/** Snaps a resized box's width/height to matching sibling or page sizes. */
export function snapSize(rect, ignoreIds = [], device = state.device) {
  const out = { width: rect.width, height: rect.height };
  if (!state.prefs.snap || !state.prefs.showGuides) return out;
  const z = state.view.computedZoom || 1;
  const tol = SNAP_TOLERANCE / z;
  let bestW = tol, bestH = tol;
  const pr = pageRect(device);
  const consider = (w, h) => {
    const dw = Math.abs(rect.width - w);
    if (dw < bestW) { bestW = dw; out.width = w; }
    const dh = Math.abs(rect.height - h);
    if (dh < bestH) { bestH = dh; out.height = h; }
  };
  consider(pr.width, pr.height);
  const walk = (parentId) => visibleChildren(parentId).forEach((n) => {
    if (ignoreIds.includes(n.id) || ignoreIds.some((id) => isDescendant(n.id, id))) return;
    const r = absoluteRect(n, device);
    consider(r.width, r.height);
    if (n.type === "frame") walk(n.id);
  });
  walk(null);
  return out;
}

/* ------------------------------------------------------------ text sizing */

let measureEl = null;
export function measureText(content, style, maxWidth) {
  if (typeof document === "undefined") return { width: 300, height: 40 };
  measureEl ||= Object.assign(document.createElement("div"), { style: "position:absolute;visibility:hidden;white-space:pre-wrap;word-break:break-word;left:-99999px;top:0" });
  if (!measureEl.isConnected) document.body.appendChild(measureEl);
  Object.assign(measureEl.style, {
    width: `${Math.max(10, maxWidth)}px`, fontFamily: style.family || "Inter, sans-serif",
    fontSize: `${num(style.size, 16)}px`, fontWeight: String(style.weight || 400),
    lineHeight: String(style.lineHeight || 1.5), letterSpacing: `${num(style.letterSpacing)}px`,
    textTransform: style.transform || "none", padding: "0",
  });
  measureEl.textContent = content || " ";
  return { width: Math.ceil(measureEl.getBoundingClientRect().width), height: Math.ceil(measureEl.getBoundingClientRect().height) };
}
