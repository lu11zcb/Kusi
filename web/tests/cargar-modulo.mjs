import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const cache = new Map()
export async function cargarModulo(url) {
  if (cache.has(url.href)) return cache.get(url.href)
  let { outputText } = ts.transpileModule(await readFile(url, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  })
  for (const match of [...outputText.matchAll(/from\s+(['"])([^'"]+)\1/g)]) {
    let destino
    if (match[2].startsWith('.')) {
      const base = new URL(match[2], url)
      try { destino = await cargarModulo(new URL(base.href + '.ts')) }
      catch (error) {
        if (error.code !== 'ENOENT') throw error
        destino = await cargarModulo(new URL(base.href + '.tsx'))
      }
    } else destino = import.meta.resolve(match[2])
    outputText = outputText.replace(match[0], 'from ' + JSON.stringify(destino))
  }
  const resultado = 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
  cache.set(url.href, resultado)
  return resultado
}
