import * as devalue from "devalue"

export async function stringifyValue(value: unknown) {
  if (value instanceof Response) {
    const str = devalue.uneval(await value.arrayBuffer())
    return `new Response(${str}, {
      status: ${devalue.uneval(value.status)},
      headers: ${devalue.uneval([...value.headers.entries()])}
    })`
  } else if (value instanceof Buffer) {
    return `Buffer.from(${devalue.uneval(new Uint8Array(value))})`
  }

  return devalue.uneval(value)
}
