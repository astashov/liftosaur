import MarkdownIt from "markdown-it";
import { DocAnchors_slug, DocAnchors_unique } from "./docAnchors";

type ICoreRule = Parameters<MarkdownIt["core"]["ruler"]["push"]>[1];

const anchoredHeadings = ["h2", "h3"];

const addHeadingIds: ICoreRule = (state) => {
  if (!state.env?.withAnchors) {
    return;
  }
  const used = new Set<string>();
  state.tokens.forEach((token, index) => {
    const inline = state.tokens[index + 1];
    if (token.type !== "heading_open" || !anchoredHeadings.includes(token.tag) || inline == null) {
      return;
    }
    const slug = DocAnchors_slug(inline.content);
    if (slug) {
      token.attrSet("id", DocAnchors_unique(slug, used));
    }
  });
};

const md = new MarkdownIt({ html: true, linkify: true });
const mdWithoutHtml = new MarkdownIt({ html: false, linkify: true });
md.core.ruler.push("heading_ids", addHeadingIds);
mdWithoutHtml.core.ruler.push("heading_ids", addHeadingIds);

export function MarkdownHtml_render(value: string, isHtmlDisabled: boolean, withAnchors: boolean = false): string {
  return (isHtmlDisabled ? mdWithoutHtml : md).render(value, { withAnchors });
}
