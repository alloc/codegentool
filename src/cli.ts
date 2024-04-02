#!/usr/bin/env node
import cac from 'cac'
import { bundleRequire } from 'bundle-require'
import { getOutputFile } from './util'
import { watch, FSWatcher } from 'chokidar'
import { readConfig } from './config'
import { dequal } from 'dequal'
import type { API } from './api'
import fs from 'fs'
import path from 'path'
import glob from 'fast-glob'

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
  const watchers = new Map<string, Promise<FSWatcher>>()

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
        watchers.forEach(promise => {
          promise.then(watcher => watcher.close())
        })
        start(cwd, options)
      }
    } else if (event == 'add' || event == 'change') {
      const promise = watchers.get(name) ?? Promise.resolve()
      promise.then(watcher => {
        watcher?.close()
        generate(name)
      })
    }
  })

  await new Promise<void>(resolve => {
    watcher.once('ready', () => {
      initialized = true
      resolve()
    })
  })

  if (!options.watch) {
    watcher.close()
    watchers.forEach(promise => {
      promise.then(watcher => watcher.close())
    })
  }
}

async function generate(generatorPath: string) {
  const watcher = watch([generatorPath], {
    ignoreInitial: true,
  })
  try {
    const {
      mod: { default: generator },
      dependencies,
    } = await bundleRequire({
      filepath: generatorPath,
      getOutputFile,
    })
    if (typeof generator !== 'function') {
      throw new Error(`Generator must default export a function`)
    }
    const watchPaths: string[] = []
    const api: API = {
      scan: (source, options) => {
        const cwd = path.resolve(options?.cwd || '.')
        if (Array.isArray(source)) {
          watchPaths.push(...source.map(s => path.resolve(cwd, s)))
        } else {
          watchPaths.push(path.resolve(cwd, source))
        }
        return glob.sync(source, options)
      },
      read: (file, encoding): any => {
        watchPaths.push(file)
        return fs.readFileSync(file, encoding)
      },
      write: (file, data) => {
        fs.writeFileSync(file, data)
      },
    }
    await generator(api)
    console.log({ dependencies, watchPaths })
    watcher.add([...dependencies, ...watchPaths])
  } catch (error) {
    console.error(error)
  }
  return watcher
}
