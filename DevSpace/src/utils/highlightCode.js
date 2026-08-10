import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import sql from "highlight.js/lib/languages/sql";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import php from "highlight.js/lib/languages/php";
import kotlin from "highlight.js/lib/languages/kotlin";
import swift from "highlight.js/lib/languages/swift";
import dart from "highlight.js/lib/languages/dart";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";

let registered = false;

function ensureHighlight() {
  if (registered) return;
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("csharp", csharp);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("go", go);
  hljs.registerLanguage("rust", rust);
  hljs.registerLanguage("php", php);
  hljs.registerLanguage("kotlin", kotlin);
  hljs.registerLanguage("swift", swift);
  hljs.registerLanguage("dart", dart);
  hljs.registerLanguage("cpp", cpp);
  hljs.registerLanguage("c", c);
  registered = true;
}

const ALIAS = {
  js: "javascript",
  javascript: "javascript",
  jsx: "javascript",
  ts: "typescript",
  typescript: "typescript",
  tsx: "typescript",
  py: "python",
  python: "python",
  java: "java",
  sql: "sql",
  cs: "csharp",
  csharp: "csharp",
  "c#": "csharp",
  css: "css",
  html: "xml",
  xml: "xml",
  json: "json",
  bash: "bash",
  shell: "bash",
  sh: "bash",
  go: "go",
  rust: "rust",
  php: "php",
  kotlin: "kotlin",
  swift: "swift",
  dart: "dart",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
};

export function normalizeHighlightLang(language) {
  return ALIAS[String(language || "").trim().toLowerCase()] || "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function highlightCode(language, code) {
  const source = String(code || "");
  if (!source) return "";
  ensureHighlight();
  const lang = normalizeHighlightLang(language);
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(source, { language: lang, ignoreIllegals: true }).value;
    }
  } catch {
    // fallback abaixo
  }
  return escapeHtml(source);
}
