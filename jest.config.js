module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    __API_HOST__: "https://www.liftosaur.com",
    __ENV__: "prod",
    Rollbar: {
      configure: () => undefined,
    },
  },
};
