/* VBuilder 2 — font system.
   Connects the editor and every export to Google Fonts, and lets users add
   their own font files (stored in the project as data-URL @font-face rules). */

import * as C from "./core.js";

/* Curated Google Fonts — the most-used families plus full Persian/Arabic
   support. Any other family can be typed into the font search and will be
   loaded straight from Google Fonts on demand. */
export const GOOGLE_FONTS = [
  // Latin / general
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway", "Nunito", "Nunito Sans",
  "Ubuntu", "PT Sans", "PT Serif", "Merriweather", "Playfair Display", "Source Sans 3", "Source Serif 4",
  "Source Code Pro", "Fira Sans", "Fira Code", "JetBrains Mono", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono",
  "Work Sans", "Manrope", "DM Sans", "DM Serif Display", "DM Mono", "Space Grotesk", "Space Mono", "Outfit",
  "Sora", "Urbanist", "Plus Jakarta Sans", "Figtree", "Schibsted Grotesk", "Onest", "Albert Sans", "Rubik",
  "Kanit", "Barlow", "Barlow Semi Condensed", "Barlow Condensed", "Oswald", "Archivo", "Archivo Narrow",
  "Cabin", "Titillium Web", "Signika", "Quicksand", "Comfortaa", "Josefin Sans", "Mulish", "Heebo",
  "Assistant", "Karla", "Hind", "Hind Siliguri", "Prompt", "Sarabun", "Be Vietnam Pro", "Manjari",
  "Epilogue", "Lexend", "Red Hat Display", "Atkinson Hyperlegible", "Overpass", "Noto Sans", "Noto Serif",
  "Noto Sans Display", "Noto Sans Mono", "Arimo", "Tinos", "Courier Prime", "Literata", "Bitter", "Zilla Slab",
  "Crimson Pro", "Libre Baskerville", "Libre Franklin", "EB Garamond", "Cormorant Garamond", "Fraunces",
  "Marcellus", "Prata", "Anton", "Bebas Neue", "League Spartan", "Abel", "Exo 2", "Chivo", "Asap",
  // Persian / Arabic
  "Vazirmatn", "Noto Naskh Arabic", "Noto Sans Arabic", "Noto Kufi Arabic", "Cairo", "Tajawal", "Almarai",
  "IBM Plex Sans Arabic", "Markazi Text", "Lalezar", "Baloo Bhaijaan 2", "El Messiri", "Amiri", "Scheherazade New",
  "Lateef", "Harmattan", "Reem Kufi", "Changa", "Jost", "Estedad",
];

const SAFE_LOCAL = ["Inter", "Georgia", "Times New Roman", "Courier New", "system-ui", "Helvetica Neue", "Trebuchet MS", "Verdana", "Arial", "sans-serif", "serif", "monospace"];

export const familyName = (family) => String(family || "").split(",")[0].trim().replace(/['"]/g, "");

const loaded = new Set();

/** Injects a Google Fonts stylesheet for one family (editor document). */
export function ensureFamily(family) {
  const name = familyName(family);
  if (!name || loaded.has(name) || SAFE_LOCAL.includes(name)) return;
  if (typeof document === "undefined") return;
  if ((C.project().fonts || []).some((f) => f.family === name)) return; // custom font
  loaded.add(name);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

let customStyleEl = null;
/** (Re)applies the project's custom @font-face rules to the editor document. */
export function applyProjectFonts(project = C.project()) {
  if (typeof document === "undefined") return;
  customStyleEl ||= (() => { const s = document.createElement("style"); s.id = "vb-custom-fonts"; document.head.appendChild(s); return s; })();
  customStyleEl.textContent = fontFaceCss(project);
}

export function fontFaceCss(project = C.project()) {
  return (project.fonts || []).map((f) =>
    `@font-face { font-family: '${C.escapeHtml(f.family)}'; src: url(${f.src}) format('${f.format || "woff2"}'); font-display: swap; }`).join("\n");
}

/** Google families actually used by the document (for export links). */
export function usedGoogleFamilies(project = C.project()) {
  const custom = new Set((project.fonts || []).map((f) => f.family));
  const names = new Set();
  project.pages.forEach((p) => p.nodes.forEach((n) => {
    const name = familyName(n.base?.family);
    if (name && !custom.has(name) && !SAFE_LOCAL.includes(name) && !/^(sans-serif|serif|monospace)$/.test(name)) names.add(name);
  }));
  return [...names];
}

export function fontLinksHtml(families) {
  if (!families.length) return "";
  const q = families.map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${q}&display=swap">`;
}

export const cssImports = (families) => families.length
  ? `@import url('https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`).join("&")}&display=swap');\n`
  : "";

/* ---------------------------------------------------------- custom fonts */

const FONT_EXT = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

export function addCustomFontFile(file) {
  return new Promise((resolve) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const format = FONT_EXT[ext];
    if (!format) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const family = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Custom font";
      C.change(() => {
        C.project().fonts ||= [];
        const existing = C.project().fonts.find((f) => f.family === family);
        if (existing) { existing.src = String(reader.result); existing.format = format; }
        else C.project().fonts.push({ id: C.uid("font"), family, src: String(reader.result), format });
      }, "add font");
      applyProjectFonts();
      resolve(family);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
