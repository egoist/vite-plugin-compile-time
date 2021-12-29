const data = import.meta.compileTime("./get-data.ts")

let count = 40

import.meta.compileTime("./generate-code.ts")

console.log(data, count)
