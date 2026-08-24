/* VBuilder 2 — code generation
   One document model → vanilla HTML/CSS/JS, React, Tailwind, or a Node/Express bundle.
   Auto-layout frames become flexbox; free layers become fluid absolute positioning. */

import * as C from "./core.js";
import { fillCss, withAlpha, effectsCss, readableOn, strokeStyle } from "./canvas.js";
import * as F from "./fonts.js";

/* ------------------------------------------------------------------ shared */

const pct = (value, total) => `${((C.num(value) / Math.max(1, total)) * 100).toFixed(4)}%`;
const cq = (value, total) => `calc(${((C.num(value) / Math.max(1, total)) * 100).toFixed(5)}cqw)`;
const cls = (id) => C.safeClass(`vb-${id}`);
const radiusCss = (r) => {
  if (!r) return "0";
  const { tl = 0, tr = 0, br = 0, bl = 0 } = r;
  return tl === tr && tr === br && br === bl ? `${C.num(tl)}px` : `${C.num(tl)}px ${C.num(tr)}px ${C.num(br)}px ${C.num(bl)}px`;
};

function gradientCss(fill, total) {
  const stops = (fill.stops || []).map((s) => `${s.color} ${C.num(s.at)}%`).join(", ");
  return fill.type === "radial" ? `radial-gradient(circle at 50% 50%, ${stops})` : `linear-gradient(${C.num(fill.angle, 90)}deg, ${stops})`;
}
function exportBackground(fills, total) {
  const list = (fills || []).filter((f) => f && C.num(f.opacity, 100) > 0);
  if (!list.length) return "transparent";
  return list.map((f) => (f.type === "solid"
    ? withAlpha(f.color, C.clamp(C.num(f.opacity, 100), 0, 100) / 100)
    : gradientCss(f, total))).reverse().join(", ");
}

/* ---------------------------------------------------------- per-node rules */

