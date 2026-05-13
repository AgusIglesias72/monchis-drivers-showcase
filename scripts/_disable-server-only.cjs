// Preload helper for tsx scripts that need to import code annotated with
// `import "server-only"`. The package only throws at runtime, so we stub its
// module exports before anything else loads it.
//
// Usage: tsx --require ./scripts/_disable-server-only.cjs scripts/<script>.ts

const path = require("path")

try {
  const serverOnlyPath = require.resolve("server-only")
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    paths: [],
    children: [],
  }
} catch (err) {
  // server-only not installed — nothing to neutralize
}
