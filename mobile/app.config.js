/**
 * Dynamic Expo config — injects Google Maps keys from env.
 * Native rebuild is required after changing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config ?? {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
