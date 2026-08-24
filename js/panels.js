/* VBuilder 2 — left panels, context menus, toasts, tooltips, modals */

import { dom, $, $$, el } from "./dom.js";
import { iconSvg, ICONS, ICON_LIBRARY, ICON_NAMES, TEXT_PRESETS, GRADIENTS, SWATCHES, BLOCKS } from "./icons.js";
import * as C from "./core.js";
import { emit } from "./core.js";

/* ------------------------------------------------------------------ toasts */

export function toast(message, type = "info", action = null) {
  if (!dom.toastRegion) return console.log(`[${type}] ${message}`);
  const node = el("div", { class: `toast ${type}` }, [el("span", { class: "toast-icon", html: iconSvg(type === "error" ? "warning" : type === "success" ? "check" : "info", { size: 14 }) })]);
  node.appendChild(el("span", { class: "toast-text", text: message }));
  if (action) node.appendChild(el("button", { class: "toast-action", text: action.label, onclick: () => { action.run(); node.remove(); } }));
  dom.toastRegion.appendChild(node);
  setTimeout(() => { node.classList.add("out"); setTimeout(() => node.remove(), 200); }, action ? 6000 : 2600);
}

/* ----------------------------------------------------------------- tooltip */

let tipEl = null, tipTimer = null, tipTarget = null;

export function initTooltips() {
  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target || target === tipTarget) return;
    tipTarget = target;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(target), 450);
  });
  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (target && !target.contains(event.relatedTarget)) hideTip();
  });
  document.addEventListener("focusin", (event) => { const t = event.target.closest?.("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, true);
}

function showTip(target) {
  const text = target.dataset.tip;
  if (!text) return;
  tipEl ||= el("div", { class: "tooltip" });
  if (!tipEl.isConnected) document.body.appendChild(tipEl);
  tipEl.textContent = text;
  tipEl.classList.add("visible");
  const r = target.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  tipEl.style.left = `${C.clamp(r.left + r.width / 2 - t.width / 2, 8, window.innerWidth - t.width - 8)}px`;
  tipEl.style.top = r.top >= t.height + 10 ? `${r.top - t.height - 8}px` : `${r.bottom + 8}px`;
}
function hideTip() { clearTimeout(tipTimer); tipTarget = null; tipEl?.classList.remove("visible"); }

/* ------------------------------------------------------------------ modals */

export function openModal(name) {
  const modal = dom[`${name}Modal`];
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  emit("modal", name);
}
export function closeModal(name) {
  const modal = name ? dom[`${name}Modal`] : $(".modal-backdrop:not(.hidden)");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  if (modal === dom.previewModal && dom.previewFrame) dom.previewFrame.srcdoc = "";
}
export const isModalOpen = () => !!$(".modal-backdrop:not(.hidden)");

export function confirmDialog(title, message, { confirmLabel = "Confirm", danger = false } = {}) {
  return new Promise((resolve) => {
    const backdrop = el("div", { class: "modal-backdrop dialog-backdrop" });
    const dialog = el("section", { class: "modal dialog", role: "dialog", "aria-modal": "true" });
    dialog.append(
      el("h3", { text: title }),
      el("p", { class: "dialog-message", text: message }),
      el("div", { class: "dialog-actions" }, [
        el("button", { class: "btn quiet", text: "Cancel", onclick: () => finish(false) }),
        el("button", { class: `btn ${danger ? "danger" : "primary"}`, text: confirmLabel, onclick: () => finish(true) }),
      ]),
    );
    backdrop.append(dialog);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) finish(false); });
    document.body.appendChild(backdrop);
    const finish = (value) => { backdrop.remove(); document.removeEventListener("keydown", onKey); resolve(value); };
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
      if (e.key === "Enter") finish(true);
    };
    document.addEventListener("keydown", onKey);
    dialog.querySelector(".btn.primary, .btn.danger")?.focus();
  });
}

