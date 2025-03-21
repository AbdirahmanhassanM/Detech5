module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  runInBand: true
}; 