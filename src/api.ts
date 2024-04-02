import type { Options as GlobOptions } from 'fast-glob'
import dedent from 'dedent'

type Promisable<T> = T | Promise<T>

export interface API {
  scan(source: string | string[], options?: GlobOptions): string[]

  read(
    path: string,
    options?: {
      encoding?: null | undefined
      flag?: string | undefined
    } | null
  ): Buffer

  read(
    path: string,
    options:
      | {
          encoding: BufferEncoding
          flag?: string | undefined
        }
      | BufferEncoding
  ): string

  read(
    path: string,
    options?:
      | {
          encoding?: BufferEncoding | null | undefined
          flag?: string | undefined
        }
      | BufferEncoding
      | null
  ): string | Buffer

  write(path: string, data: string | Buffer): void

  dedent: typeof dedent
}

export function defineGenerator(fn: (api: API) => Promisable<void>) {
  return fn
}
