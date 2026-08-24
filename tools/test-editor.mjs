import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const dom = new JSDOM(html, { url: "http://localhost:4173/", pretendToBeVisual: true });
const { window } = dom;

// --- browser globals the app expects -------------------------------------
const g = globalThis;
g.window = window;
g.document = window.document;
g.navigator = window.navigator;
g.HTMLElement = window.HTMLElement;
g.Element = window.Element;
g.Node = window.Node;
g.Event = window.Event;
g.MouseEvent = window.MouseEvent;
g.KeyboardEvent = window.KeyboardEvent;
g.Blob = window.Blob;
g.FileReader = window.FileReader;
g.localStorage = window.localStorage;
try { Object.defineProperty(g, "crypto", { value: crypto, configurable: true }); } catch { /* node already exposes it */ }
g.requestAnimationFrame = (fn) => setTimeout(fn, 0);
g.cancelAnimationFrame = clearTimeout;
g.getComputedStyle = window.getComputedStyle.bind(window);
try { window.crypto = crypto; } catch { /* jsdom getter */ }
window.requestAnimationFrame = g.requestAnimationFrame;
window.URL.createObjectURL = () => "blob:mock";
window.URL.revokeObjectURL = () => {};
window.confirm = () => true;
window.HTMLCanvasElement.prototype.getContext = () => null;

const errors = [];
window.addEventListener("error", (e) => errors.push("window error: " + (e.error?.stack || e.message)));
process.on("unhandledRejection", (e) => errors.push("unhandled rejection: " + (e?.stack || e)));

// --- import the real app --------------------------------------------------
const core = await import(path.join(ROOT, "js/core.js"));
const icons = await import(path.join(ROOT, "js/icons.js"));
const canvas = await import(path.join(ROOT, "js/canvas.js"));
const panels = await import(path.join(ROOT, "js/panels.js"));
const inspector = await import(path.join(ROOT, "js/inspector.js"));
const exporter = await import(path.join(ROOT, "js/export.js"));
const main = await import(path.join(ROOT, "js/main.js"));
await new Promise((r) => setTimeout(r, 80));

const doc = window.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];
const results = [];
const pending = [];
const check = (label, fn) => pending.push((async () => {
  try { const v = await fn(); results.push([label, v === undefined ? "ok" : String(v)]); }
  catch (err) { results.push([label, "THREW: " + err.message]); errors.push(`${label}: ${err.stack}`); }
})());
const settle = async () => { for (const p of pending.splice(0)) await p; };
const click = (elm) => elm.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const nodes = () => $$("#artboard .vb-node").length;

/* ------------------------------------------------------- startup smoke --- */
check("boot: artboard nodes rendered", nodes);
check("boot: layers rows", () => $$("#layersList .layer-row").length);
check("boot: icons hydrated (no <i data-icon> left)", () => $$("[data-icon]").length);
check("boot: tool dock buttons", () => $$("#toolDock .tool").length);
check("boot: status bar text", () => ($("#statusBar")?.textContent || "").slice(0, 60));
check("boot: inspector rendered (no selection)", () => $$("#inspectorBody .insp-section").length);
check("boot: zoom caption", () => $("#zoomCaption")?.textContent);
check("boot: canvas caption", () => $("#canvasCaption")?.textContent);
check("boot: undo/redo disabled state", () => `${$("#undoBtn").disabled}/${$("#redoBtn").disabled}`);

/* ------------------------------------------------------------ building --- */
let firstId = null;
check("add frame via command", () => { const n = main.addElement("frame"); firstId = n.id; return `${n.type} ${n.id} · canvas ${nodes()}`; });
check("add rect", () => main.addElement("rect").type);
check("add text", () => main.addElement("text").type);
check("add button", () => main.addElement("button").type);
check("add ellipse", () => main.addElement("ellipse").type);
check("add line", () => main.addElement("line").type);
check("add star", () => main.addElement("star").type);
check("add icon", () => { const n = main.addIcon("rocket"); return `${n.type} icon=${n.base.icon}`; });
check("canvas node count after adds", nodes);
check("selection is last added", () => core.state.selection.length);

