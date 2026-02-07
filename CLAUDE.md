# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting Development
```bash
npm start          # Frontend dev server
npm run start:server  # Backend dev server with hot reload
```

### Building
```bash
npm run build      # Production build
npm run build:dev  # Development build
npm run build:lambda  # Build Lambda functions
```

### Testing & Quality
```bash
npm test           # Run all tests
npm run onetest    # Run single test file
npm run playwright # Run Playwright E2E tests
npm run lint       # ESLint for TypeScript files
```

### AWS Lambda Development
```bash
npm run start:lambda  # Local Lambda API
npm run watch:lambda  # Watch & rebuild Lambda
```

### iOS/watchOS Development
```bash
# Build watch bundle (included in build:dev, deployed to server)
npm run build:dev

# Watch bundle is downloaded from https://www.liftosaur.com/watch-bundle.js
# by WatchCacheManager at runtime - no manual copy needed

# Build watch app (run from /Users/anton/projects/LiftosauriOS/src)
xcodebuild -workspace Liftosaur.xcworkspace -scheme "LiftosaurWatch" -destination 'platform=watchOS Simulator,id=6D3DDA86-DDC2-4D24-8908-21839A099D79' build
```

## Visual Verification with MCP Tools

Claude Code has MCP tools configured for visual verification on web, iOS, and Android. Use these to verify UI changes after code modifications.

### Web (Playwright MCP)
```
# Navigate and interact with the web app
mcp__playwright__browser_navigate - Open a URL
mcp__playwright__browser_snapshot  - Get page structure (accessibility tree)
mcp__playwright__browser_click     - Click elements by ref
mcp__playwright__browser_type      - Type into inputs
mcp__playwright__browser_take_screenshot - Capture visual state
```

**Workflow:**
First, figure out the host - use the prefix values from `localdomain.js` file, and then combine them with the liftosaur.com. E.g.
if main: "local", then the host is "local.liftosaur.com". If main is "localai", then the host is "localai.liftosaur.com".

1. Ensure dev server is running (`npm start`)
2. Navigate to `https://{main}.liftosaur.com:8080/app`
3. Use `browser_snapshot` to see interactive elements with refs
4. Click/type using element refs from snapshot
5. Take screenshots to verify visual state

### iOS Simulator (mobile-mcp)
```
# Control iOS simulator
mcp__mobile-mcp__mobile_list_available_devices - Find simulators
mcp__mobile-mcp__mobile_launch_app            - Launch app (com.liftosaur.www)
mcp__mobile-mcp__mobile_take_screenshot       - Capture screen
mcp__mobile-mcp__mobile_list_elements_on_screen - Find tappable elements
mcp__mobile-mcp__mobile_click_on_screen_at_coordinates - Tap by coordinates
mcp__mobile-mcp__mobile_swipe_on_screen       - Scroll/swipe
mcp__mobile-mcp__mobile_type_keys             - Type text
```

**Workflow:**
1. Start simulator if needed: `xcrun simctl boot <device-id>`
2. List devices to get simulator ID
3. Launch app with bundle ID `com.liftosaur.www`
4. Take screenshot to see current state
5. List elements to find coordinates, then tap

### Android Emulator (mobile-mcp)
```
# Start emulator
~/Library/Android/sdk/emulator/emulator -list-avds        # List available
~/Library/Android/sdk/emulator/emulator -avd <name> &     # Start emulator

# Same mobile-mcp tools work for Android
# App package: com.liftosaur.www.twa
```

**Workflow:**
1. Start emulator (command above)
2. List devices - Android shows as `emulator-5554`
3. Launch app with package `com.liftosaur.www.twa`
4. Take screenshots and interact via coordinates

### Notes
- iOS/Android apps are WebView wrappers, so element detection returns the WebView container
- Use screenshots + coordinate-based tapping for mobile
- Web verification via Playwright provides richer element detection via snapshots

## Architecture Overview

Liftosaur is a PWA weightlifting tracker using a custom DSL called Liftoscript for defining workout programs.

### Tech Stack
- **Frontend**: Preact, TypeScript, Tailwind CSS, CodeMirror 6
- **State Management**: Custom Redux-like with lens-shmens for immutable updates
- **Backend**: AWS Lambda + DynamoDB + S3
- **Infrastructure**: AWS CDK

### Key Concepts

1. **Liftoscript**: Domain-specific language for workout programs
   - Text-based, markdown-like syntax with JavaScript-like scripting
   - Programs are immutable snapshots
   - See `/llms/liftoscript.md` for language reference

2. **State Management Pattern**:
   - Single global state in `src/models/state.ts`
   - Updates via lenses: `updateState(dispatch, lb<IState>().p('exercises').i(0).p('name').record('Bench Press'))`
   - State persisted to IndexedDB for offline support

3. **Program Model**:
   - Programs don't know about user equipment or settings
   - User settings (1RM, plates) applied on execution
   - Sharing creates immutable program links

### Project Structure
```
src/
├── components/     # Preact UI components
├── models/        # Business logic & data models
├── pages/         # Page components
├── ducks/         # Redux-like state management
├── utils/         # Utilities
└── api/           # API service layer

lambda/            # Backend Lambda functions
├── dao/           # DynamoDB access
└── utils/         # Backend utilities
```

### Important Files
- `src/types.ts` - Core TypeScript types
- `src/models/state.ts` - Global state definition
- `src/parser.ts` - Liftoscript parser
- `lambda/index.ts` - Lambda router entry point

### Development Tips
- State updates must use lenses for immutability
- Programs are text (Liftoscript) as source of truth
- Keep bundle size minimal (current ~200kb total)
- Test Liftoscript changes thoroughly - it's the core of the app

For detailed Liftoscript documentation, see `/llms/liftoscript.md` and `/llms/liftoscript_examples.md`.

## Comments
NEVER add comments unless they explain WHY something non-obvious is done. Comments that describe WHAT the code does are forbidden - the code itself should be readable.

DO NOT add comments for:
- Function/method descriptions (use clear naming instead)
- Variable explanations
- Type annotations
- "What this does" explanations
- TODOs unless explicitly requested

The ONLY acceptable comments explain:
- Non-obvious business logic reasoning
- Workarounds for external bugs/limitations
- Safety-critical warnings

If you find yourself wanting to add a comment, first try to make the code clearer instead. Assume the reader knows the programming language.

BAD (describes what):
```typescript
// Check if user is subscribed
if (user.subscription?.active) {
```

GOOD (explains why):
```typescript
// Stripe webhook can be delayed, so we also check local cache
if (user.subscription?.active || cachedSubscription) {
```