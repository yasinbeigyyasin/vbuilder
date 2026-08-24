/*
 * VBuilder v1
 * A small, local-first canvas-to-code editor. The project document is the source
 * of truth for both the editor and the generated website.
 */

const PRESETS = {
  desktop: { label: "Desktop", width: 1440, height: 900, media: null, fluid: true },
  tablet: { label: "Tablet", width: 768, height: 1024, media: 1024 },
  mobile: { label: "Mobile", width: 390, height: 844, media: 767 },
};

const TYPE_LABELS = {
  text: "Text",
  image: "Image",
  shape: "Shape",
  button: "Button",
  section: "Frame",
};

const TYPE_ICONS = {
  text: '<path d="M4 4h12M10 4v12M7 16h6" />',
  image: '<rect x="3" y="3" width="14" height="14" rx="2" /><circle cx="7" cy="7" r="1.2" /><path d="m4.5 14 3.2-3.2 2.2 2.1 1.6-1.5 4 3.6" />',
  shape: '<rect x="3.5" y="3.5" width="13" height="13" rx="2" />',
  button: '<rect x="2.8" y="6" width="14.4" height="8" rx="2" /><path d="M7 10h6" />',
  section: '<path d="M5 3H3v2M15 3h2v2M17 15v2h-2M5 17H3v-2M7 3v14M13 3v14M3 7h14M3 13h14" />',
  "align-left": '<path d="M4 5h12M4 10h8M4 15h12" />',
  "align-center": '<path d="M4 5h12M6 10h8M4 15h12" />',
  "align-right": '<path d="M4 5h12M8 10h8M4 15h12" />',
  "align-top": '<path d="M5 4v12M10 4v8M15 4v12" />',
  "align-middle": '<path d="M5 4v12M10 6v8M15 4v12" />',
  "align-bottom": '<path d="M5 4v12M10 8v8M15 4v12" />',
  rotate: '<path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 4v4h4" />',
  "flip-horizontal": '<path d="M3 4v12M17 4v12M7 7l3 3-3 3M13 7l-3 3 3 3" />',
  "flip-vertical": '<path d="M4 3h12M4 17h12M7 7l3 3 3-3M7 13l3-3 3 3" />',
};

const LUCIDE_PATHS = {
  plus: '<path d="M5 12h14" /><path d="M12 5v14" />',
  "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h6M8 13h8M8 17h6" />',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" />',
  tablet: '<rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 18h4" />',
  smartphone: '<rect x="8" y="2" width="8" height="20" rx="2" /><path d="M11 18h2" />',
  undo: '<path d="m9 14-5-5 5-5" /><path d="M4 9h9a6 6 0 0 1 6 6v1" />',
  redo: '<path d="m15 14 5-5-5-5" /><path d="M20 9h-9a6 6 0 0 0-6 6v1" />',
  pointer: '<path d="m5 3 13 8-6 1 3 6-2 1-3-6-5 5z" />',
  hand: '<path d="M18 11V7a1 1 0 0 0-2 0v3M16 8V5a1 1 0 0 0-2 0v5M14 8V4a1 1 0 0 0-2 0v6M12 9V6a1 1 0 0 0-2 0v7l-2-2a1.4 1.4 0 0 0-2 2l3 4a4 4 0 0 0 3.2 1.6H14a4 4 0 0 0 4-4v-3" />',
  frame: '<path d="M6 3H3v3M18 3h3v3M21 18v3h-3M3 18v3h3M8 3v18M16 3v18M3 8h18M3 16h18" />',
  type: '<path d="M4 5V3h16v2M12 3v18M8 21h8" />',
  square: '<rect x="4" y="4" width="16" height="16" rx="2" />',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m4 17 5-5 3 3 2-2 6 5" />',
  "rectangle-horizontal": '<rect x="3" y="7" width="18" height="10" rx="2" /><path d="M8 12h8" />',
  code: '<path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" />',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14" />',
  rotate: '<path d="M4 10a8 8 0 1 0 2.3-5.7L4 7" /><path d="M4 3v4h4" />',
  "flip-horizontal": '<path d="M3 4v16M21 4v16M7 8l4 4-4 4M17 8l-4 4 4 4" />',
  "flip-vertical": '<path d="M4 3h16M4 21h16M8 7l4 4 4-4M8 17l4-4 4 4" />',
  "align-left": '<path d="M4 6h16M4 12h11M4 18h16" />',
  "align-center": '<path d="M4 6h16M7 12h10M4 18h16" />',
  "align-right": '<path d="M4 6h16M9 12h11M4 18h16" />',
  "align-top": '<path d="M6 4v16M12 4v11M18 4v16" />',
  "align-middle": '<path d="M6 4v16M12 7v10M18 4v16" />',
  "align-bottom": '<path d="M6 4v16M12 9v11M18 4v16" />',
};

const ICON_ALIASES = {
  text: "type",
  image: "image",
  shape: "square",
  button: "rectangle-horizontal",
  section: "frame",
};

const STORAGE_KEY = "vbuilder-project-v1";
const DB_NAME = "vbuilder-local-v1";
const DB_STORE = "projects";
const HISTORY_LIMIT = 60;

