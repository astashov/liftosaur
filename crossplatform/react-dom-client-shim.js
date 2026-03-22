// Shim for react-dom/client used by react-native-web.
// We never call createRoot/hydrateRoot — we render via Preact — but webpack
// needs the import to resolve.
module.exports = {};
