export function g(dataCy: string): ReturnType<typeof cy.get> {
  return cy.get(`[data-cy=${dataCy}]`);
}

export function clearCodeMirror(dataCy: string): void {
  cy.window().then((win) => {
    (win.document.querySelector(`[data-cy=${dataCy}] .CodeMirror`) as any).CodeMirror.setValue("");
  });
}

export function typeCodeMirror(dataCy: string, text: string): void {
  g(dataCy).find("textarea").type(text, { force: true });
}
