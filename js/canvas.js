/* VBuilder 2 — canvas engine
   Rendering, viewport (pan/zoom), selection, drag/resize/rotate, marquee,
   smart guides, inline text editing and asset drop. */

import { dom } from "./dom.js";
import { iconSvg } from "./icons.js";
import * as C from "./core.js";
import { emit } from "./core.js";

/* ------------------------------------------------------------------ styles */

const gradientCss = (fill) => {
  const stops = (fill.stops || []).map((s) => `${s.color} ${C.num(s.at, 0)}%`).join(", ");
  return fill.type === "radial" ? `radial-gradient(circle at 50% 50%, ${stops})` : `linear-gradient(${C.num(fill.angle, 90)}deg, ${stops})`;
};

export function fillCss(fills) {
  const list = (fills || []).filter((f) => f && C.num(f.opacity, 100) > 0);
  if (!list.length) return "transparent";
  return list.map((f) => {
    if (f.type === "solid") {
      const a = C.clamp(C.num(f.opacity, 100), 0, 100) / 100;
      return a >= 1 ? f.color : `color-mix(in srgb, ${f.color} ${Math.round(a * 100)}%, transparent)`;
    }
    return gradientCss(f);
  }).reverse().join(", ");
}

const radiusCss = (r) => {
  if (!r) return "0px";
  const { tl = 0, tr = 0, br = 0, bl = 0 } = r;
  return tl === tr && tr === br && br === bl ? `${C.num(tl)}px` : `${C.num(tl)}px ${C.num(tr)}px ${C.num(br)}px ${C.num(bl)}px`;
};

/** Stroke rendering that honours inside / centre / outside alignment. */
export function strokeStyle(strokes) {
  const s = (strokes || []).find((x) => x && C.num(x.width) > 0);
  if (!s) return { border: "0 solid transparent", shadow: "" };
  const w = C.num(s.width);
  if (s.align === "inside") return { border: "0 solid transparent", shadow: `inset 0 0 0 ${w}px ${s.color}` };
  if (s.align === "outside") return { border: "0 solid transparent", shadow: `0 0 0 ${w}px ${s.color}` };
  return { border: `${w}px solid ${s.color}`, shadow: "" };
}

export function effectsCss(effects) {
  const shadows = (effects || []).filter((e) => e.type === "shadow" || e.type === "inner");
  const shadow = shadows.map((e) => {
    const a = C.clamp(C.num(e.opacity, 100), 0, 100) / 100;
    return `${e.type === "inner" ? "inset " : ""}${C.num(e.x)}px ${C.num(e.y)}px ${C.num(e.blur)}px ${C.num(e.spread)}px ${withAlpha(e.color, a)}`;
  }).join(", ");
  const blur = (effects || []).find((e) => e.type === "blur");
  const backdrop = (effects || []).find((e) => e.type === "background");
  return { boxShadow: shadow || "none", filter: blur ? `blur(${C.num(blur.radius, 4)}px)` : "none", backdropFilter: backdrop ? `blur(${C.num(backdrop.radius, 12)}px)` : "none" };
}

/** A readable text colour to sit on top of the given fills (used for buttons). */
export function readableOn(fills) {
  const f = (fills || []).find((x) => x && x.type === "solid" && C.num(x.opacity, 100) > 45);
  if (!f) return "#ffffff";
  const m = /^#([0-9a-f]{3,8})$/i.exec(String(f.color || "").trim());
  if (!m) return "#ffffff";
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#0b0d12" : "#ffffff";
}

export const withAlpha = (hex, alpha) => {
  const m = /^#([0-9a-f]{3,8})$/i.exec(String(hex || "").trim());
  if (!m) return String(hex || "#000");
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
};

/* ------------------------------------------------------------------ render */

export function applyVisual(node, el, p) {
  el.style.opacity = String(C.clamp(C.num(p.opacity, 100), 0, 100) / 100);
  el.style.borderRadius = node.type === "ellipse" ? "50%" : radiusCss(p.radius);
  const st = strokeStyle(p.strokes);
  el.style.border = st.border;
  const background = fillCss(p.fills);
  // Text layers: fills are the *type* colour, never a background box.
  if (node.type === "text") el.style.background = "transparent";
  else if (node.type !== "image" || !node.assetId) el.style.background = background;
  if (p.blend && p.blend !== "normal") el.style.mixBlendMode = p.blend;
  const fx = effectsCss(p.effects);
  el.style.boxShadow = [st.shadow, fx.boxShadow !== "none" ? fx.boxShadow : ""].filter(Boolean).join(", ") || "none";
  el.style.filter = fx.filter;
  el.style.backdropFilter = fx.backdropFilter;
  if (p.rotation || p.flipX || p.flipY) {
    el.style.transform = `rotate(${C.num(p.rotation)}deg) scaleX(${p.flipX ? -1 : 1}) scaleY(${p.flipY ? -1 : 1})`;
  } else el.style.transform = "";
}

