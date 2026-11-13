# Liquor/provisions store art study

This is a Kowloon-themed invented store, not a reconstruction. Review actual
photographs before choosing materials and placement. Modern merchandise in the
references informs grouping and handling; the assets use invented period labels.

- [Chiu Fat Grocery Store, iDiscover](https://i-discoverasia.com/walks/kowloon-city/locations/chiu-fat-grocery-store/): actual photograph inspected. Teal mechanical scale at the counter; bags on separate cords at unequal heights; crates, cardboard trays and jars at several elevations; shelves group similar bottles but their front edges vary. Local inspection copy: `generated/liquor-props/references/chiu-fat.jpg`. Copyright retained by source; not a production texture.
- [Bo Kee in Champagne Court, Michelin, photograph credited to 陳佳男](https://guide.michelin.com/hk/zh_HK/article/features/story-of-champagne-court): actual photograph inspected. Dense wooden shelves with stacked tins, paper shelf labels, open sacks near floor, round wooden stool and prominent steel-pan counter scale. The dark aisle and mixed package heights break up repeated horizontal rows. Local inspection copy: `generated/liquor-props/references/bo-kee.jpg`. Copyright retained by source; not a production texture.
- [Hong Kong Museum of History grocery exhibit, Mk2010](https://commons.wikimedia.org/wiki/File:Grocery_stores_in_Hong_Kong,_1960s_(HKMH).jpg): contextual source, CC BY-SA 3.0. Museum reconstruction, not an original operating-store photograph; not used as direct geometric evidence.

## Art decisions

Use neutral material color and restrained handling wear. Keep readable shelf
clusters, but vary their setbacks, yaw and missing stock. Avoid random rotations
large enough to make standing goods look unstable. Preserve deliberate stacks.
Use real seam vertices for chip clips, irregular gaps, and short wire connectors
that keep the main cord behind the packet bodies. Keep all packet envelopes
inside their allotted string width. Room furnishings stay inside the shop; a
separate grounded frontage pass handles street displays.

Use Tripo for the scale, crates, cabinet, stool, sacks, garlic and textured
packaging. Reuse the approved pilot jar and snack packet. Lights, ceiling fans,
shelving, room surfaces and attachment cords/clips remain procedural. Price
cards are omitted from this implementation.

The cooler retains the generated outer cabinet, with its fused stock removed;
fitted interior liners, shelves and separately placed bottles/cans complete it.
The basket retains the generated weave, replaces the closing surface with a
recessed interior, and holds eight simple modeled eggs below its rim with a
separate matte material. The failed single-egg generation is not adopted.
A bottle load reuses twelve simplified bottles with hidden bottom faces removed.
The damaged generated crate lattice is rebuilt with straight rails and a fitted
divider grid; its worn red surface maps remain in use. The snack pouch uses a
sealed mesh with the original label baked onto it.
The shared atlas has one tile per source asset, not per instance. The rectangular
counter and regular printed shipping boxes are fitted per axis to retain a 0.9 m working height; other props
retain their source proportions under uniform fitting.

## Packed frontage and shelves

Revisited the original Chiu Fat and Bo Kee images for the street-display pass.
Chiu Fat shows low crates on stools and boxes, stock beneath raised displays,
and a wheeled two-tier cart tight against the counter. Bo Kee shows shelves
packed with runs of touching or nearly touching tins and cartons, boxes occupying
larger shelf spaces, and sacks/stools close to counters. The photos support
layered, closely grouped displays, not isolated props with generous empty gaps.

The four reusable arrangements are invented from those observations: a stool
with a produce tray, a stacked-box stand, a plank supported by two crates with
boxes carrying a second shelf, and a cart holding goods on both levels. Reuse
approved meshes and textures; construct the regular supports locally. Fill
shelves with tight runs and occasional vacancies, higher stacks where supported,
and varied setbacks/yaw. Keep the render-only street displays close to the
storefront while retaining a central entrance and demonstrated standing space.

## Store arrangement families

The photos also inform organization at the fixture scale: Chiu Fat's service
counter and street displays motivate the front-counter family, while Bo Kee's
long side fixtures motivate the side-counter family. A recessed counter with
the cooler near the entrance is a third invented variation. These are themed
arrangements, not reconstructions of either photographed store. Each can switch
sides; shelves, bulk goods, stools and hanging stock move with their arrangement.
Primary fixtures reserve their occupied volumes, including stock above shelves,
and overhead fittings clear the adjacent cabinets.


## Concept target and packaging palette

The next density/color pass used `concepts/packed-store-target.png`: an ImageGen
concept conditioned on the prior front-right showroom and these same original
shop photographs. It calls for closely grouped mixed-size stock, shelf boxes,
fuller multi-row stool displays, neutral cloth, and a green/blue/cream/yellow
packaging palette with red as an accent. Concept provenance retains the exact
prompt and input paths. Production views in `showroom-contact-flat-r03` are the actual
implementation evidence. Their simpler materials and geometry remain visibly
less detailed than the concept; it is an art-direction target, not a claim of
photorealistic reproduction.
