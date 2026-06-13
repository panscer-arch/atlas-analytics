import {
  getTableCellTone,
  getWhitePaperTableRowTone,
  parseMarkdownTable,
} from "../utils/whitePaperUtils";

export function WhitePaperReadableTable({ text }) {
  const table = parseMarkdownTable(text);
  if (!table.headers.length || !table.rows.length) {
    return <pre className="analytics-whitepaper-readable-table-raw">{text}</pre>;
  }

  return (
    <div className="analytics-whitepaper-readable-table-wrap">
      <table className="analytics-whitepaper-readable-table">
        <thead>
          <tr>
            {table.headers.map((header) => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => {
            const rowTone = getWhitePaperTableRowTone(row);

            return (
              <tr key={`${row.join("-")}-${rowIndex}`} className={rowTone ? `analytics-whitepaper-readable-table-row-${rowTone}` : undefined}>
                {table.headers.map((header, cellIndex) => {
                  const value = row[cellIndex] || "";
                  const tone = cellIndex === table.headers.length - 1 ? getTableCellTone(value) : "";
                  return (
                    <td key={`${header}-${cellIndex}`} data-label={header}>
                      {tone ? <span className={`analytics-whitepaper-table-badge analytics-whitepaper-table-badge-${tone}`}>{value}</span> : value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildReadableChunks(text) {
  const lines = String(text || "").split(/\r?\n/);
  const chunks = [];
  let buffer = [];
  let table = [];

  function flushBuffer() {
    if (!buffer.length) return;
    chunks.push({ type: "paragraph", text: buffer.join(" ") });
    buffer = [];
  }

  function flushTable() {
    if (!table.length) return;
    chunks.push({ type: "table", text: table.join("\n") });
    table = [];
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBuffer();
      flushTable();
      return;
    }

    if (trimmed.startsWith("|")) {
      flushBuffer();
      table.push(trimmed);
      return;
    }

    flushTable();
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flushBuffer();
      chunks.push({ type: "image", alt: imageMatch[1], src: imageMatch[2] });
      return;
    }
    if (/^\d+\.\d+\s+/.test(trimmed)) {
      flushBuffer();
      chunks.push({ type: "heading", text: trimmed });
      return;
    }
    if (/^\[Нужно заполнить\]/.test(trimmed)) {
      flushBuffer();
      chunks.push({ type: "todo", text: trimmed });
      return;
    }
    if (/^\[Действие\]/.test(trimmed)) {
      flushBuffer();
      chunks.push({ type: "action", text: trimmed });
      return;
    }
    if (/^[-•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushBuffer();
      chunks.push({ type: "list", text: trimmed });
      return;
    }

    buffer.push(trimmed);
  });

  flushBuffer();
  flushTable();
  return chunks;
}

export function WhitePaperReadableText({ text }) {
  return (
    <div className="analytics-whitepaper-readable-body">
      {buildReadableChunks(text).map((chunk, index) => {
        if (chunk.type === "heading") return <h3 key={`${chunk.type}-${index}`}>{chunk.text}</h3>;
        if (chunk.type === "table") return <WhitePaperReadableTable key={`${chunk.type}-${index}`} text={chunk.text} />;
        if (chunk.type === "image") {
          return (
            <figure key={`${chunk.type}-${index}`} className="analytics-whitepaper-readable-figure">
              <img src={chunk.src} alt={chunk.alt || ""} loading="lazy" />
              {chunk.alt ? <figcaption>{chunk.alt}</figcaption> : null}
            </figure>
          );
        }
        if (chunk.type === "todo") return <div key={`${chunk.type}-${index}`} className="analytics-whitepaper-readable-callout analytics-whitepaper-readable-todo">{chunk.text}</div>;
        if (chunk.type === "action") return <div key={`${chunk.type}-${index}`} className="analytics-whitepaper-readable-callout analytics-whitepaper-readable-action">{chunk.text}</div>;
        if (chunk.type === "list") return <p key={`${chunk.type}-${index}`} className="analytics-whitepaper-readable-list">{chunk.text}</p>;
        return <p key={`${chunk.type}-${index}`}>{chunk.text}</p>;
      })}
    </div>
  );
}
