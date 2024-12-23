import fs from "fs"
import * as devalue from "devalue"
import { parse } from "@babel/parser"
import path from "path"
import { createRequire } from "module"
import {
  deadCodeElimination,
  findReferencedIdentifiers,
} from "babel-dead-code-elimination"
import { bundleRequire } from "bundle-require"
import MagicString from "magic-string"
import { fileURLToPath } from "url"

// Injected by TSUP
declare const TSUP_FORMAT: "esm" | "cjs" | undefined

const req =
  typeof TSUP_FORMAT === "undefined" || TSUP_FORMAT === "esm"
    ? createRequire(import.meta.url)
    : require

const DIRNAME =
  typeof __dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : __dirname

const extensionsRe = /\.(([jt]sx?)|mjs|cjs|mts|cts|vue|astro|svelte)$/
type Match = { name: string; start: number; end: number }

export class Transformer {
  cache: Map<string, { result?: any; watchFiles?: string[] }> = new Map()
  files: Map<string, string> = new Map()
  matches: Map<string, Match[]> = new Map()

  reset() {
    this.cache.clear()
    this.files.clear()
    this.matches.clear()
  }

  async insertPlaceholders(
    code: string,
    filepath: string,
    { useSourceMap }: { useSourceMap: boolean },
  ) {
    this.matches.delete(filepath)

    if (!code.includes("compileTime(") || !extensionsRe.test(filepath)) {
      return
    }

    const matches: Match[] = []
    this.files.set(filepath, code)

    const ast = parse(code, { sourceType: "module" })

    const referenced = findReferencedIdentifiers(ast)

    const traverse = req("@babel/traverse") as typeof import("@babel/traverse")
    const generator = req(
      "@babel/generator",
    ) as typeof import("@babel/generator")

    traverse.default(ast, {
      CallExpression(path) {
        if (
          path.node.callee.type === "Identifier" &&
          path.node.callee.name === "compileTime" &&
          path.parent.type !== "AwaitExpression"
        ) {
          const parent = path.parent

          if (
            parent.type !== "VariableDeclarator" ||
            parent.id.type !== "Identifier"
          ) {
            throw new Error(
              `missing assignment, compileTime must be used as export const foo = compileTime(...)`,
            )
          }

          const name = parent.id.name

          const start = path.node.start!
          const end = path.node.end!

          matches.push({
            name,
            start,
            end,
          })

          path.replaceWith({
            type: "Identifier",
            name: "null",
          })
        }
      },
    })

    if (matches.length === 0) return

    deadCodeElimination(ast, referenced)

    const result = generator.default(ast, {
      sourceFileName: filepath,
      sourceMaps: useSourceMap,
    })

    this.matches.set(filepath, matches)

    return {
      code: result.code,
      map: result.map,
    }
  }

  async replaceWithData(
    filepath: string,
    { useSourceMap }: { useSourceMap: boolean },
  ) {
    if (!extensionsRe.test(filepath)) {
      return
    }

    const content = this.files.get(filepath)
    if (!content) {
      return
    }

    const matches = this.matches.get(filepath) || []

    if (matches.length === 0) {
      return
    }

    const exportName = "__compile_time_data__"
    const { mod, dependencies } = await bundleRequire({
      filepath,
      readFile(_filepath) {
        const content = fs.readFileSync(_filepath, "utf-8")

        if (_filepath === filepath.replace(/\\/g, "/")) {
          // add await prefix
          const s = new MagicString(content)
          s.prepend(
            `export const ${exportName} = {};const compileTime=fn=>fn();`,
          )

          for (const m of matches) {
            s.prependLeft(
              m.start,
              `${exportName}[${JSON.stringify(m.name)}] = await `,
            )
          }
          return s.toString()
        }

        return content
      },
    })

    const values: Record<string, any> = mod[exportName]

    const s = new MagicString(content)
    for (const m of matches) {
      const start = m.start
      const end = m.end

      let value = values[m.name]
      let replacement = ""

      if (value instanceof Response) {
        const str = devalue.uneval(await value.arrayBuffer())
        replacement = `new Response(${str})`
      } else {
        replacement = devalue.uneval(value)
      }

      s.overwrite(start, end, replacement)
    }

    if (useSourceMap) {
      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      }
    }

    return {
      code: s.toString(),
      dependencies,
    }
  }
}
