export function g(...dataCys: string[]): ReturnType<typeof cy.get> {
  const selectors = dataCys.map((dataCy) => `[data-cy=${dataCy}]`).join(" ");
  return cy.get(selectors, { timeout: 8000 });
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
  cy.window().then((win: any) => {
    console.log("Clearing data");
    win.clearData?.();
  });
  cy.viewport("iphone-6");
}

export function login(email: string): void {
  clearAll();
  cy.visit(`https://local.liftosaur.com:8080/?forceuseremail=${email}`);
  cy.contains("Start Basic Beginner Routine").click();
  g("footer-settings").click();
  g("menu-item-account").click();
  g("menu-item-login").click();
  g("menu-item-current-account").should("have.text", `Current account: ${email}`);
  g("navbar-back").click();
  g("navbar-back").click();
}
