import glob from 'fast-glob'

type Promisable<T> = T | Promise<T>

export interface API {
  scan(source: string | string[], options?: glob.Options): string[]

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
}

export function defineGenerator(fn: (api: API) => Promisable<void>) {
  return fn
}
