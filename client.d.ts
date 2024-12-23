type MaybePromise<T> = T | Promise<T>

declare const compileTime: <T>(
  fn: MaybePromise<T> | (() => MaybePromise<T>),
) => T

declare const compileTimeFn =
  <T>(fn: () => MaybePromise<T>) =>
  () =>
    T
