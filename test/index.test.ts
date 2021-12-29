import { assert, test } from "vitest"

test("compile time data", () => {
  const res = import.meta.compileTime("./fixture-data.ts")
  assert.deepEqual(res, {
    a: "a",
    num: 3,
  })
})

test("compile time code", () => {
  let count = 0
  import.meta.compileTime("./fixture-code.ts")
  assert.equal(count, 1)
})
