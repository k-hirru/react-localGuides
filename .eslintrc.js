module.exports = {
  extends: ['expo'],
  settings: {
    // Treat @env as a core module so import/no-unresolved doesn't try to resolve it
    'import/core-modules': ['@env'],
  },
};