/**
 * ═══════════════════════════════════════════════════════════════════
 * Tiny Markdown renderer for the "Preparation / Study Notes" field
 * ═══════════════════════════════════════════════════════════════════
 * Students paste syllabus lists, company research and interview
 * experiences (often straight from LeetCode / GeeksforGeeks, which are
 * Markdown-ish). The spec asks for rich text; we support Markdown.
 *
 * WHY NOT react-markdown?
 *   No new dependency is needed and the project's dependency list stays
 *   small. More importantly this renderer is SAFE BY CONSTRUCTION:
 *   every line is HTML-escaped BEFORE any formatting rule runs, so raw
 *   `<script>` pasted into a note can never execute. Only the tags we
 *   generate ourselves can appear in the output.
 *
 * SUPPORTED: headings, bold, italics, strikethrough, inline code, fenced
 * code blocks, links, bullet lists, numbered lists, blockquotes, rules.
 */

/** Escapes the 5 HTML-significant characters. Always the first step. */
const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Blocks dangerous URL schemes so a pasted `[x](javascript:alert(1))`
 * link cannot turn into an XSS payload. Everything else is allowed
 * (http, https, mailto, relative paths, anchors).
 */
const safeUrl = (raw: string): string => {
  const url = raw.trim();
  return /^(https?:|mailto:|\/|#)/i.test(url) ? url : '#';
};

/** Applies inline formatting to a single line of already-escaped text. */
const renderInline = (text: string): string => {
  let output = escapeHtml(text);

  // Inline code is extracted first so later rules cannot reformat it.
  const codeSpans: string[] = [];
  output = output.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(
      `<code class="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.8em] text-emerald-300">${code}</code>`
    );
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  output = output
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em class="italic">$2</em>')
    .replace(/~~([^~]+)~~/g, '<del class="line-through opacity-70">$1</del>')
    .replace(
      // Allows one level of nested parentheses so URLs like
      // https://en.wikipedia.org/wiki/Foo_(bar) survive intact.
      /\[([^\]]+)\]\(((?:[^()\s]|\([^()]*\))+)\)/g,
      (_match, label: string, url: string) =>
        `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer nofollow" class="text-blue-400 underline underline-offset-2 hover:text-blue-300">${label}</a>`
    );

  // Restore the protected code spans.
  return output.replace(
    /\u0000(\d+)\u0000/g,
    (_match, index: string) => codeSpans[Number(index)] ?? ''
  );
};

/**
 * Converts Markdown to a safe HTML string.
 * Render it with `dangerouslySetInnerHTML` — the escaping above makes that safe.
 */
export const renderMarkdown = (source: string | null | undefined): string => {
  if (!source) return '';

  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const closeList = (): void => {
    if (listType) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>');
      listType = null;
    }
  };

  const flushCodeBlock = (): void => {
    html.push(
      `<pre class="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed"><code class="font-mono text-slate-200">${escapeHtml(
        codeBuffer.join('\n')
      )}</code></pre>`
    );
    codeBuffer = [];
  };

  for (const line of lines) {
    // ── Fenced code block (``` or ```ts) ──────────────────────────
    const fence = /^\s*```/.exec(line);
    if (fence) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // ── Blank line ends any open list ─────────────────────────────
    if (!line.trim()) {
      closeList();
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      closeList();
      html.push('<hr class="my-4 border-slate-800" />');
      continue;
    }

    // ── Headings ──────────────────────────────────────────────────
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const sizeClass =
        level <= 2
          ? 'mt-5 mb-2 text-lg font-bold text-white'
          : 'mt-4 mb-1.5 text-base font-semibold text-white';
      html.push(`<h${level} class="${sizeClass}">${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // ── Blockquote (great for pasted interview experiences) ───────
    const quote = /^\s*>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      html.push(
        `<blockquote class="my-2 border-l-2 border-blue-500/50 pl-3 italic text-slate-400">${renderInline(
          quote[1]
        )}</blockquote>`
      );
      continue;
    }

    // ── Bullet list ───────────────────────────────────────────────
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      if (listType !== 'ul') {
        closeList();
        html.push('<ul class="my-2 list-disc space-y-1 pl-5">');
        listType = 'ul';
      }
      html.push(`<li class="leading-relaxed">${renderInline(bullet[1])}</li>`);
      continue;
    }

    // ── Numbered list ─────────────────────────────────────────────
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      if (listType !== 'ol') {
        closeList();
        html.push('<ol class="my-2 list-decimal space-y-1 pl-5">');
        listType = 'ol';
      }
      html.push(`<li class="leading-relaxed">${renderInline(numbered[1])}</li>`);
      continue;
    }

    // ── Paragraph ─────────────────────────────────────────────────
    closeList();
    html.push(`<p class="my-2 leading-relaxed">${renderInline(line)}</p>`);
  }

  // An unterminated fence still renders whatever was collected.
  if (inCodeBlock) flushCodeBlock();
  closeList();

  return html.join('\n');
};