const refs = {
  artboard: document.getElementById("artboard"),
  artboardWrap: document.getElementById("artboardWrap"),
  pageResizeHandle: document.getElementById("pageResizeHandle"),
  canvasSpace: document.getElementById("canvasSpace"),
  canvasCaption: document.getElementById("canvasCaption"),
  canvasZoomCaption: document.getElementById("canvasZoomCaption"),
  layersList: document.getElementById("layersList"),
  layerCount: document.getElementById("layerCount"),
  leftPanelHeading: document.getElementById("leftPanelHeading"),
  inspectorContent: document.getElementById("inspectorContent"),
  projectNameInput: document.getElementById("projectNameInput"),
  pageTitle: document.getElementById("pageTitle"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  imageInput: document.getElementById("imageInput"),
  projectInput: document.getElementById("projectInput"),
  toastRegion: document.getElementById("toastRegion"),
  layerContextMenu: document.getElementById("layerContextMenu"),
  moveToPageAction: document.getElementById("moveToPageAction"),
  codeModal: document.getElementById("codeModal"),
  codeOutput: document.getElementById("codeOutput"),
  previewModal: document.getElementById("previewModal"),
  previewFrame: document.getElementById("previewFrame"),
  previewDeviceLabel: document.getElementById("previewDeviceLabel"),
};

const state = {
  project: createStarterProject(),
  activeDevice: "desktop",
  selectedId: "hero-title",
  zoomMode: "fit",
  zoom: 0.72,
  computedZoom: 0.72,
  panX: 0,
  panY: 0,
  contextNodeId: null,
  history: [],
  historyIndex: -1,
  interaction: null,
  codeFile: "index.html",
  leftTab: "layers",
  activeTool: "select",
  spaceDown: false,
};

let dbPromise = null;
let persistTimer = null;
let toastTimer = null;
let gestureStartZoom = null;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix = "node") {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function commonBase(overrides = {}) {
  return {
    x: 80,
    y: 80,
    width: 240,
    height: 120,
    rotation: 0,
    flipX: false,
    flipY: false,
    opacity: 100,
    radius: 10,
    fill: "#252832",
    borderColor: "#353946",
    borderWidth: 0,
    responsiveBehavior: "scale",
    ...overrides,
  };
}

function defaultBaseFor(type, overrides = {}) {
  if (type === "text") {
    return commonBase({
      width: 280,
      height: 72,
      fill: "transparent",
      radius: 0,
      color: "#f2f3f7",
      fontSize: 24,
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
      verticalAlign: "top",
      fontFamily: "Inter, sans-serif",
      padding: 0,
      responsiveBehavior: "scale",
      ...overrides,
    });
  }

  if (type === "button") {
    return commonBase({
      width: 148,
      height: 44,
      fill: "#3b82f6",
      borderColor: "#3b82f6",
      borderWidth: 0,
      radius: 8,
      color: "#f8fbff",
      fontSize: 13,
      fontWeight: 700,
      lineHeight: 1.2,
      textAlign: "center",
      verticalAlign: "center",
      fontFamily: "Inter, sans-serif",
      padding: 8,
      responsiveBehavior: "left",
      ...overrides,
    });
  }

  if (type === "image") {
    return commonBase({
      width: 360,
      height: 240,
      fill: "#1c1f27",
      radius: 14,
      objectFit: "cover",
      objectPosition: "center",
      lockRatio: false,
      responsiveBehavior: "scale",
      ...overrides,
    });
  }

  if (type === "section") {
    return commonBase({
      width: 480,
      height: 260,
      fill: "#1b1e25",
      borderColor: "#2d313c",
      borderWidth: 1,
      radius: 16,
      responsiveBehavior: "stretch",
      ...overrides,
    });
  }

  return commonBase(overrides);
}

function makeNode(type, name, base = {}, extra = {}) {
  return {
    id: extra.id || uid(type),
    type,
    name: name || TYPE_LABELS[type],
    parentId: extra.parentId || null,
    visible: extra.visible !== false,
    locked: extra.locked === true,
    base: defaultBaseFor(type, base),
    responsive: extra.responsive || {},
    content: extra.content || "",
    src: extra.src || null,
    assetName: extra.assetName || null,
    alt: extra.alt || "",
  };
}

function createStarterProject() {
  const project = {
    version: 1,
    kind: "vbuilder-project",
    name: "Starter landing page",
    page: {
      name: "Landing page",
      width: 1440,
      height: 900,
      background: "#101114",
      responsive: {},
    },
    nodes: [],
  };

  project.nodes = [
    makeNode("section", "Header", {
      x: 48, y: 32, width: 1344, height: 64, fill: "#191b21", borderColor: "#2a2d36", borderWidth: 1, radius: 14, responsiveBehavior: "stretch",
    }, { id: "header" }),
    makeNode("text", "Brand", {
      x: 80, y: 51, width: 160, height: 26, color: "#f2f3f7", fontSize: 18, fontWeight: 750, lineHeight: 1, responsiveBehavior: "left",
    }, { id: "brand", content: "vbuilder" }),
    makeNode("text", "Navigation", {
      x: 1120, y: 56, width: 204, height: 18, color: "#979cab", fontSize: 11, fontWeight: 550, lineHeight: 1, textAlign: "right", responsiveBehavior: "right",
    }, { id: "navigation", content: "Canvas   Export   Local" }),
    makeNode("text", "Eyebrow", {
      x: 112, y: 192, width: 310, height: 20, color: "#3b82f6", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, lineHeight: 1, responsiveBehavior: "left",
    }, { id: "eyebrow", content: "VISUAL BUILDER · V1" }),
    makeNode("text", "Hero title", {
      x: 112, y: 231, width: 650, height: 154, color: "#f2f3f7", fontSize: 64, fontWeight: 750, lineHeight: 1.03, letterSpacing: -2.2, responsiveBehavior: "left",
    }, {
      id: "hero-title",
      content: "Design visually.\nShip the code.",
      responsive: {
        tablet: { x: 64, y: 186, width: 560, height: 132, fontSize: 52 },
        mobile: { x: 24, y: 154, width: 342, height: 105, fontSize: 40, letterSpacing: -1.1 },
      },
    }),
    makeNode("text", "Hero copy", {
      x: 116, y: 411, width: 460, height: 72, color: "#969ba8", fontSize: 16, fontWeight: 450, lineHeight: 1.55, responsiveBehavior: "left",
    }, {
      id: "hero-copy",
      content: "A focused canvas for building responsive pages\nand exporting clean HTML, CSS, and JavaScript.",
      responsive: {
        tablet: { x: 66, y: 348, width: 510, height: 64, fontSize: 15 },
        mobile: { x: 24, y: 293, width: 342, height: 76, fontSize: 14 },
      },
    }),
    makeNode("button", "Primary button", {
      x: 112, y: 522, width: 154, height: 46, fill: "#3b82f6", color: "#f8fbff", fontSize: 12, radius: 8, responsiveBehavior: "left",
    }, {
      id: "hero-button",
      content: "Start designing",
      responsive: {
        tablet: { x: 64, y: 448 },
        mobile: { x: 24, y: 401, width: 150, height: 44 },
      },
    }),
    makeNode("section", "Preview card", {
      x: 834, y: 166, width: 470, height: 552, fill: "#1a1d24", borderColor: "#2f3340", borderWidth: 1, radius: 24, responsiveBehavior: "right",
    }, {
      id: "preview-card",
      responsive: {
        tablet: { x: 64, y: 568, width: 640, height: 330 },
        mobile: { x: 24, y: 498, width: 342, height: 260 },
      },
    }),
    makeNode("shape", "Preview frame", {
      x: 870, y: 210, width: 398, height: 308, fill: "#252934", borderColor: "#3a3e4b", borderWidth: 1, radius: 14, responsiveBehavior: "right",
    }, {
      id: "preview-frame",
      responsive: {
        tablet: { x: 100, y: 604, width: 568, height: 190 },
        mobile: { x: 48, y: 526, width: 294, height: 138 },
      },
    }),
    makeNode("shape", "Preview accent", {
      x: 900, y: 252, width: 190, height: 10, fill: "#3b82f6", radius: 6, responsiveBehavior: "right",
    }, {
      id: "preview-accent",
      responsive: {
        tablet: { x: 130, y: 630, width: 250 },
        mobile: { x: 72, y: 547, width: 120 },
      },
    }),
    makeNode("shape", "Preview line one", {
      x: 900, y: 285, width: 270, height: 8, fill: "#5e6474", radius: 5, responsiveBehavior: "right",
    }, {
      id: "preview-line-one",
      responsive: {
        tablet: { x: 130, y: 663, width: 360 },
        mobile: { x: 72, y: 579, width: 180 },
      },
    }),
    makeNode("shape", "Preview line two", {
      x: 900, y: 306, width: 214, height: 8, fill: "#454a58", radius: 5, responsiveBehavior: "right",
    }, {
      id: "preview-line-two",
      responsive: {
        tablet: { x: 130, y: 684, width: 284 },
        mobile: { x: 72, y: 600, width: 142 },
      },
    }),
    makeNode("shape", "Preview tile one", {
      x: 900, y: 366, width: 104, height: 104, fill: "#303442", radius: 12, responsiveBehavior: "right",
    }, {
      id: "preview-tile-one",
      responsive: {
        tablet: { x: 130, y: 734, width: 150, height: 105 },
        mobile: { x: 72, y: 633, width: 84, height: 72 },
      },
    }),
    makeNode("shape", "Preview tile two", {
      x: 1040, y: 366, width: 104, height: 104, fill: "#262a35", radius: 12, responsiveBehavior: "right",
    }, {
      id: "preview-tile-two",
      responsive: {
        tablet: { x: 306, y: 734, width: 150, height: 105 },
        mobile: { x: 182, y: 633, width: 84, height: 72 },
      },
    }),
    makeNode("text", "Card label", {
      x: 870, y: 588, width: 300, height: 22, color: "#f0eff6", fontSize: 15, fontWeight: 650, responsiveBehavior: "right",
    }, {
      id: "card-label",
      content: "One canvas. Every breakpoint.",
      responsive: {
        tablet: { x: 100, y: 826, width: 300, height: 22 },
        mobile: { x: 48, y: 690, width: 250, height: 22, fontSize: 13 },
      },
    }),
    makeNode("text", "Card caption", {
      x: 870, y: 622, width: 332, height: 42, color: "#858b9a", fontSize: 11, fontWeight: 450, lineHeight: 1.45, responsiveBehavior: "right",
    }, {
      id: "card-caption",
      content: "Tune desktop, tablet, and mobile\nwithout leaving the canvas.",
      responsive: {
        tablet: { x: 100, y: 856, width: 430, height: 34 },
        mobile: { x: 48, y: 720, width: 270, height: 34, fontSize: 10 },
      },
    }),
    makeNode("text", "Footer note", {
      x: 112, y: 820, width: 380, height: 20, color: "#626875", fontSize: 11, fontWeight: 500, responsiveBehavior: "left",
    }, {
      id: "footer-note",
      content: "Everything stays on this device.",
      responsive: {
        tablet: { x: 64, y: 956 },
        mobile: { x: 24, y: 794, width: 300, fontSize: 10 },
      },
    }),
  ];

  return project;
}

function createBlankProject() {
  return {
    version: 1,
    kind: "vbuilder-project",
    name: "Untitled project",
    page: {
      name: "Landing page",
      width: 1440,
      height: 900,
      background: "#101114",
      responsive: {},
    },
    nodes: [],
  };
}

function normalizeProject(raw) {
  const fallback = createBlankProject();
  const project = {
    ...fallback,
    ...(raw && typeof raw === "object" ? raw : {}),
    page: { ...fallback.page, ...(raw && raw.page ? raw.page : {}) },
    nodes: Array.isArray(raw && raw.nodes) ? raw.nodes.map(normalizeNode) : [],
  };
  project.version = 1;
  project.kind = "vbuilder-project";
  project.page.width = Number(project.page.width) || 1440;
  project.page.height = Number(project.page.height) || 900;
  project.page.responsive = project.page.responsive && typeof project.page.responsive === "object" ? project.page.responsive : {};
  project.name = String(project.name || "Untitled project");
  project.page.name = String(project.page.name || "Landing page");
  return project;
}

function normalizeNode(raw) {
  const type = TYPE_LABELS[raw && raw.type] ? raw.type : "shape";
  const fallback = makeNode(type, TYPE_LABELS[type]);
  return {
    ...fallback,
    ...(raw || {}),
    id: String((raw && raw.id) || fallback.id),
    type,
    name: String((raw && raw.name) || TYPE_LABELS[type]),
    parentId: raw && raw.parentId ? String(raw.parentId) : null,
    base: { ...fallback.base, ...((raw && raw.base) || {}) },
    responsive: raw && raw.responsive && typeof raw.responsive === "object" ? raw.responsive : {},
    content: String((raw && raw.content) || ""),
    src: (raw && raw.src) || null,
    assetName: (raw && raw.assetName) || null,
    alt: String((raw && raw.alt) || ""),
    visible: raw && raw.visible !== false,
    locked: raw && raw.locked === true,
  };
}

function serializeProject() {
  return JSON.stringify(state.project);
}

function resetHistory() {
  state.history = [serializeProject()];
  state.historyIndex = 0;
  updateHistoryButtons();
}

function recordHistory(before) {
  const after = serializeProject();
  if (before === after) return false;
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(after);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
  return true;
}

function applyChange(mutator, options = {}) {
  const before = serializeProject();
  mutator();
  const changed = recordHistory(before);
  if (changed || options.forceRender) {
    renderAll();
    schedulePersist();
  }
  return changed;
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex -= 1;
  state.project = normalizeProject(JSON.parse(state.history[state.historyIndex]));
  if (!getNode(state.selectedId)) state.selectedId = null;
  renderAll();
  schedulePersist();
  showToast("Undid last change", "success");
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex += 1;
  state.project = normalizeProject(JSON.parse(state.history[state.historyIndex]));
  if (!getNode(state.selectedId)) state.selectedId = null;
  renderAll();
  schedulePersist();
  showToast("Redid change", "success");
}

function updateHistoryButtons() {
  refs.undoButton.disabled = state.historyIndex <= 0;
  refs.redoButton.disabled = state.historyIndex >= state.history.length - 1;
}

function getNode(id) {
  return state.project.nodes.find((node) => node.id === id) || null;
}

function getActivePreset() {
  return PRESETS[state.activeDevice];
}

function getPageSize(device = state.activeDevice) {
  const preset = PRESETS[device];
  const base = device === "desktop"
    ? { width: state.project.page.width, height: state.project.page.height }
    : { width: preset.width, height: preset.height };
  const override = (state.project.page.responsive && state.project.page.responsive[device]) || {};
  return {
    width: Math.max(240, Number(override.width ?? base.width) || base.width),
    height: Math.max(200, Number(override.height ?? base.height) || base.height),
  };
}

function setPageSize(key, value, device = state.activeDevice) {
  const minimum = key === "width" ? 240 : 200;
  const next = Math.max(minimum, Math.round(Number(value) || minimum));
  if (device === "desktop") {
    state.project.page[key] = next;
    return;
  }
  if (!state.project.page.responsive) state.project.page.responsive = {};
  if (!state.project.page.responsive[device]) state.project.page.responsive[device] = {};
  state.project.page.responsive[device][key] = next;
}

function getContainerProps(node, device) {
  const parent = node.parentId ? getNode(node.parentId) : null;
  if (!parent || parent.id === node.id) {
    const page = getPageSize(device);
    return { x: 0, y: 0, width: page.width, height: page.height };
  }
  const parentProps = getNodeProps(parent, device);
  const border = Math.max(0, num(parentProps.borderWidth));
  return {
    x: border,
    y: border,
    width: Math.max(1, num(parentProps.width) - (border * 2)),
    height: Math.max(1, num(parentProps.height) - (border * 2)),
  };
}

function getAbsoluteProps(node, device = state.activeDevice, seen = new Set()) {
  const props = { ...getNodeProps(node, device) };
  if (!node.parentId || seen.has(node.id)) return props;
  const parent = getNode(node.parentId);
  if (!parent || parent.id === node.id || seen.has(parent.id)) return props;
  const nextSeen = new Set(seen);
  nextSeen.add(node.id);
  const parentProps = getAbsoluteProps(parent, device, nextSeen);
  const parentLocal = getNodeProps(parent, device);
  const border = Math.max(0, num(parentLocal.borderWidth));
  return { ...props, x: num(parentProps.x) + border + num(props.x), y: num(parentProps.y) + border + num(props.y) };
}

function isDescendant(nodeId, ancestorId) {
  let current = getNode(nodeId);
  const visited = new Set();
  while (current && current.parentId && !visited.has(current.id)) {
    if (current.parentId === ancestorId) return true;
    visited.add(current.id);
    current = getNode(current.parentId);
  }
  return false;
}

function getRenderProps(node, device = state.activeDevice) {
  return node.parentId && getNode(node.parentId) ? getNodeProps(node, device) : getAbsoluteProps(node, device);
}

function getAutoProps(node, device) {
  const base = { ...node.base };
  if (device === "desktop") return base;

  const targetFrame = getContainerProps(node, device);
  const baseFrame = getContainerProps(node, "desktop");
  const ratio = targetFrame.width / baseFrame.width;
  const breakpointBehavior = node.responsive && node.responsive[device] && node.responsive[device].responsiveBehavior;
  const behavior = breakpointBehavior || base.responsiveBehavior || "scale";
  const rightMargin = baseFrame.width - (Number(base.x) || 0) - (Number(base.width) || 0);
  const safeMargin = node.parentId ? 16 : (device === "mobile" ? 24 : 32);
  let props = { ...base };

  if (behavior === "stretch") {
    props.x = Math.round((Number(base.x) || 0) * ratio);
    const right = Math.round(rightMargin * ratio);
    props.width = Math.max(20, targetFrame.width - props.x - right);
  } else if (behavior === "center") {
    props.width = Math.max(20, Math.round((Number(base.width) || 0) * ratio));
    props.x = Math.round((targetFrame.width - props.width) / 2);
  } else if (behavior === "right") {
    props.width = Math.max(20, Math.round((Number(base.width) || 0) * ratio));
    props.x = targetFrame.width - Math.round(rightMargin * ratio) - props.width;
  } else if (behavior === "left") {
    props.x = Math.max(safeMargin, Math.round((Number(base.x) || 0) * ratio));
    props.width = Math.min(Math.max(20, Math.round(Number(base.width) || 20)), targetFrame.width - props.x - safeMargin);
  } else {
    props.x = Math.round((Number(base.x) || 0) * ratio);
    props.width = Math.max(20, Math.round((Number(base.width) || 0) * ratio));
  }

  if (base.lockRatio && base.width) {
    props.height = Math.max(20, Math.round((Number(base.height) || 20) * (props.width / Number(base.width))));
  }

  if ((node.type === "text" || node.type === "button") && behavior === "scale" && base.fontSize) {
    props.fontSize = Math.max(10, Math.round(Number(base.fontSize) * Math.max(ratio, 0.68)));
  }

  if (props.x < 0) props.x = 0;
  if (props.x + props.width > targetFrame.width) {
    props.width = Math.max(20, targetFrame.width - props.x);
  }

  return props;
}

function getNodeProps(node, device = state.activeDevice) {
  const auto = getAutoProps(node, device);
  const override = device === "desktop" ? {} : (node.responsive && node.responsive[device]) || {};
  return { ...auto, ...override };
}

function hasBreakpointOverride(node, device = state.activeDevice) {
  return device !== "desktop" && node.responsive && node.responsive[device] && Object.keys(node.responsive[device]).length > 0;
}

function setNodeProps(node, patch, device = state.activeDevice) {
  if (device === "desktop") {
    Object.assign(node.base, patch);
    return;
  }
  if (!node.responsive) node.responsive = {};
  if (!node.responsive[device]) node.responsive[device] = {};
  Object.assign(node.responsive[device], patch);
}

function clearBreakpointOverride(node, device = state.activeDevice) {
  if (device !== "desktop" && node.responsive) delete node.responsive[device];
}

function renderAll() {
  if (state.selectedId && !getNode(state.selectedId)) state.selectedId = null;
  refs.projectNameInput.value = state.project.name;
  refs.pageTitle.textContent = state.project.page.name;
  document.querySelectorAll("[data-device]").forEach((button) => {
    const active = button.dataset.device === state.activeDevice;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll("[data-left-tab]").forEach((button) => {
    const active = button.dataset.leftTab === state.leftTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.activeTool);
  });
  renderLayers();
  renderCanvas();
  renderInspector();
  updateHistoryButtons();
}

function nodeDepth(node) {
  let depth = 0;
  let current = node;
  const visited = new Set();
  while (current && current.parentId && !visited.has(current.id)) {
    depth += 1;
    visited.add(current.id);
    current = getNode(current.parentId);
  }
  return Math.min(depth, 4);
}

function renderLayers() {
  if (state.leftTab === "assets") {
    renderAssets();
    return;
  }

  refs.leftPanelHeading.textContent = "Layers";
  refs.layerCount.textContent = String(state.project.nodes.length);
  const pageSelected = state.selectedId === null ? " selected" : "";
  const pageRow = `<button class="layer-row page-layer${pageSelected}" style="padding-left:6px" type="button" data-select-page="true" title="Select website frame">
    <span class="layer-icon">${iconSvg("section")}</span>
    <span class="layer-label">${escapeHtml(state.project.page.name)}</span>
    <span class="layer-type">Page</span>
  </button>`;

  if (!state.project.nodes.length) {
    refs.layersList.innerHTML = `${pageRow}<div class="layer-empty">Your canvas is empty.<br />Add an element to get started.</div>`;
    bindPageLayer();
    return;
  }

  refs.layersList.innerHTML = pageRow + state.project.nodes.slice().reverse().map((node) => {
    const selected = node.id === state.selectedId ? " selected" : "";
    const muted = node.visible ? "" : " muted";
    const indent = 6 + (nodeDepth(node) * 14);
    return `<button class="layer-row${selected}${muted}" style="padding-left:${indent}px" type="button" data-layer-id="${escapeAttr(node.id)}" title="Select ${escapeAttr(node.name)}">
      <span class="layer-icon">${iconSvg(node.type)}</span>
      <span class="layer-label">${escapeHtml(node.name)}</span>
      <span class="layer-type">${TYPE_LABELS[node.type]}</span>
    </button>`;
  }).join("");

  bindPageLayer();
  refs.layersList.querySelectorAll("[data-layer-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedId = row.dataset.layerId;
      renderAll();
    });
  });
}

