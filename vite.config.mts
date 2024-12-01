import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import compileTime from "./src"

export default defineConfig({
  plugins: [tsconfigPaths(), compileTime()],
})
