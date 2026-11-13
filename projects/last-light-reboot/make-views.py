"""Revision-matched supported eye studies; camera positions are admitted separately."""
import json,math
from pathlib import Path
R=Path(__file__).parent
j=json.loads((R/'planning/developed-l02.json').read_text());p=j['positions'];views=[]
def overview(id,position,target,height,roofs=True,cut=1,appearance='materials'):
 views.append(dict(id=id,position=position,target=target,projection='orthographic',height=height,roofs=roofs,cut=cut,appearance=appearance))
def eye(feet,stance='standing'):return feet[:2]+[feet[2]+(1.0695 if stance=='crouching' else 1.86)]
def view(id,feet,target,stance='standing',targetstance='standing',note=''):
 if isinstance(feet,str):feet=p[feet]
 if isinstance(target,str):target=p[target]
 views.append(dict(id=id,feet=feet,stance=stance,position=eye(feet,stance),target=eye(target,targetstance),targetFeet=target,projection='perspective',roofs=True,appearance='materials',fov=75,height=35,note=note))
overview('roof-on',[155,-95,120],[60,51,3],127)
overview('global-roof-off',[155,-95,120],[60,51,3],127,False)
overview('cutaway',[155,-95,120],[60,51,3],127,False,.48)
overview('top',[60,51.01,180],[60,51,0],100,False,.48)
overview('roof-step-west',[18,2,23],[38,30,7],37)
overview('roof-step-east',[123,103,28],[97,75,8],40)
view('west-atrium-across',[31,40,0],[48,53,2.2],note='Ground eye across grand stair, upper staging and lower-transfer mouth; roofs present.')
view('west-over-under',[40.7,43,0],[45,49,2.2])
view('east-over-under',[83.3,59,0],[78,50,2.2])
view('west-atrium-mouth','W-LOOK',[42,52,1.2])
view('east-atrium-across',[91,66,0],[76,49,2.2])
view('food-court-south','POINT-S','POINT-N')
view('food-court-north','POINT-N','POINT-S')
view('north-gallery','N-STAGE','N-ENTRY')
view('south-gallery','S-STAGE','S-ENTRY')
for side,stair,target,top,support in [('west',j['stairs'][0],'W-ENEMY','W-TOP','W-SUPPORT'),('east',j['stairs'][2],'E-ENEMY','E-TOP','E-SUPPORT')]:
 sign=math.copysign(1,stair['end'][1]-stair['start'][1]);x=stair['start'][0];y=stair['start'][1]
 def feet(distance):return [x,y+sign*distance,min(24,math.floor(distance/.75)+1)*.15]
 for phase,distance in [('early',1.875),('mid',9.375),('late',17.625)]:
  view(f'{side}-public-{phase}-side',feet(distance),target)
  view(f'{side}-public-{phase}-crest',feet(distance),top)
 view(f'{side}-public-follower-side',feet(14.625),target,note='Follower exactly 3 m behind late leader along stair axis.')
 view(f'{side}-public-follower-crest',feet(14.625),top)
 view(f'{side}-public-follower-crouch',feet(14.625),target,'crouching')
 view(f'{side}-public-opponent',target,feet(17.625))
 view(f'{side}-public-support',support,target)
for prefix,low,mid,top,stage in [('north','N-LOW','N-MID','N-TOP','N-STAGE'),('south','S-LOW','S-MID','S-TOP','S-STAGE')]:
 view(prefix+'-service-low',low,top)
 view(prefix+'-service-mid',mid,stage)
 view(prefix+'-service-top',top,stage)
 view(prefix+'-service-opponent',stage,top)
for side,lower,upper in [('west','W-LOOK','W-STAGE'),('east','E-LOOK','E-STAGE')]:
 for stance in ['standing','crouching']:
  view(f'{side}-aperture-{stance}',lower,upper,stance,stance)
 view(f'{side}-aperture-opponent',upper,lower)
for stance in ['standing','crouching']:
 view('underpass-west-'+stance,'G-W','G-E',stance,stance)
 view('underpass-east-'+stance,'G-E','G-W',stance,stance)
view('underpass-west-offset',[42,51.2,0],'G-E')
view('underpass-east-offset',[80,46.8,0],'G-W')
view('underpass-mid','G-MID','G-W')
for side,observer,public,service,deep in [('west','W-REG',[24,16,0],[12,28,0],[26,16,0]),('east','E-REG',[98,88,0],[108,76,0],[108,74,0])]:
 for stance in ['standing','crouching']:
  view(side+'-frontier-public-'+stance,observer,public,stance,stance)
  view(side+'-frontier-service-'+stance,observer,service,stance,stance)
 view(side+'-deep-to-public',deep,public)
 view(side+'-deep-to-service',deep,service)
 view(side+'-frontier-offset',[p[observer][0]+.8,p[observer][1],0],service)
for id,feet,target in [('west-counter-public',[21,16,0],[26,16,0]),('west-counter-service',[15,27,0],[26,16,0]),('east-counter-public',[101,80,0],[108,74,0]),('east-counter-service',[108,78,0],[108,74,0]),('west-return-follower',[36,18,0],[26,30,0]),('east-return-follower',[94,64,0],[108,74,0]),('east-return-corner',[108,64,0],[108,74,0])]:view(id,feet,target)
(R/'views-c01.json').write_text(json.dumps(views,indent=2)+'\n');print(len(views),'views')
