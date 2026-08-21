/**
 * The places, written down.
 *
 * Each of these is a paragraph a person could say out loud — what the building
 * was for, what has happened to it, what you do in it, and what two unlike
 * things it physically contains — followed by the section that makes those
 * true. Nothing here is a floorplan. The slicer decides where every wall goes,
 * twenty times per concept, and the scorer picks which of the twenty kept the
 * properties the paragraph claimed.
 *
 * They are chosen to fill holes in the library rather than to be good ideas in
 * isolation. A hundred and seven maps and not one of them is a station, a
 * production line, or anything you descend into: the traced ones are all
 * competitive layouts, which means they are all one storey of open ground with
 * buildings round it, and the two hand-drawn originals are one flood works and
 * one tower. Every concept below is a *kind of place* the library does not
 * have.
 */

import type { SpatialConcept } from './concept.ts';

/**
 * A freight terminus: platforms either side of a track trench, an overhead
 * concourse, and a maintenance level under the tracks.
 *
 * The section is the whole idea. The concourse is the legible route and it can
 * see everything; the platforms are the fight; and the undertrack run is the
 * way across that nothing on the concourse can watch.
 */
const TERMINUS: SpatialConcept = {
  id: 'terminus',
  name: 'Terminus',
  thesis: 'A freight terminus whose overhead concourse watches the platforms it cannot reach, while the way across nobody can see runs under the tracks.',
  built: 'a rail freight interchange',
  incident: 'the yard has been shut down mid-shift and the signals are dark',
  verb: 'cross',
  contrast: ['public concourse', 'undertrack service'],
  grid: 1.7,
  size: [44, 30],
  wall: 0.3,
  bands: [
    {
      id: 'under', z: -4.4, height: 3.6,
      purpose: 'the service level under the tracks: low, protected, and blind',
      extent: [5, 4, 34, 22],
      zones: [
        { id: 'undertrack', label: 'Undertrack', role: 'corridor', weight: 3, height: 2.8,
          cover: { label: 'Cable Drums', height: 1.1, as: 'barrel', count: 4 } },
        { id: 'pit', label: 'Inspection Pit', role: 'room', weight: 2, height: 3.4,
          seal: { undertrack: 'door' } },
        { id: 'plantroom', label: 'Plant Room', role: 'room', weight: 2, height: 3.4,
          cover: { label: 'Compressors', height: 1.6, as: 'barrel', count: 3 } },
      ],
    },
    {
      id: 'platforms', z: 0, height: 5.2,
      purpose: 'the trench and the two platforms flanking it',
      extent: [4, 3, 36, 24],
      zones: [
        { id: 'north_platform', label: 'North Platform', role: 'lane', weight: 3, height: 7.6,
          cover: { label: 'Barrows', height: 1.0, as: 'crate', count: 4 } },
        { id: 'trench', label: 'Track Trench', role: 'site', weight: 4, height: 8.4,
          cover: { label: 'Sleepers', height: 0.9, as: 'crate', count: 5 } },
        { id: 'south_platform', label: 'South Platform', role: 'lane', weight: 3, height: 7.6,
          cover: { label: 'Pallets', height: 1.2, as: 'crate', count: 4 } },
        { id: 'ticket_hall', label: 'Ticket Hall', role: 'spawn', weight: 3, height: 7.0,
          seal: { north_platform: 'arch' } },
        { id: 'signal_box', label: 'Signal Box', role: 'room', weight: 1, height: 4.4,
          seal: { south_platform: 'door' } },
      ],
    },
    {
      id: 'concourse', z: 5.6, height: 3.2,
      purpose: 'the bridge over everything, fast and completely exposed',
      extent: [9, 8, 26, 14],
      zones: [
        { id: 'span', label: 'Concourse', role: 'balcony', weight: 4, height: 3.2 },
        { id: 'gantry_office', label: 'Control', role: 'room', weight: 1, height: 3.2,
          seal: { span: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'under', to: 'platforms', fromZone: 'undertrack', toZone: 'trench', width: 3.0 },
    { from: 'under', to: 'platforms', fromZone: 'plantroom', toZone: 'south_platform', width: 2.6, optional: true },
    { from: 'platforms', to: 'concourse', fromZone: 'north_platform', toZone: 'span', width: 2.6 },
    { from: 'platforms', to: 'concourse', fromZone: 'south_platform', toZone: 'span', width: 2.6, optional: true },
  ],
  spawn: 'ticket_hall',
  objective: 'trench',
};

/**
 * A production line, in the order the work went through it.
 *
 * The route *is* the process: receiving, storage, the assembly floor, quality,
 * shipping. Which means the map's shape is an argument about what the building
 * did rather than about where cover should go, and the overhead maintenance
 * route exists because a factory has one.
 */
const FOUNDRY: SpatialConcept = {
  id: 'foundry',
  name: 'Foundry',
  thesis: 'A production line you fight along in the order the work went through it, from the receiving yard to the shipping dock, with the maintenance route running above all of it.',
  built: 'a heavy castings works',
  incident: 'the line stopped in the middle of a pour and nobody came back for it',
  verb: 'thread',
  contrast: ['open production floor', 'overhead maintenance run'],
  grid: 1.7,
  size: [46, 28],
  wall: 0.32,
  bands: [
    {
      id: 'works', z: 0, height: 5.0,
      purpose: 'the line itself, in order',
      extent: [4, 3, 38, 22],
      zones: [
        { id: 'receiving', label: 'Receiving', role: 'spawn', weight: 2, height: 6.4,
          cover: { label: 'Crates', height: 1.3, as: 'crate', count: 4 } },
        { id: 'racking', label: 'Racking', role: 'room', weight: 2, height: 6.0,
          seal: { receiving: 'arch' },
          cover: { label: 'Stock', height: 1.6, as: 'crate', count: 6 } },
        { id: 'pour_floor', label: 'Pour Floor', role: 'site', weight: 5, height: 9.6,
          cover: { label: 'Ladles', height: 1.8, as: 'barrel', count: 5 } },
        { id: 'quality', label: 'Quality', role: 'room', weight: 1, height: 4.2,
          seal: { pour_floor: 'door' } },
        { id: 'shipping', label: 'Shipping', role: 'lane', weight: 3, height: 7.0,
          cover: { label: 'Pallets', height: 1.2, as: 'crate', count: 4 } },
      ],
    },
    {
      id: 'catwalk', z: 5.4, height: 3.0,
      purpose: 'the maintenance run over the line',
      extent: [8, 7, 30, 14],
      zones: [
        { id: 'crane_way', label: 'Crane Way', role: 'balcony', weight: 5, height: 2.8 },
        { id: 'motor_room', label: 'Motor Room', role: 'room', weight: 2, height: 2.8,
          seal: { crane_way: 'door' },
          cover: { label: 'Gearboxes', height: 1.4, as: 'barrel', count: 3 } },
      ],
    },
  ],
  links: [
    { from: 'works', to: 'catwalk', fromZone: 'racking', toZone: 'crane_way', width: 2.6, optional: true },
    { from: 'works', to: 'catwalk', fromZone: 'shipping', toZone: 'motor_room', width: 2.6, optional: true },
    { from: 'works', to: 'catwalk', fromZone: 'pour_floor', toZone: 'crane_way', width: 3.0 },
  ],
  spawn: 'receiving',
  objective: 'pour_floor',
};

/**
 * Something enormous and buried, entered from a small door at the top.
 *
 * The one verb the library has nothing for. The whole map is the drop: a
 * checkpoint you would not look at twice, a stair, and then a covered
 * reservoir four storeys down that is bigger than everything above it put
 * together.
 */
const CISTERN: SpatialConcept = {
  id: 'cistern',
  name: 'Cistern',
  thesis: 'A covered reservoir four storeys under an unremarkable pumping station, and the only way in is a door at the top of it.',
  built: 'a municipal water store',
  incident: 'the level has been drawn down for maintenance and the lights on the west side never came back on',
  verb: 'descend',
  contrast: ['small surface checkpoint', 'enormous buried hall'],
  // One way in. That is the concept, not a failure to provide a second.
  routes: 1,
  grid: 1.8,
  size: [40, 30],
  wall: 0.34,
  bands: [
    {
      id: 'deep', z: -8.2, height: 4.0,
      purpose: 'the reservoir: the entire point of the map, and all of it below',
      extent: [4, 3, 32, 24],
      zones: [
        { id: 'reservoir', label: 'Reservoir', role: 'site', weight: 6, height: 7.4,
          cover: { label: 'Piers', height: 2.0, as: 'barrel', count: 6 } },
        { id: 'draw_off', label: 'Draw-off', role: 'room', weight: 2, height: 5.0,
          seal: { reservoir: 'arch' },
          cover: { label: 'Valves', height: 1.3, as: 'barrel', count: 4 } },
        { id: 'weir_walk', label: 'Weir Walk', role: 'corridor', weight: 2, height: 3.4,
          seal: { reservoir: 'door' } },
      ],
    },
    {
      id: 'mezz', z: -3.8, height: 3.4,
      purpose: 'a half-landing you cross on the way down, overlooking the hall',
      extent: [9, 8, 22, 14],
      zones: [
        { id: 'gallery', label: 'Gallery', role: 'balcony', weight: 4, height: 3.4 },
        { id: 'switchgear', label: 'Switchgear', role: 'room', weight: 2, height: 3.4,
          seal: { gallery: 'door' },
          cover: { label: 'Cabinets', height: 1.7, as: 'crate', count: 3 } },
      ],
    },
    {
      id: 'surface', z: 0.6, height: 4.6,
      purpose: 'the part of the map anybody would photograph, and the smallest',
      extent: [11, 10, 17, 10],
      zones: [
        { id: 'gatehouse', label: 'Gatehouse', role: 'spawn', weight: 3, height: 4.4,
          cover: { label: 'Barriers', height: 1.0, as: 'crate', count: 3 } },
        { id: 'meter_room', label: 'Meter Room', role: 'room', weight: 2, height: 4.4,
          seal: { gatehouse: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'mezz', to: 'surface', fromZone: 'gallery', toZone: 'gatehouse', width: 2.6 },
    { from: 'deep', to: 'mezz', fromZone: 'reservoir', toZone: 'gallery', width: 3.0 },
    { from: 'deep', to: 'mezz', fromZone: 'draw_off', toZone: 'switchgear', width: 2.6, optional: true },
  ],
  spawn: 'gatehouse',
  objective: 'reservoir',
};

/**
 * Housing stacked round a void, with a service alley under the whole thing.
 *
 * The dense commercial idea the library is missing, done vertically: the deck
 * is the public street, the terrace above it looks down on the deck, and the
 * undercroft is the back of the shops. Everything can see something it cannot
 * reach.
 */
const ARCOLOGY: SpatialConcept = {
  id: 'arcology',
  name: 'Arcology',
  thesis: 'A residential block whose shopping deck, terrace and service undercroft are stacked in twelve metres, and every one of them overlooks a level it cannot reach.',
  built: 'a mixed-use housing block',
  incident: 'the block was evacuated floor by floor and the lifts were locked out behind them',
  verb: 'climb',
  contrast: ['lit shopping deck', 'service undercroft'],
  grid: 1.6,
  size: [42, 28],
  wall: 0.26,
  bands: [
    {
      id: 'undercroft', z: -3.8, height: 3.2,
      purpose: 'the back of everything: deliveries, bins, and nowhere to stand',
      extent: [5, 4, 32, 20],
      zones: [
        { id: 'service_alley', label: 'Service Alley', role: 'corridor', weight: 3, height: 2.9,
          cover: { label: 'Bins', height: 1.1, as: 'crate', count: 5 } },
        { id: 'loading', label: 'Loading', role: 'room', weight: 3, height: 3.1,
          seal: { service_alley: 'arch' },
          cover: { label: 'Cages', height: 1.4, as: 'crate', count: 4 } },
        { id: 'substation', label: 'Substation', role: 'room', weight: 1, height: 3.1,
          seal: { service_alley: 'door' } },
      ],
    },
    {
      id: 'deck', z: 0, height: 4.4,
      purpose: 'the public street, and where you arrive',
      extent: [4, 3, 34, 22],
      zones: [
        { id: 'concourse', label: 'Deck', role: 'spawn', weight: 4, height: 4.8,
          cover: { label: 'Planters', height: 1.0, as: 'crate', count: 5 } },
        { id: 'arcade', label: 'Arcade', role: 'lane', weight: 3, height: 4.8,
          cover: { label: 'Stalls', height: 1.3, as: 'crate', count: 5 } },
        { id: 'lightwell', label: 'Lightwell', role: 'site', weight: 2, height: 4.8 },
        { id: 'plantdeck', label: 'Plant', role: 'room', weight: 1, height: 4.6,
          seal: { arcade: 'door' } },
      ],
    },
    {
      id: 'terrace', z: 4.8, height: 3.4,
      purpose: 'the walkway above the deck, looking down on it',
      extent: [8, 7, 26, 14],
      zones: [
        { id: 'walkway', label: 'Walkway', role: 'balcony', weight: 4, height: 3.4 },
        { id: 'maisonette', label: 'Maisonette', role: 'room', weight: 2, height: 3.4,
          seal: { walkway: 'door' },
          cover: { label: 'Furniture', height: 1.1, as: 'crate', count: 3 } },
      ],
    },
  ],
  links: [
    { from: 'undercroft', to: 'deck', fromZone: 'loading', toZone: 'arcade', width: 2.6 },
    { from: 'undercroft', to: 'deck', fromZone: 'service_alley', toZone: 'concourse', width: 2.6, optional: true },
    { from: 'deck', to: 'terrace', fromZone: 'concourse', toZone: 'walkway', width: 2.6 },
    { from: 'deck', to: 'terrace', fromZone: 'arcade', toZone: 'maisonette', width: 2.6, optional: true },
  ],
  spawn: 'concourse',
  objective: 'lightwell',
};


/**
 * A sorting hall: one enormous volume with a mezzanine ring round the inside.
 *
 * Terraced rather than stacked. The upper band does not cover the lower one —
 * it runs round its edge — so the middle of the hall is open to its full
 * height and everything on the ring can see everything on the floor. The whole
 * fight is about whether you are on the inside of the ring or under it.
 */
const SORTING: SpatialConcept = {
  id: 'sorting',
  name: 'Sorting Hall',
  thesis: 'One enormous sorting floor with a mezzanine running right round the inside of it, so everything above can see everything below and neither can reach the other quickly.',
  built: 'a parcel sorting hall',
  incident: 'the belts stopped with the night shift still loaded and nobody cleared them',
  verb: 'orbit',
  contrast: ['open sorting floor', 'the ring above it'],
  grid: 1.7,
  size: [46, 32],
  wall: 0.3,
  bands: [
    {
      id: 'floor', z: 0, height: 5.0,
      purpose: 'the hall itself, and all of it one room',
      extent: [4, 3, 38, 26],
      zones: [
        { id: 'inbound', label: 'Inbound', role: 'spawn', weight: 2, height: 5.0,
          cover: { label: 'Cages', height: 1.4, as: 'crate', count: 4 } },
        { id: 'belt_floor', label: 'Belt Floor', role: 'site', weight: 5, height: 5.0,
          cover: { label: 'Chutes', height: 1.6, as: 'barrel', count: 6 } },
        { id: 'outbound', label: 'Outbound', role: 'lane', weight: 3, height: 5.0,
          cover: { label: 'Pallets', height: 1.2, as: 'crate', count: 4 } },
      ],
    },
    {
      id: 'ring', z: 5.4, height: 3.2,
      purpose: 'the walkway round the inside, looking down on all of it',
      extent: [7, 6, 32, 20],
      zones: [
        { id: 'walk_ring', label: 'Ring', role: 'balcony', weight: 5, height: 3.0 },
        { id: 'sort_office', label: 'Sort Office', role: 'room', weight: 2, height: 3.0,
          seal: { walk_ring: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'floor', to: 'ring', fromZone: 'belt_floor', toZone: 'walk_ring', width: 2.6 },
    { from: 'floor', to: 'ring', fromZone: 'outbound', toZone: 'sort_office', width: 2.6, optional: true },
    { from: 'floor', to: 'ring', fromZone: 'inbound', toZone: 'walk_ring', width: 2.6, optional: true },
  ],
  spawn: 'inbound',
  objective: 'belt_floor',
};

/**
 * A hangar: one volume big enough to lose an argument in, and a crew wing.
 *
 * The contrast is scale rather than function. Everything about the hangar is
 * enormous and everything the people who worked there used is not, and the
 * fight moves between the two constantly.
 */
const HANGAR: SpatialConcept = {
  id: 'hangar',
  name: 'Hangar',
  thesis: 'A maintenance hangar big enough to lose an argument in, wrapped along one side by crew rooms nobody could stand up straight in.',
  built: 'an aircraft maintenance shed',
  incident: 'the doors were left half open and the apron lights have been on for a week',
  verb: 'infiltrate',
  contrast: ['monumental hangar', 'cramped crew wing'],
  grid: 1.8,
  size: [46, 30],
  wall: 0.34,
  bands: [
    {
      id: 'apron', z: 0, height: 8.4,
      purpose: 'the shed and the apron in front of it',
      extent: [4, 3, 38, 24],
      zones: [
        { id: 'apron_yard', label: 'Apron', role: 'spawn', weight: 3, height: 8.4,
          cover: { label: 'Tugs', height: 1.7, as: 'vehicle', count: 3 } },
        { id: 'bay', label: 'Maintenance Bay', role: 'site', weight: 6, height: 8.4,
          cover: { label: 'Stands', height: 2.1, as: 'barrel', count: 5 } },
        { id: 'crew_wing', label: 'Crew Wing', role: 'room', weight: 2, height: 3.4,
          seal: { bay: 'door' },
          cover: { label: 'Lockers', height: 1.5, as: 'crate', count: 4 } },
      ],
    },
    {
      id: 'gallery', z: 8.8, height: 3.2,
      purpose: 'the inspection gallery down one wall of the bay',
      extent: [9, 8, 28, 16],
      zones: [
        { id: 'inspection', label: 'Inspection Gallery', role: 'balcony', weight: 4, height: 3.0 },
        { id: 'stores', label: 'Stores', role: 'room', weight: 2, height: 3.0,
          seal: { inspection: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'apron', to: 'gallery', fromZone: 'bay', toZone: 'inspection', width: 2.6 },
    { from: 'apron', to: 'gallery', fromZone: 'crew_wing', toZone: 'stores', width: 2.6, optional: true },
  ],
  spawn: 'apron_yard',
  objective: 'bay',
};

/**
 * A cold store, entered from the warm side.
 *
 * The one concept where the incident is a temperature. Everything above is a
 * loading level anybody could walk into; everything below is sealed, and the
 * seals are what make the section a compression rather than a staircase.
 */
const COLDSTORE: SpatialConcept = {
  id: 'coldstore',
  name: 'Cold Store',
  thesis: 'A refrigerated store under a loading level, where every way down is a sealed door and the doors have been propped open long enough for it to matter.',
  built: 'a refrigerated distribution store',
  incident: 'the plant tripped out and the seals were chocked open to vent it',
  verb: 'emerge',
  contrast: ['warm loading level', 'sealed cold rooms'],
  grid: 1.7,
  size: [44, 30],
  wall: 0.3,
  bands: [
    {
      id: 'cold', z: -4.6, height: 4.0,
      purpose: 'the store itself: sealed, low and full of racking',
      extent: [4, 3, 36, 24],
      zones: [
        { id: 'chamber', label: 'Cold Chamber', role: 'site', weight: 5, height: 4.0,
          cover: { label: 'Racking', height: 1.8, as: 'crate', count: 6 } },
        { id: 'antechamber', label: 'Antechamber', role: 'corridor', weight: 2, height: 3.0,
          seal: { chamber: 'door' } },
        { id: 'compressors', label: 'Compressors', role: 'room', weight: 2, height: 3.6,
          seal: { chamber: 'door' },
          cover: { label: 'Plant', height: 1.7, as: 'barrel', count: 4 } },
      ],
    },
    {
      id: 'dock', z: 0, height: 5.6,
      purpose: 'the loading level, and the only part of this anybody sees',
      extent: [4, 3, 36, 24],
      zones: [
        { id: 'bay_doors', label: 'Bay Doors', role: 'spawn', weight: 3, height: 5.6,
          cover: { label: 'Cages', height: 1.4, as: 'crate', count: 4 } },
        { id: 'marshalling', label: 'Marshalling', role: 'lane', weight: 4, height: 5.6,
          cover: { label: 'Pallets', height: 1.2, as: 'crate', count: 5 } },
        { id: 'dispatch', label: 'Dispatch', role: 'room', weight: 2, height: 4.2,
          seal: { marshalling: 'arch' } },
      ],
    },
  ],
  links: [
    { from: 'cold', to: 'dock', fromZone: 'chamber', toZone: 'marshalling', width: 2.6 },
    { from: 'cold', to: 'dock', fromZone: 'antechamber', toZone: 'bay_doors', width: 2.6, optional: true },
    { from: 'cold', to: 'dock', fromZone: 'compressors', toZone: 'dispatch', width: 2.6, optional: true },
  ],
  spawn: 'bay_doors',
  objective: 'chamber',
};

/**
 * A night market, which is a street with a lid on.
 *
 * Dense, low and busy at ground level; one walkway above; and the stock rooms
 * behind the stalls, which are the only quiet places in it. The verb is thread
 * because every route through it is short, and there are a lot of them.
 */
const MARKET: SpatialConcept = {
  id: 'nightmarket',
  name: 'Night Market',
  thesis: 'A covered market street where every route is twelve metres long, the stock rooms behind the stalls are the only quiet places, and one walkway above sees the length of it.',
  built: 'a covered night market',
  incident: 'it was cleared at closing and the awnings were left up',
  verb: 'thread',
  contrast: ['lit market street', 'dark stock rooms'],
  grid: 1.5,
  size: [46, 30],
  wall: 0.24,
  bands: [
    {
      id: 'street', z: 0, height: 4.6,
      purpose: 'the market itself, and everything behind it',
      extent: [4, 3, 38, 24],
      zones: [
        { id: 'gate_end', label: 'Gate End', role: 'spawn', weight: 2, height: 4.6,
          cover: { label: 'Barrows', height: 1.1, as: 'crate', count: 4 } },
        { id: 'stall_run', label: 'Stall Run', role: 'lane', weight: 4, height: 4.6,
          cover: { label: 'Stalls', height: 1.4, as: 'crate', count: 7 } },
        { id: 'back_stock', label: 'Back Stock', role: 'room', weight: 2, height: 3.4,
          seal: { stall_run: 'door' },
          cover: { label: 'Crates', height: 1.5, as: 'crate', count: 5 } },
        { id: 'food_court', label: 'Food Court', role: 'site', weight: 3, height: 4.6,
          cover: { label: 'Tables', height: 1.0, as: 'crate', count: 5 } },
      ],
    },
    {
      id: 'balconies', z: 5.0, height: 3.0,
      purpose: 'one walkway, the length of the street',
      extent: [8, 7, 30, 16],
      zones: [
        { id: 'upper_walk', label: 'Upper Walk', role: 'balcony', weight: 5, height: 2.8 },
        { id: 'office', label: 'Market Office', role: 'room', weight: 2, height: 2.8,
          seal: { upper_walk: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'street', to: 'balconies', fromZone: 'food_court', toZone: 'upper_walk', width: 2.4 },
    { from: 'street', to: 'balconies', fromZone: 'stall_run', toZone: 'upper_walk', width: 2.4, optional: true },
    { from: 'street', to: 'balconies', fromZone: 'back_stock', toZone: 'office', width: 2.4, optional: true },
  ],
  spawn: 'gate_end',
  objective: 'food_court',
};

/**
 * An archive: a public room over a closed one over a sealed one.
 *
 * Three enclosed bands with nothing open between them, which is the opposite
 * section to the sorting hall and the reason both are here. You never see the
 * level you are going to until you are on it.
 */
const ARCHIVE: SpatialConcept = {
  id: 'archive',
  name: 'Archive',
  thesis: 'A reading room over closed stacks over a sealed vault, with nothing open between any of them, so you never see the floor you are going to until you are standing on it.',
  built: 'a national records archive',
  incident: 'the building was ordered emptied and the vault was never signed off',
  verb: 'descend',
  contrast: ['public reading room', 'sealed vault'],
  // One way down, on purpose: a vault with a back stair is not a vault.
  routes: 1,
  grid: 1.7,
  size: [42, 30],
  wall: 0.32,
  bands: [
    {
      id: 'vault', z: -8.8, height: 4.0,
      purpose: 'the sealed level, and the reason for the building',
      extent: [6, 5, 30, 20],
      zones: [
        { id: 'strongroom', label: 'Strongroom', role: 'site', weight: 4, height: 4.0,
          cover: { label: 'Cases', height: 1.6, as: 'crate', count: 5 } },
        { id: 'airlock', label: 'Airlock', role: 'corridor', weight: 2, height: 3.0,
          seal: { strongroom: 'door' } },
      ],
    },
    {
      id: 'stacks', z: -4.4, height: 4.0,
      purpose: 'closed stacks: aisles, and nothing else',
      extent: [5, 4, 32, 22],
      zones: [
        { id: 'aisles', label: 'Stacks', role: 'room', weight: 5, height: 4.0,
          cover: { label: 'Shelving', height: 1.9, as: 'crate', count: 7 } },
        { id: 'sorting_desk', label: 'Sorting', role: 'room', weight: 2, height: 4.0,
          seal: { aisles: 'arch' } },
      ],
    },
    {
      id: 'reading', z: 0, height: 6.0,
      purpose: 'the part of the building with windows',
      extent: [4, 3, 34, 24],
      zones: [
        { id: 'reading_room', label: 'Reading Room', role: 'spawn', weight: 4, height: 6.0,
          cover: { label: 'Desks', height: 1.1, as: 'crate', count: 5 } },
        { id: 'catalogue', label: 'Catalogue', role: 'lane', weight: 3, height: 6.0,
          cover: { label: 'Cabinets', height: 1.5, as: 'crate', count: 4 } },
      ],
    },
  ],
  links: [
    { from: 'stacks', to: 'reading', fromZone: 'aisles', toZone: 'catalogue', width: 2.6 },
    { from: 'vault', to: 'stacks', fromZone: 'strongroom', toZone: 'aisles', width: 2.6 },
    { from: 'vault', to: 'stacks', fromZone: 'airlock', toZone: 'sorting_desk', width: 2.6, optional: true },
  ],
  spawn: 'reading_room',
  objective: 'strongroom',
};

/**
 * A switchyard: almost all of it outdoors, and the interesting part buried.
 *
 * The only concept here whose main band is open sky. What makes it a section
 * rather than a field is the cable basement, which runs under the whole thing
 * and is the only way to cross it without being seen.
 */
const SWITCHYARD: SpatialConcept = {
  id: 'switchyard',
  name: 'Switchyard',
  thesis: 'An open switchyard nobody can cross unseen, over a cable basement that runs the whole length of it and has no windows at all.',
  built: 'a grid switching station',
  incident: 'the yard was isolated for work and half of it is still live',
  verb: 'cross',
  contrast: ['open switchyard', 'cable basement'],
  grid: 1.8,
  size: [46, 30],
  wall: 0.3,
  bands: [
    {
      id: 'cables', z: -4.4, height: 3.4,
      purpose: 'the basement: low, unlit, and the only unseen way across',
      extent: [5, 4, 34, 22],
      zones: [
        { id: 'cable_run', label: 'Cable Run', role: 'corridor', weight: 4, height: 2.8,
          cover: { label: 'Trays', height: 1.0, as: 'barrel', count: 5 } },
        { id: 'battery_room', label: 'Battery Room', role: 'room', weight: 2, height: 3.2,
          seal: { cable_run: 'door' },
          cover: { label: 'Cells', height: 1.4, as: 'crate', count: 4 } },
      ],
    },
    {
      id: 'yard', z: 0, height: 9.0,
      purpose: 'the yard, and there is nowhere in it to stand',
      extent: [4, 3, 38, 24],
      zones: [
        { id: 'gatehouse_yard', label: 'Gate', role: 'spawn', weight: 2, height: 6.0,
          cover: { label: 'Barriers', height: 1.0, as: 'crate', count: 3 } },
        { id: 'busbars', label: 'Busbars', role: 'site', weight: 5, height: 9.0,
          cover: { label: 'Isolators', height: 2.2, as: 'barrel', count: 6 } },
        { id: 'control_house', label: 'Control House', role: 'room', weight: 2, height: 4.4,
          seal: { busbars: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'cables', to: 'yard', fromZone: 'cable_run', toZone: 'busbars', width: 2.6 },
    { from: 'cables', to: 'yard', fromZone: 'battery_room', toZone: 'control_house', width: 2.6, optional: true },
    { from: 'cables', to: 'yard', fromZone: 'cable_run', toZone: 'gatehouse_yard', width: 2.6, optional: true },
  ],
  spawn: 'gatehouse_yard',
  objective: 'busbars',
};

/**
 * A building that is not finished, which is a different thing from a ruin.
 *
 * Three bands and almost no walls: the slabs are poured, the core is up, and
 * everything else is edge. The one map here where being on a higher band is
 * worse rather than better, because there is nothing to stand behind.
 */
const SCAFFOLD: SpatialConcept = {
  id: 'scaffold',
  name: 'Scaffold',
  thesis: 'Three poured slabs, a finished core and no walls anywhere else, so every floor above the first is a place with nothing at all to stand behind.',
  built: 'an office block, most of the way up',
  incident: 'the site was abandoned between the frame going up and the cladding going on',
  verb: 'climb',
  contrast: ['finished core', 'open frame'],
  grid: 1.7,
  size: [40, 30],
  wall: 0.28,
  bands: [
    {
      id: 'ground_slab', z: 0, height: 4.4,
      purpose: 'the level with the hoardings round it',
      extent: [4, 3, 32, 24],
      zones: [
        { id: 'compound', label: 'Compound', role: 'spawn', weight: 3, height: 4.4,
          cover: { label: 'Skips', height: 1.5, as: 'crate', count: 4 } },
        { id: 'slab_one', label: 'First Slab', role: 'lane', weight: 4, height: 4.4,
          cover: { label: 'Formwork', height: 1.2, as: 'crate', count: 5 } },
        { id: 'core_base', label: 'Core', role: 'stairwell', weight: 2, height: 4.4 },
      ],
    },
    {
      id: 'mid_slab', z: 4.8, height: 4.0,
      purpose: 'a slab with kerbs where the walls will go',
      extent: [5, 4, 30, 22],
      zones: [
        { id: 'slab_two', label: 'Second Slab', role: 'site', weight: 5, height: 1.2,
          cover: { label: 'Rebar', height: 1.0, as: 'crate', count: 5 } },
        { id: 'core_mid', label: 'Core Landing', role: 'stairwell', weight: 2, height: 4.0 },
      ],
    },
    {
      id: 'top_slab', z: 9.2, height: 3.6,
      purpose: 'the top pour, and nothing on it at all',
      extent: [7, 6, 26, 18],
      zones: [
        { id: 'slab_three', label: 'Top Slab', role: 'roof', weight: 5, height: 1.2 },
        { id: 'core_top', label: 'Core Head', role: 'stairwell', weight: 2, height: 3.6 },
      ],
    },
  ],
  links: [
    { from: 'ground_slab', to: 'mid_slab', fromZone: 'core_base', toZone: 'core_mid', width: 2.6 },
    { from: 'mid_slab', to: 'top_slab', fromZone: 'core_mid', toZone: 'core_top', width: 2.6 },
    { from: 'ground_slab', to: 'mid_slab', fromZone: 'slab_one', toZone: 'slab_two', width: 2.6, optional: true },
    { from: 'mid_slab', to: 'top_slab', fromZone: 'slab_two', toZone: 'slab_three', width: 2.6, optional: true },
  ],
  spawn: 'compound',
  objective: 'slab_three',
};

/**
 * A quarry: benches cut into rock, and one adit into the side of it.
 *
 * Terraced rather than stacked, and the bands step *outward* as they go down
 * — the opposite of a tower — so from the top you can see every level you are
 * about to be on and from the bottom you can see nothing.
 */
const QUARRY: SpatialConcept = {
  id: 'quarry',
  name: 'Quarry',
  thesis: 'Benches cut down into rock, each wider than the one above it, so from the rim you can see every level you are about to stand on and from the floor you can see none of them.',
  built: 'a stone quarry with a haul road',
  incident: 'the face was shot the week the site closed and the muck was never cleared',
  verb: 'descend',
  contrast: ['open sky', 'cut rock'],
  // One haul road. A quarry has exactly as many ways down as it was cut.
  routes: 1,
  grid: 1.8,
  size: [38, 28],
  wall: 0.34,
  bands: [
    {
      id: 'pit', z: -8.0, height: 4.2,
      purpose: 'the floor of the pit, and an adit into the wall of it',
      extent: [4, 3, 30, 22],
      zones: [
        { id: 'pit_floor', label: 'Pit Floor', role: 'site', weight: 5, height: 6.4,
          cover: { label: 'Muck', height: 1.8, as: 'crate', count: 6 } },
        { id: 'adit', label: 'Adit', role: 'corridor', weight: 2, height: 3.0,
          seal: { pit_floor: 'arch' } },
      ],
    },
    {
      id: 'bench', z: -3.6, height: 4.0,
      purpose: 'the middle bench and the haul road along it',
      extent: [5, 4, 26, 18],
      zones: [
        { id: 'haul_road', label: 'Haul Road', role: 'lane', weight: 4, height: 4.0,
          cover: { label: 'Boulders', height: 1.6, as: 'barrel', count: 5 } },
        { id: 'crusher', label: 'Crusher', role: 'room', weight: 2, height: 4.0,
          seal: { haul_road: 'door' },
          cover: { label: 'Screens', height: 1.7, as: 'barrel', count: 3 } },
      ],
    },
    {
      id: 'rim', z: 0.4, height: 4.0,
      purpose: 'the rim, and everything the site had on it',
      extent: [7, 6, 22, 14],
      zones: [
        { id: 'weighbridge', label: 'Weighbridge', role: 'spawn', weight: 3, height: 4.0,
          cover: { label: 'Blocks', height: 1.3, as: 'crate', count: 3 } },
        { id: 'magazine', label: 'Magazine', role: 'room', weight: 2, height: 3.4,
          seal: { weighbridge: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'bench', to: 'rim', fromZone: 'haul_road', toZone: 'weighbridge', width: 2.8 },
    { from: 'pit', to: 'bench', fromZone: 'pit_floor', toZone: 'haul_road', width: 2.8 },
    { from: 'pit', to: 'bench', fromZone: 'adit', toZone: 'crusher', width: 2.6, optional: true },
  ],
  spawn: 'weighbridge',
  objective: 'pit_floor',
};

/**
 * A relay station: a shielded hall you cannot see out of, under a deck you
 * cannot hide on.
 *
 * The sharpest contrast in the set, and the reason it is worth having: the two
 * bands ask opposite questions, and the only way between them is one flight.
 */
const RELAY: SpatialConcept = {
  id: 'relay',
  name: 'Relay',
  thesis: 'A shielded equipment hall with no windows at all, under an antenna deck with no cover at all, joined by one flight of stairs.',
  built: 'a microwave relay station',
  incident: 'the link dropped and the maintenance crew never came back down',
  verb: 'climb',
  contrast: ['shielded hall', 'exposed deck'],
  grid: 1.7,
  size: [40, 28],
  wall: 0.32,
  bands: [
    {
      id: 'hall', z: 0, height: 5.0,
      purpose: 'the equipment hall: enclosed, and the whole of the ground floor',
      extent: [4, 3, 32, 22],
      zones: [
        { id: 'entry', label: 'Entry', role: 'spawn', weight: 2, height: 5.0 },
        { id: 'equipment', label: 'Equipment Hall', role: 'site', weight: 5, height: 5.0,
          seal: { entry: 'door' },
          cover: { label: 'Racks', height: 1.9, as: 'crate', count: 6 } },
        { id: 'power_room', label: 'Power', role: 'room', weight: 2, height: 4.0,
          seal: { equipment: 'door' },
          cover: { label: 'Rectifiers', height: 1.5, as: 'barrel', count: 3 } },
      ],
    },
    {
      id: 'deck', z: 5.4, height: 3.4,
      purpose: 'the antenna deck, with the horizon on four sides of it',
      extent: [7, 6, 26, 16],
      zones: [
        { id: 'antenna_deck', label: 'Antenna Deck', role: 'roof', weight: 5, height: 1.4,
          cover: { label: 'Dishes', height: 1.8, as: 'barrel', count: 4 } },
        { id: 'head_room', label: 'Head Room', role: 'room', weight: 2, height: 3.2,
          seal: { antenna_deck: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'hall', to: 'deck', fromZone: 'equipment', toZone: 'antenna_deck', width: 2.6 },
    { from: 'hall', to: 'deck', fromZone: 'power_room', toZone: 'head_room', width: 2.6, optional: true },
  ],
  spawn: 'entry',
  objective: 'antenna_deck',
};

/**
 * A dry dock: a hole the shape of a ship, with a quay round it.
 *
 * The dock is the map. Everything else is edge, and the pump gallery under it
 * is the only way from one side to the other that does not involve being on
 * the quay in full view.
 */
const DRYDOCK: SpatialConcept = {
  id: 'drydock',
  name: 'Dry Dock',
  thesis: 'A drained dock with a quay all the way round it, where crossing on the quay means being seen from everywhere and the only alternative is the pump gallery beneath.',
  built: 'a ship repair dock',
  incident: 'the dock was pumped down for survey and the caisson has not been floated back',
  verb: 'cross',
  contrast: ['open quay', 'pump gallery'],
  grid: 1.7,
  size: [40, 28],
  wall: 0.34,
  bands: [
    {
      id: 'gallery', z: -7.6, height: 3.4,
      purpose: 'the gallery under the dock, and the culverts off it',
      extent: [5, 4, 28, 18],
      zones: [
        { id: 'pump_gallery', label: 'Pump Gallery', role: 'corridor', weight: 4, height: 3.0,
          cover: { label: 'Valves', height: 1.2, as: 'barrel', count: 5 } },
        { id: 'caisson_room', label: 'Caisson Room', role: 'room', weight: 2, height: 3.4,
          seal: { pump_gallery: 'door' } },
      ],
    },
    {
      id: 'dock_floor', z: -3.4, height: 3.6,
      purpose: 'the floor of the dock itself, walled on every side',
      extent: [6, 5, 26, 16],
      zones: [
        { id: 'dock_bottom', label: 'Dock Bottom', role: 'site', weight: 5, height: 3.6,
          cover: { label: 'Blocks', height: 1.5, as: 'crate', count: 6 } },
        { id: 'altar_steps', label: 'Altar Steps', role: 'lane', weight: 2, height: 3.6 },
      ],
    },
    {
      id: 'quay', z: 0.4, height: 5.0,
      purpose: 'the quay: everything round the hole, and all of it in view',
      extent: [4, 3, 32, 22],
      zones: [
        { id: 'quayside', label: 'Quayside', role: 'spawn', weight: 4, height: 5.0,
          cover: { label: 'Bollards', height: 1.0, as: 'crate', count: 5 } },
        { id: 'crane_track', label: 'Crane Track', role: 'lane', weight: 3, height: 5.0,
          cover: { label: 'Gantries', height: 2.0, as: 'barrel', count: 4 } },
        { id: 'workshops', label: 'Workshops', role: 'room', weight: 2, height: 4.2,
          seal: { quayside: 'door' } },
      ],
    },
  ],
  links: [
    { from: 'dock_floor', to: 'quay', fromZone: 'altar_steps', toZone: 'quayside', width: 2.8 },
    { from: 'gallery', to: 'dock_floor', fromZone: 'pump_gallery', toZone: 'dock_bottom', width: 2.6 },
    { from: 'dock_floor', to: 'quay', fromZone: 'dock_bottom', toZone: 'crane_track', width: 2.6, optional: true },
    { from: 'gallery', to: 'dock_floor', fromZone: 'caisson_room', toZone: 'altar_steps', width: 2.6, optional: true },
  ],
  spawn: 'quayside',
  objective: 'dock_bottom',
};

export const CONCEPTS: SpatialConcept[] = [
  TERMINUS, FOUNDRY, CISTERN, ARCOLOGY,
  SORTING, HANGAR, COLDSTORE, MARKET, ARCHIVE,
  SWITCHYARD, SCAFFOLD, QUARRY, RELAY, DRYDOCK,
];
