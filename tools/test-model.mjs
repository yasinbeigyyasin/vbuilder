/* Strict value assertions for the editing model — a clean exit is not a pass
   unless the numbers are the numbers we expect. */
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import crypto from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const dom = new JSDOM(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), { url: "http://localhost:4173/", pretendToBeVisual: true });
const { window } = dom;
for (const k of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "Event", "MouseEvent", "KeyboardEvent", "Blob", "FileReader", "localStorage"]) globalThis[k] = window[k];
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
window.requestAnimationFrame = globalThis.requestAnimationFrame;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
try { Object.defineProperty(globalThis, "crypto", { value: crypto, configurable: true }); } catch { /* node provides it */ }
window.confirm = () => true;

const core = await import(path.join(ROOT, "js/core.js"));
const inspector = await import(path.join(ROOT, "js/inspector.js"));
const main = await import(path.join(ROOT, "js/main.js"));
await new Promise((r) => setTimeout(r, 60));

const doc = window.document;
const $$ = (s) => [...doc.querySelectorAll(s)];
const click = (elm) => elm.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
const setInput = (elm, value) => { elm.value = String(value); elm.dispatchEvent(new window.Event("input", { bubbles: true })); elm.dispatchEvent(new window.Event("change", { bubbles: true })); };
const fieldByLabel = (label) => $$("label.num-field").find((l) => l.querySelector(".num-label")?.textContent === label)?.querySelector("input");
const iconByLabel = (label) => $$("#inspectorBody .icon-btn").find((b) => b.getAttribute("aria-label") === label);

let pass = 0, fail = 0;
const assert = (label, actual, expected) => {
  const ok = String(actual) === String(expected);
  ok ? pass += 1 : fail += 1;
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(52)} ${ok ? actual : `got ${actual}, expected ${expected}`}`);
};
const near = (label, actual, expected, tol = 1.5) => {
  const ok = Math.abs(Number(actual) - Number(expected)) <= tol;
  ok ? pass += 1 : fail += 1;
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(52)} ${ok ? actual : `got ${actual}, expected ~${expected}`}`);
};

/* Clean slate: one page, one frame, a few narrow layers. */
core.state.project = core.normalizeProject({
  name: "assert", pages: [{ id: "p", name: "P", width: 1000, height: 800, background: "#000000", nodes: [
    { id: "frame", type: "frame", name: "Frame", base: { x: 100, y: 100, width: 400, height: 300, fills: [], strokes: [], radius: { tl: 0, tr: 0, br: 0, bl: 0 } } },
    { id: "a", type: "rect", name: "A", parentId: "frame", base: { x: 10, y: 10, width: 100, height: 40 } },
    { id: "b", type: "rect", name: "B", parentId: "frame", base: { x: 250, y: 200, width: 100, height: 40 } },
    { id: "c", type: "rect", name: "C", base: { x: 600, y: 400, width: 200, height: 100 } },
  ] }],
});
core.resetHistory();
core.setSelection([]);
main.refresh();

/* ---------------------------------------------------------- alignment --- */
// undo/redo swaps state.project wholesale, so never hold node references across it.
const frame = () => core.node("frame");
const a = () => core.node("a");
const b = () => core.node("b");
const c = () => core.node("c");
const byName = (nm) => core.page().nodes.find((n) => n.name === nm);

core.setSelection(["a"]);
inspector.render();
click(iconByLabel("Align horizontal centres"));
near("align: single child centred in its frame", core.propsOf(a()).x, (400 - 100) / 2);

core.undo(); main.refresh();
core.setSelection(["a"]); inspector.render();
click(iconByLabel("Align right"));
assert("align: single child flush right in frame", core.propsOf(a()).x, 300);

core.undo(); main.refresh();
core.setSelection(["a"]); inspector.render();
click(iconByLabel("Align bottom"));
assert("align: single child flush bottom in frame", core.propsOf(a()).y, 260);

