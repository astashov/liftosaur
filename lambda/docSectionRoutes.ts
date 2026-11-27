import { APIGatewayProxyResult } from "aws-lambda";
import { DocDao } from "./dao/docDao";
import { IDocCollection, IDocIndexEntry } from "../src/models/doc";
import { IDocDetail } from "../src/utils/docUtils";

export interface IDocSectionArticle {
  indexEntry: IDocIndexEntry;
  detail: IDocDetail;
}

export function DocSectionRoutes_html(body: string): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body,
    headers: {
      "content-type": "text/html",
      "cache-control": "public, s-maxage=86400, max-age=0",
    },
  };
}

export function DocSectionRoutes_detailsResult(
  collection: IDocCollection,
  id: string,
  render: (article: IDocSectionArticle, dao: DocDao) => string
): APIGatewayProxyResult {
  const dao = new DocDao(collection);
  const article = dao.getById(id);
  if (article == null) {
    return {
      statusCode: 404,
      body: "Not Found",
      headers: { "content-type": "text/html", "cache-control": "no-cache" },
    };
  }
  return DocSectionRoutes_html(render(article, dao));
}
