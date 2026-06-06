// Render compatibility shim — delegates to compiled TypeScript output.
// The Render service start command is hardcoded to `node index.js`.
// TypeScript source is compiled to dist/index.js via the postinstall hook.
import "./dist/index.js";
