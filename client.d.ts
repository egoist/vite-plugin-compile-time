type MaybePromise<T> = T | Promise<T>

declare const compileTime: <T>(
  fn: MaybePromise<T> | (() => MaybePromise<T>),
) => T
