import { IConsentCategories, IConsentMode } from "./consent";

// Self-contained vanilla DOM so it behaves identically on SSR pages and the /app PWA and can't be
// blocked by React hydration timing. Styling is intentionally minimal/inline - design later.

type IChoiceHandler = (categories: IConsentCategories) => void;

const Z = 2147483600;

function el(tag: string, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text != null) {
    node.textContent = text;
  }
  return node;
}

function button(label: string, primary: boolean): HTMLButtonElement {
  return el(
    "button",
    {
      cursor: "pointer",
      padding: "10px 16px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      border: primary ? "none" : "1px solid var(--color-border-prominent)",
      background: primary ? "var(--color-button-primarybackground)" : "var(--color-button-secondarybackground)",
      color: primary ? "var(--color-button-primarylabel)" : "var(--color-text-primary)",
    },
    label
  ) as HTMLButtonElement;
}

function remove(node: HTMLElement | null): void {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function buildPreferences(current: IConsentCategories, onSave: IChoiceHandler): HTMLElement {
  const overlay = el("div", {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,0.4)",
    zIndex: String(Z + 1),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  });
  const card = el("div", {
    background: "var(--color-background-default)",
    borderRadius: "12px",
    border: "1px solid var(--color-border-prominent)",
    maxWidth: "440px",
    width: "100%",
    padding: "20px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
    fontFamily: "sans-serif",
    color: "var(--color-text-primary)",
  });
  card.addEventListener("click", (e) => e.stopPropagation());
  overlay.addEventListener("click", () => remove(overlay));

  const header = el("div", {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  });
  header.appendChild(el("div", { fontSize: "18px", fontWeight: "700" }, "Privacy preferences"));
  const close = el(
    "button",
    {
      background: "none",
      border: "none",
      fontSize: "22px",
      lineHeight: "1",
      cursor: "pointer",
      color: "var(--color-text-secondary)",
      padding: "0 4px",
    },
    "×"
  );
  close.setAttribute("aria-label", "Close");
  close.addEventListener("click", () => remove(overlay));
  header.appendChild(close);
  card.appendChild(header);

  const state: IConsentCategories = { analytics: current.analytics, advertising: current.advertising };
  const rows: Array<{ key: "analytics" | "advertising"; title: string; desc: string }> = [
    {
      key: "analytics",
      title: "Analytics",
      desc: "Helps us understand usage and how people find us (Google Analytics).",
    },
    {
      key: "advertising",
      title: "Advertising",
      desc: "Measures how ads bring people to the app (Reddit Ads, Google Ads, etc).",
    },
  ];
  for (const row of rows) {
    const wrap = el("label", {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start",
      padding: "10px 0",
      borderTop: "1px solid var(--color-border-subtle)",
      cursor: "pointer",
    });
    const cb = el("input", { marginTop: "3px" }) as HTMLInputElement;
    cb.type = "checkbox";
    cb.checked = state[row.key];
    cb.addEventListener("change", () => {
      state[row.key] = cb.checked;
    });
    const txt = el("div", {});
    txt.appendChild(el("div", { fontWeight: "600", fontSize: "14px" }, row.title));
    txt.appendChild(el("div", { fontSize: "12px", color: "var(--color-text-secondary)" }, row.desc));
    wrap.appendChild(cb);
    wrap.appendChild(txt);
    card.appendChild(wrap);
  }

  const actions = el("div", { display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" });
  const save = button("Save choices", true);
  save.addEventListener("click", () => {
    remove(overlay);
    onSave(state);
  });
  actions.appendChild(save);
  card.appendChild(actions);
  overlay.appendChild(card);
  return overlay;
}

export function ConsentBanner_openPreferences(current: IConsentCategories, onSave: IChoiceHandler): void {
  document.body.appendChild(buildPreferences(current, onSave));
}

export function ConsentBanner_showBanner(mode: IConsentMode, onChoice: IChoiceHandler): void {
  const bar = el("div", {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "0",
    zIndex: String(Z),
    background: "var(--color-background-default)",
    borderTop: "1px solid var(--color-border-prominent)",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
    padding: "16px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
  });
  const text = el(
    "div",
    { flex: "1 1 280px", minWidth: "240px", fontSize: "13px", color: "var(--color-text-primary)", lineHeight: "1.4" },
    "Liftosaur uses cookies for analytics and to measure how our pages and ads bring people to the app. "
  );
  const links = el("span", {});
  const policy = el(
    "a",
    { color: "var(--color-text-link)", textDecoration: "underline" },
    "Privacy Policy"
  ) as HTMLAnchorElement;
  policy.href = "/privacy.html";
  links.appendChild(policy);
  text.appendChild(links);

  const actions = el("div", { display: "flex", gap: "8px", flexWrap: "wrap" });
  const reject = button("Reject all", false);
  const manage = button("Manage", false);
  const accept = button("Accept all", true);
  reject.addEventListener("click", () => {
    remove(bar);
    onChoice({ analytics: false, advertising: false });
  });
  accept.addEventListener("click", () => {
    remove(bar);
    onChoice({ analytics: true, advertising: true });
  });
  manage.addEventListener("click", () => {
    ConsentBanner_openPreferences({ analytics: false, advertising: false }, (cats) => {
      remove(bar);
      onChoice(cats);
    });
  });
  actions.appendChild(reject);
  actions.appendChild(manage);
  actions.appendChild(accept);

  bar.appendChild(text);
  bar.appendChild(actions);
  document.body.appendChild(bar);
}
