// Render compatibility shim — delegates to compiled TypeScript output.
// The Render service start command is hardcoded to `node index.js`.
// TypeScript source is compiled to dist/index.js via the postinstall hook.
//
// Also re-exports all named exports so that tests importing '../index.js'
// can access { server, io, app, redisPub, redisSub } correctly.
export * from "./dist/index.js";
