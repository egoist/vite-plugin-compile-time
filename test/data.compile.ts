export const count = 1

export const res = new Response("hi")

export const fn = async () => {
  return Buffer.from("hi")
}

export async function fn2() {
  return Buffer.from("hi")
}

export const text = compileTime(() => {
  return "hi"
})
