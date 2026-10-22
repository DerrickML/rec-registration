import { test } from "vitest"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const braces = require("braces")
const root = fileURLToPath(new URL("..", import.meta.url))
const metadata = require("braces/package.json")
const guardError = (error) =>
  error instanceof RangeError &&
  error.code === "ERR_BRACES_MAX_DEPTH" &&
  !/call stack/i.test(error.message)

test("braces ordinary API behavior matches the upstream 3.0.3 baseline", () => {
  const cases = JSON.parse(
    readFileSync(
      new URL("./fixtures/braces-compatibility.json", import.meta.url)
    )
  )
  const results = cases.flatMap(({ input, options }) =>
    ["default", "create", "compile", "expand", "stringify"].map((method) => {
      try {
        return {
          method,
          result: (method === "default" ? braces : braces[method])(
            input,
            options
          )
        }
      } catch (error) {
        return { method, error: { name: error.name, message: error.message } }
      }
    })
  )
  assert.equal(
    crypto.createHash("sha256").update(JSON.stringify(results)).digest("hex"),
    "911fcabad71794fa0e2cc8145353f9ba14da72124d2fb9db5ee8b0c3b446e231"
  )
})

test("all string entry points reject pathological brace and parenthesis nesting", () => {
  for (const input of [
    "{".repeat(4000) + "a,b" + "}".repeat(4000),
    "(".repeat(4000) + "a" + ")".repeat(4000),
    "{".repeat(4000) + "a"
  ]) {
    assert.ok(input.length < 10000)
    for (const method of [
      braces,
      braces.parse,
      braces.create,
      braces.compile,
      braces.expand,
      braces.stringify
    ])
      assert.throws(() => method(input), guardError)
  }
})

test("direct AST traversals are bounded without changing AST round trips", () => {
  const input = "src/{a,{b,c}}/*.js"
  assert.equal(braces.stringify(braces.parse(input)), input)
  assert.equal(braces.compile(braces.parse(input)), braces.compile(input))
  assert.deepEqual(braces.expand(braces.parse(input)), braces.expand(input))
  let ast = { type: "text", value: "a" }
  for (let n = 0; n < 4000; n++) ast = { type: "root", nodes: [ast] }
  for (const method of [braces.compile, braces.expand, braces.stringify])
    assert.throws(() => method(ast), guardError)
})

test("quoted and escaped literals are not mistaken for structural nesting", () => {
  assert.doesNotThrow(() => braces.compile('"' + "{".repeat(1000) + '"'))
  assert.doesNotThrow(() => braces.compile("\\{".repeat(1000)))
  assert.doesNotThrow(() => braces.compile("x".repeat(9000)))
  assert.throws(() => braces.compile("x".repeat(10001)), SyntaxError)
  assert.throws(() => braces.expand("{1..1001}"), /range limit/)
})

test("Tailwind, chokidar and Next ESLint resolve the reviewed parser", () => {
  const tailwind = createRequire(require.resolve("tailwindcss/package.json"))
  const config = createRequire(require.resolve("eslint-config-next"))
  const plugin = createRequire(config.resolve("@next/eslint-plugin-next"))
  for (const parent of [
    createRequire(tailwind.resolve("chokidar/package.json")),
    createRequire(tailwind.resolve("micromatch/package.json")),
    createRequire(
      createRequire(plugin.resolve("fast-glob/package.json")).resolve(
        "micromatch/package.json"
      )
    )
  ]) {
    assert.equal(parent("braces/package.json").name, "@nrep/braces")
    assert.equal(parent("braces/package.json").version, "3.0.3-nrep.1")
    assert.throws(
      () =>
        parent("braces").compile("{".repeat(4000) + "a,b" + "}".repeat(4000)),
      guardError
    )
  }
})

test("installed code matches readable source and the locked archive integrity", () => {
  assert.equal(metadata.private, true)
  assert.equal(metadata.upstream.version, "3.0.3")
  const installed = path.dirname(require.resolve("braces/package.json"))
  for (const name of [
    "package.json",
    "LICENSE",
    "index.js",
    "lib/check-depth.js",
    "lib/parse.js",
    "lib/compile.js",
    "lib/expand.js",
    "lib/stringify.js",
    "lib/utils.js",
    "lib/constants.js"
  ])
    assert.deepEqual(
      readFileSync(path.join(installed, name)),
      readFileSync(path.join(root, "vendor/braces", name))
    )
  const archive = "vendor/nrep-braces-3.0.3-nrep.1.tgz"
  const integrity =
    "sha512-" +
    crypto
      .createHash("sha512")
      .update(readFileSync(path.join(root, archive)))
      .digest("base64")
  const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json")))
  assert.equal(lock.packages["node_modules/braces"].integrity, integrity)
  assert.equal(lock.packages["node_modules/braces"].resolved, "file:" + archive)
})
