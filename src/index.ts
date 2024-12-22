import path from "path"
import { Plugin } from "vite"
import { Transformer } from "./transformer"

type MaybePromise<T> = T | Promise<T>

export type CompileTimeFunctionArgs = {
  /** Root directory of the Vite project */
  root: string
}

export type CompileTimeFunctionResult = MaybePromise<{
  /** Get data at compile time */
  data?: any
  /** Generate code at compile time */
  code?: string
  /** Trigger rebuild when watched files change */
  watchFiles?: string[]
}>

export type CompileTimeFunction = (
  args: CompileTimeFunctionArgs,
) => CompileTimeFunctionResult

const createPlugins = (): Plugin[] => {
  let useSourceMap = false
  const loadCache: Map<
    string,
    { data?: any; code?: string; watchFiles?: string[] }
  > = new Map()

  const transformer = new Transformer()
  return [
    {
      name: "compile-time",
      enforce: "pre",
      buildStart() {
        transformer.reset()
      },

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
        return transformer.insertPlaceholders(code, id, { useSourceMap })
      },
    },

    {
      name: "compile-time:run-code",
      enforce: "pre",

      async transform(_, id) {
        const result = await transformer.replaceWithData(id, { useSourceMap })

        if (!result) return

        if (result.dependencies) {
          result.dependencies.forEach((filepath) => {
            this.addWatchFile(path.resolve(filepath))
          })
        }

        return {
          code: result.code,
          map: result.map,
        }
      },
    },
  ]
}

export default createPlugins
