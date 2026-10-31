import test from 'node:test'
import assert from 'node:assert/strict'
import { JoystickLaberinto } from '../../juegos/laberinto/interfaz/JoystickLaberinto.js'
test('la base no sigue al dedo ni desaparece y otro puntero no roba el control', () => {
  const imagen=(x,y)=>({x,y,setDisplaySize(){return this},setDepth(){return this},setPosition(x,y){this.x=x;this.y=y;return this}})
  const escena={guia:{joystick:{x:186,y:591}},add:{image:imagen},
    cameras:{main:{zoom:1,getWorldPoint:(x,y)=>({x,y})}},
    game:{canvas:{getBoundingClientRect:()=>({left:0,top:0,width:1600,height:720})}},
    scale:{width:1600,height:720},proyectar:(x,y)=>({x,y})}
  const j=new JoystickLaberinto(escena)
  assert.equal(j.iniciar({id:1,x:900,y:200}),false)
  assert.equal(j.iniciar({id:1,x:186,y:591}),true)
  assert.equal(j.iniciar({id:2,x:186,y:591}),false)
  assert.equal(j.mover({id:2,x:0,y:0}),null)
  assert.equal(j.mover({id:1,x:500,y:591}).direccion,'derecha')
  assert.equal(j.base.x,186)
  assert.ok(j.perilla.x<=186+62)
  assert.equal(j.soltar({id:2}),false)
  assert.equal(j.soltar({id:1}),true)
  assert.deepEqual(j.estado().perilla,{x:186,y:591})
  assert.equal(j.estado().visible,true)
})

test('en un celular el recorrido dentro de la base supera la zona muerta', () => {
  const imagen = (x, y) => ({ x, y, setDisplaySize() { return this }, setDepth() { return this },
    setPosition(x, y) { this.x = x; this.y = y; return this } })
  const escena = { guia: { joystick: { x: 1500, y: 616, radio: 92, radioPerilla: 44 } }, add: { image: imagen },
    cameras: { main: { zoom: 1, getWorldPoint: (x, y) => ({ x, y }) } },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 360 }) } },
    scale: { width: 1600, height: 720 }, proyectar: (x, y) => ({ x: x / 2, y: y / 2 }) }
  const j = new JoystickLaberinto(escena)
  assert.equal(j.iniciar({ id: 1, x: 1500, y: 616 }), true)
  assert.equal(j.mover({ id: 1, x: 1516, y: 616 }).direccion, null)
  // 20 px visibles, dentro de los 24 px del recorrido máximo de la perilla.
  assert.equal(j.mover({ id: 1, x: 1540, y: 616 }).direccion, 'derecha')
  assert.ok(j.perilla.x <= 1548)
})
