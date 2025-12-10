export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    GEOAPIFY_API_KEY: process.env.GEOAPIFY_API_KEY,
  },
});
