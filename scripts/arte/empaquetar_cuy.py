"""Lossless indexed packaging and review previews of Pixelorama's exported cels."""
from pathlib import Path
from collections import deque
import hashlib
import json
import os
import shutil
from PIL import Image, ImageDraw

PROJECT=Path(__file__).resolve().parents[2]
ART=PROJECT/'juego/arte'
PUBLIC=PROJECT/'juego/public/dibujos'
DOC=PROJECT/'docs/arte/produccion'
LAB=Path('C:/Users/luis/.codex/visualizations/2026/10/22/01a16598-c7d1-7310-8edd-1052663828ab/cuy-production-v1')
COLORS=['#3D210F','#A05835','#FBE1C6','#E95343','#F3A27D','#FFF8ED','#6B2627','#D57670']
DIRS=['frente','espaldas','derecha','izquierda']
W,H=112,128

for p in [ART,PUBLIC,DOC]:p.mkdir(parents=True,exist_ok=True)
raw=PUBLIC/'cuy-nino-animado-v1_spritesheet.png'
im=Image.open(raw).convert('RGBA')
assert im.size==(896,512)
rgba=list(im.get_flattened_data())
assert set(c[3] for c in rgba)=={0,255}
rgb=[tuple(bytes.fromhex(c[1:])) for c in COLORS]
lookup={c:i+1 for i,c in enumerate(rgb)}
indices=[0 if a==0 else lookup[(r,g,b)] for r,g,b,a in rgba]
indexed=Image.new('P',im.size)
indexed.putpalette([v for c in [(0,0,0)]+rgb for v in c]+[0]*(768-3*(len(rgb)+1)))
indexed.putdata(indices)
sheet=PUBLIC/'cuy-nino-animado-v1.png'
indexed.save(sheet,transparency=0,bits=4,optimize=True)
assert list(Image.open(sheet).convert('RGBA').get_flattened_data())==rgba
shutil.copy2(raw,ART/'cuy-nino-animado-v1-export-pixelorama.png')
manifest={'formato':'kusi-sprite/1','imagen':sheet.name,'fotograma':{'ancho':W,'alto':H},'cuadricula':{'columnas':8,'filas':4},'anclaje':{'x':56,'y':117},'escala':1,'velocidadReferencia':260,'animaciones':{}}
for row,d in enumerate(DIRS):
    i=row*8
    manifest['animaciones'][d]={'reposo':{'fotogramas':[i,i+1],'fps':2},'caminar':{'fotogramas':list(range(i+2,i+8)),'fps':10}}
