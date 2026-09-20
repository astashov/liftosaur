const FOCUSABLE = "[tabindex], a[href], button, input, textarea, select";

function isLiveStop(el: Element): boolean {
  return el.hasAttribute("data-tab-stop") && el.closest("[data-leaving]") == null;
}

function prune(el: Element): void {
  if (!isLiveStop(el) && el.getAttribute("tabindex") !== "-1") {
    el.setAttribute("tabindex", "-1");
  }
}

function pruneTree(root: Element): void {
  if (root.matches(FOCUSABLE)) {
    prune(root);
  }
  root.querySelectorAll(FOCUSABLE).forEach(prune);
}

// Inside the pager only the set fields and the check answer to Tab. Doing it here instead of at
// every Pressable keeps a row remount, a leaving-animation copy, or a control added later out of
// the order without anyone remembering to pass tabIndex -1.
export function WorkoutTabPrune_observe(root: HTMLElement): () => void {
  pruneTree(root);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        prune(mutation.target);
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          pruneTree(node);
        }
      });
    }
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["tabindex"] });
  return () => observer.disconnect();
}
