import { assert, test } from "vitest"
import { data } from "./fixture"

test("compile time", () => {
  assert.equal(data, "hi")
})