function bindPageLayer() {
  const pageRow = refs.layersList.querySelector("[data-select-page]");
  if (pageRow) {
    pageRow.addEventListener("click", () => {
      state.selectedId = null;
      renderAll();
    });
  }
}

function renderAssets() {
  const assets = state.project.nodes.filter((node) => node.type === "image" && node.src);
  refs.leftPanelHeading.textContent = "Assets";
  refs.layerCount.textContent = String(assets.length);
  if (!assets.length) {
    refs.layersList.innerHTML = '<div class="layer-empty">No image assets yet.<br />Use the Image tool to add one.</div>';
    return;
  }

  refs.layersList.innerHTML = assets.map((node) => `<button class="asset-row" type="button" data-asset-id="${escapeAttr(node.id)}">
    <span class="asset-thumb"><img src="${escapeAttr(node.src)}" alt="" /></span>
    <span class="asset-copy"><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.assetName || "local image")}</small></span>
  </button>`).join("");

  refs.layersList.querySelectorAll("[data-asset-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedId = row.dataset.assetId;
      state.leftTab = "layers";
      renderAll();
    });
  });
}

function renderNodeTree(parentId, container) {
  const children = state.project.nodes.filter((node) => {
    const validParent = node.parentId && getNode(node.parentId) ? node.parentId : null;
    return validParent === parentId && node.visible;
  });

  children.forEach((node) => {
    const localProps = getNodeProps(node);
    const props = parentId ? localProps : getAbsoluteProps(node);
    const element = createCanvasNode(node, props, state.project.nodes.indexOf(node));
    container.appendChild(element);
    if (node.type === "section") renderNodeTree(node.id, element);
  });
}

function renderCanvas() {
  const preset = getActivePreset();
  const size = getPageSize(state.activeDevice);
  const zoom = calculateZoom();
  state.computedZoom = zoom;
  refs.artboard.style.width = `${size.width}px`;
  refs.artboard.style.height = `${size.height}px`;
  refs.artboard.style.transform = `scale(${zoom})`;
  refs.artboard.style.background = state.project.page.background || "#101114";
  refs.artboardWrap.style.width = `${Math.round(size.width * zoom)}px`;
  refs.artboardWrap.style.height = `${Math.round(size.height * zoom)}px`;
  refs.artboardWrap.style.transform = `translate(calc(-50% + ${Math.round(state.panX)}px), calc(-50% + ${Math.round(state.panY)}px))`;
  refs.canvasCaption.textContent = preset.fluid
    ? `${preset.label} · fluid · ${size.width} × ${size.height} base`
    : `${preset.label} · ${size.width} × ${size.height}`;
  refs.canvasZoomCaption.textContent = state.zoomMode === "fit" ? "Fit to view" : `${Math.round(zoom * 100)}% zoom`;

  refs.artboard.innerHTML = "";
  renderNodeTree(null, refs.artboard);

  const selected = getNode(state.selectedId);
  if (selected && selected.visible) {
    const props = getAbsoluteProps(selected);
    refs.artboard.appendChild(createSelectionBox(selected, props));
  }
}

function calculateZoom() {
  if (state.zoomMode !== "fit") return state.zoom;
  const size = getPageSize(state.activeDevice);
  const availableWidth = Math.max(300, refs.canvasSpace.clientWidth - 84);
  const availableHeight = Math.max(260, refs.canvasSpace.clientHeight - 95);
  return Math.max(0.2, Math.min(1, availableWidth / size.width, availableHeight / size.height));
}

function createCanvasNode(node, props, index) {
  const element = document.createElement("div");
  element.className = `vb-node vb-node-${node.type}`;
  element.dataset.id = node.id;
  element.style.left = `${num(props.x)}px`;
  element.style.top = `${num(props.y)}px`;
  element.style.width = `${Math.max(1, num(props.width))}px`;
  element.style.height = `${Math.max(1, num(props.height))}px`;
  element.style.zIndex = String(index + 1);
  element.style.opacity = `${Math.max(0, Math.min(100, num(props.opacity, 100))) / 100}`;
  element.style.borderRadius = `${Math.max(0, num(props.radius))}px`;
  element.style.border = num(props.borderWidth) > 0 ? `${num(props.borderWidth)}px solid ${props.borderColor || "transparent"}` : "0 solid transparent";
  element.style.transform = `rotate(${num(props.rotation)}deg) scaleX(${props.flipX ? -1 : 1}) scaleY(${props.flipY ? -1 : 1})`;

  if (node.type === "text") {
    const inner = document.createElement("div");
    inner.className = "node-text";
    inner.textContent = node.content;
    inner.style.color = props.color || "#f2f3f7";
    inner.style.fontSize = `${Math.max(1, num(props.fontSize, 16))}px`;
    inner.style.fontWeight = String(props.fontWeight || 500);
    inner.style.lineHeight = String(props.lineHeight || 1.2);
    inner.style.letterSpacing = `${num(props.letterSpacing)}px`;
    inner.style.textAlign = props.textAlign || "left";
    inner.style.fontFamily = "Inter, sans-serif";
    inner.style.padding = `${Math.max(0, num(props.padding))}px`;
    inner.style.alignContent = verticalAlignValue(props.verticalAlign);
    inner.style.display = "flex";
    inner.style.flexDirection = "column";
    element.appendChild(inner);
  } else if (node.type === "button") {
    element.style.background = props.fill || "#3b82f6";
    const inner = document.createElement("div");
    inner.className = "node-button";
    inner.textContent = node.content || "Button";
    inner.style.color = props.color || "#f8fbff";
    inner.style.fontSize = `${Math.max(1, num(props.fontSize, 13))}px`;
    inner.style.fontWeight = String(props.fontWeight || 700);
    inner.style.lineHeight = String(props.lineHeight || 1.2);
    inner.style.fontFamily = "Inter, sans-serif";
    inner.style.textAlign = props.textAlign || "center";
    inner.style.padding = `${Math.max(0, num(props.padding, 8))}px`;
    element.appendChild(inner);
  } else if (node.type === "image") {
    if (node.src) {
      const image = document.createElement("img");
      image.className = "node-image";
      image.src = node.src;
      image.alt = node.alt || "";
      image.draggable = false;
      image.style.objectFit = props.objectFit || "cover";
      image.style.objectPosition = props.objectPosition || "center";
      element.appendChild(image);
    } else {
      element.style.background = props.fill || "#1c1f27";
      element.appendChild(imagePlaceholder());
    }
  } else {
    element.style.background = props.fill || "transparent";
    if (node.type === "section" && node.name && state.selectedId === node.id) {
      const label = document.createElement("span");
      label.className = "frame-label";
      label.textContent = node.name;
      element.appendChild(label);
    }
  }

  return element;
}

function imagePlaceholder() {
  const wrap = document.createElement("div");
  wrap.className = "image-placeholder";
  wrap.innerHTML = `${iconSvg("image")}<span>Drop an image here</span>`;
  return wrap;
}

