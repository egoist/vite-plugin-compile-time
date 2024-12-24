**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# vite-plugin-compile-time

[![npm version](https://badgen.net/npm/v/vite-plugin-compile-time?v=2)](https://npm.im/vite-plugin-compile-time) [![npm downloads](https://badgen.net/npm/dm/vite-plugin-compile-time?v=2)](https://npm.im/vite-plugin-compile-time)

## Why

Use this plugin to run code at compile time and inline the return data in your Vite projects.

## Install

```bash
npm i vite-plugin-compile-time -D
```

In **vite.config.ts**:

```ts
import { defineConfig } from "vite"
import compileTime from "vite-plugin-compile-time"

export default defineConfig({
  plugins: [compileTime()],
})
```

Add a `shims.d.ts` with the following code:

```ts
/// <reference types="vite-plugin-compile-time/client" />
```

## Usage

You can use `compileTime` anywhere as long as it's called on the top-level, i.e. not inside a closure:

```ts
import fs from "fs"

// ✅
const content = compileTime(fs.readFileSync("./post.md", "utf8"))

// ❌
const content = () => compileTime(fs.readFileSync("./post.md", "utf8"))
```

For more complex more you can use a function instead:

```ts
import fs from "fs"

// it also accepts async function
const post = compileTime(async () => {
  const copntent = await fs.promises.readFile("./post.md", "utf8")
  const frontmatter = getFrontmatter(content)
  return { frontmatter, content }
})
```

### Standalone `.compile.ts` files

Or `.compile.js`

Alternatively, you can use a standalone file to evaluate at compile time:

```ts
// post.compile.ts
export const content = fs.readFileSync("./post.md", "utf8")

export const fetchContent = async () => {
  return fetch("https://example.com")
}

// main.ts
import { content, fetchContent } from "./post.compile"

content //=> Buffer

await fetchContent() //=> Response
```

If you export an async function, you can actually call it without using `await` because it's pre-evaluated before you use it, for type-safe purpose you can wrap the function with `compileTime`:

```ts
export const content = compileTime(async () => {
  return fetch("https://example.com")
})

// Now available as a value
// You don't even need to call it
content //=> Response
```

However `compileTime` is optional in `.compile.ts` files, you only need it if you don't want to `await` and want type-safety.

### Supported data types

- JSON-serializable types like `string`, `number`, `boolean`
- regular expressions
- dates
- Map and Set
- BigInt
- ArrayBuffer and Typed Arrays
- Response
- Buffer

## Caveats

The files where you call `compileTime` will be evaluated at build time in Node.js environment, which means you should avoid calling browser APIs on the top level. It's recommended to use `compileTime` in a separate file and import it in your app.

## Sponsors

[![sponsors](https://sponsors-images.egoist.dev/sponsors.svg)](https://github.com/sponsors/egoist)

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
