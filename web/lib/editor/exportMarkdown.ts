import TurndownService from 'turndown';

/**
 * Converts the editor's HTML into Markdown and triggers a file download.
 *
 * Turndown handles the HTML→Markdown conversion; we add a couple of rules so
 * TipTap's strikethrough and task-list checkboxes survive the round-trip.
 */
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndown.addRule('strikethrough', {
  filter: (node) => ['S', 'DEL', 'STRIKE'].includes(node.nodeName),
  replacement: (content) => `~~${content}~~`,
});

turndown.addRule('taskItems', {
  filter: (node) =>
    node.nodeName === 'LI' && (node as HTMLElement).getAttribute('data-type') === 'taskItem',
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute('data-checked') === 'true';
    const text = content.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').trim();
    return `- [${checked ? 'x' : ' '}] ${text}\n`;
  },
});

export function exportToMarkdown(html: string, title: string) {
  const markdown = `# ${title}\n\n${turndown.turndown(html)}\n`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\- ]+/g, '').trim() || 'document'}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
