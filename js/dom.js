/* Cached DOM references. Populated once at boot so modules never touch the
   document at import time (keeps the whole app testable outside a browser). */

export const dom = {};

export function bindRefs(root = document) {
  const ids = [
    "app", "leftRail", "leftPanel", "leftPanelTitle", "leftPanelBody", "leftPanelSearch",
    "layersList", "assetsList", "elementsBody", "pagesList",
    "projectName", "canvasViewport", "artboardWrap", "scaleLayer", "artboard", "overlay", "guides", "pageResizeHandle",
    "rulerTop", "rulerLeft", "canvasCaption", "zoomCaption", "zoomValue", "zoomMenu",
    "toolDock", "topActions", "inspector", "inspectorTabs", "inspectorBody",
    "contextMenu", "palette", "paletteInput", "paletteResults", "toastRegion",
    "codeModal", "codeTabs", "codeOutput", "codeLangLabel", "previewModal", "previewFrame",
    "previewLabel", "exportModal", "exportOptions", "shortcutsModal", "statusBar",
    "fileInput", "fontFileInput", "projectInput", "newProjectBtn", "openProjectBtn", "saveProjectBtn",
    "codeBtn", "previewBtn", "exportBtn", "undoBtn", "redoBtn", "deviceTabs",
    "gridToggle", "snapToggle", "rulerToggle", "guidesToggle", "outlineToggle", "fitBtn", "zoomOutBtn", "zoomInBtn",
    "paletteBtn", "shortcutsBtn", "themeAccent", "splitLeft", "splitRight",
    "inspectorCollapseBtn", "inspectorReopenBtn",
  ];
  ids.forEach((id) => { dom[id] = root.getElementById(id); });
  dom.root = root;
  return dom;
}

export const $ = (sel, scope = document) => scope.querySelector(sel);
export const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "text") node.textContent = value;
    else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  (Array.isArray(children) ? children : [children]).filter(Boolean).forEach((child) => {
    if (child.nodeType) { node.append(child); return; }
    const text = String(child);
    if (text.startsWith("<")) {
      // Markup strings (icon SVGs) become real nodes instead of raw text.
      const frag = document.createElement("template");
      frag.innerHTML = text;
      node.append(frag.content);
      return;
    }
    node.append(document.createTextNode(text));
  });
  return node;
}