export function promptDialog(title, value = "", { label = "Name" } = {}) {
  return new Promise((resolve) => {
    const backdrop = el("div", { class: "modal-backdrop dialog-backdrop" });
    const input = el("input", { class: "field-input", type: "text", value, maxlength: "64" });
    const dialog = el("section", { class: "modal dialog", role: "dialog", "aria-modal": "true" }, [
      el("h3", { text: title }),
      el("label", { class: "field" }, [el("span", { class: "field-label", text: label }), input]),
      el("div", { class: "dialog-actions" }, [
        el("button", { class: "btn quiet", text: "Cancel", onclick: () => finish(null) }),
        el("button", { class: "btn primary", text: "Save", onclick: () => finish(input.value) }),
      ]),
    ]);
    backdrop.append(dialog);
    document.body.appendChild(backdrop);
    input.focus(); input.select();
    const finish = (v) => { backdrop.remove(); document.removeEventListener("keydown", onKey); resolve(v); };
    const onKey = (e) => {
      if (e.key === "Escape") finish(null);
      if (e.key === "Enter") finish(input.value);
    };
    document.addEventListener("keydown", onKey);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) finish(null); });
  });
}

/* ------------------------------------------------------------- context menu */

let menuEl = null;

export function showMenu(event, items) {
  closeMenu();
  event.preventDefault();
  event.stopPropagation();
  menuEl = el("div", { class: "context-menu", role: "menu" });
  items.forEach((item) => {
    if (!item) return;
    if (item.separator) { menuEl.appendChild(el("div", { class: "menu-separator" })); return; }
    if (item.label && !item.run) { menuEl.appendChild(el("div", { class: "menu-heading", text: item.label })); return; }
    const row = el("button", {
      class: `menu-item${item.danger ? " danger" : ""}${item.checked ? " checked" : ""}`,
      type: "button", role: "menuitem", disabled: item.disabled || false,
      onclick: () => { closeMenu(); if (!item.disabled) item.run(); },
    }, [
      el("span", { class: "menu-icon", html: item.icon ? iconSvg(item.icon, { size: 14 }) : (item.checked ? iconSvg("check", { size: 14 }) : "") }),
      el("span", { class: "menu-label", text: item.label }),
      item.shortcut ? el("span", { class: "menu-shortcut", text: item.shortcut }) : null,
    ]);
    menuEl.appendChild(row);
  });
  document.body.appendChild(menuEl);
  const r = menuEl.getBoundingClientRect();
  const x = event.clientX ?? event.detail?.x ?? 0;
  const y = event.clientY ?? event.detail?.y ?? 0;
  menuEl.style.left = `${C.clamp(x, 8, Math.max(8, window.innerWidth - r.width - 8))}px`;
  menuEl.style.top = `${C.clamp(y, 8, Math.max(8, window.innerHeight - r.height - 8))}px`;

  // Keyboard-friendly: arrows walk the items, Escape closes.
  const rows = [...menuEl.querySelectorAll(".menu-item:not(:disabled)")];
  if (rows.length) rows[0].focus({ preventScroll: true });
  menuEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    const i = rows.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); rows[Math.min(rows.length - 1, i + 1)]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); rows[Math.max(0, i - 1)]?.focus(); }
  });

  setTimeout(() => document.addEventListener("pointerdown", onOutside, { once: true }), 0);
}

export const isMenuOpen = () => !!menuEl;

const onOutside = (event) => { if (!menuEl?.contains(event.target)) closeMenu(); };
export function closeMenu() {
  menuEl?.remove();
  menuEl = null;
}

/* ------------------------------------------------------------------ layers */

let dragLayerId = null;

/** The layers list renders the nodes array reversed (end of array = top of the
    list), so "above" in the list = after the anchor in the array. */
function dropLayer(id, anchor, pos) {
  const target = C.node(id);
  if (!target || !anchor || C.isDescendant(anchor.id, id)) return;
  C.change(() => {
    if (pos === "inside") { C.reparent(id, anchor.id); return; }
    const newParent = anchor.parentId || null;
    if ((target.parentId || null) !== newParent) C.reparent(id, newParent);
    const nodes = C.page().nodes;
    nodes.splice(nodes.indexOf(target), 1);
    const ai = nodes.indexOf(anchor);
    nodes.splice(pos === "above" ? ai + 1 : ai, 0, target);
  }, "reorder layer");
}

