export function g(...dataCys: string[]): ReturnType<typeof cy.get> {
  const selectors = dataCys.map((dataCy) => `[data-cy=${dataCy}]`).join(" ");
  return cy.get(selectors);
}

export function clearCodeMirror(dataCy: string): void {
  cy.window().then((win) => {
    (win.document.querySelector(`[data-cy=${dataCy}] .CodeMirror`) as any).CodeMirror.setValue("");
  });
}

export function typeCodeMirror(dataCy: string, text: string): void {
  g(dataCy).find("textarea").type(text, { force: true });
}

export function clearAll(): void {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.clearIndexedDb();
  cy.viewport("iphone-6");
}

export function login(email: string): void {
  clearAll();
  cy.visit(`http://local.liftosaur.com:8080/?forceuseremail=${email}`);
  cy.contains("Pick or Create a Program").click();
  g("footer-settings").click();
  g("menu-item-account").click();
  g("menu-item-login").click();
  g("menu-item-current-account").should("have.text", `Current account: ${email}`);
  cy.contains("Back").click();
  cy.contains("Back").click();
}
