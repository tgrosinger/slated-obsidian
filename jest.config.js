module.exports = {
  verbose: true,
  preset: 'ts-jest',
  moduleNameMapper: {
    'src/(.*)': '<rootDir>/src/$0',
  },
  transform: {
    '^.+\\.svelte$': ['svelte-jester', { preprocess: true }],
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'ts', 'svelte'],
  modulePathIgnorePatterns: ['yarn-cache'],
};