function startInlineRename(row, n) {
  const nameEl = row.querySelector(".layer-name");
  if (!nameEl || row.querySelector(".rename-input")) return;
  const input = el("input", { class: "rename-input", type: "text", value: n.name, maxlength: "48" });
  nameEl.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (save && v && v !== n.name) C.change(() => { n.name = v; }, "rename");
    renderLayers();
  };
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("click", (e) => e.stopPropagation());
}

export function renderLayers() {
  const host = dom.layersList;
  if (!host) return;
  const term = (dom.leftPanelSearch?.value || "").trim().toLowerCase();
  host.innerHTML = "";

  const pageRow = el("button", {
    class: `layer-row page-row${C.state.selection.length ? "" : " selected"}`, type: "button",
    title: "Select the page frame",
    onclick: () => { C.setSelection([]); emit("selection"); },
  }, [
    el("span", { class: "layer-icon", html: iconSvg("frame", { size: 13 }) }),
    el("span", { class: "layer-name", text: C.page().name }),
    el("span", { class: "layer-kind", text: "Page" }),
  ]);
  host.appendChild(pageRow);

  const matches = (n) => !term || n.name.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term);

  const walk = (parentId, depth) => {
    C.childrenOf(parentId).slice().reverse().forEach((n) => {
      if (term && !matches(n) && !C.descendantsOf(n.id).some(matches)) return;
      const hasKids = C.childrenOf(n.id).length > 0;
      const row = el("div", {
        class: `layer-row${C.state.selection.includes(n.id) ? " selected" : ""}${n.visible ? "" : " muted"}${dragLayerId === n.id ? " dragging" : ""}`,
        draggable: "true", "data-layer": n.id, style: { paddingLeft: `${6 + depth * 14}px` },
      });
      row.append(...[
        el("button", {
          class: "layer-disclose", type: "button", "aria-label": hasKids ? "Toggle children" : "",
          html: hasKids ? iconSvg("chevron-right", { size: 12 }) : "",
          style: hasKids ? { transform: n.collapsed ? "none" : "rotate(90deg)" } : { opacity: "0" },
          onclick: (e) => { e.stopPropagation(); C.change(() => { n.collapsed = !n.collapsed; }, "collapse"); renderLayers(); },
        }),
        el("span", { class: "layer-icon", html: iconSvg(C.NODE_TYPES[n.type].icon, { size: 13 }) }),
        el("span", { class: "layer-name", text: n.name }),
        n.base.action?.type && n.base.action.type !== "none" ? el("span", { class: "layer-flag", html: iconSvg("link", { size: 11 }) }) : null,
        n.base.animation?.type && n.base.animation.type !== "none" ? el("span", { class: "layer-flag", html: iconSvg("zap", { size: 11 }) }) : null,
        el("span", { class: "layer-actions" }, [
          el("button", { class: "layer-action", type: "button", "data-tip": n.visible ? "Hide" : "Show", html: iconSvg(n.visible ? "eye" : "eye-off", { size: 13 }),
            onclick: (e) => { e.stopPropagation(); C.change(() => { n.visible = !n.visible; }, "toggle visibility"); } }),
          el("button", { class: "layer-action", type: "button", "data-tip": n.locked ? "Unlock" : "Lock", html: iconSvg(n.locked ? "lock" : "unlock", { size: 13 }),
            onclick: (e) => { e.stopPropagation(); C.change(() => { n.locked = !n.locked; }, "toggle lock"); } }),
        ]),
      ].filter(Boolean));

      row.addEventListener("click", (e) => {
        if (e.target.closest(".layer-action") || e.target.closest(".layer-disclose")) return;
        C.setSelection([n.id], { additive: e.shiftKey || e.metaKey || e.ctrlKey });
      });
      row.addEventListener("dblclick", (e) => {
        if (e.target.closest(".layer-name")) { startInlineRename(row, n); return; }
        import("./canvas.js").then((m) => m.beginTextEdit(n.id));
      });
      row.addEventListener("contextmenu", (event) => {
        event.preventDefault(); // stop the native browser menu, always
        if (!C.state.selection.includes(n.id)) C.setSelection([n.id]);
        import("./main.js").then((m) => m.showLayerMenu(event, n));
      });
      row.addEventListener("dragstart", (e) => {
        dragLayerId = n.id;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", n.id);
      });
      row.addEventListener("dragend", () => { dragLayerId = null; renderLayers(); });
      row.addEventListener("dragover", (e) => {
        if (!dragLayerId || dragLayerId === n.id) return;
        e.preventDefault();
        const r = row.getBoundingClientRect();
        const t = (e.clientY - r.top) / r.height;
        row.classList.toggle("drop-inside", n.type === "frame" && t > 0.3 && t < 0.7);
        row.classList.toggle("drop-above", !(n.type === "frame" && t > 0.3 && t < 0.7) && t <= 0.5);
        row.classList.toggle("drop-below", !(n.type === "frame" && t > 0.3 && t < 0.7) && t > 0.5);
      });
      row.addEventListener("dragleave", () => row.classList.remove("drop-target", "drop-above", "drop-below", "drop-inside"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const inside = row.classList.contains("drop-inside");
        const above = row.classList.contains("drop-above");
        row.classList.remove("drop-target", "drop-above", "drop-below", "drop-inside");
        const id = e.dataTransfer.getData("text/plain");
        if (!id || id === n.id) return;
        dropLayer(id, n, inside ? "inside" : above ? "above" : "below");
      });

      host.appendChild(row);
      if (hasKids && !n.collapsed && n.type === "frame") walk(n.id, depth + 1);
    });
  };
  walk(null, 0);

  if (!C.page().nodes.length) {
    host.appendChild(el("div", { class: "panel-empty", html: `<strong>Nothing here yet</strong><span>Use the dock below the canvas, or drag an image onto it.</span>` }));
  }
}

