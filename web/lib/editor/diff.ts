export type DiffSegment = { type: 'same' | 'added' | 'removed'; text: string };

function tokenize(text: string): string[] {
  // Keep whitespace as its own tokens so spacing/line-breaks survive the diff.
  return text.split(/(\s+)/).filter((s) => s.length > 0);
}

/**
 * A small word-level diff (longest-common-subsequence) used by the version
 * history to show what text was added or removed between two versions.
 * Falls back to plain text for very large documents to stay fast.
 */
export function diffWords(oldText: string, newText: string): DiffSegment[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const m = a.length;
  const n = b.length;

  if (m === 0 && n === 0) return [];
  if (m * n > 4_000_000) return [{ type: 'same', text: newText }];

  // LCS length table.
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment['type'], text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', a[i]);
      i++;
    } else {
      push('added', b[j]);
      j++;
    }
  }
  while (i < m) push('removed', a[i++]);
  while (j < n) push('added', b[j++]);

  return segments;
}

/** Counts added/removed words (ignoring pure-whitespace tokens). */
export function diffStats(segments: DiffSegment[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const seg of segments) {
    if (seg.type === 'same') continue;
    const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
    if (seg.type === 'added') added += words;
    else removed += words;
  }
  return { added, removed };
}
