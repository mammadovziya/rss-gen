import * as cheerio from "cheerio";
import type { ExtractionIssue, SourceConfig } from "../types";
import { normalizeText } from "../utils";
import { detectBlocked } from "./block-detection";
import { fetchBrowserDocument } from "./browser-fetch";
import { fetchStaticDocument, type FetchedDocument } from "./static-fetch";

export type BuilderSnapshot = {
  html: string;
  finalUrl: string;
  strategy: "static" | "browser";
  status?: number;
  issues: ExtractionIssue[];
};

export async function createBuilderSnapshot(source: SourceConfig): Promise<BuilderSnapshot> {
  const document = await fetchForBuilder(source);
  const issues = detectBlocked(document.status, document.html);

  return {
    html: prepareBuilderHtml(document.html, document.finalUrl),
    finalUrl: document.finalUrl,
    strategy: document.strategy,
    status: document.status,
    issues
  };
}

async function fetchForBuilder(source: SourceConfig): Promise<FetchedDocument> {
  if (source.mode === "static") {
    return fetchStaticDocument(source.url, source.browser);
  }

  try {
    return await fetchBrowserDocument(source.url, source.browser);
  } catch (error) {
    if (source.mode === "browser") throw error;
    return fetchStaticDocument(source.url, source.browser);
  }
}

