/* VBuilder 2 — right-hand inspector (Design / Prototype / Inspect) */

import { dom, el, $$ } from "./dom.js";
import { iconSvg, SWATCHES, GRADIENTS } from "./icons.js";
import * as C from "./core.js";
import { toast, showMenu } from "./panels.js";
import { fillCss } from "./canvas.js";
import * as F from "./fonts.js";

const refresh = (opts) => import("./main.js").then((m) => m.refresh(opts));
const soft = () => refresh({ skipInspector: true });

/* ------------------------------------------------------------- field atoms */

function section(title, children, { right = null, collapsed = false } = {}) {
  const body = el("div", { class: "section-body" }, children.filter(Boolean));
  const node = el("section", { class: `insp-section${collapsed ? " collapsed" : ""}` }, [
    el("header", { class: "section-head", onclick: (e) => { if (e.target.closest("button")) return; node.classList.toggle("collapsed"); } }, [
      el("span", { class: "section-title", text: title }),
      right,
      el("span", { class: "section-chev", html: iconSvg("chevron-down", { size: 13 }) }),
    ]),
    body,
  ]);
  return node;
}

const row = (children, cls = "field-row") => el("div", { class: cls }, (Array.isArray(children) ? children : [children]).filter(Boolean));

/* Numeric fields edit live but collapse into a single undo step:
   a snapshot is taken on focus and one history entry is pushed on commit. */
function numField(label, value, onChange, { min = -9999, max = 9999, step = 1, suffix = "", icon = null, historyLabel = "edit" } = {}) {
  const input = el("input", { class: "field-input", type: "number", value: C.round(C.num(value), 3), min, max, step, "aria-label": label });
  let before = null;
  const commit = () => {
    const raw = Number(input.value);
    const v = Number.isFinite(raw) ? C.clamp(raw, min, max) : C.num(value);
    input.value = C.round(v, 3);
    onChange(v);
    if (before !== null) { C.record(before, historyLabel); before = null; }
  };
  input.addEventListener("focus", () => { before = C.snapshot(); });
  input.addEventListener("input", () => {
    const raw = Number(input.value);
    if (Number.isFinite(raw)) { C.live.on = true; onChange(C.clamp(raw, min, max)); C.live.on = false; }
  });
  input.addEventListener("change", commit);
  input.addEventListener("blur", commit);
  return el("label", { class: `num-field${suffix ? " has-suffix" : ""}${!icon && String(label).length > 2 ? " wide" : ""}` }, [
    icon ? el("span", { class: "num-icon", html: iconSvg(icon, { size: 12 }) }) : el("span", { class: "num-label", text: label }),
    input,
    suffix ? el("span", { class: "num-suffix", text: suffix }) : null,
  ]);
}

function selectField(label, value, options, onChange, cls = "") {
  const select = el("select", { class: "field-select", "aria-label": label, onchange: (e) => onChange(e.target.value) },
    options.map((o) => el("option", { value: o.value, selected: String(o.value) === String(value) }, o.label)));
  return el("label", { class: `field ${cls}` }, [label ? el("span", { class: "field-label", text: label }) : null, select]);
}

