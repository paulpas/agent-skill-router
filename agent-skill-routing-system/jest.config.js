module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'json', 'json-summary'],
  transform: {
    '^.+\\.tsx?$': ['/home/paulpas/git/agent-skill-router/agent-skill-routing-system/node_modules/ts-jest/dist/index.js', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  verbose: true,
};
