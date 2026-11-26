#!/usr/bin/env python3
"""Bake curated Kenney OBJ models into a local Babylon vertex library.
Usage: python3 tools/import-kenney.py /path/to/extracted-packs
Requires Pillow. Source archives are downloaded separately from kenney.nl.
UV palette colours are baked into vertices; no runtime loader/CDN is needed.
"""
import sys,json,hashlib,shutil
from pathlib import Path
from PIL import Image
root=Path(sys.argv[1]); dest=Path(__file__).resolve().parents[1]/'assets/trainer/kenney';dest.mkdir(parents=True,exist_ok=True)
selection={
 'city-kit-commercial':['building-'+x for x in 'abcdefghijklmn']+['detail-parasol-a','detail-parasol-b','detail-awning','detail-awning-wide'],
 'city-kit-suburban':['building-type-'+x for x in 'abcdefghijklmnopqrstu']+['fence','fence-low','planter','tree-small','tree-large','path-stones-long'],
 'car-kit':['ambulance','firetruck','police','truck','truck-flat','van','suv','suv-luxury','sedan','hatchback-sports','taxi','cone'],
 'nature-kit':['tree_oak','tree_oak_dark','tree_detailed','tree_pineTallA','tree_pineTallB','tree_pineRoundA','rock_largeA','rock_largeB','rock_tallA','stone_largeC','plant_bush','plant_bushLarge','grass_large','flower_yellowA','flower_redA','flower_purpleA','log','stump_old']}
models={};sources=[]
for pack,names in selection.items():
 folder=root/pack/'Models/OBJ format';license=root/pack/'License.txt';shutil.copyfile(license,dest/(pack+'-LICENSE.txt'))
 for name in names:
  path=folder/(name+'.obj')
  if not path.exists():raise FileNotFoundError(path)
  materials={};current=None
  for line in path.with_suffix('.mtl').read_text().splitlines():
   p=line.split()
   if not p:continue
   if p[0]=='newmtl':current={};materials[p[1]]=current
   elif p[0]=='Kd':current['color']=list(map(float,p[1:4]))
   elif p[0]=='map_Kd':current['image']=Image.open(folder/' '.join(p[1:])).convert('RGB')
  positions=[];normals=[];uv=[];out={'positions':[],'normals':[],'colors':[],'indices':[]};cache={};material=None
  def vertex(token):
   key=(token,material)
   if key in cache:return cache[key]
   parts=token.split('/');v=positions[int(parts[0])-1];n=normals[int(parts[2])-1] if len(parts)>2 and parts[2] else [0,1,0];m=materials[material];c=m.get('color',[1,1,1])
   if 'image' in m:
    u,t=uv[int(parts[1])-1];im=m['image'];c=[x/255 for x in im.getpixel((min(im.width-1,max(0,int(u*im.width))),min(im.height-1,max(0,int((1-t)*im.height)))))]
   # Keep the Nature Kit shapes with a quieter, central-European foliage palette.
   if pack=='nature-kit' and 'leaf' in material.lower():c=[c[0]*.78,c[1]*.70,c[2]*.43]
   if pack=='nature-kit' and 'bark' in material.lower():c=[c[0]*.55,c[1]*.65,c[2]*.65]
   if pack.startswith('city-kit') and name.startswith('building') and c[1]>c[0]*1.3 and c[1]>c[2]*1.15:
    roof=[(.48,.25,.18),(.29,.36,.36),(.45,.48,.34),(.46,.31,.25)][sum(map(ord,name))%4];c=list(roof)
   i=len(out['positions'])//3;cache[key]=i;out['positions']+= [v[0],v[1],-v[2]];out['normals']+=[n[0],n[1],-n[2]];out['colors']+=c+[1];return i
  for line in path.read_text().splitlines():
   p=line.split()
   if not p:continue
   if p[0]=='v':positions.append(list(map(float,p[1:4])))
   elif p[0]=='vn':normals.append(list(map(float,p[1:4])))
   elif p[0]=='vt':uv.append(list(map(float,p[1:3])))
   elif p[0]=='usemtl':material=p[1]
   elif p[0]=='f':
    face=[vertex(t) for t in p[1:]]
    for j in range(1,len(face)-1):out['indices'] += [face[0],face[j+1],face[j]]
  out['min']=[min(out['positions'][i::3]) for i in range(3)];out['max']=[max(out['positions'][i::3]) for i in range(3)]
  for key in ['positions','normals','colors','min','max']:out[key]=[round(v,6) for v in out[key]]
  models[pack+'/'+name]=out;sources.append({'model':pack+'/'+name,'objSha256':hashlib.sha256(path.read_bytes()).hexdigest()})
# Service paint variants retain the original glazing, tyres and model detailing.
import copy
for source,target,paint in [('truck','thw-truck',[.13,.29,.67]),('van','thw-van',[.13,.29,.67]),('suv','command-suv',[.76,.15,.14])]:
 model=copy.deepcopy(models['car-kit/'+source]);colors=model['colors']
 for i in range(0,len(colors),4):
  r,g,b=colors[i:i+3]
  if g>r*1.3 and g>b*1.15:
   y=model['positions'][i//4*3+1];colors[i:i+3]=[.13,.29,.67] if source=='suv' and y<.52 else paint
 models['car-kit/'+target]=model
blob=json.dumps({'format':1,'models':models},separators=(',',':')).encode();(dest/'models.json').write_bytes(blob)
manifest={'license':'CC0-1.0','author':'Kenney','conversion':'OBJ, Z mirrored for Babylon; palette baked to vertex colours; Nature foliage toned green','packs':[{'id':p,'url':'https://kenney.nl/assets/'+p} for p in selection],'models':sources,'files':[{'path':'assets/trainer/kenney/models.json','sha256':hashlib.sha256(blob).hexdigest()}]}
(dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(len(models),'models;',len(blob),'bytes')
