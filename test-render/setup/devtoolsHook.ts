/* eslint-disable @typescript-eslint/no-explicit-any */

const hook = {
  renderers: new Map<number, unknown>(),
  supportsFiber: true,
  isDisabled: false,
  nextId: 1,
  inject(internals: unknown): number {
    hook.nextId += 1;
    const id = hook.nextId;
    hook.renderers.set(id, internals);
    return id;
  },
  onCommitFiberRoot(): void {},
  onCommitFiberUnmount(): void {},
  onPostCommitFiberRoot(): void {},
  checkDCE(): void {},
};

(globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;

// react-test-renderer never calls injectIntoDevTools, so the hook stays empty without this wrap.
jest.mock("react-reconciler", () => {
  const actual = jest.requireActual("react-reconciler");
  const factory = (actual as any).default ?? actual;
  const wrapped = (hostConfig: unknown): unknown => {
    const instance = factory(hostConfig) as { injectIntoDevTools?: () => void };
    instance.injectIntoDevTools?.();
    return instance;
  };
  return Object.assign(wrapped, { __esModule: true, default: wrapped });
});