(PUBLIC/'cuy-nino-animado-v1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ART/'cuy-nino-paleta-v1.gpl').write_text('GIMP Palette\nName: Kusi cuy v1\nColumns: 8\n#\n'+'\n'.join(f'{r:3} {g:3} {b:3}  {i+1}' for i,(r,g,b) in enumerate(rgb))+'\n',encoding='utf-8')

def cell(row,col):return im.crop((col*W,row*H,(col+1)*W,(row+1)*H))
def contact(columns,rows,frames,scale=2,labels=None):
    out=Image.new('RGB',(columns*W,rows*(H+14)),'#EEE5D9');draw=ImageDraw.Draw(out)
    for index,f in enumerate(frames):
        x=(index%columns)*W;y=(index//columns)*(H+14)
        if labels:draw.text((x+5,y+1),labels[index],fill='#3D210F')
        out.paste(f,(x,y+14),f)
    return out.resize((out.width*scale,out.height*scale),Image.Resampling.NEAREST)

vistas=contact(4,1,[cell(row,0) for row in range(4)],3,DIRS)
vistas.save(DOC/'cuy-nino-vistas-v1.png')
walk=[];idle=[]
for col in range(2,8):walk.append(contact(2,2,[cell(row,col) for row in range(4)],2,DIRS))
for col in range(2):idle.append(contact(2,2,[cell(row,col) for row in range(4)],2,DIRS))
walk[0].save(DOC/'cuy-nino-caminar-v1.gif',save_all=True,append_images=walk[1:],duration=100,loop=0,disposal=2,optimize=False)
idle[0].save(DOC/'cuy-nino-reposo-v1.gif',save_all=True,append_images=idle[1:],duration=500,loop=0,disposal=2,optimize=False)
contact(6,4,[cell(r,c) for r in range(4) for c in range(2,8)],2,[f'{d} {i+1}' for d in DIRS for i in range(6)]).save(DOC/'cuy-nino-ciclo-v1.png')

reports=[]
def connected_components(frame):
    # Ocho vecinos incluyen los contactos diagonales propios de la cuadrícula.
    opaque={i for i,p in enumerate(frame.get_flattened_data()) if p[3]}
    sizes=[]
    while opaque:
        first=opaque.pop();pending=deque([first]);size=0
        while pending:
            current=pending.popleft();size+=1;x=current%W;y=current//W
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    nx,ny=x+dx,y+dy
                    if 0<=nx<W and 0<=ny<H:
                        neighbour=ny*W+nx
                        if neighbour in opaque:
                            opaque.remove(neighbour);pending.append(neighbour)
        sizes.append(size)
    return sorted(sizes,reverse=True)

for row,d in enumerate(DIRS):
    boxes=[cell(row,c).getbbox() for c in range(8)]
    hashes=[hashlib.sha256(cell(row,c).tobytes()).hexdigest() for c in range(8)]
    components=[connected_components(cell(row,c)) for c in range(8)]
    assert all(len(sizes)==1 for sizes in components), f'{d}: detached pixels or body parts'
    assert len(set(hashes[2:]))==6, f'{d}: repeated walk pose'
    reports.append({'direccion':d,'bounds':boxes,'walk_unique_frames':len(set(hashes[2:])),'connected_component_sizes':components,'hashes':hashes})
report={'source':'Pixelorama MCP authoring/export; no new base generated','pixelorama_frames':32,'editable_layers':7,'frame_size':[W,H],'grid':[8,4],'anchor_pixels':[56,117],'png_mode':Image.open(sheet).mode,'png_color_type':sheet.read_bytes()[25],'visible_rgb_colors':len(set(c[:3] for c in rgba if c[3])),'palette_colors':COLORS,'alpha_values':sorted(set(c[3] for c in rgba)),'lossless_rgba_match':True,'all_frames_single_connected_component':True,'directions':reports,'sha256':hashlib.sha256(sheet.read_bytes()).hexdigest(),'status':'First playable version; new views and motion still require Luis visual review.'}
(DOC/'cuy-nino-verificacion-v1.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
shutil.copy2(LAB/'fixer-report.json',DOC/'cuy-fixer-reproducido-v1.json')
shutil.copy2(LAB/'receta-animacion.execution.json',DOC/'pixelorama-produccion-v1.json')

# Conservar la procedencia histórica y añadir los entregables de esta producción.
art_manifest=PROJECT/'docs/arte/manifest.json'
history=json.loads(art_manifest.read_text(encoding='utf-8'))
history['status']='Referencias conservadas y primera producción del cuy jugador integrada en el prototipo Phaser; nuevas vistas y movimiento pendientes de revisión visual de Luis.'
history['character_role_confirmation']['status']='Identidad de referencia aprobada; primera versión de reposo/caminar integrada el 22 de octubre, pendiente de revisión visual de sus nuevas vistas y movimiento.'
history['production']={
    'version':'cuy-nino-v1','date':'2026-10-22',
    'identity_reference':'referencias/cuy-cartoon-aprobado.png',
    'pixel_source':'referencias/cuy-pixel-native.png',
    'method':'Pixel Art Fixer reproducido sobre la exploración original; limpieza, vistas y fotogramas mediante comandos nativos de Pixelorama MCP. Indexación PNG posterior sin cambios RGBA.',
    'guide':'../PRODUCCION_CUY_NINO.md',
    'editable_project':'../../juego/arte/cuy-nino-animado-v1.pxo',
    'game_manifest':'../../juego/public/dibujos/cuy-nino-animado-v1.json',
    'frames':32,'layers':7,'tags':8,'frame_size':[W,H],'anchor':[56,117],
    'states':{'reposo':{'frames_per_direction':2,'fps':2},'caminar':{'frames_per_direction':6,'fps':10}},
    'directions':DIRS,'game_scale':1,'native_project_mode':'RGBA with restricted working palette',
    'export_png_mode':'indexed P, color type 3, lossless RGBA match',
    'visible_colors':report['visible_rgb_colors'],'working_palette':COLORS,
    'visual_approval':'Reference identity approved; new views and motion await Luis review.',
    'android_status':'Functional Android integration remains pending.'
}
production_files=[
    ART/'cuy-nino-base-limpia-v1.pxo',ART/'cuy-nino-animado-v1.pxo',
    ART/'cuy-nino-animado-v1-export-pixelorama.png',ART/'cuy-nino-paleta-v1.gpl',
    sheet,PUBLIC/'cuy-nino-animado-v1.json',
    DOC/'cuy-nino-base-limpia-v1.png',DOC/'cuy-nino-vistas-v1.png',
    DOC/'cuy-nino-ciclo-v1.png',DOC/'cuy-nino-caminar-v1.gif',DOC/'cuy-nino-reposo-v1.gif',
    DOC/'cuy-nino-verificacion-v1.json',DOC/'cuy-fixer-reproducido-v1.json',
    DOC/'pixelorama-produccion-v1.json',
    *sorted(DOC.glob('cuy-nino-mercado*.png')),
    *sorted((PROJECT/'scripts/arte').glob('*.py')),
]
for path in production_files:
    relative=os.path.relpath(path,art_manifest.parent).replace('\\','/')
    entry={'file':relative,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'production':'cuy-nino-v1'}
    if path.suffix.lower() in ('.png','.gif'):
        with Image.open(path) as asset:
            entry.update(width=asset.width,height=asset.height,mode=asset.mode)
    history['files']=[old for old in history['files'] if old['file']!=relative]+[entry]
art_manifest.write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sheet':str(sheet),'editable':str(ART/'cuy-nino-animado-v1.pxo'),'mode':report['png_mode'],'visible_colors':report['visible_rgb_colors'],'color_type':report['png_color_type'],'lossless':True,'unique_walk_frames':[r['walk_unique_frames'] for r in reports]}))
