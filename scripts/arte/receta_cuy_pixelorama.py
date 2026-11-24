"""Prepare native Pixelorama pixel commands from the conserved cuy reference.

Does not render final PNGs: the MCP recipe draws editable cels in Pixelorama.
Missing views/limb poses are constructed explicitly on separate anatomy layers.
"""
from pathlib import Path
from collections import deque, Counter
import argparse
import json
import math
from PIL import Image

PROJECT = Path(__file__).resolve().parents[2]
OUT = Path('C:/Users/luis/.codex/visualizations/2026/10/22/01a16598-c7d1-7310-8edd-1052663828ab/cuy-production-v1')
PALETTE = {'O':'#3D210F','B':'#A05835','C':'#FBE1C6','R':'#E95343','P':'#F3A27D','W':'#FFF8ED','M':'#6B2627','T':'#D57670'}
RGB = {k:tuple(bytes.fromhex(v[1:])) for k,v in PALETTE.items()}
LAYERS = ['Pata lejana','Brazo lejano','Cuerpo','Cabeza','Panuelo','Brazo cercano','Pata cercana']
W,H = 112,128
DX,DY = -6,16

def read_reference():
    im=Image.open(OUT/'cuy-fixer-native.png').convert('RGB')
    bg=set(); q=deque()
    for x in range(im.width): q.extend([(x,0),(x,im.height-1)])
    for y in range(im.height): q.extend([(0,y),(im.width-1,y)])
    while q:
        p=q.popleft(); x,y=p
        if p in bg or not (0<=x<im.width and 0<=y<im.height): continue
        if min(im.getpixel(p))<=234: continue
        bg.add(p); q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
    pixels={}
    for y in range(im.height):
        for x in range(im.width):
            if (x,y) in bg: continue
            c=im.getpixel((x,y)); key=min(RGB,key=lambda k:sum((a-b)**2 for a,b in zip(c,RGB[k])))
            pixels[x,y]=key
    # Retain the connected character; discard only detached background remnants.
    groups=[]; remaining=set(pixels)
    while remaining:
        start=remaining.pop(); group={start}; q=deque([start])
        while q:
            x,y=q.popleft()
            for a in range(-1,2):
                for b in range(-1,2):
                    p=x+a,y+b
                    if p in remaining: remaining.remove(p);group.add(p);q.append(p)
        groups.append(group)
    keep=max(groups,key=len)
    return {p:c for p,c in pixels.items() if p in keep}

REF=read_reference()

def line(grid,x0,y0,x1,y1,c):
    x0,y0,x1,y1=map(round,(x0,y0,x1,y1)); dx=abs(x1-x0);sx=1 if x0<x1 else -1;dy=-abs(y1-y0);sy=1 if y0<y1 else -1;err=dx+dy
    while True:
        grid[x0,y0]=c
        if x0==x1 and y0==y1:break
        e=2*err
        if e>=dy:err+=dy;x0+=sx
        if e<=dx:err+=dx;y0+=sy

def polygon(g,points,c,outline='O'):
    ymin=math.floor(min(p[1] for p in points)); ymax=math.ceil(max(p[1] for p in points))
    for y in range(ymin,ymax+1):
        hits=[]
        for (x1,y1),(x2,y2) in zip(points,points[1:]+points[:1]):
            if min(y1,y2)<=y+0.5<max(y1,y2):hits.append(x1+(y+0.5-y1)*(x2-x1)/(y2-y1))
        hits.sort()
        for a,b in zip(hits[::2],hits[1::2]):
            for x in range(math.ceil(a),math.floor(b)+1):g[x,y]=c
    if outline:
        for a,b in zip(points,points[1:]+points[:1]):line(g,*a,*b,outline)

