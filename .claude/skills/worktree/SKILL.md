---
name: worktree
description: Create, run, debug and tear down an isolated dev worktree — its own branch, node_modules, domains, ports, SSL certs, DNS records, Metro and iOS simulator. Use when asked to set up/remove a worktree, when something in a worktree points at the wrong port/host/simulator, or when work should happen off the base checkout.
argument-hint: "what to do, e.g. 'create a worktree for the graphs redesign'"
---

# Dev worktrees

A worktree here is **a complete parallel dev environment**, not just a second checkout. Each one
gets its own branch, `node_modules`, public domains, port block, SSL certs, Cloudflare DNS records,
Metro instance and cloned iOS simulator, so several can run at once without colliding.

Everything is keyed off one git-ignored file at the worktree root: **`localdomain.js`**. Read it
first whenever you need to know where anything in a checkout lives.

```js
module.exports = {
  main: "local2", api: "local2-api", streamingapi: "local2-streaming-api",
  port: 8090, apiPort: 3010, streamingApiPort: 3011, metroPort: 8091,
};
```

## The index → port scheme

`scripts/worktree-create.sh:64` — `OFFSET = (INDEX - 1) * 10`:

| index | domains | web | api | streaming | metro | simulator |
|---|---|---|---|---|---|---|
| 1 (base repo, reserved) | `local`, `local-api`, `local-streaming-api` | 8080 | 3000 | 3001 | 8081 | `iPhone 17e RNW` |
| N (2..20) | `localN`, `localN-api`, `localN-streaming-api` | 8080+10(N-1) | 3000+10(N-1) | 3001+10(N-1) | 8081+10(N-1) | `iPhone 17e RNW <dirname>` |