/* ------------------------------------------------------------------ assets */

export function renderAssets() {
  const host = dom.assetsList;
  if (!host) return;
  host.innerHTML = "";
  const list = C.project().assets;
  if (!list.length) {
    host.appendChild(el("div", { class: "panel-empty", html: `<strong>No images yet</strong><span>Upload one, or drop a file anywhere on the canvas.</span>` }));
  }
  host.appendChild(el("button", { class: "btn quiet full upload-row", onclick: () => dom.fileInput.click() }, [iconSvg("upload", { size: 14 }), el("span", { text: "Upload image" })].flat()));

  list.forEach((a) => {
    const row = el("div", { class: "asset-row", draggable: "true" });
    row.append(
      el("span", { class: "asset-thumb", html: `<img src="${C.escapeAttr(a.src)}" alt="">` }),
      el("span", { class: "asset-copy" }, [el("strong", { text: a.name }), el("small", { text: a.sizeLabel || "image" })]),
      el("button", { class: "layer-action", "data-tip": "Delete asset", html: iconSvg("trash", { size: 13 }), onclick: () => {
        C.change(() => {
          C.project().assets = C.project().assets.filter((x) => x.id !== a.id);
          C.page().nodes.forEach((n) => { if (n.assetId === a.id) n.assetId = null; });
        }, "delete asset");
        toast("Asset removed", "success");
      } }),
    );
    row.addEventListener("click", () => import("./main.js").then((m) => m.addNodeFromAsset(a)));
    row.addEventListener("dragstart", (e) => e.dataTransfer.setData("application/x-vbuilder-asset", a.id));
    host.appendChild(row);
  });
}

/* ---------------------------------------------------------------- elements */

const SHAPE_TOOLS = [
  { type: "frame", label: "Frame", icon: "frame", tip: "Frame (F) — container, can auto-layout" },
  { type: "rect", label: "Rectangle", icon: "square", tip: "Rectangle (R)" },
  { type: "ellipse", label: "Ellipse", icon: "circle", tip: "Ellipse (O)" },
  { type: "line", label: "Line", icon: "minus", tip: "Line (L)" },
  { type: "arrow", label: "Arrow", icon: "arrow-right", tip: "Arrow" },
  { type: "star", label: "Star", icon: "star", tip: "Star" },
  { type: "text", label: "Text", icon: "type", tip: "Text (T)" },
  { type: "button", label: "Button", icon: "rectangle-horizontal", tip: "Button (B) — interactive" },
];