def ellipse(g,x0,y0,x1,y1,c,outline='O'):
    cx=(x0+x1)/2;cy=(y0+y1)/2;rx=(x1-x0+1)/2;ry=(y1-y0+1)/2
    pts={(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1}
    for x,y in pts:
        border=any(p not in pts for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
        g[x,y]=outline if outline and border else c

def copy(g,pixels,predicate=lambda x,y,c:True,dx=0,dy=0):
    for (x,y),c in pixels.items():
        if predicate(x,y,c):g[x+dx,y+dy]=c

def hand(g,x,y):
    # One curved palm silhouette, with three short fingertip lobes rather than
    # three closed outlined circles (which read as a rectangular glove).
    polygon(g,[(x-5,y-2),(x-3,y-5),(x+1,y-5),(x+4,y-3),(x+5,y),(x+4,y+3),(x+2,y+5),(x,y+4),(x-2,y+5),(x-4,y+3),(x-5,y)],'B')
    line(g,x-1,y+2,x-1,y+4,'O');line(g,x+2,y+2,x+2,y+4,'O')

def arm(g,shoulder,elbow,wrist):
    sx,sy=shoulder;ex,ey=elbow;wx,wy=wrist
    polygon(g,[(sx-4,sy),(sx+4,sy),(ex+4,ey),(wx+3,wy),(wx-3,wy),(ex-4,ey)],'C')
    hand(g,wx,wy+2)

def crop_foot(left=True):
    return {p:c for p,c in REF.items() if 90<=p[1]<=101 and (29<=p[0]<=56 if left else 71<=p[0]<=93)}

def far_ear(g):
    # Complete closed ear, drawn behind the forehead rather than a clipped bar.
    for p in list(g):
        if p[0]>=66 and p[1]<19:g.pop(p)
    polygon(g,[(66,12),(68,7),(71,4),(75,4),(79,7),(81,11),(80,15),(76,19),(71,18),(68,15)],'C')
    polygon(g,[(69,11),(71,8),(74,7),(77,9),(78,12),(76,16),(73,16),(70,14)],'P',None)

def head_front():
    g={}
    for (x,y),c in REF.items():
        if y>49:continue
        cutoff=34 if y<26 else 37 if y<40 else 39+(y-40)
        if x>=cutoff:g[x,y]=c
    far_ear(g)
    # Reclose the white eye shapes that the generated source left partly open.
    ellipse(g,47,22,59,38,'W');ellipse(g,53,26,59,35,'O',None)
    ellipse(g,69,19,79,32,'W');ellipse(g,74,22,79,30,'O',None)
    line(g,46,19,50,17,'O');line(g,50,17,54,18,'O')
    line(g,68,17,72,16,'O');line(g,72,16,76,18,'O')
    ellipse(g,79,32,83,35,'B',None)
    return g

def head_side(left=False):
    # Build the profile from the accepted head, replacing the two-eye turn with one eye.
    g=head_front()
    for (x,y),c in list(g.items()):
        if 45<=x<=61 and 17<=y<=38 and c in ['W','O']:g[x,y]='B' if x<57 else 'C'
        if 66<=x<=80 and 17<=y<=32 and c in ['W','O']:g[x,y]='C'
    far_ear(g)
    ellipse(g,63,20,74,36,'W');ellipse(g,68,24,73,33,'O',None)
    line(g,63,17,67,15,'O');line(g,67,15,72,17,'O')
    ellipse(g,79,32,83,35,'B',None)
    # Keep both accepted ear constructions complete; the distant ear stays visible
    # from the market's elevated three-quarter view rather than being cut flat.
    if left:
        mirrored={}
        for (x,y),c in g.items():
            # Opposite side has a beige cheek; the head patch does not swap sides.
            if 34<=x<59 and 18<=y<=45 and c=='B':c='C'
            mirrored[120-x,y]=c
        g=mirrored
    return g

def head_back():
    g={}
    ellipse(g,34,11,47,29,'B');ellipse(g,74,10,87,27,'B')
    ellipse(g,38,15,43,24,'P',None);ellipse(g,78,14,82,22,'P',None)
    ellipse(g,37,8,84,51,'C')
    polygon(g,[(71,11),(78,15),(83,27),(81,39),(73,47),(66,45),(67,34),(64,23)],'B',None)
    polygon(g,[(53,11),(51,7),(54,3),(57,6),(61,2),(65,4),(64,9),(68,11)],'C')
    # No eyes, muzzle or front knot on the rear view.
    return g

def torso(g,direction,bob):
    side=direction in ['derecha','izquierda']
    pts=[(48,51),(62,49),(76,53),(82,63),(85,77),(83,86),(78,92),(68,95),(51,95),(40,90),(35,81),(36,71),(40,61)]
    if side:pts=[(round(61+(x-61)*.70),y) for x,y in pts]
    pts=[(x,y+bob) for x,y in pts];polygon(g,pts,'C')
    if direction=='frente':
        copy(g,REF,lambda x,y,c:35<=x<=54 and 63<=y<=87 and c=='B',dy=bob)
    elif direction=='espaldas':
        polygon(g,[(74,59+bob),(81,66+bob),(84,80+bob),(79,88+bob),(73,86+bob),(70,77+bob)],'B',None)
    elif direction=='derecha':
        polygon(g,[(46,62+bob),(52,58+bob),(56,67+bob),(56,82+bob),(51,88+bob),(46,82+bob)],'B',None)
    else:
        polygon(g,[(66,63+bob),(73,68+bob),(77,81+bob),(73,85+bob),(69,80+bob)],'B',None)

def pose(direction,step=None,idle=0):
    layers=[{} for _ in LAYERS]
    bob=(0,1,0,0,1,0)[step] if step is not None else idle
    stride=(12,4,-4,-12,-4,4)[step] if step is not None else 0
    lift_a=4 if step in [4,5] else 0;lift_b=4 if step in [1,2] else 0
    if step is None:lift_a=lift_b=0
    side=direction in ['derecha','izquierda']; facing=-1 if direction=='izquierda' else 1
    # Feet retain the approved toe drawing; their poses change independently.
    for n,left in [(0,True),(6,False)]:
        foot=crop_foot(left); is_a=left
        if side:
            # Both profile feet point into travel. The far foot is smaller and
            # placed slightly deeper into the ground plane, so two paws remain
            # readable in the standing pose and through passing positions.
            foot=crop_foot(False)
            scale=.80 if left else 1
            center=(52 if left else 69) if direction=='derecha' else (70 if left else 53)
            foot={(round(center+facing*(x-82)*scale),round(100+(y-100)*scale)-(2 if left else 0)):c for (x,y),c in foot.items()}
            shift=facing*(stride if is_a else -stride)
            shift_y=-(lift_a if is_a else lift_b)
        else:
            shift=0
            shift_y=-(lift_a if is_a else lift_b)
        if step is not None and (lift_a if is_a else lift_b):
            # Redraw the lifted paw shorter with a tilted toe, rather than only
            # translating the same rigid crop for all six walking drawings.
            cx=(min(x for x,y in foot)+max(x for x,y in foot))/2
            ground=max(y for x,y in foot)
            tilt=(1 if is_a else -1)*facing
            foot={(round(cx+(x-cx)*.94),round(ground+(y-ground)*.78+(x-cx)*.10*tilt)):c for (x,y),c in foot.items()}
        placed={(x+shift,y+shift_y):c for (x,y),c in foot.items()}
        if side:
            ankle=round((min(x for x,y in placed)+max(x for x,y in placed))/2)
            ankle_y=min(y for x,y in placed)+3
            hip=(57 if left else 67) if direction=='derecha' else (65 if left else 55)
            knee=round((hip+ankle)/2)
            knee_y=min(92,ankle_y-2)
            polygon(layers[n],[(hip-3,86+bob),(hip+3,86+bob),(knee+3,knee_y),(ankle+3,ankle_y),(ankle-3,ankle_y),(knee-3,knee_y)],'C')
        copy(layers[n],placed)
    swing=round(stride*.28)
    if side:
        if direction=='derecha':
            arm(layers[1],(58,55+bob),(44-swing,68+bob),(42-swing*2,77+bob))
            arm(layers[5],(65,55+bob),(66+swing,68+bob),(66+swing*2,78+bob))
        else:
            arm(layers[1],(64,55+bob),(78+swing,68+bob),(80+swing*2,77+bob))
            arm(layers[5],(57,55+bob),(56-swing,68+bob),(56-swing*2,78+bob))
    else:
        arm(layers[1],(43,54+bob),(32-swing,67+bob),(30-swing,77+bob))
        arm(layers[5],(79,55+bob),(88+swing,68+bob),(91+swing,77+bob))
    torso(layers[2],direction,bob)
    head=head_front() if direction=='frente' else head_back() if direction=='espaldas' else head_side(direction=='izquierda')
    copy(layers[3],head,dy=bob)
    scarf=layers[4]
    if direction=='frente':
        copy(scarf,REF,lambda x,y,c:46<=y<=64 and 49<=x<=82 and c in ['R','O'],dy=bob)
    elif direction=='espaldas':
        polygon(scarf,[(44,47+bob),(59,51+bob),(78,47+bob),(77,53+bob),(60,57+bob),(45,53+bob)],'R')
    else:
        polygon(scarf,[(48,46+bob),(61,50+bob),(78,47+bob),(74,54+bob),(61,58+bob),(49,53+bob)],'R')
        kx=73 if direction=='derecha' else 49
        ellipse(scarf,kx-3,51+bob,kx+3,57+bob,'R')
        polygon(scarf,[(kx,56+bob),(kx+5*facing,62+bob),(kx+1*facing,65+bob),(kx-2*facing,59+bob)],'R')
    # Same canvas and ground anchor for every cel; no resampling or anti-aliasing.
    return [{(x+DX,y+DY):c for (x,y),c in g.items() if 0<=x+DX<W and 0<=y+DY<H} for g in layers]

def pixels(g):
    out=[]
    for (x,y),c in sorted(g.items(),key=lambda kv:(kv[0][1],kv[0][0])):out.extend([x,y,PALETTE[c]])
    return out

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['base','vistas','animacion'],default='vistas');parser.add_argument('--revision',type=int,default=1);args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    name={'base':'Cuy nino - base limpia v1','vistas':'Cuy nino - vistas v1','animacion':'Cuy nino - reposo y caminar v1'}[args.mode]
    name=name[:-1]+str(args.revision)
    commands=[{'name':'create_canvas','args':{'width':W,'height':H,'name':name}},
              {'name':'create_palette','args':{'name':'Kusi cuy 8 colores v1','width':8,'height':1,'is_global':False,'colors':list(PALETTE.values())}}]
    poses=[]
    if args.mode=='base':poses=[[{(x+DX,y+DY):c for (x,y),c in REF.items() if 0<=x+DX<W and 0<=y+DY<H}]]
    else:
        for direction in ['frente','espaldas','derecha','izquierda']:
            if args.mode=='vistas':poses.append(pose(direction))
            else:
                poses.extend([pose(direction,idle=0),pose(direction,idle=1)])
                poses.extend(pose(direction,step=step) for step in range(6))
    layer_count=len(poses[0])
    for i in range(1,len(poses)):commands.append({'name':'add_frame','args':{'after_frame':i-1}})
    commands.append({'name':'set_layer_name','args':{'index':0,'name':LAYERS[0] if layer_count>1 else 'Base limpia'}})
    for i in range(1,layer_count):commands.append({'name':'add_layer','args':{'name':LAYERS[i]}})
    for frame,components in enumerate(poses):
        for layer,g in enumerate(components):
            if g:commands.append({'name':'draw_pixels','args':{'data':pixels(g),'frame':frame,'layer':layer,'blend':False}})
    if args.mode=='animacion':
        commands.append({'name':'set_fps','args':{'fps':10}})
        for row,direction in enumerate(['frente','espaldas','derecha','izquierda']):
            first=row*8
            for index in [first,first+1]:commands.append({'name':'set_frame_duration','args':{'index':index,'duration':5}})
            commands.append({'name':'add_animation_tag','args':{'name':f'reposo-{direction}','from_frame':first,'to_frame':first+1,'color':'#A05835'}})
            commands.append({'name':'add_animation_tag','args':{'name':f'caminar-{direction}','from_frame':first+2,'to_frame':first+7,'color':'#E95343'}})
    commands.extend([{'name':'switch_cel','args':{'frame':0,'layer':min(3,layer_count-1)}},{'name':'fit_viewport','args':{}}])
    output={'projectName':name,'width':W,'height':H,'frames':len(poses),'layers':layer_count,'palette':PALETTE,'commands':commands}
    path=OUT/f'receta-{args.mode}.json';path.write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
    print(json.dumps({'recipe':str(path),'frames':len(poses),'layers':layer_count,'commands':len(commands)}))

if __name__=='__main__':main()