check("undo x3", () => { core.undo(); core.undo(); core.undo(); main.refresh(); return nodes(); });
check("redo x3", () => { core.redo(); core.redo(); core.redo(); main.refresh(); return nodes(); });

/* ------------------------------------------------------- multi-select --- */
// Pick a fresh, isolated set of root layers so the edit commands have something to work on.
check("select all roots", () => { core.setSelection(core.page().nodes.filter((n) => !n.parentId).map((n) => n.id)); return `${core.state.selection.length} roots selected`; });
check("bounding box of multi", () => { const b = core.boundingBox(); return b ? `${Math.round(b.width)}x${Math.round(b.height)}` : "null"; });
check("multi-select inspector header", () => { main.refresh(); return $(".header-name")?.textContent; });
check("align narrow node in its frame", () => {
  const hero = core.node("hero");
  const eyebrow = core.node("eyebrow");
  core.setSelection([eyebrow.id]);
  const before = core.propsOf(eyebrow).x;
  inspector.render();
  const centre = $$("#inspectorBody .icon-btn").find((b) => b.getAttribute("aria-label") === "Align horizontal centres");
  click(centre);
  const after = core.propsOf(eyebrow).x;
  const expected = Math.round((core.propsOf(hero).width - core.propsOf(eyebrow).width) / 2);
  core.undo(); main.refresh();
  return `x ${before} -> ${after} (expected ~${expected}) inside ${hero.name} w=${core.propsOf(hero).width}`;
});
check("align centre horizontal", () => {
  const first = core.selected()[0];
  const before = core.propsOf(first).x;
  inspector.render();
  const alignCentre = $$("#inspectorBody .icon-btn").find((b) => b.getAttribute("aria-label") === "Align horizontal centres");
  if (!alignCentre) return "align button missing";
  click(alignCentre);
  return `x ${Math.round(before)} -> ${Math.round(core.propsOf(core.node(first.id)).x)}`;
});
check("nudge +10", () => {
  const first = core.selected()[0];
  const before = core.propsOf(first).x;
  main.nudge(10, 0);
  return `${Math.round(before)} -> ${Math.round(core.propsOf(core.node(first.id)).x)}`;
});
check("distribute horizontal (3+)", () => {
  const before = core.selected().slice(0, 3).map((n) => Math.round(core.absoluteRect(n).x)).join(",");
  const dist = $$("#inspectorBody .icon-btn").find((b) => b.getAttribute("aria-label") === "Distribute horizontal spacing");
  if (!dist) return "distribute button missing";
  click(dist);
  return `${before} -> ${core.selected().slice(0, 3).map((n) => Math.round(core.absoluteRect(n).x)).join(",")}`;
});
check("group selection", () => {
  core.setSelection(core.page().nodes.filter((n) => !n.parentId).slice(0, 3).map((n) => n.id));
  const framesBefore = core.page().nodes.filter((n) => n.type === "frame").length;
  main.groupSelected();
  return `frames ${framesBefore} -> ${core.page().nodes.filter((n) => n.type === "frame").length}, selected=${core.state.selection.length}`;
});
check("grouped children keep position", () => {
  const group = core.node(core.state.selection[0]);
  const child = core.childrenOf(group.id)[0];
  const r = core.absoluteRect(child);
  return `${child.name} at ${Math.round(r.x)},${Math.round(r.y)} inside ${group.name}`;
});
check("ungroup", () => {
  const group = core.node(core.state.selection[0]);
  const kids = core.childrenOf(group.id).length;
  main.ungroupSelected();
  return `${kids} children released, frame gone=${!core.node(group.id)}`;
});
check("duplicate", () => { const before = core.page().nodes.length; main.duplicateSelected(); return `${before} -> ${core.page().nodes.length}`; });
check("copy/paste", () => { const before = core.page().nodes.length; main.copySelection(); main.pasteClipboard(); return `${before} -> ${core.page().nodes.length}`; });
check("z-order bring to front", () => { const id = core.state.selection[0]; core.change(() => core.zMove([id], "front"), "z"); return `is last=${core.page().nodes.at(-1).id === id}`; });
check("z-order send to back", () => { const id = core.state.selection[0]; core.change(() => core.zMove([id], "back"), "z"); return `is first=${core.page().nodes[0].id === id}`; });
check("delete selection", () => { const before = core.page().nodes.length; main.deleteSelected(true); return `${before} -> ${core.page().nodes.length}, selection=${core.state.selection.length}`; });

