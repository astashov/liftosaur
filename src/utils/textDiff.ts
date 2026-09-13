export interface ITextEdit {
  start: number;
  end: number;
  text: string;
}

export function TextDiff_minimalEdit(current: string, next: string): ITextEdit | undefined {
  if (current === next) {
    return undefined;
  }
  let start = 0;
  while (start < current.length && start < next.length && current[start] === next[start]) {
    start += 1;
  }
  let currentEnd = current.length;
  let nextEnd = next.length;
  while (currentEnd > start && nextEnd > start && current[currentEnd - 1] === next[nextEnd - 1]) {
    currentEnd -= 1;
    nextEnd -= 1;
  }
  return { start, end: currentEnd, text: next.slice(start, nextEnd) };
}