export function renderElements() {
  const host = dom.elementsBody;
  if (!host) return;
  const term = (dom.leftPanelSearch?.value || "").trim().toLowerCase();
  host.innerHTML = "";

  if (!term) {
    host.appendChild(section("Shapes & content", el("div", { class: "element-grid" },
      SHAPE_TOOLS.map((s) => el("button", {
        class: "element-tile", type: "button", "data-tip": `${s.tip} — then click the canvas`,
        onclick: () => import("./main.js").then((m) => m.armTool(s.type)),
      }, [el("span", { class: "element-glyph", html: iconSvg(s.icon, { size: 20 }) }), el("span", { class: "element-name", text: s.label })])))));

    host.appendChild(section("Text styles", el("div", { class: "preset-list" },
      TEXT_PRESETS.map((p) => el("button", {
        class: "preset-row", type: "button", "data-tip": "Then click the canvas to place",
        onclick: () => import("./main.js").then((m) => m.armTool("text", p)),
      }, [el("span", { class: "preset-sample", text: p.label, style: { fontSize: `${C.clamp(p.size / 3.2, 11, 22)}px`, fontWeight: String(p.weight), letterSpacing: `${C.num(p.letterSpacing) / 2}px`, textTransform: p.transform || "none" } })])))));

    host.appendChild(section("Blocks", el("div", { class: "block-list" },
      BLOCKS.map((b, i) => el("button", {
        class: "block-row", type: "button",
        onclick: () => import("./main.js").then((m) => m.insertBlock(i)),
      }, [el("span", { class: "block-copy" }, [el("strong", { text: b.label }), el("small", { text: b.hint })]), iconSvg("plus", { size: 14 })])))));

    host.appendChild(section("Gradients", el("div", { class: "gradient-grid" },
      GRADIENTS.map((pair) => el("button", {
        class: "gradient-tile", type: "button", "data-tip": "Add gradient rectangle",
        style: { background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})` },
        onclick: () => import("./main.js").then((m) => m.addGradientRect(pair)),
      })))));
  }

  const icons = ICON_NAMES.filter((name) => !term || name.includes(term));
  if (icons.length) {
    const grid = el("div", { class: "icon-grid" }, icons.slice(0, 240).map((name) => el("button", {
      class: "icon-tile", type: "button", "data-tip": name,
      onclick: () => import("./main.js").then((m) => m.addIcon(name)),
    }, [el("span", { html: iconSvg(name, { size: 18 }) })])));
    host.appendChild(section(term ? `Icons · ${icons.length}` : "Icons", grid));
  }
}

const section = (title, body) => el("div", { class: "element-section" }, [el("div", { class: "element-section-title", text: title }), body]);

/* ------------------------------------------------------------------- pages */

export function renderPages() {
  const host = dom.pagesList;
  if (!host) return;
  host.innerHTML = "";
  C.project().pages.forEach((p, index) => {
    const row = el("div", { class: `page-item${p.id === C.project().activePageId ? " active" : ""}`, draggable: "true" });
    row.append(
      el("span", { class: "page-index", text: String(index + 1) }),
      el("input", { class: "page-name-input", type: "text", value: p.name, maxlength: "48",
        onchange: (e) => C.change(() => { p.name = e.target.value.trim() || p.name; }, "rename page") }),
      el("span", { class: "page-meta", text: `${p.nodes.length}` }),
      el("button", { class: "layer-action", "data-tip": "Page options", html: iconSvg("more", { size: 13 }),
        onclick: (e) => showMenu(e, [
          { label: "Rename page", icon: "type", run: async () => { const v = await promptDialog("Rename page", p.name); if (v) C.change(() => { p.name = v; }, "rename page"); } },
          { label: "Duplicate page", icon: "copy", run: () => import("./main.js").then((m) => m.duplicatePage(p.id)) },
          { separator: true },
          { label: "Delete page", icon: "trash", danger: true, disabled: C.project().pages.length === 1, run: () => import("./main.js").then((m) => m.deletePage(p.id)) },
        ]) }),
    );
    row.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.tagName === "INPUT") return;
      import("./main.js").then((m) => m.switchPage(p.id));
    });
    row.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/x-page", p.id));
    row.addEventListener("dragover", (e) => e.preventDefault());
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/x-page");
      if (!fromId || fromId === p.id) return;
      C.change(() => {
        const pages = C.project().pages;
        const from = pages.findIndex((x) => x.id === fromId);
        const [moved] = pages.splice(from, 1);
        pages.splice(pages.findIndex((x) => x.id === p.id), 0, moved);
      }, "reorder pages");
    });
    host.appendChild(row);
  });
  host.appendChild(el("button", { class: "btn quiet full", onclick: () => import("./main.js").then((m) => m.addPage()) }, [iconSvg("plus", { size: 14 }), el("span", { text: "Add page" })].flat()));
}

/* -------------------------------------------------------------- left panel */

const PANELS = { layers: "Layers", assets: "Assets", elements: "Elements", pages: "Pages" };

export function renderLeftPanel() {
  const key = C.state.leftPanel;
  if (dom.leftPanelTitle) dom.leftPanelTitle.textContent = PANELS[key] || "Layers";
  $$("#leftRail .rail-btn").forEach((b) => b.classList.toggle("active", b.dataset.panel === key));
  ["layersList", "assetsList", "elementsBody", "pagesList"].forEach((id) => { if (dom[id]) dom[id].hidden = false; });
  if (dom.layersList) dom.layersList.hidden = key !== "layers";
  if (dom.assetsList) dom.assetsList.hidden = key !== "assets";
  if (dom.elementsBody) dom.elementsBody.hidden = key !== "elements";
  if (dom.pagesList) dom.pagesList.hidden = key !== "pages";
  if (dom.leftPanelSearch) dom.leftPanelSearch.hidden = !(key === "layers" || key === "elements");
  if (key === "layers") renderLayers();
  if (key === "assets") renderAssets();
  if (key === "elements") renderElements();
  if (key === "pages") renderPages();
}

export function renderAllPanels() {
  renderLayers(); renderAssets(); renderElements(); renderPages();
  renderLeftPanel();
}

/* ------------------------------------------------------------------ wiring */

export function init() {
  $$("#leftRail .rail-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.panel;
      if (!key) return; // non-panel buttons (shortcuts) keep their own handler
      if (C.state.leftCollapsed) { C.state.leftCollapsed = false; C.state.leftPanel = key; }
      else if (C.state.leftPanel === key) C.state.leftCollapsed = true;
      else C.state.leftPanel = key;
      renderLeftPanel();
      import("./main.js").then((m) => m.refresh({ skipInspector: true }));
    });
    btn.addEventListener("contextmenu", (event) => showMenu(event, [
      { label: "Layers", icon: "layers", checked: C.state.leftPanel === "layers", run: () => { C.state.leftPanel = "layers"; renderLeftPanel(); } },
      { label: "Assets", icon: "image", checked: C.state.leftPanel === "assets", run: () => { C.state.leftPanel = "assets"; renderLeftPanel(); } },
      { label: "Elements", icon: "grid", checked: C.state.leftPanel === "elements", run: () => { C.state.leftPanel = "elements"; renderLeftPanel(); } },
      { label: "Pages", icon: "file-text", checked: C.state.leftPanel === "pages", run: () => { C.state.leftPanel = "pages"; renderLeftPanel(); } },
    ]));
  });

  dom.leftPanelSearch?.addEventListener("input", () => {
    if (C.state.leftPanel === "layers") renderLayers();
    if (C.state.leftPanel === "elements") renderElements();
  });

  dom.canvasViewport?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    import("./main.js").then((m) => m.showCanvasMenu(event));
  });

  dom.canvasViewport?.addEventListener("dragover", (event) => { if (event.dataTransfer?.types?.includes("application/x-vbuilder-asset")) event.preventDefault(); });
  dom.canvasViewport?.addEventListener("drop", (event) => {
    const assetId = event.dataTransfer?.getData("application/x-vbuilder-asset");
    if (!assetId) return;
    event.preventDefault();
    import("./main.js").then((m) => {
      const a = C.asset(assetId);
      if (a) m.addNodeFromAsset(a);
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".context-menu")) closeMenu();
  });
  window.addEventListener("blur", closeMenu);
  initTooltips();
}
