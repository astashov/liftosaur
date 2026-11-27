import MarkdownIt from "markdown-it";
import type { IJsonLdFAQEntry } from "../components/page";

export function FaqMarkdown_parse(faqMd: string): IJsonLdFAQEntry[] {
  const md = new MarkdownIt({ html: true, linkify: true });
  const entries: IJsonLdFAQEntry[] = [];
  const lines = faqMd.split("\n");
  let currentQuestion: string | undefined;
  let currentAnswer: string[] = [];

  for (const line of lines) {
    const questionMatch = line.match(/^###\s+(.+)/);
    if (questionMatch) {
      if (currentQuestion && currentAnswer.length > 0) {
        const html = md.renderInline(currentAnswer.join(" ").trim());
        entries.push({ question: currentQuestion, answer: html });
      }
      currentQuestion = questionMatch[1].trim();
      currentAnswer = [];
    } else if (currentQuestion) {
      const trimmed = line.trim();
      if (trimmed) {
        currentAnswer.push(trimmed);
      }
    }
  }
  if (currentQuestion && currentAnswer.length > 0) {
    const html = md.renderInline(currentAnswer.join(" ").trim());
    entries.push({ question: currentQuestion, answer: html });
  }
  return entries;
}

export function FaqMarkdown_section(markdown: string): string | undefined {
  const match = markdown.match(/^## FAQ[ \t]*$/m);
  if (match?.index == null) {
    return undefined;
  }
  const rest = markdown.slice(match.index + match[0].length);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}
