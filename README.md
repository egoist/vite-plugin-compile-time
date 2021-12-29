**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# vite-plugin-compile-time

[![npm version](https://badgen.net/npm/v/vite-plugin-compile-time?v=2)](https://npm.im/vite-plugin-compile-time) [![npm downloads](https://badgen.net/npm/dm/vite-plugin-compile-time)](https://npm.im/vite-plugin-compile-time)

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
export default async () => {
  return {
    data: { hello: "world" },
  }
}

// in your code
const data = import.meta.compileTime("./get-data.ts")
assert.deepEqual(data, { hello: "world" })
```

Compile-time code:

```ts
// generate-code.ts
export default async () => {
  return {
    code: `count++`,
  }
}

// in your code
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
import { CompileTimeFunctionResult } from "vite-plugin-compile-time"

export default async (): CompileTimeFunctionResult => {
  return {
    data: {
      hello: "world",
    },
    // Trigger rebuild when watched files change
    watchFiles: ["/absolute/path"],
  }
}
```

## Sponsors

[![sponsors](https://sponsors-images.egoist.sh/sponsors.svg)](https://github.com/sponsors/egoist)

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
