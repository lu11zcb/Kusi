// Recorrido aislado con API y cuentas sintéticas; nunca escribe en Spring.
// Usa Vite del panel y Chromium ya instalado en juego/.
import {writeFile,rm} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const {chromium,expect}=await import(new URL('../../../juego/node_modules/@playwright/test/index.mjs',import.meta.url))
const web=fileURLToPath(new URL('../../',import.meta.url))
const html=web+'/.revision-asignaciones.html',entrada=web+'/.revision-asignaciones.tsx'
const actividad='11111111-1111-4111-8111-111111111111',anterior='22222222-2222-4222-8222-222222222222',nuevo='33333333-3333-4333-8333-333333333333'
await writeFile(html,'<html lang="es"><meta charset="utf-8"><div id="root"></div><script type="module" src="/.revision-asignaciones.tsx"></script></html>')
await writeFile(entrada,"import React from 'react'; import {createRoot} from 'react-dom/client'; import {ResultadosDocente} from './src/docente/ResultadosDocente'; import './src/index.css'; import './src/docente/docente.css'; import './src/docente/resultados.css'; createRoot(document.getElementById('root')!).render(<div className='panel-docente'><ResultadosDocente activo={true}/></div>);")
const nav=await chromium.launch()
try {
 const pag=await nav.newPage({viewport:{width:1280,height:900}}); let asignado=false,fallar=true;const envios=[];const errores=[];pag.on('pageerror',e=>errores.push(e.message))
 await pag.route('**/api/edu/**',async ruta=>{
  const url=new URL(ruta.request().url()).pathname;let datos;let status=200
  if(url.endsWith('/csrf/'))datos={csrf_token:'token-sintetico'}
  else if(url.endsWith('/asignaciones/')) {
   if(ruta.request().method()==='POST') {
    const cuerpo=ruta.request().postDataJSON(); envios.push(cuerpo);if(fallar){status=500;datos={mensaje:'No se pudo confirmar la asignación.'}}else{asignado=true;datos={guardado:true}}
   }else datos={estudiantes:[{id:anterior,nombre:'Cuenta ya asignada',asignado:true},{id:nuevo,nombre:'Cuenta nueva',asignado}]}
  }else if(url.endsWith('/estudiantes/')) datos={estudiantes:[{id:anterior,nombre:'Cuenta ya asignada',estado:'sin_iniciar',partidas:0,ayudas_usadas:0},...(asignado?[{id:nuevo,nombre:'Cuenta nueva',estado:'sin_iniciar',partidas:0,ayudas_usadas:0}]:[])]}
  else datos={actividades:[{id:actividad,titulo:'Actividad sintética de sumas',seccion:'Sección de prueba'}]}
  await ruta.fulfill({status,contentType:'application/json',body:JSON.stringify(datos)})
 })
 await pag.goto('http://127.0.0.1:5173/.revision-asignaciones.html')
 await pag.getByLabel('Actividad',{exact:true}).selectOption(actividad)
 await pag.getByRole('button',{name:'Asignar a estudiantes nuevos',exact:true}).click()
 await expect(pag.getByRole('checkbox',{name:/Cuenta ya asignada/})).toBeDisabled()
 await expect(pag.getByRole('checkbox',{name:'Cuenta nueva',exact:true})).not.toBeChecked()
 await pag.getByRole('checkbox',{name:'Cuenta nueva',exact:true}).check()
 await pag.getByRole('button',{name:'Asignar a los elegidos (1)',exact:true}).click()
 await expect(pag.getByRole('alert')).toContainText('Revisa la lista antes de intentarlo otra vez.')
 await expect(pag.getByRole('button',{name:'Asignar a los elegidos (1)',exact:true})).toBeDisabled()
 await pag.getByRole('button',{name:'Actualizar la lista',exact:true}).click();fallar=false
 await pag.getByRole('checkbox',{name:'Cuenta nueva',exact:true}).check()
 await pag.getByRole('button',{name:'Asignar a los elegidos (1)',exact:true}).click()
 await expect(pag.getByText('Asignación confirmada',{exact:true})).toBeVisible()
 await expect(pag.getByRole('checkbox',{name:/Cuenta nueva/})).toBeDisabled()
 await expect(pag.getByText('Todos los estudiantes actuales ya recibieron la actividad.')).toBeVisible()
 if(JSON.stringify(envios)!==JSON.stringify([{estudiantes:[nuevo]},{estudiantes:[nuevo]}]))throw Error('Selección incorrecta')
 if(errores.length)throw Error(errores.join(' | '))
 await pag.screenshot({path:'/private/tmp/kusi-asignacion-confirmada.png',fullPage:true})
 console.log('Asignación probada: elección explícita, error sin confirmación falsa, actualización, envío con CSRF y destinatario confirmado.')
}finally{await nav.close();await rm(html,{force:true});await rm(entrada,{force:true})}
