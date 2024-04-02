export function getOutputFile(file: string, format: string) {
  const id = Math.random().toString(36).substring(2, 15)
  return `node_modules/.cache/codegentool/${file.replace(
    /\.([mc]?[tj]s|[tj]sx)$/,
    `.bundled_${id}.${format === 'esm' ? 'mjs' : 'cjs'}`
  )}`
}
