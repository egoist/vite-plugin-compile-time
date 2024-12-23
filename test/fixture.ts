export const foo = compileTime(async () => {
  return "foo"
})

export const bar = compileTime(async () => {
  return "bar"
})

export const res = compileTime(async () => {
  return new Response(
    JSON.stringify({
      message: "hi",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
})

export const buffer = compileTime(() => {
  return Buffer.from("hi")
})
