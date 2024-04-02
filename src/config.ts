import escalade from 'escalade'
import fs from 'fs'

export interface Config {
  generators: string[]
}

export function readConfig(cwd: string) {
  // Keep reading next nearest package.json until "codegentool" field is found or we run out of packages to read.
  let config: Config | undefined
  let configPath: string | undefined

  const watchPaths: string[] = []
  escalade(cwd, (dir, names) => {
    watchPaths.push(dir + '/package.json')
    if (names.includes('package.json')) {
      const pkg = JSON.parse(fs.readFileSync(dir + '/package.json', 'utf8'))
      if (pkg.codegentool) {
        config = pkg.codegentool
        configPath = dir + '/package.json'
        return dir
      }
    }
    if (names.includes('.git')) {
      return dir
    }
  })

  config ||= {
    generators: ['generators/**/*.[mc]?[jt]s'],
  }

  return {
    config,
    configPath,
    watchPaths,
  }
}
