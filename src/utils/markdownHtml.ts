import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, linkify: true });
const mdWithoutHtml = new MarkdownIt({ html: false, linkify: true });

export function MarkdownHtml_render(value: string, isHtmlDisabled: boolean): string {
  return (isHtmlDisabled ? mdWithoutHtml : md).render(value);
}
