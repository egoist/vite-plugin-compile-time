import { assert, test } from "vitest"
import { foo, bar } from "./fixture"

test("compile time", () => {
  assert.equal(foo, "foo")
  assert.equal(bar, "bar")
})
