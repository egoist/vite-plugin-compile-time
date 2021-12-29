import { sum } from "./dep"

export default () => {
  return {
    data: {
      a: "a",
      num: sum(1, 2),
    },
  }
}