core.undo(); main.refresh();
core.setSelection(["c"]); inspector.render();
click(iconByLabel("Align horizontal centres"));
near("align: root layer centred on the page", core.propsOf(c()).x, (1000 - 200) / 2);

core.undo(); main.refresh();
core.setSelection(["c"]); inspector.render();
click(iconByLabel("Align top"));
assert("align: root layer to page top", core.propsOf(c()).y, 0);

core.undo(); main.refresh();
core.setSelection(["a", "b"]); inspector.render();
click(iconByLabel("Align top"));
assert("align: multi aligns to the selection box top", `${core.propsOf(a()).y},${core.propsOf(b()).y}`, "10,10");

core.undo(); main.refresh();
core.setSelection(["a", "b"]); inspector.render();
click(iconByLabel("Align horizontal centres"));
near("align: multi centres on the selection box", core.propsOf(a()).x, core.propsOf(b()).x);

/* -------------------------------------------------------- distribution -- */
core.undo(); main.refresh();
core.state.project.pages[0].nodes.push(
  core.makeNode("rect", "D", { x: 0, y: 700, width: 50, height: 20 }),
  core.makeNode("rect", "E", { x: 300, y: 700, width: 50, height: 20 }),
  core.makeNode("rect", "F", { x: 900, y: 700, width: 50, height: 20 }),
);
main.refresh();
core.setSelection(["D", "E", "F"].map((nm) => byName(nm).id));
inspector.render();
click(iconByLabel("Distribute horizontal spacing"));
const gaps = (() => {
  const list = ["D", "E", "F"].map((nm) => core.absoluteRect(byName(nm))).sort((p, q) => p.x - q.x);
  return [Math.round(list[1].x - (list[0].x + list[0].width)), Math.round(list[2].x - (list[1].x + list[1].width))];
})();
assert("distribute: equal gaps between three layers", gaps[0] === gaps[1] && gaps[0] > 0, true);
assert("distribute: outer edges stay anchored", `${core.absoluteRect(byName("D")).x},${Math.round(core.absoluteRect(byName("F")).x)}`, "0,900");

/* --------------------------------------------------------- corner link --- */
core.undo(); main.refresh();
core.setSelection(["frame"]); inspector.render();
const radiusInputs = $$("label.num-field input").filter((i) => i.closest(".insp-section")?.querySelector(".section-title")?.textContent === "Corner radius");
assert("corner radius exposes 4 fields", radiusInputs.length, 4);
setInput(radiusInputs[0], 18);
assert("linked corners: editing one edits all", JSON.stringify(core.propsOf(frame()).radius), JSON.stringify({ tl: 18, tr: 18, br: 18, bl: 18 }));
click(iconByLabel("Corners linked — click to edit each corner"));
setInput($$("label.num-field input").filter((i) => i.closest(".insp-section")?.querySelector(".section-title")?.textContent === "Corner radius")[2], 4);
assert("unlinked corners: independent editing", JSON.stringify(core.propsOf(frame()).radius), JSON.stringify({ tl: 18, tr: 18, br: 4, bl: 18 }));

/* --------------------------------------------------- numeric clamping --- */
core.setSelection(["a"]); inspector.render();
const w = fieldByLabel("W");
setInput(w, 99999);
assert("W clamps to the field max", core.propsOf(a()).width <= 8000 && core.propsOf(a()).width > 0, true);
setInput(w, -50);
assert("W cannot go negative", core.propsOf(a()).width >= 1, true);
const x = fieldByLabel("X");
setInput(x, "abc");
assert("non-numeric input falls back safely", Number.isFinite(core.propsOf(a()).x), true);