export function nodeCss(node, device = "desktop") {
  const p = C.propsOf(node, device);
  const container = C.containerRect(node, device);
  const lines = [];
  const isAuto = !!node.parentId && !!C.node(node.parentId)?.base.layout;

  if (!isAuto) lines.push("position: absolute");
  if (!isAuto) {
    const right = container.width - C.num(p.x) - C.num(p.width);
    const behaviour = p.responsiveBehavior || "scale";
    if (behaviour === "stretch") {
      lines.push(`left: ${pct(p.x, container.width)}`, `right: ${pct(right, container.width)}`, "width: auto");
    } else if (behaviour === "right") {
      lines.push(`right: ${pct(right, container.width)}`, `width: ${pct(p.width, container.width)}`);
    } else if (behaviour === "center") {
      lines.push("left: 50%", `margin-left: ${pct(-C.num(p.width) / 2, container.width)}`, `width: ${pct(p.width, container.width)}`);
    } else {
      lines.push(`left: ${pct(p.x, container.width)}`, `width: ${pct(p.width, container.width)}`);
    }
    lines.push(`top: ${pct(p.y, container.height)}`, `height: ${pct(p.height, container.height)}`);
  } else {
    lines.push("position: relative");
    if (node.base.sizing?.w === "fill") lines.push("flex: 1 1 0", "min-width: 0");
    else lines.push(`width: ${C.round(C.num(p.width))}px`);
    if (node.base.sizing?.h === "fill") lines.push("align-self: stretch");
    else lines.push(`height: ${C.round(C.num(p.height))}px`);
  }

  lines.push(`z-index: ${C.page().nodes.indexOf(node) + 1}`);
  lines.push(`opacity: ${C.clamp(C.num(p.opacity, 100), 0, 100) / 100}`);
  if (node.type !== "ellipse") lines.push(`border-radius: ${node.type === "image" || node.type === "frame" || node.type === "rect" || node.type === "button" ? cq(C.num(Object.values(p.radius || { tl: 0 }).length ? (p.radius.tl + p.radius.tr + p.radius.br + p.radius.bl) / 4 : 0), container.width) : "0"}`);
  else lines.push("border-radius: 50%");
  const st = strokeStyle(p.strokes);
  lines.push(`border: ${st.border}`);

  const fx = effectsCss(p.effects);
  const shadows = [st.shadow, fx.boxShadow !== "none" ? fx.boxShadow : ""].filter(Boolean).join(", ");
  if (shadows) lines.push(`box-shadow: ${shadows}`);
  if (fx.filter !== "none") lines.push(`filter: ${fx.filter}`);
  if (fx.backdropFilter !== "none") lines.push(`-webkit-backdrop-filter: ${fx.backdropFilter}`, `backdrop-filter: ${fx.backdropFilter}`);
  if (p.blend && p.blend !== "normal") lines.push(`mix-blend-mode: ${p.blend}`);
  if (p.rotation || p.flipX || p.flipY) lines.push(`transform: rotate(${C.num(p.rotation)}deg) scaleX(${p.flipX ? -1 : 1}) scaleY(${p.flipY ? -1 : 1})`);

  if (node.type === "text" || node.type === "button") {
    if (node.type === "button") lines.push(`background: ${exportBackground(p.fills, container.width)}`);
    lines.push(
      `color: ${node.type === "button" ? readableOn(p.fills) : ((p.fills || []).find((f) => f.type === "solid")?.color || "#f2f3f7")}`,
      `font-family: ${p.family || "Inter, sans-serif"}`,
      `font-size: ${cq(C.num(p.size, 16), container.width)}`,
      `font-weight: ${p.weight || 400}`,
      `line-height: ${p.lineHeight || 1.5}`,
      `letter-spacing: ${cq(C.num(p.letterSpacing), container.width)}`,
      `text-align: ${p.align || "left"}`,
      `display: flex`, `flex-direction: column`,
      `justify-content: ${p.valign === "center" ? "center" : p.valign === "bottom" ? "flex-end" : "flex-start"}`,
      `align-items: ${p.align === "center" ? "center" : p.align === "right" ? "flex-end" : "flex-start"}`,
      "white-space: pre-wrap", "word-break: break-word", "overflow: hidden",
    );
    if (p.transform && p.transform !== "none") lines.push(`text-transform: ${p.transform}`);
    if (p.decoration && p.decoration !== "none") lines.push(`text-decoration: ${p.decoration}`);
    if (node.type === "button") lines.push("cursor: pointer", "appearance: none", "font: inherit", `font-size: ${cq(C.num(p.size, 14), container.width)}`);
  } else if (node.type === "image") {
    lines.push("display: block", `background: ${exportBackground(p.fills, container.width)}`, `object-fit: ${p.objectFit || "cover"}`, `object-position: ${p.objectPosition || "center center"}`);
  } else if (node.type === "icon") {
    lines.push("display: block", "line-height: 0", `color: ${(p.fills || []).find((f) => f.type === "solid")?.color || "#e8eaef"}`);
  } else if (node.type === "star" || node.type === "arrow") {
    lines.push("line-height: 0", "overflow: visible");
  } else {
    lines.push(`background: ${exportBackground(p.fills, container.width)}`);
    if (node.type === "frame") {
      lines.push("overflow: hidden", "container-type: inline-size");
      if (p.layout) {
        lines.push("display: flex", `flex-direction: ${p.layout.mode === "row" ? "row" : "column"}`,
          `gap: ${C.num(p.layout.gap)}px`,
          `padding: ${C.num(p.layout.pad?.t)}px ${C.num(p.layout.pad?.r)}px ${C.num(p.layout.pad?.b)}px ${C.num(p.layout.pad?.l)}px`,
          `align-items: ${p.layout.align === "center" ? "center" : p.layout.align === "end" ? "flex-end" : p.layout.align === "stretch" ? "stretch" : "flex-start"}`,
          `justify-content: ${p.layout.justify === "center" ? "center" : p.layout.justify === "end" ? "flex-end" : p.layout.justify === "between" ? "space-between" : "flex-start"}`);
      }
    } else if (node.type !== "ellipse") {
      lines.push("overflow: hidden");
    }
  }
  if (p.action?.type && p.action.type !== "none") lines.push("cursor: pointer");
  return lines.join(";\n  ") + ";";
}

/* ---------------------------------------------------------------- animation */

