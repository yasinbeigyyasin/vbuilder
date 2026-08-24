/* Catches the bug class that is easy to hit in a hand-rolled module graph:
   a helper from another module used but never imported. Exits non-zero on failure. */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const files = fs.readdirSync(path.join(ROOT, "js")).filter((f) => f.endsWith(".js"));

// helper name -> the module that exports it
const OWNERS = {
  dom: "./dom.js", bindRefs: "./dom.js", $: "./dom.js", $$: "./dom.js", el: "./dom.js",
  iconSvg: "./icons.js", ICONS: "./icons.js", ICON_NAMES: "./icons.js", ICON_LIBRARY: "./icons.js",
  TEXT_PRESETS: "./icons.js", GRADIENTS: "./icons.js", SWATCHES: "./icons.js", BLOCKS: "./icons.js",
  toast: "./panels.js", showMenu: "./panels.js", closeMenu: "./panels.js", openModal: "./panels.js",
  closeModal: "./panels.js", confirmDialog: "./panels.js", promptDialog: "./panels.js",
  isModalOpen: "./panels.js", renderLeftPanel: "./panels.js", renderAllPanels: "./panels.js",
  fillCss: "./canvas.js", withAlpha: "./canvas.js", effectsCss: "./canvas.js", applyVisual: "./canvas.js",
};

let problems = 0;
for (const file of files) {
  const src = fs.readFileSync(path.join(ROOT, "js", file), "utf8");
  const imported = new Set();
  const nsAliases = new Set();
  for (const m of src.matchAll(/import\s+(?:([\w$]+)\s*,\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+))?\s*from\s*["']([^"']+)["']/g)) {
    if (m[1]) imported.add(m[1]);
    if (m[2]) m[2].split(",").forEach((part) => { const name = part.split(/\s+as\s+/).pop().trim(); if (name) imported.add(name); });
    if (m[3]) nsAliases.add(m[3]);
  }
  const declared = new Set();
  for (const m of src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:function\*?\s+|const\s+|let\s+|var\s+|class\s+)([\w$]+)/g)) declared.add(m[1]);
  for (const m of src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s*\{([^}]+)\}/g)) m[1].split(",").forEach((p) => declared.add(p.split(":").pop().trim()));

  const names = Object.keys(OWNERS).filter((n) => !imported.has(n) && !declared.has(n));
  const missing = names.filter((name) => {
    const bare = new RegExp(`(^|[^\\w$.'"\`])${name.replace(/\$/g, "\\$")}\\s*[(\\[.]`).test(src);
    const qualified = [...nsAliases].some((alias) => src.includes(`${alias}.${name}`));
    return bare && !qualified;
  });
  if (missing.length) {
    problems += missing.length;
    console.log(`✗ js/${file}: uses ${missing.map((m) => `${m} (from ${OWNERS[m]})`).join(", ")} without importing it`);
  }
}

if (!problems) console.log(`import lint: ${files.length} modules clean`);
process.exit(problems ? 1 : 0);
