# codegentool

[![npm](https://img.shields.io/npm/v/codegentool.svg)](https://www.npmjs.com/package/codegentool)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

> Run code-generating scripts with one command and as files change

&nbsp;

### Configuration

If customization is desired, you may add a `codegentool` field to your `package.json`. By default,
any JS/TS modules in the `./generators` directory will be run.

```json
{
  "codegentool": {
    "generators": ["./generators/*.ts"]
  }
}
```

Generators can be uncompiled TypeScript, no problem. Every generator needs to export a default function which will be called with Codegentool's runtime API.

```ts
import { defineGenerator } from 'codegentool'

export default defineGenerator(({ scan }) => {
  const files = await scan('src/**/*.ts')
  // ...
})
```

&nbsp;

### Usage

```ts
pnpm install -D codegentool
```

Run your project's configured generators:

```sh
pnpm codegentool
```

Rerun them as files change:

```sh
pnpm codegentool -w
```

&nbsp;

## Runtime API

The runtime API is passed to each generator function. As of now, it's only for filesystem operations, so that Codegentool can watch for changes.

### scan()

Alias to [`fast-glob`](https://github.com/mrmlnc/fast-glob?tab=readme-ov-file#api) API with file-watching support.

### read()

Alias to `fs.readFileSync` with file-watching support.

### write()

Alias to `fs.writeFileSync`