function createSelectionBox(node, props) {
  const box = document.createElement("div");
  box.className = "selection-box";
  box.style.left = `${num(props.x)}px`;
  box.style.top = `${num(props.y)}px`;
  box.style.width = `${Math.max(1, num(props.width))}px`;
  box.style.height = `${Math.max(1, num(props.height))}px`;
  box.dataset.selection = node.id;

  const label = document.createElement("span");
  label.className = "selection-label";
  label.textContent = node.name;
  box.appendChild(label);

  const dimensions = document.createElement("span");
  dimensions.className = "selection-dimensions";
  dimensions.textContent = `${Math.round(num(props.width))} × ${Math.round(num(props.height))}`;
  box.appendChild(dimensions);

  ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((direction) => {
    const handle = document.createElement("span");
    handle.className = `resize-handle ${direction}`;
    handle.dataset.resize = direction;
    box.appendChild(handle);
  });
  return box;
}

function verticalAlignValue(value) {
  if (value === "center") return "center";
  if (value === "bottom") return "flex-end";
  return "flex-start";
}

function renderInspector() {
  const node = getNode(state.selectedId);
  if (!node) {
    refs.inspectorContent.innerHTML = pageInspectorMarkup();
    bindPageInspector();
    return;
  }

  const props = getNodeProps(node);
  const custom = hasBreakpointOverride(node);
  const device = PRESETS[state.activeDevice];
  const resetButton = state.activeDevice === "desktop" ? "" : `<button class="reset-button" type="button" data-reset-breakpoint="true">Reset</button>`;
  const bannerTitle = state.activeDevice === "desktop" ? "Base" : (custom ? "Custom" : "Auto");

  let markup = `<div class="inspector-section selected-section">
    <div class="selected-heading">
      <span class="selected-type-icon">${iconSvg(node.type)}</span>
      <div class="selected-name"><input type="text" value="${escapeAttr(node.name)}" maxlength="48" data-node-name="true" aria-label="Layer name" /><small>${TYPE_LABELS[node.type]}</small></div>
    </div>
  </div>
  <div class="inspector-section breakpoint-section">
    <div class="breakpoint-banner"><strong>${device.label}</strong><span class="breakpoint-state">${bannerTitle}</span>${resetButton}</div>
  </div>
  <div class="inspector-section design-inspector-section">
    <div class="design-group-heading">Position</div>
    <div class="design-subheading">Alignment</div>
    <div class="alignment-grid">
      ${alignmentButton("x", "start", "align-left", "Align left")}
      ${alignmentButton("x", "center", "align-center", "Align horizontal center")}
      ${alignmentButton("x", "end", "align-right", "Align right")}
      ${alignmentButton("y", "start", "align-top", "Align top")}
      ${alignmentButton("y", "center", "align-middle", "Align vertical center")}
      ${alignmentButton("y", "end", "align-bottom", "Align bottom")}
    </div>
    <div class="design-subheading">Position</div>
    <div class="compact-field-row">
      ${compactNumberField("X", "x", props.x, -2000, 2000)}
      ${compactNumberField("Y", "y", props.y, -2000, 3000)}
    </div>
    <div class="design-subheading">Rotation</div>
    <div class="rotation-row">
      ${compactNumberField("↻", "rotation", props.rotation, -360, 360, "1", "°")}
      <div class="rotation-actions">
        ${transformButton("rotate", "rotate", "Rotate 90 degrees")}
        ${transformButton("flip-horizontal", "flip-horizontal", "Flip horizontal")}
        ${transformButton("flip-vertical", "flip-vertical", "Flip vertical")}
      </div>
    </div>
  </div>
  <div class="inspector-section design-inspector-section">
    <div class="design-group-heading">Layout</div>
    <div class="design-subheading">Dimensions</div>
    <div class="compact-field-row">
      ${compactNumberField("W", "width", props.width, 1, 3000)}
      ${compactNumberField("H", "height", props.height, 1, 3000)}
    </div>
    <div class="design-subheading">Responsive behavior</div>
    <div class="field-grid">
      ${selectField("Mode", "responsiveBehavior", props.responsiveBehavior || "scale", [{value:"scale",label:"Scale with viewport"},{value:"left",label:"Keep left aligned"},{value:"right",label:"Keep right aligned"},{value:"center",label:"Keep centered"},{value:"stretch",label:"Stretch to edges"}], "field-full")}
      ${parentField(node)}
    </div>
  </div>`;

  if (node.type === "text" || node.type === "button") {
    markup += `<div class="inspector-section">
      <div class="inspector-section-title"><span>Content</span></div>
      <textarea class="field-input textarea-field" data-node-content="true" aria-label="Text content">${escapeHtml(node.content)}</textarea>
      <div class="field-grid" style="margin-top:10px">
        ${numberField("Font size", "fontSize", props.fontSize, 1, 240)}
        ${selectField("Weight", "fontWeight", String(props.fontWeight || 500), [{value:"400",label:"Regular"},{value:"500",label:"Medium"},{value:"600",label:"Semibold"},{value:"700",label:"Bold"},{value:"750",label:"Heavy"}], "")}
        ${numberField("Line height", "lineHeight", props.lineHeight, 0.1, 4, "0.1")}
        ${numberField("Letter spacing", "letterSpacing", props.letterSpacing, -10, 20, "0.1")}
        ${selectField("Align", "textAlign", props.textAlign || "left", [{value:"left",label:"Left"},{value:"center",label:"Center"},{value:"right",label:"Right"}], "")}
        ${selectField("Vertical", "verticalAlign", props.verticalAlign || "top", [{value:"top",label:"Top"},{value:"center",label:"Center"},{value:"bottom",label:"Bottom"}], "")}
      </div>
    </div>`;
  }

  if (node.type === "image") {
    markup += `<div class="inspector-section">
      <div class="inspector-section-title"><span>Image</span></div>
      <button class="button button-quiet image-replace-button" type="button" data-replace-image="true">${node.src ? "Replace image" : "Choose image"}</button>
      ${node.assetName ? `<div class="asset-name">${escapeHtml(node.assetName)}</div>` : ""}
      <div class="field-grid" style="margin-top:10px">
        ${selectField("Fit", "objectFit", props.objectFit || "cover", [{value:"cover",label:"Cover"},{value:"contain",label:"Contain"},{value:"fill",label:"Fill"},{value:"none",label:"Original size"}], "")}
        ${selectField("Position", "objectPosition", props.objectPosition || "center", [{value:"center",label:"Center"},{value:"top",label:"Top"},{value:"bottom",label:"Bottom"},{value:"left",label:"Left"},{value:"right",label:"Right"}], "")}
        ${textField("Alt text", "alt", node.alt || "", "field-full")}
      </div>
    </div>`;
  }

  if (node.type !== "text" && node.type !== "image") {
    markup += `<div class="inspector-section">
      <div class="inspector-section-title"><span>Fill & border</span></div>
      <div class="field-grid">
        ${colorField("Fill", "fill", props.fill || "#252832")}
        ${colorField("Border", "borderColor", props.borderColor || "#353946")}
        ${numberField("Border width", "borderWidth", props.borderWidth, 0, 20)}
        ${numberField("Radius", "radius", props.radius, 0, 200)}
      </div>
    </div>`;
  } else if (node.type === "image") {
    markup += `<div class="inspector-section">
      <div class="inspector-section-title"><span>Frame</span></div>
      <div class="field-grid">
        ${colorField("Fallback fill", "fill", props.fill || "#1c1f27")}
        ${colorField("Border", "borderColor", props.borderColor || "#353946")}
        ${numberField("Border width", "borderWidth", props.borderWidth, 0, 20)}
        ${numberField("Radius", "radius", props.radius, 0, 200)}
      </div>
    </div>`;
  }

  if (node.type === "text") {
    markup += `<div class="inspector-section">
      <div class="inspector-section-title"><span>Color</span></div>
      <div class="field-grid">${colorField("Text color", "color", props.color || "#f2f3f7")}</div>
    </div>`;
  }

  if (node.type === "button") {
    markup += `<div class="inspector-section">
      <div class="inspector-section-title"><span>Appearance</span></div>
      <div class="field-grid">${colorField("Text color", "color", props.color || "#f8fbff")}</div>
    </div>`;
  }

  markup += `<div class="inspector-section">
    <div class="inspector-section-title"><span>Layer</span></div>
    <div class="toggle-row"><span>Visible on canvas</span><label class="switch"><input type="checkbox" data-node-visible="true" ${node.visible ? "checked" : ""} /><span class="switch-track"></span></label></div>
    <div class="toggle-row"><span>Lock position</span><label class="switch"><input type="checkbox" data-node-locked="true" ${node.locked ? "checked" : ""} /><span class="switch-track"></span></label></div>
  </div>`;

  refs.inspectorContent.innerHTML = markup;
  bindNodeInspector(node);
}

function pageInspectorMarkup() {
  const page = state.project.page;
  const preset = getActivePreset();
  const size = getPageSize(state.activeDevice);
  const customSize = state.activeDevice !== "desktop" && page.responsive && page.responsive[state.activeDevice];
  return `<div class="inspector-empty compact-empty"><strong>Website frame</strong></div>
  <div class="page-settings-card">
    <div class="inspector-section-title"><span>${escapeHtml(page.name)}</span><span class="minor">root frame</span></div>
    <div class="field-grid">
      ${pageNumberField("Width", "width", size.width, 240, 4000)}
      ${pageNumberField("Height", "height", size.height, 200, 5000)}
      ${colorField("Page background", "background", page.background || "#101114", true)}
    </div>
    <div class="page-info-row"><span>Viewport</span><strong>${preset.label}${preset.fluid ? " · fluid" : ""}</strong></div>
    <div class="page-info-row"><span>${customSize ? "Custom frame" : "Reference frame"}</span><strong>${size.width} × ${size.height}</strong></div>
  </div>`;
}

function alignNode(node, axis, alignment) {
  const props = getNodeProps(node);
  const container = getContainerProps(node, state.activeDevice);
  const patch = {};
  if (axis === "x") {
    patch.x = alignment === "start" ? 0 : alignment === "center" ? Math.round((container.width - props.width) / 2) : Math.round(container.width - props.width);
  } else {
    patch.y = alignment === "start" ? 0 : alignment === "center" ? Math.round((container.height - props.height) / 2) : Math.round(container.height - props.height);
  }
  setNodeProps(node, patch);
}

function transformNode(node, action) {
  const props = getNodeProps(node);
  if (action === "rotate") {
    setNodeProps(node, { rotation: ((num(props.rotation) + 90 + 360) % 360) });
  } else if (action === "flip-horizontal") {
    setNodeProps(node, { flipX: !props.flipX });
  } else if (action === "flip-vertical") {
    setNodeProps(node, { flipY: !props.flipY });
  }
}

