import fs from "fs"
import path from "path"
import { sum } from "./dep"

export const a = compileTime(async () => {
  const message = await fs.promises.readFile(
    path.join(__dirname, "message.txt"),
    "utf-8",
  )
  return {
    message,
    count: sum(1, 25),
  }
})

const another = compileTime(async () => {
  return "another"
})

console.log("build", another)
