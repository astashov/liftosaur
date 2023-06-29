export function g(...dataCys: string[]): ReturnType<typeof cy.get> {
  return cy.get(s(...dataCys), { timeout: 8000 });
}

export function s(...dataCys): string {
  return dataCys.map((dataCy) => `[data-cy=${dataCy}]`).join(" ");
}

export function clearCodeMirror(dataCy: string): void {
  cy.window().then((win) => {
    const cmContent = win.document.querySelector(`[data-cy=${dataCy}] .cm-content`) as any;
    cmContent.cmView.view.update([
      cmContent.cmView.view.state.update({
        changes: { from: 0, to: cmContent.cmView.view.state.doc.length, insert: "" },
      }),
    ]);
  });
}

export function typeCodeMirror(dataCy: string, text: string): void {
  cy.window().then((win) => {
    const cmContent = win.document.querySelector(`[data-cy=${dataCy}] .cm-content`) as any;
    cmContent.cmView.view.update([
      cmContent.cmView.view.state.update({
        changes: { from: 0, to: cmContent.cmView.view.state.doc.length, insert: text },
      }),
    ]);
  });
}

export function disableSubscriptions(): void {
  cy.window().then((win) => {
    win.eval('state.storage.subscription.key = "test"');
  });
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
  cy.visit(`https://local.liftosaur.com:8080/?forceuseremail=${email}&friends=1&skipintro=1`);
  cy.get("button:contains('Basic Beginner Routine')").click();
  g("clone-program").click();
  g("footer-settings").click();
  g("menu-item-account").click();
  g("menu-item-login").click();
  g("navbar").should("have.text", "Workout History");
}