/* ----------------------------------------------------------- snapping --- */
check("snap: grid alignment", () => {
  core.state.prefs.snap = true;
  const r = core.snapBox({ x: 103.4, y: 201.2, width: 100, height: 50 }, { ignoreIds: [] });
  return `103.4,201.2 -> ${r.x},${r.y} guides=${r.guides.length}`;
});
check("snap disabled passthrough", () => {
  core.state.prefs.snap = false;
  const r = core.snapBox({ x: 103.4, y: 201.2, width: 10, height: 10 }, { ignoreIds: [] });
  core.state.prefs.snap = true;
  return `${r.x},${r.y}`;
});

/* -------------------------------------------------------- auto layout --- */
check("auto layout stacks children", () => {
  core.change(() => {
    const f = core.makeNode("frame", "Stack", { x: 100, y: 100, width: 300, height: 300 });
    f.base.layout = { mode: "column", gap: 10, pad: { t: 20, r: 20, b: 20, l: 20 }, align: "start", justify: "start" };
    const a = core.makeNode("rect", "A", { width: 100, height: 40 }, { parentId: f.id });
    const b = core.makeNode("rect", "B", { width: 100, height: 60 }, { parentId: f.id });
    core.page().nodes.push(f, a, b);
    core.setSelection([f.id]);
  }, "auto layout test");
  const [a, b] = core.page().nodes.slice(-2);
  const ra = core.propsOf(a), rb = core.propsOf(b);
  return `A(${ra.x},${ra.y}) B(${rb.x},${rb.y}) gap=${rb.y - (ra.y + ra.height)}`;
});
check("auto layout fill child grows", () => {
  const kids = core.page().nodes.slice(-2);
  core.change(() => { kids[1].base.sizing = { w: "fixed", h: "fill" }; }, "fill");
  const rb = core.propsOf(kids[1]);
  return `B height ${rb.height}`;
});
check("inspector auto-layout section present", () => { main.refresh(); return $$("#inspectorBody .insp-section .section-title").map((e) => e.textContent).join(" | "); });

