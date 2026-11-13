"""Author simple shop containers with continuous wrap UVs and compact generated label art."""
import colorsys
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path.cwd()
ASSETS = ROOT/'src/dressing/kowloon/shop/assets'
PROJECT = ROOT/'projects/kowloon-liquor-props'
TEXTURES = ROOT/'projects/dressing-demo/textures'
catalog = json.loads((ASSETS/'grocer-props.json').read_text())
appearances = json.loads((ASSETS/'stock-appearances.json').read_text())
atlases = {channel: Image.open(TEXTURES/f'grocer-props{suffix}.png').convert('RGB')
           for channel, suffix in [('color', ''), ('normal', '-normal'), ('properties', '-properties')]}
art = Image.open(PROJECT/'materials/packaging-labels.png').convert('RGB')
labels = [art.crop((i%4*art.width//4, i//4*art.height//2, (i%4+1)*art.width//4, (i//4+1)*art.height//2)) for i in range(8)]
tin_art = Image.open(PROJECT/'materials/clean-stock/tin-label-source.png').convert('RGB')
PALETTE = [(173,42,29), (105,24,43), (156,65,29), (179,104,29),
           (182,153,35), (36,105,62), (37,64,123), (31,111,111)]
PROFILES = {
    'food-tin': (12, [(0,.5), (1,.5)]),
    'seasoning-jar': (8, [(0,.49), (.72,.5), (.78,.43), (.80,.5), (1,.5)]),
    'drink-bottle': (8, [(0,.5), (.58,.5), (.64,.45), (.71,.23), (.76,.17), (.95,.17), (1,.21)]),
    'bottle-load': (8, [(0,.5), (.60,.5), (.73,.18), (.95,.17), (1,.21)]),
}
SIZES = {'food-tin': [.075633,.07539,.115], 'seasoning-jar': [.14,.139378,.15346],
         'drink-bottle': [.07,.068556,.268747]}


def unit(vector):
    """Normalize a source-space direction for smooth circumferential shading."""
    length = math.hypot(*vector)
    return [value/length for value in vector]


def container(name, size):
    """Build a closed profile with one rear body seam and separate planar cap islands."""
    sides, profile = PROFILES[name]
    width, depth, height = size
    faces = []
    def point(index, ring):
        angle = -math.pi + index*math.tau/sides
        z, radius = profile[ring]
        return [width*radius*math.sin(angle), -depth*radius*math.cos(angle), height*z]
    for ring in range(len(profile)-1):
        z0,r0 = profile[ring]
        z1,r1 = profile[ring+1]
        for index in range(sides):
            corners = []
            for side, row in [(index,ring), (index+1,ring), (index+1,ring+1), (index,ring+1)]:
                angle = -math.pi + side*math.tau/sides
                slope = (r1-r0)/(z1-z0)
                if name=='drink-bottle' and ring<len(profile)-2:
                    # Blend the curved shoulder into the vertical body and neck, retaining a hard cap lip.
                    slope = 0
                    if row in (2,3):
                        before,after = profile[row-1],profile[row+1]
                        slope = (after[1]-before[1])/(after[0]-before[0])
                normal = unit([math.sin(angle)/width, -math.cos(angle)/depth, -slope/height])
                corners.append([*point(side,row), *normal, .02+.96*side/sides, .30+.68*profile[row][0]])
            faces.extend([[corners[0][:],corners[1][:],corners[2][:]], [corners[0][:],corners[2][:],corners[3][:]]])
    for ring, center, sign in [(0,.75,-1), (len(profile)-1,.25,1)]:
        corners = []
        for index in range(sides):
            angle = -math.pi+index*math.tau/sides
            corners.append([*point(index,ring),0,0,sign,center+.11*math.sin(angle),.15-.11*math.cos(angle)])
        for index in range(1,sides-1):
            order = [0,index,index+1] if sign==1 else [0,index+1,index]
            faces.append([corners[i][:] for i in order])
    return {'size':size, 'faces':faces}


def colored_ink(image, color, red_only=False):
    """Recolor printed ink while preserving pale paper and, for the tin, its vegetable illustration."""
    image = image.resize((256,128) if red_only else (128,128),Image.Resampling.LANCZOS)
    output = []
    for r,g,b in image.getdata():
        _,s,v = colorsys.rgb_to_hsv(r/255,g/255,b/255)
        selected = r > g*1.35 and r > b*1.35 if red_only else s>.22 and min(r,g,b)<180
        if selected:
            factor = .65+.5*v
            output.append(tuple(min(255,round(c*factor)) for c in color))
        else:
            output.append((r,g,b))
    result = Image.new('RGB',image.size)
    result.putdata(output)
    return result


def material_maps(name, variant):
    """Create a 256px albedo and matching material channels for the authored UV layout."""
    rng = random.Random(410)
    color = PALETTE[variant]
    base = (86,47,22) if name=='seasoning-jar' else (65,33,15)
    image = Image.new('RGB',(256,256))
    image.putdata([tuple(max(0,min(255,c+rng.randint(-3,3))) for c in base) for _ in range(256*256)])
    normal = Image.new('RGB',(256,256),(128,128,255))
    properties = Image.new('RGB',(256,256),(255,100,0))
    draw, props = ImageDraw.Draw(image), ImageDraw.Draw(properties)
    if name=='food-tin':
        image.paste(colored_ink(tin_art,color,True).resize((246,174),Image.Resampling.LANCZOS),(5,5))
        props.rectangle((5,5,250,179),fill=(255,210,0))
    else:
        design = [7,5,3,2,6,0,1,4][variant] if name=='seasoning-jar' else [5,2,0,1,7,3,4,6][variant]
        label = colored_ink(labels[design],color).resize((120,120),Image.Resampling.LANCZOS)
        label_draw = ImageDraw.Draw(label)
        label_draw.rectangle((0,0,119,8),fill=color)
        label_draw.rectangle((0,111,119,119),fill=color)
        label_draw.rectangle((0,0,119,119),outline=color,width=3)
        z0,z1 = (.12,.66) if name=='seasoning-jar' else (.16,.56)
        top,bottom = round((1-(.30+.68*z1))*256),round((1-(.30+.68*z0))*256)
        image.paste(label.resize((120,bottom-top),Image.Resampling.LANCZOS),(68,top))
        props.rectangle((68,top,187,bottom-1),fill=(255,210,0))
        cap_start = .80 if name=='seasoning-jar' else .95
        cap_bottom = round((1-(.30+.68*cap_start))*256)
        draw.rectangle((5,5,250,cap_bottom),fill=color)
        props.rectangle((5,5,250,cap_bottom),fill=(255,150,180))
    for cx in [64,192]:
        cy,radius = round(.85*256),round(.11*256)
        if cx==192 and name!='food-tin':
            draw.ellipse((cx-radius-2,cy-radius-2,cx+radius+2,cy+radius+2),fill=base)
            props.ellipse((cx-radius-2,cy-radius-2,cx+radius+2,cy+radius+2),fill=(255,100,0))
            continue
        metal = color if name=='seasoning-jar' and cx==64 else (135,128,106)
        draw.ellipse((cx-radius-2,cy-radius-2,cx+radius+2,cy+radius+2),fill=metal)
        props.ellipse((cx-radius-2,cy-radius-2,cx+radius+2,cy+radius+2),fill=(255,165,210))
        for inset in [2,5,11]:
            shade = tuple(max(0,c-18+inset) for c in metal)
            draw.ellipse((cx-radius+inset,cy-radius+inset,cx+radius-inset,cy+radius-inset),outline=shade,width=1)
    return {'color':image,'normal':normal,'properties':properties}


def paste(rect, maps):
    """Pack congruent PBR channels into an existing content rectangle with replicated gutters."""
    u0,v0,u1,v1 = rect
    x,y = round(u0*2560),round((1-v1)*2048)
    width,height = round((u1-u0)*2560),round((v1-v0)*2048)
    for channel, source in maps.items():
        image = source.resize((width,height),Image.Resampling.LANCZOS)
        padded = Image.new('RGB',(width+8,height+8))
        padded.paste(image,(4,4))
        for edge in range(4):
            padded.paste(image.crop((0,0,width,1)),(4,edge))
            padded.paste(image.crop((0,height-1,width,height)),(4,height+4+edge))
        for edge in range(4):
            padded.paste(padded.crop((4,0,5,height+8)),(edge,0))
            padded.paste(padded.crop((width+3,0,width+4,height+8)),(width+4+edge,0))
        atlases[channel].paste(padded,(x-4,y-4))


def linear(value):
    """Decode sampled sRGB to linear renderer vertex colors."""
    value /= 255
    return value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4


def fallback(asset, source, rect):
    """Sample the final packed color tile at each unchanged authored UV corner."""
    u0,v0,u1,v1 = rect
    tile = atlases['color'].crop((round(u0*2560),round((1-v1)*2048),round(u1*2560),round((1-v0)*2048)))
    result = []
    for face in asset['faces']:
        colors = []
        for vertex in face:
            u,v = [(vertex[6+a]-source[a])/(source[a+2]-source[a]) for a in range(2)]
            x = min(tile.width-1,max(0,round(u*(tile.width-1))))
            y = min(tile.height-1,max(0,round((1-v)*(tile.height-1))))
            colors.append([round(linear(c),6) for c in tile.getpixel((x,y))])
        result.append(colors)
    return result


for name,size in SIZES.items():
    source = appearances[name]['source']
    asset = container(name,size)
    for face in asset['faces']:
        for vertex in face:
            vertex[6:8] = [source[a]+vertex[6+a]*(source[a+2]-source[a]) for a in range(2)]
            vertex[:] = [round(value,8) for value in vertex]
    catalog[name] = asset
    maps = material_maps(name,0)
    paste(source,maps)
    for channel,image in maps.items():
        image.save(PROJECT/f'materials/clean-stock/{name}-{channel}-256.png')
    for index,variant in enumerate(appearances[name]['variants']):
        palette = [0,4,5,6][index] if name=='food-tin' else index
        paste(variant['uv'],material_maps(name,palette))

# Keep the existing load envelope, bottle pitch and supporting elevation.
load_size = [.291842,.216794,.27]
# Crate walls hide most of these bodies; retain the compact straight-shoulder load LOD.
body = container('bottle-load',[load_size[0]-.222,load_size[1]-.148,.27])
source = appearances['drink-bottle']['source']
load_faces = []
for row in range(3):
    for column in range(4):
        for face in body['faces']:
            if all(vertex[2]==0 for vertex in face):
                continue
            result = []
            for vertex in face:
                u,v = vertex[6:8]
                result.append([vertex[0]+(column-1.5)*.074,vertex[1]+(row-1)*.074,vertex[2],*vertex[3:6],
                               source[0]+u*(source[2]-source[0]),source[1]+v*(source[3]-source[1])])
            load_faces.append([[round(value,8) for value in vertex] for vertex in result])
catalog['bottle-load'] = {'size':load_size,'faces':load_faces}
for name in [*SIZES,'bottle-load']:
    appearance = appearances[name]
    colors = fallback(catalog[name],appearance['source'],appearance['source'])
    for face,values in zip(catalog[name]['faces'],colors):
        for vertex,color in zip(face,values):
            vertex[8:] = color
    for variant in appearance['variants']:
        variant['colors'] = fallback(catalog[name],appearance['source'],variant['uv'])
for channel,atlas in atlases.items():
    suffix = '' if channel=='color' else '-'+channel
    atlas.save(TEXTURES/f'grocer-props{suffix}.png')
for filename,data in [('grocer-props.json',catalog),('stock-appearances.json',appearances)]:
    target = ASSETS/filename
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,separators=(',',':'))+'\n')
    temporary.replace(target)
print({name:len(catalog[name]['faces']) for name in [*SIZES,'bottle-load']})
