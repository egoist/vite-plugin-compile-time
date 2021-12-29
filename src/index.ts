import path from "path"
import { Plugin } from "vite"
import MagicString from "magic-string"
import { bundleRequire } from "bundle-require"
import devalue from "devalue"

type MaybePromise<T> = T | Promise<T>

export type CompileTimeFunctionResult = MaybePromise<{
  /** Get data at compile time */
  data?: any
  /** Generate code at compile time */
  code?: string
  /** Trigger rebuild when watched files change */
  watchFiles?: string[]
}>

export type CompileTimeFunction = () => CompileTimeFunctionResult

const createPlugins = (): Plugin[] => {
  let useSourceMap = false
  const loadCache: Map<
    string,
    { data?: any; code?: string; watchFiles?: string[] }
  > = new Map()
  return [
    {
      name: "compile-time",
      enforce: "pre",
      configResolved(config) {
        useSourceMap = !!config.build.sourcemap
      },
      configureServer(server) {
        server.watcher.on("all", (_, id) => {
          for (const [k, cache] of loadCache) {
            if (cache.watchFiles?.includes(id)) {
              loadCache.delete(k)
            }
          }
        })
      },
      async transform(code, id) {
        if (
          id.includes("node_modules") ||
          !/\.(js|ts|jsx|tsx|mjs|vue|svelte)$/.test(id)
        )
          return

        const s = new MagicString(code)
        const m = [
          ...code.matchAll(/import\.meta\.compileTime\(['"`]([^'"`]+)['"`]\)/g),
        ]

        if (m.length === 0) return

        const dir = path.dirname(id)
        for (const [i, item] of m.entries()) {
          const start = item.index!
          const end = item.index! + item[0].length
          const filepath = path.resolve(dir, item[1])

          const cacheKey = filepath
          let cache = loadCache.get(cacheKey)
          if (!cache) {
            const { mod, dependencies } = await bundleRequire({ filepath })
            const defaultExport: CompileTimeFunction | undefined =
              mod.default || mod
            cache = (defaultExport && (await defaultExport())) || {}
            cache.watchFiles = [
              filepath,
              ...(cache.watchFiles || []),
              ...dependencies.map((p) => path.resolve(p)),
            ]
            if (cache.data) {
              cache.data = devalue(cache.data)
            }
            loadCache.set(cacheKey, cache)
          }

          let replacement = "null"
          if (cache.watchFiles) {
            cache.watchFiles.forEach((filepath) => {
              this.addWatchFile(filepath)
            })
          }
          if (cache.data !== undefined) {
            replacement = cache.data
          } else if (cache.code !== undefined) {
            replacement = cache.code
          }

          s.overwrite(start, end, replacement)
        }
        return {
          code: s.toString(),
          map: useSourceMap ? s.generateMap({ source: id }) : null,
        }
      },
    },
  ]
}

export default createPlugins