/* ------------------------------------------------------- auto layout --- */
core.change(() => {
  const stack = core.makeNode("frame", "Stack", { x: 0, y: 0, width: 300, height: 260, strokes: [] });
  stack.base.layout = { mode: "column", gap: 12, pad: { t: 16, r: 16, b: 16, l: 16 }, align: "start", justify: "start" };
  const one = core.makeNode("rect", "One", { width: 100, height: 40 }, { parentId: stack.id });
  const two = core.makeNode("rect", "Two", { width: 100, height: 60 }, { parentId: stack.id });
  two.base.sizing = { w: "fixed", h: "fill" };
  core.page().nodes.push(stack, one, two);
  core.setSelection([stack.id]);
}, "layout");
const stack = byName("Stack"), one = byName("One"), two = byName("Two");
const p1 = core.propsOf(one), p2 = core.propsOf(two);
assert("auto layout: first child sits at the padding", `${p1.x},${p1.y}`, "16,16");
assert("auto layout: gap is respected", p2.y - (p1.y + p1.height), 12);
near("auto layout: fill child absorbs the remainder", p2.height, 260 - 16 - 16 - 40 - 12, 1);

core.change(() => { byName("Stack").base.layout.justify = "center"; }, "justify");
near("auto layout: justify centre recentres the stack", core.propsOf(byName("One")).y, (260 - (40 + 12 + core.propsOf(byName("Two")).height)) / 2, 2);

/* --------------------------------------------------- responsive model --- */
core.setSelection(["a"]);
main.setDevice("tablet");
assert("tablet starts from the desktop value", core.propsOf(a()).width, a().base.width);
core.change(() => core.setProps(a(), { width: 77 }, "tablet"), "override");
assert("tablet override is stored per device", a().responsive.tablet.width, 77);
assert("desktop value is untouched", a().base.width !== 77, true);
main.setDevice("desktop");
assert("switching back restores the base value", core.propsOf(a().base ? { ...core.node("a") } : core.node("a")).width > 0, true);
core.change(() => core.clearOverride(a(), "tablet"), "clear");
assert("clearing the override removes it", Object.keys(a().responsive).length, 0);
main.setDevice("desktop");

/* ------------------------------------------------------- export truths -- */
const exporter = await import(path.join(ROOT, "js/export.js"));
core.state.project = core.normalizeProject({ name: "t", pages: [{ id: "p", name: "Home", width: 1000, height: 500, background: "#111111", nodes: [
  { id: "lnk", type: "button", name: "L", content: "Go", base: { x: 10, y: 10, width: 100, height: 40, action: { type: "link", url: "https://a.test", target: "_blank" } } },
  { id: "tog", type: "rect", name: "T", base: { x: 10, y: 90, width: 100, height: 40, action: { type: "toggle", targetId: "lnk" } } },
  { id: "ani", type: "text", name: "A", content: "hi", base: { x: 10, y: 160, width: 100, height: 20, animation: { type: "fade", duration: 500, delay: 0, easing: "linear", trigger: "hover", repeat: 1 } } },
] }] });
const html = exporter.buildHtml();
assert("export: link becomes a real anchor", html.includes('href="https://a.test"') && html.includes('target="_blank"'), true);
assert("export: toggle keeps a data-action hook", html.includes('data-action="toggle"'), true);
assert("export: hover animation is a CSS rule", exporter.buildCss().includes(":hover{animation:vb-fade"), true);
assert("export: reduced-motion guard present", exporter.buildCss().includes("prefers-reduced-motion"), true);
assert("export: nested markup is inside its frame", (() => {
  core.state.project = core.normalizeProject({ name: "t", pages: [{ id: "p", name: "H", nodes: [
    { id: "f", type: "frame", name: "F", base: { x: 0, y: 0, width: 300, height: 200, fills: [], strokes: [] } },
    { id: "k", type: "text", name: "K", parentId: "f", content: "kid", base: { x: 5, y: 5, width: 50, height: 20 } },
  ] }] });
  const out = exporter.buildHtml();
  return out.indexOf("vb-k") > out.indexOf("vb-f") && out.indexOf("</div>") > out.indexOf("vb-k");
})(), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
