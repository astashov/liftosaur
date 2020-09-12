describe("Basic Beginner Program", () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.clearIndexedDb();
    cy.viewport("iphone-6");
  });

  it("increments and deloads properly", () => {
    cy.visit("http://local.liftosaur.com:8080");
    cy.contains("Let's choose a program!").click();
    cy.contains("Basic Beginner Routine").click();
    cy.contains("Clone").click();
    cy.contains("Start Next Workout").click();

    // Workout A

    // First excercise is successful
    cy.get("[data-cy^=excercise-]:contains('Bent Over Row') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=excercise-]:contains('Bent Over Row') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("140");
    cy.get("[data-cy=modal-weight-submit]").click();

    // Second excercise is successful
    cy.get("[data-cy^=excercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=excercise-]:contains('Squat') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("200");
    cy.get("[data-cy=modal-weight-submit]").click();

    cy.contains("Finish the workout").click();

    // Workout B

    cy.contains("Start Next Workout").click();

    // First excercise is successful
    cy.get("[data-cy^=excercise-]:contains('Chin Up') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    // Second excercise is successful
    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.get("[data-cy^=excercise-]:contains('Deadlift') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("250");
    cy.get("[data-cy=modal-weight-submit]").click();

    // Third excercise is unsuccessful
    cy.get("[data-cy^=excercise-]:contains('Overhead Press') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();
    cy.get("[data-cy^=excercise-]:contains('Overhead Press') [data-cy^=set-]").first().click();

    cy.get("[data-cy^=excercise-]:contains('Overhead Press') [data-cy=change-weight]").click();
    cy.get("[data-cy=modal-weight-input]").clear().type("100");
    cy.get("[data-cy=modal-weight-submit]").click();

    cy.contains("Finish the workout").click();

    // Check next excercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Bent Over Row') [data-cy=history-entry-weight]")
      .should("have.text", "142.5");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Squat') [data-cy=history-entry-weight]")
      .should("have.text", "205");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Bench Press') [data-cy=history-entry-weight]")
      .should("have.text", "45");

    // Workout A

    cy.contains("Start Next Workout").click();

    // First excercise is successful
    cy.get("[data-cy^=excercise-]:contains('Bent Over Row') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    // Second excercise is unsuccessful
    cy.get("[data-cy^=excercise-]:contains('Squat') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("3");
    cy.get("[data-cy=modal-amrap-submit]").click();

    // Third excercise is successful
    cy.get("[data-cy^=excercise-]:contains('Bench Press') [data-cy^=set-]").click({ multiple: true });
    cy.get("[data-cy=modal-amrap-input]").clear().type("5");
    cy.get("[data-cy=modal-amrap-submit]").click();

    cy.contains("Finish the workout").click();

    // Check next excercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Chin Up') [data-cy=history-entry-weight]")
      .should("have.text", "0");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Deadlift') [data-cy=history-entry-weight]")
      .should("have.text", "255");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Overhead Press') [data-cy=history-entry-weight]")
      .should("have.text", "45");

    // Workout B

    cy.contains("Start Next Workout").click();

    cy.contains("Finish the workout").click();

    // Check next excercise conditions
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Bent Over Row') [data-cy=history-entry-weight]")
      .should("have.text", "145");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Squat') [data-cy=history-entry-weight]")
      .should("have.text", "182.5");
    cy.get("[data-cy=history-record]")
      .first()
      .find("[data-cy=history-entry-excercise]:contains('Bench Press') [data-cy=history-entry-weight]")
      .should("have.text", "47.5");
  });
});
