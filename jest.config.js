module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  roots: [
    "<rootDir>/test"
  ],

  testMatch: ["**/*.spec.ts"],

  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: "tsconfig.json"
    }]
  },

  moduleNameMapper: {
    "^node-fetch$": "<rootDir>/test/__mocks__/node-fetch.ts",
  },

  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/services/**/*.ts",
    "src/routes/tenant*.ts"
  ],

  coverageDirectory: "coverage"
};