function textField(label, value, onChange, { placeholder = "", cls = "" } = {}) {
  const input = el("input", { class: "field-input", type: "text", value: value ?? "", placeholder, "aria-label": label,
    onchange: (e) => onChange(e.target.value) });
  return el("label", { class: `field ${cls}` }, [label ? el("span", { class: "field-label", text: label }) : null, input]);
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
function colorField(label, value, onChange, { withAlpha = true } = {}) {
  const safe = HEX.test(String(value || "").trim()) ? (String(value).length === 4
    ? `#${String(value).slice(1).split("").map((c) => c + c).join("")}` : String(value)) : "#000000";
  let cBefore = null;
  const picker = el("input", { class: "color-swatch", type: "color", value: safe, "aria-label": `${label} colour`,
    oninput: (e) => { if (!cBefore) cBefore = C.snapshot(); hex.value = e.target.value; C.live.on = true; onChange(e.target.value); C.live.on = false; },
    onchange: () => { if (cBefore) { C.record(cBefore, "colour"); cBefore = null; } } });
  const hex = el("input", { class: "field-input color-hex", type: "text", value: value ?? "", "aria-label": `${label} hex`,
    onchange: (e) => {
      const v = e.target.value.trim();
      if (!HEX.test(v)) { toast("Use a hex colour like #0d99ff", "error"); e.target.value = value; return; }
      picker.value = v.length === 4 ? `#${v.slice(1).split("").map((c) => c + c).join("")}` : v;
      onChange(v);
    } });
  return el("label", { class: "field color-field" }, [
    label ? el("span", { class: "field-label", text: label }) : null,
    el("span", { class: "color-control" }, [picker, hex]),
    withAlpha ? el("span", { class: "swatches" }, SWATCHES.slice(0, 6).map((c) => el("button", {
      class: "swatch", type: "button", style: { background: c }, "data-tip": c,
      onclick: (e) => { e.preventDefault(); hex.value = c; picker.value = c; onChange(c); },
    }))) : null,
  ]);
}

function toggleField(label, value, onChange, { icon = null } = {}) {
  const input = el("input", { type: "checkbox", checked: !!value, onchange: (e) => onChange(e.target.checked) });
  return el("label", { class: "toggle-field" }, [
    input, el("span", { class: "toggle-track" }),
    el("span", { class: "toggle-label" }, [icon ? el("span", { class: "toggle-icon", html: iconSvg(icon, { size: 12 }) }) : null, document.createTextNode(label)]),
  ]);
}

function iconButton(icon, tip, onClick, { active = false, danger = false } = {}) {
  return el("button", { class: `icon-btn${active ? " active" : ""}${danger ? " danger" : ""}`, type: "button", "data-tip": tip, "aria-label": tip,
    html: iconSvg(icon, { size: 14 }), onclick: onClick });
}

/* ------------------------------------------------------------------ design */

/** The rectangle alignment is measured against: the selection box when several
    layers are selected, otherwise the layer's own container (frame or page). */
function alignmentReference(list) {
  if (list.length > 1) return C.boundingBox(list.map((n) => n.id));
  const n = list[0];
  const parent = n.parentId ? C.node(n.parentId) : null;
  if (!parent) return { ...C.pageRect() };
  const outer = C.absoluteRect(parent);
  const inset = C.frameInset(parent);
  return { x: outer.x + inset, y: outer.y + inset, width: outer.width - inset * 2, height: outer.height - inset * 2 };
}

function alignSection(nodes) {
  const align = (axis, mode) => () => {
    const list = C.selected().filter((n) => !n.locked);
    if (!list.length) return;
    C.change(() => {
      const ref = alignmentReference(list);
      list.forEach((n) => {
        const r = C.absoluteRect(n);
        const p = C.propsOf(n);
        const patch = {};
        if (axis === "x") {
          const target = mode === "start" ? ref.x : mode === "center" ? ref.x + (ref.width - r.width) / 2 : ref.x + ref.width - r.width;
          patch.x = Math.round(C.num(p.x) + (target - r.x));
        } else {
          const target = mode === "start" ? ref.y : mode === "center" ? ref.y + (ref.height - r.height) / 2 : ref.y + ref.height - r.height;
          patch.y = Math.round(C.num(p.y) + (target - r.y));
        }
        C.setProps(n, patch);
      });
    }, "align");
  };
  const distribute = (axis) => () => {
    if (nodes.length < 3) { toast("Select three or more layers", "error"); return; }
    C.change(() => {
      const list = C.state.selection.map(C.node).filter(Boolean)
        .map((n) => ({ n, r: C.absoluteRect(n) }))
        .sort((a, b) => (axis === "x" ? a.r.x - b.r.x : a.r.y - b.r.y));
      const first = list[0].r, last = list[list.length - 1].r;
      const span = axis === "x" ? last.x + last.width - first.x : last.y + last.height - first.y;
      const used = list.reduce((s, { r }) => s + (axis === "x" ? r.width : r.height), 0);
      const gap = (span - used) / (list.length - 1);
      let cursor = axis === "x" ? first.x : first.y;
      list.forEach(({ n, r }) => {
        const size = axis === "x" ? r.width : r.height;
        const delta = cursor - (axis === "x" ? r.x : r.y);
        C.setProps(n, axis === "x" ? { x: Math.round(C.num(C.propsOf(n).x) + delta) } : { y: Math.round(C.num(C.propsOf(n).y) + delta) });
        cursor += size + gap;
      });
    }, "distribute");
  };

  return section("Align", [
    row([
      iconButton("align-left", "Align left", align("x", "start")),
      iconButton("align-horizontal", "Align horizontal centres", align("x", "center")),
      iconButton("align-right", "Align right", align("x", "end")),
      el("span", { class: "row-divider" }),
      iconButton("align-top", "Align top", align("y", "start")),
      iconButton("align-middle", "Align vertical centres", align("y", "center")),
      iconButton("align-bottom", "Align bottom", align("y", "end")),
    ]),
    row([
      iconButton("distribute-horizontal", "Distribute horizontal spacing", distribute("x"), { active: false }),
      iconButton("distribute-vertical", "Distribute vertical spacing", distribute("y")),
      el("span", { class: "row-hint", text: nodes.length < 3 ? "3+ layers" : `${nodes.length} selected` }),
    ]),
  ]);
}

function transformSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  const p = single ? C.propsOf(single) : null;
  const box = C.boundingBox();
  const set = (patch) => C.change(() => C.state.selection.forEach((id) => C.setProps(C.node(id), patch)), "transform");
  const lockRatio = single ? !!single.base.lockRatio : false;

  return section("Layout", [
    row([
      numField("X", single ? p.x : box?.x ?? 0, (v) => set({ x: v }), { min: -4000, max: 8000 }),
      numField("Y", single ? p.y : box?.y ?? 0, (v) => set({ y: v }), { min: -4000, max: 12000 }),
    ]),
    row([
      numField("W", single ? p.width : box?.width ?? 0, (v) => set({ width: Math.max(1, v) }), { min: 1, max: 8000 }),
      numField("H", single ? p.height : box?.height ?? 0, (v) => set({ height: Math.max(1, v) }), { min: 1, max: 12000 }),
      single ? el("button", { class: `icon-btn ratio${lockRatio ? " active" : ""}`, type: "button", "data-tip": "Lock aspect ratio", "aria-label": "Lock aspect ratio",
        html: iconSvg(lockRatio ? "lock" : "unlock", { size: 13 }),
        onclick: () => C.change(() => { single.base.lockRatio = !single.base.lockRatio; }, "lock ratio") }) : null,
    ]),
    row([
      numField("", single ? C.num(p.rotation) : C.rotationOf(), (v) => set({ rotation: ((v % 360) + 360) % 360 }), { min: -360, max: 360, suffix: "°", icon: "rotate" }),
      iconButton("rotate", "Rotate 90°", () => set({ rotation: (C.num(single ? p.rotation : C.rotationOf()) + 90) % 360 })),
      iconButton("flip-h", "Flip horizontal", () => C.change(() => C.state.selection.forEach((id) => { const n = C.node(id); C.setProps(n, { flipX: !C.propsOf(n).flipX }); }), "flip")),
      iconButton("flip-v", "Flip vertical", () => C.change(() => C.state.selection.forEach((id) => { const n = C.node(id); C.setProps(n, { flipY: !C.propsOf(n).flipY }); }), "flip")),
    ], "field-row compact"),
    single && single.type !== "frame" ? selectField("", single.base.responsiveBehavior || "scale", [
      { value: "scale", label: "Responsive: scale" }, { value: "left", label: "Responsive: pin left" },
      { value: "right", label: "Responsive: pin right" }, { value: "center", label: "Responsive: centre" },
      { value: "stretch", label: "Responsive: stretch" },
    ], (v) => C.change(() => C.setProps(single, { responsiveBehavior: v }), "responsive"), "field-full") : null,
  ]);
}

function radiusSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  if (!single || single.type === "ellipse") return null;
  const r = C.propsOf(single).radius || {};
  // "linked" is a real mode on the node, not something inferred from the values,
  // so four identical corners can still be edited independently.
  const linked = single.base.linkCorners !== false && [r.tl, r.tr, r.br, r.bl].every((v) => v === r.tl);
  const setAll = (v) => C.change(() => C.setProps(single, { radius: { tl: v, tr: v, br: v, bl: v } }), "radius");
  const setOne = (key) => (v) => C.change(() => {
    const next = { ...C.propsOf(single).radius };
    next[key] = v;
    C.setProps(single, { radius: next, linkCorners: false });
  }, "radius");
  const toggleLink = () => {
    if (linked) C.change(() => C.setProps(single, { linkCorners: false }), "unlink corners");
    else C.change(() => C.setProps(single, { radius: { tl: r.tl ?? 0, tr: r.tl ?? 0, br: r.tl ?? 0, bl: r.tl ?? 0 }, linkCorners: true }), "link corners");
  };
  return section("Corner radius", [
    row([
      numField("", r.tl ?? 0, linked ? setAll : setOne("tl"), { min: 0, max: 400 }),
      numField("", r.tr ?? 0, linked ? setAll : setOne("tr"), { min: 0, max: 400 }),
      numField("", r.br ?? 0, linked ? setAll : setOne("br"), { min: 0, max: 400 }),
      numField("", r.bl ?? 0, linked ? setAll : setOne("bl"), { min: 0, max: 400 }),
      iconButton(linked ? "link" : "unlink", linked ? "Corners linked — click to edit each corner" : "Corners independent — click to link them", toggleLink, { active: linked }),
    ]),
  ]);
}

/* ------------------------------------------------------------ fill/stroke */

function fillRow(fill, index, node) {
  const update = (patch) => C.change(() => {
    const fills = [...(C.propsOf(node).fills || [])];
    fills[index] = { ...fills[index], ...patch };
    C.setProps(node, { fills });
  }, "fill");
  const remove = () => C.change(() => {
    C.setProps(node, { fills: (C.propsOf(node).fills || []).filter((_, i) => i !== index) });
  }, "remove fill");

  const head = row([
    el("button", { class: "chip", type: "button", "data-tip": fill.type === "solid" ? "Solid" : fill.type === "linear" ? "Linear gradient" : "Radial gradient",
      html: iconSvg(fill.type === "solid" ? "droplet" : "palette", { size: 12 }) }),
    el("span", { class: "chip-preview", style: { background: fillCss([fill]) } }),
    el("input", { class: "field-input compact", type: "number", value: C.round(C.num(fill.opacity, 100)), min: 0, max: 100, "aria-label": "Fill opacity",
      oninput: (e) => update({ opacity: C.clamp(Number(e.target.value) || 0, 0, 100) }) }),
    el("span", { class: "num-suffix", text: "%" }),
    el("span", { class: "row-spacer" }),
    iconButton("trash", "Remove fill", remove, { danger: true }),
  ]);

  const body = fill.type === "solid"
    ? colorField(null, fill.color, (color) => update({ color }))
    : el("div", { class: "gradient-editor" }, [
        row([numField("Angle", C.num(fill.angle, 90), (angle) => update({ angle }), { min: 0, max: 360, suffix: "°" }),
             el("button", { class: "btn tiny", type: "button", text: "Swap", onclick: () => update({ stops: [...(fill.stops || [])].reverse().map((s, i, arr) => ({ ...s, at: arr[i].at })) }) })]),
        ...(fill.stops || []).map((stop, i) => row([
          colorField(null, stop.color, (color) => update({ stops: fill.stops.map((s, j) => (j === i ? { ...s, color } : s)) })),
          numField("", C.num(stop.at), (at) => update({ stops: fill.stops.map((s, j) => (j === i ? { ...s, at } : s)) }), { min: 0, max: 100, suffix: "%" }),
          iconButton("trash", "Remove stop", () => update({ stops: fill.stops.filter((_, j) => j !== i) }), { danger: true }),
        ])),
        el("button", { class: "btn tiny", type: "button", text: "+ Add stop", onclick: () => update({ stops: [...(fill.stops || []), { at: 100, color: "#ffffff" }] }) }),
      ]);

  return el("div", { class: "stack-row" }, [head, body]);
}

function fillsSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  if (!single || single.type === "icon") return null;
  const fills = C.propsOf(single).fills || [];
  return section("Fill", [
    ...fills.map((f, i) => fillRow(f, i, single)),
    row([
      el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { fills: [...fills, { type: "solid", color: "#0d99ff", opacity: 100 }] }), "add fill") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Solid" })].flat()),
      el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { fills: [...fills, { type: "linear", angle: 135, opacity: 100, stops: [{ at: 0, color: "#0d99ff" }, { at: 100, color: "#7c3aed" }] }] }), "add fill") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Gradient" })].flat()),
    ]),
  ]);
}

function strokesSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  if (!single || ["icon", "text"].includes(single.type)) return null;
  const strokes = C.propsOf(single).strokes || [];
  return section("Stroke", [
    ...strokes.map((s, i) => el("div", { class: "stack-row" }, [
      row([
        colorField(null, s.color, (color) => C.change(() => C.setProps(single, { strokes: strokes.map((x, j) => (j === i ? { ...x, color } : x)) }), "stroke")),
        numField("", C.num(s.width), (width) => C.change(() => C.setProps(single, { strokes: strokes.map((x, j) => (j === i ? { ...x, width } : x)) }), "stroke"), { min: 0, max: 40, suffix: "px" }),
        iconButton("trash", "Remove stroke", () => C.change(() => C.setProps(single, { strokes: strokes.filter((_, j) => j !== i) }), "stroke"), { danger: true }),
      ]),
      row([selectField("Align", s.align || "inside", [
        { value: "inside", label: "Inside" }, { value: "center", label: "Centre" }, { value: "outside", label: "Outside" },
      ], (align) => C.change(() => C.setProps(single, { strokes: strokes.map((x, j) => (j === i ? { ...x, align } : x)) }), "stroke"), "field-full")]),
    ])),
    el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { strokes: [...strokes, { color: "#0d99ff", width: 1, align: "inside" }] }), "add stroke") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Add stroke" })].flat()),
  ]);
}

function effectsSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  if (!single) return null;
  const effects = C.propsOf(single).effects || [];
  const patchAt = (i, patch) => C.change(() => C.setProps(single, { effects: effects.map((e, j) => (j === i ? { ...e, ...patch } : e)) }), "effect");
  return section("Effects", [
    ...effects.map((fx, i) => el("div", { class: "stack-row" }, [
      row([
        el("span", { class: "chip", html: iconSvg(fx.type === "shadow" ? "box" : fx.type === "inner" ? "minimize" : "droplet", { size: 12 }) }),
        el("span", { class: "chip-label", text: { shadow: "Drop shadow", inner: "Inner shadow", blur: "Layer blur", background: "Background blur" }[fx.type] || fx.type }),
        el("span", { class: "row-spacer" }),
        iconButton("trash", "Remove effect", () => C.change(() => C.setProps(single, { effects: effects.filter((_, j) => j !== i) }), "effect"), { danger: true }),
      ]),
      fx.type === "shadow" || fx.type === "inner" ? el("div", { class: "effect-grid" }, [
        colorField(null, fx.color, (color) => patchAt(i, { color })),
        numField("X", C.num(fx.x), (x) => patchAt(i, { x }), { min: -200, max: 200 }),
        numField("Y", C.num(fx.y), (y) => patchAt(i, { y }), { min: -200, max: 200 }),
        numField("Blur", C.num(fx.blur), (blur) => patchAt(i, { blur }), { min: 0, max: 200 }),
        numField("Spread", C.num(fx.spread), (spread) => patchAt(i, { spread }), { min: -100, max: 100 }),
        numField("Opacity", C.num(fx.opacity, 100), (opacity) => patchAt(i, { opacity }), { min: 0, max: 100, suffix: "%" }),
      ]) : row([numField("Radius", C.num(fx.radius, 8), (radius) => patchAt(i, { radius }), { min: 0, max: 100, suffix: "px" })]),
    ])),
    row([
      el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { effects: [...effects, { type: "shadow", color: "#000000", opacity: 35, x: 0, y: 12, blur: 32, spread: 0 }] }), "effect") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Shadow" })].flat()),
      el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { effects: [...effects, { type: "inner", color: "#000000", opacity: 40, x: 0, y: 2, blur: 8, spread: 0 }] }), "effect") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Inner" })].flat()),
      el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { effects: [...effects, { type: "blur", radius: 6 }] }), "effect") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Blur" })].flat()),
      el("button", { class: "btn tiny", type: "button", onclick: () => C.change(() => C.setProps(single, { effects: [...effects, { type: "background", radius: 12 }] }), "effect") }, [iconSvg("plus", { size: 12 }), el("span", { text: "Glass" })].flat()),
    ]),
  ]);
}

/* -------------------------------------------------------------------- text */

/* ------------------------------------------------------------ font picker */

let fontMenuEl = null;
const closeFontMenu = () => { fontMenuEl?.remove(); fontMenuEl = null; };

function openFontMenu(anchor, targets) {
  closeFontMenu();
  const box = el("div", { class: "font-menu", role: "menu" });
  const input = el("input", { class: "field-input", type: "search", placeholder: "Search or type any Google Font…", "aria-label": "Search fonts" });
  const list = el("div", { class: "font-list" });
  box.append(input, list);
  document.body.appendChild(box);
  const r = anchor.getBoundingClientRect();
  box.style.left = `${C.clamp(r.left, 8, window.innerWidth - 276)}px`;
  box.style.top = `${C.clamp(r.bottom + 4, 8, window.innerHeight - 330)}px`;

  const apply = (family) => {
    F.ensureFamily(family);
    C.change(() => targets.forEach((n) => C.setProps(n, { family: `${family}, sans-serif` })), "font");
    closeFontMenu();
  };
  const item = (family, custom = false) => el("button", {
    class: "font-item", type: "button", style: { fontFamily: `'${family}', sans-serif` },
    onclick: () => apply(family),
  }, [
    custom ? el("span", { class: "badge", text: "custom" }) : null,
    el("span", { text: family }),
  ].filter(Boolean));

  const render = () => {
    const t = input.value.trim().toLowerCase();
    list.innerHTML = "";
    list.appendChild(el("button", { class: "font-item font-item-action", type: "button", onclick: () => dom.fontFileInput?.click() }, [
      el("span", { class: "font-item-icon", html: iconSvg("upload", { size: 12 }) }),
      el("span", { text: "Add font file… (woff2 · ttf · otf)" }),
    ]));
    (C.project().fonts || []).map((f) => f.family)
      .filter((fam) => !t || fam.toLowerCase().includes(t))
      .forEach((fam) => list.appendChild(item(fam, true)));
    const exact = F.GOOGLE_FONTS.some((g) => g.toLowerCase() === t);
    if (t && !exact) {
      list.appendChild(el("button", { class: "font-item font-item-action", type: "button", onclick: () => apply(input.value.trim()) }, [
        el("span", { class: "font-item-icon", html: iconSvg("zap", { size: 12 }) }),
        el("span", { text: `Load “${input.value.trim()}” from Google Fonts` }),
      ]));
    }
    F.GOOGLE_FONTS.filter((g) => !t || g.toLowerCase().includes(t)).slice(0, 90)
      .forEach((g) => list.appendChild(item(g)));
  };
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && input.value.trim()) { e.preventDefault(); apply(input.value.trim()); }
    if (e.key === "Escape") closeFontMenu();
  });
  render();
  input.focus();
  setTimeout(() => document.addEventListener("pointerdown", function onDown(e) {
    if (!box.contains(e.target) && e.target !== anchor) { closeFontMenu(); document.removeEventListener("pointerdown", onDown); }
  }), 0);
}

function fontField(targets) {
  const current = C.propsOf(targets[0]).family || "Inter, sans-serif";
  const btn = el("button", { class: "field-input font-picker", type: "button", "aria-label": "Choose font" }, [
    el("span", { class: "font-picker-name", text: F.familyName(current) || "Font" }),
    el("span", { class: "row-spacer" }),
    el("span", { class: "font-picker-chev", html: iconSvg("chevron-down", { size: 12 }) }),
  ]);
  btn.addEventListener("click", () => openFontMenu(btn, targets));
  return el("label", { class: "field field-full" }, [el("span", { class: "field-label", text: "Font" }), btn]);
}

