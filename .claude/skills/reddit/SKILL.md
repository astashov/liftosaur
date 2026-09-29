---
name: reddit
description: Read Reddit posts, comment threads, subreddit listings, and search results through a logged-in session cookie. Use when given a reddit.com link, or when asked to check what people say on Reddit (r/liftosaur, r/fitness, r/weightroom, r/boostcamp, etc).
argument-hint: [reddit-url or subreddit or search query]
---

# Read Reddit

Target: $ARGUMENTS

Reddit blocks anonymous requests and WebFetch. Every request here sends the logged-in cookie from `lambda/scripts/reddit_cookie.txt` and a desktop Chrome User-Agent. Without both, Reddit returns 403 or an HTML page.

## A single post with its comments

Use `lambda/scripts/fetch_reddit.ts`. It appends `.json` to the URL and prints the post and the full comment tree as Markdown.

```bash
REDDIT_COOKIE="$(cat lambda/scripts/reddit_cookie.txt)" npm run r lambda/scripts/fetch_reddit.ts "<post-url>" 2>/dev/null
```

- Pass the post permalink: `https://www.reddit.com/r/<sub>/comments/<id>/<slug>/`. Share links (`/s/<code>`) and `redd.it/<id>` must be resolved first: `curl -sLI -o /dev/null -w '%{url_effective}' "<url>"`.
- Strip query strings (`?utm_source=...`) from the URL before passing it. The script appends `.json` to the end of the string.
- `2>/dev/null` hides the ts-node `punycode` warning. Drop it when the output is empty, to see the `Failed: <status>` line.
- The script only handles post URLs. A subreddit or search URL prints nothing.
- Long threads: pipe through `head -n 300` first, then read more if needed.

## Subreddit listings and search

The script does not handle listings. Call the JSON API with `curl` and the same headers:

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
reddit() { curl -s -A "$UA" -H "Accept: application/json" -H "Cookie: $(cat lambda/scripts/reddit_cookie.txt)" "$1"; }
LIST='.data.children[].data | "\(.created_utc | todate | .[:10])  \(.score)↑ \(.num_comments)c  r/\(.subreddit)  \(.title)\n    https://www.reddit.com\(.permalink)"'

reddit "https://www.reddit.com/r/liftosaur/new.json?limit=25" | jq -r "$LIST"
reddit "https://www.reddit.com/r/liftosaur/top.json?t=month&limit=25" | jq -r "$LIST"
reddit "https://www.reddit.com/search.json?q=liftosaur&sort=new&limit=25" | jq -r "$LIST"
reddit "https://www.reddit.com/r/fitness/search.json?q=liftosaur&restrict_sr=1&sort=new&limit=25" | jq -r "$LIST"
```

- Sort options: `new`, `hot`, `top` (with `t=day|week|month|year|all`), `relevance` and `comments` for search.
- Paging: take `.data.after` from the response and pass `&after=<value>`. The maximum `limit` is 100.
- A user's posts and comments: `https://www.reddit.com/user/<name>/submitted.json` and `/comments.json`. Comments have `.body` and `.link_permalink` in place of `.title` and `.permalink`.
- To read a thread from a listing, pass its permalink to `fetch_reddit.ts`.

## When requests fail

- 403, or HTML where JSON was expected: the cookie expired. Ask Anton to paste a fresh `Cookie` header from a logged-in reddit.com tab (DevTools → Network → any reddit.com request → Request Headers → `cookie`) into `lambda/scripts/reddit_cookie.txt`.
- 429: rate limited. Wait a minute and make fewer requests. Never loop over many threads in parallel.
- 404: the post was deleted, or the subreddit is private or banned.

## Rules

- Read only. Never post, vote, comment, or send messages with this cookie. It is Anton's personal account.
- Never print the cookie value into the chat or into any file other than `reddit_cookie.txt`.
- When summarizing a thread, quote users by `u/<name>` and link the permalink, so Anton can open the source.
