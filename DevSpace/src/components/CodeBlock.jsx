import { useState } from "react";
import { DsIcon } from "./icons";
import { Icons } from "./iconKit";
import { languageLabel, splitPostContent } from "../utils/codeBlock";
import { highlightCode } from "../utils/highlightCode";

export default function CodeBlock({ language = "code", code = "" }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const label = languageLabel(language);
  const html = highlightCode(language, code);

  async function copiar(event) {
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="ds-code" onClick={(event) => event.stopPropagation()}>
      <div className="ds-code-head">
        <span>{label}</span>
        <button type="button" onClick={copiar} aria-label={copied ? "Código copiado" : "Copiar código"}>
          <DsIcon icon={Icons.Copy} size="small" /> {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre>
        <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

export function PostContent({ texto, className = "", expanded = false }) {
  const [open, setOpen] = useState(false);
  const { prose, language, code } = splitPostContent(texto);
  if (!prose && !code) return null;

  const long = !expanded && prose.length > 280;
  const shown = long && !open ? `${prose.slice(0, 280).trim()}…` : prose;

  return (
    <div className={className}>
      {prose ? <p className="post-card-text">{shown}</p> : null}
      {long && (
        <button
          type="button"
          className="post-more-btn"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          {open ? "Ver menos" : "Ver mais"}
        </button>
      )}
      {code ? <CodeBlock language={language} code={code} /> : null}
    </div>
  );
}
