const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const jestPlugin = require('eslint-plugin-jest');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Jest-specific configuration
    files: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}', 'jest.setup.js'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest, // This adds all Jest globals
        ...globals.node, // Add node globals if needed
      },
    },
    rules: {
      // You can add Jest-specific rules here if needed
    },
  }
]);const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const jestPlugin = require('eslint-plugin-jest');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Jest-specific configuration
    files: ['**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}', 'jest.setup.js'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest, // This adds all Jest globals
        ...globals.node, // Add node globals if needed
      },
    },
    rules: {
      // You can add Jest-specific rules here if needed
    },
  }
]);