const KEYFRAMES = {
  fade: "from{opacity:0}to{opacity:1}",
  "fade-up": "from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}",
  "fade-down": "from{opacity:0;transform:translateY(-24px)}to{opacity:1;transform:none}",
  "slide-left": "from{opacity:0;transform:translateX(-48px)}to{opacity:1;transform:none}",
  "slide-right": "from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:none}",
  scale: "from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}",
  "scale-down": "from{opacity:0;transform:scale(1.08)}to{opacity:1;transform:scale(1)}",
  rotate: "from{opacity:0;transform:rotate(-12deg) scale(.94)}to{opacity:1;transform:none}",
  blur: "from{opacity:0;filter:blur(12px)}to{opacity:1;filter:blur(0)}",
  bounce: "0%{opacity:0;transform:translateY(40px)}60%{opacity:1;transform:translateY(-8px)}100%{opacity:1;transform:none}",
  flip: "from{opacity:0;transform:perspective(600px) rotateY(-70deg)}to{opacity:1;transform:perspective(600px) rotateY(0)}",
  "grow-width": "from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}",
  pop: "0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}",
  pulse: "0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.05)}",
  float: "0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}",
  shake: "0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}",
  wiggle: "0%,100%{transform:rotate(0deg)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}",
  spin: "from{opacity:0;transform:rotate(-180deg) scale(.6)}to{opacity:1;transform:rotate(0deg) scale(1)}",
};

function animationCss(nodes) {
  const used = new Set();
  const rules = [];
  nodes.forEach((n) => {
    const a = C.propsOf(n).animation;
    if (!a || a.type === "none" || !KEYFRAMES[a.type]) return;
    used.add(a.type);
    const name = `vb-${a.type}`;
    const shorthand = `${name} ${C.num(a.duration, 600)}ms ${C.EASINGS[a.easing] || "ease"} ${C.num(a.delay)}ms both`;
    const iter = a.repeat === 0 ? "animation-iteration-count: infinite;"
      : C.num(a.repeat, 1) > 1 ? `animation-iteration-count: ${C.num(a.repeat, 1)};` : "";
    const sel = `.${cls(n.id)}`;
    if (a.trigger === "scroll") {
      rules.push(`${sel}{opacity:0}`, `${sel}.is-visible{animation:${shorthand};${iter}}`);
    } else if (a.trigger === "hover") {
      rules.push(`${sel}:hover{animation:${shorthand};${iter}}`);
    } else if (a.trigger === "click") {
      rules.push(`${sel}.is-playing{animation:${shorthand};${iter}}`);
    } else {
      rules.push(`${sel}{animation:${shorthand};${iter}}`);
    }
  });
  const frames = [...used].map((type) => `@keyframes vb-${type}{${KEYFRAMES[type]}}`);
  return [...frames, ...rules].join("\n");
}

/* --------------------------------------------------------------------- CSS */

export function buildCss(page = C.page()) {
  const desktop = { width: page.width, height: page.height };
  const out = [
    `${F.cssImports(F.usedGoogleFamilies())}${F.fontFaceCss()}/* Generated by VBuilder 2 — do not edit by hand; regenerate from the canvas. */`,
    "*,*::before,*::after{box-sizing:border-box}",
    "html,body{margin:0;min-height:100%}",
    `body{background:${page.background};color:#f2f3f7;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}`,
    `img{max-width:100%}`,
    `.vb-page{position:relative;width:100%;aspect-ratio:${desktop.width} / ${desktop.height};margin:0;overflow:hidden;container-type:inline-size;background:${page.background}}`,
  ];

  const writeNodes = (device) => page.nodes.filter((n) => n.visible).forEach((n) => {
    out.push(`.${cls(n.id)}{`, `  ${nodeCss(n, device).split("\n").join("\n  ")}`, "}");
  });
  writeNodes("desktop");

  ["tablet", "mobile"].forEach((device) => {
    const preset = C.DEVICES[device];
    const size = C.pageRect(device);
    out.push("", `@media (max-width: ${preset.media}px) {`);
    out.push(`  .vb-page{aspect-ratio:${size.width} / ${size.height}}`);
    page.nodes.filter((n) => n.visible).forEach((n) => {
      out.push(`  .${cls(n.id)}{`, `    ${nodeCss(n, device).split("\n").join("\n    ")}`, "  }");
    });
    out.push("}");
  });

  out.push("", "@media (prefers-reduced-motion: reduce){*{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}}");
  const anim = animationCss(page.nodes);
  if (anim) out.push("", anim);
  return out.join("\n");
}

/* -------------------------------------------------------------------- HTML */