function textSection(nodes) {
  const targets = nodes.filter((n) => n.type === "text" || n.type === "button");
  if (!targets.length) return null;
  const first = targets[0];
  const p = C.propsOf(first);
  const set = (patch) => C.change(() => targets.forEach((n) => C.setProps(n, patch)), "text");
  const alignButtons = [
    ["left", "align-left", "Align left"], ["center", "align-center", "Align centre"], ["right", "align-right", "Align right"],
  ].map(([value, icon, tip]) => iconButton(icon, tip, () => set({ align: value }), { active: (p.align || "left") === value }));

  return section("Typography", [
    row([fontField(targets)]),
    row([
      numField("Size", C.num(p.size, 16), (size) => set({ size: Math.max(1, size) }), { min: 1, max: 400, suffix: "px" }),
      (() => {
        const weights = [
          ["100", "Thin"], ["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["800", "Extra bold"], ["900", "Black"],
        ].map(([value, label]) => ({ value, label }));
        const current = String(p.weight || 400);
        if (!weights.some((o) => o.value === current)) {
          weights.push({ value: current, label: `${current} · custom` });
          weights.sort((a, b) => Number(a.value) - Number(b.value));
        }
        return selectField("Weight", current, weights, (weight) => set({ weight: Number(weight) }));
      })(),
    ]),
    row([
      numField("Line", C.num(p.lineHeight, 1.5), (lineHeight) => set({ lineHeight }), { min: 0.5, max: 4, step: 0.05 }),
      numField("Track", C.num(p.letterSpacing), (letterSpacing) => set({ letterSpacing }), { min: -20, max: 60, step: 0.1 }),
    ]),
    row([...alignButtons,
      iconButton("type", "Uppercase", () => set({ transform: p.transform === "uppercase" ? "none" : "uppercase" }), { active: p.transform === "uppercase" }),
      iconButton("minus", "Underline", () => set({ decoration: p.decoration === "underline" ? "none" : "underline" }), { active: p.decoration === "underline" }),
    ]),
    row([selectField("Vertical", p.valign || "top", [
      { value: "top", label: "Top" }, { value: "center", label: "Middle" }, { value: "bottom", label: "Bottom" },
    ], (valign) => set({ valign }), "field-full")]),
    (() => {
      let before = null;
      const ta = el("textarea", { class: "field-input textarea", rows: "3", "aria-label": "Text content", textContent: first.content || "" });
      ta.addEventListener("focus", () => { before = C.snapshot(); });
      ta.addEventListener("input", () => { targets.forEach((n) => { n.content = ta.value; }); soft(); });
      ta.addEventListener("blur", () => { if (before !== null) { C.record(before, "edit text"); before = null; } });
      return ta;
    })(),
    first.type === "text" ? colorField("Colour", (p.fills || []).find((f) => f.type === "solid")?.color || "#f2f3f7",
      (color) => C.change(() => targets.forEach((n) => C.setProps(n, { fills: [{ type: "solid", color, opacity: 100 }] })), "text colour")) : null,
  ]);
}

function imageSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  if (!single || single.type !== "image") return null;
  const p = C.propsOf(single);
  const a = C.asset(single.assetId);
  return section("Image", [
    row([el("button", { class: "btn quiet full", type: "button", onclick: () => { dom.fileInput.dataset.replaceId = single.id; dom.fileInput.click(); } },
      [iconSvg("upload", { size: 13 }), el("span", { text: a ? "Replace image" : "Choose image" })].flat())]),
    a ? row([el("span", { class: "asset-name", text: a.name })]) : null,
    row([
      selectField("Fit", p.objectFit || "cover", [
        { value: "cover", label: "Cover" }, { value: "contain", label: "Contain" }, { value: "fill", label: "Fill" }, { value: "none", label: "Original" },
      ], (objectFit) => C.change(() => C.setProps(single, { objectFit }), "image")),
      selectField("Position", p.objectPosition || "center center", [
        { value: "center center", label: "Centre" }, { value: "top center", label: "Top" }, { value: "bottom center", label: "Bottom" },
        { value: "left center", label: "Left" }, { value: "right center", label: "Right" },
      ], (objectPosition) => C.change(() => C.setProps(single, { objectPosition }), "image")),
    ]),
    textField("Alt text", single.alt, (alt) => C.change(() => { single.alt = alt; }, "alt"), { placeholder: "For screen readers and SEO", cls: "field-full" }),
  ]);
}

function iconSection(nodes) {
  const single = nodes.length === 1 ? nodes[0] : null;
  if (!single || single.type !== "icon") return null;
  const p = C.propsOf(single);
  return section("Icon", [
    row([
      el("button", { class: "btn quiet", type: "button", text: "Change icon", onclick: () => { C.state.leftPanel = "elements"; import("./panels.js").then((m) => m.renderLeftPanel()); } }),
      numField("Stroke", C.num(p.strokeWidth, 2), (strokeWidth) => C.change(() => C.setProps(single, { strokeWidth }), "icon"), { min: 0.5, max: 6, step: 0.5 }),
    ]),
    colorField("Colour", (p.fills || []).find((f) => f.type === "solid")?.color || "#e8eaef",
      (color) => C.change(() => C.setProps(single, { fills: [{ type: "solid", color, opacity: 100 }] }), "icon colour")),
  ]);
}

/* ------------------------------------------------------------- auto layout */