function textStyle(p, isButton = false) {
  return {
    color: isButton ? readableOn(p.fills) : (p.fills?.find((f) => f.type === "solid")?.color || "#f2f3f7"),
    fontFamily: p.family || "Inter, sans-serif",
    fontSize: `${Math.max(1, C.num(p.size, 16))}px`,
    fontWeight: String(p.weight || 400),
    lineHeight: String(p.lineHeight || 1.5),
    letterSpacing: `${C.num(p.letterSpacing)}px`,
    textAlign: p.align || "left",
    textTransform: p.transform || "none",
    textDecoration: p.decoration && p.decoration !== "none" ? p.decoration : "none",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };
}

const justifyFor = (v) => (v === "center" ? "center" : v === "bottom" ? "flex-end" : "flex-start");

export function createNodeElement(n, p, index) {
  const el = document.createElement("div");
  el.className = `vb-node vb-${n.type}`;
  el.dataset.id = n.id;
  Object.assign(el.style, {
    position: "absolute",
    left: `${C.num(p.x)}px`, top: `${C.num(p.y)}px`,
    width: `${Math.max(1, C.num(p.width, 1))}px`, height: `${Math.max(1, C.num(p.height, 1))}px`,
    zIndex: String(index + 1),
    display: "flex", flexDirection: "column",
  });
  applyVisual(n, el, p);

  if (n.type === "text" || n.type === "button") {
    el.style.justifyContent = justifyFor(p.valign);
    el.style.alignItems = p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start";
    const inner = document.createElement("div");
    inner.className = "node-text";
    const empty = !n.content && n.type !== "button";
    if (n.content) inner.textContent = n.content;
    else if (n.type === "button") inner.textContent = "Button";
    else { inner.textContent = "Type something"; inner.classList.add("is-placeholder"); }
    Object.assign(inner.style, textStyle(p, n.type === "button"));
    if (empty) { inner.style.color = "rgba(150, 158, 175, .6)"; }
    if (n.type === "button") { inner.style.cursor = "default"; el.style.cursor = "default"; }
    el.appendChild(inner);
  } else if (n.type === "image") {
    const a = C.asset(n.assetId);
    if (a?.src) {
      const img = document.createElement("img");
      img.src = a.src; img.alt = n.alt || a.name || ""; img.draggable = false;
      Object.assign(img.style, { width: "100%", height: "100%", objectFit: p.objectFit || "cover", objectPosition: p.objectPosition || "center center", display: "block", borderRadius: "inherit" });
      el.appendChild(img);
    } else {
      el.classList.add("is-empty");
      el.innerHTML = `<span class="empty-hint">${iconSvg("image", { size: 20 })}<span>Drop image</span></span>`;
    }
  } else if (n.type === "icon") {
    const svgWrap = document.createElement("div");
    svgWrap.className = "node-icon";
    svgWrap.innerHTML = iconSvg(p.icon || n.base.icon || "sparkles", { size: 24, strokeWidth: C.num(p.strokeWidth, 2) });
    const svg = svgWrap.firstElementChild;
    svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
    svg.style.color = p.fills?.find((f) => f.type === "solid")?.color || "#e8eaef";
    svg.style.display = "block";
    el.appendChild(svg);
    el.style.background = "transparent";
  } else if (n.type === "star") {
    el.style.background = "transparent";
    el.innerHTML = `<svg viewBox="0 0 24 24" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z" fill="${p.fills?.find((f) => f.type === "solid")?.color || "#3b82f6"}"/></svg>`;
    el.style.border = "0 solid transparent";
  } else if (n.type === "arrow") {
    el.style.background = "transparent";
    const c = p.strokes?.find((s) => s.width > 0)?.color || p.fills?.find((f) => f.type === "solid")?.color || "#3a3f4d";
    el.innerHTML = `<svg viewBox="0 0 100 24" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><path d="M0 12h88M78 4l12 8-12 8" fill="none" stroke="${c}" stroke-width="${Math.max(1, C.num(p.strokes?.[0]?.width, 2))}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
    el.style.border = "0 solid transparent";
  } else if (n.type === "frame" && C.state.selection.includes(n.id)) {
    const label = document.createElement("span");
    label.className = "frame-label";
    label.textContent = n.name;
    el.appendChild(label);
  }
  if (n.locked) el.classList.add("is-locked");
  if (p.action?.type && p.action.type !== "none" && C.state.prefs.showOutline) el.classList.add("is-interactive");
  return el;
}

function renderTree(parentId, container) {
  C.visibleChildren(parentId).forEach((n) => {
    const p = C.propsOf(n);
    const el = createNodeElement(n, p, C.page().nodes.indexOf(n));
    container.appendChild(el);
    if (n.type === "frame") renderTree(n.id, el);
  });
}

export function render() {
  const wrap = dom.artboardWrap, board = dom.artboard, overlay = dom.overlay;
  if (!wrap || !board) return;
  const size = C.pageRect();
  const z = zoom();
  C.state.view.computedZoom = z;

  Object.assign(board.style, { width: `${size.width}px`, height: `${size.height}px`, background: C.page().background || "#101114" });
  dom.scaleLayer.style.width = `${size.width}px`;
  dom.scaleLayer.style.height = `${size.height}px`;
  dom.scaleLayer.style.transform = `scale(${z})`;
  Object.assign(wrap.style, {
    width: `${Math.round(size.width * z)}px`, height: `${Math.round(size.height * z)}px`,
    transform: `translate(calc(-50% + ${Math.round(C.state.view.panX)}px), calc(-50% + ${Math.round(C.state.view.panY)}px))`,
  });

  board.innerHTML = "";
  renderTree(null, board);
  renderOverlay();
  renderGuides();
  renderRulers(size, z);
  renderCaption(size);
}

const renderCaption = (size) => {
  const preset = C.DEVICES[C.state.device];
  if (dom.canvasCaption) {
    dom.canvasCaption.textContent = preset.fluid
      ? `${preset.label} · fluid · ${size.width} × ${size.height} base`
      : `${preset.label} · ${size.width} × ${size.height}`;
  }
  if (dom.zoomCaption) dom.zoomCaption.textContent = C.state.view.mode === "fit" ? "Fit" : `${Math.round(zoom() * 100)}%`;
  if (dom.zoomValue) dom.zoomValue.textContent = `${Math.round(zoom() * 100)}%`;
};

/* ------------------------------------------------------------------- guides */

function renderGuides() {
  const svg = dom.guides;
  if (!svg) return;
  const size = C.pageRect();
  svg.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  const lines = [];
  (C.state.guides || []).forEach((g) => {
    if (g.axis === "x") lines.push(`<line x1="${g.at}" y1="0" x2="${g.at}" y2="${size.height}" />`);
    else lines.push(`<line x1="0" y1="${g.at}" x2="${size.width}" y2="${g.at}" />`);
  });
  svg.innerHTML = lines.join("");
}

function renderRulers(size, z) {
  if (!dom.rulerTop || !dom.rulerLeft) return;
  const show = C.state.prefs.showRulers;
  dom.rulerTop.hidden = !show; dom.rulerLeft.hidden = !show;
  if (!show) return;
  const wrapRect = dom.artboardWrap.getBoundingClientRect();
  const viewRect = dom.canvasViewport.getBoundingClientRect();
  const EDGE = 20; // ruler thickness
  const ox = wrapRect.left - viewRect.left; // artboard origin in viewport pixels
  const oy = wrapRect.top - viewRect.top;
  const step = z < 0.15 ? 1000 : z < 0.3 ? 500 : z < 0.6 ? 200 : z < 1.2 ? 100 : 50;
  const sub = step / 5;
  const sel = C.boundingBox();

  const ticksX = [];
  const firstX = Math.floor((-ox) / z / sub) * sub;
  const lastX = Math.ceil((viewRect.width - ox) / z / sub) * sub;
  for (let x = firstX; x <= lastX; x += sub) {
    const px = ox + x * z - EDGE;
    if (px < -4 || px > viewRect.width) continue;
    const major = Math.round(x) % step === 0;
    ticksX.push(major
      ? `<g><line x1="${px}" y1="12" x2="${px}" y2="20"/><text x="${px + 3}" y="10">${Math.round(x)}</text></g>`
      : `<line x1="${px}" y1="16" x2="${px}" y2="20"/>`);
  }
  const ticksY = [];
  const firstY = Math.floor((-oy) / z / sub) * sub;
  const lastY = Math.ceil((viewRect.height - oy) / z / sub) * sub;
  for (let y = firstY; y <= lastY; y += sub) {
    const py = oy + y * z - EDGE;
    if (py < -4 || py > viewRect.height) continue;
    const major = Math.round(y) % step === 0;
    ticksY.push(major
      ? `<g><line x1="12" y1="${py}" x2="20" y2="${py}"/><text x="2" y="${py - 3}" class="v">${Math.round(y)}</text></g>`
      : `<line x1="16" y1="${py}" x2="20" y2="${py}"/>`);
  }

  const range = (axis) => {
    if (!sel) return "";
    const a = axis === "x" ? ox + sel.x * z - EDGE : oy + sel.y * z - EDGE;
    const b = axis === "x" ? ox + (sel.x + sel.width) * z - EDGE : oy + (sel.y + sel.height) * z - EDGE;
    return axis === "x"
      ? `<rect x="${a}" y="17" width="${Math.max(1, b - a)}" height="3" class="sel"/>`
      : `<rect x="17" y="${a}" width="3" height="${Math.max(1, b - a)}" class="sel"/>`;
  };

  dom.rulerTop.innerHTML = `<svg width="100%" height="20" shape-rendering="crispEdges">${ticksX.join("")}${range("x")}</svg>`;
  dom.rulerLeft.innerHTML = `<svg width="20" height="100%" shape-rendering="crispEdges">${ticksY.join("")}${range("y")}</svg>`;
}

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function renderOverlay() {
  const overlay = dom.overlay;
  if (!overlay) return;
  overlay.innerHTML = "";
  if (!C.state.prefs.showOutline && !C.state.selection.length) return;

  const z = zoom();
  const inv = 1 / z;

  C.state.selection.forEach((id) => {
    const n = C.node(id);
    if (!n || !n.visible) return;
    const r = C.absoluteRect(n);
    const box = document.createElement("div");
    box.className = "outline";
    Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px`, borderWidth: `${inv}px` });
    if (C.num(C.propsOf(n).rotation)) box.style.transform = `rotate(${C.num(C.propsOf(n).rotation)}deg)`;
    overlay.appendChild(box);
  });

  if (C.state.hoveredId && !C.state.selection.includes(C.state.hoveredId)) {
    const n = C.node(C.state.hoveredId);
    if (n?.visible) {
      const r = C.absoluteRect(n);
      const box = document.createElement("div");
      box.className = "outline hover";
      Object.assign(box.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px`, borderWidth: `${inv}px` });
      overlay.appendChild(box);
    }
  }

  const bbox = C.boundingBox();
  if (!bbox) return;

  const box = document.createElement("div");
  box.className = "selection-box";
  const rot = C.rotationOf();
  Object.assign(box.style, { left: `${bbox.x}px`, top: `${bbox.y}px`, width: `${bbox.width}px`, height: `${bbox.height}px`, borderWidth: `${inv}px` });
  if (rot) box.style.transform = `rotate(${rot}deg)`;

  const label = document.createElement("span");
  label.className = "selection-label";
  label.style.fontSize = `${11 * inv}px`;
  label.style.padding = `${2 * inv}px ${5 * inv}px`;
  label.style.borderRadius = `${4 * inv}px`;
  const count = C.state.selection.length;
  label.textContent = count > 1 ? `${count} layers` : (C.node(C.state.selection[0])?.name || "");
  box.appendChild(label);

  const dims = document.createElement("span");
  dims.className = "selection-dims";
  dims.style.fontSize = `${11 * inv}px`;
  dims.style.padding = `${2 * inv}px ${5 * inv}px`;
  dims.style.borderRadius = `${4 * inv}px`;
  dims.textContent = `${Math.round(bbox.width)} × ${Math.round(bbox.height)}`;
  box.appendChild(dims);

  const hSize = 9 * inv;
  HANDLES.forEach((dir) => {
    const h = document.createElement("span");
    h.className = `handle ${dir}`;
    h.dataset.handle = dir;
    Object.assign(h.style, { width: `${hSize}px`, height: `${hSize}px`, borderWidth: `${inv}px`, borderRadius: `${2 * inv}px` });
    box.appendChild(h);
  });

  const rotHandle = document.createElement("span");
  rotHandle.className = "handle rotate";
  rotHandle.dataset.handle = "rotate";
  Object.assign(rotHandle.style, { width: `${hSize + 2}px`, height: `${hSize + 2}px`, borderWidth: `${inv}px` });
  rotHandle.innerHTML = iconSvg("rotate", { size: Math.round(10 * inv) });
  box.appendChild(rotHandle);

  overlay.appendChild(box);

  if (dom.overlayLabel) return;
}

/* ------------------------------------------------------------------ zooming */

export function zoom() {
  if (C.state.view.mode !== "fit") return C.state.view.zoom;
  const vp = dom.canvasViewport;
  const size = C.pageRect();
  const w = vp ? Math.max(300, vp.clientWidth - 96) : 1200;
  const h = vp ? Math.max(240, vp.clientHeight - 110) : 800;
  return C.clamp(Math.min(w / size.width, h / size.height), 0.05, 1);
}

export function setZoom(value, { mode = "manual" } = {}) {
  C.state.view.mode = mode;
  C.state.view.zoom = C.clamp(C.round(value, 3), 0.05, 8);
  render();
  emit("view");
}
export const zoomBy = (factor) => setZoom(zoom() * factor);
export function fit() { C.state.view.mode = "fit"; C.state.view.panX = 0; C.state.view.panY = 0; render(); emit("view"); }
export function zoomTo(value) { setZoom(value, { mode: "manual" }); }

export function zoomAt(clientX, clientY, next) {
  const before = dom.artboardWrap.getBoundingClientRect();
  const old = zoom();
  const px = (clientX - before.left) / old;
  const py = (clientY - before.top) / old;
  setZoom(next);
  const after = dom.artboardWrap.getBoundingClientRect();
  C.state.view.panX += clientX - (after.left + px * zoom());
  C.state.view.panY += clientY - (after.top + py * zoom());
  render();
}

export const toCanvasPoint = (clientX, clientY) => {
  const r = dom.artboardWrap.getBoundingClientRect();
  const z = zoom();
  return { x: (clientX - r.left) / z, y: (clientY - r.top) / z };
};

/* ------------------------------------------------------------- interactions */

function beginInteraction(data) {
  C.state.interaction = { ...data, before: C.snapshot() };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function onMove(event) {
  const it = C.state.interaction;
  if (!it) return;
  const z = zoom();

  if (it.type === "pan") {
    C.state.view.panX = it.panX + (event.clientX - it.startX);
    C.state.view.panY = it.panY + (event.clientY - it.startY);
    render();
    return;
  }

  if (it.type === "draw") {
    const cur = toCanvasPoint(event.clientX, event.clientY);
    const n = C.node(it.ids[0]);
    if (n) {
      C.setProps(n, {
        x: Math.round(Math.min(it.origin.x, cur.x)), y: Math.round(Math.min(it.origin.y, cur.y)),
        width: Math.max(2, Math.round(Math.abs(cur.x - it.origin.x))),
        height: Math.max(2, Math.round(Math.abs(cur.y - it.origin.y))),
      });
      render();
    }
    return;
  }

  if (it.type === "marquee") {
    const a = toCanvasPoint(it.startX, it.startY);
    const b = toCanvasPoint(event.clientX, event.clientY);
    C.state.marquee = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
    drawMarquee();
    return;
  }

  const dx = (event.clientX - it.startX) / z;
  const dy = (event.clientY - it.startY) / z;

  if (it.type === "drag") {
    const snapped = C.snapBox({ ...it.box, x: it.box.x + dx, y: it.box.y + dy }, { ignoreIds: it.ids });
    C.state.guides = it.altKey || event.altKey ? [] : snapped.guides;
    const offsetX = snapped.x - it.box.x;
    const offsetY = snapped.y - it.box.y;
    it.ids.forEach((id, i) => {
      const n = C.node(id);
      if (!n || n.locked) return;
      C.setProps(n, { x: Math.round(it.origins[i].x + offsetX), y: Math.round(it.origins[i].y + offsetY) });
    });
    render();
    return;
  }

  if (it.type === "resize") {
    let next = resizeRect(it.rect, it.handle, dx, dy, event.shiftKey);
    const sized = C.snapSize(next, it.ids);
    next = { ...next, width: sized.width, height: sized.height };
    const delta = { x: next.x - it.rect.x, y: next.y - it.rect.y, sx: next.width / Math.max(1, it.rect.width), sy: next.height / Math.max(1, it.rect.height) };
    it.ids.forEach((id, i) => {
      const n = C.node(id);
      if (!n || n.locked) return;
      const o = it.origins[i];
      const patch = {
        x: Math.round(o.rect.x + delta.x + (o.rect.x - it.rect.x) * (delta.sx - 1)),
        y: Math.round(o.rect.y + delta.y + (o.rect.y - it.rect.y) * (delta.sy - 1)),
        width: Math.max(1, Math.round(o.rect.width * delta.sx)),
        height: Math.max(1, Math.round(o.rect.height * delta.sy)),
      };
      if (n.type === "text" && !event.altKey) {
        const ratio = patch.width / Math.max(1, o.rect.width);
        if (C.num(ratio - 1) > 0.001) patch.size = Math.max(4, C.round(C.num(o.props.size, 16) * ratio, 2));
      }
      if (n.base.lockRatio && o.rect.width && o.rect.height) {
        patch.height = Math.max(1, Math.round(patch.width * (o.rect.height / o.rect.width)));
      }
      C.setProps(n, patch);
    });
    render();
    return;
  }

  if (it.type === "rotate") {
    const centre = { x: it.centre.x, y: it.centre.y };
    const start = Math.atan2(it.startY / z - centre.y, it.startX / z - centre.x);
    const point = toCanvasPoint(event.clientX, event.clientY);
    const now = Math.atan2(point.y - centre.y, point.x - centre.x);
    let deg = C.round(((now - start) * 180) / Math.PI + it.baseRotation);
    if (event.shiftKey) deg = Math.round(deg / 15) * 15;
    if (Math.abs(deg) < 2 || Math.abs(Math.abs(deg) - 360) < 2) deg = 0;
    it.ids.forEach((id) => {
      const n = C.node(id);
      if (!n || n.locked) return;
      C.setProps(n, { rotation: ((deg % 360) + 360) % 360 });
    });
    render();
    return;
  }

  if (it.type === "page-resize") {
    const size = C.pageRect();
    const next = Math.max(200, Math.round(it.originHeight + dy));
    if (C.state.device === "desktop") C.page().height = next;
    else { C.page().responsive[C.state.device] = { ...(C.page().responsive[C.state.device] || {}), height: next }; }
    render();
    return;
  }
}

function drawMarquee() {
  const m = C.state.marquee;
  let el = dom.overlay.querySelector(".marquee");
  if (!m) { el?.remove(); return; }
  if (!el) { el = document.createElement("div"); el.className = "marquee"; dom.overlay.appendChild(el); }
  Object.assign(el.style, { left: `${m.x}px`, top: `${m.y}px`, width: `${m.width}px`, height: `${m.height}px`, borderWidth: `${1 / zoom()}px` });
}

function resizeRect(rect, handle, dx, dy, keepRatio) {
  let { x, y } = rect;
  let width = rect.width, height = rect.height;
  if (handle.includes("e")) width += dx;
  if (handle.includes("s")) height += dy;
  if (handle.includes("w")) { width -= dx; x += dx; }
  if (handle.includes("n")) { height -= dy; y += dy; }
  if (keepRatio && rect.width && rect.height) {
    const ratio = rect.width / rect.height;
    if (Math.abs(dx) >= Math.abs(dy)) { height = width / ratio; if (handle.includes("n")) y = rect.y + rect.height - height; }
    else { width = height * ratio; if (handle.includes("w")) x = rect.x + rect.width - width; }
  }
  const min = 4;
  if (width < min) { if (handle.includes("w")) x -= min - width; width = min; }
  if (height < min) { if (handle.includes("n")) y -= min - height; height = min; }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function onUp() {
  window.removeEventListener("pointermove", onMove);
  const it = C.state.interaction;
  C.state.interaction = null;
  C.state.guides = [];

  if (it?.type === "draw") {
    const n = C.node(it.ids[0]);
    if (n) {
      const p = C.propsOf(n);
      if (C.num(p.width) < 6 && C.num(p.height) < 6) {
        const d = C.defaultsFor(n.type);
        C.setProps(n, { x: Math.round(it.origin.x - d.width / 2), y: Math.round(it.origin.y - d.height / 2), width: d.width, height: d.height });
      }
    }
  }
  if (it?.type === "marquee") {
    const m = C.state.marquee;
    C.state.marquee = null;
    drawMarquee();
    if (m && m.width > 3 && m.height > 3) {
      const hits = C.page().nodes.filter((n) => {
        if (!n.visible || n.locked || n.parentId) return false;
        const r = C.absoluteRect(n);
        return r.x < m.x + m.width && r.x + r.width > m.x && r.y < m.y + m.height && r.y + r.height > m.y;
      }).map((n) => n.id);
      C.setSelection(it.additive ? [...new Set([...it.previous, ...hits])] : hits);
    }
    render();
    return;
  }
  if (!it || it.type === "pan") return;
  if (it.type === "drag") autoParent(it.ids);
  if (it.type === "page-resize") emit("document");
  C.record(it.before, it.type);
  render();
  emit("document");
}

/** Dropping an element over a frame nests it — the Figma behaviour users expect. */
function autoParent(ids) {
  ids.forEach((id) => {
    const n = C.node(id);
    if (!n || n.type === "frame") return;
    const r = C.absoluteRect(n);
    const target = C.frameAtPoint(r.x + r.width / 2, r.y + r.height / 2, { exclude: id });
    const nextParent = target?.id || null;
    if (nextParent === (n.parentId || null)) return;
    C.reparent(id, nextParent);
  });
}

function beginDraw(event, id) {
  beginInteraction({ type: "draw", ids: [id], origin: toCanvasPoint(event.clientX, event.clientY), startX: event.clientX, startY: event.clientY });
}

function startDrag(event, ids) {
  const movable = ids.filter((id) => C.node(id) && !C.node(id).locked);
  if (!movable.length) return;
  const box = C.boundingBox(movable);
  const origins = movable.map((id) => {
    const n = C.node(id);
    const p = C.propsOf(n);
    return { x: C.num(p.x), y: C.num(p.y) };
  });
  beginInteraction({ type: "drag", ids: movable, origins, box, startX: event.clientX, startY: event.clientY });
}

function startResize(event, handle) {
  const ids = C.state.selection.filter((id) => C.node(id) && !C.node(id).locked);
  if (!ids.length) return;
  const box = C.boundingBox(ids);
  const origins = ids.map((id) => {
    const n = C.node(id);
    return { rect: C.absoluteRect(n), props: C.propsOf(n) };
  });
  beginInteraction({ type: "resize", ids, handle, rect: box, origins, startX: event.clientX, startY: event.clientY });
  event.stopPropagation();
}

function startRotate(event) {
  const ids = C.state.selection.filter((id) => C.node(id) && !C.node(id).locked);
  if (!ids.length) return;
  const box = C.boundingBox(ids);
  beginInteraction({
    type: "rotate", ids, centre: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    startX: event.clientX, startY: event.clientY, baseRotation: C.rotationOf(ids),
  });
  event.stopPropagation();
}

function startPan(event) {
  dom.canvasViewport.classList.add("is-panning");
  beginInteraction({ type: "pan", panX: C.state.view.panX, panY: C.state.view.panY, startX: event.clientX, startY: event.clientY });
  const stop = () => { dom.canvasViewport.classList.remove("is-panning"); window.removeEventListener("pointerup", stop); };
  window.addEventListener("pointerup", stop, { once: true });
}

function onPointerDown(event) {
  const middle = event.button === 1;
  const right = event.button === 2;
  if (middle || C.state.tool === "hand") { startPan(event); event.preventDefault(); return; }
  if (right) return; // context menu handles it
  if (event.button !== 0) return;

  // Figma-style armed creation tool: click (or drag) places the element here.
  const armed = C.state.tool;
  if (armed !== "select" && C.NODE_TYPES[armed]) {
    event.preventDefault();
    const point = toCanvasPoint(event.clientX, event.clientY);
    import("./main.js").then((m) => {
      if (armed === "image") { m.requestImageAt(point); m.disarmTool(); return; }
      const drawn = ["frame", "rect", "ellipse", "line", "arrow", "star"].includes(armed);
      const node = m.placeArmedTool(armed, point, C.state.toolPreset);
      if (drawn && node) beginDraw(event, node.id);
    });
    return;
  }

  // Alt-click selects the parent layer (drill out), like Figma.
  if (event.altKey) {
    const point = toCanvasPoint(event.clientX, event.clientY);
    const hit = C.nodeAtPoint(point.x, point.y);
    if (hit) {
      event.preventDefault();
      C.setSelection(hit.parentId ? [hit.parentId] : [hit.id]);
      render();
      return;
    }
  }

  // While editing text inline, clicks inside the same node place the caret.
  if (C.state.editingTextId) {
    const editing = event.target.closest?.("[data-id]");
    if (editing && editing.dataset.id === C.state.editingTextId) return;
  }

  const handleEl = event.target.closest("[data-handle]");
  if (handleEl) {
    handleEl.dataset.handle === "rotate" ? startRotate(event) : startResize(event, handleEl.dataset.handle);
    event.preventDefault();
    return;
  }

  const point = toCanvasPoint(event.clientX, event.clientY);
  const hit = C.nodeAtPoint(point.x, point.y);
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;

  if (!hit) {
    if (!additive && C.state.selection.length) C.setSelection([]);
    beginInteraction({ type: "marquee", startX: event.clientX, startY: event.clientY, additive, previous: [...C.state.selection] });
    return;
  }

  if (additive) {
    const next = C.state.selection.includes(hit.id) ? C.state.selection.filter((x) => x !== hit.id) : [...C.state.selection, hit.id];
    C.setSelection(next);
  } else if (!C.state.selection.includes(hit.id)) {
    C.setSelection([hit.id]);
  }
  render();
  startDrag(event, C.state.selection);
  event.preventDefault();
}

function onPointerMoveHover(event) {
  if (C.state.interaction) return;
  const point = toCanvasPoint(event.clientX, event.clientY);
  const hit = C.nodeAtPoint(point.x, point.y);
  const id = hit?.id || null;
  if (id !== C.state.hoveredId) { C.state.hoveredId = id; renderOverlay(); }
}

/* --------------------------------------------------------------- text edit */

export function beginTextEdit(id) {
  const n = C.node(id);
  if (!n || (n.type !== "text" && n.type !== "button")) return;
  C.state.editingTextId = id;
  const target = dom.artboard.querySelector(`[data-id="${id}"] .node-text`);
  if (!target) return;
  if (!n.content) { target.textContent = ""; target.classList.remove("is-placeholder"); }
  target.contentEditable = "true";
  target.spellcheck = false;
  target.classList.add("editing");
  target.focus();
  document.getSelection()?.selectAllChildren(target);

  const before = C.snapshot();
  const commit = () => {
    target.contentEditable = "false";
    target.classList.remove("editing");
    target.removeEventListener("blur", commit);
    target.removeEventListener("keydown", onKey);
    C.state.editingTextId = null;
    const value = target.innerText.replace(/\n$/, "");
    if (value !== n.content) {
      C.change(() => { n.content = value; }, "edit text");
      const p = C.propsOf(n);
      const measured = C.measureText(value, p, C.num(p.width, 200));
      if (measured.height > C.num(p.height, 1) + 1) C.change(() => C.setProps(n, { height: Math.ceil(measured.height) }), "autogrow");
    }
    render();
  };
  const onKey = (e) => {
    if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); target.blur(); }
    e.stopPropagation();
  };
  target.addEventListener("blur", commit);
  target.addEventListener("keydown", onKey);
}

/* ------------------------------------------------------------------ wiring */

export function init() {
  const vp = dom.canvasViewport;
  vp.addEventListener("pointerdown", onPointerDown);
  vp.addEventListener("pointermove", onPointerMoveHover);
  vp.addEventListener("pointerleave", () => { if (C.state.hoveredId) { C.state.hoveredId = null; renderOverlay(); } });
  vp.addEventListener("dblclick", (event) => {
    const el = event.target.closest("[data-id]");
    if (el) beginTextEdit(el.dataset.id);
  });
  dom.pageResizeHandle?.addEventListener("pointerdown", (event) => {
    const size = C.pageRect();
    beginInteraction({ type: "page-resize", originHeight: size.height, startX: event.clientX, startY: event.clientY });
    event.preventDefault(); event.stopPropagation();
  });

  document.addEventListener("wheel", (event) => {
    if (!event.target.closest?.("#canvasViewport")) return;
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (!dy) return;
      zoomAt(event.clientX, event.clientY, zoom() * Math.pow(1.1, -dy / 100));
      return;
    }
    if (event.deltaX || dy) {
      event.preventDefault();
      C.state.view.panX -= event.shiftKey ? dy : event.deltaX;
      C.state.view.panY -= event.shiftKey ? 0 : dy;
      render();
    }
  }, { passive: false, capture: true });

  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    document.addEventListener(type, (event) => {
      if (!event.target.closest?.("#canvasViewport")) return;
      event.preventDefault();
      if (type === "gesturestart") gestureBase = zoom();
      if (type === "gesturechange" && event.scale) {
        const rect = vp.getBoundingClientRect();
        zoomAt(event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2, gestureBase * event.scale);
      }
    }, { passive: false, capture: true });
  });

  // Drop an image straight onto the canvas (Canva-style quick insert).
  vp.addEventListener("dragover", (event) => { if (event.dataTransfer?.types?.includes("Files")) { event.preventDefault(); vp.classList.add("is-dropping"); } });
  vp.addEventListener("dragleave", () => vp.classList.remove("is-dropping"));
  vp.addEventListener("drop", (event) => {
    if (!event.dataTransfer?.files?.length) return;
    event.preventDefault();
    vp.classList.remove("is-dropping");
    const point = toCanvasPoint(event.clientX, event.clientY);
    import("./main.js").then((m) => m.addImageFiles([...event.dataTransfer.files], point));
  });

  window.addEventListener("resize", () => render());
}

let gestureBase = 1;
