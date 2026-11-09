import {parseAml} from 'levelspec';
/** An 8×6m native deck with a 0.30m wall and independently dimensioned clear opening. */
export function navigationDoorway(clearWidth=.7,lowHeadroom=false){
  const jamb=(6-clearWidth)/2;
  return parseAml(`<architecture version="1" id="navigation-doorway" validation="premap"><player radius="0.25" height="1.8"/><profile id="plan" points="0 0;8 0;8 6;0 6"/><slab id="deck" profile="plan"/><box id="south-jamb" width="0.3" depth="${jamb}" height="3" position="3.85 0 0"/><box id="north-jamb" width="0.3" depth="${jamb}" height="3" position="3.85 ${6-jamb} 0"/>${lowHeadroom?`<box id="low-lintel" width="0.3" depth="${clearWidth}" height="0.3" position="3.85 ${jamb} 1.2"/>`:''}</architecture>`);
}