function layoutSection(nodes) {
  const frames = nodes.filter((n) => n.type === "frame" || n.type === "button");
  if (frames.length !== 1) return null;
  const frame = frames[0];
  const L = frame.base.layout;
  const toggle = () => C.change(() => {
    frame.base.layout = L ? null : { mode: "column", gap: 12, pad: { t: 24, r: 24, b: 24, l: 24 }, align: "start", justify: "start" };
  }, "auto layout");

  const head = row([
    el("button", { class: `btn tiny${L ? " active" : ""}`, type: "button", text: L ? "Auto layout on" : "Add auto layout", onclick: toggle }),
    L ? el("span", { class: "row-hint", text: `${C.childrenOf(frame.id).length} children` }) : null,
  ]);
  if (!L) return section("Auto layout", [head]);

  const set = (patch) => C.change(() => { frame.base.layout = { ...frame.base.layout, ...patch }; }, "auto layout");
  return section("Auto layout", [
    head,
    row([
      iconButton("align-horizontal", "Stack horizontally", () => set({ mode: "row" }), { active: L.mode === "row" }),
      iconButton("align-vertical", "Stack vertically", () => set({ mode: "column" }), { active: L.mode === "column" }),
      numField("Gap", C.num(L.gap), (gap) => set({ gap: Math.max(0, gap) }), { min: 0, max: 200 }),
    ]),
    row([
      numField("T", C.num(L.pad?.t), (v) => set({ pad: { ...L.pad, t: v } }), { min: 0, max: 400 }),
      numField("R", C.num(L.pad?.r), (v) => set({ pad: { ...L.pad, r: v } }), { min: 0, max: 400 }),
      numField("B", C.num(L.pad?.b), (v) => set({ pad: { ...L.pad, b: v } }), { min: 0, max: 400 }),
      numField("L", C.num(L.pad?.l), (v) => set({ pad: { ...L.pad, l: v } }), { min: 0, max: 400 }),
    ]),
    row([
      selectField("Align", L.align || "start", [
        { value: "start", label: "Start" }, { value: "center", label: "Centre" }, { value: "end", label: "End" }, { value: "stretch", label: "Stretch" },
      ], (align) => set({ align })),
      selectField("Pack", L.justify || "start", [
        { value: "start", label: "Start" }, { value: "center", label: "Centre" }, { value: "end", label: "End" }, { value: "between", label: "Space between" },
      ], (justify) => set({ justify })),
    ]),
    el("p", { class: "hint", text: "Children are positioned by the layout. Switch a child to “Fill” to make it grow." }),
    ...C.childrenOf(frame.id).slice(0, 12).map((child) => row([
      el("span", { class: "child-name", text: child.name }),
      selectField("", child.base.sizing?.w || "fixed", [
        { value: "fixed", label: "W fixed" }, { value: "fill", label: "W fill" },
      ], (v) => C.change(() => { child.base.sizing = { ...child.base.sizing, w: v }; }, "sizing")),
      selectField("", child.base.sizing?.h || "fixed", [
        { value: "fixed", label: "H fixed" }, { value: "fill", label: "H fill" },
      ], (v) => C.change(() => { child.base.sizing = { ...child.base.sizing, h: v }; }, "sizing")),
    ], "field-row compact")),
  ]);
}

/* ------------------------------------------------------------------ layer */

function layerSection(nodes) {
  const first = nodes[0];
  const zBtn = (icon, tip, mode) => iconButton(icon, tip, () => { C.change(() => C.zMove(C.state.selection, mode), "z-order"); soft(); });
  return section("Layer", [
    row([
      toggleField("Visible", first.visible, (v) => C.change(() => C.state.selection.forEach((id) => { C.node(id).visible = v; }), "visibility"), { icon: "eye" }),
      toggleField("Locked", first.locked, (v) => C.change(() => C.state.selection.forEach((id) => { C.node(id).locked = v; }), "lock"), { icon: "lock" }),
    ], "toggle-row"),
    row([
      zBtn("bring-front", "Bring to front", "front"),
      iconButton("send-back", "Send to back", () => { C.change(() => C.zMove(C.state.selection, "back"), "z-order"); soft(); }),
      iconButton("arrow-up", "Bring forward", () => { C.change(() => C.zMove(C.state.selection, "forward"), "z-order"); soft(); }),
      iconButton("arrow-down", "Send backward", () => { C.change(() => C.zMove(C.state.selection, "backward"), "z-order"); soft(); }),
      el("span", { class: "row-spacer" }),
      iconButton("copy", "Duplicate", () => import("./main.js").then((m) => m.duplicateSelected()), { }),
      iconButton("trash", "Delete", () => import("./main.js").then((m) => m.deleteSelected()), { danger: true }),
    ]),
    first.parentId ? row([el("span", { class: "row-hint", text: `Inside ${C.node(first.parentId)?.name || "a frame"}` }),
      el("button", { class: "btn tiny", type: "button", text: "Move to page", onclick: () => C.change(() => C.reparent(first.id, null), "reparent") })]) : null,
  ]);
}

/* --------------------------------------------------------------- prototype */

