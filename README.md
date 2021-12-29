**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# vite-plugin-compile-time

[![npm version](https://badgen.net/npm/v/vite-plugin-compile-time?v=2)](https://npm.im/vite-plugin-compile-time) [![npm downloads](https://badgen.net/npm/dm/vite-plugin-compile-time?v=2)](https://npm.im/vite-plugin-compile-time)

Use this plugin to generate code at compile time or get data at compile time in your Vite projects.

## Install

```bash
npm i vite-plugin-compile-time -D
```

```ts
import { defineConfig } from "vite"
import compileTime from "vite-plugin-compile-time"

export default defineConfig({
  plugins: [compileTime()],
})
```

## Usage

Compile-time data:

```ts
// get-data.ts
import fs from "fs"

export default async () => {
  const post = await fs.promises.readFile("./post.md", "utf8")
  return {
    data: { post },
  }
}

// get the data at compile time
const data = import.meta.compileTime("./get-data.ts")
assert.deepEqual(data, { post: "....." })
```

Compile-time code:

```ts
// generate-code.ts
export default async () => {
  return {
    code: `count++`,
  }
}

// insert the generated code at compile time
let count = 0
import.meta.compileTime("./generate-code.ts")
assert.equal(count, 1)
```

## API

Use `import.meta.compileTime` to get compile-time data or code.

```ts
declare interface ImportMeta {
  compileTime: <T>(file: string) => T
}
```

You should return a default export with object containing `code` or `data` property:

```ts
import {
  CompileTimeFunctionArgs,
  CompileTimeFunctionResult,
} from "vite-plugin-compile-time"

export default async (
  args: CompileTimeFunctionArgs,
): CompileTimeFunctionResult => {
  return {
    data: {
      hello: "world",
    },
    // Trigger rebuild when watched files change
    watchFiles: ["/absolute/path"],
  }
}
```

See the type docs on [paka.dev](https://paka.dev/npm/vite-plugin-compile-time#module-index-export-CompileTimeFunction).

## Sponsors

[![sponsors](https://sponsors-images.egoist.sh/sponsors.svg)](https://github.com/sponsors/egoist)

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