function prepareBuilderHtml(html: string, finalUrl: string): string {
  const $ = cheerio.load(html);

  $("script, noscript, iframe, object, embed").remove();
  $("meta[http-equiv]").each((_, element) => {
    const httpEquiv = normalizeText($(element).attr("http-equiv")).toLowerCase();
    if (httpEquiv === "content-security-policy" || httpEquiv === "refresh") {
      $(element).remove();
    }
  });

  $("a[href]").attr("target", "_self");
  $("form").attr("onsubmit", "return false");
  $("base").remove();

  const head = $("head");
  if (head.length === 0) {
    $("html").prepend("<head></head>");
  }

  $("head").prepend(`<base href="${escapeAttribute(finalUrl)}">`);
  $("head").append(`<style>${builderStyle()}</style>`);
  $("body").append(`<script>${builderScript()}</script>`);

  return $.html();
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function builderStyle(): string {
  return `
    html.rss-builder-active, html.rss-builder-active * {
      cursor: crosshair !important;
    }
    .rss-builder-hover {
      outline: 3px solid #2867b2 !important;
      outline-offset: 3px !important;
      background-color: rgba(40, 103, 178, 0.08) !important;
    }
    .rss-builder-selected {
      outline: 3px solid #0e6b52 !important;
      outline-offset: 4px !important;
      background-color: rgba(14, 107, 82, 0.08) !important;
    }
    .rss-builder-card-match {
      outline: 2px dashed #d95f2a !important;
      outline-offset: 5px !important;
    }
  `;
}

function builderScript(): string {
  return String.raw`
(() => {
  const state = {
    activeField: "item",
    itemSelector: "",
    selections: {}
  };
  const selectedClass = "rss-builder-selected";
  const cardMatchClass = "rss-builder-card-match";
  let hoverElement = null;

  document.documentElement.classList.add("rss-builder-active");

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "rss-builder-state") return;
    state.activeField = event.data.activeField || "item";
    state.itemSelector = event.data.itemSelector || "";
    state.selections = event.data.selections || {};
    renderSelections();
  });

  document.addEventListener("mouseover", (event) => {
    const element = normalizeTarget(event.target, state.activeField);
    if (!element || element === hoverElement) return;
    clearHover();
    hoverElement = element;
    hoverElement.classList.add("rss-builder-hover");
  }, true);

  document.addEventListener("mouseout", clearHover, true);

  document.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const element = normalizeTarget(event.target, state.activeField);
    if (!element) return;

    const selection = makeSelection(element, state.activeField);
    state.selections[state.activeField] = selection.selector;

    if (state.activeField === "item") {
      state.itemSelector = selection.selector;
    }

    renderSelections();
    window.parent.postMessage({
      type: "rss-builder-selection",
      selection
    }, "*");
  }, true);

  function clearHover() {
    if (!hoverElement) return;
    hoverElement.classList.remove("rss-builder-hover");
    hoverElement = null;
  }

  function normalizeTarget(target, field) {
    if (!(target instanceof Element)) return null;
    if (target.closest("html") !== document.documentElement) return null;
    if (field === "item") {
      return bestItemAncestor(target) || target;
    }
    if (field === "title") return target.closest("h1,h2,h3,a,[class*='title'],[data-testid*='title']") || target;
    if (field === "link") return target.closest("a[href]") || target;
    if (field === "image") return target.closest("img,source,picture,[style*='background']") || target;
    if (field === "date") return target.closest("time,[datetime],[content]") || target;
    return target;
  }

  function bestItemAncestor(target) {
    const ancestors = [];
    let current = target;
    while (current && current !== document.body && current !== document.documentElement && ancestors.length < 14) {
      if (current instanceof Element && !current.closest("nav,header,footer,aside,form")) {
        ancestors.push(current);
      }
      current = current.parentElement;
    }

    const scored = ancestors
      .map((element) => ({ element, score: itemAncestorScore(element) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored[0]?.element || target.closest("article,li,section,[itemtype*='Article'],[class*='article'],[class*='card'],[class*='entry'],[class*='item'],[class*='post'],[class*='story'],[data-testid*='article'],[data-testid*='post']");
  }

  function itemAncestorScore(element) {
    const rect = element.getBoundingClientRect();
    const classText = String(element.className || "");
    const markerText = (element.tagName + " " + classText + " " + (element.getAttribute("data-testid") || "")).toLowerCase();
    const textLength = (element.textContent || "").replace(/\s+/g, " ").trim().length;
    const candidates = candidateSelectors(element).map((selector) => ({
      selector,
      count: safeQueryAll(document, selector).length
    }));
    const repeat = candidates.find((candidate) => candidate.count > 1 && candidate.count < 300);

    let score = 0;
    if (repeat) score += 70 - Math.min(repeat.count, 80) / 4;
    if (/article|product|prod|card|tile|item|post|entry|story|result|listing|offer/.test(markerText)) score += 45;
    if (/^(article|li|section)$/i.test(element.tagName)) score += 22;
    if (element.querySelector("a[href]")) score += 12;
    if (element.querySelector("img,source,picture")) score += 10;
    if (rect.width >= 120 && rect.height >= 80) score += 18;
    if (textLength >= 20 && textLength <= 1800) score += 12;
    if (rect.height > window.innerHeight * 1.6 || textLength > 2500) score -= 65;
    if (/container|wrapper|layout|main|content|grid|list/.test(markerText) && textLength > 1200) score -= 35;

    return score;
  }

  function makeSelection(element, field) {
    const card = field !== "item" && state.itemSelector ? element.closest(state.itemSelector) : null;
    const selector = field === "item"
      ? selectorForItem(element)
      : card
        ? selectorInside(card, element)
        : selectorForElement(element, { preferMultiple: false });

    const countRoot = field === "item" ? document : (card || document);
    const count = safeQueryAll(countRoot, selector).length;
    const attr = guessAttr(element, field);
    const sample = sampleValue(element, attr);

    return {
      field,
      selector,
      attr,
      sample,
      count,
      tagName: element.tagName.toLowerCase()
    };
  }

  function selectorForItem(element) {
    const candidates = candidateSelectors(element);
    const matching = candidates
      .map((selector) => ({ selector, count: safeQueryAll(document, selector).length }))
      .filter((candidate) => candidate.count > 1 && candidate.count < 500);

    if (matching.length > 0) {
      matching.sort((a, b) => selectorScore(a.selector, true) - selectorScore(b.selector, true));
      return matching[0].selector;
    }

    return selectorForElement(element, { preferMultiple: false });
  }

  function selectorInside(root, element) {
    const candidates = candidateSelectors(element);
    const usable = candidates
      .map((selector) => ({
        selector,
        count: safeQueryAll(root, selector).length,
        coverage: coverageAcrossCards(selector)
      }))
      .filter((candidate) => candidate.count > 0 && candidate.count < 8);

    if (usable.length > 0) {
      usable.sort((a, b) => b.coverage - a.coverage || selectorScore(a.selector, false) - selectorScore(b.selector, false));
      return usable[0].selector;
    }

    const parts = [];
    let current = element;
    while (current && current !== root && current.nodeType === 1) {
      parts.unshift(segment(current));
      const selector = parts.join(" > ");
      if (safeQueryAll(root, selector).includes(element)) return selector;
      current = current.parentElement;
    }
    return segment(element);
  }

  function coverageAcrossCards(selector) {
    if (!state.itemSelector) return 0;
    const cards = safeQueryAll(document, state.itemSelector).slice(0, 30);
    return cards.filter((card) => safeQueryAll(card, selector).length > 0).length;
  }

  function selectorForElement(element, options) {
    const candidates = candidateSelectors(element);
    for (const selector of candidates) {
      const count = safeQueryAll(document, selector).length;
      if (options.preferMultiple ? count > 1 : count === 1) return selector;
    }

    const parts = [];
    let current = element;
    while (current && current !== document.body && current.nodeType === 1) {
      parts.unshift(segment(current));
      const selector = parts.join(" > ");
      if (safeQueryAll(document, selector).length === 1) return selector;
      current = current.parentElement;
    }
    return parts.join(" > ") || element.tagName.toLowerCase();
  }

  function candidateSelectors(element) {
    const tag = element.tagName.toLowerCase();
    const candidates = [];
    const id = element.getAttribute("id");
    if (id && isStableToken(id)) candidates.push(tag + "#" + cssEscape(id), "#" + cssEscape(id));

    const heading = element.closest("h1,h2,h3");
    if (heading && element.matches("a[href]")) {
      candidates.push(heading.tagName.toLowerCase() + " a[href]");
    }

    for (const attr of ["data-testid", "data-test", "data-cy", "itemtype", "role"]) {
      const value = element.getAttribute(attr);
      if (value && value.length < 90) candidates.push(tag + "[" + attr + "='" + quote(value) + "']");
    }

    const classes = [...element.classList].filter(isStableToken).slice(0, 4);
    for (let i = Math.min(classes.length, 3); i >= 1; i--) {
      candidates.push(tag + classes.slice(0, i).map((name) => "." + cssEscape(name)).join(""));
    }

    if (tag === "article" || tag === "li" || tag === "section") candidates.push(tag);
    if (element.matches("[itemtype*='Article']")) candidates.push("[itemtype*='Article']");
    if (element.matches("time")) candidates.push("time");
    if (element.matches("img")) candidates.push("img");
    if (element.matches("a[href]")) candidates.push("a[href]");
    if (element.matches("h1,h2,h3")) candidates.push(tag);

    return [...new Set(candidates)].filter(Boolean);
  }

  function segment(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");
    if (id && isStableToken(id)) return tag + "#" + cssEscape(id);

    const classes = [...element.classList].filter(isStableToken).slice(0, 2);
    let value = tag + classes.map((name) => "." + cssEscape(name)).join("");

    if (!element.parentElement) return value;
    const siblings = [...element.parentElement.children].filter((sibling) => sibling.tagName === element.tagName);
    if (siblings.length > 1) value += ":nth-of-type(" + (siblings.indexOf(element) + 1) + ")";
    return value;
  }

  function selectorScore(selector, itemMode) {
    let score = selector.length;
    if (selector.includes(":nth-of-type")) score += 80;
    if (/^(article|li|section)$/.test(selector)) score -= itemMode ? 35 : 0;
    if (selector.includes("[data-testid")) score -= 25;
    if (selector.includes("#")) score += itemMode ? 45 : -20;
    return score;
  }

  function guessAttr(element, field) {
    if (field === "title" || field === "summary" || field === "item") return "text";
    if (field === "link") return "href";
    if (field === "image") return "src";
    if (field === "date" && element.hasAttribute("datetime")) return "datetime";
    if (element.hasAttribute("content") && field !== "title") return "content";
    if (element.hasAttribute("href")) return "href";
    if (element.hasAttribute("src") || element.hasAttribute("srcset")) return "src";
    return "text";
  }

  function sampleValue(element, attr) {
    if (attr === "href") return absolute(element.getAttribute("href") || "");
    if (attr === "src") return absolute(element.getAttribute("src") || firstSrcset(element.getAttribute("srcset")) || "");
    if (attr === "datetime") return element.getAttribute("datetime") || "";
    if (attr === "content") return element.getAttribute("content") || "";
    if (attr === "html") return (element.innerHTML || "").trim().slice(0, 220);
    return (element.textContent || element.getAttribute("alt") || element.getAttribute("title") || "").replace(/\s+/g, " ").trim().slice(0, 220);
  }

  function absolute(value) {
    if (!value) return "";
    try { return new URL(value, document.baseURI).toString(); } catch { return value; }
  }

  function firstSrcset(value) {
    return value ? value.split(",")[0].trim().split(/\s+/)[0] : "";
  }

  function renderSelections() {
    document.querySelectorAll("." + selectedClass + ",." + cardMatchClass).forEach((element) => {
      element.classList.remove(selectedClass, cardMatchClass);
    });

    for (const [field, selector] of Object.entries(state.selections)) {
      if (!selector) continue;
      const matches = safeQueryAll(document, selector);
      for (const match of matches.slice(0, field === "item" ? 60 : 10)) {
        match.classList.add(field === "item" ? cardMatchClass : selectedClass);
      }
    }
  }

  function safeQueryAll(root, selector) {
    try { return [...root.querySelectorAll(selector)]; } catch { return []; }
  }

  function isStableToken(value) {
    if (!value || value.length > 80) return false;
    if (/rss-builder/.test(value)) return false;
    if (/^(active|current|disabled|enabled|false|focus|hover|open|selected|true)$/i.test(value)) return false;
    if (/^[a-z0-9_-]*[0-9a-f]{8,}[a-z0-9_-]*$/i.test(value)) return false;
    if (/^(css|jsx|style|sc)-/.test(value)) return false;
    return /^[A-Za-z_-][A-Za-z0-9_-]*$/.test(value);
  }

  function cssEscape(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/[^A-Za-z0-9_-]/g, "\\$&");
  }

  function quote(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }
})();
`;
}