function prototypeTab(nodes) {
  const out = [];
  const first = nodes[0];
  if (!first) return out;
  const p = C.propsOf(first);
  const action = p.action || { type: "none" };
  const setAction = (patch) => C.change(() => C.state.selection.forEach((id) => C.setProps(C.node(id), { action: { ...C.propsOf(C.node(id)).action, ...patch } })), "action");
  const pageNodes = C.page().nodes.filter((n) => n.id !== first.id);

  out.push(section("Interaction", [
    row([selectField("On click", action.type || "none", Object.entries(C.ACTION_TYPES).map(([value, label]) => ({ value, label })), (type) => setAction({ type }))]),
    action.type === "link" ? el("div", { class: "stack" }, [
      textField("URL", action.url || "", (url) => setAction({ url }), { placeholder: "https://…", cls: "field-full" }),
      row([selectField("Open in", action.target || "_self", [
        { value: "_self", label: "Same tab" }, { value: "_blank", label: "New tab" },
      ], (target) => setAction({ target }))]),
    ]) : null,
    action.type === "scroll" ? selectField("Scroll to", action.targetId || "", [
      { value: "", label: "Top of page" }, ...pageNodes.map((n) => ({ value: n.id, label: n.name })),
    ], (targetId) => setAction({ targetId })) : null,
    action.type === "toggle" ? selectField("Toggle layer", action.targetId || "", pageNodes.map((n) => ({ value: n.id, label: n.name })), (targetId) => setAction({ targetId })) : null,
    action.type === "navigate" ? selectField("Go to page", action.pageId || "", C.project().pages.map((pg) => ({ value: pg.id, label: pg.name })), (pageId) => setAction({ pageId })) : null,
    action.type !== "none" ? el("p", { class: "hint", text: "Interactive layers get a dashed outline on the canvas and are exported as real links or handlers." }) : null,
  ]));

  const anim = p.animation || { type: "none" };
  const setAnim = (patch) => C.change(() => C.state.selection.forEach((id) => C.setProps(C.node(id), { animation: { ...C.propsOf(C.node(id)).animation, ...patch } })), "animation");
  out.push(section("Animation", [
    row([selectField("Effect", anim.type || "none", Object.entries(C.ANIMATION_TYPES).map(([value, label]) => ({ value, label })), (type) => setAnim({ type }))]),
    anim.type !== "none" ? el("div", { class: "stack" }, [
      row([selectField("Trigger", anim.trigger || "load", [
        { value: "load", label: "On page load" }, { value: "scroll", label: "On scroll into view" },
        { value: "hover", label: "On hover" }, { value: "click", label: "On click" },
      ], (trigger) => setAnim({ trigger }))]),
      row([
        numField("Duration", C.num(anim.duration, 600), (duration) => setAnim({ duration: Math.max(0, duration) }), { min: 0, max: 10000, step: 50, suffix: "ms" }),
        numField("Delay", C.num(anim.delay), (delay) => setAnim({ delay: Math.max(0, delay) }), { min: 0, max: 10000, step: 50, suffix: "ms" }),
      ]),
      row([
        selectField("Easing", anim.easing || "smooth", Object.entries(C.EASINGS).map(([value]) => ({ value, label: value })), (easing) => setAnim({ easing })),
        anim.repeat === 0 ? null : numField("Repeat", C.num(anim.repeat, 1), (repeat) => setAnim({ repeat: Math.max(1, repeat) }), { min: 1, max: 20 }),
      ]),
      row([toggleField("Loop forever", anim.repeat === 0, (v) => setAnim({ repeat: v ? 0 : 1 }), { icon: "refresh" })]),
      row([
        el("button", { class: "btn tiny", type: "button", onclick: () => import("./main.js").then((m) => m.previewAnimation(C.state.selection)) }, [iconSvg("play", { size: 12 }), el("span", { text: "Preview" })].flat()),
        el("button", { class: "btn tiny", type: "button", text: "Apply to all selected", onclick: () => C.change(() => C.state.selection.forEach((id) => C.setProps(C.node(id), { animation: { ...anim } })), "animation") }),
      ]),
      el("p", { class: "hint", text: "Exported as CSS keyframes. “On scroll” uses IntersectionObserver; hover and click use CSS/JS triggers." }),
    ]) : null,
  ]));

  return out;
}

/* ----------------------------------------------------------------- inspect */

function inspectTab(nodes) {
  const first = nodes[0];
  const out = [];
  if (!first) return out;
  const css = import("./export.js");
  const block = el("pre", { class: "code-block" });
  css.then((m) => { block.textContent = m.nodeCss(first, C.state.device); });
  const p = C.propsOf(first);
  const r = C.absoluteRect(first);

  out.push(section("Element", [
    row([el("span", { class: "kv", html: `<b>Type</b><span>${C.NODE_TYPES[first.type].label}</span>` }),
         el("span", { class: "kv", html: `<b>ID</b><span>${C.escapeHtml(first.id)}</span>` })]),
    row([el("span", { class: "kv", html: `<b>Position</b><span>${Math.round(r.x)}, ${Math.round(r.y)}</span>` }),
         el("span", { class: "kv", html: `<b>Size</b><span>${Math.round(r.width)} × ${Math.round(r.height)}</span>` })]),
    row([el("span", { class: "kv", html: `<b>Parent</b><span>${first.parentId ? C.escapeHtml(C.node(first.parentId)?.name || "—") : "Page"}</span>` }),
         el("span", { class: "kv", html: `<b>Opacity</b><span>${C.round(C.num(p.opacity, 100))}%</span>` })]),
  ]));

  out.push(section("CSS", [
    row([el("button", { class: "btn tiny", type: "button", onclick: () => { navigator.clipboard?.writeText(block.textContent); toast("CSS copied", "success"); } }, [iconSvg("copy", { size: 12 }), el("span", { text: "Copy CSS" })].flat())]),
    block,
  ]));

  out.push(section("Export", [
    row([selectField("Format", "html", [
      { value: "html", label: "HTML + CSS + JS" }, { value: "react", label: "React (JSX)" }, { value: "tailwind", label: "Tailwind HTML" }, { value: "node", label: "Node.js (Express)" },
    ], (v) => import("./main.js").then((m) => m.setExportFormat(v)), "field-full")]),
    row([el("button", { class: "btn primary full", type: "button", onclick: () => import("./main.js").then((m) => m.openExport()) }, [iconSvg("download", { size: 13 }), el("span", { text: "Export project" })].flat())]),
  ]));

  return out;
}

/* -------------------------------------------------------------------- page */

