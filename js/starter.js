/* VBuilder 2 — the document a new project starts with.
   Doubles as a working demo of frames, auto layout, gradients, effects,
   animations and interactive layers. */

import * as C from "./core.js";

const solid = (color, opacity = 100) => [{ type: "solid", color, opacity }];
const grad = (a, b, angle = 135) => [{ type: "linear", angle, opacity: 100, stops: [{ at: 0, color: a }, { at: 100, color: b }] }];
const anim = (type, trigger = "scroll", delay = 0) => ({ type, duration: 620, delay, easing: "smooth", trigger, repeat: 1 });
const link = (url, target = "_self") => ({ type: "link", url, target });
const zero = { tl: 0, tr: 0, br: 0, bl: 0 };

export function createStarterProject(name = "Starter landing page") {
  const page = C.blankPage("Landing page", 1440, 900);
  page.background = "#0b0d12";
  const project = { ...C.createProject(name), pages: [page], activePageId: page.id };
  const push = (type, nm, base, extra = {}) => {
    const n = C.makeNode(type, nm, base, extra);
    page.nodes.push(n);
    return n;
  };

  /* ------------------------------------------------------------- header */
  const header = push("frame", "Header", {
    x: 0, y: 0, width: 1440, height: 76, radius: zero, fills: solid("#0b0d12"), strokes: [],
    layout: { mode: "row", gap: 24, pad: { t: 0, r: 56, b: 0, l: 56 }, align: "center", justify: "between" },
  }, { id: "header" });

  push("text", "Brand", { size: 17, weight: 800, letterSpacing: -0.4, fills: solid("#f5f7fb") },
    { id: "brand", parentId: header.id, content: "vbuilder" });
  push("text", "Nav links", { size: 13, weight: 500, width: 320, height: 18, fills: solid("#9aa3b2") },
    { id: "nav", parentId: header.id, content: "Product        Pricing        Docs        Blog" });
  push("button", "Header CTA", { width: 118, height: 38, size: 12.5, radius: { tl: 9, tr: 9, br: 9, bl: 9 } },
    { id: "header-cta", parentId: header.id, content: "Get started" });

  /* --------------------------------------------------------------- hero */
  const hero = push("frame", "Hero", {
    x: 0, y: 76, width: 1440, height: 560, radius: zero, strokes: [],
    fills: [{ type: "radial", opacity: 100, stops: [{ at: 0, color: "#16203a" }, { at: 100, color: "#0b0d12" }] }],
  }, { id: "hero" });

  push("text", "Eyebrow", {
    x: 96, y: 108, width: 300, height: 18, size: 11, weight: 700, letterSpacing: 1.8, transform: "uppercase",
    fills: solid("#0d99ff"), animation: anim("fade-down", "load"),
  }, { id: "eyebrow", parentId: hero.id, content: "Design → code, no handoff" });

  push("text", "Headline", {
    x: 96, y: 140, width: 640, height: 168, size: 64, weight: 780, lineHeight: 1.04, letterSpacing: -2.4,
    fills: solid("#ffffff"), animation: anim("fade-up", "load", 80),
  }, { id: "headline", parentId: hero.id, content: "Design it once.\nShip it everywhere." });

  push("text", "Hero copy", {
    x: 96, y: 336, width: 520, height: 76, size: 17, lineHeight: 1.6, fills: solid("#9aa3b2"),
    animation: anim("fade-up", "load", 160),
  }, { id: "hero-copy", parentId: hero.id, content: "A real design canvas with auto layout, animation and prototype logic — that exports clean HTML, React or a Node bundle." });

  const cta = push("button", "Primary CTA", {
    x: 96, y: 444, width: 176, height: 52, size: 14.5, weight: 650,
    radius: { tl: 11, tr: 11, br: 11, bl: 11 },
    effects: [{ type: "shadow", color: "#0d99ff", opacity: 45, x: 0, y: 14, blur: 34, spread: 0 }],
    action: link("https://example.com/signup"), animation: anim("scale", "load", 240),
  }, { id: "cta-primary", parentId: hero.id, content: "Start building" });
  cta.base.action.target = "_blank";

  push("button", "Secondary CTA", {
    x: 288, y: 444, width: 158, height: 52, size: 14.5, weight: 600,
    radius: { tl: 11, tr: 11, br: 11, bl: 11 }, fills: solid("#ffffff", 7),
    strokes: [{ color: "#ffffff", width: 1, align: "inside" }], effects: [],
    action: { type: "scroll", targetId: "features" }, animation: anim("scale", "load", 300),
  }, { id: "cta-secondary", parentId: hero.id, content: "See features" });

  /* hero visual — a frame with auto layout holding three rows */
  const card = push("frame", "Hero card", {
    x: 776, y: 132, width: 568, height: 400, radius: { tl: 24, tr: 24, br: 24, bl: 24 },
    fills: solid("#ffffff", 5), strokes: [{ color: "#ffffff", width: 1, align: "inside" }],
    effects: [{ type: "shadow", color: "#000000", opacity: 45, x: 0, y: 30, blur: 70, spread: 0 }, { type: "background", radius: 18 }],
    layout: { mode: "column", gap: 14, pad: { t: 26, r: 26, b: 26, l: 26 }, align: "stretch", justify: "start" },
    animation: anim("fade-up", "load", 200),
  }, { id: "hero-card", parentId: hero.id });

  const rowA = push("frame", "Card row A", {
    width: 516, height: 84, radius: { tl: 14, tr: 14, br: 14, bl: 14 }, fills: solid("#ffffff", 6), strokes: [],
  }, { id: "card-a", parentId: card.id });
  push("icon", "Icon A", { x: 18, y: 24, width: 34, height: 34, icon: "zap", fills: solid("#0d99ff") }, { id: "icon-a", parentId: rowA.id });
  push("text", "Row A title", { x: 70, y: 20, width: 300, height: 20, size: 15, weight: 650, fills: solid("#eef1f7") }, { id: "row-a-title", parentId: rowA.id, content: "Auto layout that maps to flexbox" });
  push("text", "Row A copy", { x: 70, y: 44, width: 380, height: 18, size: 12.5, fills: solid("#8d95a6") }, { id: "row-a-copy", parentId: rowA.id, content: "Gap, padding and alignment export one-to-one." });

  const rowB = push("frame", "Card row B", {
    width: 516, height: 84, radius: { tl: 14, tr: 14, br: 14, bl: 14 }, fills: solid("#ffffff", 6), strokes: [],
  }, { id: "card-b", parentId: card.id });
  push("icon", "Icon B", { x: 18, y: 24, width: 34, height: 34, icon: "film", fills: solid("#7c3aed") }, { id: "icon-b", parentId: rowB.id });
  push("text", "Row B title", { x: 70, y: 20, width: 300, height: 20, size: 15, weight: 650, fills: solid("#eef1f7") }, { id: "row-b-title", parentId: rowB.id, content: "Animation with real triggers" });
  push("text", "Row B copy", { x: 70, y: 44, width: 380, height: 18, size: 12.5, fills: solid("#8d95a6") }, { id: "row-b-copy", parentId: rowB.id, content: "Load, scroll, hover or click — exported as CSS." });

  const rowC = push("frame", "Card row C", {
    width: 516, height: 84, radius: { tl: 14, tr: 14, br: 14, bl: 14 }, fills: solid("#ffffff", 6), strokes: [],
  }, { id: "card-c", parentId: card.id });
  push("icon", "Icon C", { x: 18, y: 24, width: 34, height: 34, icon: "code", fills: solid("#66d9a3") }, { id: "icon-c", parentId: rowC.id });
  push("text", "Row C title", { x: 70, y: 20, width: 300, height: 20, size: 15, weight: 650, fills: solid("#eef1f7") }, { id: "row-c-title", parentId: rowC.id, content: "Four export targets" });
  push("text", "Row C copy", { x: 70, y: 44, width: 380, height: 18, size: 12.5, fills: solid("#8d95a6") }, { id: "row-c-copy", parentId: rowC.id, content: "HTML/CSS/JS, React, Tailwind, or a Node bundle." });

  /* ----------------------------------------------------------- features */
  const features = push("frame", "Features", {
    x: 0, y: 636, width: 1440, height: 420, radius: zero, fills: solid("#0e1117"), strokes: [],
  }, { id: "features" });

  push("text", "Features title", {
    x: 96, y: 60, width: 620, height: 44, size: 34, weight: 720, letterSpacing: -1.1, fills: solid("#ffffff"),
    animation: anim("fade-up"),
  }, { id: "features-title", parentId: features.id, content: "Everything the canvas needs" });

  const featureData = [
    ["magnet", "Snap & guides", "Smart guides line edges and centres up as you drag, exactly like a pro design tool.", "#0d99ff"],
    ["layers", "Frames & nesting", "Drop anything into a frame, then let auto layout do the spacing for you.", "#7c3aed"],
    ["download", "Code you can ship", "Semantic markup, fluid units, real media queries and a runtime for interactions.", "#66d9a3"],
  ];
  featureData.forEach(([icon, title, copy, color], i) => {
    const x = 96 + i * 424;
    const cardFrame = push("frame", `Feature ${i + 1}`, {
      x, y: 148, width: 392, height: 216, radius: { tl: 18, tr: 18, br: 18, bl: 18 },
      fills: solid("#151a23"), strokes: [{ color: "#232a36", width: 1, align: "inside" }],
      animation: anim("fade-up", "scroll", i * 90),
    }, { id: `feature-${i + 1}`, parentId: features.id });
    push("icon", "Feature icon", { x: 26, y: 26, width: 30, height: 30, icon, fills: solid(color) }, { id: `feature-icon-${i + 1}`, parentId: cardFrame.id });
    push("text", "Feature title", { x: 26, y: 76, width: 340, height: 24, size: 18, weight: 660, fills: solid("#eef1f7") }, { id: `feature-title-${i + 1}`, parentId: cardFrame.id, content: title });
    push("text", "Feature copy", { x: 26, y: 110, width: 340, height: 84, size: 13.5, lineHeight: 1.6, fills: solid("#8d95a6") }, { id: `feature-copy-${i + 1}`, parentId: cardFrame.id, content: copy });
  });

  /* ---------------------------------------------------------------- cta */
  const ctaBanner = push("frame", "CTA banner", {
    x: 96, y: 1108, width: 1248, height: 220, radius: { tl: 26, tr: 26, br: 26, bl: 26 },
    fills: grad("#0d99ff", "#7c3aed", 100), strokes: [], responsiveBehavior: "stretch",
    effects: [{ type: "shadow", color: "#0d99ff", opacity: 30, x: 0, y: 24, blur: 60, spread: 0 }],
    animation: anim("scale"),
  }, { id: "cta-banner" });

  push("text", "CTA headline", {
    x: 300, y: 62, width: 648, height: 42, size: 32, weight: 720, align: "center", letterSpacing: -1,
    fills: solid("#ffffff"),
  }, { id: "cta-headline", parentId: ctaBanner.id, content: "Your first page is ten minutes away" });

  push("button", "CTA button", {
    x: 544, y: 130, width: 160, height: 48, size: 14, weight: 650,
    fills: solid("#ffffff"), radius: { tl: 11, tr: 11, br: 11, bl: 11 }, effects: [],
    action: link("https://example.com/signup", "_blank"),
  }, { id: "cta-button", parentId: ctaBanner.id, content: "Start free" });

  /* ------------------------------------------------------------- footer */
  const footer = push("frame", "Footer", {
    x: 0, y: 1380, width: 1440, height: 120, radius: zero, fills: solid("#08090d"), strokes: [],
    responsiveBehavior: "stretch",
  }, { id: "footer" });
  push("text", "Footer brand", { x: 96, y: 36, width: 220, height: 22, size: 16, weight: 750, fills: solid("#eef1f7") }, { id: "footer-brand", parentId: footer.id, content: "vbuilder" });
  push("text", "Footer note", { x: 96, y: 64, width: 420, height: 18, size: 12, fills: solid("#5d6472") }, { id: "footer-note", parentId: footer.id, content: "Everything stays on this device — nothing is uploaded." });
  push("text", "Footer links", { x: 900, y: 50, width: 444, height: 18, size: 12.5, align: "right", fills: solid("#8d95a6") }, { id: "footer-links", parentId: footer.id, content: "Product        Pricing        Docs        Contact" });

  /* ---------------------------------------------------- tablet & mobile */
  const overrides = {
    tablet: {
      hero: { height: 620 }, headline: { width: 560, height: 150, size: 52, letterSpacing: -1.8 },
      "hero-copy": { width: 520 }, "hero-card": { x: 96, y: 620, width: 576, height: 300 },
      "card-a": { height: 76 }, "card-b": { height: 76 }, "card-c": { height: 76 },
      features: { height: 900 }, "feature-1": { x: 96, y: 148, width: 576 },
      "feature-2": { x: 96, y: 388, width: 576 }, "feature-3": { x: 96, y: 628, width: 576 },
      "cta-headline": { x: 80, width: 464, size: 26 }, "cta-button": { x: 208 },
    },
    mobile: {
      header: { height: 64 }, nav: { width: 0, opacity: 0 }, "header-cta": { width: 96, height: 34 },
      hero: { height: 640 }, eyebrow: { x: 24 }, headline: { x: 24, width: 342, height: 132, size: 40, letterSpacing: -1.2 },
      "hero-copy": { x: 24, y: 296, width: 342, size: 15 },
      "cta-primary": { x: 24, y: 420, width: 168, height: 48 }, "cta-secondary": { x: 204, y: 420, width: 148, height: 48 },
      "hero-card": { x: 24, y: 500, width: 342, height: 300 },
      "card-a": { width: 290, height: 76 }, "card-b": { width: 290, height: 76 }, "card-c": { width: 290, height: 76 },
      "row-a-copy": { width: 200 }, "row-b-copy": { width: 200 }, "row-c-copy": { width: 200 },
      features: { height: 1080 }, "features-title": { x: 24, width: 342, size: 28 },
      "feature-1": { x: 24, y: 140, width: 342 }, "feature-2": { x: 24, y: 380, width: 342 }, "feature-3": { x: 24, y: 620, width: 342 },
      "feature-copy-1": { width: 290 }, "feature-copy-2": { width: 290 }, "feature-copy-3": { width: 290 },
      "cta-banner": { x: 24, width: 342, height: 240 },
      "cta-headline": { x: 26, y: 44, width: 290, size: 22 }, "cta-button": { x: 91, y: 140 },
      footer: { height: 160 }, "footer-links": { x: 24, y: 100, width: 342, align: "left" },
    },
  };
  Object.entries(overrides).forEach(([device, map]) => {
    Object.entries(map).forEach(([id, patch]) => {
      const n = page.nodes.find((x) => x.id === id);
      if (n) n.responsive[device] = patch;
    });
  });

  page.responsive = { tablet: { width: 768, height: 1700 }, mobile: { width: 390, height: 1900 } };
  page.height = 1500;
  return C.normalizeProject(project);
}
