import "mocha";
import { expect } from "chai";
import {
  DocSections_all,
  DocSections_articleJsonLd,
  DocSections_articleUrl,
  DocSections_description,
  DocSections_title,
} from "../src/models/docSections";
import { IDocIndexEntry } from "../src/models/doc";

describe("DocSections", () => {
  const entry: IDocIndexEntry = {
    id: "mcp",
    title: "MCP Server",
    shortDescription: "",
    order: 1,
    datePublished: "2026-03-07",
  };

  it("builds the URL and title of each section", () => {
    expect(DocSections_articleUrl(DocSections_all.doc, "mcp")).to.equal("https://www.liftosaur.com/doc/mcp");
    expect(DocSections_articleUrl(DocSections_all.compare, "gzclp-apps")).to.equal(
      "https://www.liftosaur.com/compare/gzclp-apps"
    );
    expect(DocSections_title(DocSections_all.doc, entry)).to.equal("MCP Server - Liftosaur Documentation");
    expect(DocSections_title(DocSections_all.features, entry)).to.equal("MCP Server - Liftosaur Features");
  });

  it("falls back to each section's own description", () => {
    expect(DocSections_description(DocSections_all.doc, entry)).to.equal("MCP Server - Liftosaur documentation.");
    expect(DocSections_description(DocSections_all.features, entry)).to.equal(
      "MCP Server in the Liftosaur weightlifting app."
    );
    expect(DocSections_description(DocSections_all.doc, { ...entry, shortDescription: "Short" })).to.equal("Short");
  });

  it("builds Article and Breadcrumb JSON-LD with the image and only the dates it has", () => {
    const jsonLd = DocSections_articleJsonLd(DocSections_all.features, entry, "https://x/img.webp");
    expect(jsonLd[0]).to.eql({
      type: "Article",
      headline: "MCP Server",
      description: "MCP Server in the Liftosaur weightlifting app.",
      mainEntityOfPage: "https://www.liftosaur.com/features/mcp",
      image: "https://x/img.webp",
      datePublished: "2026-03-07",
    });
    expect(jsonLd[1]).to.eql({
      type: "BreadcrumbList",
      items: [
        { name: "Home", url: "https://www.liftosaur.com" },
        { name: "Features", url: "https://www.liftosaur.com/features" },
        { name: "MCP Server" },
      ],
    });
  });
});
