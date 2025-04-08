export namespace HtmlUtils {
  export function someInParents(
    element: Element | null,
    fn: (node: Element) => boolean,
    finalElement?: Element
  ): boolean {
    let el = element;
    while (el && el instanceof Element && el !== finalElement) {
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

  export function selectableInParents(element: Element | null, finalElement: Element): boolean {
    return HtmlUtils.someInParents(
      element,
      (n) => {
        return (
          n instanceof HTMLAnchorElement ||
          n instanceof HTMLButtonElement ||
          n instanceof HTMLSelectElement ||
          n instanceof HTMLLabelElement ||
          n instanceof HTMLInputElement ||
          n.classList.contains("selectable")
        );
      },
      finalElement
    );
  }

  export function escapeHtml(initialString: string): string {
    const str = "" + initialString;
    const matchHtmlRegExp = /["'&<>]/;
    const match = matchHtmlRegExp.exec(str);

    if (!match) {
      return str;
    }

    let html = "";
    let lastIndex = 0;
    let index;

    for (index = match.index; index < str.length; index += 1) {
      let escape;
      switch (str.charCodeAt(index)) {
        case 34: // "
          escape = "&quot;";
          break;
        case 38: // &
          escape = "&amp;";
          break;
        case 39: // '
          escape = "&#39;";
          break;
        case 60: // <
          escape = "&lt;";
          break;
        case 62: // >
          escape = "&gt;";
          break;
        default:
          continue;
      }

      if (lastIndex !== index) {
        html += str.substring(lastIndex, index);
      }

      lastIndex = index + 1;
      html += escape;
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
  }

  export function getPointY(event: TouchEvent | MouseEvent): number {
    if ("touches" in event) {
      return event.touches[0].clientY;
    } else {
      return event.clientY;
    }
  }

  export function getPointX(event: TouchEvent | MouseEvent): number {
    if ("touches" in event) {
      return event.touches[0].clientX;
    } else {
      return event.clientX;
    }
  }

  export function onScrollEnd(callback: () => void, element?: HTMLElement): () => void {
    let lastScrollY = element ? element.scrollTop : window.scrollY;
    let frame: number;

    const checkScroll = () => {
      const currentScrollY = element ? element.scrollTop : window.scrollY;
      if (currentScrollY !== lastScrollY) {
        lastScrollY = currentScrollY;
        frame = requestAnimationFrame(checkScroll);
      } else {
        // Wait a little more in case it's just a pause
        setTimeout(() => {
          if ((element ? element.scrollTop : window.scrollY) === lastScrollY) {
            callback();
          } else {
            lastScrollY = element ? element.scrollTop : window.scrollY;
            frame = requestAnimationFrame(checkScroll);
          }
        }, 100);
      }
    };

    frame = requestAnimationFrame(checkScroll);

    return () => cancelAnimationFrame(frame); // optional cancel function
  }
}
