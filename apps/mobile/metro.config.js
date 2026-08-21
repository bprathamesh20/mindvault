const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Monorepo: let Metro resolve + watch the web app's generated Convex API
const projectRoot = __dirname;
const workspaceRoot = require("path").resolve(projectRoot, "../..");

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  require("path").resolve(projectRoot, "node_modules"),
  require("path").resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
