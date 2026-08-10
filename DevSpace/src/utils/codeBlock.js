import { normalizeHighlightLang } from "./highlightCode";

const FENCE = /```([a-zA-Z0-9_+#-]*)\s*\n([\s\S]*?)```/;

const LANGUAGE_LABELS = {
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  java: "Java",
  sql: "SQL",
  cs: "C#",
  csharp: "C#",
  "c#": "C#",
  cpp: "C++",
  "c++": "C++",
  c: "C",
  css: "CSS",
  html: "HTML",
  xml: "XML",
  json: "JSON",
  bash: "Bash",
  shell: "Shell",
  sh: "Shell",
  go: "Go",
  rust: "Rust",
  php: "PHP",
  kotlin: "Kotlin",
  swift: "Swift",
  dart: "Dart",
  react: "React",
};

export function languageLabel(language) {
  const key = String(language || "").trim().toLowerCase();
  if (!key || key === "code") return "Code";
  return LANGUAGE_LABELS[key] || language;
}

export function splitPostContent(texto) {
  const raw = String(texto || "");
  const match = raw.match(FENCE);
  if (!match) {
    return { prose: raw, language: "", code: "" };
  }
  const prose = `${raw.slice(0, match.index)}${raw.slice(match.index + match[0].length)}`.trim();
  return {
    prose,
    language: (match[1] || "code").toLowerCase(),
    code: match[2].replace(/\n$/, ""),
  };
}

export function wrapCodeFence(language, code) {
  const lang = normalizeHighlightLang(language) || String(language || "").trim().toLowerCase() || "javascript";
  return `\`\`\`${lang}\n${String(code || "").replace(/\s+$/, "")}\n\`\`\``;
}
