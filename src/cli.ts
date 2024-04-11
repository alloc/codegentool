#!/usr/bin/env node
import cac from 'cac'
import { bundleRequire } from 'bundle-require'
import { getOutputFile } from './util'
import { watch } from 'chokidar'
import { Config, readConfig } from './config'
import { dequal } from 'dequal'
import type { API } from './api'
import fs from 'fs'
import path from 'path'
import glob from 'fast-glob'
import dedent from 'dedent'
import kleur from 'kleur'

const program = cac('codegentool')

type Options = {
  watch: boolean
}

program
  .command('')
  .option('--watch, -w', 'Enable file watching and automatic reruns')
  .action(options => start(process.cwd(), options))

program.parse()

async function start(cwd: string, options: Options) {
  const { config, configPath, watchPaths } = readConfig(cwd)
  if (configPath) {
    process.chdir(path.dirname(configPath))
  }

  const watcher = watch([...config.generators, ...watchPaths])
  const generators = new Map<string, Promise<() => void>>()

  const regenerate = debounce((name: string) => {
    const promise = generators.get(name) ?? Promise.resolve()
    promise
      .then(close => close?.())
      .then(() => {
        generators.set(name, generate(name, config))
      })
  }, 100)

  let initialized = false
  watcher.on('all', (event, name) => {
    if (name.endsWith('package.json')) {
      if (!initialized) return

      const configResult = readConfig(process.cwd())
      if (
        !dequal(config, configResult.config) ||
        !dequal(watchPaths, configResult.watchPaths)
      ) {
        watcher.close()
        generators.forEach(async close => (await close)())
        start(cwd, options)
      }
    } else if (event == 'add' || event == 'change') {
      regenerate(name)
    }
  })

  await new Promise<void>(resolve => {
    watcher.once('ready', () => {
      initialized = true
      resolve()
    })
  })

  if (options.watch) {
    console.log(`⌘ Watching for changes...`)
  } else {
    watcher.close()
    generators.forEach(async close => (await close)())
  }
}

async function generate(generatorPath: string, config: Config) {
  const watcher = watch([generatorPath], {
    ignoreInitial: true,
  })

  let close = Promise.resolve(() => watcher.close())

  // Regenerate when a file changes.
  watcher.on(
    'all',
    debounce(() => {
      watcher.close()
      close = generate(generatorPath, config)
    }, 500)
  )

  try {
    console.log(
      `▶ Running %s`,
      kleur.cyan(path.relative(process.cwd(), generatorPath))
    )
    const {
      mod: { default: generator },
      dependencies,
    } = await bundleRequire({
      filepath: generatorPath,
      getOutputFile,
      tsconfig: config.tsconfig,
      format: config.format,
    })

    if (typeof generator !== 'function') {
      throw new Error(`Generator must default export a function`)
    }

    watcher.add(dependencies)

    let filesGenerated = 0

    const watchPaths = new Set<string>()
    const api: API = {
      scan: (source, options) => {
        const cwd = path.resolve(options?.cwd || '.')
        if (Array.isArray(source)) {
          source.forEach(s => watchPaths.add(path.resolve(cwd, s)))
        } else {
          watchPaths.add(path.resolve(cwd, source))
        }
        return glob.sync(source, options)
      },
      read: (file, encoding): any => {
        watchPaths.add(file)
        return fs.readFileSync(file, encoding)
      },
      write: (file, data) => {
        if (typeof data === 'string') {
          let current: string | undefined
          try {
            current = fs.readFileSync(file, 'utf8')
          } catch {}

          if (data !== current) {
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, data)

            filesGenerated++
            console.log(
              `✔️ Generated %s`,
              kleur.green(path.relative(process.cwd(), file))
            )
          }
        } else {
          let current: Buffer | undefined
          try {
            current = fs.readFileSync(file)
          } catch {}

          if (!current?.equals(data)) {
            fs.mkdirSync(path.dirname(file), { recursive: true })
            fs.writeFileSync(file, data)

            filesGenerated++
            console.log(
              `✔️ Generated %s`,
              kleur.green(path.relative(process.cwd(), file))
            )
          }
        }
      },
      dedent,
    }

    await generator(api)

    if (!filesGenerated) {
      console.log(
        `✔️ Nothing updated by %s`,
        kleur.cyan(path.relative(process.cwd(), generatorPath))
      )
    }

    // If the generator throws, only the generator is watched.
    watcher.add([...watchPaths])
  } catch (error: any) {
    console.error(`Error in ${path.resolve(generatorPath)}`)
    console.error(error)
  }

  return async () => (await close)()
}

function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn.apply(this, args), wait)
  } as T
}