function bindNodeInspector(node) {
  refs.inspectorContent.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("change", () => {
      const key = field.dataset.field;
      const value = readFieldValue(field);
      applyChange(() => {
        if (key === "alt") {
          node.alt = String(value);
        } else {
          setNodeProps(node, { [key]: value });
        }
      });
    });
  });

  refs.inspectorContent.querySelectorAll("[data-scrub-key]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => startScrub(event, node, handle.dataset.scrubKey));
  });

  refs.inspectorContent.querySelectorAll("[data-align-axis]").forEach((button) => {
    button.addEventListener("click", () => {
      applyChange(() => alignNode(node, button.dataset.alignAxis, button.dataset.alignValue));
    });
  });

  refs.inspectorContent.querySelectorAll("[data-transform]").forEach((button) => {
    button.addEventListener("click", () => {
      applyChange(() => transformNode(node, button.dataset.transform));
    });
  });

  const parentSelect = refs.inspectorContent.querySelector("[data-parent-id]");
  if (parentSelect) {
    parentSelect.addEventListener("change", () => {
      const nextParentId = parentSelect.value || null;
      applyChange(() => reparentNodePreservingPosition(node, nextParentId));
    });
  }

  const contentField = refs.inspectorContent.querySelector("[data-node-content]");
  if (contentField) {
    contentField.addEventListener("change", () => {
      applyChange(() => { node.content = contentField.value; });
    });
  }

  const nameField = refs.inspectorContent.querySelector("[data-node-name]");
  if (nameField) {
    nameField.addEventListener("change", () => {
      const name = nameField.value.trim() || TYPE_LABELS[node.type];
      applyChange(() => { node.name = name; });
    });
  }

  const visibility = refs.inspectorContent.querySelector("[data-node-visible]");
  if (visibility) {
    visibility.addEventListener("change", () => {
      applyChange(() => { node.visible = visibility.checked; });
    });
  }

  const locked = refs.inspectorContent.querySelector("[data-node-locked]");
  if (locked) {
    locked.addEventListener("change", () => {
      applyChange(() => { node.locked = locked.checked; });
    });
  }

  const reset = refs.inspectorContent.querySelector("[data-reset-breakpoint]");
  if (reset) {
    reset.addEventListener("click", () => {
      applyChange(() => clearBreakpointOverride(node));
      showToast(`${PRESETS[state.activeDevice].label} returned to auto layout`, "success");
    });
  }

  const deleteButton = refs.inspectorContent.querySelector("[data-delete-node]");
  if (deleteButton) {
    deleteButton.addEventListener("click", deleteSelected);
  }

  const replaceImage = refs.inspectorContent.querySelector("[data-replace-image]");
  if (replaceImage) {
    replaceImage.addEventListener("click", () => {
      refs.imageInput.dataset.replaceId = node.id;
      refs.imageInput.click();
    });
  }
}

function bindPageInspector() {
  refs.inspectorContent.querySelectorAll("[data-page-field]").forEach((field) => {
    field.addEventListener("change", () => {
      const key = field.dataset.pageField;
      const value = readFieldValue(field);
      applyChange(() => {
        if (key === "width" || key === "height") setPageSize(key, value);
        else state.project.page[key] = value;
      });
    });
  });
}

function numberField(label, key, value, min = -9999, max = 9999, step = "1") {
  return `<label class="field"><span class="field-label">${label}</span><input class="field-input" type="number" data-field="${key}" data-value-type="number" value="${escapeAttr(numberInputValue(value))}" min="${min}" max="${max}" step="${step}" /></label>`;
}

function compactNumberField(label, key, value, min = -9999, max = 9999, step = "1", suffix = "") {
  const leading = key === "rotation" ? `<span class="compact-field-icon" data-scrub-key="${key}">${iconSvg("rotate")}</span>` : `<span class="compact-field-label" data-scrub-key="${key}">${label}</span>`;
  return `<label class="compact-number-field">${leading}<input type="number" data-field="${key}" data-value-type="number" value="${escapeAttr(numberInputValue(value))}" min="${min}" max="${max}" step="${step}" aria-label="${escapeAttr(label || key)}" />${suffix ? `<span class="compact-field-suffix">${suffix}</span>` : ""}</label>`;
}

function alignmentButton(axis, alignment, icon, label) {
  return `<button class="alignment-button" type="button" data-align-axis="${axis}" data-align-value="${alignment}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">${iconSvg(icon)}</button>`;
}

function transformButton(action, icon, label) {
  return `<button class="rotation-action" type="button" data-transform="${action}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}">${iconSvg(icon)}</button>`;
}

function pageNumberField(label, key, value, min = 0, max = 9999, step = "1") {
  return `<label class="field"><span class="field-label">${label}</span><input class="field-input" type="number" data-page-field="${key}" data-value-type="number" value="${escapeAttr(numberInputValue(value))}" min="${min}" max="${max}" step="${step}" /></label>`;
}

function textField(label, key, value, extraClass = "") {
  return `<label class="field ${extraClass}"><span class="field-label">${label}</span><input class="field-input" type="text" data-field="${key}" data-value-type="string" value="${escapeAttr(value)}" /></label>`;
}

function selectField(label, key, value, options, extraClass = "") {
  return `<label class="field ${extraClass}"><span class="field-label">${label}</span><select class="field-select" data-field="${key}" data-value-type="string">${options.map((option) => `<option value="${escapeAttr(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;
}

function parentField(node) {
  if (node.type === "section") {
    return "";
  }
  const options = ['<option value="">Page (no frame)</option>'];
  state.project.nodes.filter((candidate) => candidate.type === "section" && candidate.id !== node.id && !isDescendant(candidate.id, node.id)).forEach((candidate) => {
    options.push(`<option value="${escapeAttr(candidate.id)}" ${candidate.id === node.parentId ? "selected" : ""}>${escapeHtml(candidate.name)}</option>`);
  });
  return `<label class="field field-full"><span class="field-label">Parent frame</span><select class="field-select" data-parent-id="true">${options.join("")}</select></label>`;
}

function colorField(label, key, value, pageField = false) {
  const safeValue = colorValue(value);
  const attr = pageField ? `data-page-field="${key}"` : `data-field="${key}"`;
  return `<label class="field"><span class="field-label">${label}</span><span class="color-field"><input class="field-input" type="color" ${attr} data-value-type="string" value="${safeValue}" /><input class="field-input color-hex" type="text" ${attr} data-value-type="string" value="${escapeAttr(value)}" /></span></label>`;
}

function readFieldValue(field) {
  if (field.dataset.valueType === "number") {
    const parsed = Number(field.value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return field.value;
}

function numberInputValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toFixed(3))) : "0";
}

function colorValue(value) {
  const string = String(value || "#101114");
  return /^#[0-9a-fA-F]{6}$/.test(string) ? string : "#101114";
}

function iconSvg(type) {
  const iconName = ICON_ALIASES[type] || type;
  const path = LUCIDE_PATHS[iconName] || LUCIDE_PATHS.square;
  return `<svg class="lucide-icon" viewBox="0 0 24 24" aria-hidden="true" stroke-width="1.8">${path}</svg>`;
}

function hydrateLucideIcons() {
  document.querySelectorAll("[data-lucide]").forEach((placeholder) => {
    const path = LUCIDE_PATHS[placeholder.dataset.lucide] || LUCIDE_PATHS.square;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "lucide-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("stroke-width", "1.8");
    svg.innerHTML = path;
    placeholder.replaceWith(svg);
  });
}

function selectNode(id) {
  state.selectedId = id;
  renderAll();
}

function getInsertionParent() {
  const selected = getNode(state.selectedId);
  if (!selected) return null;
  if (selected.type === "section") return selected;
  return selected.parentId ? getNode(selected.parentId) : null;
}

function addElement(type) {
  if (type === "image") {
    delete refs.imageInput.dataset.replaceId;
    refs.imageInput.click();
    return;
  }

  const preset = getActivePreset();
  const count = state.project.nodes.length;
  const parent = getInsertionParent();
  const defaults = {
    text: { x: 80, y: 130 + count * 14, width: 280, height: 72, fontSize: 24 },
    shape: { x: 80, y: 130 + count * 14, width: 240, height: 120 },
    section: { x: 64, y: 120 + count * 12, width: 720, height: 280 },
    button: { x: 80, y: 130 + count * 14, width: 148, height: 44 },
  }[type];

  if (parent) {
    const frameProps = getNodeProps(parent);
    defaults.x = 16;
    defaults.y = 16;
    defaults.width = Math.min(defaults.width, Math.max(20, frameProps.width - 32));
    defaults.height = Math.min(defaults.height, Math.max(20, frameProps.height - 32));
  }

  const node = makeNode(type, `New ${TYPE_LABELS[type]}`, defaults, {
    parentId: parent ? parent.id : null,
    content: type === "text" ? "Your text" : type === "button" ? "Button" : "",
  });

  if (state.activeDevice !== "desktop") {
    const localWidth = parent ? getNodeProps(parent).width : preset.width;
    const ratio = parent ? 1 : preset.width / PRESETS.desktop.width;
    node.responsive[state.activeDevice] = {
      x: parent ? defaults.x : Math.max(24, Math.round(defaults.x * ratio)),
      y: defaults.y,
      width: Math.min(defaults.width, Math.max(20, localWidth - (parent ? 32 : 48))),
      height: defaults.height,
    };
  }

  applyChange(() => {
    state.project.nodes.push(node);
    state.selectedId = node.id;
  });
  showToast(`${TYPE_LABELS[type]} added to canvas${parent ? ` inside ${parent.name}` : ""}`, "success");
}

function handleImageFile(file, replaceId = null) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("Please choose an image file", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result);
    if (replaceId) {
      const node = getNode(replaceId);
      if (!node) return;
      applyChange(() => {
        node.src = src;
        node.assetName = safeAssetName(file.name, node.id);
        node.alt = node.alt || file.name.replace(/\.[^/.]+$/, "");
      });
      state.selectedId = replaceId;
      renderAll();
      showToast("Image replaced", "success");
      return;
    }

    const preset = getActivePreset();
    const parent = getInsertionParent();
    const imageBase = {
      x: state.activeDevice === "mobile" ? 24 : 100,
      y: state.activeDevice === "mobile" ? 160 : 150 + state.project.nodes.length * 10,
      width: state.activeDevice === "mobile" ? preset.width - 48 : 360,
      height: state.activeDevice === "mobile" ? 220 : 240,
      responsiveBehavior: "scale",
    };
    if (parent) {
      const frameProps = getNodeProps(parent);
      imageBase.x = 16;
      imageBase.y = 16;
      imageBase.width = Math.min(imageBase.width, Math.max(20, frameProps.width - 32));
      imageBase.height = Math.min(imageBase.height, Math.max(20, frameProps.height - 32));
    }
    const node = makeNode("image", file.name.replace(/\.[^/.]+$/, "") || "Image", imageBase, {
      parentId: parent ? parent.id : null,
      content: "",
      src,
      assetName: safeAssetName(file.name),
      alt: file.name.replace(/\.[^/.]+$/, ""),
    });
    if (state.activeDevice !== "desktop") {
      node.responsive[state.activeDevice] = {
        x: imageBase.x,
        y: imageBase.y,
        width: imageBase.width,
        height: imageBase.height,
      };
    }
    applyChange(() => {
      state.project.nodes.push(node);
      state.selectedId = node.id;
    });
    showToast("Image added to canvas", "success");
  };
  reader.onerror = () => showToast("Could not read that image", "error");
  reader.readAsDataURL(file);
}

function safeAssetName(name, id = "") {
  const clean = String(name || "image.png").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image.png";
  return id ? `${clean.replace(/(\.[^.]*)?$/, "")}-${id.slice(-5)}${clean.match(/\.[^./]+$/) ? clean.match(/\.[^./]+$/)[0] : ".png"}` : clean;
}

function deleteSelected() {
  const node = getNode(state.selectedId);
  if (!node) return;
  applyChange(() => {
    if (node.type === "section") {
      // Do not strand frame contents at their old local coordinates.
      state.project.nodes.filter((item) => item.parentId === node.id).forEach((child) => {
        const positions = {};
        ["desktop", "tablet", "mobile"].forEach((device) => {
          const global = getAbsoluteProps(child, device);
          positions[device] = { x: global.x, y: global.y };
        });
        child.parentId = null;
        ["desktop", "tablet", "mobile"].forEach((device) => setNodeProps(child, positions[device], device));
      });
    }
    state.project.nodes = state.project.nodes.filter((item) => item.id !== node.id);
    state.selectedId = null;
  });
  showToast(`${node.name} deleted`, "success");
}

