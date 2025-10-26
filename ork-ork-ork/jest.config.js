/** @type {import('jest').Config} */
module.exports = {module.exports = {module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {['<rootDir>/jest.setup.js'],AfterEnv: ['<rootDir>/jest.setup.js'],
    '^@/(.*)$': '<rootDir>/src/$1',duleNameMapper: {moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',const customJestConfig = {    '^@/(.*)$': '<rootDir>/src/$1',    '^@/(.*)$': '<rootDir>/src/$1',const customJestConfig = {
  },js'],
  transform: {,
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { 
      presets: [src/$1',son',son',src/$1',
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript''src/**/*.{js,jsx,ts,tsx}','src/**/*.{js,jsx,ts,tsx}',
      ]s', 'tsx', 'js', 'jsx', 'json', 'node'],['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    }],
  },}',
  transformIgnorePatterns: [s: [
    'node_modules/(?!(.*\\.mjs$))','<rootDir>/.next/','!src/**/index.ts','!src/**/index.ts','<rootDir>/.next/',
  ],/',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [dules', '<rootDir>/'],Dir>/'],
    'src/**/*.{js,jsx,ts,tsx}',ootDir>/node_modules/','<rootDir>/node_modules/',
    '!src/**/*.d.ts',
    '!src/**/index.ts',odule.exports = createJestConfig(customJestConfig) moduleDirectories: ['node_modules', '<rootDir>/'], moduleDirectories: ['node_modules', '<rootDir>/'],odule.exports = createJestConfig(customJestConfig)
  ],  testPathIgnorePatterns: [    '<rootDir>/.next/',    '<rootDir>/node_modules/',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  roots: ['<rootDir>/src'],
}
