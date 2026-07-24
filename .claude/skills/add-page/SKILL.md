---
name: add-page
description: Add a new server-rendered page to the Liftosaur website. Use when creating new public-facing pages with routing, SSR, and client hydration.
disable-model-invocation: true
argument-hint: [route-path] [description]
---

# Add New Page to Liftosaur Website

Create a new server-rendered page at the specified route. Requirements: $ARGUMENTS

## Research Phase

Before creating files, read these existing examples to understand the patterns:

1. Read `src/pages/allExercises/allExercisesHtml.tsx` — simple HTML wrapper example
2. Read `src/pages/allExercises/allExercisesContent.tsx` — simple content component
3. Read `src/allExercises.tsx` — client entry hydration
4. Read `lambda/allExercises.tsx` — lambda render function
5. Check `lambda/index.ts` for the route registration pattern (search for `getAllExercisesEndpoint`)
6. Check `webpack.config.js` for the entry point pattern

## Architecture: 4-Layer Pattern

Every public page uses 4 layers. For a page at `/myroute` with entry name `mypage`:

### Layer 1: Lambda Render (`lambda/myPage.tsx`)

```tsx
import { h } from "preact";
import { IAccount } from "../src/models/account";
import { MyPageHtml } from "../src/pages/myPage/myPageHtml";
import { renderPage } from "./render";

export function renderMyPageHtml(client: Window["fetch"], account?: IAccount): string {
  return renderPage(<MyPageHtml client={client} account={account} />);
}
```

### Layer 2: HTML Component (`src/pages/myPage/myPageHtml.tsx`)

Wraps content in `<Page>`. Key props:
- `css={["mypage"]}` / `js={["mypage"]}` — must match webpack entry key
- `maxWidth={1200}` — page max width
- `title`, `canonical`, `description`, `ogUrl` — SEO metadata
- `account` — optional user account for nav state
- `url="/myroute"` — highlights nav item in TopNavMenu
- `data={data}` — serialized for hydration (exclude `client` from data!)

```tsx
import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { MyPageContent } from "./myPageContent";

interface IProps {
  client: Window["fetch"];
  account?: IAccount;
}

export function MyPageHtml(props: IProps): JSX.Element {
  const { client, ...data } = props;
  return (
    <Page
      css={["mypage"]} js={["mypage"]} maxWidth={1200}
      title="Page Title | Liftosaur"
      canonical="https://www.liftosaur.com/myroute"
      description="Page description"
      ogUrl="https://www.liftosaur.com/myroute"
      account={props.account} data={data} client={client} url="/myroute"
    >
      <MyPageContent client={client} {...data} />
    </Page>
  );
}
```

### Layer 3: Content Component (`src/pages/myPage/myPageContent.tsx`)

The interactive Preact component. Export the props interface (needed by Layer 4).

### Layer 4: Client Entry (`src/myPage.tsx`)

```tsx
import { h } from "preact";
import { PageWrapper } from "./components/pageWrapper";
import { IMyPageContentProps, MyPageContent } from "./pages/myPage/myPageContent";
import { HydrateUtils } from "./utils/hydrate";

function main(): void {
  HydrateUtils.hydratePage<IMyPageContentProps>((pageWrapperProps, data) => (
    <PageWrapper {...pageWrapperProps}>
      <MyPageContent {...data} client={window.fetch.bind(window)} />
    </PageWrapper>
  ));
}
main();
```

## Wiring Steps

### 1. Webpack entry (`webpack.config.js`)

Add to `entry` in `mainConfig`:
```js
mypage: ["./src/myPage.tsx", "./src/index.css"],
```

### 2. Lambda route (`lambda/index.ts`)

Add import:
```tsx
import { renderMyPageHtml } from "./myPage";
```

Add endpoint + handler (near similar endpoints):
```tsx
const getMyPageEndpoint = Endpoint.build("/myroute");
const getMyPageHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getMyPageEndpoint> = async ({ payload }) => {
  const { di } = payload;
  let account: IAccount | undefined;
  const userResult = await getUserAccount(payload, { withPrograms: true });
  if (userResult.success) {
    account = userResult.data.account;
  }
  return {
    statusCode: 200,
    body: renderMyPageHtml(di.fetch, account),
    headers: { "content-type": "text/html" },
  };
};
```

Register in router chain (~line 2700):
```tsx
.get(getMyPageEndpoint, getMyPageHandler)
```

### 3. Redirects (`_redirects` and `_redirects_staging`)

Add redirect entries so the CDN (Netlify) proxies the route to the Lambda backend:

In `_redirects`:
```
/myroute https://api3.liftosaur.com/myroute  200
```

In `_redirects_staging`:
```
/myroute https://api3-dev.liftosaur.com/myroute  200
```

Place the entry before any parameterized routes for the same prefix (e.g. `/myroute` before `/myroute/:id`).

### 4. TopNavMenu (`src/components/topNavMenu.tsx`)

If page should appear in nav, update `getMenuItems()`.

## Reusable Components

- **TopNavMenu + FooterPage**: Auto-included via `PageWrapper` (don't set `nowrapper` on `<Page>`)
- **ScrollableTabs** (`src/components/scrollableTabs.tsx`): Tabbed content
- **SelectLink** (`src/components/selectLink.tsx`): Dropdown link with bottom sheet
- **ExerciseImage** (`src/components/exerciseImage.tsx`): Exercise illustrations
- **Markdown** (`src/components/markdown.tsx`): Renders markdown
- **Icons**: `src/components/icons/`
- **builtinProgramProperties** (`src/models/builtinPrograms.ts`): Metadata for builtin programs
- **ProgramDao** (`lambda/dao/programDao.ts`): Fetches program data from CDN

## Key Rules

- The `data` prop on `<Page>` is serialized into a hidden `#data` div. Keep it lightweight.
- `Settings.build()` creates default settings for public pages without user context.
- Split complex content into separate component files within the page directory.
- Run `npx tsc --noEmit` after creating all files to verify no TypeScript errors.
