import { FriendsHtml } from "../src/pages/friends/friendsHtml";
import { IFriendsPageData } from "../src/models/friendsWeb";
import { renderPage } from "./render";

export function renderFriendsPageHtml(client: Window["fetch"], data: IFriendsPageData): string {
  return renderPage(<FriendsHtml client={client} data={data} />);
}
