const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const clientLocales = path.resolve(projectRoot, '../client/src/locales');

const config = getDefaultConfig(projectRoot);

// Symlinked locales under ./locales resolve to client; watch the real files for HMR.
config.watchFolders = [...(config.watchFolders ?? []), clientLocales];
config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: './global.css' });
