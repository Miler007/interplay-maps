/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'text-summary'],
  coverageThreshold: {
    'src/pipeline/whatsapp-parser.ts': {
      branches: 90, functions: 90, lines: 95, statements: 95,
    },
    'src/pipeline/filters.ts': {
      branches: 85, functions: 90, lines: 90, statements: 90,
    },
    'src/pipeline/entity-extractor.ts': {
      branches: 80, functions: 90, lines: 90, statements: 90,
    },
    'src/pipeline/relationship-detector.ts': {
      branches: 75, functions: 90, lines: 90, statements: 90,
    },
    'src/utils.ts': {
      branches: 80, functions: 90, lines: 90, statements: 90,
    },
  },
};
