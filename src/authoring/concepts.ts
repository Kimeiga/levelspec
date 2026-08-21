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
      id: 'ground_slab', z: 0, height: 4.4, roofed: false,
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
      id: 'mid_slab', z: 4.8, height: 4.0, roofed: false,
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
      id: 'pit', z: -8.0, height: 4.2, roofed: false,
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
      id: 'bench', z: -3.6, height: 4.0, roofed: false,
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
      id: 'dock_floor', z: -3.4, height: 3.6, roofed: false,
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


/**
 * A courthouse: a room built to be looked at, over rooms built so nobody can.
 *
 * The public half is one storey and enormous; the custodial half is two and
 * has a ceiling you can touch. You descend into it, which is the point.
 */
const COURTHOUSE: SpatialConcept = {
  id: 'courthouse', name: 'Courthouse',
  thesis: 'A courtroom built to be looked at, over cells built so that nobody can, joined by the one stair the public never sees.',
  built: 'a criminal court', incident: 'the building was cleared during a sitting and the custody suite was not emptied',
  verb: 'descend', contrast: ['public hall', 'custody suite'], routes: 1,
  grid: 1.7, size: [40, 28], wall: 0.32,
  bands: [
    { id: 'custody', z: -4.6, height: 3.4, purpose: 'cells, and a corridor with no windows on it',
      extent: [5, 4, 30, 20], zones: [
        { id: 'cell_run', label: 'Cell Run', role: 'corridor', weight: 3, height: 2.8 },
        { id: 'holding', label: 'Holding', role: 'site', weight: 3, height: 3.2, seal: { cell_run: 'door' },
          cover: { label: 'Benches', height: 1.0, as: 'crate', count: 4 } },
        { id: 'dock_stair', label: 'Dock Stair', role: 'stairwell', weight: 2, height: 3.4, seal: { holding: 'door' } },
      ] },
    { id: 'public', z: 0, height: 7.4, purpose: 'the part with the columns on it',
      extent: [4, 3, 32, 22], zones: [
        { id: 'steps', label: 'Steps', role: 'spawn', weight: 2, height: 7.4 },
        { id: 'hall', label: 'Great Hall', role: 'lane', weight: 4, height: 7.4,
          cover: { label: 'Benches', height: 1.0, as: 'crate', count: 4 } },
        { id: 'courtroom', label: 'Courtroom', role: 'room', weight: 3, height: 6.4, seal: { hall: 'door' },
          cover: { label: 'Furniture', height: 1.2, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'custody', to: 'public', fromZone: 'dock_stair', toZone: 'courtroom', width: 2.6 },
    { from: 'custody', to: 'public', fromZone: 'cell_run', toZone: 'hall', width: 2.6, optional: true },
  ],
  spawn: 'steps', objective: 'holding',
};

/**
 * An infirmary built round a light court, with all its machinery underneath.
 *
 * You go round rather than through: the wards form a ring and the court in the
 * middle is a hole you can see across and not walk across.
 */
const INFIRMARY: SpatialConcept = {
  id: 'infirmary', name: 'Infirmary',
  thesis: 'Ward wings arranged round a light court you can see across and not walk across, with every machine the building needs directly underneath them.',
  built: 'a district hospital', incident: 'the wards were evacuated in one night and the plant left running',
  verb: 'orbit', contrast: ['quiet wards', 'plant room'],
  grid: 1.6, size: [42, 30], wall: 0.26,
  bands: [
    { id: 'services', z: -4.0, height: 3.2, purpose: 'the level that makes the building work',
      extent: [6, 5, 28, 18], zones: [
        { id: 'plant', label: 'Plant', role: 'room', weight: 3, height: 3.0,
          cover: { label: 'Pumps', height: 1.5, as: 'barrel', count: 4 } },
        { id: 'service_spine', label: 'Service Spine', role: 'corridor', weight: 3, height: 2.7, seal: { plant: 'door' } },
      ] },
    { id: 'wards', z: 0, height: 4.6, purpose: 'the wards, and the court they are wrapped round',
      extent: [4, 3, 34, 24], zones: [
        { id: 'reception_ward', label: 'Reception', role: 'spawn', weight: 2, height: 4.6 },
        { id: 'west_ward', label: 'West Ward', role: 'room', weight: 3, height: 4.6,
          cover: { label: 'Beds', height: 1.0, as: 'crate', count: 5 } },
        { id: 'light_court', label: 'Light Court', role: 'site', weight: 2, height: 4.6 },
        { id: 'east_ward', label: 'East Ward', role: 'room', weight: 3, height: 4.6,
          cover: { label: 'Trolleys', height: 1.1, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'services', to: 'wards', fromZone: 'service_spine', toZone: 'west_ward', width: 2.4 },
    { from: 'services', to: 'wards', fromZone: 'plant', toZone: 'east_ward', width: 2.4, optional: true },
  ],
  spawn: 'reception_ward', objective: 'light_court',
};

/**
 * An observatory: one instrument, and a building wrapped round it.
 *
 * Everything below the dome exists to serve the thing in it, so the section is
 * a hierarchy rather than a stack — and the top is the smallest part.
 */
const OBSERVATORY: SpatialConcept = {
  id: 'observatory', name: 'Observatory',
  thesis: 'One instrument at the top of a mountain and three storeys of building underneath whose only purpose is to hold it steady.',
  built: 'a mountain observatory', incident: 'the dome was left open to a storm and the drives have not been reset',
  verb: 'climb', contrast: ['precision instrument', 'cut rock'],
  // One way up to a dome. There is never a second stair to an instrument.
  routes: 1,
  grid: 1.7, size: [38, 28], wall: 0.32,
  bands: [
    { id: 'foundation', z: -4.4, height: 3.6, purpose: 'the pier and the cable trench, cut into rock',
      extent: [7, 6, 22, 16], zones: [
        { id: 'pier_room', label: 'Pier Room', role: 'room', weight: 3, height: 3.4,
          cover: { label: 'Ballast', height: 1.3, as: 'barrel', count: 3 } },
        { id: 'cable_trench', label: 'Cable Trench', role: 'corridor', weight: 2, height: 2.6, seal: { pier_room: 'door' } },
      ] },
    { id: 'instrument', z: 0, height: 4.6, purpose: 'the working floor, and the way in',
      extent: [4, 3, 30, 22], zones: [
        { id: 'entrance', label: 'Entrance', role: 'spawn', weight: 2, height: 4.6 },
        { id: 'control', label: 'Control', role: 'room', weight: 2, height: 4.4, seal: { entrance: 'door' },
          cover: { label: 'Consoles', height: 1.2, as: 'crate', count: 3 } },
        { id: 'optics_shop', label: 'Optics Shop', role: 'room', weight: 3, height: 4.6,
          cover: { label: 'Benches', height: 1.1, as: 'crate', count: 4 } },
      ] },
    { id: 'dome', z: 5.0, height: 5.4, purpose: 'the dome, and nothing else at all',
      extent: [8, 6, 24, 18], zones: [
        { id: 'dome_floor', label: 'Dome', role: 'site', weight: 5, height: 5.2,
          cover: { label: 'Mounting', height: 2.0, as: 'barrel', count: 3 } },
        { id: 'dome_gallery', label: 'Gallery', role: 'balcony', weight: 2, height: 3.0 },
      ] },
  ],
  links: [
    { from: 'instrument', to: 'dome', fromZone: 'optics_shop', toZone: 'dome_floor', width: 2.6 },
    { from: 'foundation', to: 'instrument', fromZone: 'pier_room', toZone: 'optics_shop', width: 2.6 },
    { from: 'foundation', to: 'instrument', fromZone: 'cable_trench', toZone: 'control', width: 2.4, optional: true },
  ],
  spawn: 'entrance', objective: 'dome_floor',
};

/**
 * A nave with a gallery round it and a crypt under it.
 *
 * Three heights of the same room. The gallery sees the whole nave and can be
 * reached from one end of it; the crypt sees nothing and is under all of it.
 */
const NAVE: SpatialConcept = {
  id: 'nave', name: 'Nave',
  thesis: 'One room three storeys tall, a gallery running round it at half height, and a crypt under the whole thing that can see none of it.',
  built: 'a cathedral', incident: 'the roof was stripped for repair and the scaffold never came down',
  verb: 'climb', contrast: ['monumental nave', 'cramped crypt'],
  grid: 1.8, size: [40, 30], wall: 0.36,
  bands: [
    { id: 'crypt', z: -4.4, height: 3.2, purpose: 'the crypt: low, vaulted and completely blind',
      extent: [7, 6, 24, 18], zones: [
        { id: 'undercroft_nave', label: 'Crypt', role: 'site', weight: 4, height: 3.0,
          cover: { label: 'Tombs', height: 1.2, as: 'crate', count: 5 } },
        { id: 'ossuary', label: 'Ossuary', role: 'room', weight: 2, height: 2.8, seal: { undercroft_nave: 'door' } },
      ] },
    { id: 'floor', z: 0, height: 9.0, purpose: 'the nave, the aisles and the west door',
      extent: [4, 3, 32, 24], zones: [
        { id: 'west_door', label: 'West Door', role: 'spawn', weight: 2, height: 8.0 },
        { id: 'nave_floor', label: 'Nave', role: 'lane', weight: 5, height: 9.0,
          cover: { label: 'Pews', height: 1.0, as: 'crate', count: 6 } },
        { id: 'chapter', label: 'Chapter House', role: 'room', weight: 2, height: 5.0, seal: { nave_floor: 'door' } },
      ] },
    { id: 'triforium', z: 9.4, height: 3.4, purpose: 'the gallery, halfway up the wall of the nave',
      extent: [8, 7, 24, 16], zones: [
        { id: 'gallery_walk', label: 'Triforium', role: 'balcony', weight: 4, height: 3.2 },
        { id: 'bell_stair', label: 'Bell Stair', role: 'stairwell', weight: 2, height: 3.2, seal: { gallery_walk: 'door' } },
      ] },
  ],
  links: [
    { from: 'floor', to: 'triforium', fromZone: 'nave_floor', toZone: 'gallery_walk', width: 2.6 },
    { from: 'crypt', to: 'floor', fromZone: 'undercroft_nave', toZone: 'nave_floor', width: 2.6 },
    { from: 'crypt', to: 'floor', fromZone: 'ossuary', toZone: 'chapter', width: 2.4, optional: true },
  ],
  spawn: 'west_door', objective: 'nave_floor',
};

/**
 * A bathhouse: warm rooms in a row, and the fire that heats them underneath.
 *
 * Terraced, because the pools step down. The boiler level is the whole
 * footprint and the pools sit on top of it in decreasing size.
 */
const BATHHOUSE: SpatialConcept = {
  id: 'bathhouse', name: 'Bathhouse',
  thesis: 'Pools stepping down one after another over the furnace that heats all of them, where the quiet route and the hot one are the same distance apart the whole way.',
  built: 'a municipal bathhouse', incident: 'the boilers were banked and the pools were never drained',
  verb: 'descend', contrast: ['still water', 'furnace'],
  grid: 1.6, size: [40, 28], wall: 0.28,
  bands: [
    { id: 'hypocaust', z: -3.8, height: 3.0, purpose: 'under the floor: flues, the furnace and no light',
      extent: [5, 4, 28, 18], zones: [
        { id: 'furnace', label: 'Furnace', role: 'room', weight: 3, height: 3.0,
          cover: { label: 'Coal', height: 1.4, as: 'crate', count: 4 } },
        { id: 'flue_run', label: 'Flues', role: 'corridor', weight: 3, height: 2.5, seal: { furnace: 'door' } },
      ] },
    { id: 'pools', z: 0, height: 5.4, purpose: 'the bathing rooms, in order of temperature',
      extent: [4, 3, 32, 22], zones: [
        { id: 'changing', label: 'Changing', role: 'spawn', weight: 2, height: 4.4 },
        { id: 'cold_room', label: 'Cold Room', role: 'lane', weight: 3, height: 5.4,
          cover: { label: 'Basins', height: 1.0, as: 'barrel', count: 4 } },
        { id: 'hot_room', label: 'Hot Room', role: 'site', weight: 3, height: 5.4, seal: { cold_room: 'arch' },
          cover: { label: 'Benches', height: 1.0, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'hypocaust', to: 'pools', fromZone: 'flue_run', toZone: 'cold_room', width: 2.4 },
    { from: 'hypocaust', to: 'pools', fromZone: 'furnace', toZone: 'hot_room', width: 2.4, optional: true },
  ],
  spawn: 'changing', objective: 'hot_room',
};

/**
 * A debating chamber, its lobbies, and the press above it.
 *
 * The chamber is the middle of everything and you go round it to get anywhere;
 * the gallery above sees into it and cannot get into it.
 */
const ASSEMBLY: SpatialConcept = {
  id: 'assembly', name: 'Assembly',
  thesis: 'A debating chamber with lobbies all the way round it and a press gallery above that can see into it and cannot get into it.',
  built: 'a regional assembly', incident: 'the session was suspended and the building sealed with the doors on the latch',
  verb: 'orbit', contrast: ['ceremonial chamber', 'service corridor'],
  grid: 1.7, size: [40, 28], wall: 0.3,
  bands: [
    { id: 'chamber_floor', z: 0, height: 7.0, purpose: 'the chamber and everything wrapped round it',
      extent: [4, 3, 32, 22], zones: [
        { id: 'members_entrance', label: 'Members Entrance', role: 'spawn', weight: 2, height: 5.0 },
        { id: 'division_lobby', label: 'Division Lobby', role: 'lane', weight: 3, height: 5.0,
          cover: { label: 'Benches', height: 1.0, as: 'crate', count: 4 } },
        { id: 'chamber', label: 'Chamber', role: 'site', weight: 4, height: 7.0, seal: { division_lobby: 'door' },
          cover: { label: 'Benches', height: 1.1, as: 'crate', count: 5 } },
        { id: 'committee', label: 'Committee', role: 'room', weight: 2, height: 4.4, seal: { division_lobby: 'door' } },
      ] },
    { id: 'press', z: 7.4, height: 3.2, purpose: 'the gallery over the chamber',
      extent: [8, 7, 24, 16], zones: [
        { id: 'press_gallery', label: 'Press Gallery', role: 'balcony', weight: 4, height: 3.0 },
        { id: 'booths', label: 'Booths', role: 'room', weight: 2, height: 3.0, seal: { press_gallery: 'door' } },
      ] },
  ],
  links: [
    { from: 'chamber_floor', to: 'press', fromZone: 'division_lobby', toZone: 'press_gallery', width: 2.6 },
    { from: 'chamber_floor', to: 'press', fromZone: 'committee', toZone: 'booths', width: 2.4, optional: true },
  ],
  spawn: 'members_entrance', objective: 'chamber',
};

/**
 * A school: wings of identical rooms, and one hall that is not.
 *
 * The whole map is repetition with a single exception in it, which is what a
 * school is and also what makes the hall worth fighting over.
 */
const SCHOOL: SpatialConcept = {
  id: 'school', name: 'School',
  thesis: 'Two wings of rooms that are all the same shape, one hall that is not, and an undercroft joining the wings that nobody upstairs can see into.',
  built: 'a secondary school', incident: 'term ended early and the caretaker never locked the undercroft',
  verb: 'thread', contrast: ['identical classrooms', 'the one room that is not'],
  grid: 1.6, size: [42, 28], wall: 0.26,
  bands: [
    { id: 'undercroft_school', z: -3.6, height: 3.0, purpose: 'the covered way between the wings',
      extent: [6, 5, 28, 18], zones: [
        { id: 'covered_way', label: 'Covered Way', role: 'corridor', weight: 4, height: 2.7,
          cover: { label: 'Bike Racks', height: 1.0, as: 'crate', count: 4 } },
        { id: 'boiler', label: 'Boiler House', role: 'room', weight: 2, height: 3.0, seal: { covered_way: 'door' } },
      ] },
    { id: 'teaching', z: 0, height: 4.4, purpose: 'the wings and the hall between them',
      extent: [4, 3, 34, 22], zones: [
        { id: 'gate_lodge', label: 'Gate', role: 'spawn', weight: 2, height: 4.4 },
        { id: 'north_wing', label: 'North Wing', role: 'room', weight: 3, height: 4.4,
          cover: { label: 'Desks', height: 1.0, as: 'crate', count: 5 } },
        { id: 'assembly_hall', label: 'Hall', role: 'site', weight: 3, height: 4.4,
          cover: { label: 'Stacked Chairs', height: 1.3, as: 'crate', count: 4 } },
        { id: 'south_wing', label: 'South Wing', role: 'room', weight: 3, height: 4.4, seal: { assembly_hall: 'door' },
          cover: { label: 'Desks', height: 1.0, as: 'crate', count: 5 } },
      ] },
  ],
  links: [
    { from: 'undercroft_school', to: 'teaching', fromZone: 'covered_way', toZone: 'assembly_hall', width: 2.4 },
    { from: 'undercroft_school', to: 'teaching', fromZone: 'boiler', toZone: 'south_wing', width: 2.4, optional: true },
  ],
  spawn: 'gate_lodge', objective: 'assembly_hall',
};

/**
 * A book stack: the same floor three times, and a void through all of them.
 *
 * Almost the purest vertical section in the set — three identical bands and
 * one hole — which makes it the map where you always know where you are and
 * never know which floor the shooting is on.
 */
const STACKS: SpatialConcept = {
  id: 'stacks', name: 'Stacks',
  thesis: 'Three floors of shelving that are the same floor three times, with one void running through all of them so you can hear which storey the shooting is on and not see it.',
  built: 'a deposit library', incident: 'the collection was being moved out and half the aisles are empty',
  verb: 'climb', contrast: ['dense shelving', 'the void'],
  grid: 1.6, size: [38, 28], wall: 0.26,
  bands: [
    { id: 'level_one', z: 0, height: 4.0, purpose: 'the floor you come in on',
      extent: [4, 3, 30, 22], zones: [
        { id: 'issue_desk', label: 'Issue Desk', role: 'spawn', weight: 2, height: 4.0 },
        { id: 'aisles_one', label: 'Aisles', role: 'lane', weight: 5, height: 4.0,
          cover: { label: 'Shelving', height: 1.8, as: 'crate', count: 7 } },
        { id: 'stair_one', label: 'Stair', role: 'stairwell', weight: 2, height: 4.0 },
      ] },
    { id: 'level_two', z: 4.4, height: 4.0, purpose: 'the same again, and you cannot tell from below',
      extent: [5, 4, 28, 20], zones: [
        { id: 'aisles_two', label: 'Aisles', role: 'site', weight: 5, height: 4.0,
          cover: { label: 'Shelving', height: 1.8, as: 'crate', count: 7 } },
        { id: 'stair_two', label: 'Stair', role: 'stairwell', weight: 2, height: 4.0 },
      ] },
    { id: 'level_three', z: 8.8, height: 3.6, purpose: 'and once more, with the roof lights',
      extent: [7, 6, 24, 16], zones: [
        { id: 'aisles_three', label: 'Aisles', role: 'room', weight: 5, height: 3.6,
          cover: { label: 'Shelving', height: 1.8, as: 'crate', count: 6 } },
        { id: 'stair_three', label: 'Stair', role: 'stairwell', weight: 2, height: 3.6 },
      ] },
  ],
  links: [
    { from: 'level_one', to: 'level_two', fromZone: 'stair_one', toZone: 'stair_two', width: 2.4 },
    { from: 'level_two', to: 'level_three', fromZone: 'stair_two', toZone: 'stair_three', width: 2.4 },
    { from: 'level_one', to: 'level_two', fromZone: 'aisles_one', toZone: 'aisles_two', width: 2.4, optional: true },
    { from: 'level_two', to: 'level_three', fromZone: 'aisles_two', toZone: 'aisles_three', width: 2.4, optional: true },
  ],
  spawn: 'issue_desk', objective: 'aisles_three',
};

/**
 * A gallery over the crates the gallery came out of.
 *
 * The contrast is what a thing looks like when it is being shown and what it
 * looks like when it is being kept, and the map has both of the same objects.
 */
const DEPOT_MUSEUM: SpatialConcept = {
  id: 'reserve', name: 'Reserve Collection',
  thesis: 'A lit gallery over the crated store the gallery came out of, so the same objects are on show upstairs and stacked on pallets underneath.',
  built: 'a museum and its reserve store', incident: 'the collection was being packed for a move when the building was closed',
  verb: 'descend', contrast: ['lit gallery', 'crated store'],
  grid: 1.7, size: [40, 28], wall: 0.3,
  bands: [
    { id: 'store', z: -4.4, height: 4.0, purpose: 'the store: racking, and no reason to light it',
      extent: [5, 4, 30, 20], zones: [
        { id: 'racking_store', label: 'Reserve Store', role: 'site', weight: 4, height: 4.0,
          cover: { label: 'Crates', height: 1.7, as: 'crate', count: 7 } },
        { id: 'conservation', label: 'Conservation', role: 'room', weight: 2, height: 3.6, seal: { racking_store: 'door' } },
      ] },
    { id: 'galleries', z: 0, height: 6.0, purpose: 'the part with the labels on the wall',
      extent: [4, 3, 32, 22], zones: [
        { id: 'foyer', label: 'Foyer', role: 'spawn', weight: 2, height: 6.0 },
        { id: 'long_gallery', label: 'Long Gallery', role: 'lane', weight: 4, height: 6.0,
          cover: { label: 'Cases', height: 1.4, as: 'crate', count: 5 } },
        { id: 'side_gallery', label: 'Side Gallery', role: 'room', weight: 2, height: 5.0, seal: { long_gallery: 'arch' } },
      ] },
  ],
  links: [
    { from: 'store', to: 'galleries', fromZone: 'racking_store', toZone: 'long_gallery', width: 2.6 },
    { from: 'store', to: 'galleries', fromZone: 'conservation', toZone: 'side_gallery', width: 2.4, optional: true },
  ],
  spawn: 'foyer', objective: 'racking_store',
};

/**
 * A switch hall: rows of frames, three floors of them, and one shaft.
 *
 * Repetition again, but mechanical rather than institutional — and the
 * distinguishing feature is that every floor is *identical*, so the only way
 * to know where you are is the shaft.
 */
const EXCHANGE: SpatialConcept = {
  id: 'exchange', name: 'Exchange',
  thesis: 'Three floors of switching frames that are indistinguishable from one another, and one cable shaft that is the only way to tell which of them you are on.',
  built: 'a telephone exchange', incident: 'the switches were being decommissioned rack by rack and the work stopped halfway',
  verb: 'climb', contrast: ['identical frames', 'the shaft'],
  grid: 1.6, size: [38, 26], wall: 0.26,
  bands: [
    { id: 'apparatus_one', z: 0, height: 4.2, purpose: 'the first apparatus floor',
      extent: [4, 3, 30, 20], zones: [
        { id: 'exchange_entry', label: 'Entry', role: 'spawn', weight: 2, height: 4.2 },
        { id: 'frames_one', label: 'Frames', role: 'lane', weight: 5, height: 4.2,
          cover: { label: 'Racks', height: 1.9, as: 'crate', count: 6 } },
        { id: 'shaft_one', label: 'Cable Shaft', role: 'stairwell', weight: 2, height: 4.2 },
      ] },
    { id: 'apparatus_two', z: 4.6, height: 4.2, purpose: 'the second, which is the first',
      extent: [5, 4, 28, 18], zones: [
        { id: 'frames_two', label: 'Frames', role: 'site', weight: 5, height: 4.2,
          cover: { label: 'Racks', height: 1.9, as: 'crate', count: 6 } },
        { id: 'shaft_two', label: 'Cable Shaft', role: 'stairwell', weight: 2, height: 4.2 },
      ] },
    { id: 'apparatus_three', z: 9.2, height: 3.8, purpose: 'and the third',
      extent: [6, 5, 24, 16], zones: [
        { id: 'frames_three', label: 'Frames', role: 'room', weight: 5, height: 3.8,
          cover: { label: 'Racks', height: 1.9, as: 'crate', count: 5 } },
        { id: 'shaft_three', label: 'Cable Shaft', role: 'stairwell', weight: 2, height: 3.8 },
      ] },
  ],
  links: [
    { from: 'apparatus_one', to: 'apparatus_two', fromZone: 'shaft_one', toZone: 'shaft_two', width: 2.4 },
    { from: 'apparatus_two', to: 'apparatus_three', fromZone: 'shaft_two', toZone: 'shaft_three', width: 2.4 },
    { from: 'apparatus_one', to: 'apparatus_two', fromZone: 'frames_one', toZone: 'frames_two', width: 2.4, optional: true },
  ],
  spawn: 'exchange_entry', objective: 'frames_two',
};

/**
 * A mint: a noisy hall over a room nobody is allowed in.
 *
 * The one map where the objective is behind two doors on purpose, and where
 * the route to it is the loudest place in the building.
 */
const MINT: SpatialConcept = {
  id: 'mint', name: 'Mint',
  thesis: 'A press hall loud enough that nothing can be heard in it, over a strongroom behind two doors that nobody working upstairs had a key to.',
  built: 'a coining works', incident: 'the presses were stopped for the count and the count was never finished',
  verb: 'infiltrate', contrast: ['press hall', 'strongroom'], routes: 1,
  grid: 1.7, size: [38, 28], wall: 0.34,
  bands: [
    { id: 'bullion', z: -4.8, height: 3.6, purpose: 'the vault level, and a lobby in front of it',
      extent: [7, 6, 22, 16], zones: [
        { id: 'strongroom_mint', label: 'Strongroom', role: 'site', weight: 3, height: 3.4,
          cover: { label: 'Pallets', height: 1.2, as: 'crate', count: 4 } },
        { id: 'vault_lobby', label: 'Vault Lobby', role: 'corridor', weight: 2, height: 3.0, seal: { strongroom_mint: 'door' } },
      ] },
    { id: 'works_mint', z: 0, height: 6.4, purpose: 'the presses, and the yard they were fed from',
      extent: [4, 3, 30, 22], zones: [
        { id: 'weigh_yard', label: 'Weigh Yard', role: 'spawn', weight: 2, height: 6.4 },
        { id: 'press_hall', label: 'Press Hall', role: 'lane', weight: 4, height: 6.4,
          cover: { label: 'Presses', height: 1.7, as: 'barrel', count: 5 } },
        { id: 'annealing', label: 'Annealing', role: 'room', weight: 2, height: 5.0, seal: { press_hall: 'door' } },
      ] },
  ],
  links: [
    { from: 'bullion', to: 'works_mint', fromZone: 'vault_lobby', toZone: 'press_hall', width: 2.6 },
    { from: 'bullion', to: 'works_mint', fromZone: 'strongroom_mint', toZone: 'annealing', width: 2.4, optional: true },
  ],
  spawn: 'weigh_yard', objective: 'strongroom_mint',
};

/**
 * A crematorium: a room for a few people, over a room for one machine.
 *
 * The smallest public space in the set over one of the largest pieces of
 * plant, which is the whole of the contrast and the reason for the section.
 */
const COMMITTAL: SpatialConcept = {
  id: 'committal', name: 'Committal',
  thesis: 'A chapel built for twenty people, directly over a furnace hall built for one machine, with a lift between them nobody attending ever sees.',
  built: 'a crematorium', incident: 'the last service overran and the plant was left at temperature',
  verb: 'descend', contrast: ['chapel', 'furnace hall'], routes: 1,
  grid: 1.6, size: [36, 26], wall: 0.3,
  bands: [
    { id: 'plant_hall', z: -4.2, height: 4.0, purpose: 'the machine, and the space it needs',
      extent: [5, 4, 26, 18], zones: [
        { id: 'furnace_hall', label: 'Furnace Hall', role: 'site', weight: 4, height: 4.4,
          cover: { label: 'Retorts', height: 1.9, as: 'barrel', count: 4 } },
        { id: 'ash_store', label: 'Ash Store', role: 'room', weight: 2, height: 3.2, seal: { furnace_hall: 'door' } },
      ] },
    { id: 'chapel_level', z: 0, height: 5.6, purpose: 'the chapel, the garden and the porte-cochere',
      extent: [4, 3, 28, 20], zones: [
        { id: 'porte', label: 'Porte-cochere', role: 'spawn', weight: 2, height: 5.6 },
        { id: 'chapel', label: 'Chapel', role: 'room', weight: 3, height: 5.6, seal: { porte: 'door' },
          cover: { label: 'Pews', height: 1.0, as: 'crate', count: 4 } },
        { id: 'garden_walk', label: 'Garden Walk', role: 'lane', weight: 3, height: 5.6,
          cover: { label: 'Planters', height: 1.0, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'plant_hall', to: 'chapel_level', fromZone: 'furnace_hall', toZone: 'garden_walk', width: 2.4 },
    { from: 'plant_hall', to: 'chapel_level', fromZone: 'ash_store', toZone: 'chapel', width: 2.4, optional: true },
  ],
  spawn: 'porte', objective: 'furnace_hall',
};


/**
 * A roundhouse: a circle of stalls round a turntable, with a pit under each.
 *
 * The only radial plan in the set. Everything faces the middle, which means
 * the middle is the worst place to be and also the only way between stalls.
 */
const ROUNDHOUSE: SpatialConcept = {
  id: 'roundhouse', name: 'Roundhouse',
  thesis: 'Engine stalls all facing one turntable, so the middle of the building is both the only way between any two of them and the worst place in it to be standing.',
  built: 'a locomotive shed', incident: 'the table was left off its stops with an engine half on it',
  verb: 'orbit', contrast: ['open turntable', 'inspection pits'],
  grid: 1.8, size: [40, 30], wall: 0.32,
  bands: [
    { id: 'pits', z: -3.4, height: 2.8, purpose: 'the inspection pits under the stalls',
      extent: [6, 5, 26, 18], zones: [
        { id: 'pit_run', label: 'Pit Run', role: 'corridor', weight: 4, height: 2.6,
          cover: { label: 'Jacks', height: 1.0, as: 'barrel', count: 4 } },
        { id: 'pit_store', label: 'Pit Store', role: 'room', weight: 2, height: 2.8, seal: { pit_run: 'door' } },
      ] },
    { id: 'shed', z: 0, height: 7.6, purpose: 'the shed floor and the table in the middle of it',
      extent: [4, 3, 32, 24], zones: [
        { id: 'shed_door', label: 'Shed Door', role: 'spawn', weight: 2, height: 7.6 },
        { id: 'stalls', label: 'Stalls', role: 'lane', weight: 4, height: 7.6,
          cover: { label: 'Wheelsets', height: 1.3, as: 'barrel', count: 5 } },
        { id: 'turntable', label: 'Turntable', role: 'site', weight: 3, height: 7.6 },
        { id: 'smithy', label: 'Smithy', role: 'room', weight: 2, height: 5.0, seal: { stalls: 'door' } },
      ] },
  ],
  links: [
    { from: 'pits', to: 'shed', fromZone: 'pit_run', toZone: 'stalls', width: 2.6 },
    { from: 'pits', to: 'shed', fromZone: 'pit_store', toZone: 'smithy', width: 2.4, optional: true },
  ],
  spawn: 'shed_door', objective: 'turntable',
};

/**
 * A grain terminal: silos you cannot enter and a bridge over the water.
 *
 * Most of the building's volume is off limits by construction, which makes
 * the walkable part a thin skin over something enormous.
 */
const GRAIN: SpatialConcept = {
  id: 'grain', name: 'Grain Terminal',
  thesis: 'Most of the building is silo you cannot go inside, so everything that can be walked on is a thin skin wrapped round something enormous and solid.',
  built: 'a river grain terminal', incident: 'the last barge was part loaded and the conveyors are still full',
  verb: 'cross', contrast: ['sealed silo', 'open conveyor bridge'],
  grid: 1.8, size: [44, 28], wall: 0.34,
  bands: [
    { id: 'tunnel', z: -4.0, height: 3.2, purpose: 'the belt tunnel under the silos',
      extent: [5, 4, 32, 18], zones: [
        { id: 'belt_tunnel', label: 'Belt Tunnel', role: 'corridor', weight: 4, height: 2.8,
          cover: { label: 'Hoppers', height: 1.2, as: 'barrel', count: 5 } },
        { id: 'motor_house', label: 'Motor House', role: 'room', weight: 2, height: 3.2, seal: { belt_tunnel: 'door' } },
      ] },
    { id: 'quay_level', z: 0, height: 8.6, purpose: 'the wharf and the base of the silos',
      extent: [4, 3, 36, 22], zones: [
        { id: 'weighbridge_grain', label: 'Weighbridge', role: 'spawn', weight: 2, height: 6.0 },
        { id: 'silo_base', label: 'Silo Base', role: 'lane', weight: 4, height: 8.6,
          cover: { label: 'Outlets', height: 1.5, as: 'barrel', count: 5 } },
        { id: 'barge_berth', label: 'Barge Berth', role: 'site', weight: 3, height: 8.6,
          cover: { label: 'Bollards', height: 1.0, as: 'crate', count: 4 } },
      ] },
    { id: 'bridge_level', z: 9.0, height: 3.2, purpose: 'the conveyor bridge over the water',
      extent: [8, 7, 26, 14], zones: [
        { id: 'conveyor_bridge', label: 'Conveyor Bridge', role: 'balcony', weight: 4, height: 3.0 },
        { id: 'headhouse', label: 'Headhouse', role: 'room', weight: 2, height: 3.0, seal: { conveyor_bridge: 'door' } },
      ] },
  ],
  links: [
    { from: 'quay_level', to: 'bridge_level', fromZone: 'silo_base', toZone: 'conveyor_bridge', width: 2.6 },
    { from: 'tunnel', to: 'quay_level', fromZone: 'belt_tunnel', toZone: 'silo_base', width: 2.6 },
    { from: 'tunnel', to: 'quay_level', fromZone: 'motor_house', toZone: 'barge_berth', width: 2.4, optional: true },
  ],
  spawn: 'weighbridge_grain', objective: 'barge_berth',
};

/**
 * A paper mill, wet end to dry end.
 *
 * A process map like the foundry, but the process is *long and thin* rather
 * than staged, so the fight is a corridor with a machine in it.
 */
const MILL: SpatialConcept = {
  id: 'mill', name: 'Paper Mill',
  thesis: 'One machine ninety metres long, and a building that is only the shape it is because the machine is that shape.',
  built: 'a paper mill', incident: 'the web broke at speed and the machine was left threaded',
  verb: 'thread', contrast: ['wet end', 'dry end'],
  grid: 1.7, size: [46, 26], wall: 0.3,
  bands: [
    { id: 'basement_mill', z: -3.8, height: 3.2, purpose: 'under the machine: broke pits and pipework',
      extent: [5, 4, 34, 16], zones: [
        { id: 'broke_pit', label: 'Broke Pit', role: 'site', weight: 3, height: 3.2,
          cover: { label: 'Agitators', height: 1.3, as: 'barrel', count: 4 } },
        { id: 'pipe_alley', label: 'Pipe Alley', role: 'corridor', weight: 3, height: 2.6, seal: { broke_pit: 'door' } },
      ] },
    { id: 'machine_floor', z: 0, height: 6.4, purpose: 'the machine, end to end',
      extent: [4, 3, 38, 20], zones: [
        { id: 'wet_end', label: 'Wet End', role: 'spawn', weight: 3, height: 6.4,
          cover: { label: 'Headbox', height: 1.6, as: 'barrel', count: 3 } },
        { id: 'press_section', label: 'Presses', role: 'lane', weight: 3, height: 6.4,
          cover: { label: 'Rolls', height: 1.5, as: 'barrel', count: 5 } },
        { id: 'dry_end', label: 'Dry End', role: 'lane', weight: 3, height: 6.4,
          cover: { label: 'Reels', height: 1.4, as: 'barrel', count: 4 } },
        { id: 'control_mill', label: 'Control', role: 'room', weight: 1, height: 4.0, seal: { press_section: 'door' } },
      ] },
  ],
  links: [
    { from: 'basement_mill', to: 'machine_floor', fromZone: 'pipe_alley', toZone: 'press_section', width: 2.6 },
    { from: 'basement_mill', to: 'machine_floor', fromZone: 'broke_pit', toZone: 'dry_end', width: 2.6, optional: true },
  ],
  spawn: 'wet_end', objective: 'broke_pit',
};

/**
 * A works where everything hangs from a rail in the ceiling.
 *
 * The route is fixed by the rail and the rooms get colder as you follow it,
 * so the map has a direction whether you want one or not.
 */
const CHILLWORKS: SpatialConcept = {
  id: 'chillworks', name: 'Chill Works',
  thesis: 'A rail in the ceiling that runs through every room in the building in one order, and rooms that get colder the further along it you go.',
  built: 'a meat processing works', incident: 'the line stopped between rooms and the doors were left hooked open',
  verb: 'thread', contrast: ['warm lairage', 'chill rooms'],
  grid: 1.6, size: [42, 26], wall: 0.28,
  bands: [
    { id: 'drains', z: -3.4, height: 2.8, purpose: 'the drainage level, which is where everything ends up',
      extent: [6, 4, 28, 16], zones: [
        { id: 'drain_gallery', label: 'Drain Gallery', role: 'corridor', weight: 4, height: 2.6 },
        { id: 'rendering', label: 'Rendering', role: 'room', weight: 2, height: 2.8, seal: { drain_gallery: 'door' },
          cover: { label: 'Tanks', height: 1.4, as: 'barrel', count: 4 } },
      ] },
    { id: 'line', z: 0, height: 5.4, purpose: 'the rooms, in the order the rail goes through them',
      extent: [4, 3, 34, 20], zones: [
        { id: 'lairage', label: 'Lairage', role: 'spawn', weight: 2, height: 5.4,
          cover: { label: 'Pens', height: 1.2, as: 'crate', count: 4 } },
        { id: 'kill_floor', label: 'Line', role: 'lane', weight: 3, height: 5.4,
          cover: { label: 'Cradles', height: 1.3, as: 'barrel', count: 4 } },
        { id: 'chill_room', label: 'Chill', role: 'site', weight: 3, height: 5.0, seal: { kill_floor: 'door' },
          cover: { label: 'Rails', height: 1.6, as: 'crate', count: 5 } },
        { id: 'despatch', label: 'Despatch', role: 'room', weight: 2, height: 5.0, seal: { chill_room: 'door' } },
      ] },
  ],
  links: [
    { from: 'drains', to: 'line', fromZone: 'drain_gallery', toZone: 'kill_floor', width: 2.4 },
    { from: 'drains', to: 'line', fromZone: 'rendering', toZone: 'despatch', width: 2.4, optional: true },
  ],
  spawn: 'lairage', objective: 'chill_room',
};

/**
 * A brickworks: a clay pit, and the kilns that ate it.
 *
 * The pit is below and open to the sky; the kilns are above and completely
 * closed. Same material, opposite spaces.
 */
const BRICKWORKS: SpatialConcept = {
  id: 'brickworks', name: 'Brickworks',
  thesis: 'A clay pit open to the sky under a row of kilns that have no openings at all, both of them made of the same material and neither able to see the other.',
  built: 'a brick and tile works', incident: 'a kiln was drawn early and the pit flooded the week after',
  verb: 'descend', contrast: ['open clay pit', 'sealed kilns'],
  grid: 1.8, size: [40, 28], wall: 0.32,
  bands: [
    { id: 'clay', z: -5.0, height: 6.0, roofed: false, purpose: 'the pit, and the tramway out of it',
      extent: [4, 3, 30, 20], zones: [
        { id: 'clay_pit', label: 'Clay Pit', role: 'site', weight: 4, height: 6.0,
          cover: { label: 'Spoil', height: 1.7, as: 'crate', count: 5 } },
        { id: 'tramway', label: 'Tramway', role: 'corridor', weight: 2, height: 3.0, seal: { clay_pit: 'arch' } },
      ] },
    { id: 'works_brick', z: 1.4, height: 6.0, purpose: 'the kilns and the drying sheds',
      extent: [6, 5, 26, 18], zones: [
        { id: 'yard_brick', label: 'Stock Yard', role: 'spawn', weight: 2, height: 6.0,
          cover: { label: 'Pallets', height: 1.3, as: 'crate', count: 4 } },
        { id: 'kiln_row', label: 'Kilns', role: 'lane', weight: 3, height: 6.0,
          cover: { label: 'Wickets', height: 1.5, as: 'crate', count: 4 } },
        { id: 'drying_shed', label: 'Drying Shed', role: 'room', weight: 3, height: 5.0, seal: { kiln_row: 'door' },
          cover: { label: 'Racks', height: 1.6, as: 'crate', count: 5 } },
      ] },
  ],
  links: [
    { from: 'clay', to: 'works_brick', fromZone: 'tramway', toZone: 'yard_brick', width: 2.6 },
    { from: 'clay', to: 'works_brick', fromZone: 'clay_pit', toZone: 'kiln_row', width: 2.6, optional: true },
  ],
  spawn: 'yard_brick', objective: 'clay_pit',
};

/**
 * A gasworks: a hole where the holder sat, and the retort house beside it.
 *
 * The map's biggest space is a circular pit with nothing in it, which is a
 * different kind of open ground from a yard: you are *in* it, not on it.
 */
const GASWORKS: SpatialConcept = {
  id: 'gasworks', name: 'Gasworks',
  thesis: 'A holder pit you are down inside rather than standing on, and a retort house beside it whose windows all look the wrong way.',
  built: 'a town gasworks', incident: 'the holder was cut up for scrap and the pit left open',
  verb: 'cross', contrast: ['open holder pit', 'closed retort house'],
  grid: 1.8, size: [42, 30], wall: 0.32,
  bands: [
    { id: 'pit_level', z: -4.6, height: 5.2, roofed: false, purpose: 'the bottom of the holder pit',
      extent: [4, 3, 30, 22], zones: [
        { id: 'holder_pit', label: 'Holder Pit', role: 'site', weight: 5, height: 5.2,
          cover: { label: 'Guides', height: 1.8, as: 'barrel', count: 5 } },
        { id: 'valve_house', label: 'Valve House', role: 'room', weight: 2, height: 3.4, seal: { holder_pit: 'door' } },
      ] },
    { id: 'ground_gas', z: 0.8, height: 6.6, purpose: 'the works, on the rim of the pit',
      extent: [6, 5, 28, 20], zones: [
        { id: 'coal_road', label: 'Coal Road', role: 'spawn', weight: 2, height: 6.6,
          cover: { label: 'Skips', height: 1.4, as: 'crate', count: 4 } },
        { id: 'retort_house', label: 'Retort House', role: 'room', weight: 4, height: 6.6, seal: { coal_road: 'door' },
          cover: { label: 'Retorts', height: 1.8, as: 'barrel', count: 5 } },
        { id: 'purifier', label: 'Purifiers', role: 'lane', weight: 3, height: 5.0,
          cover: { label: 'Boxes', height: 1.5, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'pit_level', to: 'ground_gas', fromZone: 'holder_pit', toZone: 'purifier', width: 2.6 },
    { from: 'pit_level', to: 'ground_gas', fromZone: 'valve_house', toZone: 'retort_house', width: 2.4, optional: true },
  ],
  spawn: 'coal_road', objective: 'holder_pit',
};

/**
 * A pumping station: a beautiful room over a hole in the ground.
 *
 * Victorian waterworks were built like temples, so the contrast is between
 * how the building presents itself and what it is actually doing.
 */
const WATERWORKS: SpatialConcept = {
  id: 'waterworks', name: 'Waterworks',
  thesis: 'An engine house built like a chapel, standing directly over a well shaft that goes down further than the building is tall.',
  built: 'a Victorian pumping station', incident: 'the beam was left on its stops and the sump has come up to the gallery',
  verb: 'descend', contrast: ['ornamented engine house', 'wet shaft'], routes: 1,
  grid: 1.7, size: [38, 28], wall: 0.32,
  bands: [
    { id: 'sump', z: -8.4, height: 4.0, purpose: 'the bottom of the shaft',
      extent: [8, 7, 20, 14], zones: [
        { id: 'well_bottom', label: 'Well Bottom', role: 'site', weight: 4, height: 4.0,
          cover: { label: 'Standpipes', height: 1.4, as: 'barrel', count: 4 } },
        { id: 'adit_water', label: 'Adit', role: 'corridor', weight: 2, height: 2.8, seal: { well_bottom: 'door' } },
      ] },
    { id: 'gallery_water', z: -4.0, height: 3.6, purpose: 'the working gallery halfway down',
      extent: [6, 5, 24, 18], zones: [
        { id: 'pump_gallery_w', label: 'Pump Gallery', role: 'lane', weight: 4, height: 3.6,
          cover: { label: 'Glands', height: 1.2, as: 'barrel', count: 4 } },
        { id: 'coal_cellar', label: 'Coal Cellar', role: 'room', weight: 2, height: 3.4, seal: { pump_gallery_w: 'door' } },
      ] },
    { id: 'engine_house', z: 0, height: 8.0, purpose: 'the room with the arches in it',
      extent: [4, 3, 28, 20], zones: [
        { id: 'engine_entry', label: 'Entrance', role: 'spawn', weight: 2, height: 6.0 },
        { id: 'beam_floor', label: 'Beam Floor', role: 'room', weight: 4, height: 8.0,
          cover: { label: 'Flywheels', height: 1.9, as: 'barrel', count: 4 } },
      ] },
  ],
  links: [
    { from: 'gallery_water', to: 'engine_house', fromZone: 'pump_gallery_w', toZone: 'beam_floor', width: 2.6 },
    { from: 'sump', to: 'gallery_water', fromZone: 'well_bottom', toZone: 'pump_gallery_w', width: 2.6 },
    { from: 'sump', to: 'gallery_water', fromZone: 'adit_water', toZone: 'coal_cellar', width: 2.4, optional: true },
  ],
  spawn: 'engine_entry', objective: 'well_bottom',
};

/**
 * A tram depot: one roof over a fan of tracks, and a pit under each of them.
 *
 * Long parallel lanes with a pit level that crosses all of them, so above you
 * can only go along and below you can only go across.
 */
const DEPOT: SpatialConcept = {
  id: 'depot', name: 'Tram Depot',
  thesis: 'A fan of parallel roads under one roof with a pit level running across all of them, so upstairs you can only travel along and downstairs only across.',
  built: 'a tram depot', incident: 'the fleet was withdrawn overnight and half of it is still in the shed',
  verb: 'thread', contrast: ['parallel roads', 'the cross pit'],
  grid: 1.7, size: [42, 28], wall: 0.3,
  bands: [
    { id: 'pit_level_tram', z: -3.2, height: 2.8, purpose: 'the pit, which runs the wrong way on purpose',
      extent: [6, 5, 28, 16], zones: [
        { id: 'cross_pit', label: 'Cross Pit', role: 'corridor', weight: 4, height: 2.6,
          cover: { label: 'Trestles', height: 1.0, as: 'barrel', count: 4 } },
        { id: 'wheel_shop', label: 'Wheel Shop', role: 'room', weight: 2, height: 2.8, seal: { cross_pit: 'door' } },
      ] },
    { id: 'shed_floor', z: 0, height: 6.2, purpose: 'the roads, side by side under one roof',
      extent: [4, 3, 34, 22], zones: [
        { id: 'depot_gate', label: 'Depot Gate', role: 'spawn', weight: 2, height: 6.2 },
        { id: 'road_one', label: 'Road One', role: 'lane', weight: 3, height: 6.2,
          cover: { label: 'Cars', height: 1.8, as: 'vehicle', count: 3 } },
        { id: 'road_two', label: 'Road Two', role: 'lane', weight: 3, height: 6.2,
          cover: { label: 'Cars', height: 1.8, as: 'vehicle', count: 3 } },
        { id: 'paint_shop', label: 'Paint Shop', role: 'site', weight: 3, height: 6.2, seal: { road_two: 'door' },
          cover: { label: 'Drums', height: 1.2, as: 'barrel', count: 4 } },
      ] },
  ],
  links: [
    { from: 'pit_level_tram', to: 'shed_floor', fromZone: 'cross_pit', toZone: 'road_one', width: 2.6 },
    { from: 'pit_level_tram', to: 'shed_floor', fromZone: 'wheel_shop', toZone: 'paint_shop', width: 2.4, optional: true },
  ],
  spawn: 'depot_gate', objective: 'paint_shop',
};

/**
 * A container yard: a maze whose walls are movable and happen to be here.
 *
 * The only concept whose cover *is* the architecture. There is nothing else
 * on the site at all, which makes the reefer shed the one room in it.
 */
const CONTAINERS: SpatialConcept = {
  id: 'containers', name: 'Container Yard',
  thesis: 'A site with no buildings on it, where every wall is a box that happens to be standing there, and the one room is a shed full of humming refrigerated units.',
  built: 'an inland container terminal', incident: 'the stack plan was lost with the yard system and nothing has moved since',
  verb: 'thread', contrast: ['stacked boxes', 'the one lit shed'],
  grid: 1.8, size: [44, 28], wall: 0.3,
  bands: [
    { id: 'yard_c', z: 0, height: 6.0, roofed: false, purpose: 'the yard, and everything standing on it',
      extent: [4, 3, 36, 22], zones: [
        { id: 'gate_lane', label: 'Gate Lane', role: 'spawn', weight: 2, height: 6.0,
          cover: { label: 'Boxes', height: 2.4, as: 'crate', count: 4 } },
        { id: 'stack_a', label: 'A Stack', role: 'lane', weight: 3, height: 6.0,
          cover: { label: 'Boxes', height: 2.6, as: 'crate', count: 6 } },
        { id: 'straddle_lane', label: 'Straddle Lane', role: 'site', weight: 3, height: 6.0 },
        { id: 'reefer_shed', label: 'Reefer Shed', role: 'room', weight: 2, height: 5.0, seal: { straddle_lane: 'door' },
          cover: { label: 'Units', height: 1.6, as: 'barrel', count: 4 } },
      ] },
    { id: 'walkway_c', z: 6.4, height: 3.0, purpose: 'the inspection walkway over the stacks',
      extent: [7, 6, 28, 16], zones: [
        { id: 'stack_walk', label: 'Stack Walk', role: 'balcony', weight: 4, height: 2.8 },
        { id: 'yard_office', label: 'Yard Office', role: 'room', weight: 2, height: 2.8, seal: { stack_walk: 'door' } },
      ] },
  ],
  links: [
    { from: 'yard_c', to: 'walkway_c', fromZone: 'straddle_lane', toZone: 'stack_walk', width: 2.6 },
    { from: 'yard_c', to: 'walkway_c', fromZone: 'reefer_shed', toZone: 'yard_office', width: 2.4, optional: true },
  ],
  spawn: 'gate_lane', objective: 'straddle_lane',
};

/**
 * A funicular: two stations and the slope between them.
 *
 * The bands are stacked but do not overlap in plan, so the map is long and
 * diagonal rather than tall — and the only route between the ends is the one
 * the track takes.
 */
const FUNICULAR: SpatialConcept = {
  id: 'funicular', name: 'Funicular',
  thesis: 'A bottom station, a top station, and a slope between them with one track on it, so the whole map is a diagonal and there is one way along it.',
  built: 'a hillside funicular railway', incident: 'the haulage rope parted and the upper car is still where it stopped',
  verb: 'climb', contrast: ['machine room', 'open slope'], routes: 1,
  grid: 1.8, size: [44, 26], wall: 0.3,
  bands: [
    { id: 'lower_station', z: 0, height: 5.4, purpose: 'the bottom station and its machine room',
      extent: [4, 3, 24, 20], zones: [
        { id: 'booking', label: 'Booking Hall', role: 'spawn', weight: 3, height: 5.4 },
        { id: 'lower_platform', label: 'Lower Platform', role: 'lane', weight: 3, height: 5.4,
          cover: { label: 'Barriers', height: 1.0, as: 'crate', count: 3 } },
        { id: 'winding', label: 'Winding Room', role: 'room', weight: 2, height: 4.4, seal: { lower_platform: 'door' },
          cover: { label: 'Drums', height: 1.6, as: 'barrel', count: 3 } },
      ] },
    { id: 'upper_station', z: 5.8, height: 4.6, purpose: 'the top station, and the view back down',
      extent: [15, 4, 24, 18], zones: [
        { id: 'upper_platform', label: 'Upper Platform', role: 'site', weight: 4, height: 4.6,
          cover: { label: 'Shelters', height: 1.4, as: 'crate', count: 3 } },
        { id: 'summit_cafe', label: 'Summit Room', role: 'room', weight: 2, height: 4.0, seal: { upper_platform: 'door' } },
      ] },
  ],
  links: [
    { from: 'lower_station', to: 'upper_station', fromZone: 'lower_platform', toZone: 'upper_platform', width: 2.8 },
    { from: 'lower_station', to: 'upper_station', fromZone: 'winding', toZone: 'summit_cafe', width: 2.4, optional: true },
  ],
  spawn: 'booking', objective: 'upper_platform',
};

/**
 * A canal lock: two levels of water and the chamber between them.
 *
 * The bands are the water levels, and the drop between them is small — four
 * metres — which makes this the flattest section in the set and the one where
 * height is a tactical detail rather than a journey.
 */
const LOCK: SpatialConcept = {
  id: 'lock', name: 'Lock',
  thesis: 'Two canal levels four metres apart and a chamber joining them, where the height difference is small enough to shoot across and large enough to matter.',
  built: 'a staircase lock and its keeper cottages', incident: 'the upper gates were left open and the pound has drained',
  verb: 'cross', contrast: ['upper pound', 'drained chamber'],
  grid: 1.7, size: [44, 26], wall: 0.28,
  bands: [
    { id: 'lower_pound', z: -4.0, height: 4.2, roofed: false, purpose: 'the lower level and the chamber floor',
      extent: [4, 3, 34, 18], zones: [
        { id: 'chamber_floor_lock', label: 'Lock Chamber', role: 'site', weight: 4, height: 4.2,
          cover: { label: 'Baulks', height: 1.2, as: 'crate', count: 5 } },
        { id: 'culvert_lock', label: 'Culvert', role: 'corridor', weight: 2, height: 2.6, seal: { chamber_floor_lock: 'door' } },
      ] },
    { id: 'upper_pound', z: 0.4, height: 5.0, purpose: 'the towpath level and everything on it',
      extent: [4, 3, 36, 20], zones: [
        { id: 'towpath', label: 'Towpath', role: 'spawn', weight: 3, height: 5.0,
          cover: { label: 'Bollards', height: 1.0, as: 'crate', count: 4 } },
        { id: 'lock_house', label: 'Lock House', role: 'room', weight: 2, height: 4.4, seal: { towpath: 'door' } },
        { id: 'wharf', label: 'Wharf', role: 'lane', weight: 3, height: 5.0,
          cover: { label: 'Crates', height: 1.3, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'lower_pound', to: 'upper_pound', fromZone: 'chamber_floor_lock', toZone: 'wharf', width: 2.6 },
    { from: 'lower_pound', to: 'upper_pound', fromZone: 'culvert_lock', toZone: 'lock_house', width: 2.4, optional: true },
  ],
  spawn: 'towpath', objective: 'chamber_floor_lock',
};

/**
 * A fuel wharf: tanks you must not shoot, and a pipe gallery under them.
 *
 * Almost all the ground-level volume is occupied by things that are not
 * buildings and cannot be entered, so the walkable part is a network of
 * narrow lanes between very large cylinders.
 */
const BUNKERING: SpatialConcept = {
  id: 'bunkering', name: 'Bunkering Wharf',
  thesis: 'Lanes between tanks nobody would want to shoot, a jetty at the end of them, and a pipe gallery underneath that goes where the lanes do not.',
  built: 'a marine fuel terminal', incident: 'a transfer was stopped part way and the bund is half full',
  verb: 'cross', contrast: ['open tank farm', 'pipe gallery'],
  grid: 1.8, size: [44, 28], wall: 0.32,
  bands: [
    { id: 'gallery_fuel', z: -3.8, height: 3.0, purpose: 'the pipe gallery, which takes the short way',
      extent: [5, 4, 32, 18], zones: [
        { id: 'pipe_gallery_f', label: 'Pipe Gallery', role: 'corridor', weight: 4, height: 2.7,
          cover: { label: 'Manifolds', height: 1.2, as: 'barrel', count: 5 } },
        { id: 'foam_house', label: 'Foam House', role: 'room', weight: 2, height: 3.0, seal: { pipe_gallery_f: 'door' } },
      ] },
    { id: 'tank_farm', z: 0, height: 8.0, purpose: 'the tanks, the bund and the jetty',
      extent: [4, 3, 36, 22], zones: [
        { id: 'gate_fuel', label: 'Gate', role: 'spawn', weight: 2, height: 6.0 },
        { id: 'bund', label: 'Bund', role: 'lane', weight: 4, height: 8.0,
          cover: { label: 'Tanks', height: 2.4, as: 'barrel', count: 6 } },
        { id: 'jetty', label: 'Jetty', role: 'site', weight: 3, height: 8.0,
          cover: { label: 'Loading Arms', height: 1.9, as: 'barrel', count: 4 } },
      ] },
  ],
  links: [
    { from: 'gallery_fuel', to: 'tank_farm', fromZone: 'pipe_gallery_f', toZone: 'bund', width: 2.6 },
    { from: 'gallery_fuel', to: 'tank_farm', fromZone: 'foam_house', toZone: 'jetty', width: 2.4, optional: true },
  ],
  spawn: 'gate_fuel', objective: 'jetty',
};


/**
 * A wind tunnel: a loop you cannot leave and a room that watches it.
 *
 * The circuit is a closed ring, so the map has no dead ends and no way to
 * break contact except by outrunning somebody round it.
 */
const TUNNEL: SpatialConcept = {
  id: 'tunnel', name: 'Wind Tunnel',
  thesis: 'A closed circuit with no dead ends anywhere in it, so the only way to break contact is to be faster than whoever is following you round.',
  built: 'a closed-circuit wind tunnel', incident: 'the fan was run down and the test section left open at both ends',
  verb: 'orbit', contrast: ['sealed circuit', 'the room that watches it'],
  grid: 1.7, size: [40, 28], wall: 0.3,
  bands: [
    { id: 'plenum', z: -3.6, height: 3.0, purpose: 'the return leg, under the floor',
      extent: [5, 4, 28, 18], zones: [
        { id: 'return_leg', label: 'Return Leg', role: 'corridor', weight: 4, height: 2.8 },
        { id: 'fan_house', label: 'Fan House', role: 'room', weight: 2, height: 3.0, seal: { return_leg: 'door' },
          cover: { label: 'Blades', height: 1.6, as: 'barrel', count: 3 } },
      ] },
    { id: 'circuit', z: 0, height: 5.6, purpose: 'the working section and the control room beside it',
      extent: [4, 3, 32, 22], zones: [
        { id: 'model_shop', label: 'Model Shop', role: 'spawn', weight: 2, height: 5.0 },
        { id: 'contraction', label: 'Contraction', role: 'lane', weight: 3, height: 5.6,
          cover: { label: 'Vanes', height: 1.3, as: 'crate', count: 4 } },
        { id: 'test_section', label: 'Test Section', role: 'site', weight: 3, height: 5.6,
          cover: { label: 'Stings', height: 1.2, as: 'barrel', count: 3 } },
        { id: 'control_tunnel', label: 'Control', role: 'room', weight: 2, height: 4.2, seal: { test_section: 'door' } },
      ] },
  ],
  links: [
    { from: 'plenum', to: 'circuit', fromZone: 'return_leg', toZone: 'contraction', width: 2.6 },
    { from: 'plenum', to: 'circuit', fromZone: 'fan_house', toZone: 'control_tunnel', width: 2.4, optional: true },
  ],
  spawn: 'model_shop', objective: 'test_section',
};

/**
 * A blockhouse over a command level, which is the whole of a bunker.
 *
 * Everything visible is a wall with a slit in it; everything that matters is
 * under it, and the only way down is through a door built to be shut.
 */
const BLOCKHOUSE: SpatialConcept = {
  id: 'blockhouse', name: 'Blockhouse',
  thesis: 'Everything you can see is a wall with a slit in it, everything that matters is underneath, and the way between them is a door built to be shut.',
  built: 'a hardened command post', incident: 'the site was decommissioned and the blast door was jacked open for the scrap men',
  verb: 'infiltrate', contrast: ['blank concrete outside', 'lit command floor'], routes: 1,
  grid: 1.7, size: [40, 28], wall: 0.4,
  bands: [
    { id: 'command', z: -5.2, height: 3.6, purpose: 'the level the building exists to protect',
      extent: [6, 5, 26, 18], zones: [
        { id: 'ops_room', label: 'Operations', role: 'site', weight: 4, height: 3.6,
          cover: { label: 'Plotting Table', height: 1.1, as: 'crate', count: 4 } },
        { id: 'comms_room', label: 'Comms', role: 'room', weight: 2, height: 3.4, seal: { ops_room: 'door' } },
        { id: 'blast_lobby', label: 'Blast Lobby', role: 'corridor', weight: 2, height: 3.0, seal: { ops_room: 'door' } },
      ] },
    { id: 'surface_block', z: 0, height: 4.0, purpose: 'the blockhouse and the ground round it',
      extent: [4, 3, 32, 22], zones: [
        { id: 'approach', label: 'Approach', role: 'spawn', weight: 3, height: 4.0,
          cover: { label: 'Blocks', height: 1.2, as: 'crate', count: 4 } },
        { id: 'guardroom', label: 'Guardroom', role: 'room', weight: 2, height: 3.4, seal: { approach: 'door' } },
        { id: 'aerial_field', label: 'Aerial Field', role: 'lane', weight: 3, height: 4.0,
          cover: { label: 'Bases', height: 1.0, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'command', to: 'surface_block', fromZone: 'blast_lobby', toZone: 'guardroom', width: 2.4 },
    { from: 'command', to: 'surface_block', fromZone: 'ops_room', toZone: 'aerial_field', width: 2.6, optional: true },
  ],
  spawn: 'approach', objective: 'ops_room',
};

/**
 * A silo: a tube, and a building that is only its lid.
 *
 * The most extreme aspect ratio in the set. Almost everything is one very
 * deep vertical space and the map is about getting down the side of it.
 */
const SILO: SpatialConcept = {
  id: 'silo', name: 'Silo',
  thesis: 'One tube going down further than anything else in this library, and a building on top of it that is only its lid.',
  built: 'a hardened missile silo', incident: 'the site was drawn down for disposal and the crew lift was left at the bottom',
  verb: 'descend', contrast: ['flat headworks', 'the tube'], routes: 1,
  grid: 1.6, size: [36, 26], wall: 0.4,
  bands: [
    { id: 'silo_floor', z: -10.4, height: 4.2, purpose: 'the bottom of the tube',
      extent: [8, 6, 18, 14], zones: [
        { id: 'launch_floor', label: 'Launch Floor', role: 'site', weight: 4, height: 4.2,
          cover: { label: 'Mounts', height: 1.7, as: 'barrel', count: 4 } },
        { id: 'cable_way_silo', label: 'Cable Way', role: 'corridor', weight: 2, height: 2.8, seal: { launch_floor: 'door' } },
      ] },
    { id: 'crew_level', z: -5.6, height: 4.0, purpose: 'the crew capsule, halfway down',
      extent: [6, 5, 22, 16], zones: [
        { id: 'capsule', label: 'Capsule', role: 'room', weight: 3, height: 3.6,
          cover: { label: 'Consoles', height: 1.2, as: 'crate', count: 3 } },
        { id: 'tunnel_junction', label: 'Junction', role: 'lane', weight: 3, height: 4.0, seal: { capsule: 'door' } },
      ] },
    { id: 'headworks', z: 0, height: 4.4, purpose: 'the flat part, and there is not much of it',
      extent: [5, 4, 24, 18], zones: [
        { id: 'hardstand', label: 'Hardstand', role: 'spawn', weight: 3, height: 4.4,
          cover: { label: 'Covers', height: 1.0, as: 'crate', count: 3 } },
        { id: 'access_house', label: 'Access House', role: 'room', weight: 2, height: 3.6, seal: { hardstand: 'door' } },
      ] },
  ],
  links: [
    { from: 'crew_level', to: 'headworks', fromZone: 'tunnel_junction', toZone: 'hardstand', width: 2.4 },
    { from: 'silo_floor', to: 'crew_level', fromZone: 'launch_floor', toZone: 'tunnel_junction', width: 2.4 },
    { from: 'silo_floor', to: 'crew_level', fromZone: 'cable_way_silo', toZone: 'capsule', width: 2.4, optional: true },
  ],
  spawn: 'hardstand', objective: 'launch_floor',
};

/**
 * A radar station: a hall of machines under a head that turns.
 *
 * The upper band is tiny and the lower one is not, so the climb is a reward
 * for having crossed the hall rather than a route through it.
 */
const RADAR: SpatialConcept = {
  id: 'radar', name: 'Radar Station',
  thesis: 'A generator hall the size of the site with a turning head on top of it barely big enough for two people, so getting up there is a reward for crossing rather than a way across.',
  built: 'a long-range radar station', incident: 'the head was left rotating on standby power and the hall below has been dark for a month',
  verb: 'climb', contrast: ['machine hall', 'the head'],
  grid: 1.7, size: [38, 28], wall: 0.32,
  bands: [
    { id: 'machine_hall', z: 0, height: 6.0, purpose: 'the hall, and everything that feeds the head',
      extent: [4, 3, 30, 22], zones: [
        { id: 'guard_post', label: 'Guard Post', role: 'spawn', weight: 2, height: 5.0 },
        { id: 'generator_hall', label: 'Generator Hall', role: 'lane', weight: 4, height: 6.0,
          cover: { label: 'Sets', height: 1.8, as: 'barrel', count: 5 } },
        { id: 'ops_radar', label: 'Operations', role: 'room', weight: 3, height: 4.4, seal: { generator_hall: 'door' },
          cover: { label: 'Consoles', height: 1.2, as: 'crate', count: 4 } },
      ] },
    { id: 'head', z: 6.4, height: 3.4, purpose: 'the turning head, and one walkway round it',
      extent: [10, 8, 18, 14], zones: [
        { id: 'turning_gear', label: 'Turning Gear', role: 'site', weight: 3, height: 3.4,
          cover: { label: 'Gearbox', height: 1.6, as: 'barrel', count: 3 } },
        { id: 'head_walk', label: 'Head Walk', role: 'balcony', weight: 3, height: 3.0 },
      ] },
  ],
  links: [
    { from: 'machine_hall', to: 'head', fromZone: 'generator_hall', toZone: 'head_walk', width: 2.6 },
    { from: 'machine_hall', to: 'head', fromZone: 'ops_radar', toZone: 'turning_gear', width: 2.4, optional: true },
  ],
  spawn: 'guard_post', objective: 'turning_gear',
};

/**
 * Barracks: identical blocks round a square, joined underground.
 *
 * The square is the obvious route and the worst one; the tunnel joins the
 * blocks and nobody on the square can see who is in it.
 */
const BARRACKS: SpatialConcept = {
  id: 'barracks', name: 'Barracks',
  thesis: 'Four identical blocks round a parade square, joined by a tunnel that nobody standing on the square can see anybody using.',
  built: 'a garrison barracks', incident: 'the unit moved out at short notice and the accommodation was left standing',
  verb: 'cross', contrast: ['open square', 'connecting tunnel'],
  grid: 1.7, size: [42, 30], wall: 0.28,
  bands: [
    { id: 'tunnel_barracks', z: -3.6, height: 3.0, purpose: 'the tunnel between the blocks',
      extent: [6, 5, 28, 20], zones: [
        { id: 'link_tunnel', label: 'Link Tunnel', role: 'corridor', weight: 4, height: 2.7 },
        { id: 'armoury', label: 'Armoury', role: 'room', weight: 2, height: 3.0, seal: { link_tunnel: 'door' },
          cover: { label: 'Racks', height: 1.5, as: 'crate', count: 4 } },
      ] },
    { id: 'square', z: 0, height: 5.4, purpose: 'the square and the blocks round it',
      extent: [4, 3, 34, 24], zones: [
        { id: 'guardhouse', label: 'Guardhouse', role: 'spawn', weight: 2, height: 4.4 },
        { id: 'block_a', label: 'A Block', role: 'room', weight: 3, height: 5.4,
          cover: { label: 'Bunks', height: 1.1, as: 'crate', count: 5 } },
        { id: 'parade', label: 'Parade Square', role: 'site', weight: 4, height: 5.4 },
        { id: 'block_b', label: 'B Block', role: 'room', weight: 3, height: 5.4, seal: { parade: 'door' },
          cover: { label: 'Bunks', height: 1.1, as: 'crate', count: 5 } },
      ] },
  ],
  links: [
    { from: 'tunnel_barracks', to: 'square', fromZone: 'link_tunnel', toZone: 'block_a', width: 2.4 },
    { from: 'tunnel_barracks', to: 'square', fromZone: 'armoury', toZone: 'block_b', width: 2.4, optional: true },
  ],
  spawn: 'guardhouse', objective: 'parade',
};

/**
 * A mountain station: a small room on top of a large machine.
 *
 * The passenger half is a hut; the machine half is three times its size and
 * directly underneath, which nobody arriving would ever guess.
 */
const CABLE_TOP: SpatialConcept = {
  id: 'cabletop', name: 'Top Station',
  thesis: 'A hut with a view, standing on a machine room three times its size that nobody arriving would ever guess was there.',
  built: 'the upper station of an aerial cableway', incident: 'the line was stopped with cars on the span and the crew walked down',
  verb: 'emerge', contrast: ['small hut', 'large machine'],
  grid: 1.7, size: [38, 26], wall: 0.3,
  bands: [
    { id: 'machine_below', z: -4.6, height: 4.0, purpose: 'the machinery, and all of the building',
      extent: [5, 4, 26, 16], zones: [
        { id: 'bull_wheel', label: 'Bull Wheel', role: 'site', weight: 4, height: 4.0,
          cover: { label: 'Sheaves', height: 1.6, as: 'barrel', count: 4 } },
        { id: 'tension_room', label: 'Tension Room', role: 'room', weight: 2, height: 3.6, seal: { bull_wheel: 'door' },
          cover: { label: 'Counterweights', height: 1.7, as: 'barrel', count: 3 } },
      ] },
    { id: 'station_top', z: 0, height: 5.0, purpose: 'the platform and the hut, which is all anybody sees',
      extent: [4, 3, 28, 18], zones: [
        { id: 'arrival', label: 'Arrival', role: 'spawn', weight: 3, height: 5.0,
          cover: { label: 'Barriers', height: 1.0, as: 'crate', count: 3 } },
        { id: 'terrace_top', label: 'Terrace', role: 'lane', weight: 3, height: 5.0 },
        { id: 'shelter', label: 'Shelter', role: 'room', weight: 2, height: 4.0, seal: { terrace_top: 'door' } },
      ] },
  ],
  links: [
    { from: 'machine_below', to: 'station_top', fromZone: 'bull_wheel', toZone: 'terrace_top', width: 2.6 },
    { from: 'machine_below', to: 'station_top', fromZone: 'tension_room', toZone: 'shelter', width: 2.4, optional: true },
  ],
  spawn: 'arrival', objective: 'bull_wheel',
};

/**
 * Growing decks stacked under lamps, with the water underneath.
 *
 * Repetitive like the stacks, but every floor is the same *because it has to
 * be* — and the interesting level is the one keeping the others alive.
 */
const GROWHOUSE: SpatialConcept = {
  id: 'growhouse', name: 'Growhouse',
  thesis: 'Two floors of growing decks that are identical because they have to be, over the one room that keeps both of them alive.',
  built: 'a vertical farm', incident: 'the lamps are still on their cycle and nobody has topped up the tanks in a fortnight',
  verb: 'climb', contrast: ['lit growing decks', 'nutrient basement'],
  grid: 1.6, size: [38, 28], wall: 0.26,
  bands: [
    { id: 'nutrient', z: -3.8, height: 3.2, purpose: 'tanks, dosing and pipework',
      extent: [5, 4, 28, 18], zones: [
        { id: 'tank_room', label: 'Tank Room', role: 'site', weight: 4, height: 3.2,
          cover: { label: 'Tanks', height: 1.5, as: 'barrel', count: 5 } },
        { id: 'dosing', label: 'Dosing', role: 'room', weight: 2, height: 3.0, seal: { tank_room: 'door' } },
      ] },
    { id: 'deck_one', z: 0, height: 4.0, purpose: 'the first growing floor',
      extent: [4, 3, 30, 22], zones: [
        { id: 'grow_entry', label: 'Airlock', role: 'spawn', weight: 2, height: 4.0 },
        { id: 'racks_one', label: 'Growing Deck', role: 'lane', weight: 5, height: 4.0,
          cover: { label: 'Trays', height: 1.6, as: 'crate', count: 6 } },
      ] },
    { id: 'deck_two', z: 4.4, height: 3.8, purpose: 'the second, which is the first with better light',
      extent: [6, 5, 26, 18], zones: [
        { id: 'racks_two', label: 'Growing Deck', role: 'room', weight: 5, height: 3.8,
          cover: { label: 'Trays', height: 1.6, as: 'crate', count: 6 } },
        { id: 'packhouse', label: 'Packhouse', role: 'room', weight: 2, height: 3.8, seal: { racks_two: 'door' } },
      ] },
  ],
  links: [
    { from: 'deck_one', to: 'deck_two', fromZone: 'racks_one', toZone: 'racks_two', width: 2.4 },
    { from: 'nutrient', to: 'deck_one', fromZone: 'tank_room', toZone: 'racks_one', width: 2.4 },
    { from: 'nutrient', to: 'deck_one', fromZone: 'dosing', toZone: 'grow_entry', width: 2.4, optional: true },
  ],
  spawn: 'grow_entry', objective: 'tank_room',
};

/**
 * A data hall: aisles, a plant deck above, and batteries below.
 *
 * The aisles are a grid of identical corridors — the tightest sightlines in
 * the library — and both other bands exist only to keep them running.
 */
const DATAHALL: SpatialConcept = {
  id: 'datahall', name: 'Data Hall',
  thesis: 'Aisles between cabinets that are all exactly the same width, with a plant deck above and a battery hall below whose only purpose is to keep them running.',
  built: 'a colocation data centre', incident: 'the hall failed over to batteries and nobody came to reset it',
  verb: 'thread', contrast: ['identical aisles', 'the plant that feeds them'],
  grid: 1.6, size: [40, 28], wall: 0.26,
  bands: [
    { id: 'battery', z: -3.8, height: 3.2, purpose: 'batteries, switchgear and no reason to be there',
      extent: [5, 4, 30, 18], zones: [
        { id: 'battery_hall', label: 'Battery Hall', role: 'room', weight: 4, height: 3.2,
          cover: { label: 'Strings', height: 1.5, as: 'crate', count: 5 } },
        { id: 'switch_room', label: 'Switch Room', role: 'corridor', weight: 2, height: 3.0, seal: { battery_hall: 'door' } },
      ] },
    { id: 'halls', z: 0, height: 4.4, purpose: 'the aisles themselves',
      extent: [4, 3, 32, 22], zones: [
        { id: 'meet_me', label: 'Meet-me Room', role: 'spawn', weight: 2, height: 4.4 },
        { id: 'cold_aisle', label: 'Cold Aisle', role: 'lane', weight: 4, height: 4.4,
          cover: { label: 'Cabinets', height: 1.9, as: 'crate', count: 6 } },
        { id: 'hot_aisle', label: 'Hot Aisle', role: 'site', weight: 4, height: 4.4, seal: { cold_aisle: 'door' },
          cover: { label: 'Cabinets', height: 1.9, as: 'crate', count: 6 } },
      ] },
    { id: 'plant_deck_dc', z: 4.8, height: 3.4, purpose: 'the air handling, over all of it',
      extent: [7, 6, 26, 16], zones: [
        { id: 'ahu_deck', label: 'AHU Deck', role: 'balcony', weight: 4, height: 3.2,
          cover: { label: 'Handlers', height: 1.7, as: 'barrel', count: 4 } },
        { id: 'chiller_room', label: 'Chillers', role: 'room', weight: 2, height: 3.2, seal: { ahu_deck: 'door' } },
      ] },
  ],
  links: [
    { from: 'halls', to: 'plant_deck_dc', fromZone: 'cold_aisle', toZone: 'ahu_deck', width: 2.4 },
    { from: 'battery', to: 'halls', fromZone: 'battery_hall', toZone: 'hot_aisle', width: 2.4 },
    { from: 'battery', to: 'halls', fromZone: 'switch_room', toZone: 'meet_me', width: 2.4, optional: true },
  ],
  spawn: 'meet_me', objective: 'hot_aisle',
};

/**
 * Studios in a row with a control gallery running behind all of them.
 *
 * Every room on the ground band is sealed from every other; the only thing
 * joining them is the gallery, which sees into each and is in none.
 */
const BROADCAST: SpatialConcept = {
  id: 'broadcast', name: 'Broadcast House',
  thesis: 'Studios that are sealed from one another and from everything else, joined only by a gallery that looks into all of them and is inside none of them.',
  built: 'a broadcast centre', incident: 'the transmission chain was left up with the studios dark',
  verb: 'orbit', contrast: ['sealed studios', 'the gallery behind them'],
  grid: 1.6, size: [40, 28], wall: 0.28,
  bands: [
    { id: 'studios', z: 0, height: 5.6, purpose: 'the studios, and a foyer nobody would call generous',
      extent: [4, 3, 32, 22], zones: [
        { id: 'foyer_bc', label: 'Foyer', role: 'spawn', weight: 2, height: 4.4 },
        { id: 'studio_one', label: 'Studio One', role: 'site', weight: 4, height: 5.6, seal: { foyer_bc: 'door' },
          cover: { label: 'Flats', height: 1.7, as: 'crate', count: 5 } },
        { id: 'studio_two', label: 'Studio Two', role: 'room', weight: 3, height: 5.6, seal: { studio_one: 'door' },
          cover: { label: 'Flats', height: 1.7, as: 'crate', count: 4 } },
        { id: 'scene_dock', label: 'Scene Dock', role: 'lane', weight: 2, height: 5.6,
          cover: { label: 'Trucks', height: 1.4, as: 'crate', count: 4 } },
      ] },
    { id: 'galleries_bc', z: 6.0, height: 3.2, purpose: 'the control gallery, behind the glass',
      extent: [7, 6, 26, 16], zones: [
        { id: 'control_gallery', label: 'Control Gallery', role: 'balcony', weight: 4, height: 3.0 },
        { id: 'apparatus_bc', label: 'Apparatus Room', role: 'room', weight: 2, height: 3.0, seal: { control_gallery: 'door' } },
      ] },
  ],
  links: [
    { from: 'studios', to: 'galleries_bc', fromZone: 'scene_dock', toZone: 'control_gallery', width: 2.4 },
    { from: 'studios', to: 'galleries_bc', fromZone: 'studio_two', toZone: 'apparatus_bc', width: 2.4, optional: true },
  ],
  spawn: 'foyer_bc', objective: 'studio_one',
};

/**
 * A pier: a building on legs, with the sea under it.
 *
 * The underdeck is the whole map's secret — a level with no walls at all, only
 * columns, which is the opposite of every other lower band here.
 */
const PIER: SpatialConcept = {
  id: 'pier', name: 'Pier',
  thesis: 'A pavilion on legs with a level underneath that has no walls at all, only columns, so the way that cannot be seen is also the way with nothing to hide behind.',
  built: 'a pleasure pier', incident: 'the season ended and the storm boards went up over everything except the far end',
  verb: 'cross', contrast: ['lit pavilion', 'open underdeck'],
  grid: 1.7, size: [44, 26], wall: 0.26,
  bands: [
    { id: 'underdeck', z: -3.6, height: 3.2, purpose: 'columns and cross bracing, and nothing else',
      extent: [5, 4, 34, 16], zones: [
        { id: 'pile_field', label: 'Pile Field', role: 'lane', weight: 4, height: 3.2,
          cover: { label: 'Bracing', height: 1.3, as: 'barrel', count: 6 } },
        { id: 'plant_pier', label: 'Pier Plant', role: 'room', weight: 2, height: 3.0, seal: { pile_field: 'door' } },
      ] },
    { id: 'deck_pier', z: 0, height: 5.6, purpose: 'the promenade and the pavilion at the end of it',
      extent: [4, 3, 36, 20], zones: [
        { id: 'shore_end', label: 'Shore End', role: 'spawn', weight: 2, height: 5.6 },
        { id: 'promenade_pier', label: 'Promenade', role: 'lane', weight: 4, height: 5.6,
          cover: { label: 'Kiosks', height: 1.4, as: 'crate', count: 5 } },
        { id: 'pavilion', label: 'Pavilion', role: 'site', weight: 3, height: 5.6, seal: { promenade_pier: 'door' },
          cover: { label: 'Chairs', height: 1.0, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'underdeck', to: 'deck_pier', fromZone: 'pile_field', toZone: 'promenade_pier', width: 2.4 },
    { from: 'underdeck', to: 'deck_pier', fromZone: 'plant_pier', toZone: 'pavilion', width: 2.4, optional: true },
  ],
  spawn: 'shore_end', objective: 'pavilion',
};

/**
 * A terraced farm: growing decks cut into a hillside.
 *
 * Like the quarry, the bands step outward going down — but they are gardens
 * rather than rock, so every level has cover on it and none of them has walls.
 */
const TERRACES: SpatialConcept = {
  id: 'terraces', name: 'Terraces',
  thesis: 'Growing terraces cut into a hillside, each one wider than the one above it, all of them full of cover and none of them walled.',
  built: 'a terraced hill farm and its irrigation works', incident: 'the channels were shut off at the top and the lower terraces are still wet',
  verb: 'descend', contrast: ['open terraces', 'the channel gallery'],
  // One path down a hillside. There is never a second one.
  routes: 1,
  grid: 1.8, size: [42, 30], wall: 0.28,
  bands: [
    { id: 'lower_terrace', z: -5.2, height: 5.0, roofed: false, purpose: 'the bottom terrace, and the widest',
      extent: [4, 3, 34, 24], zones: [
        { id: 'paddy', label: 'Lower Terrace', role: 'site', weight: 5, height: 5.0,
          cover: { label: 'Bunds', height: 1.2, as: 'crate', count: 6 } },
        { id: 'channel_gallery', label: 'Channel Gallery', role: 'corridor', weight: 2, height: 2.8, seal: { paddy: 'door' } },
      ] },
    { id: 'mid_terrace', z: -0.2, height: 4.6, roofed: false, purpose: 'the middle terrace and the track along it',
      extent: [6, 5, 28, 20], zones: [
        { id: 'mid_beds', label: 'Middle Terrace', role: 'lane', weight: 4, height: 4.6,
          cover: { label: 'Frames', height: 1.3, as: 'crate', count: 5 } },
        { id: 'store_shed', label: 'Store', role: 'room', weight: 2, height: 3.6, seal: { mid_beds: 'door' } },
      ] },
    { id: 'top_terrace', z: 4.6, height: 4.0, purpose: 'the top, the cistern and the way in',
      extent: [9, 7, 22, 16], zones: [
        { id: 'head_tank', label: 'Head Tank', role: 'spawn', weight: 3, height: 4.0,
          cover: { label: 'Cisterns', height: 1.4, as: 'barrel', count: 3 } },
        { id: 'upper_beds', label: 'Top Terrace', role: 'lane', weight: 3, height: 4.0,
          cover: { label: 'Frames', height: 1.3, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'mid_terrace', to: 'top_terrace', fromZone: 'mid_beds', toZone: 'upper_beds', width: 2.6 },
    { from: 'lower_terrace', to: 'mid_terrace', fromZone: 'paddy', toZone: 'mid_beds', width: 2.6 },
    { from: 'lower_terrace', to: 'mid_terrace', fromZone: 'channel_gallery', toZone: 'store_shed', width: 2.4, optional: true },
  ],
  spawn: 'head_tank', objective: 'paddy',
};

/**
 * A refuge on a mountain: a building whose whole argument is that it is small.
 *
 * The smallest map in the set on purpose. Everything is close, nothing is
 * more than fifteen metres from anything, and the section is one storey and a
 * cellar cut into the rock.
 */
const REFUGE: SpatialConcept = {
  id: 'refuge', name: 'Refuge',
  thesis: 'A building small enough that nothing in it is more than fifteen metres from anything else, over a cellar cut into the rock it stands on.',
  built: 'a high mountain refuge', incident: 'the wardens closed it for the season and the cellar hatch was left off',
  verb: 'infiltrate', contrast: ['timber hut', 'cut rock cellar'],
  grid: 1.5, size: [32, 24], wall: 0.26,
  bands: [
    { id: 'cellar', z: -3.4, height: 2.8, purpose: 'the cellar, and the water tank in it',
      extent: [5, 4, 20, 14], zones: [
        { id: 'cellar_room', label: 'Cellar', role: 'site', weight: 3, height: 2.8,
          cover: { label: 'Barrels', height: 1.2, as: 'barrel', count: 4 } },
        { id: 'wood_store', label: 'Wood Store', role: 'room', weight: 2, height: 2.6, seal: { cellar_room: 'door' } },
      ] },
    { id: 'hut', z: 0, height: 4.4, purpose: 'the hut, all of it',
      extent: [4, 3, 24, 18], zones: [
        { id: 'porch', label: 'Porch', role: 'spawn', weight: 2, height: 3.6 },
        { id: 'common_room', label: 'Common Room', role: 'lane', weight: 3, height: 4.4,
          cover: { label: 'Tables', height: 1.0, as: 'crate', count: 4 } },
        { id: 'dormitory', label: 'Dormitory', role: 'room', weight: 3, height: 4.0, seal: { common_room: 'door' },
          cover: { label: 'Bunks', height: 1.2, as: 'crate', count: 4 } },
      ] },
  ],
  links: [
    { from: 'cellar', to: 'hut', fromZone: 'cellar_room', toZone: 'common_room', width: 2.2 },
    { from: 'cellar', to: 'hut', fromZone: 'wood_store', toZone: 'dormitory', width: 2.2, optional: true },
  ],
  spawn: 'porch', objective: 'cellar_room',
};

export const CONCEPTS: SpatialConcept[] = [
  TUNNEL, BLOCKHOUSE, SILO, RADAR, BARRACKS, CABLE_TOP,
  GROWHOUSE, DATAHALL, BROADCAST, PIER, TERRACES, REFUGE,
  ROUNDHOUSE, GRAIN, MILL, CHILLWORKS, BRICKWORKS, GASWORKS,
  WATERWORKS, DEPOT, CONTAINERS, FUNICULAR, LOCK, BUNKERING,
  COURTHOUSE, INFIRMARY, OBSERVATORY, NAVE, BATHHOUSE, ASSEMBLY,
  SCHOOL, STACKS, DEPOT_MUSEUM, EXCHANGE, MINT, COMMITTAL,
  TERMINUS, FOUNDRY, CISTERN, ARCOLOGY,
  SORTING, HANGAR, COLDSTORE, MARKET, ARCHIVE,
  SWITCHYARD, SCAFFOLD, QUARRY, RELAY, DRYDOCK,
];