function startScrub(event, node, key) {
  const field = event.currentTarget.parentElement?.querySelector(`[data-field="${key}"]`);
  if (!field) return;
  state.interaction = {
    type: "scrub",
    id: node.id,
    key,
    startX: event.clientX,
    startValue: num(field.value, num(getNodeProps(node)[key])),
    min: Number(field.min),
    max: Number(field.max),
    step: Number(field.step) || 1,
    before: serializeProject(),
  };
  document.body.classList.add("is-scrubbing");
  window.addEventListener("pointermove", onInteractionMove);
  window.addEventListener("pointerup", endInteraction, { once: true });
  event.preventDefault();
  event.stopPropagation();
}

function startDrag(event, id) {
  const node = getNode(id);
  if (!node || node.locked) return;
  const props = getNodeProps(node);
  state.interaction = {
    type: "drag",
    id,
    startX: event.clientX,
    startY: event.clientY,
    origin: { x: num(props.x), y: num(props.y) },
    before: serializeProject(),
  };
  window.addEventListener("pointermove", onInteractionMove);
  window.addEventListener("pointerup", endInteraction, { once: true });
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function startResize(event, id, direction) {
  const node = getNode(id);
  if (!node || node.locked) return;
  const props = getNodeProps(node);
  state.interaction = {
    type: "resize",
    id,
    direction,
    startX: event.clientX,
    startY: event.clientY,
    origin: { x: num(props.x), y: num(props.y), width: num(props.width), height: num(props.height) },
    before: serializeProject(),
  };
  window.addEventListener("pointermove", onInteractionMove);
  window.addEventListener("pointerup", endInteraction, { once: true });
  event.preventDefault();
  event.stopPropagation();
}

function startPan(event) {
  state.interaction = {
    type: "pan",
    startX: event.clientX,
    startY: event.clientY,
    originPanX: state.panX,
    originPanY: state.panY,
  };
  window.addEventListener("pointermove", onInteractionMove);
  window.addEventListener("pointerup", endInteraction, { once: true });
  event.preventDefault();
}

function startPageResize(event) {
  const size = getPageSize(state.activeDevice);
  state.interaction = {
    type: "page-resize",
    startY: event.clientY,
    originHeight: size.height,
    originTop: refs.artboardWrap.getBoundingClientRect().top,
    scale: state.computedZoom,
    before: serializeProject(),
  };
  window.addEventListener("pointermove", onInteractionMove);
  window.addEventListener("pointerup", endInteraction, { once: true });
  event.preventDefault();
  event.stopPropagation();
}

function onInteractionMove(event) {
  const interaction = state.interaction;
  if (!interaction) return;

  if (interaction.type === "pan") {
    state.panX = interaction.originPanX + (event.clientX - interaction.startX);
    state.panY = interaction.originPanY + (event.clientY - interaction.startY);
    renderCanvas();
    return;
  }

  if (interaction.type === "page-resize") {
    const delta = (event.clientY - interaction.startY) / interaction.scale;
    setPageSize("height", interaction.originHeight + delta);
    renderCanvas();
    // The canvas is centered for navigation. Compensate for that centering so
    // resizing from the bottom keeps the top edge fixed like a design frame.
    const nextTop = refs.artboardWrap.getBoundingClientRect().top;
    state.panY += interaction.originTop - nextTop;
    renderCanvas();
    return;
  }

  if (interaction.type === "scrub") {
    const node = getNode(interaction.id);
    if (!node) return;
    const raw = interaction.startValue + ((event.clientX - interaction.startX) * interaction.step);
    const bounded = Math.max(interaction.min, Math.min(interaction.max, raw));
    const value = interaction.step < 1 ? Number(bounded.toFixed(2)) : Math.round(bounded);
    setNodeProps(node, { [interaction.key]: value });
    const field = refs.inspectorContent.querySelector(`[data-field="${interaction.key}"]`);
    if (field) field.value = numberInputValue(value);
    renderCanvas();
    return;
  }

  const node = getNode(interaction.id);
  if (!node) return;
  const dx = (event.clientX - interaction.startX) / state.computedZoom;
  const dy = (event.clientY - interaction.startY) / state.computedZoom;

  if (interaction.type === "drag") {
    setNodeProps(node, {
      x: Math.round(interaction.origin.x + dx),
      y: Math.round(interaction.origin.y + dy),
    });
  } else if (interaction.type === "resize") {
    const next = resizedProps(interaction.origin, interaction.direction, dx, dy, event.shiftKey);
    setNodeProps(node, next);
  }
  renderCanvas();
}

function resizedProps(origin, direction, dx, dy, preserveRatio) {
  let x = origin.x;
  let y = origin.y;
  let width = origin.width;
  let height = origin.height;
  const minWidth = 20;
  const minHeight = 20;

  if (direction.includes("e")) width = origin.width + dx;
  if (direction.includes("s")) height = origin.height + dy;
  if (direction.includes("w")) { width = origin.width - dx; x = origin.x + dx; }
  if (direction.includes("n")) { height = origin.height - dy; y = origin.y + dy; }

  if (preserveRatio && origin.width && origin.height) {
    const ratio = origin.width / origin.height;
    if (Math.abs(dx) >= Math.abs(dy)) {
      height = width / ratio;
      if (direction.includes("n")) y = origin.y + origin.height - height;
    } else {
      width = height * ratio;
      if (direction.includes("w")) x = origin.x + origin.width - width;
    }
  }

  if (width < minWidth) {
    if (direction.includes("w")) x -= minWidth - width;
    width = minWidth;
  }
  if (height < minHeight) {
    if (direction.includes("n")) y -= minHeight - height;
    height = minHeight;
  }

  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function frameAtPoint(x, y, excludedId = null) {
  const candidates = state.project.nodes.filter((node) => {
    if (node.type !== "section" || !node.visible || node.id === excludedId) return false;
    if (excludedId && isDescendant(node.id, excludedId)) return false;
    const props = getAbsoluteProps(node);
    return x >= props.x && x <= props.x + props.width && y >= props.y && y <= props.y + props.height;
  });
  candidates.sort((first, second) => {
    const firstProps = getAbsoluteProps(first);
    const secondProps = getAbsoluteProps(second);
    return (firstProps.width * firstProps.height) - (secondProps.width * secondProps.height);
  });
  return candidates[0] || null;
}

function reparentNodePreservingPosition(node, parentId, device = state.activeDevice) {
  const global = getAbsoluteProps(node, device);
  const parent = parentId ? getNode(parentId) : null;
  const parentGlobal = parent ? getAbsoluteProps(parent, device) : { x: 0, y: 0 };
  const parentLocal = parent ? getNodeProps(parent, device) : { borderWidth: 0 };
  const border = Math.max(0, num(parentLocal.borderWidth));
  node.parentId = parent ? parent.id : null;
  setNodeProps(node, {
    x: Math.round(global.x - num(parentGlobal.x) - border),
    y: Math.round(global.y - num(parentGlobal.y) - border),
  }, device);
}

function maybeReparentAfterDrop(node) {
  if (!node || node.type === "section") return;
  const global = getAbsoluteProps(node);
  const centerX = global.x + (global.width / 2);
  const centerY = global.y + (global.height / 2);
  const frame = frameAtPoint(centerX, centerY, node.id);
  const nextParentId = frame ? frame.id : null;
  if (nextParentId === (node.parentId || null)) return;
  reparentNodePreservingPosition(node, nextParentId);
}

function endInteraction() {
  window.removeEventListener("pointermove", onInteractionMove);
  const interaction = state.interaction;
  state.interaction = null;
  document.body.classList.remove("is-scrubbing");
  if (!interaction || interaction.type === "pan") return;
  if (interaction.type === "drag") maybeReparentAfterDrop(getNode(interaction.id));
  const changed = recordHistory(interaction.before);
  if (changed) {
    renderAll();
    schedulePersist();
  } else {
    renderCanvas();
  }
}

function handleCanvasPointerDown(event) {
  if (event.button === 1 || state.spaceDown || state.activeTool === "pan") {
    startPan(event);
    return;
  }
  if (event.button !== 0) return;
  const resizeHandle = event.target.closest("[data-resize]");
  if (resizeHandle) {
    const selection = event.target.closest("[data-selection]");
    if (selection) startResize(event, selection.dataset.selection, resizeHandle.dataset.resize);
    return;
  }
  const nodeElement = event.target.closest(".vb-node");
  if (!nodeElement) {
    state.selectedId = null;
    renderAll();
    return;
  }
  const id = nodeElement.dataset.id;
  if (state.selectedId !== id) {
    state.selectedId = id;
    renderAll();
  }
  startDrag(event, id);
}

function moveSelected(dx, dy) {
  const node = getNode(state.selectedId);
  if (!node || node.locked) return;
  const props = getNodeProps(node);
  applyChange(() => setNodeProps(node, { x: Math.round(num(props.x) + dx), y: Math.round(num(props.y) + dy) }));
}

function openCodeModal() {
  state.codeFile = "index.html";
  document.querySelectorAll("[data-file]").forEach((tab) => tab.classList.toggle("active", tab.dataset.file === state.codeFile));
  updateCodeOutput();
  openModal(refs.codeModal);
}

function updateCodeOutput() {
  const files = generateFiles(false);
  refs.codeOutput.value = files[state.codeFile] || "";
}

function openPreviewModal() {
  const files = generateFiles(true);
  refs.previewFrame.srcdoc = files["index.html"];
  refs.previewDeviceLabel.textContent = PRESETS[state.activeDevice].label;
  const size = getPageSize(state.activeDevice);
  // Keep the iframe at the selected canvas width so the same media query is used
  // in the generated preview (desktop should not accidentally become tablet).
  refs.previewFrame.style.width = `${size.width}px`;
  refs.previewFrame.style.height = `${Math.min(size.height, 620)}px`;
  openModal(refs.previewModal);
}

function openModal(modal) {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  if (modal === refs.previewModal) refs.previewFrame.srcdoc = "";
}

function generateFiles(inlineAssets = false) {
  const assets = collectAssets();
  return {
    "index.html": generateHtml(inlineAssets, assets),
    "styles.css": generateCss(),
    "script.js": generateScript(),
    __assets: assets,
  };
}

function generateHtml(inlineAssets, assets) {
  const title = escapeHtml(state.project.name || "VBuilder site");
  const page = state.project.page;
  const assetMap = new Map(assets.map((asset) => [asset.nodeId, asset.name]));
  const nodes = state.project.nodes
    .filter((node) => node.visible && (!node.parentId || !getNode(node.parentId)))
    .map((node) => generateNodeMarkup(node, inlineAssets, assetMap))
    .join("\n    ");
  const css = generateCss();
  const script = generateScript();
  if (inlineAssets) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>\n${css}\n  </style>
</head>
<body>
  <main class="vb-page">
    ${nodes}
  </main>
  <script>\n${script}\n  <\/script>
</body>
</html>`;
  }
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="vb-page">
    ${nodes}
  </main>
  <script src="script.js"></script>
</body>
</html>`;
}

function generateNodeMarkup(node, inlineAssets = false, assetMap = new Map()) {
  const className = `vb-node-${safeClass(node.id)}`;
  if (node.type === "text") {
    return `<div class="${className}">${escapeHtml(node.content).replace(/\n/g, "<br>")}</div>`;
  }
  if (node.type === "button") {
    return `<button class="${className}" type="button">${escapeHtml(node.content || "Button")}</button>`;
  }
  if (node.type === "image") {
    if (!node.src) return `<div class="${className}"></div>`;
    const src = inlineAssets ? node.src : `assets/${assetMap.get(node.id) || assetFileName(node)}`;
    return `<img class="${className}" src="${escapeAttr(src)}" alt="${escapeAttr(node.alt || "")}">`;
  }
  if (node.type === "section") {
    const children = state.project.nodes
      .filter((child) => child.visible && child.parentId === node.id)
      .map((child) => generateNodeMarkup(child, inlineAssets, assetMap))
      .join("\n      ");
    return `<div class="${className}">${children ? `\n      ${children}\n    ` : ""}</div>`;
  }
  return `<div class="${className}"></div>`;
}

function generateCss() {
  const page = state.project.page;
  const desktop = getPageSize("desktop");
  const lines = [
    "/* Generated by VBuilder — desktop is fluid; 1440 × 900 is the reference frame. */",
    "* { box-sizing: border-box; }",
    "html, body { margin: 0; min-height: 100%; }",
    `body { background: ${page.background || "#101114"}; color: #f2f3f7; font-family: Inter, sans-serif; }`,
    `.vb-page { position: relative; width: 100%; max-width: none; height: auto; aspect-ratio: ${desktop.width} / ${desktop.height}; margin: 0; overflow: hidden; container-type: inline-size; background: ${page.background || "#101114"}; }`,
  ];

  state.project.nodes.forEach((node) => {
    if (!node.visible) return;
    lines.push(`\n.${safeClass(`vb-node-${node.id}`)} {`);
    lines.push(...nodeCssLines(node, "desktop").map((line) => `  ${line}`));
    lines.push("}");
  });

  ["tablet", "mobile"].forEach((device) => {
    const preset = PRESETS[device];
    const size = getPageSize(device);
    lines.push(`\n@media (max-width: ${preset.media}px) {`);
    lines.push(`  .vb-page { height: auto; min-height: 0; aspect-ratio: ${size.width} / ${size.height}; }`);
    state.project.nodes.forEach((node) => {
      if (!node.visible) return;
      lines.push(`  .${safeClass(`vb-node-${node.id}`)} {`);
      lines.push(...nodeCssLines(node, device).map((line) => `    ${line}`));
      lines.push("  }");
    });
    lines.push("}");
  });

  return lines.join("\n");
}

function percent(value, total) {
  return `${((num(value) / total) * 100).toFixed(4)}%`;
}

function fluidSize(value, containerWidth) {
  return `calc(${((num(value) / containerWidth) * 100).toFixed(5)}cqw)`;
}

function horizontalCssLines(node, props, device) {
  const container = getContainerProps(node, device);
  const behavior = props.responsiveBehavior || node.base.responsiveBehavior || "scale";
  const rightSpace = container.width - num(props.x) - num(props.width);
  const touchesRightEdge = rightSpace <= 2;

  if (behavior === "stretch") {
    return [`left: ${percent(props.x, container.width)};`, `right: ${percent(rightSpace, container.width)};`, "width: auto;"];
  }
  if (behavior === "right" || touchesRightEdge) {
    return [`right: ${percent(rightSpace, container.width)};`, `width: ${percent(props.width, container.width)};`];
  }
  if (behavior === "center") {
    return ["left: 50%;", `margin-left: ${percent(-num(props.width) / 2, container.width)};`, `width: ${percent(props.width, container.width)};`];
  }
  return [`left: ${percent(props.x, container.width)};`, `width: ${percent(props.width, container.width)};`];
}

function nodeCssLines(node, device) {
  const props = getRenderProps(node, device);
  const container = getContainerProps(node, device);
  const lines = [
    "position: absolute;",
    ...horizontalCssLines(node, props, device),
    `top: ${percent(props.y, container.height)};`,
    `height: ${percent(props.height, container.height)};`,
    `z-index: ${state.project.nodes.indexOf(node) + 1};`,
    `opacity: ${Math.max(0, Math.min(100, num(props.opacity, 100))) / 100};`,
    `border-radius: ${fluidSize(Math.max(0, num(props.radius)), container.width)};`,
    num(props.borderWidth) > 0 ? `border: ${num(props.borderWidth)}px solid ${props.borderColor || "transparent"};` : "border: 0 solid transparent;",
    (num(props.rotation) || props.flipX || props.flipY) ? `transform: rotate(${num(props.rotation)}deg) scaleX(${props.flipX ? -1 : 1}) scaleY(${props.flipY ? -1 : 1});` : "",
  ].filter(Boolean);

  if (node.type === "text") {
    lines.push(
      `color: ${props.color || "#f2f3f7"};`,
      `font-family: Inter, sans-serif;`,
      `font-size: ${fluidSize(Math.max(1, num(props.fontSize, 16)), container.width)};`,
      `font-weight: ${props.fontWeight || 500};`,
      `line-height: ${props.lineHeight || 1.2};`,
      `letter-spacing: ${fluidSize(num(props.letterSpacing), container.width)};`,
      `text-align: ${props.textAlign || "left"};`,
      `padding: ${fluidSize(Math.max(0, num(props.padding)), container.width)};`,
      "display: flex;",
      "flex-direction: column;",
      `justify-content: ${verticalAlignValue(props.verticalAlign)};`,
      "overflow: hidden;",
      "white-space: pre-wrap;",
      "word-break: break-word;",
    );
  } else if (node.type === "button") {
    lines.push(
      `background: ${props.fill || "#3b82f6"};`,
      `color: ${props.color || "#f8fbff"};`,
      `font-family: Inter, sans-serif;`,
      `font-size: ${fluidSize(Math.max(1, num(props.fontSize, 13)), container.width)};`,
      `font-weight: ${props.fontWeight || 700};`,
      `line-height: ${props.lineHeight || 1.2};`,
      `text-align: ${props.textAlign || "center"};`,
      `padding: ${fluidSize(Math.max(0, num(props.padding, 8)), container.width)};`,
      "display: flex;",
      `align-items: ${verticalAlignValue(props.verticalAlign)};`,
      "justify-content: center;",
      "cursor: default;",
    );
  } else if (node.type === "image") {
    lines.push(
      "display: block;",
      `background: ${props.fill || "#1c1f27"};`,
      `object-fit: ${props.objectFit || "cover"};`,
      `object-position: ${props.objectPosition || "center"};`,
    );
  } else {
    lines.push(
      `background: ${props.fill || "transparent"};`,
      "overflow: hidden;",
    );
    if (node.type === "section") lines.push("container-type: inline-size;");
  }
  return lines;
}

function generateScript() {
  return `// Generated by VBuilder. Add your own interactions here.\n// Version 1 keeps buttons visual-only by design.\ndocument.documentElement.classList.add("vbuilder-ready");`;
}

function collectAssets() {
  const used = new Set();
  return state.project.nodes.filter((node) => node.type === "image" && node.src).map((node) => {
    let name = assetFileName(node);
    const original = name;
    let index = 2;
    while (used.has(name)) {
      const extension = original.match(/\.[^./]+$/)?.[0] || ".png";
      name = `${original.replace(/\.[^./]+$/, "")}-${index}${extension}`;
      index += 1;
    }
    used.add(name);
    return { name, src: node.src, nodeId: node.id };
  });
}

function assetFileName(node) {
  return safeAssetName(node.assetName || `${node.id}.png`);
}

function exportZip() {
  const files = generateFiles(false);
  const zipFiles = [
    { name: "index.html", data: files["index.html"] },
    { name: "styles.css", data: files["styles.css"] },
    { name: "script.js", data: files["script.js"] },
  ];
  (files.__assets || []).forEach((asset) => {
    zipFiles.push({ name: `assets/${asset.name}`, data: dataUrlToBytes(asset.src) });
  });
  const blob = makeZip(zipFiles);
  downloadBlob(blob, `${slugify(state.project.name) || "vbuilder-site"}.zip`);
  showToast("Website ZIP exported", "success");
}

function saveProject() {
  const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${slugify(state.project.name) || "vbuilder-project"}.vbuilder`);
  showToast("Editable project saved", "success");
}

function dataUrlToBytes(dataUrl) {
  const value = String(dataUrl || "");
  const comma = value.indexOf(",");
  if (comma === -1) return new TextEncoder().encode(value);
  const header = value.slice(0, comma);
  const body = value.slice(comma + 1);
  if (/;base64/i.test(header)) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const date = new Date();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data instanceof Uint8Array ? file.data : new TextEncoder().encode(String(file.data));
    const crc = crc32(data);
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data,
    ]);
    localParts.push(local);

    const central = concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]);
    centralParts.push(central);
    offset += local.length;
  });

  const centralData = concatBytes(centralParts);
  const localData = concatBytes(localParts);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(localData.length), u16(0),
  ]);
  return new Blob([localData, centralData, end], { type: "application/zip" });
}

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let c = index;
      for (let bit = 0; bit < 8; bit += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[index] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => { output.set(part, offset); offset += part.length; });
  return output;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeClass(value) {
  return String(value || "node").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function px(value) {
  return `${Math.round(num(value))}px`;
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function schedulePersist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(async () => {
    await persistProject();
  }, 260);
}

async function getDatabase() {
  if (!("indexedDB" in window)) throw new Error("IndexedDB unavailable");
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local storage"));
    });
  }
  return dbPromise;
}

async function persistProject() {
  try {
    const db = await getDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, "readwrite");
      transaction.objectStore(DB_STORE).put({ id: "current", project: deepClone(state.project) });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    try { localStorage.setItem(STORAGE_KEY, serializeProject()); } catch (_) { /* local-only fallback can be full */ }
  }
}

async function loadStoredProject() {
  try {
    const db = await getDatabase();
    const record = await new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (record && record.project) {
      state.project = normalizeProject(record.project);
      state.selectedId = state.project.nodes[0]?.id || null;
      resetHistory();
      renderAll();
      showToast("Restored your local project", "success");
      return;
    }
  } catch (_) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state.project = normalizeProject(JSON.parse(saved));
        state.selectedId = state.project.nodes[0]?.id || null;
        resetHistory();
        renderAll();
        showToast("Restored your local project", "success");
      }
    } catch (error) {
      console.warn("Could not restore local project", error);
    }
  }
}

function loadProjectFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || !Array.isArray(parsed.nodes)) throw new Error("Invalid project");
      state.project = normalizeProject(parsed);
      state.selectedId = state.project.nodes[0]?.id || null;
      resetHistory();
      renderAll();
      schedulePersist();
      showToast("Project opened", "success");
    } catch (error) {
      showToast("That project file could not be opened", "error");
    }
  };
  reader.onerror = () => showToast("Could not read that project", "error");
  reader.readAsText(file);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  refs.toastRegion.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(4px)";
    window.setTimeout(() => toast.remove(), 180);
  }, 2700);
}

let tooltipTimer = null;
let tooltipElement = null;
let tooltipTarget = null;

function prepareTooltip(element) {
  if (element.dataset.tooltip || !element.getAttribute("title")) return;
  element.dataset.tooltip = element.getAttribute("title");
  element.removeAttribute("title");
}

function hideTooltip() {
  window.clearTimeout(tooltipTimer);
  tooltipTarget = null;
  if (tooltipElement) tooltipElement.classList.remove("visible");
}

function showTooltip(element) {
  prepareTooltip(element);
  const text = element.dataset.tooltip;
  if (!text) return;
  tooltipTarget = element;
  window.clearTimeout(tooltipTimer);
  tooltipTimer = window.setTimeout(() => {
    if (!tooltipTarget) return;
    if (!tooltipElement) {
      tooltipElement = document.createElement("div");
      tooltipElement.className = "vbuilder-tooltip";
      document.body.appendChild(tooltipElement);
    }
    tooltipElement.textContent = text;
    tooltipElement.classList.add("visible");
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - tooltipRect.width - 8, rect.left + (rect.width / 2) - (tooltipRect.width / 2)));
    const top = rect.top >= tooltipRect.height + 10 ? rect.top - tooltipRect.height - 8 : rect.bottom + 8;
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
  }, 420);
}

function bindTooltips() {
  document.querySelectorAll("[title]").forEach(prepareTooltip);
  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest?.("[data-tooltip], [title]");
    if (!target || target === tooltipTarget || target.contains(event.relatedTarget)) return;
    showTooltip(target);
  });
  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest?.("[data-tooltip], [title]");
    if (target && !target.contains(event.relatedTarget)) hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest?.("[data-tooltip], [title]");
    if (target) showTooltip(target);
  });
  document.addEventListener("focusout", hideTooltip);
  window.addEventListener("scroll", hideTooltip, true);
}

function closeLayerContextMenu() {
  state.contextNodeId = null;
  refs.layerContextMenu.classList.add("hidden");
}

function openLayerContextMenu(event, id) {
  if (!id) {
    closeLayerContextMenu();
    return;
  }
  const node = getNode(id);
  if (!node) return;
  event.preventDefault();
  state.selectedId = id;
  state.contextNodeId = id;
  renderAll();
  refs.moveToPageAction.hidden = !node.parentId;
  refs.layerContextMenu.classList.remove("hidden");
  const menuWidth = 150;
  const menuHeight = refs.layerContextMenu.offsetHeight || 140;
  refs.layerContextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - menuWidth - 8)}px`;
  refs.layerContextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - menuHeight - 8)}px`;
}

function duplicateSelectedNode() {
  const node = getNode(state.contextNodeId || state.selectedId);
  if (!node) return;
  const originals = state.project.nodes.filter((candidate) => candidate.id === node.id || isDescendant(candidate.id, node.id));
  const idMap = new Map(originals.map((original) => [original.id, uid(original.type)]));
  const clones = originals.map((original, index) => {
    const clone = deepClone(original);
    clone.id = idMap.get(original.id);
    clone.name = index === 0 ? `${original.name} copy` : original.name;
    clone.parentId = idMap.get(original.parentId) || original.parentId || null;
    return clone;
  });
  applyChange(() => {
    state.project.nodes.push(...clones);
    state.selectedId = idMap.get(node.id);
  });
  showToast("Layer duplicated", "success");
}

function handleLayerContextAction(action) {
  const node = getNode(state.contextNodeId || state.selectedId);
  closeLayerContextMenu();
  if (!node) return;
  if (action === "rename") {
    renderAll();
    window.setTimeout(() => {
      const input = refs.inspectorContent.querySelector("[data-node-name]");
      if (input) { input.focus(); input.select(); }
    }, 0);
    return;
  }
  if (action === "duplicate") {
    duplicateSelectedNode();
    return;
  }
  if (action === "move-page") {
    applyChange(() => reparentNodePreservingPosition(node, null));
    return;
  }
  if (action === "delete") deleteSelected();
}

function bindEvents() {
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addElement(button.dataset.add));
  });
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTool = button.dataset.tool;
      renderAll();
    });
  });
  document.querySelectorAll("[data-left-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.leftTab = button.dataset.leftTab;
      renderAll();
    });
  });
  document.querySelectorAll("[data-inspector-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-inspector-tab]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
    });
  });
  document.querySelectorAll("[data-device]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDevice = button.dataset.device;
      state.zoomMode = "fit";
      state.panX = 0;
      state.panY = 0;
      renderAll();
    });
  });

  refs.canvasSpace.addEventListener("pointerdown", handleCanvasPointerDown);
  refs.pageResizeHandle.addEventListener("pointerdown", startPageResize);
  // Capture modified wheel events before the browser turns a touchpad pinch
  // into page zoom. Different browsers target these events at different levels.
  document.addEventListener("wheel", (event) => {
    if (event.target.closest?.("#canvasSpace")) handleCanvasWheel(event);
  }, { passive: false, capture: true });
  document.addEventListener("gesturestart", (event) => {
    if (event.target.closest?.("#canvasSpace")) handleCanvasGestureStart(event);
  }, { passive: false, capture: true });
  document.addEventListener("gesturechange", (event) => {
    if (event.target.closest?.("#canvasSpace")) handleCanvasGestureChange(event);
  }, { passive: false, capture: true });
  document.addEventListener("gestureend", (event) => {
    if (event.target.closest?.("#canvasSpace")) handleCanvasGestureEnd(event);
  }, { passive: false, capture: true });
  refs.layersList.addEventListener("contextmenu", (event) => {
    const row = event.target.closest("[data-layer-id]");
    if (row) openLayerContextMenu(event, row.dataset.layerId);
  });
  refs.layerContextMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-context-action]");
    if (action) handleLayerContextAction(action.dataset.contextAction);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!refs.layerContextMenu.contains(event.target)) closeLayerContextMenu();
  });
  refs.undoButton.addEventListener("click", undo);
  refs.redoButton.addEventListener("click", redo);
  refs.projectNameInput.addEventListener("change", () => {
    const value = refs.projectNameInput.value.trim() || "Untitled project";
    applyChange(() => { state.project.name = value; });
  });
  document.getElementById("newProjectButton").addEventListener("click", () => {
    if (!window.confirm("Start a new blank project? Your current project will remain available only if you saved it as a project file.")) return;
    state.project = createBlankProject();
    state.selectedId = null;
    state.activeDevice = "desktop";
    state.panX = 0;
    state.panY = 0;
    resetHistory();
    renderAll();
    schedulePersist();
    showToast("New blank project created", "success");
  });
  document.getElementById("openProjectButton").addEventListener("click", () => refs.projectInput.click());
  document.getElementById("saveProjectButton").addEventListener("click", saveProject);
  refs.projectInput.addEventListener("change", () => {
    loadProjectFile(refs.projectInput.files[0]);
    refs.projectInput.value = "";
  });
  refs.imageInput.addEventListener("change", () => {
    const replaceId = refs.imageInput.dataset.replaceId || null;
    handleImageFile(refs.imageInput.files[0], replaceId);
    delete refs.imageInput.dataset.replaceId;
    refs.imageInput.value = "";
  });

  document.getElementById("exportButton").addEventListener("click", exportZip);
  document.getElementById("codeExportButton").addEventListener("click", exportZip);
  document.getElementById("previewExportButton").addEventListener("click", exportZip);
  document.getElementById("codeButton").addEventListener("click", openCodeModal);
  document.getElementById("previewButton").addEventListener("click", openPreviewModal);
  document.querySelectorAll("[data-file]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.codeFile = tab.dataset.file;
      document.querySelectorAll("[data-file]").forEach((item) => item.classList.toggle("active", item === tab));
      updateCodeOutput();
    });
  });
  document.getElementById("copyCodeButton").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(refs.codeOutput.value);
      showToast(`${state.codeFile} copied`, "success");
    } catch (_) {
      refs.codeOutput.select();
      document.execCommand("copy");
      showToast(`${state.codeFile} copied`, "success");
    }
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(document.getElementById(button.dataset.closeModal)));
  });
  [refs.codeModal, refs.previewModal].forEach((modal) => modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  }));

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      state.spaceDown = false;
      refs.canvasSpace.classList.remove("is-panning");
    }
  });
  window.addEventListener("resize", () => {
    if (state.zoomMode === "fit") renderCanvas();
  });
}

function setZoom(value) {
  state.zoomMode = "manual";
  state.zoom = Math.max(0.1, Math.min(4, Math.round(value * 100) / 100));
  renderCanvas();
}

function zoomAtPoint(event, value) {
  const oldZoom = state.computedZoom;
  const before = refs.artboardWrap.getBoundingClientRect();
  const pointX = (event.clientX - before.left) / oldZoom;
  const pointY = (event.clientY - before.top) / oldZoom;
  state.zoomMode = "manual";
  state.zoom = Math.max(0.1, Math.min(4, Math.round(value * 100) / 100));
  renderCanvas();
  const after = refs.artboardWrap.getBoundingClientRect();
  state.panX += event.clientX - (after.left + pointX * state.computedZoom);
  state.panY += event.clientY - (after.top + pointY * state.computedZoom);
  renderCanvas();
}

function handleCanvasWheel(event) {
  const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  // Chromium and Safari expose a two-finger pinch as a modified wheel event.
  if (event.ctrlKey || event.metaKey || event.altKey || event.getModifierState?.("Control")) {
    event.preventDefault();
    event.stopPropagation();
    if (!deltaY) return;
    const factor = Math.pow(1.1, -deltaY / 100);
    zoomAtPoint(event, state.computedZoom * factor);
    return;
  }
  if (event.deltaX || deltaY) {
    event.preventDefault();
    state.panX -= event.shiftKey ? deltaY : event.deltaX;
    state.panY -= event.shiftKey ? 0 : deltaY;
    renderCanvas();
  }
}

function handleCanvasGestureStart(event) {
  event.preventDefault();
  gestureStartZoom = state.computedZoom;
}

function handleCanvasGestureChange(event) {
  event.preventDefault();
  if (!gestureStartZoom || !event.scale) return;
  const rect = refs.canvasSpace.getBoundingClientRect();
  const point = {
    clientX: event.clientX || rect.left + (rect.width / 2),
    clientY: event.clientY || rect.top + (rect.height / 2),
  };
  zoomAtPoint(point, gestureStartZoom * event.scale);
}

function handleCanvasGestureEnd(event) {
  event.preventDefault();
  gestureStartZoom = null;
}

function handleKeydown(event) {
  const target = event.target;
  const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
  const modifier = event.ctrlKey || event.metaKey;

  if (modifier && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveProject();
    return;
  }
  if (modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
    return;
  }
  if (modifier && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
    return;
  }
  if (event.key === "Escape") {
    closeModal(refs.codeModal);
    closeModal(refs.previewModal);
    return;
  }
  if (event.code === "Space" && !typing) {
    event.preventDefault();
    state.spaceDown = true;
    refs.canvasSpace.classList.add("is-panning");
    return;
  }
  if (!typing && !modifier && (event.key === "+" || event.key === "=")) {
    event.preventDefault();
    setZoom(state.computedZoom + 0.1);
    return;
  }
  if (!typing && !modifier && (event.key === "-" || event.key === "_")) {
    event.preventDefault();
    setZoom(state.computedZoom - 0.1);
    return;
  }
  if (!typing && !modifier && event.key === "0") {
    event.preventDefault();
    state.zoomMode = "fit";
    state.panX = 0;
    state.panY = 0;
    renderCanvas();
    return;
  }
  if (typing || modifier) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelected();
    return;
  }
  const step = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowLeft") { event.preventDefault(); moveSelected(-step, 0); }
  if (event.key === "ArrowRight") { event.preventDefault(); moveSelected(step, 0); }
  if (event.key === "ArrowUp") { event.preventDefault(); moveSelected(0, -step); }
  if (event.key === "ArrowDown") { event.preventDefault(); moveSelected(0, step); }
}

state.history = [serializeProject()];
state.historyIndex = 0;
hydrateLucideIcons();
bindEvents();
bindTooltips();
renderAll();
loadStoredProject();
