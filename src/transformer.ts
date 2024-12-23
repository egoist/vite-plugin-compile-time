import fs from "fs"
import { parse } from "@babel/parser"
import { createRequire } from "module"
import {
  deadCodeElimination,
  findReferencedIdentifiers,
} from "babel-dead-code-elimination"
import { bundleRequire } from "bundle-require"
import MagicString from "magic-string"
import { stringifyValue } from "./stringify"
import {
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
} from "@babel/types"

// Injected by TSUP
declare const TSUP_FORMAT: "esm" | "cjs" | undefined

const COMPILE_TIME_FUNCTION_INJECT = `const compileTime=fn=>typeof fn==='function'?fn():fn;`

const req =
  typeof TSUP_FORMAT === "undefined" || TSUP_FORMAT === "esm"
    ? createRequire(import.meta.url)
    : require

const extensionsRe = /\.(([jt]sx?)|mjs|cjs|mts|cts|vue|astro|svelte)$/
type Match = { name: string; start: number; end: number }

const isInCompileScript = (filepath: string) =>
  /\.compile\.[jt]sx?$/.test(filepath)

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

    if (isInCompileScript(filepath)) return

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
    const t = await import("@babel/types")

    traverse.default(ast, {
      CallExpression(path) {
        if (
          t.isIdentifier(path.node.callee, {
            name: "compileTime",
          })
        ) {
          const parent = path.parent

          if (!t.isVariableDeclarator(parent) || !t.isIdentifier(parent.id)) {
            throw new Error(
              `missing assignment, compileTime must be used as const foo = compileTime(...)`,
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

          path.replaceWith(t.identifier("null"))
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
    if (!extensionsRe.test(filepath) || isInCompileScript(filepath)) {
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
        _filepath = _filepath.replace(/\\/g, "/")
        const content = fs.readFileSync(_filepath, "utf-8")
        if (_filepath === filepath) {
          const s = new MagicString(content)
          s.prepend(
            `export const ${exportName} = {};${COMPILE_TIME_FUNCTION_INJECT}`,
          )

          // add await prefix
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

      const value = await stringifyValue(values[m.name])

      s.overwrite(start, end, value)
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

  async handleImport(code: string, filepath: string) {
    if (!isInCompileScript(filepath)) return

    const { mod, dependencies } = await bundleRequire({
      filepath,
      esbuildOptions: {
        banner: {
          js: COMPILE_TIME_FUNCTION_INJECT,
        },
      },
    })

    const traverse = req("@babel/traverse") as typeof import("@babel/traverse")
    const t = await import("@babel/types")

    const ast = parse(code, { sourceType: "module" })

    const exports: { name: string; isFunction: boolean }[] = []

    const checkFunctionExpression = (
      node: FunctionExpression | ArrowFunctionExpression | FunctionDeclaration,
    ) => {
      if (node.params.length > 0) {
        throw new Error(
          `Exported function in .compile files must not have parameters`,
        )
      }
    }

    traverse.default(ast, {
      ExportNamedDeclaration(path) {
        const declaration = path.node.declaration
        if (t.isVariableDeclaration(declaration)) {
          const first = declaration.declarations[0]
          if (t.isVariableDeclarator(first)) {
            const id = first.id
            if (t.isIdentifier(id)) {
              if (
                t.isFunctionExpression(first.init) ||
                t.isArrowFunctionExpression(first.init)
              ) {
                checkFunctionExpression(first.init)

                exports.push({
                  name: id.name,
                  isFunction: true,
                })
              } else {
                exports.push({
                  name: id.name,
                  isFunction: false,
                })
              }
            }
          }
        } else if (t.isFunctionDeclaration(declaration)) {
          checkFunctionExpression(declaration)

          if (t.isIdentifier(declaration.id)) {
            exports.push({
              name: declaration.id.name,
              isFunction: true,
            })
          }
        }
      },
    })

    let result = ""

    for (const { name, isFunction } of exports) {
      const exported = mod[name]
      const value = await stringifyValue(
        typeof exported === "function" ? await exported() : exported,
      )

      if (isFunction) {
        result += `export function ${name}() { return ${value} }\n`
      } else {
        result += `export const ${name} = ${value}\n`
      }
    }

    return {
      code: result,
      dependencies,
    }
  }
}