function pageInspector() {
  const page = C.page();
  const size = C.pageRect();
  const preset = C.DEVICES[C.state.device];
  const setSize = (key, value) => C.change(() => {
    const v = Math.max(key === "width" ? 240 : 200, Math.round(C.num(value)));
    if (C.state.device === "desktop") page[key] = v;
    else page.responsive[C.state.device] = { ...(page.responsive[C.state.device] || {}), [key]: v };
  }, "page size");

  return el("div", { class: "inspector-inner" }, [
    el("div", { class: "insp-hero" }, [
      el("span", { class: "hero-icon", html: iconSvg("frame", { size: 22 }) }),
      el("div", { class: "hero-copy" }, [el("strong", { text: page.name }), el("span", { text: "Root frame — nothing is selected" })]),
    ]),
    section("Frame", [
      row([
        numField("W", size.width, (v) => setSize("width", v), { min: 240, max: 4000 }),
        numField("H", size.height, (v) => setSize("height", v), { min: 200, max: 12000 }),
      ]),
      colorField("Background", page.background, (background) => C.change(() => { page.background = background; }, "page background")),
      row([el("span", { class: "kv", html: `<b>Viewport</b><span>${preset.label}${preset.fluid ? " · fluid" : ""}</span>` })]),
      row([
        el("button", { class: "btn tiny", type: "button", text: "Fit height to content", onclick: () => import("./main.js").then((m) => m.fitPageHeight()) }),
        el("button", { class: "btn tiny", type: "button", text: "Copy frame size", onclick: () => { navigator.clipboard?.writeText(`${size.width} × ${size.height}`); toast("Copied", "success"); } }),
      ]),
    ]),
    section("Breakpoints", DEVICE_ROWS()),
    section("Canvas", [
      toggleField("Snap to objects", C.state.prefs.snap, (v) => { C.state.prefs.snap = v; import("./main.js").then((m) => m.savePrefs()); }, { icon: "magnet" }),
      toggleField("Show grid", C.state.prefs.showGrid, (v) => { C.state.prefs.showGrid = v; import("./main.js").then((m) => m.savePrefs()); }, { icon: "grid" }),
      toggleField("Rulers", C.state.prefs.showRulers, (v) => { C.state.prefs.showRulers = v; import("./main.js").then((m) => m.savePrefs()); }, { icon: "ruler" }),
      toggleField("Smart guides", C.state.prefs.showGuides, (v) => { C.state.prefs.showGuides = v; import("./main.js").then((m) => m.savePrefs()); }, { icon: "align-center" }),
      row([numField("Grid size", C.state.prefs.gridSize, (v) => { C.state.prefs.gridSize = Math.max(1, v); import("./main.js").then((m) => m.savePrefs()); }, { min: 1, max: 100, suffix: "px" })]),
    ]),
  ]);
}

function DEVICE_ROWS() {
  return C.DEVICE_ORDER.map((key) => {
    const preset = C.DEVICES[key];
    const size = C.pageRect(key);
    return row([
      el("span", { class: "kv", html: `<b>${preset.label}</b><span>${size.width} × ${size.height}</span>` }),
      key === C.state.device ? el("span", { class: "badge", text: "editing" }) : el("button", { class: "btn tiny", type: "button", text: "Edit",
        onclick: () => import("./main.js").then((m) => m.setDevice(key)) }),
    ]);
  });
}

/* -------------------------------------------------------------------- root */

export function render() {
  const host = dom.inspectorBody;
  if (!host) return;
  const nodes = C.selected();
  $$("#inspectorTabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === C.state.inspectorTab));

  host.innerHTML = "";
  if (!nodes.length) { host.appendChild(pageInspector()); return; }

  const header = el("div", { class: "insp-header" }, [
    el("span", { class: "header-icon", html: iconSvg(C.NODE_TYPES[nodes[0].type].icon, { size: 15 }) }),
    nodes.length === 1
      ? el("input", { class: "header-name", type: "text", value: nodes[0].name, maxlength: "48", "aria-label": "Layer name",
          onchange: (e) => C.change(() => { nodes[0].name = e.target.value.trim() || nodes[0].name; }, "rename"),
          onkeydown: (e) => e.stopPropagation() })
      : el("span", { class: "header-name static", text: `${nodes.length} layers selected` }),
    el("span", { class: "header-type", text: nodes.length === 1 ? C.NODE_TYPES[nodes[0].type].label : "Mixed" }),
  ]);
  host.appendChild(header);

  if (C.state.device !== "desktop") {
    const overriding = nodes.filter((n) => C.hasOverride(n));
    host.appendChild(el("div", { class: "breakpoint-banner" }, [
      el("span", { class: "bp-icon", html: iconSvg(C.DEVICES[C.state.device].label.toLowerCase() === "mobile" ? "smartphone" : "tablet", { size: 14 }) }),
      el("div", { class: "bp-copy" }, [
        el("strong", { text: `${C.DEVICES[C.state.device].label} override` }),
        el("span", { text: overriding.length ? `${overriding.length} layer(s) have custom values` : "Adapted from desktop automatically" }),
      ]),
      overriding.length ? el("button", { class: "btn tiny", type: "button", text: "Reset",
        onclick: () => C.change(() => overriding.forEach((n) => C.clearOverride(n)), "reset override") }) : null,
    ]));
  }

  const design = [
    alignSection(nodes),
    transformSection(nodes),
    radiusSection(nodes),
    section("Appearance", [
      row([numField("Opacity", C.num(C.propsOf(nodes[0]).opacity, 100), (opacity) => C.change(() => C.state.selection.forEach((id) => C.setProps(C.node(id), { opacity: C.clamp(opacity, 0, 100) })), "opacity"), { min: 0, max: 100, suffix: "%" }),
           selectField("Blend", C.propsOf(nodes[0]).blend || "normal", ["normal", "multiply", "screen", "overlay", "darken", "lighten", "difference"].map((v) => ({ value: v, label: v })), (blend) => C.change(() => C.state.selection.forEach((id) => C.setProps(C.node(id), { blend })), "blend"))]),
    ]),
    layoutSection(nodes),
    fillsSection(nodes),
    strokesSection(nodes),
    effectsSection(nodes),
    textSection(nodes),
    imageSection(nodes),
    iconSection(nodes),
    layerSection(nodes),
  ];

  const body = C.state.inspectorTab === "design" ? design
    : C.state.inspectorTab === "prototype" ? prototypeTab(nodes)
    : inspectTab(nodes);

  host.appendChild(el("div", { class: "inspector-inner" }, body.filter(Boolean)));
}

export function init() {
  $$("#inspectorTabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => { C.state.inspectorTab = tab.dataset.tab; render(); });
    tab.addEventListener("contextmenu", (event) => showMenu(event, [
      { label: "Design", icon: "sliders", checked: C.state.inspectorTab === "design", run: () => { C.state.inspectorTab = "design"; render(); } },
      { label: "Prototype", icon: "play", checked: C.state.inspectorTab === "prototype", run: () => { C.state.inspectorTab = "prototype"; render(); } },
      { label: "Inspect", icon: "code", checked: C.state.inspectorTab === "inspect", run: () => { C.state.inspectorTab = "inspect"; render(); } },
    ]));
  });
}
