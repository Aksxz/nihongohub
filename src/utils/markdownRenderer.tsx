import React from 'react';

/**
 * Parses inline formatting: **bold**, *italic*, inline `code`, Japanese quotes 「...」
 */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex matches: **bold**, *italic*, `code`, 「quote」
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|「[^」]+」)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-[#1a1918]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[#6e6b66]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono text-xs">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('「') && token.endsWith('」')) {
      parts.push(
        <span key={match.index} className="font-japanese font-semibold text-[#d93829] bg-[#fef2f2] px-1 rounded">
          {token}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let isNumbered = false;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      if (isNumbered) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1 my-2 text-sm text-[#2c2b29]">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-2 text-sm text-[#2c2b29]">
            {listItems}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Divider
    if (line === '---' || line === '***' || line === '___') {
      flushList();
      elements.push(<hr key={idx} className="my-4 border-[#eeece6]" />);
      return;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={idx} className="text-xl sm:text-2xl font-bold font-japanese text-[#1a1918] mt-4 mb-2 tracking-tight">
          {renderInline(line.slice(2))}
        </h1>
      );
      return;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={idx} className="text-lg sm:text-xl font-bold font-japanese text-[#1a1918] mt-3.5 mb-1.5 border-b border-[#f2f0ea] pb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      return;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={idx} className="text-base font-bold font-japanese text-[#1a1918] mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      return;
    }

    // Heading 4
    if (line.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={idx} className="text-sm font-bold font-japanese text-[#d93829] uppercase tracking-wider mt-2.5 mb-1">
          {renderInline(line.slice(5))}
        </h4>
      );
      return;
    }

    // Bullet point: * or -
    if (/^[\*\-]\s+/.test(line)) {
      if (!inList || isNumbered) {
        flushList();
        inList = true;
        isNumbered = false;
      }
      const itemText = line.replace(/^[\*\-]\s+/, '');
      listItems.push(
        <li key={`li-${idx}`} className="leading-relaxed">
          {renderInline(itemText)}
        </li>
      );
      return;
    }

    // Numbered list: 1. 2.
    if (/^\d+\.\s+/.test(line)) {
      if (!inList || !isNumbered) {
        flushList();
        inList = true;
        isNumbered = true;
      }
      const itemText = line.replace(/^\d+\.\s+/, '');
      listItems.push(
        <li key={`li-${idx}`} className="leading-relaxed">
          {renderInline(itemText)}
        </li>
      );
      return;
    }

    // Empty line
    if (!line) {
      flushList();
      elements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Normal paragraph line
    flushList();
    elements.push(
      <p key={idx} className="text-sm text-[#2c2b29] leading-relaxed my-1">
        {renderInline(rawLine)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
