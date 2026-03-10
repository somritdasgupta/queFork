import React from "react";

// Universal syntax highlighter for shell, JS, Python, JSON, and generic code
function tokenize(code: string, language: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = code;
  let key = 0;

  const keywords: Record<string, string[]> = {
    javascript: [
      "const",
      "let",
      "var",
      "function",
      "return",
      "async",
      "await",
      "import",
      "from",
      "export",
      "default",
      "new",
      "if",
      "else",
      "for",
      "while",
      "try",
      "catch",
      "throw",
      "class",
      "extends",
      "typeof",
      "instanceof",
      "in",
      "of",
      "true",
      "false",
      "null",
      "undefined",
      "this",
      "delete",
    ],
    python: [
      "import",
      "from",
      "def",
      "return",
      "class",
      "if",
      "elif",
      "else",
      "for",
      "while",
      "try",
      "except",
      "raise",
      "with",
      "as",
      "True",
      "False",
      "None",
      "and",
      "or",
      "not",
      "in",
      "is",
      "lambda",
      "pass",
      "break",
      "continue",
      "global",
      "nonlocal",
      "assert",
      "yield",
      "del",
      "print",
    ],
    curl: ["curl"],
    json: [],
  };

  const lang = language.toLowerCase();
  const kw = keywords[lang] || keywords.javascript || [];

  while (remaining.length > 0) {
    // Comments (// or #)
    if (lang !== "json") {
      const commentMatch =
        lang === "python" || lang === "curl" || lang === "shell"
          ? remaining.match(/^(#.*)/)
          : remaining.match(/^(\/\/.*)/) || remaining.match(/^(#.*)/);
      if (commentMatch) {
        parts.push(
          <span key={key++} className="text-muted-foreground/60 italic">
            {commentMatch[0]}
          </span>,
        );
        remaining = remaining.slice(commentMatch[0].length);
        continue;
      }
    }

    // Strings
    const strMatch =
      remaining.match(/^('(?:[^'\\]|\\.)*')/) ||
      remaining.match(/^("(?:[^"\\]|\\.)*")/) ||
      remaining.match(/^(`(?:[^`\\]|\\.)*`)/);
    if (strMatch) {
      if (lang === "json") {
        const isKey = remaining
          .slice(strMatch[0].length)
          .trimStart()
          .startsWith(":");
        parts.push(
          <span
            key={key++}
            className={isKey ? "text-primary" : "text-status-success"}
          >
            {strMatch[0]}
          </span>,
        );
      } else {
        parts.push(
          <span key={key++} className="text-status-success">
            {strMatch[0]}
          </span>,
        );
      }
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Numbers
    const numMatch = remaining.match(/^(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/);
    if (numMatch) {
      parts.push(
        <span key={key++} className="text-method-post">
          {numMatch[0]}
        </span>,
      );
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // Shell flags (--flag or -f)
    if (lang === "curl" || lang === "shell") {
      const flagMatch = remaining.match(/^(--?\w[\w-]*)/);
      if (flagMatch) {
        parts.push(
          <span key={key++} className="text-method-put">
            {flagMatch[0]}
          </span>,
        );
        remaining = remaining.slice(flagMatch[0].length);
        continue;
      }
    }

    // Keywords
    const wordMatch = remaining.match(/^([a-zA-Z_$][\w$]*)/);
    if (wordMatch) {
      if (kw.includes(wordMatch[0])) {
        parts.push(
          <span key={key++} className="text-method-patch font-bold">
            {wordMatch[0]}
          </span>,
        );
      } else if (
        wordMatch[0] === "true" ||
        wordMatch[0] === "false" ||
        wordMatch[0] === "null"
      ) {
        parts.push(
          <span key={key++} className="text-method-put">
            {wordMatch[0]}
          </span>,
        );
      } else if (
        lang === "javascript" &&
        remaining.slice(wordMatch[0].length).trimStart().startsWith("(")
      ) {
        // Function call
        parts.push(
          <span key={key++} className="text-primary">
            {wordMatch[0]}
          </span>,
        );
      } else if (
        lang === "python" &&
        remaining.slice(wordMatch[0].length).trimStart().startsWith("(")
      ) {
        parts.push(
          <span key={key++} className="text-primary">
            {wordMatch[0]}
          </span>,
        );
      } else {
        parts.push(
          <span key={key++} className="text-foreground">
            {wordMatch[0]}
          </span>,
        );
      }
      remaining = remaining.slice(wordMatch[0].length);
      continue;
    }

    // URLs in curl
    if (lang === "curl" || lang === "shell") {
      const urlMatch = remaining.match(/^(https?:\/\/[^\s'"\\]+)/);
      if (urlMatch) {
        parts.push(
          <span key={key++} className="text-primary underline">
            {urlMatch[0]}
          </span>,
        );
        remaining = remaining.slice(urlMatch[0].length);
        continue;
      }
    }

    // Brackets/punctuation
    const punctMatch = remaining.match(/^([{}()[\]:;,=<>+\-*/%&|!?@.\\])/);
    if (punctMatch) {
      parts.push(
        <span key={key++} className="text-muted-foreground">
          {punctMatch[0]}
        </span>,
      );
      remaining = remaining.slice(1);
      continue;
    }

    // Whitespace and other
    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return parts;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
}

export function SyntaxHighlighter({
  code,
  language = "json",
  maxHeight = "350px",
  showLineNumbers = true,
}: CodeBlockProps) {
  const lines = code.split("\n");
  const lineNumWidth = String(lines.length).length;
  const lineNumColClass =
    lineNumWidth >= 4 ? "w-14" : lineNumWidth === 3 ? "w-12" : "w-10";
  const maxHeightClass =
    maxHeight === "350px" ? "max-h-[350px]" : "max-h-[350px]";

  return (
    <div className={`overflow-auto bg-surface-sunken ${maxHeightClass}`}>
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-accent/10">
              {showLineNumbers && (
                <td
                  className={`select-none text-right align-top shrink-0 border-r border-border bg-surface-sunken sticky left-0 ${lineNumColClass}`}
                >
                  <span className="block px-2 py-0 text-[10px] font-mono leading-[1.7] text-muted-foreground/30">
                    {i + 1}
                  </span>
                </td>
              )}
              <td className="px-0 py-0">
                <pre className="font-mono text-[11px] leading-[1.7] whitespace-pre pl-3 pr-3">
                  {tokenize(line, language)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
