module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        target: 'es2020',
        strict: true,
        esModuleInterop: true,
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
