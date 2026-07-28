import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const packagePath = require.resolve("brace-expansion/package.json", {
  paths: [process.cwd()],
})
const packageDirectory = path.dirname(packagePath)
const packageMetadata = JSON.parse(fs.readFileSync(packagePath, "utf8"))
const commonJsEntry = path.join(packageDirectory, "dist", "commonjs", "index.js")
const marker = "NREP_BRACE_EXPANSION_COMMONJS_COMPAT"

if (packageMetadata.version !== "5.0.8") {
  throw new Error(
    `Expected brace-expansion 5.0.8, received ${packageMetadata.version}. Review the compatibility patch before upgrading.`
  )
}

const source = fs.readFileSync(commonJsEntry, "utf8")
if (!source.includes(marker)) {
  if (!source.includes("exports.expand = expand")) {
    throw new Error("brace-expansion no longer exposes the expected CommonJS expand function.")
  }

  fs.appendFileSync(
    commonJsEntry,
    `\n// ${marker}: minimatch 3 expects require("brace-expansion") to be callable.\n` +
      "module.exports = Object.assign(exports.expand, exports);\n"
  )
}
