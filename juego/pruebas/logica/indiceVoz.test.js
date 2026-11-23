import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Duplex } from 'node:stream'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { rutaVoz } from '#kit/reproductor/datos/registroJuegos.js'

// Pasa la petición por Vite y captura la respuesta HTTP sin abrir un puerto.
async function pedir(servidor, ruta) {
  const partes = []
  const conexion = new Duplex({
    read() {},
    write(parte, _codificacion, terminar) {
      partes.push(parte)
      terminar()
    },
  })
  const peticion = new IncomingMessage(conexion)
  Object.assign(peticion, { method: 'GET', url: '/' + ruta, headers: { host: 'localhost', accept: '*/*' } })
  const respuesta = new ServerResponse(peticion)
  respuesta.assignSocket(conexion)
  const fin = once(respuesta, 'finish')
  servidor.middlewares(peticion, respuesta)
  await fin
  return {
    estado: respuesta.statusCode,
    cache: respuesta.getHeader('cache-control'),
    cuerpo: Buffer.concat(partes).toString('utf8').split('\r\n\r\n')[1],
  }
}

test('Vite sirve un índice vacío sin grabaciones y el índice publicado en la próxima apertura', async (t) => {
  const raiz = await mkdtemp(path.join(tmpdir(), 'kusi-indice-voz-'))
  let servidor
  t.after(async () => {
    await servidor?.close()
    await rm(raiz, { recursive: true, force: true })
  })
  servidor = await createServer({
    root: raiz,
    configFile: fileURLToPath(new URL('../../vite.config.js', import.meta.url)),
    publicDir: false,
    server: { middlewareMode: true, watch: null, ws: false },
  })

  const carpeta = rutaVoz('10000000-0000-4000-8000-000000000000')
  const rutaIndice = carpeta + 'voz.json'
  const vacio = await pedir(servidor, rutaIndice)
  assert.equal(vacio.estado, 200)
  assert.equal(vacio.cache, 'no-store')
  assert.deepEqual(JSON.parse(vacio.cuerpo), { voz: null, frases: {} })
  assert.equal((await pedir(servidor, carpeta + 'audio.m4a')).estado, 404)
  assert.equal((await pedir(servidor, 'taller/trabajos/no-es-un-uuid/voz/voz.json')).estado, 404)

  const grabado = { voz: 'Paulina', frases: { Hola: '100000000001.m4a' } }
  await mkdir(path.join(raiz, carpeta), { recursive: true })
  await writeFile(path.join(raiz, rutaIndice), JSON.stringify(grabado))
  const publicado = await pedir(servidor, rutaIndice)
  assert.equal(publicado.estado, 200)
  assert.deepEqual(JSON.parse(publicado.cuerpo), grabado)
})
