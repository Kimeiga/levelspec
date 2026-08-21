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

export const CONCEPTS: SpatialConcept[] = [TERMINUS, FOUNDRY, CISTERN, ARCOLOGY];