function nodeMarkup(node, page, opts = {}) {
  const { inlineAssets = false, indent = "    ", flavour = "html" } = opts;
  const klass = cls(node.id);
  const p = C.propsOf(node);
  const action = p.action || {};
  const interactive = action.type && action.type !== "none";
  const anim = p.animation?.type && p.animation.type !== "none" && p.animation.trigger === "scroll" ? " vb-scroll" : "";
  const inner = (node.content || "").split("\n").map((line) => C.escapeHtml(line)).join("<br>");

  const attrs = [];
  if (interactive) {
    if (action.type === "link") attrs.push(`data-action="link" data-href="${C.escapeAttr(action.url || "#")}" data-target="${C.escapeAttr(action.target || "_self")}"`);
    else if (action.type === "scroll") attrs.push(`data-action="scroll" data-target="${C.escapeAttr(action.targetId || "")}"`);
    else if (action.type === "toggle") attrs.push(`data-action="toggle" data-target="${C.escapeAttr(action.targetId || "")}"`);
    else if (action.type === "navigate") attrs.push(`data-action="navigate" data-page="${C.escapeAttr(action.pageId || "")}"`);
    else if (action.type === "back") attrs.push(`data-action="top"`);
    else if (action.type === "animate") attrs.push(`data-action="animate"`);
    attrs.push(`role="button" tabindex="0"`);
  }

  if (node.type === "text") return `${indent}<div class="${klass}${anim}" ${attrs.join(" ")}>${inner}</div>`;

  if (node.type === "button") {
    const tag = action.type === "link" && flavour === "html" ? "a" : "button";
    const extra = tag === "a" ? ` href="${C.escapeAttr(action.url || "#")}"${action.target === "_blank" ? ' target="_blank" rel="noopener"' : ""}` : ` type="button"`;
    return `${indent}<${tag} class="${klass}${anim}"${extra} ${attrs.join(" ")}><span>${inner || "Button"}</span></${tag}>`;
  }

  if (node.type === "image") {
    const a = C.asset(node.assetId);
    if (!a?.src) return `${indent}<div class="${klass}${anim}" ${attrs.join(" ")}></div>`;
    const src = inlineAssets ? a.src : `assets/${C.escapeAttr(a.file || a.name)}`;
    return `${indent}<img class="${klass}${anim}" src="${src}" alt="${C.escapeAttr(node.alt || a.name || "")}" loading="lazy" ${attrs.join(" ")}>`;
  }

  if (node.type === "icon") {
    const path = ICON_PATH(p.icon || node.base.icon || "sparkles");
    return `${indent}<span class="${klass}${anim}" ${attrs.join(" ")} aria-hidden="true"><svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="${C.num(p.strokeWidth, 2)}" stroke-linecap="round" stroke-linejoin="round">${path}</svg></span>`;
  }

  if (node.type === "star") {
    return `${indent}<span class="${klass}${anim}" ${attrs.join(" ")} aria-hidden="true"><svg viewBox="0 0 24 24" preserveAspectRatio="none" width="100%" height="100%"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z" fill="${(p.fills || []).find((f) => f.type === "solid")?.color || "#3b82f6"}"/></svg></span>`;
  }

  if (node.type === "arrow") {
    const c = (p.strokes || []).find((s) => s.width > 0)?.color || "#3a3f4d";
    return `${indent}<span class="${klass}${anim}" ${attrs.join(" ")} aria-hidden="true"><svg viewBox="0 0 100 24" preserveAspectRatio="none" width="100%" height="100%"><path d="M0 12h88M78 4l12 8-12 8" fill="none" stroke="${c}" stroke-width="${C.num(p.strokes?.[0]?.width, 2)}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg></span>`;
  }

  const kids = page.nodes.filter((n) => n.visible && n.parentId === node.id).map((n) => nodeMarkup(n, page, { ...opts, indent: `${indent}  ` })).join("\n");
  return `${indent}<div class="${klass}${anim}" ${attrs.join(" ")}>${kids ? `\n${kids}\n${indent}` : ""}</div>`;
}

let iconPathCache = null;
function ICON_PATH(name) {
  if (!iconPathCache) {
    iconPathCache = {};
    try {
      // Lazy import would be async; the icon set is small enough to re-read synchronously here.
      const src = globalThis.__VB_ICONS__;
      if (src) iconPathCache = src;
    } catch { /* fall through to a neutral shape */ }
  }
  return iconPathCache?.[name] || '<rect x="4" y="4" width="16" height="16" rx="2"/>';
}
export function registerIcons(map) { iconPathCache = map; }

