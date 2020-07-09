export namespace HtmlUtils {
  export function someInParents(element: Element | null, fn: (node: Element) => boolean): boolean {
    let el = element;
    while (el && el instanceof Element) {
      if (fn(el)) {
        return true;
      }
      el = el.parentNode as Element | null;
    }
    return false;
  }

  export function classInParents(element: Element | null, cssClass: string): boolean {
    return someInParents(element, (n) => n.classList.contains(cssClass));
  }
}
