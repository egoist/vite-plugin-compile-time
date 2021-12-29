import { sum } from "./dep"

export default () => {
  return {
    data: {
      a: "as2",
      num: sum(1, 2),
    },
  }
}
