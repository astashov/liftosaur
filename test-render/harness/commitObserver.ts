/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IRenderObservation,
  IRenderSelector,
  IRenderTarget,
  IRenderTrace,
  RenderTrace_build,
  RenderTrace_changedKeys,
  RenderTrace_matches,
  RenderTrace_target,
} from "./renderTrace";

const PERFORMED_WORK = 0b1;
const MEMO_COMPONENT = 14;

interface IDevToolsHook {
  renderers: Map<number, unknown>;
  onCommitFiberRoot: (rendererId: number, root: any, priority?: unknown, didError?: boolean) => void;
  onCommitFiberUnmount: (rendererId: number, fiber: any) => void;
}

interface IInstanceState {
  mountId: number;
  component: string;
  props: Record<string, unknown>;
}

export interface IRenderMount {
  component: string;
  target: IRenderTarget;
}

export interface ICommitObserver {
  start: () => void;
  stop: () => IRenderTrace;
  dispose: () => void;
  mounted: (selector: IRenderSelector) => IRenderMount[];
}

function componentName(fiber: any): string | undefined {
  // memo(Component, comparator) gives a wrapper fiber and a child fiber for one render, and both
  // resolve to the same name. The child does the work, so the wrapper is skipped.
  if (fiber?.tag === MEMO_COMPONENT) {
    return undefined;
  }
  const type = fiber?.type;
  if (typeof type === "function") {
    return type.displayName ?? type.name ?? undefined;
  }
  if (type != null && typeof type === "object") {
    if (typeof type.render === "function") {
      return type.render.displayName ?? type.render.name ?? undefined;
    }
    if (typeof type.type === "function") {
      return type.type.displayName ?? type.type.name ?? undefined;
    }
  }
  return undefined;
}

export function CommitObserver_install(): ICommitObserver {
  const hook = (globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ as IDevToolsHook | undefined;
  if (hook == null || hook.renderers.size === 0) {
    throw new Error("No React renderer registered with the devtools hook; the reconciler wrap did not run");
  }

  let identities = new WeakMap<any, IInstanceState>();
  let observations: IRenderObservation[] = [];
  let nextMountId = 1;
  let recording = false;
  let appRoot: any = undefined;

  const identityFor = (fiber: any, props: Record<string, unknown>): IInstanceState => {
    const existing = identities.get(fiber) ?? (fiber.alternate != null ? identities.get(fiber.alternate) : undefined);
    if (existing != null) {
      identities.set(fiber, existing);
      return existing;
    }
    nextMountId += 1;
    const created: IInstanceState = { mountId: nextMountId, component: componentName(fiber) ?? "unknown", props };
    identities.set(fiber, created);
    return created;
  };

  const visit = (fiber: any, seeding: boolean): void => {
    if (fiber == null) {
      return;
    }
    const name = componentName(fiber);
    const prev = fiber.alternate;
    if (name != null) {
      const props = (fiber.memoizedProps ?? {}) as Record<string, unknown>;
      const known = identities.get(fiber) != null || (prev != null && identities.get(prev) != null);
      const state = identityFor(fiber, props);
      // React leaves PerformedWork set on a fiber it never revisited, so the flag alone counts
      // stale work, which the child-pointer check below drops.
      // eslint-disable-next-line no-bitwise
      const rendered = prev == null ? !seeding : (fiber.flags & PERFORMED_WORK) === PERFORMED_WORK;
      if (!seeding && rendered) {
        observations.push({
          kind: "render",
          mountId: state.mountId,
          component: state.component,
          target: RenderTrace_target(props),
          changedProps: known ? RenderTrace_changedKeys(state.props, props) : [],
          didMount: !known,
        });
      }
      state.props = props;
    }
    // A bailed-out subtree keeps the same child pointer, which is how DevTools skips it.
    const subtreeUntouched = !seeding && prev != null && prev.child === fiber.child;
    if (!subtreeUntouched) {
      visit(fiber.child, seeding);
    }
    visit(fiber.sibling, seeding);
  };

  const originalCommit = hook.onCommitFiberRoot.bind(hook);
  const originalUnmount = hook.onCommitFiberUnmount.bind(hook);

  hook.onCommitFiberRoot = (rendererId, root, priority, didError): void => {
    originalCommit(rendererId, root, priority, didError);
    if (appRoot == null) {
      appRoot = root;
    }
    if (root !== appRoot || !recording) {
      return;
    }
    visit(root.current, false);
  };

  hook.onCommitFiberUnmount = (rendererId, fiber): void => {
    originalUnmount(rendererId, fiber);
    if (!recording) {
      return;
    }
    const state = identities.get(fiber) ?? (fiber.alternate != null ? identities.get(fiber.alternate) : undefined);
    if (state == null) {
      return;
    }
    observations.push({
      kind: "unmount",
      mountId: state.mountId,
      component: state.component,
      target: RenderTrace_target((fiber.memoizedProps ?? {}) as Record<string, unknown>),
    });
  };

  return {
    start: (): void => {
      if (recording) {
        throw new Error("CommitObserver is already recording; windows cannot overlap");
      }
      identities = new WeakMap();
      observations = [];
      if (appRoot != null) {
        visit(appRoot.current, true);
      }
      recording = true;
    },
    stop: (): IRenderTrace => {
      recording = false;
      return RenderTrace_build(observations);
    },
    dispose: (): void => {
      recording = false;
      hook.onCommitFiberRoot = originalCommit;
      hook.onCommitFiberUnmount = originalUnmount;
      observations = [];
    },
    mounted: (selector: IRenderSelector): IRenderMount[] => {
      const found: IRenderMount[] = [];
      const walkMounted = (fiber: any): void => {
        if (fiber == null) {
          return;
        }
        const name = componentName(fiber);
        if (name != null) {
          const target = RenderTrace_target((fiber.memoizedProps ?? {}) as Record<string, unknown>);
          if (RenderTrace_matches(name, target, selector)) {
            found.push({ component: name, target });
          }
        }
        walkMounted(fiber.child);
        walkMounted(fiber.sibling);
      };
      walkMounted(appRoot?.current);
      return found;
    },
  };
}
