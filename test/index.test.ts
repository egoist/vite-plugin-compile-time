import { assert, test } from "vitest"
import { foo, bar, res } from "./fixture"

test("compile time", async () => {
  assert.equal(foo, "foo")
  assert.equal(bar, "bar")

  assert.deepEqual(await res.json(), {
    message: "hi",
  })

  assert.equal(res.headers.get("Content-Type"), "application/json")
})
