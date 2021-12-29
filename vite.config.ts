import { defineConfig } from "vite"
import compileTime from "./src"

export default defineConfig({
  plugins: [compileTime()],
})
