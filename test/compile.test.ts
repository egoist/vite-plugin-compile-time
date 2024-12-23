import { assert, test } from "vitest"
import { fn, fn2, count, res, text } from "./data.compile"

test("import .compile file", async () => {
  assert.equal((await fn()).toString(), "hi")

  assert.equal((await fn2()).toString(), "hi")

  assert.equal(count, 1)

  assert.equal(await res.text(), "hi")

  assert.equal(text, "hi")
})