/* ------------------------------------------------------------- exports --- */
const formats = ["html", "react", "tailwind", "node"];
for (const fmt of formats) {
  check(`export ${fmt}: files`, () => {
    const files = exporter.buildFiles(fmt);
    return files.map((f) => f.name).join(", ");
  });
  check(`export ${fmt}: no NaN/undefined`, () => {
    const LEGIT = /typeof window !== "undefined"|"use strict"|undefined\)\)/g;
    const bad = exporter.buildFiles(fmt).filter((f) => !f.binary)
      .filter((f) => /\bNaN\b|\bundefined\b/.test(String(f.data).replace(LEGIT, "")));
    return bad.length ? "BAD: " + bad.map((f) => f.name).join(",") : "clean";
  });
  check(`export ${fmt}: size`, () => exporter.buildFiles(fmt).reduce((s, f) => s + String(f.data).length, 0) + " chars");
}
check("css braces balanced", () => {
  const css = exporter.buildCss();
  const open = (css.match(/\{/g) || []).length, close = (css.match(/\}/g) || []).length;
  return `${open}/${close} ${open === close ? "ok" : "MISMATCH"}`;
});
check("css uses cqw + media queries", () => {
  const css = exporter.buildCss();
  return `cqw=${(css.match(/cqw/g) || []).length} media=${(css.match(/@media/g) || []).length} keyframes=${(css.match(/@keyframes/g) || []).length}`;
});
check("runtime js parses", () => {
  const src = exporter.buildRuntime();
  new window.Function(src); // eslint-disable-line no-new-func
  return `${src.length} chars, parses`;
});
check("react jsx has component + action fn", () => {
  const src = exporter.buildReact();
  return `export default ${/export default function \w+/.test(src)}, runAction ${src.includes("export function runAction")}`;
});
check("zip blob", () => {
  const zip = exporter.makeZip(exporter.buildFiles("html"));
  return `${zip.size} bytes ${zip.type}`;
});
check("dataUrlToBytes roundtrip", () => {
  const bytes = exporter.dataUrlToBytes("data:text/plain;base64," + Buffer.from("hello").toString("base64"));
  return new TextDecoder().decode(bytes);
});

/* ------------------------------------------------------- interactions --- */
check("set link action on button", () => {
  const btn = core.page().nodes.find((n) => n.type === "button");
  core.change(() => core.setProps(btn, { action: { type: "link", url: "https://example.com", target: "_blank" } }), "action");
  return JSON.stringify(core.propsOf(btn).action);
});
check("link appears in exported html", () => exporter.buildHtml().includes('href="https://example.com"'));
check("set scroll animation", () => {
  const t = core.page().nodes.find((n) => n.type === "text");
  core.change(() => core.setProps(t, { animation: { type: "fade-up", duration: 700, delay: 100, easing: "spring", trigger: "scroll", repeat: 1 } }), "anim");
  return JSON.stringify(core.propsOf(t).animation);
});
check("animation emits keyframes + observer class", () => {
  const css = exporter.buildCss();
  return `keyframe=${css.includes("@keyframes vb-fade-up")} scrollClass=${exporter.buildHtml().includes("vb-scroll")}`;
});
check("prototype tab renders", () => {
  core.state.inspectorTab = "prototype"; main.refresh();
  const out = $$("#inspectorBody .insp-section .section-title").map((e) => e.textContent).join(" | ");
  core.state.inspectorTab = "design"; main.refresh();
  return out;
});
check("inspect tab renders", () => {
  core.state.inspectorTab = "inspect"; main.refresh();
  const out = $$("#inspectorBody .insp-section .section-title").map((e) => e.textContent).join(" | ");
  core.state.inspectorTab = "design"; main.refresh();
  return out;
});

/* ------------------------------------------------------------ devices --- */
for (const d of ["tablet", "mobile", "desktop"]) {
  check(`device ${d}`, () => { main.setDevice(d); return `${$("#canvasCaption").textContent} | artboard ${$("#artboard").style.width}`; });
}

/* --------------------------------------------------------------- pages --- */
check("add page", () => { main.addPage(); return core.project().pages.map((p) => p.name).join(", "); });
check("insert block into page", () => { main.insertBlock(0); return `nodes=${core.page().nodes.length}`; });
check("switch page", () => { main.switchPage(core.project().pages[0].id); return `${core.page().name} · ${core.page().nodes.length} nodes`; });
check("duplicate page", () => { main.duplicatePage(core.page().id); return core.project().pages.length + " pages"; });
check("fit page height", () => { main.fitPageHeight(); return `${core.page().height}px`; });

