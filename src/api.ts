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

  /**
   * Similar to `import(…)` but its result can be casted with `loadModule<Exports>(…)` and it
   * returns null when the module is not found, instead of rejecting.
   *
   * The loaded module and any local modules imported by it are watched by `codegentool` so the
   * generator can automatically rerun on changes.
   *
   * Finally, it fixes the import path to be relative to the bundled generator (kept elsewhere in
   * the filesystem), which is the main reason to use this over `import(…)`. You can optionally
   * provide a `basedir` argument to use instead of the bundled generator's directory.
   */
  loadModule<Exports = any>(
    path: string,
    basedir?: string
  ): Promise<Exports | null>
}

export function defineGenerator(fn: (api: API) => Promisable<void>) {
  return fn
}
