module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/test/**/*.test.ts"],
  moduleNameMapper: {
    "^vscode$": "<rootDir>/src/test/__mocks__/vscode.ts",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { diagnostics: { ignoreCodes: [151002] } }],
  },
};