Indices are capped at 2..20 and picked at random from the free ones (`scripts/worktree-create.sh:50`)
— deliberately a small reusable pool, because certs are never deleted, so the same handful of domains
get *renewed* rather than newly issued (Let's Encrypt rate-limits new certs, not renewals). Taken
indices are discovered by reading every `worktrees/*/localdomain.js`.

## Create

```bash
scripts/worktree-create.sh <name> [index]      # run from the base repo root
```

Does, in order: `git worktree add worktrees/<name> -b <name>` → writes `localdomain.js` → `npm ci`
→ generators (`build:theme`, `build:markdown`, `build:programs`, `build:exercises`) → issues/renews
certs via `lambda/scripts/update_liftosaur_dev_certs.sh` (certbot + Cloudflare DNS-01, into
`~/.secrets`) → points `localN*.liftosaur.com` A records at this machine's LAN IP via
`lambda/scripts/change_liftosaur_dev_api.sh`.

It does **not** touch native — pods and the simulator are provisioned later, on demand.

## Daily use (all from inside `worktrees/<name>`)

```bash
npm start              # webpack-dev-server on localdomain.port, https from ~/.secrets certs
npm run start:server   # api + streaming api on apiPort / streamingApiPort
npm run worktree:ios   # pods (once) + clone sim (once) + boot + run-ios on the right Metro port
npm run worktree:metro # Metro alone (= rn:start), on this checkout's metroPort
npm test               # fine in a fresh worktree — build:programs already wrote programdata/
```

`npm start` is not optional for native work: the RN app's `__HOST__` is the **web** dev server
(`src/App.native.tsx:30`), so images and other assets come from it.

## How the port/host actually reaches each layer

Nothing may assume 8080/3000/8081. The plumbing:

- **Web + API + tooling** — `src/localdomain.ts` re-exports `localdomain.js`; consumed by
  `webpack.config.js` (devServer port, cert paths, `__API_HOST__` defines, proxies) and
  `devserver.ts:250` (listens on `apiPort`, reads certs from `~/.secrets/live/<api domain>/`).
- **RN JS** — `src/App.native.tsx:30-34` sets `__HOST__` / `__API_HOST__` / `__STREAMING_API_HOST__`
  from `localdomain.js` under `__DEV__`, so a native build in a worktree talks to that worktree's servers.
- **Metro port, CLI side** — `scripts/metro-port.sh` (`$RCT_METRO_PORT` → `localdomain.js` → 8081);
  used by the `ios` / `android` / `rn:start` npm scripts.
- **Metro port, iOS side** — `RCT_METRO_PORT` cannot work: React-Core is a prebuilt xcframework, so
  its default 8081 is compiled upstream. Instead `ios/scripts/write-metro-port.sh` runs as an
  always-out-of-date Debug build phase (`project.pbxproj:933`) and writes `metro-port.txt` into the
  app bundle; `MetroLocation` in `ios/Liftosaur/AppDelegate.swift:104` reads it and pins
  `jsLocation` + `packagerHost`. Plain `npm run ios` and ⌘R in Xcode are both correct.
- **Metro port, Android side** — `android/app/build.gradle:95` parses `metroPort` out of
  `localdomain.js` and emits `resValue "integer", "react_native_dev_server_port"`.
- **Metro isolation** — `metro.config.js` block-lists `worktrees/` and `.claude/worktrees/` (anchored
  to the project root, so Metro still works when run from *inside* a worktree) to avoid haste-map
  collisions between duplicate `package.json`s.

## Remove

```bash
scripts/worktree-remove.sh <name>              # run from anywhere
```

Kills whatever is bound to its four ports, deletes the DNS records (guarded: refuses when
`main === "local"`), deletes the cloned simulator, then `git worktree remove --force` and
`git branch -D`. **Certs are kept on purpose** — same reason the index pool is small.

## Gotchas

- **Cloning the simulator fails while the golden sim is booted** — `xcrun simctl shutdown "iPhone 17e RNW"`, then re-run.
- **DNS points at the LAN IP captured at create time.** Change networks and every worktree's
  domain resolves to the wrong address. Re-run `sh lambda/scripts/change_liftosaur_dev_api.sh "$PWD/localdomain.js"`.
- **Certs live in `~/.secrets/live/<domain>/`, shared across checkouts.** If they're missing,
  `webpack.config.js` silently falls back to plain http while `devserver.ts` throws on `readFileSync`.
- **Don't dismiss the RN redbox** — `-[RCTLogBoxView dealloc]` → `doesNotRecognizeSelector` → SIGABRT.
  It usually means the worktree's servers aren't running; start them (or temporarily point
  `localdomain.js` at the base repo's `local`/8080/3000) instead of dismissing it.
- **`npm run pod-install` dirties `ios/Podfile.lock` and `ios/Liftosaur.xcodeproj/project.pbxproj`** —
  revert before committing feature work.
- **Run `npm run worktree:ios` from the worktree root** — it resolves `./localdomain` and names the
  sim after `basename $PWD`, which must match the `<name>` `worktree-remove.sh` will be given.
- **`git worktree add -b <name>` fails if the branch already exists.** Create it from a fresh name,
  or `git worktree add` manually and write `localdomain.js` by hand.

## Not per-worktree (known sharp edges)

- **`liftosaur-local` MCP is pinned to `https://local.liftosaur.com:8080/mcp`** (in `~/.claude.json`).
  From a worktree it still talks to the **base repo's** server. Either run the base repo's
  `npm start`/`start:server` too, or repoint the MCP URL at the worktree's port for the session.
- **Playwright hardcodes 8080** (`playwright.config.ts:29`, `tests/playwrightUtils.ts:5`) — the domain
  is per-worktree but the port isn't, so E2E runs from a worktree hit the base repo's web server.
- **API CORS allow-list hardcodes 8080** (`lambda/utils/response.ts:7`), as do the OAuth/MCP redirect
  fallbacks (`lambda/mcp/handler.ts`, `lambda/mcp/oauth.ts`) and the dev CDK stack
  (`liftosaur-cdk/liftosaur-cdk.ts`). Cross-origin/OAuth flows may need the base ports.
- **Android has no per-worktree provisioning** — same package id (`com.liftosaur.www.twa`), one
  emulator, one install. Only the Metro port is worktree-aware. Two Android worktrees can't run
  side by side.
- **`.claude/worktrees/*` are a different mechanism** — created by the Claude Code harness
  (`EnterWorktree`), with no `localdomain.js`, ports, DNS or simulator. These scripts don't apply
  to them; they're only block-listed in Metro and excluded from `copy:lambda`.