/* -------------------------------------------------------------- palette --- */
check("command palette opens", () => { click($("#paletteBtn")); const open = !$("#palette").classList.contains("hidden"); const items = $$("#paletteResults .palette-item").length; return `open=${open} items=${items}`; });
check("palette filters", () => {
  const input = $("#paletteInput");
  input.value = "gradient";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  return `${$$("#paletteResults .palette-item").length} results`;
});
check("palette runs a command", () => {
  const before = core.page().nodes.length;
  const input = $("#paletteInput"); input.value = "";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  const item = $$("#paletteResults .palette-item").find((b) => b.textContent.includes("Add star"));
  click(item);
  return `${before} -> ${core.page().nodes.length}, palette hidden=${$("#palette").classList.contains("hidden")}`;
});

/* ---------------------------------------------------------- context menu */
check("canvas context menu", async () => {
  const ev = new window.MouseEvent("contextmenu", { bubbles: true, clientX: 400, clientY: 300 });
  $("#canvasViewport").dispatchEvent(ev);
  await new Promise((r) => setTimeout(r, 20));
  const labels = $$(".context-menu .menu-label").map((e) => e.textContent);
  return `${labels.length} items: ${labels.slice(0, 5).join("/")}`;
});
check("layer context menu", async () => {
  const id = core.page().nodes[0].id;
  main.showLayerMenu(new window.MouseEvent("contextmenu", { bubbles: true, clientX: 10, clientY: 10 }), core.node(id));
  return `${$$(".context-menu .menu-item").length} items: ` + $$(".context-menu .menu-label").slice(0, 4).map((e) => e.textContent).join("/");
});

/* ----------------------------------------------------------- inspector --- */
for (const type of ["frame", "rect", "ellipse", "text", "button", "image", "icon", "star", "arrow", "line"]) {
  check(`inspector for ${type}`, () => {
    const n = core.page().nodes.find((x) => x.type === type) || main.addElement(type);
    core.setSelection([n.id]); main.refresh();
    const sections = $$("#inspectorBody .insp-section .section-title").map((e) => e.textContent);
    const fields = $$("#inspectorBody input, #inspectorBody select, #inspectorBody textarea").length;
    return `${sections.length} sections / ${fields} controls`;
  });
}
check("page inspector when nothing selected", () => { core.setSelection([]); main.refresh(); return $$("#inspectorBody .insp-section .section-title").map((e) => e.textContent).join(" | "); });

/* ---------------------------------------------------------- escaping --- */
check("xss: layer name + content escaped", () => {
  core.change(() => {
    core.state.project = core.normalizeProject({ name: '<img src=x onerror=1>', pages: [{ id: "p1", name: "<b>p</b>", nodes: [
      { id: "x1", type: "text", name: "<script>alert(1)</scr" + "ipt>", content: '<img src=x onerror=alert(2)>', base: { x: 0, y: 0, width: 100, height: 20 } },
    ] }] });
  }, "xss");
  main.refresh();
  const htmlOut = exporter.buildHtml();
  return `panelScripts=${doc.querySelectorAll("#layersList script").length} htmlScripts=${htmlOut.includes("<script>alert") ? "LEAK" : "none"}`;
});

/* ------------------------------------------------------------- persistence */
check("project round-trips through normalize", () => {
  const again = core.normalizeProject(JSON.parse(JSON.stringify(core.project())));
  return `${again.pages.length} pages, ${again.pages[0].nodes.length} nodes, version ${again.version}`;
});
check("prefs saved", () => { main.savePrefs(); return window.localStorage.getItem("vbuilder-prefs-v2") ? "written" : "missing"; });

await settle();

/* ---------------------------------------------------------------- output */
console.log("\n=== VBuilder 2 runtime results ===");
let failed = 0;
for (const [k, v] of results) {
  const bad = /THREW|MISMATCH|BAD|LEAK|missing/.test(v);
  if (bad) failed += 1;
  console.log(`${bad ? "✗" : "·"} ${k.padEnd(46)} ${v}`);
}
console.log(`\n${results.length - failed}/${results.length} checks clean`);
console.log(`\n=== errors (${errors.length}) ===`);
errors.slice(0, 12).forEach((e) => console.log(e.slice(0, 900)));