export function buildHtml(page = C.page(), opts = {}) {
  const { inline = false, css = null, script = null, title = null } = opts;
  const roots = page.nodes.filter((n) => n.visible && !n.parentId).map((n) => nodeMarkup(n, page, { inlineAssets: inline })).join("\n");
  const name = C.escapeHtml(title || C.project().name || "VBuilder site");
  if (inline) {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
${F.fontLinksHtml(F.usedGoogleFamilies())}
<style>
${F.fontFaceCss()}
${css ?? buildCss(page)}
</style>
</head>
<body>
  <main class="vb-page">
${roots}
  </main>
<script>
${script ?? buildRuntime(page)}
<\/script>
</body>
</html>`;
  }
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="VBuilder 2">
  <title>${name}</title>
  ${F.fontLinksHtml(["Inter", ...F.usedGoogleFamilies()])}
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="vb-page">
${roots}
  </main>
  <script src="script.js"></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ runtime */

export function buildRuntime(page = C.page()) {
  const pages = C.project().pages.map((p) => ({ id: p.id, name: p.name }));
  return `// Generated by VBuilder 2 — runtime for interactions and scroll-triggered animation.
(function () {
  "use strict";
  var PAGES = ${JSON.stringify(pages)};

  function on(el, type, fn) { el.addEventListener(type, fn); }

  // Layer ids become class names like ".vb-<id>"; keep the lookup in one place.
  function layerNode(id) {
    if (!id) return null;
    return document.querySelector(".vb-" + String(id).replace(/[^a-zA-Z0-9_-]/g, "-"));
  }

  // Scroll-triggered animations.
  var observed = document.querySelectorAll(".vb-scroll");
  if ("IntersectionObserver" in window && observed.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    observed.forEach(function (el) { io.observe(el); });
  } else {
    observed.forEach(function (el) { el.classList.add("is-visible"); });
  }

  function playAnimation(el) {
    el.classList.remove("is-playing");
    void el.offsetWidth; // restart the CSS animation
    el.classList.add("is-playing");
  }

  function activate(el) {
    var action = el.getAttribute("data-action");
    if (action === "link") {
      var href = el.getAttribute("data-href") || "#";
      var target = el.getAttribute("data-target") || "_self";
      if (target === "_blank") { window.open(href, "_blank", "noopener"); return; }
      if (href.charAt(0) === "#") {
        var anchor = layerNode(href.slice(1));
        if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.location.hash = href;
        return;
      }
      window.location.href = href;
      return;
    }
    if (action === "scroll") {
      var id = el.getAttribute("data-target");
      if (!id) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      var node = layerNode(id);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "toggle") {
      var node2 = layerNode(el.getAttribute("data-target"));
      if (node2) node2.style.display = node2.style.display === "none" ? "" : "none";
      return;
    }
    if (action === "navigate") {
      var pageId = el.getAttribute("data-page");
      var match = PAGES.filter(function (p) { return p.id === pageId; })[0];
      if (match) window.location.href = match.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html";
      return;
    }
    if (action === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (action === "animate") { playAnimation(el); return; }
  }

  document.querySelectorAll("[data-action]").forEach(function (el) {
    on(el, "click", function (event) {
      if (el.tagName === "A" && el.getAttribute("data-action") === "link") return; // native navigation
      event.preventDefault();
      activate(el);
    });
    on(el, "keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(el); }
    });
  });

  document.documentElement.classList.add("vb-ready");
})();`;
}

/* -------------------------------------------------------------------- React */

function jsxNode(node, page, indent = "      ") {
  const p = C.propsOf(node);
  const klass = cls(node.id);
  const action = p.action || {};
  const props = [`className="${klass}"`];
  if (action.type === "link") props.push(`href="${C.escapeAttr(action.url || "#")}"${action.target === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : ""}`);
  else if (action.type && action.type !== "none") props.push(`onClick={() => runAction(${JSON.stringify(action)})}`);
  const text = (node.content || "").split("\n").map((l) => C.escapeHtml(l)).join("<br />");

  if (node.type === "text") return `${indent}<div ${props.join(" ")}>${text}</div>`;
  if (node.type === "button") {
    const tag = action.type === "link" ? "a" : "button";
    if (tag === "button") props.push('type="button"');
    return `${indent}<${tag} ${props.join(" ")}><span>${text || "Button"}</span></${tag}>`;
  }
  if (node.type === "image") {
    const a = C.asset(node.assetId);
    return a?.src ? `${indent}<img ${props.join(" ")} src={${JSON.stringify(`assets/${a.file || a.name}`)}} alt="${C.escapeAttr(node.alt || a.name || "")}" loading="lazy" />` : `${indent}<div ${props.join(" ")} />`;
  }
  const kids = page.nodes.filter((n) => n.visible && n.parentId === node.id).map((n) => jsxNode(n, page, `${indent}  `)).join("\n");
  return `${indent}<div ${props.join(" ")}>${kids ? `\n${kids}\n${indent}` : ""}</div>`;
}

export function buildReact(page = C.page()) {
  const roots = page.nodes.filter((n) => n.visible && !n.parentId).map((n) => jsxNode(n, page)).join("\n");
  return `// Generated by VBuilder 2 — React view of "${page.name}".
// Drop this file plus styles.css into a Vite/CRA/Next project (client component).
import "./styles.css";

const RUNTIME = typeof window !== "undefined";

export function runAction(action) {
  if (!RUNTIME || !action) return;
  if (action.type === "scroll") {
    const el = action.targetId ? document.querySelector(\`.vb-\${action.targetId}\`) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (action.type === "toggle") {
    const el = document.querySelector(\`.vb-\${action.targetId}\`);
    if (el) el.style.display = el.style.display === "none" ? "" : "none";
    return;
  }
  if (action.type === "top") window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function ${toPascal(page.name)}() {
  return (
    <main className="vb-page">
${roots}
    </main>
  );
}
`;
}

const toPascal = (v) => String(v || "Page").replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Page";

/* ----------------------------------------------------------------- Tailwind */

function tailwindNode(node, page, indent = "    ") {
  const p = C.propsOf(node);
  const container = C.containerRect(node, C.state.device);
  const t = [];
  const isAuto = !!node.parentId && !!C.node(node.parentId)?.base.layout;
  if (!isAuto) {
    t.push("absolute");
    t.push(`left-[${pct(p.x, container.width)}]`, `top-[${pct(p.y, container.height)}`);
    t.push(`w-[${pct(p.width, container.width)}]`, `h-[${pct(p.height, container.height)}]`);
  } else {
    t.push("relative");
    t.push(node.base.sizing?.w === "fill" ? "flex-1" : `w-[${C.round(C.num(p.width))}px]`);
    t.push(node.base.sizing?.h === "fill" ? "self-stretch" : `h-[${C.round(C.num(p.height))}px]`);
  }
  t.push(`opacity-[${C.clamp(C.num(p.opacity, 100), 0, 100) / 100}]`);
  if (node.type === "ellipse") t.push("rounded-full");
  else {
    const r = p.radius || {};
    t.push(`rounded-[${C.num(r.tl)}px_${C.num(r.tr)}px_${C.num(r.br)}px_${C.num(r.bl)}px]`);
  }
  const s = (p.strokes || []).find((x) => x.width > 0);
  if (s) t.push(`border-[${C.num(s.width)}px]`, `border-[${s.color}]`);
  const bg = exportBackground(p.fills, container.width);
  if (bg !== "transparent") t.push(`bg-[${bg.replace(/\s+/g, "_")}]`);
  const fx = effectsCss(p.effects);
  if (fx.boxShadow !== "none") t.push(`shadow-[${fx.boxShadow.replace(/\s+/g, "_")}]`);
  if (p.rotation) t.push(`rotate-[${C.num(p.rotation)}deg]`);
  if (p.flipX) t.push("-scale-x-100");
  if (p.flipY) t.push("-scale-y-100");

  if (node.type === "text" || node.type === "button") {
    const c = (p.fills || []).find((f) => f.type === "solid")?.color || "#f2f3f7";
    t.push(`text-[${cq(C.num(p.size, 16), container.width)}]`, `font-[${p.weight || 400}]`, `leading-[${p.lineHeight || 1.5}]`,
      `tracking-[${cq(C.num(p.letterSpacing), container.width)}]`, `text-[${c}]`,
      p.align === "center" ? "text-center" : p.align === "right" ? "text-right" : "text-left",
      "flex", "flex-col", "whitespace-pre-wrap", "break-words", "overflow-hidden");
    if (node.type === "button") t.push("cursor-pointer", "items-center", "justify-center");
  } else if (node.type === "frame") {
    t.push("overflow-hidden", "container");
    if (p.layout) t.push("flex", p.layout.mode === "row" ? "flex-row" : "flex-col", `gap-[${C.num(p.layout.gap)}px]`,
      `pt-[${C.num(p.layout.pad?.t)}px]`, `pr-[${C.num(p.layout.pad?.r)}px]`, `pb-[${C.num(p.layout.pad?.b)}px]`, `pl-[${C.num(p.layout.pad?.l)}px]`);
  } else if (node.type === "image") {
    t.push(`object-[${p.objectFit || "cover"}]`);
  }
  if (p.action?.type && p.action.type !== "none") t.push("cursor-pointer");

  const attr = `class="${t.join(" ")}"`;
  const text = (node.content || "").split("\n").map(C.escapeHtml).join("<br>");
  if (node.type === "text") return `${indent}<div ${attr}>${text}</div>`;
  if (node.type === "button") return `${indent}<button type="button" ${attr}><span>${text || "Button"}</span></button>`;
  if (node.type === "image") {
    const a = C.asset(node.assetId);
    return a?.src ? `${indent}<img ${attr} src="assets/${C.escapeAttr(a.file || a.name)}" alt="${C.escapeAttr(node.alt || "")}" loading="lazy">` : `${indent}<div ${attr}></div>`;
  }
  const kids = page.nodes.filter((n) => n.visible && n.parentId === node.id).map((n) => tailwindNode(n, page, `${indent}  `)).join("\n");
  return `${indent}<div ${attr}>${kids ? `\n${kids}\n${indent}` : ""}</div>`;
}

export function buildTailwind(page = C.page()) {
  const size = { width: page.width, height: page.height };
  const roots = page.nodes.filter((n) => n.visible && !n.parentId).map((n) => tailwindNode(n, page)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${C.escapeHtml(C.project().name)}</title>
  <!-- Generated by VBuilder 2. For production, run the Tailwind CLI over this file
       instead of loading the play CDN: npx tailwindcss -i in.css -o out.css -->
  <script src="https://cdn.tailwindcss.com"></script>
  ${F.fontLinksHtml(F.usedGoogleFamilies())}
  <style>
    ${F.fontFaceCss()}
    .vb-page { position: relative; width: 100%; aspect-ratio: ${size.width} / ${size.height}; overflow: hidden; background: ${page.background}; container-type: inline-size; }
  </style>
</head>
<body class="bg-[${page.background}]">
  <main class="vb-page">
${roots}
  </main>
</body>
</html>`;
}

/* --------------------------------------------------------------------- Node */

export function buildNodeServer() {
  return `// Generated by VBuilder 2 — minimal Express server for the exported site.
// npm install && npm start
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.get("/health", (req, res) => res.json({ ok: true }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(\`VBuilder site listening on http://localhost:\${PORT}\`));
`;
}

export function buildNodePackage() {
  return JSON.stringify({
    name: C.slugify(C.project().name) || "vbuilder-site",
    version: "1.0.0",
    private: true,
    description: `Static site generated by VBuilder 2 from "${C.project().name}"`,
    scripts: { start: "node server.js", dev: "node --watch server.js" },
    dependencies: { express: "^4.19.2" },
    engines: { node: ">=18" },
  }, null, 2) + "\n";
}

export function buildReadme(format) {
  const names = { html: "HTML + CSS + JS", react: "React", tailwind: "Tailwind", node: "Node.js (Express)" };
  return `# ${C.project().name}

Generated by **VBuilder 2** — export format: ${names[format] || format}.

## Structure
${format === "node" ? "```\nserver.js          Express static server\npackage.json\npublic/\n  index.html\n  styles.css\n  script.js\n  assets/\n```" : "```\nindex.html\nstyles.css\nscript.js\nassets/\n```"}

## Run
${format === "node" ? "```bash\nnpm install\nnpm start   # http://localhost:3000\n```" : "Any static host works. Locally:\n\n```bash\nnpx serve .\n```"}

## Responsive behaviour
The desktop frame is fluid: every layer is positioned with percentages and
typography with container-query units (\`cqw\`), so the layout scales with the
viewport. Tablet (max-width 1024px) and mobile (max-width 767px) overrides are
emitted as media queries.

## Interactions
Buttons and any layer with an action export \`data-action\` attributes handled by
\`script.js\` (links, smooth scroll, show/hide, animation triggers). Scroll
animations use \`IntersectionObserver\` and respect \`prefers-reduced-motion\`.
`;
}

/* -------------------------------------------------------------- collection */

export function collectAssets(page = C.page()) {
  const used = new Set();
  const out = [];
  page.nodes.forEach((n) => {
    if (n.type !== "image" || !n.assetId) return;
    const a = C.asset(n.assetId);
    if (!a?.src) return;
    let name = a.file || C.slugify(a.name).replace(/\.[a-z0-9]+$/, "") + (a.name.match(/\.[a-z0-9]+$/i)?.[0] || ".png");
    if (used.has(name)) {
      const ext = name.match(/\.[^.]+$/)?.[0] || ".png";
      let i = 2;
      while (used.has(`${name.replace(/\.[^.]+$/, "")}-${i}${ext}`)) i += 1;
      name = `${name.replace(/\.[^.]+$/, "")}-${i}${ext}`;
    }
    used.add(name);
    a.file = name;
    out.push({ name, src: a.src });
  });
  return out;
}

export function buildFiles(format = "html", page = C.page()) {
  const assets = collectAssets(page);
  const css = buildCss(page);
  const script = buildRuntime(page);
  const files = [];
  const pageSlug = C.slugify(page.name) || "index";

  if (format === "react") {
    files.push({ name: `${toPascal(page.name)}.jsx`, data: buildReact(page) });
    files.push({ name: "styles.css", data: css });
    files.push({ name: "script.js", data: script });
    files.push({ name: "README.md", data: buildReadme("react") });
  } else if (format === "tailwind") {
    files.push({ name: "index.html", data: buildTailwind(page) });
    files.push({ name: "README.md", data: buildReadme("tailwind") });
  } else if (format === "node") {
    files.push({ name: "server.js", data: buildNodeServer() });
    files.push({ name: "package.json", data: buildNodePackage() });
    files.push({ name: "public/index.html", data: buildHtml(page) });
    files.push({ name: "public/styles.css", data: css });
    files.push({ name: "public/script.js", data: script });
    files.push({ name: "README.md", data: buildReadme("node") });
  } else {
    files.push({ name: "index.html", data: buildHtml(page) });
    files.push({ name: "styles.css", data: css });
    files.push({ name: "script.js", data: script });
    files.push({ name: "README.md", data: buildReadme("html") });
  }

  // Other pages ride along as their own documents for the `navigate` action.
  C.project().pages.filter((p) => p.id !== page.id).forEach((p) => {
    const prefix = format === "node" ? "public/" : "";
    const name = format === "react" ? `${toPascal(p.name)}.jsx` : format === "tailwind" ? `${pageSlugOf(p)}.html` : `${pageSlugOf(p)}.html`;
    const data = format === "react" ? buildReact(p) : format === "tailwind" ? buildTailwind(p) : buildHtml(p, { css: buildCss(p), script: buildRuntime(p) });
    files.push({ name: prefix + name, data });
  });

  assets.forEach((a) => files.push({ name: (format === "node" ? "public/" : "") + `assets/${a.name}`, data: a.src, binary: true }));
  files.push({ name: `${C.slugify(C.project().name) || "project"}.vbuilder.json`, data: JSON.stringify(C.project(), null, 2) });
  void pageSlug;
  return files;
}

const pageSlugOf = (p) => C.slugify(p.name) || "page";

/* --------------------------------------------------------------------- ZIP */

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let b = 0; b < 8; b += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const u16 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
const u32 = (v) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
const cat = (parts) => {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return out;
};

export function dataUrlToBytes(value) {
  const str = String(value || "");
  const comma = str.indexOf(",");
  if (comma === -1) return new TextEncoder().encode(str);
  const header = str.slice(0, comma);
  const body = str.slice(comma + 1);
  if (/;base64/i.test(header)) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

export function makeZip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.binary ? dataUrlToBytes(file.data) : file.data instanceof Uint8Array ? file.data : new TextEncoder().encode(String(file.data));
    const crc = crc32(data);
    locals.push(cat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data]));
    centrals.push(cat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]));
    offset += locals[locals.length - 1].length;
  });

  const localData = cat(locals);
  const centralData = cat(centrals);
  const end = cat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(localData.length), u16(0)]);
  return new Blob([localData, centralData, end], { type: "application/zip" });
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
