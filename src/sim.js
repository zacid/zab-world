// Deterministic island simulation. Runs identically in Node and the browser.
// Rules: no Math.random, no Date, no trig/exp in the step path; all state lives in
// the JSON-serialisable world object so save -> load -> continue == continue.

export const SIM_VERSION = 28;
export const TICK_MS = 10000;            // 1 game hour = 10 real seconds
export const HOURS_PER_DAY = 24;
export const DAYS_PER_SEASON = 90;
export const DAYS_PER_YEAR = 360;
export const TICKS_PER_DAY = HOURS_PER_DAY;
export const TICKS_PER_YEAR = DAYS_PER_YEAR * HOURS_PER_DAY; // 8640 ticks = 1 real day
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const MAP = 64;

export const T = { WATER: 0, SAND: 1, GRASS: 2, FOREST: 3, FIELD: 4, BUILD: 5 };

// Balance knobs
const SPEED = 3;             // tiles per hour
const FIELD_YIELD = 260;     // food per field per harvest (x harvest factor)
const GROW_DAYS = 80;
const HOUSE_COST = 15;       // wood
const HOUSE_WORK = 16;       // hours
const HOUSE_CAP = 6;
const TREE_MAX = 12;
const CHOP = 4;
const WILD_CAP = 300;
const WILD_REGEN = 8;
const FUEL_PER_HOUSE = 0.3;  // wood per winter day
const SPOIL = 0.0005;        // share of sheltered food lost per day
const SPOIL_OPEN = 0.002;    // share lost per day from food heaped in the open (~50% a year)
const HOME_STORE = 150;      // food each house keeps dry in its rafters
const GRANARY_CAP = 2500;    // food a granary keeps dry
const GRANARY_COST = 30;     // wood
const GRANARY_WORK = 24;     // hours
const FISH_CAP = 240;        // fish in the shallows around the island
const FISH_REGEN = 5;        // per day, spring to autumn (2 in winter)

export const TECHS = {
  fire:     { name: 'Fire',      added: '2026-11-14T20:14Z', desc: 'A hearth at the heart of the village. Warmth, light, cooked food.', req: [] },
  shelter:  { name: 'Shelter',   added: '2026-11-14T20:14Z', desc: 'Timber houses keep families together through winter.', req: ['fire'] },
  gather:   { name: 'Gathering', added: '2026-11-14T20:14Z', desc: 'Berries, roots and nuts foraged from the wild.', req: ['fire'] },
  farming:  { name: 'Farming',   added: '2026-11-14T20:14Z', desc: 'Grain planted in spring, harvested before the frost.', req: ['gather'] },
  woodcut:  { name: 'Woodcutting', added: '2026-11-14T20:14Z', desc: 'Stone axes fell trees for timber and firewood.', req: ['fire'] },
  fishing:  { name: 'Fishing',   added: '2026-11-14T20:33Z', desc: 'Spears and lines cast from the beach. Food in every season, even winter.', req: ['gather'] },
  granary:  { name: 'Granaries', added: '2026-11-14T20:47Z', desc: 'Raised timber stores keep grain dry and safe from rot and mice.', req: ['farming', 'woodcut'] },
  hunting:  { name: 'Hunting',   added: '2026-11-14T22:21Z', desc: 'Ash spears with flint points. Pairs of hunters track boars to their lair and, in winter, the wolves to their den. Meat for the pot, hides for the doorways.', req: ['gather', 'woodcut'] },
  fencing:  { name: 'Fences',    added: '2026-11-15T00:13Z', desc: 'Hazel rods woven between stakes around the fields by the woods. Most nights they turn the boars away; they rot, blow down and must be mended.', req: ['farming', 'woodcut'] },
  midsummer: { name: 'Midsummer', added: '2026-11-15T00:30Z', desc: 'On the longest day work stops early. A great bonfire, a feast from the stores, a ring dance until late, and couples pledged in the firelight.', req: ['fire', 'farming'] },
  paths:    { name: 'Footpaths', added: '2026-11-15T01:30Z', desc: 'Nobody lays them out: the grass the islanders cross every day is trodden down to bare earth. Walking is quicker on a path, and the woods cannot creep back over it. Unused paths grass over.', req: ['shelter'] },
  burial:   { name: 'Burying ground', added: '2026-11-15T01:59Z', desc: 'A low ring of stones near the village where the dead are laid in rows, each under a mound and a marker. The morning after a death the family stands at the graveside.', req: ['shelter'] },
  herbs:    { name: 'Herb lore', added: '2026-11-15T05:00Z', desc: 'Willow bark and bitter leaves from the edge of the woods, dried in bundles under the eaves. One healer goes from bed to bed: a tended fever is half as deadly, a tended wound closes sooner. The basket passes on when the healer dies or grows old.', req: ['gather'] },
  farisle:  { name: 'The far isle', added: '2026-11-17T22:26Z', desc: 'Another isle lies beyond the sea haze, and its people can see a big midsummer fire. Some years a dugout full of strangers paddles over for the dance. They trade hides for grain, and now and then one of them stays to marry an islander who had nobody at home; once the island is crowded, a restless islander may sail away with them.', req: ['midsummer', 'fishing'] },
  foghorn:  { name: 'Fog horn', added: '2026-11-17T21:42Z', desc: 'A great whelk shell from the beach with its tip knocked off. On fog days the oldest islander who can stand keeps by the hearth and blows it every little while. Within earshot nobody is alone: a wolf will not single out someone who can call back to the horn. Someone lost in the grey can follow the sound home.', req: ['fire', 'fishing'] },
  tales:    { name: 'Winter tales', added: '2026-11-18T01:02Z', desc: 'On the longest night of the year the whole island sits close round the hearth, children in front, and the eldest tells a tale from the island\'s own past: the landing, the dead in the burying ground and what they did, how the named got their names, what the fog can do. A new tale each winter. Once the fog has been told of, the children keep close to the houses when it comes in.', req: ['fire', 'burial'] },
  dogs:     { name: 'Dogs', added: '2026-11-18T00:21Z', desc: 'A wolf cub raised by the hearth that never went back to the woods. Each grown dog keeps at the heels of one islander and sleeps across their doorway. It flies at a wolf that springs on its owner, barks the village awake when the pen is raided, keeps the goats from straying, follows a scent through the fog and snaps up rats. A litter most springs, as many as the scraps can feed.', req: ['hunting'] },
  pottery:  { name: 'Pottery', added: '2026-11-21T00:12Z', desc: 'Clay dug from the bank above the beach, coiled into big-bellied jars and fired in a domed kiln of turf and clay. One potter digs, shapes a jar a day in dry weather and fires them in batches; some crack in the fire. Grain sealed in a jar under a lid of clay is out of reach of the rats. Jars break with use and must be made again.', req: ['granary', 'fire'] },
  watch:    { name: 'Beach watch', added: '2026-11-21T02:39Z', desc: 'Robbed twice by the far isle, the village keeps watch. On autumn and early-winter nights one islander in turn sits up by a driftwood fire on the beach below the granary and watches the sea. A dugout seen coming in is shouted at with a burning branch and turns back before it lands. The fire keeps the wolves off; the watcher sleeps late the next morning.', req: ['fire', 'farisle'] },
  gifts:    { name: 'Peace gifts', added: '2026-11-21T03:05Z', desc: 'The far isle has thin years, and in a thin year its dugout comes back by night for the granaries. Once robbed, the islanders learn the signs: guests who come to midsummer with sharp cheekbones and nothing to trade. Before they push off at first light each one is given a sack of grain to carry home, and that autumn nobody comes by night.', req: ['farisle'] },
  goats:    { name: 'Goats', added: '2026-11-17T20:22Z', desc: 'A wattle pen beside the village and a child with a crook. The herd grazes the open grass by day and eats the saplings back, gives milk in spring and summer, eats spare grain in winter, and the surplus goes to the pot in autumn. Unminded goats get into the young grain; in fog the wolves come for them.', req: ['fencing'] },
};

// ---------- weather ----------
// One state per day, a Markov chain: a spell holds with `stay`, otherwise the season's odds pick
// tomorrow. Bad days come in runs. Lists, not object keys, so the order never depends on the engine.
export const WEATHER = {
  clear: { name: 'clear', stay: 0.7 },
  rain:  { name: 'rain', stay: 0.55 },
  storm: { name: 'storm', stay: 0.4 },
  heat:  { name: 'heatwave', stay: 0.72 },
  cold:  { name: 'cold snap', stay: 0.66 },
  snow:  { name: 'snow', stay: 0.6 },
  fog:   { name: 'sea fog', stay: 0.55 },
};
const WX_ODDS = [ // per season, weights out of 100
  [['clear', 48], ['rain', 34], ['fog', 7], ['storm', 5], ['cold', 6]],
  [['clear', 53], ['rain', 20], ['fog', 3], ['storm', 9], ['heat', 15]],
  [['clear', 36], ['rain', 34], ['fog', 10], ['storm', 12], ['cold', 8]],
  [['clear', 37], ['snow', 34], ['fog', 5], ['cold', 16], ['storm', 8]],
];
const WX_GROW = { clear: 1, rain: 1.25, storm: 1, heat: 0.4, cold: 0.5, snow: 0, fog: 0.8 };
// sea fog: nobody can see the fish or follow a trail, people grope along off the paths, and the
// wolves, hidden in the grey, come out of the trees by day
const FOG_SPEED = 2;         // tiles per hour off a path in fog (a path is still PATH_SPEED)
const FOG_BOLD = 0.5;        // share of its dusk boldness a wolf has by day in fog
// lost in the fog: a small child or a very old islander wanders off into the grey and the village goes out searching
const LOST_ODDS = 0.002;   // chance per fog hour (09:00-15:00) that someone strays
const LOST_NOTICE = 2;       // hours before anyone misses them
const LOST_WALK = 1;         // tiles per hour, wandering off blind
const LOST_HEAR = 6.25;      // a searcher this close (squared) hears them answer in the fog
const LOST_SEE = 25;         // and this close once the fog has lifted
const LOST_COLD = 0.06;     // chance per winter night hour out in the open that the cold takes them
const LOST_MAX = 40;         // hours before they stumble home on their own
const HORN_EAR = 169;        // the fog horn: within 13 tiles of the hearth (squared) nobody is alone in the fog
const HORN_FOLLOW = 0.5;   // chance per hour that someone lost picks out the horn and turns toward it
const HORN_WALK = 2;         // tiles per hour, walking toward the sound
const HORN_HOME = 16;        // this close (squared) to the hearth and they are home
const STORM_FLATTEN = 0.03;  // chance per storm day that a tall or ripe field is flattened
const STORM_ROOF = 0.15;    // chance per storm day that one building loses its roof

// ---------- creatures ----------
const WOLF_SPEED = 4;        // tiles per hour
const BOAR_SPEED = 3;
const WOLF_SAFE = 49;        // wolves keep 7 tiles from the hearth (squared)
const WOLF_STALK = 0.015;   // chance per hour that a prowling wolf picks out a lone villager nearby (a third by day)
const WOLF_KILL = 0.2;      // share of attacks on someone alone that end in death
const WOUND_DAYS = 12;
const FEAR_DAYS = 45;        // after an attack, nobody lingers outside at dusk or dawn
const BOAR_RAID = 0.08;      // chance per spring/summer night that the boars come for the growing grain

// ---------- hunting ----------
const HUNT_GAP = 6;          // days between hunts
const HUNT_WORK = 3;         // hours spent tracking and closing in at the lair
const HUNT_REACH = 24 * 24;  // a lair farther than this from the hearth is out of a day's reach
const HUNT_KEEP = 3;         // hunters leave the last two of a herd, so it can breed again
const MEAT = { boar: 45, wolf: 12, deer: 30 };
// ---------- deer ----------
const DEER_SPEED = 1.5;      // tiles per hour, grazing along
const DEER_FLEE = 4;         // bounding away
const DEER_SHY = 12;         // a grown person this close (squared) sends them off
const DEER_PER = 45;         // open grass tiles it takes to feed one deer
const DEER_MAX = 8;
const DEER_KEEP = 4;         // hunters leave three, and only hunt them in autumn
const DEER_YEAR = 2;         // and take no more than two a year
const DEER_BROWSE = 3;       // saplings this small are nibbled back to grass where the herd feeds
const WOLF_DEER = 0.012;     // chance per winter day that the pack pulls down a deer (and leaves people be a while)
const HIDE_WARM = 0.3;       // hides over every doorway cut winter firewood by up to 30%

// ---------- fences ----------
const FENCE_COST = 3;        // timber for the stakes and rods around one field
const FENCE_WORK = 3;        // hours of weaving
const FENCE_HOLD = 0.85;     // chance a fence turns a boar away; otherwise it shoulders through
const FENCE_ROT = 0.2;       // share of fences that rot through over a year
const FENCE_STORM = 0.02;    // chance per storm day that a fence blows down
const FENCE_LEARN = 8;       // raids before someone thinks of a fence

// ---------- midsummer ----------
const FEST_DAY = 135;        // day of the year (summer day 46); rain puts it off a few days, a storm until it passes
const FEST_LAST = 165;       // after this the summer is too far gone and the year goes without
const FEST_FROM = 16, FEST_TO = 23; // hours of the gathering; nobody goes home until it ends
const FEST_LEARN = 10;       // people on the island before anyone thinks to keep the day
const FEST_WOOD = 12;        // timber heaped on the bonfire (at most a quarter of the pile)
const FEST_FEAST = 2;        // extra food each person eats, if the stores can spare it
const FEST_PAIR = 0.4;       // chance a single woman finds a partner in the firelight
// ---------- the longest night ----------
const TALE_DAY = 315;        // day of the year (winter day 46); a storm or snow puts it off a few days
const TALE_LAST = 330;       // after this the nights are drawing out again and the year goes without
const TALE_FROM = 18, TALE_TELL = 21, TALE_TO = 23; // the village sits close round the hearth; the tale is told late
const TALE_YEAR = 2;         // the first winter is too raw for stories
const TALE_WOOD = 4;         // timber kept on the fire all evening (at most a sixth of the pile)
const TALE_HEED = 0.7;       // once the fog tale is told, chance a child stays by the houses when the fog comes in
const TALE_KEEP = 80;        // tales remembered as told; older ones may be told again
// ---------- fever ----------
const FEVER_SEED = 0.0012;   // daily chance a fever takes hold, x crowding, x village size, x season
const FEVER_SEASON = [0.5, 0.25, 1, 1.6]; // worst in autumn and winter, when everyone is shut in together
const FEVER_HOUSE = 0.1;     // daily chance per sick housemate that it passes to you
const FEVER_TOWN = 0.04;    // daily chance x share of the village that is sick (met at the fire, the fields, the shore)
const FEVER_DAYS = 6;        // laid up for 6-10 days
const FEVER_IMMUNE = 4;      // years a survivor cannot catch it again
const FEVER_CASTAWAY = 0.15; // chance a castaway brings it ashore

const HERB_LEARN = 8;        // fever cases nursed before anyone goes looking for a cure (or one death)
const HERB_CAP = 30;         // dried bundles that hang under one roof
const HERB_LOW = 10;         // below this the healer goes out for more even while people are ill
const HERB_REACH = 14;       // how far from the hearth the healer looks for the wood's edge
const HERB_FEVER = 0.5;      // a fever patient tended the day before is half as likely to die of it
const HERB_WOUND = 2;        // days each tending takes off a wound's healing
const HERB_KEEP = 0.6;       // share of the bundles still good after a year
const HEAL_OLD = 62;         // at this age the healer hands the basket on
// ---------- rats ----------
const RAT_COME = 0.008;  // daily chance rats find a big heap of grain (year 2 on)
const RAT_HEAP = 500;        // grain heaped in the open that draws them
const RAT_RICH = 4000;       // or stores this large, even under a roof
const RAT_FIRST = 6;         // how many come
const RAT_BREED = 0.05;      // daily growth spring to autumn while grain lies in the open
const RAT_BREED_DRY = 0.015; // daily growth when every grain is under a roof
const RAT_WINTER = -0.02;    // winter with nothing in the open: they starve and freeze back
const RAT_FROST = -0.04;     // on cold and snow days
const RAT_BASE = 30;         // how many the island can feed with no granary
const RAT_PER_GRANARY = 15;  // more for every granary to nest under
const RAT_MAX = 150;
const RAT_FOOD = 80;         // and never more than one per this much grain in store
const RAT_EAT = 0.05;        // grain each rat eats (and fouls) per day
const RAT_FEVER = 0.6;       // a swarming colony makes a fever up to 60% more likely to take hold
const RAT_SWARM = 40;        // past this the village notices how many there are
// pottery: sealed jars keep grain from the rats
const POT_LEARN = 1500;      // grain the rats have eaten before anyone thinks of sealing it away
const POT_SPARK = 0.03;      // daily chance in spring to autumn, after that, that someone does
const JAR_HOLD = 100;        // grain one jar holds under its clay lid
const POT_MAX = 60;          // jars the potter keeps the stores in
const POT_CLAY = 3;          // lumps of clay dug in one trip to the bank
const POT_GAP = 2;           // days between jars: each is coiled, smoothed and left to stiffen before the next
const POT_BATCH = 8;         // shaped jars before the kiln is worth firing
const POT_WOOD = 6;          // timber burned in one firing
const POT_CRACK = 0.25;      // chance each jar cracks in the fire
const POT_BREAK = 0.12;      // chance each jar is broken over a year of use
const POT_OLD = 60;          // at this age the potter's hands are too stiff for the coils

// ---------- the far isle ----------
const ISLE_YEAR = 3;         // from this year a towering midsummer fire can be seen from the far isle
const ISLE_SEEN = 0.5;       // chance they row over to the first big fire they see
const ISLE_COME = 0.4;       // and to each one after
const ISLE_OUT = 10;         // tiles offshore the boat comes in from
const ISLE_SAIL = 8;         // hour on midsummer day the boat comes into sight
const GUEST_SPEED = 4;       // tiles per hour, the guests striding up from the beach
const BOAT_SPEED = 3;        // tiles per hour, paddling
const ISLE_WED = 0.5;        // chance a single islander with nobody to marry at home is pledged to a guest
const ISLE_LEAVE = 0.25;     // chance a single islander with nobody to marry sails away with them (a crowded island only)
const ISLE_CROWD = 30;       // people on the island before anyone would think of leaving
const ISLE_TRADE = 300;      // grain the guests take home, if the stores can spare it
const ISLE_FEVER = 0.08;     // chance the guests leave a fever behind
// raiders: in a thin year on the far isle the dugout comes back by night after the harvest, for the granaries
const RAID_LEAN = 0.25;      // chance each year, once they have seen the island, that the far isle goes hungry (less with kin on both shores)
const RAID_NIGHT = 0.03;     // chance per autumn or early-winter night of a thin year that they come
const RAID_FOG = 3;          // x this on a fog day: nobody will see the boat come in
const RAID_RICH = 2000;      // grain in store before the crossing seems worth the risk
const RAID_CARRY = 70;       // grain each raider carries off in a sack
const RAID_SHARE = 0.15;     // and never more than this share of the stores
const RAID_DAWN = 6;         // from this hour the first ones up see anybody still at the granary
const RAID_SEEN = 16;        // within this (squared) of it
const RAID_OUT = 3;      // tiles offshore the dugout creeps in from
const RAID_SAIL = 20;        // hour it pushes in out of the dusk
const RAID_SPEED = 5;        // tiles per hour, loping up from the beach in the dark
const RAID_ROW = 3;          // tiles per hour, paddling
const RAID_RUN = 6;          // and running for the boat
const RAID_NEAR = 100;       // a house this close (squared) to the granary is close enough to hear the door
const RAID_WAKE = 0.15;      // chance per hour they are at the granary door that someone close by wakes (x3 with a dog by the granary)
const RAID_HURT = 0.25;      // chance the first one out is struck down in the scuffle
const RAID_CHASE = 3;        // islanders who run after them with brands
const WATCH_RAIDS = 2;       // raids it takes before the village sets a watch on the beach
const WATCH_FROM = 19;       // hour the watcher goes down to the beach fire
const WATCH_TO = 6;          // and comes home at first light
const WATCH_REST = 11;       // sleeping until this hour the morning after
const WATCH_WOOD = 1;        // timber burnt on the beach each night
const WATCH_SEE = 0.8;       // chance the watcher sees a dugout come in on a clear night
const WATCH_DIM = { fog: 0.25, rain: 0.5, cold: 0.9 }; // and in worse weather
const WATCH_AT = 4;          // (squared) the watcher must be this close to the fire to see anything
// peace gifts: once robbed, the islanders send hungry guests home with grain, and the raid does not come
const GIFT_SACK = 60;        // grain in each guest's sack
const GIFT_SHARE = 0.1;      // never more than this share of the stores
const GIFT_KEEP = 300;       // grain kept back for each islander first
const ISLE_HUNGRY = 1.5;     // x ISLE_COME in a thin year there: they come for the feast as much as the dance
export const PEN_W = 2;      // tiles inside the goat pen's wattle
export const PEN_H = 2;
const GOAT_COME = 0.05;      // daily chance in spring and summer (year 2 on) that the drifting raft finds the beach
const GOAT_FIRST = 3;
const GOAT_SPEED = 1.5;      // tiles per hour, grazing along
const GOAT_REACH = 7;        // how far from the pen the herd is taken to graze
const GOAT_OUT = 7, GOAT_HOME = 16; // let out after breakfast, brought in well before the wolves wake
const GOAT_PER = 12;         // open grass tiles near the pen it takes to feed one goat through the year
const GOAT_MAX = 14;
const GOAT_MILK = 0.8;       // milk (counted as food) per grown goat per day, spring and summer
const GOAT_FODDER = 1.5;     // grain each goat eats per winter day, when the stores can spare it
const GOAT_MEAT = 20;
const GOAT_OLD = 10;         // years before a goat is killed for the pot
const GOAT_BROWSE = 4;       // saplings this small are eaten back to grass around the pen
const GOAT_NIBBLE = 0.04;    // growth an unminded goat eats from a young field each hour it stands in it
const PEN_ODDS = 0.025;      // chance per winter night that a hungry wolf comes to the goat pen
const PEN_COLD = 2;          // x this on a frost or snow night
const PEN_DEER = 0.5;        // x this while the pack still has more than three deer to chase
const PEN_HOLD = 0.35;       // chance the wattle holds until the wolf gives up
const PEN_WAKE = 0.5;        // chance someone sleeping close by wakes to the goats and runs out with a brand
const PEN_NEAR = 36;         // a house this close to the pen (squared) is close enough to hear
const PEN_BITE = 0.15;       // chance the one who runs out is bitten
const PEN_MEND = 2;          // timber to weave the torn wattle back
const DOG_CUB = 0.01;        // daily chance in spring and summer (year 3 on) that a cub is found at the edge of the woods
const DOG_GROWN = 1;         // years before a pup is any use
const DOG_SPEED = 6;         // tiles per hour, trotting at heel
const DOG_NEAR = 9;          // a grown dog this close (squared) is at your side
const DOG_NOSE = 49;         // and this close to someone lost in the fog it has their scent
const DOG_DIES = 0.15;       // chance a dog that flies at a wolf is killed doing it
const DOG_WAKE = 0.9;        // chance someone wakes when a dog by the pen barks
const DOG_RAT = 0.15;        // daily chance each grown dog catches a rat
const DOG_EAT = 0.5;         // scraps each dog eats a day
const DOG_PER = 7;           // islanders it takes to feed one dog
const DOG_MAX = 8;
const DOG_OLD = 10;          // years; the hardiest live a few more
const DOG_NAMES = ['Bran', 'Gyp', 'Fen', 'Tor', 'Mab', 'Rua', 'Ash', 'Nip', 'Scar', 'Brock', 'Moss', 'Tansy', 'Holt', 'Wisp', 'Cull', 'Sorrel', 'Grim', 'Dun', 'Pip', 'Rook'];
// ---------- footpaths ----------
// Every step on open grass wears it a little; the grass grows back a little each day. Where people
// walk often enough the ground is trodden bare: a path. Nobody lays them out, the feet do.
export const WEAR_MAX = 60;     // how worn a tile can get
export const WEAR_SEEN = 6;     // grass looks trampled from here
export const PATH_AT = 24;      // and is a bare-earth path from here
const PATH_SPEED = 4;           // tiles per hour along a path (3 off it)
const WEAR_HEAL = [1, 1, 1, 0]; // grass heals spring to autumn; under snow nothing grows back
// ---------- burying ground ----------
export const YARD_W = 4;               // tiles inside the low wall
export const YARD_H = 3;
export const GRAVE_COLS = 10;          // graves per row; five rows
const GRAVE_CAP = 50;
const MOURN_FROM = 9, MOURN_TO = 12;   // hours the family stands at the graveside the morning after
// where the dancers stand: 24 points on a circle of radius 1, 15 degrees apart (written out, no trig in the step)
const RING = [[1, 0], [0.966, 0.259], [0.866, 0.5], [0.707, 0.707], [0.5, 0.866], [0.259, 0.966], [0, 1], [-0.259, 0.966],
  [-0.5, 0.866], [-0.707, 0.707], [-0.866, 0.5], [-0.966, 0.259], [-1, 0], [-0.966, -0.259], [-0.866, -0.5], [-0.707, -0.707],
  [-0.5, -0.866], [-0.259, -0.966], [0, -1], [0.259, -0.966], [0.5, -0.866], [0.707, -0.707], [0.866, -0.5], [0.966, -0.259]];

// ---------- randomness ----------
export function rnd(w) {
  let t = (w.rng = (w.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (w, n) => Math.floor(rnd(w) * n);

function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export { hash };
function vnoise(x, y, cell, s) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), d = hash(gx + 1, gy + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ---------- names ----------
const SYL = ['ka', 'lo', 'mi', 'ra', 'ten', 'sa', 'vi', 'dor', 'an', 'el', 'is', 'ru', 'ba', 'fen', 'ta', 'lin',
  'mor', 'ne', 'ol', 'ys', 'ha', 'bri', 'ce', 'du', 'go', 'wen', 'ar', 'thi', 'em', 'qua', 'ser', 'ul'];
function makeName(w) {
  const n = 2 + (rnd(w) < 0.25 ? 1 : 0);
  let s = '';
  for (let i = 0; i < n; i++) s += SYL[ri(w, SYL.length)];
  return s[0].toUpperCase() + s.slice(1);
}

// ---------- time helpers ----------
export function clock(t) {
  const day = Math.floor(t / HOURS_PER_DAY);
  const doy = day % DAYS_PER_YEAR;
  return {
    hour: t % HOURS_PER_DAY, day, doy,
    year: Math.floor(day / DAYS_PER_YEAR) + 1,
    season: Math.floor(doy / DAYS_PER_SEASON),
    dos: (doy % DAYS_PER_SEASON) + 1,
  };
}
export const tickAt = (w, ms) => Math.max(0, Math.floor((ms - w.epoch) / TICK_MS));
export const ageY = (w, p) => (w.t - p.born) / TICKS_PER_YEAR;
const stamp = (w) => { const c = clock(w.t); return `Y${c.year} ${SEASONS[c.season]}`; };

// ---------- map helpers ----------
const idx = (x, y) => y * MAP + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP;
const tile = (w, x, y) => (inMap(x, y) ? w.tiles[idx(x, y)] : T.WATER);

function lineOfLand(w, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.ceil(Math.sqrt(dx * dx + dy * dy) / 0.4);
  for (let i = 0; i <= n; i++) {
    const x = Math.floor(x0 + (dx * i) / (n || 1)), y = Math.floor(y0 + (dy * i) / (n || 1));
    if (tile(w, x, y) === T.WATER) return false;
  }
  return true;
}
function nearBuild(w, x, y, r) {
  for (let yy = y - r; yy <= y + r; yy++)
    for (let xx = x - r; xx <= x + r; xx++) if (tile(w, xx, yy) === T.BUILD) return true;
  return false;
}
const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

// ---------- lookup caches ----------
// Derived data only, never saved and never consulted for anything but speed: a world loaded from JSON
// gets a fresh cache and makes exactly the same choices. Change tiles in the step path only through
// setTile(), so cached searches that depend on the map know to start over.
const CACHE = new WeakMap();function cacheOf(w) {
  let c = CACHE.get(w);
  if (!c) { c = { tv: 0, siteTv: -1, site: null, shoreOf: null, shore: null }; CACHE.set(w, c); }
  return c;
}
function setTile(w, i, t) {
  w.tiles[i] = t;
  const c = CACHE.get(w);
  if (c) c.tv++;
}

// ---------- logging ----------
function log(w, text, k = 'info') {
  w.log.push({ t: w.t, s: stamp(w), text, k });
  if (w.log.length > 200) w.log.splice(0, w.log.length - 200);
}
function milestone(w, text) {
  w.chronicle.push({ t: w.t, s: stamp(w), text });
  log(w, text, 'major');
}

// ---------- genesis ----------
export function genesis(seed, epoch) {
  const w = {
    v: SIM_VERSION, seed, epoch, t: 0, rng: seed | 0,
    name: '', tiles: new Array(MAP * MAP).fill(T.WATER), wood: new Array(MAP * MAP).fill(0),
    fire: { x: 0, y: 0 }, food: 500, timber: 30, wild: 200, harvest: 1,
    buildings: [], fields: [], people: [], nextId: 1, res: {}, prog: {},
    techs: ['fire', 'shelter', 'gather', 'farming', 'woodcut'],
    learned: { fire: 0, shelter: 0, gather: 0, farming: 0, woodcut: 0 },
    log: [], chronicle: [], hist: { daily: [], yearly: [] },
    stats: { births: 0, deaths: 0, peak: 0, yb: 0, yd: 0, yh: 0, ys: 0, yf: 0, hungry: false, cold: false },
    wx: { k: 'clear', n: 1, f: 0, r: 0, d: 0 },
    beasts: [], fauna: null, fest: { y: 0, on: -1, n: 0, k: 0 }, tale: null,
    fever: { k: 0, n: 0, d: 0, all: 0 },
    wear: new Array(MAP * MAP).fill(0),
    graves: [], yard: null, heal: null, nLearned: 5, rats: null, goats: null, lost: { n: 0, y: 0, f: 0, d: 0, cur: null }, horn: null, isle: null, dogs: null, raid: null, pot: null, watch: null,
  };
  // name the island
  let nm = '';
  for (let i = 0; i < 2 + (seed & 1); i++) nm += SYL[Math.floor(hash(i, 7, seed) * SYL.length)];
  w.name = nm[0].toUpperCase() + nm.slice(1);

  // terrain
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const dx = (x - 31.5) / 29, dy = (y - 31.5) / 29;
    const d = Math.sqrt(dx * dx + dy * dy);
    const n = vnoise(x, y, 16, seed) * 0.6 + vnoise(x, y, 6, seed + 1) * 0.3 + vnoise(x, y, 3, seed + 2) * 0.1;
    const h = 1 - d * 1.1 + (n - 0.5) * 0.6;
    let tt = h < 0.12 ? T.WATER : h < 0.2 ? T.SAND : T.GRASS;
    if (tt === T.GRASS && vnoise(x, y, 7, seed + 3) + vnoise(x, y, 3, seed + 4) * 0.25 > 0.66) tt = T.FOREST;
    w.tiles[idx(x, y)] = tt;
    if (tt === T.FOREST) w.wood[idx(x, y)] = TREE_MAX;
  }
  // keep only the landmass connected to the centre
  let cx = 32, cy = 32, best = 1e9;
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++)
    if (w.tiles[idx(x, y)] !== T.WATER) { const dd = d2(x, y, 31.5, 31.5); if (dd < best) { best = dd; cx = x; cy = y; } }
  const seen = new Uint8Array(MAP * MAP), q = [idx(cx, cy)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % MAP, y = (i / MAP) | 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ax, ny = y + ay;
      if (inMap(nx, ny) && !seen[idx(nx, ny)] && w.tiles[idx(nx, ny)] !== T.WATER) { seen[idx(nx, ny)] = 1; q.push(idx(nx, ny)); }
    }
  }
  for (let i = 0; i < MAP * MAP; i++) if (!seen[i]) { w.tiles[i] = T.WATER; w.wood[i] = 0; }

  // hearth: grass-ish tile nearest the centre, with a clearing around it
  w.fire = { x: cx, y: cy };
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++)
    if (tile(w, x, y) === T.FOREST || tile(w, x, y) === T.SAND) { w.tiles[idx(x, y)] = T.GRASS; w.wood[idx(x, y)] = 0; }
  for (const [ax, ay] of [[0, 0], [1, 0], [-1, 0]]) w.tiles[idx(cx + ax, cy + ay)] = T.BUILD;
  w.shore = findShore(w);
  w.fish = FISH_CAP;
  w.techs.push('fishing');

  // founders
  for (let c = 0; c < 3; c++) {
    const home = addBuilding(w, 1);
    const ages = [20 + ri(w, 10), 20 + ri(w, 10)];
    const f = addPerson(w, 'f', ages[0], null, null, home);
    const m = addPerson(w, 'm', ages[1], null, null, home);
    f.partner = m.id; m.partner = f.id;
    if (c < 2) addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', 2 + ri(w, 4), f.id, m.id, home);
  }
  for (let i = 0; i < 3; i++) addField(w);
  milestone(w, `${w.people.length} settlers land on ${w.name} and light a fire.`);
  stockWilds(w);
  w.stats.peak = w.people.length;
  return w;
}

// beach tiles touching open water: where the fishers stand. Sand never changes, so this is fixed.
function findShore(w) {
  const out = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    if (tile(w, x, y) !== T.SAND) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(w, x + a, y + b) === T.WATER)) out.push(idx(x, y));
  }
  return out;
}

function addPerson(w, sex, ageYears, mother, father, home) {
  const p = {
    id: w.nextId++, name: makeName(w), sex, born: w.t - Math.floor(ageYears * TICKS_PER_YEAR),
    mother, father, partner: null, home, wants: false, lastBirth: -1e9, hunger: 0,
    x: w.fire.x + 0.5 + (rnd(w) - 0.5) * 3, y: w.fire.y + 0.5 + (rnd(w) - 0.5) * 3, px: 0, py: 0,
    task: null, asleep: false,
  };
  p.px = p.x; p.py = p.y;
  w.people.push(p);
  return p;
}

function findHouseSite(w) {
  let best = null, bd = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
    const tt = tile(w, x, y);
    if ((tt !== T.GRASS && tt !== T.FOREST) || nearBuild(w, x, y, 1)) continue;
    const dd = d2(x, y, fx, fy) + hash(x, y, w.seed + 9) * 2 + (tt === T.FOREST ? 6 : 0);
    if (dd < 5 || dd >= bd) continue;
    if (!lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bd = dd; best = { x, y };
  }
  return best;
}
function addBuilding(w, progress, kind = 'house') {
  const s = findHouseSite(w);
  if (!s) return null;
  w.timber += w.wood[idx(s.x, s.y)];
  w.wood[idx(s.x, s.y)] = 0;
  setTile(w, idx(s.x, s.y), T.BUILD);
  const b = { id: w.nextId++, kind, x: s.x, y: s.y, progress };
  w.buildings.push(b);
  return b.id;
}
// the best spot for a new field depends only on the map, so it is worked out again only when a tile changes
function findFieldSite(w) {
  const c = cacheOf(w);
  if (c.siteTv !== c.tv) { c.site = scanFieldSite(w); c.siteTv = c.tv; }
  return c.site && { x: c.site.x, y: c.site.y };
}
function scanFieldSite(w) {
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
    const tt = tile(w, x, y);
    if (tt !== T.GRASS && tt !== T.FOREST) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 16) continue;
    let adj = 0;
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tile(w, x + ax, y + ay) === T.FIELD) adj++;
    const sc = Math.sqrt(dd) - adj * 1.6 + hash(x, y, w.seed + 5) + (tt === T.FOREST ? 4 : 0);
    if (sc >= bs) continue;
    if (!lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
function addField(w, at) {
  const s = at || findFieldSite(w);
  if (!s) return null;
  setTile(w, idx(s.x, s.y), T.FIELD);
  const f = { id: w.nextId++, x: s.x, y: s.y, stage: 'fallow', growth: 0 };
  w.fields.push(f);
  return f;
}

// ---------- the step ----------
export function step(w, fx) {
  const c = clock(w.t);
  for (const p of w.people) { p.px = p.x; p.py = p.y; }
  if (c.hour === 0) daily(w, c, fx);
  hornHour(w, c);
  if (w.watch) watchHour(w, c);
  if (c.hour === 19) supper(w);
  if (w.fest && w.fest.on === c.day) midsummer(w, c, fx);
  if (w.tale && w.tale.on === c.day) longNight(w, c, fx);
  for (const p of w.people) if (!p.dead) act(w, p, c, fx);
  if (w.beasts) prowl(w, c);
  if (w.goats) goatHour(w, c);
  if (w.dogs) dogHour(w, c);
  if (w.lost) lostHour(w, c);
  if (w.isle && w.isle.boat) isleHour(w, c);
  if (w.raid && (w.raid.cur || w.raid.on === c.day)) raidHour(w, c);
  if (w.people.some((p) => p.dead)) w.people = w.people.filter((p) => !p.dead);
  if (w.techs.length !== w.nLearned) noteLearned(w);
  w.t++;
}

// the hour each discovery was made, for the sky
function noteLearned(w) {
  w.learned ||= {};
  for (const id of w.techs) if (!(id in w.learned)) w.learned[id] = w.t;
  w.nLearned = w.techs.length;
}

export function advanceTo(w, target, fx, maxSteps = Infinity) {
  let n = 0;
  while (w.t < target && n < maxSteps) { step(w, fx); n++; }
  return n;
}

function supper(w) {
  // everyone shares what there is; hunger builds with the shortfall
  const n = w.people.length;
  if (!n) return;
  const share = Math.min(1, w.food / n);
  w.food = Math.max(0, Math.round((w.food - share * n) * 100) / 100);
  for (const p of w.people) p.hunger = share >= 1 ? Math.max(0, p.hunger - 2) : Math.round((p.hunger + (1 - share)) * 100) / 100;
  const hungry = share < 1 ? n : 0;
  if (hungry && !w.stats.hungry) { w.stats.hungry = true; log(w, share > 0.5 ? 'Rations are cut. Bowls are half full.' : 'The stores are empty. The village goes hungry.', 'bad'); }
  if (!hungry && w.stats.hungry) { w.stats.hungry = false; log(w, 'There is food on every plate again.', 'good'); }
}

function daily(w, c, fx) {
  const pop = w.people.length;
  // food under a roof keeps; food heaped in the open rots
  const open = Math.max(0, w.food - storeCap(w));
  w.food = Math.round(((w.food - open) * (1 - SPOIL) + open * (1 - SPOIL_OPEN)) * 100) / 100;
  if (open >= 1000 && !w.techs.includes('granary') && w.techs.includes('farming') && w.techs.includes('woodcut')) {
    w.techs.push('granary');
    milestone(w, `Grain rots in heaps behind the houses. The ${w.name} folk raise a store on stilts to keep it dry.`);
  }
  // new year
  if (c.doy === 0) {
    if (c.year > 1) {
      w.hist.yearly.push({ y: c.year - 1, pop, births: w.stats.yb, deaths: w.stats.yd, harvest: w.stats.yh, food: Math.round(w.food), timber: Math.round(w.timber), storms: w.stats.ys || 0, flattened: w.stats.yf || 0, wolves: w.stats.yw || 0, raids: w.stats.yr || 0, hunted: w.stats.yk || 0, fences: w.fields.filter((f) => f.fence).length, sick: w.stats.yi || 0, fog: w.stats.yg || 0, rats: w.rats ? Math.round(w.rats.y) : 0, ...(w.goats ? { goats: w.goats.herd.length, goatsLost: w.goats.yl, pens: w.goats.yp || 0 } : {}), ...(w.lost ? { lost: w.lost.y } : {}), ...(w.dogs ? { dogs: w.dogs.d.length } : {}), ...(w.raid ? { stolen: w.raid.yg, given: w.raid.yv || 0 } : {}), ...(w.pot ? { jars: w.pot.j } : {}) });
      log(w, `Year ${c.year - 1} ends: ${pop} people, ${w.stats.yb} born, ${w.stats.yd} died, ${w.stats.yh} grain harvested.`, 'year');
    }
    w.stats.yb = w.stats.yd = w.stats.yh = w.stats.ys = w.stats.yf = 0;
    w.harvest = Math.round((0.65 + rnd(w) * 0.65) * 100) / 100;
    if (w.harvest < 0.8) log(w, 'A dry spring. The elders fear a thin harvest.', 'bad');
    else if (w.harvest > 1.15) log(w, 'Warm rains this spring. The soil feels rich.', 'good');
    for (const f of w.fields) { if (f.stage === 'harvested') f.stage = 'fallow'; if (f.flat) delete f.flat; delete f.root; delete f.lost; }
    w.stats.yw = w.stats.yr = w.stats.yk = w.stats.yi = w.stats.yg = 0;
    if (w.rats) {
      if (w.rats.y >= 50) log(w, `Rats ate ${Math.round(w.rats.y)} grain from the stores last year.`, 'bad');
      w.rats.y = 0;
    }
    if (w.lost) w.lost.y = 0;
    raidYear(w, c);
    if (w.hides) w.hides = Math.floor(w.hides * 0.6); // hides crack and wear out over a year of use
    let rot = 0; // wattle rots at the stakes over a wet year
    for (const f of w.fields) if (f.fence && rnd(w) < FENCE_ROT) { delete f.fence; rot++; }
    if (rot) log(w, `${plural(rot, 'fence has', 'fences have')} rotted at the stakes over the year.`, 'info');
  }
  if (w.beasts) wilds(w, c);
  weather(w, c);
  festDay(w, c);
  taleDay(w, c);
  const wx = w.wx.k;
  if (w.raid) raidNight(w, c, wx);
  if (w.raid && !w.watch && w.raid.n >= WATCH_RAIDS && raidSeason(c)) learnWatch(w);
  // crops rot at the first frost
  if (c.doy === DAYS_PER_SEASON * 3) {
    let rot = 0;
    for (const f of w.fields) if (f.stage === 'planted' || f.stage === 'ripe') { f.stage = 'fallow'; f.growth = 0; delete f.lost; rot++; }
    if (rot) log(w, `Frost takes ${rot} unharvested field${rot > 1 ? 's' : ''}.`, 'bad');
  }
  // growth
  if (c.season < 3) {
    const g = WX_GROW[wx] / GROW_DAYS;
    for (const f of w.fields) if (f.stage === 'planted') {
      f.growth = Math.min(1, Math.round((f.growth + g) * 10000) / 10000);
      if (f.growth >= 1) f.stage = 'ripe';
    }
    w.wild = Math.min(WILD_CAP, w.wild + (wx === 'heat' ? WILD_REGEN / 2 : wx === 'rain' ? WILD_REGEN + 2 : WILD_REGEN));
  }
  // a storm churns the shallows; snow and ice slow the fish
  if (w.shore) w.fish = Math.min(FISH_CAP, w.fish + (wx === 'storm' ? 0 : wx === 'snow' ? 1 : c.season < 3 ? FISH_REGEN : 2));
  // forests regrow
  for (let k = 0; k < 60; k++) {
    const x = ri(w, MAP), y = ri(w, MAP), i = idx(x, y);
    if (w.tiles[i] === T.FOREST && w.wood[i] < TREE_MAX) w.wood[i]++;
    else if (w.tiles[i] === T.GRASS && rnd(w) < 0.05 && !(w.wear && w.wear[i] >= PATH_AT) && !nearBuild(w, x, y, 1) &&
      ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(w, x + a, y + b) === T.FIELD) &&
      [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => tile(w, x + a, y + b) === T.FOREST)) {
      setTile(w, i, T.FOREST); w.wood[i] = 1;
    }
  }
  if (w.wear) paths(w, c);
  // winter fuel; a cold snap doubles it, and even out of winter it sends people to the woodpile
  const burn = c.season === 3 ? (wx === 'cold' ? 2 : wx === 'snow' ? 1.3 : 1) : wx === 'cold' ? 0.5 : 0;
  if (burn > 0) {
    const homes = w.buildings.filter((b) => isHouse(b) && b.progress >= 1 && w.people.some((p) => p.home === b.id)).length;
    const warm = homes ? Math.min(HIDE_WARM, ((w.hides || 0) / homes) * HIDE_WARM) : 0;
    const need = Math.round(homes * FUEL_PER_HOUSE * burn * (1 - warm) * 100) / 100;
    if (w.timber >= need) { w.timber = Math.round((w.timber - need) * 100) / 100; if (w.stats.cold) { w.stats.cold = false; log(w, 'Every hearth is lit again.', 'good'); } }
    else { w.timber = 0; if (!w.stats.cold) { w.stats.cold = true; log(w, 'The woodpile is bare. Homes go cold.', 'bad'); } }
  } else w.stats.cold = false;

  if (w.rats !== undefined) rats(w, c);
  if (w.pot !== undefined) potDay(w, c);
  if (w.fever) fever(w, c, fx);
  if (w.heal !== undefined) herbs(w, c);
  if (w.goats !== undefined) goatDay(w, c);
  if (w.dogs !== undefined) dogDay(w, c);
  lifeAndDeath(w, c);
  pairing(w);
  housing(w);

  w.hist.daily.push([c.day, w.people.length, Math.round(w.food), Math.round(w.timber)]);
  if (w.hist.daily.length > 400) w.hist.daily.splice(0, w.hist.daily.length - 400);
  if (w.people.length > w.stats.peak) {
    for (const m of [10, 25, 50, 100, 200, 400]) if (w.stats.peak < m && w.people.length >= m) milestone(w, `${w.name} is home to ${m} people.`);
    w.stats.peak = w.people.length;
  }
  if (w.people.length === 0 && !w.stats.empty) {
    w.stats.empty = true;
    milestone(w, `The last fire on ${w.name} goes out.`);
  }
  if (w.people.length === 0 && c.doy === 0) {
    for (let i = 0; i < 2; i++) {
      const f = addPerson(w, 'f', 19 + ri(w, 8), null, null, null), m = addPerson(w, 'm', 19 + ri(w, 8), null, null, null);
      f.partner = m.id; m.partner = f.id;
    }
    w.stats.empty = false;
    milestone(w, `A boat of four settlers finds the cold hearth on ${w.name} and relights it.`);
  }
  if (w.people.length) w.stats.empty = false;
  // castaways keep the island from emptying, and bring new blood
  const lonely = w.people.length < 12 ? 0.004 : 0.0008;
  if (c.season < 3 && rnd(w) < lonely) {
    const n = 1 + ri(w, 2);
    const a = addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', 18 + ri(w, 12), null, null, null);
    a.x = a.px = w.fire.x + 0.5; a.y = a.py = w.fire.y + 3.5;
    let text = `${a.name}, a castaway, washes ashore`;
    if (n === 2) { const b = addPerson(w, a.sex === 'f' ? 'm' : 'f', 18 + ri(w, 12), null, null, null); b.partner = a.id; a.partner = b.id; text = `${a.name} and ${b.name} drift ashore on a raft`; }
    log(w, text + '.', 'good');
    if (w.fever && rnd(w) < FEVER_CASTAWAY) { // half drowned and shaking, and the shaking is not only the sea
      fall(w, a, fx);
      if (w.fever.n === 1) feverBegins(w, a, `${a.name} came out of the sea shivering, and the shivering does not stop.`);
    }
  }
}

// ---------- the sky ----------
const COUNT = ['', 'A day', 'Two days', 'Three days', 'Four days', 'Five days', 'Six days', 'A week'];
const spellLen = (n) => COUNT[n] || (n === 14 ? 'Two weeks' : `${n} days`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function weather(w, c) {
  const s = w.wx;
  const odds = WX_ODDS[c.season];
  const fits = odds.some(([k]) => k === s.k);
  let next = s.k;
  if (!fits || rnd(w) >= WEATHER[s.k].stay) {
    let r = rnd(w) * 100;
    next = odds[odds.length - 1][0];
    for (const [k, p] of odds) { if (r < p) { next = k; break; } r -= p; }
  }
  if (next === s.k) s.n++;
  else {
    endSpell(w, s);
    w.wx = { k: next, n: 1, f: 0, r: 0, d: 0 };
    if (next === 'storm') log(w, 'Black clouds roll in off the sea. Everyone runs for shelter.', 'bad');
    else if (next === 'cold' && c.season === 3) log(w, 'A hard frost grips the island. The woodpile shrinks fast.', 'bad');
    else if (next === 'heat') log(w, 'The sun beats down. The soil cracks.', 'info');
    else if (next === 'fog') fogComes(w);
  }
  if (w.wx.k === 'storm') storm(w);
  if (w.wx.k === 'fog') w.stats.yg = (w.stats.yg || 0) + 1;
}

function fogComes(w) {
  w.stats.fogs = (w.stats.fogs || 0) + 1;
  if (w.stats.fogs > 1) { log(w, 'Fog rolls in off the sea. The shore goes quiet and the trees fade to grey.', 'info'); return; }
  const who = elder(w);
  milestone(w, `A wall of grey rolls in off the sea and swallows ${w.name}. From the beach ${who ? who.name : 'nobody'} cannot see the water, and from the fields nobody can see the trees. ` +
    'Nobody fishes and nobody hunts, and somewhere out in the white a wolf howls in broad day.');
}

function storm(w) {
  const s = w.wx;
  w.stats.ys = (w.stats.ys || 0) + 1;
  // wind lays tall grain flat; it can't be sown again until spring
  for (const f of w.fields) {
    if (f.stage !== 'ripe' && !(f.stage === 'planted' && f.growth >= 0.5)) continue;
    if (rnd(w) < STORM_FLATTEN) { f.stage = 'fallow'; f.growth = 0; f.flat = 1; s.f++; w.stats.yf = (w.stats.yf || 0) + 1; }
  }
  for (const f of w.fields) if (f.fence && rnd(w) < FENCE_STORM) { delete f.fence; s.g = (s.g || 0) + 1; }
  // and now and then it takes a roof
  if (rnd(w) < STORM_ROOF) {
    const standing = w.buildings.filter((b) => b.progress >= 1);
    if (standing.length) {
      const b = standing[ri(w, standing.length)];
      b.progress = 0.75; b.dmg = 1; s.r++;
    }
  }
}

// a spell ends: tell the chronicle if it was one people will remember
function endSpell(w, s) {
  const n = s.n, len = spellLen(n), v = (vb) => (len.startsWith('A ') ? vb + 's' : vb); // "A week of rain ends"
  let text = null, k = 'bad', big = false;
  if (s.k === 'storm' && (n >= 3 || s.f || s.r || s.g >= 3)) {
    const hurt = [];
    if (s.f) hurt.push(`${plural(s.f, 'field', 'fields')} flattened`);
    if (s.r) hurt.push(`${plural(s.r, 'roof', 'roofs')} torn away`);
    if (s.g) hurt.push(`${plural(s.g, 'fence', 'fences')} blown down`);
    text = n === 1 ? `A storm tears across ${w.name}` : `${len} of storms ${v('batter')} ${w.name}`;
    text += hurt.length ? `: ${hurt.join(', ')}.` : ', but the village holds.';
    big = n >= 7 || s.r >= 3 || s.f >= Math.max(10, w.fields.length >> 3);
  } else if (s.k === 'heat' && n >= 7) {
    text = `${len} of blazing heat ${v('break')} at last. The grain stood still in the sun.`;
    big = n >= 18 || s.d >= 2;
  } else if (s.k === 'cold' && n >= 6) {
    text = `${len} of bitter cold ${v('lift')}.` + (s.d ? ` ${plural(s.d, 'soul was', 'souls were')} lost to it.` : ' Every hearth was kept burning.');
    big = n >= 15 || s.d >= 2;
  } else if (s.k === 'snow' && n >= 5) {
    text = `${len} of snow ${v('end')}. Drifts lie deep against the houses.`; k = 'info';
  } else if (s.k === 'fog' && (n >= 4 || s.b)) {
    const fell = s.b === 1 ? 'a wolf fell on one of the village' : `wolves fell on ${s.b} islanders`;
    text = (n === 1 ? 'The fog lifts.' : `${len} of fog ${v('lift')}.`) + (!s.b ? ' The sea and the woods come back.'
      : s.x >= s.b ? ` Out of the grey, wolves took ${s.x === 1 ? 'one of the village' : s.x + ' islanders'}.`
      : ` Out of the grey, ${fell}${s.x ? `, and ${s.x === 1 ? 'one' : s.x} did not come home` : ''}.`);
    k = s.b ? 'bad' : 'info';
    big = n >= 12 || s.x >= 1;
  } else if (s.k === 'rain' && n >= 7) {
    text = `${len} of rain ${v('end')}. The fields have drunk deep.`; k = 'good';
  }
  if (!text) return;
  if (big) milestone(w, text); else log(w, text, k);
}

// ---------- the wild ----------
// A wolf pack dens in the deepest woods, far from the hearth; a sounder of boars lies up in thick
// cover nearer the fields. Both stay hidden by day and come out at dusk.
function thicket(w, x, y) {
  let n = 0;
  for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (tile(w, xx, yy) === T.FOREST) n++;
  return n;
}
function findLairs(w) {
  const F = w.fauna, { x: fx, y: fy } = w.fire;
  let den = null, ds = -1e9, lair = null, ls = -1e9;
  for (let y = 2; y < MAP - 2; y++) for (let x = 2; x < MAP - 2; x++) {
    if (w.tiles[idx(x, y)] !== T.FOREST) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 64) continue;
    const n = thicket(w, x, y);
    if (n < 18) continue;
    const r = Math.sqrt(dd), j = hash(x, y, w.seed + 41) * 2;
    const a = n + r * 0.6 + j, b = n - r * 0.5 + j;
    if (a > ds && lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) { ds = a; den = { x, y }; }
    if (b > ls && lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) { ls = b; lair = { x, y }; }
  }
  F.den = den; F.lair = lair;
  findMeadow(w);
  for (const b of w.beasts) {
    const home = beastHome(w, b.k);
    if (!b.out && home) { b.x = b.px = home.x + 0.5; b.y = b.py = home.y + 0.5; }
  }
}
// the deer feed on the widest stretch of open grass away from the houses, and lie up in the nearest trees
function findMeadow(w) {
  const F = w.fauna, { x: fx, y: fy } = w.fire;
  let mead = null, ms = -1e9;
  for (let y = 2; y < MAP - 2; y++) for (let x = 2; x < MAP - 2; x++) {
    if (w.tiles[idx(x, y)] !== T.GRASS) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 81 || nearBuild(w, x, y, 2)) continue;
    let n = 0;
    for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (tile(w, xx, yy) === T.GRASS) n++;
    if (n < 12) continue;
    const s = n + Math.sqrt(dd) * 0.3 + hash(x, y, w.seed + 43) * 2;
    if (s > ms && lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) { ms = s; mead = { x, y }; }
  }
  F.mead = mead; F.bed = null;
  if (!mead) return;
  let bd = 1e9;
  for (let y = mead.y - 10; y <= mead.y + 10; y++) for (let x = mead.x - 10; x <= mead.x + 10; x++) {
    if (tile(w, x, y) !== T.FOREST) continue;
    const dd = d2(x, y, mead.x, mead.y) + hash(x, y, w.seed + 44);
    if (dd < bd && lineOfLand(w, mead.x + 0.5, mead.y + 0.5, x + 0.5, y + 0.5)) { bd = dd; F.bed = { x, y }; }
  }
  if (!F.bed) F.bed = { x: mead.x, y: mead.y };
}
const beastHome = (w, k) => (k === 'wolf' ? w.fauna.den : k === 'deer' ? w.fauna.bed : w.fauna.lair);
function addBeast(w, k) {
  const home = beastHome(w, k) || w.fire;
  const b = { id: w.nextId++, k, x: home.x + 0.5, y: home.y + 0.5, px: 0, py: 0, out: 0, tx: null, ty: null, h: 0, prey: null, f: null, rest: 0 };
  b.px = b.x; b.py = b.y;
  w.beasts.push(b);
  return b;
}
function stockWilds(w) {
  w.beasts = [];
  w.fauna = { fear: 0, den: null, lair: null, raid: 0, hit: 0, att: 0, kills: 0, raids: 0 };
  findLairs(w);
  for (let i = 0; i < 3; i++) addBeast(w, 'wolf');
  for (let i = 0; i < 3; i++) addBeast(w, 'boar');
  for (let i = 0; i < 4; i++) addBeast(w, 'deer');
}

// once a day: wounds heal, lairs shift as the woods change, litters are born and the weak leave
function wilds(w, c) {
  const F = w.fauna;
  for (const p of w.people) if (p.hurt && p.hurt <= w.t) delete p.hurt;
  if (c.day % 30 === 0 || (F.den && tile(w, F.den.x, F.den.y) !== T.FOREST) || (F.lair && tile(w, F.lair.x, F.lair.y) !== T.FOREST)) findLairs(w);
  else if (!F.mead || tile(w, F.mead.x, F.mead.y) !== T.GRASS) findMeadow(w);
  deerDay(w, c);
  if (c.doy !== 45 && c.doy !== 300) return;
  let forest = 0;
  for (let i = 0; i < MAP * MAP; i++) if (w.tiles[i] === T.FOREST) forest++;
  for (const [k, per, hi] of [['wolf', 160, 5], ['boar', 140, 6]]) {
    const cap = Math.max(2, Math.min(hi, Math.round(forest / per)));
    const herd = w.beasts.filter((b) => b.k === k);
    const home = k === 'wolf' ? F.den : F.lair;
    if (c.doy === 45 && home && herd.length >= 2 && herd.length < cap && rnd(w) < (k === 'wolf' ? 0.5 : 0.7)) {
      addBeast(w, k);
      if (k === 'boar' && herd.length + 1 < cap && rnd(w) < 0.5) addBeast(w, k); // a sow farrows a litter
      log(w, k === 'wolf' ? 'Cubs yip somewhere in the deep woods. The pack has grown.' : 'Striped piglets trot after the sows at the forest edge.', 'info');
    } else if (c.doy === 300 && herd.length > cap) {
      const gone = herd[herd.length - 1];
      w.beasts = w.beasts.filter((b) => b !== gone);
      log(w, k === 'wolf' ? 'The woods are thinner now. One wolf has left the pack.' : 'With less cover in the woods, the boars are fewer.', 'info');
    }
  }
  // the deer follow the open grass: more meadow, more fawns; fields and young woods crowd them out
  let grass = 0;
  for (let i = 0; i < MAP * MAP; i++) if (w.tiles[i] === T.GRASS) grass++;
  const cap = Math.max(2, Math.min(DEER_MAX, Math.round(grass / DEER_PER)));
  const herd = w.beasts.filter((b) => b.k === 'deer');
  if (c.doy === 45 && F.mead && herd.length >= 2 && herd.length < cap) {
    const n = Math.min(cap - herd.length, 1 + ri(w, 1 + (herd.length >> 1)));
    for (let i = 0; i < n; i++) addBeast(w, 'deer');
    log(w, n === 1 ? 'A spotted fawn wobbles after its mother on the meadow.' : `${plural(n, 'fawn', 'fawns')} stand trembling in the long grass beside the does.`, 'info');
  } else if (c.doy === 300 && herd.length > cap) {
    const gone = herd[herd.length - 1];
    w.beasts = w.beasts.filter((b) => b !== gone);
    log(w, 'The meadows are smaller now. Fewer deer come out of the trees to graze.', 'info');
  }
}

// once a day: the herd nibbles back the saplings creeping onto its meadow, and in winter the pack may hunt it
function deerDay(w, c) {
  const F = w.fauna;
  let n = 0;
  for (const b of w.beasts) if (b.k === 'deer') n++;
  if (!n || !F.mead) return;
  for (let k = 0; k < n; k++) {
    const x = F.mead.x + ri(w, 11) - 5, y = F.mead.y + ri(w, 11) - 5;
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (w.tiles[i] === T.FOREST && w.wood[i] <= DEER_BROWSE) { setTile(w, i, T.GRASS); w.wood[i] = 0; }
  }
  if (c.season !== 3 || n <= 3 || !F.den) return;
  const pack = w.beasts.filter((b) => b.k === 'wolf');
  if (pack.length < 2 || rnd(w) >= WOLF_DEER) return;
  const prey = w.beasts.filter((b) => b.k === 'deer').pop();
  w.beasts = w.beasts.filter((b) => b !== prey);
  for (const b of pack) b.rest = Math.max(b.rest || 0, w.t + 48); // a full belly: the pack lies up for two days
  F.dw = (F.dw || 0) + 1;
  const text = 'The wolves run down a deer on the frozen meadow. At dawn the frost on the grass is trampled and red.';
  if (F.dw === 1) milestone(w, `${text} While the pack has deer to chase, it leaves the village be.`);
  else log(w, text, 'info');
}

const moveBeast = (b, tx, ty, sp) => moveToward(b, tx, ty, sp);

function prowl(w, c) {
  const F = w.fauna, h = c.hour, wx = w.wx ? w.wx.k : 'clear';
  const storm = wx === 'storm';
  // wolves come out at dusk; in a hungry winter frost they roam by day too
  const dusk = h >= 18 || h < 7;
  // and in a sea fog they slip out of the trees by day, unseen until they are close
  const fog = wx === 'fog';
  const wolfOut = !storm && !!F.den && (dusk || fog || (c.season === 3 && wx === 'cold'));
  F.bold = dusk ? WOLF_STALK : fog ? WOLF_STALK * FOG_BOLD : WOLF_STALK / 3;
  // boars raid the growing grain on spring and summer nights
  if (h === 21) F.raid = !storm && F.lair && c.season < 2 && w.fields.some((f) => f.stage === 'planted' || f.stage === 'ripe') && rnd(w) < BOAR_RAID ? 1 : 0;
  const boarOut = !!F.raid && !storm && (h >= 21 || h < 5);
  const deerOut = !storm && !!F.mead && h >= 5 && h < 21; // out on the grass by day, lying up in the trees by night
  for (const b of w.beasts) {
    b.px = b.x; b.py = b.y;
    if (b.k === 'wolf') wolf(w, b, wolfOut && b.rest <= w.t);
    else if (b.k === 'deer') deer(w, b, deerOut);
    else boar(w, b, boarOut);
  }
  if (h === 6 && !F.hit && F.turned && !F.held) {
    F.held = 1;
    milestone(w, `Boars snuffle along the new fences all night and find no way in. In the morning the grain stands untouched.`);
  }
  if (h === 6 && F.hit) {
    w.stats.yr = (w.stats.yr || 0) + 1;
    const text = F.broke
      ? `A boar shoulders through ${F.broke === 1 ? 'a fence' : F.broke + ' fences'} and roots through ${plural(F.hit, 'field', 'fields')} in the night.`
      : `Boars root through ${plural(F.hit, 'field', 'fields')} by the woods in the night.`;
    if (!F.raids) milestone(w, `${text} The grain is trampled and torn up. Nobody on ${w.name} has an answer for them yet.`);
    else log(w, text, 'bad');
    F.raids++; F.hit = 0;
    learnHunting(w);
    if (F.raids >= FENCE_LEARN) learnFencing(w);
  }
  if (h === 20 && w.goats) penNight(w, c, wx);
  if (h === 6) { F.raid = 0; F.turned = 0; F.broke = 0; }
}

function wolf(w, b, active) {
  const F = w.fauna, home = F.den;
  if (!active) {
    b.prey = null;
    if (b.goat != null) b.goat = null;
    if (b.pen) b.pen = 0;
    if (b.out && moveBeast(b, (home ? home.x : b.x) + 0.5, (home ? home.y : b.y) + 0.5, WOLF_SPEED)) b.out = 0;
    return;
  }
  if (!b.out) { b.out = 1; b.x = b.px = home.x + 0.5; b.y = b.py = home.y + 0.5; edge(w, b); }
  if (b.pen) { // a hungry winter night: straight for the goat pen, hearth or no hearth
    if (!w.goats) b.pen = 0;
    else {
      const t = penBack(w);
      if (moveBeast(b, t.x, t.y, WOLF_SPEED)) penRaid(w, b);
      return;
    }
  }
  if (b.goat != null) { // running down a goat that strayed out from the herd
    const g = w.goats && w.goats.herd.find((o) => o.id === b.goat);
    if (!g || !goatOpen(w, g)) { b.goat = null; edge(w, b); }
    else {
      if (moveBeast(b, g.x, g.y, WOLF_SPEED) || d2(b.x, b.y, g.x, g.y) < 1.5) takeGoat(w, b, g);
      return;
    }
  }
  if (b.prey != null) {
    const p = w.people.find((o) => o.id === b.prey);
    if (!p || p.dead || p.asleep || !wild(w, p)) { b.prey = null; edge(w, b); }
    else {
      if (moveBeast(b, p.x, p.y, WOLF_SPEED) || d2(b.x, b.y, p.x, p.y) < 1.5) bite(w, b, p);
      return;
    }
  }
  if (!moveBeast(b, b.tx + 0.5, b.ty + 0.5, WOLF_SPEED)) return;
  // at the treeline: watch, and now and then pick out someone alone
  if (rnd(w) < F.bold) {
    const p = lone(w, b);
    if (p) { b.prey = p.id; return; }
    const g = w.goats && strayGoat(w, b);
    if (g) { b.goat = g.id; return; }
  }
  if (--b.h <= 0) edge(w, b);
}

// wolves won't come near the hearth or in among the houses
const wild = (w, p) => d2(p.x, p.y, w.fire.x + 0.5, w.fire.y + 0.5) >= WOLF_SAFE && !nearBuild(w, Math.floor(p.x), Math.floor(p.y), 2);
// a grown villager out on their own, within a wolf's sight and well away from the village
function lone(w, b) {
  let best = null, bd = 36;
  for (const p of w.people) {
    if (p.dead || p.asleep) continue;
    const dd = d2(p.x, p.y, b.x, b.y);
    if (dd >= bd || (ageY(w, p) < 14 && !isLost(w, p)) || !wild(w, p)) continue;
    if (heard(w, p) && !isLost(w, p)) continue; // they can call back to the horn: not alone
    if (w.watch && w.watch.hid === p.id) continue; // no wolf comes near the beach fire
    if (w.people.some((o) => o !== p && !o.dead && !o.asleep && d2(o.x, o.y, p.x, p.y) < 9 && ageY(w, o) >= 14)) continue;
    bd = dd; best = p;
  }
  return best;
}

function bite(w, b, p) {
  const F = w.fauna;
  b.prey = null; b.rest = w.t + 48; // the wolf slinks off and lies low for two days
  w.stats.yw = (w.stats.yw || 0) + 1;
  const first = !F.att;
  F.att++;
  const wasAfraid = F.fear > w.t;
  F.fear = w.t + FEAR_DAYS * TICKS_PER_DAY;
  const after = wasAfraid ? '' : ' For weeks after, nobody stays out past dusk.';
  const helper = w.people.find((o) => o !== p && !o.dead && !o.asleep && ageY(w, o) >= 14 && d2(o.x, o.y, p.x, p.y) < 9);
  const fog = w.wx && w.wx.k === 'fog';
  if (fog) { w.wx.b = (w.wx.b || 0) + 1; F.fa = (F.fa || 0) + 1; }
  const where = fog ? 'out of the fog' : 'at the edge of the trees';
  let text;
  const dog = !helper && dogBy(w, p);
  if (helper) text = `A wolf springs at ${p.name}${fog ? ' out of the fog' : ''}; ${helper.name} runs over and together they drive it off with sticks and stones.`;
  else if (dog) { // the dog flies at it: half wolf itself, and fighting for its own pack
    const D = w.dogs, him = dog.sex === 'f' ? 'her' : 'him';
    D.k++;
    if (rnd(w) < DOG_DIES) {
      D.d = D.d.filter((o) => o !== dog); D.dead++;
      text = `A wolf springs at ${p.name}${fog ? ' out of the fog' : ''}. ${dog.nm} flies at it, and the two roll snarling over and over in the ${fog ? 'grey' : 'grass'} until the wolf breaks away and runs. ${dog.nm} does not get up. ${p.name} carries ${him} home.`;
    } else text = `A wolf springs at ${p.name}${fog ? ' out of the fog' : ''}; ${p.name}'s dog ${dog.nm} flies at its throat, and the wolf breaks off and runs for the trees.`;
    if (D.k === 1) { milestone(w, `${text} That night ${w.name} ${D.dead ? `buries ${dog.nm} by the door` : `gives ${dog.nm} the best bone in the pot`}. A wolf the village raised has turned on its own kind for them.`); return; }
  } else if (rnd(w) < WOLF_KILL) {
    die(w, p, fog ? 'was dragged down by wolves in the fog' : 'was dragged down by wolves');
    text = fog ? `Wolves take ${p.name} in the fog. Nobody saw them come.` : `Wolves take ${p.name} at the edge of the trees.`;
    if (fog) w.wx.x = (w.wx.x || 0) + 1;
    F.kills = (F.kills || 0) + 1;
    if (F.kills === 1) { milestone(w, text + ` ${w.name} learns to fear the dark woods.` + after); return; }
  } else {
    p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
    release(w, p);
    text = `A wolf leaps on ${p.name} ${where}. ${p.sex === 'f' ? 'She' : 'He'} limps home, badly bitten.`;
  }
  if (first) milestone(w, text + after);
  else log(w, text + after, 'bad');
  learnHunting(w);
}

function edge(w, b) {
  const { x: fx, y: fy } = w.fire;
  let best = null, bs = 1e9;
  for (let k = 0; k < 24; k++) {
    const x = fx + ri(w, 33) - 16, y = fy + ri(w, 33) - 16;
    if (tile(w, x, y) !== T.FOREST) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < WOLF_SAFE) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { const t = tile(w, x + a, y + c); return t === T.GRASS || t === T.FIELD || t === T.SAND; })) continue;
    const sc = dd + hash(x, y, b.id) * 60;
    if (sc < bs && lineOfLand(w, b.x, b.y, x + 0.5, y + 0.5)) { bs = sc; best = { x, y }; }
  }
  const home = w.fauna.den || { x: Math.floor(b.x), y: Math.floor(b.y) };
  b.tx = best ? best.x : home.x; b.ty = best ? best.y : home.y;
  b.h = 2 + ri(w, 4);
}

function boar(w, b, active) {
  const F = w.fauna, home = F.lair || { x: Math.floor(b.x), y: Math.floor(b.y) };
  if (!active) {
    b.f = null; b.tx = null;
    if (b.out && moveBeast(b, home.x + 0.5, home.y + 0.5, BOAR_SPEED)) b.out = 0;
    return;
  }
  if (!b.out) { b.out = 1; b.x = b.px = home.x + 0.5; b.y = b.py = home.y + 0.5; b.tx = null; }
  if (b.tx == null) {
    const f = pickCrop(w, b);
    if (f) { b.tx = f.x; b.ty = f.y; b.f = f.id; b.h = 3; }
    else { b.tx = home.x; b.ty = home.y; b.f = null; }
  }
  const off = (b.id % 3) * 0.25 - 0.25;
  if (!moveBeast(b, b.tx + 0.5 + off, b.ty + 0.5 - off, BOAR_SPEED) || b.f == null) return;
  if (--b.h > 0) return;
  const f = w.fields.find((o) => o.id === b.f);
  if (f && f.fence && (f.stage === 'planted' || f.stage === 'ripe')) { delete f.fence; F.broke = (F.broke || 0) + 1; }
  if (f && f.stage === 'planted') { f.growth = Math.max(0, Math.round((f.growth - 0.3) * 10000) / 10000); f.root = 1; F.hit++; }
  else if (f && f.stage === 'ripe') { f.lost = Math.min(0.8, Math.round(((f.lost || 0) + 0.4) * 100) / 100); f.root = 1; F.hit++; }
  b.f = null; b.tx = home.x; b.ty = home.y;
}

// deer graze the meadow by day, a few steps at a time, and bound off when anyone grown comes close
function deer(w, b, active) {
  const F = w.fauna, bed = F.bed || F.mead || { x: Math.floor(b.x), y: Math.floor(b.y) };
  if (!active) {
    b.tx = null; b.run = 0;
    if (b.out && moveBeast(b, bed.x + 0.5, bed.y + 0.5, DEER_FLEE)) b.out = 0;
    return;
  }
  if (!b.out) { b.out = 1; b.x = b.px = bed.x + 0.5; b.y = b.py = bed.y + 0.5; b.tx = null; b.run = 0; }
  let near = null, nd = DEER_SHY;
  const grown = w.t - 14 * TICKS_PER_YEAR;
  for (const p of w.people) {
    if (p.dead || p.asleep || p.born > grown) continue;
    const dd = d2(p.x, p.y, b.x, b.y);
    if (dd < nd) { nd = dd; near = p; }
  }
  if (near) {
    const dx = b.x - near.x, dy = b.y - near.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    let tx = Math.floor(b.x + (dx / dd) * 6), ty = Math.floor(b.y + (dy / dd) * 6);
    const tt = tile(w, tx, ty);
    if (tt === T.WATER || tt === T.BUILD || !lineOfLand(w, b.x, b.y, tx + 0.5, ty + 0.5)) { tx = bed.x; ty = bed.y; }
    b.tx = tx; b.ty = ty; b.h = 1; b.run = 1;
  }
  if (b.tx == null) {
    const m = F.mead || bed;
    b.tx = m.x; b.ty = m.y;
    for (let k = 0; k < 6; k++) {
      const x = m.x + ri(w, 9) - 4, y = m.y + ri(w, 9) - 4;
      if (tile(w, x, y) === T.GRASS && lineOfLand(w, b.x, b.y, x + 0.5, y + 0.5)) { b.tx = x; b.ty = y; break; }
    }
    b.h = 2 + ri(w, 3);
  }
  const off = (b.id % 3) * 0.3 - 0.3;
  const far = d2(b.x, b.y, b.tx + 0.5, b.ty + 0.5) > 16; // out from the trees at a walk, then a step at a time
  if (!moveBeast(b, b.tx + 0.5 + off, b.ty + 0.5 - off, b.run ? DEER_FLEE : far ? SPEED : DEER_SPEED)) return;
  b.run = 0;
  if (--b.h <= 0) b.tx = null;
}

// standing grain beside the trees, where a boar can slip out of cover
function byWoods(w, f) {
  for (let yy = f.y - 2; yy <= f.y + 2; yy++) for (let xx = f.x - 2; xx <= f.x + 2; xx++) if (tile(w, xx, yy) === T.FOREST) return true;
  return false;
}
function pickCrop(w, b) {
  const near = [];
  for (const f of w.fields) if ((f.stage === 'planted' || f.stage === 'ripe') && byWoods(w, f)) near.push(f);
  for (let k = 0; k < 6 && near.length; k++) {
    const f = near[ri(w, near.length)];
    if (!lineOfLand(w, b.x, b.y, f.x + 0.5, f.y + 0.5)) continue;
    if (f.fence && rnd(w) < FENCE_HOLD) { w.fauna.turned = 1; return null; } // the wattle holds: the boar gives up for the night
    return f;
  }
  return null;
}

// ---------- footpaths ----------
// Feet wear the grass on every tile they cross (sampled along the hour's walk); paths are only ever
// counted, never laid, so they run wherever the work actually is: the shore, the fields, the woodlot.
function tread(w, x0, y0, x1, y1) {
  const W = w.wear, dx = x1 - x0, dy = y1 - y0;
  const n = Math.ceil(Math.abs(dx) + Math.abs(dy));
  let last = -1;
  for (let k = 1; k <= n; k++) {
    const x = Math.floor(x0 + (dx * k) / n), y = Math.floor(y0 + (dy * k) / n);
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (i === last) continue;
    last = i;
    if (w.tiles[i] === T.GRASS && W[i] < WEAR_MAX) W[i]++;
  }
}
// a villager's walk for the hour: quicker where the ground is trodden bare
function walk(w, p, tx, ty) {
  const W = w.wear;
  if (!W) return moveToward(p, tx, ty);
  const x0 = p.x, y0 = p.y, cx = Math.floor(x0), cy = Math.floor(y0);
  const on = inMap(cx, cy) && W[idx(cx, cy)] >= PATH_AT;
  const done = moveToward(p, tx, ty, on ? PATH_SPEED : w.wx && w.wx.k === 'fog' ? FOG_SPEED : SPEED);
  if (p.x !== x0 || p.y !== y0) tread(w, x0, y0, p.x, p.y);
  return done;
}
// once a day the grass creeps back over the ground nobody crossed
function paths(w, c) {
  const W = w.wear, heal = WEAR_HEAL[c.season];
  let n = 0, far = -1, fd = -1;
  for (let i = 0; i < W.length; i++) {
    if (!W[i]) continue;
    if (w.tiles[i] !== T.GRASS) { W[i] = 0; continue; } // ploughed, built on or overgrown: the old track is gone
    if (heal) W[i] -= heal;
    if (W[i] >= PATH_AT) {
      n++;
      const x = i % MAP, y = (i - x) / MAP, dd = d2(x, y, w.fire.x, w.fire.y);
      if (dd > fd) { fd = dd; far = i; }
    }
  }
  w.paths = n;
  if (n >= 12 && fd >= 49 && !w.techs.includes('paths')) { // a track that leads somewhere, not just the yard by the fire
    w.techs.push('paths');
    const x = far % MAP, y = (far - x) / MAP;
    let to = 'the fields';
    for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) {
      const t = tile(w, xx, yy);
      if (t === T.SAND) to = 'the beach';
      else if (t === T.FOREST && to !== 'the beach') to = 'the woods';
    }
    const who = elder(w);
    milestone(w, `The grass between the hearth and ${to} is trodden down to bare earth. Nobody laid it out; the feet of ${w.name} did.` +
      (who ? ` ${who.name} notices the walk is quicker on it, and the others follow the track.` : ' The walk is quicker along it.'));
  }
}

// ---------- midsummer ----------
// Once a year, on the longest day, the village stops work early and gathers at a great bonfire:
// a feast from the stores, a ring dance until late, and single folk pair off in the firelight.
function learnMidsummer(w) {
  if (w.techs.includes('midsummer')) return;
  w.techs.push('midsummer');
  w.fest = w.fest || { y: 0, on: -1, n: 0, k: 0 };
  const who = elder(w);
  milestone(w, who
    ? `${who.name} says the longest day should not pass like any other. On midsummer evening the work will stop, the fire will be built high, and all of ${w.name} will dance around it.`
    : `The islanders agree that the longest day should be kept with a great fire and a dance.`);
}
// at the day's reckoning: is today the day? Rain puts it off a few days, a storm until it blows over
function festDay(w, c) {
  if (!w.techs.includes('midsummer')) {
    if (c.doy >= FEST_DAY && c.doy <= FEST_LAST && w.people.length >= FEST_LEARN && w.techs.includes('farming')) learnMidsummer(w);
    else return;
  }
  const F = w.fest;
  if (F.y >= c.year || c.doy < FEST_DAY || c.doy > FEST_LAST || w.people.length < 2) return;
  const wait = c.doy - FEST_DAY, wx = w.wx ? w.wx.k : 'clear';
  if (wx === 'storm' || (wx === 'rain' && wait < 4)) {
    if (wait === 0) log(w, wx === 'storm' ? 'A storm on midsummer day. The bonfire must wait.' : 'Rain on midsummer day. The bonfire is put off until the sky clears.', 'info');
    return;
  }
  F.y = c.year; F.on = c.day; F.wait = wait;
}
// a place in the ring: twelve close round the fire, then wider rings of twenty-four
function festSpot(w) {
  const F = w.fest, n = F.k++;
  let ring = 0, j = n;
  if (j >= 12) { j -= 12; ring = 1 + Math.floor(j / 24); j %= 24; }
  const r = 2.5 + Math.min(ring, 5), [ux, uy] = RING[ring === 0 ? j * 2 : (j + ring) % 24];
  return { k: 'fest', x: Math.round((w.fire.x + ux * r) * 1000) / 1000, y: Math.round((w.fire.y + uy * r) * 1000) / 1000, h: 99, r: ring };
}
function midsummer(w, c, fx) {
  const F = w.fest, h = c.hour, pop = w.people.length;
  if (h === ISLE_SAIL) boatComes(w, c); // on the far isle they know the day, and the smoke of the fire-building
  if (h === FEST_FROM) {
    F.k = 0; F.pairs = [];
    F.wood = Math.min(FEST_WOOD, Math.floor(w.timber / 4));
    w.timber = Math.round((w.timber - F.wood) * 100) / 100;
    if (fx) fx.push({ x: w.fire.x + 0.5, y: w.fire.y - 1, text: 'midsummer', color: 'food' });
  } else if (h === 19) { // after the plain supper, a feast from what the stores can spare
    F.feast = Math.max(0, Math.min(pop * FEST_FEAST, Math.floor(w.food - pop * 60)));
    w.food = Math.round((w.food - F.feast) * 100) / 100;
    if (F.feast >= pop) for (const p of w.people) p.hunger = 0;
  } else if (h === 21) { // late in the dance, the unpaired find each other
    for (const f of w.people) {
      if (f.dead || f.sex !== 'f' || f.partner != null || ageY(w, f) < 17 || rnd(w) >= FEST_PAIR) continue;
      const m = mate(w, f);
      if (!m) continue;
      f.partner = m.id; m.partner = f.id; f.wants = true;
      F.pairs.push(`${f.name} and ${m.name}`);
    }
    if (w.isle && w.isle.boat) isleWed(w);
  } else if (h === 22) {
    F.n = (F.n || 0) + 1;
    const feast = F.feast >= pop ? ' and feast on the best of the stores' : F.feast > 0 ? ' and share what the stores can spare' : ' on empty stomachs';
    const fire = F.wood >= 6 ? 'a towering bonfire' : F.wood > 0 ? 'a small bonfire' : 'the hearth, with no wood to spare for more';
    let text = `${F.wait ? `After ${plural(F.wait, 'day', 'days')} of waiting for the sky to clear, midsummer` : 'Midsummer'} on ${w.name}: ${pop} ${pop === 1 ? 'soul dances' : 'people dance'} around ${fire}${feast}.`;
    const P = F.pairs;
    if (P.length === 1) text += ` ${P[0]} are pledged in the firelight.`;
    else if (P.length > 1) text += ` ${P.length} couples are pledged in the firelight: ${P.slice(0, 3).join(', ')}${P.length > 3 ? ' and more' : ''}.`;
    if (w.isle && w.isle.boat) text += isleFeast(w);
    if (F.n === 1) milestone(w, `${text} The first midsummer fire on ${w.name} burns until nearly midnight.`);
    else if (F.n % 25 === 0) milestone(w, `${text} It is the ${F.n}th midsummer kept on ${w.name}.`);
    else log(w, text, P.length ? 'love' : 'good');
    delete F.pairs; delete F.feast; delete F.wood; delete F.wait;
  }
}

// ---------- the longest night ----------
// On the longest night of the year the whole village sits close round the hearth, children in front,
// and the eldest tells a tale from the island's own past (w.tale: y last year kept, on day, n tales told,
// id teller, told [keys], lore once the fog tale is told, k/j ring slots for grown-ups and children).
// The fog tale is a lesson: once the children have heard it, most keep by the houses when the fog comes in.
export const taleNow = (w, c) => !!(w.tale && w.tale.on === c.day && c.hour >= TALE_FROM && c.hour < TALE_TO);
const TALE_A = [6, 4, 8, 2, 10, 0, 12, 22, 14, 20, 16], TALE_B = [5, 7, 3, 9, 1, 11, 23, 13, 21, 15];
const TALE_ALL = [6, 5, 7, 4, 8, 3, 9, 2, 10, 1, 11, 0, 12, 23, 13, 22, 14, 21, 15, 20, 16]; // all round, but never in front of the teller
const Cap = (s) => s[0].toUpperCase() + s.slice(1);
const yearOf = (tick) => { const y = clock(tick).year; return ORD[y] ? `the ${ORD[y]} year` : `year ${y}`; };
const andJoin = (s) => s.replace(/; ([^;]*)$/, ' and $1').replace(/; /g, ', ');
function taleDay(w, c) {
  if (c.year < TALE_YEAR || c.doy < TALE_DAY || c.doy > TALE_LAST || w.people.length < 2) return;
  if (!w.tale) {
    if (!w.yard) return; // nobody has died yet: there is nothing to remember
    w.tale = { y: 0, on: -1, n: 0, k: 0, j: 0, id: null, told: [], lore: 0 };
  }
  const F = w.tale, wx = w.wx ? w.wx.k : 'clear';
  if (F.y >= c.year || wx === 'storm' || (wx === 'snow' && c.doy < TALE_LAST)) return;
  F.y = c.year; F.on = c.day;
}
function teller(w) {
  const L = w.lost && w.lost.cur, ok = (p, a) => !p.dead && !p.sick && ageY(w, p) >= a && !(w.horn && w.horn.hid === p.id) && !(L && L.id === p.id);
  let best = null;
  for (const p of w.people) if (ok(p, 30) && (!best || p.born < best.born || (p.born === best.born && p.id < best.id))) best = p;
  if (!best) for (const p of w.people) if (ok(p, 14) && (!best || p.born < best.born || (p.born === best.born && p.id < best.id))) best = p;
  return best;
}
// children in a tight ring round the fire, the grown-ups in wider rings behind; the teller stands on the far side
function taleSpot(w, p) {
  const F = w.tale, fx = w.fire.x, fy = w.fire.y, r3 = (v) => Math.round(v * 1000) / 1000;
  if (p.id === F.id) return { k: 'tale', x: fx, y: r3(fy - 1.5), h: 99 };
  const kid = ageY(w, p) < 14;
  let n = kid ? F.j++ : F.k++, ring = 0, list;
  for (;;) {
    list = ring < 2 ? (ring % 2 ? TALE_B : TALE_A) : TALE_ALL;
    if (n < list.length) break;
    n -= list.length; ring++;
  }
  const inner = kid ? 0 : Math.ceil((F.kids || 0) / 11);
  const r = 1.4 + Math.min(ring + inner, 9) * 0.65 + (kid ? 0 : 0.15), [ux, uy] = RING[list[n]];
  return { k: 'tale', x: r3(fx + ux * r), y: r3(fy + uy * r), h: 99 };
}
function longNight(w, c, fx) {
  const F = w.tale, h = c.hour;
  if (h === TALE_FROM) {
    F.k = 0; F.j = 0;
    const t = teller(w);
    F.id = t ? t.id : null;
    F.kids = w.people.filter((p) => !p.dead && !p.sick && ageY(w, p) < 14).length;
    const wood = Math.min(TALE_WOOD, Math.floor(w.timber / 6));
    w.timber = Math.round((w.timber - wood) * 100) / 100;
    if (fx) fx.push({ x: w.fire.x + 0.5, y: w.fire.y - 1, text: 'the longest night', color: 'food' });
  } else if (h === TALE_TELL) {
    const t = aliveId(w, F.id);
    if (t && !t.sick) tellTale(w, t);
  } else if (h === TALE_TO) {
    F.id = null; F.k = 0; F.j = 0;
    delete F.kids;
  }
}
// what the island remembers, most pressing first
function taleChoices(w, t) {
  const out = [], His = Cap(poss(t)), He = Cap(pron(t));
  const fogDead = (w.graves || []).filter((g) => /fog/.test(g.why));
  if ((w.lost && w.lost.n) || (w.fauna && w.fauna.fa) || fogDead.length) {
    const fd = fogDead.length ? ` ${fogDead.length === 1 ? fogDead[0].n : fogDead.slice(0, -1).map((g) => g.n).join(', ') + ' and ' + fogDead[fogDead.length - 1].n} went out into it and did not come home.` : '';
    out.push({ key: 'fog', lore: 1, text: `of the fog: how it comes in off the sea without a sound, how a child who strays past the last house cannot find the way back, and how the wolves walk in it by day.${fd} Nobody fidgets.` });
  }
  const m = /^(\d+) settlers/.exec((w.chronicle[0] && w.chronicle[0].text) || '');
  const founder = t.born < 0 && t.born % TICKS_PER_YEAR === 0 && t.id < 40; // came ashore at the first hour
  if (m) out.push({ key: 'land', text: `of the landing: how ${m[1]} people came over the sea in the first spring with seed grain, stone axes and a pot of embers, and lit the fire they are sitting round.${founder ? ` ${He} was one of them, ${Math.floor(-t.born / TICKS_PER_YEAR)} years old, and ${pron(t)} remembers the smell of the wet ashes.` : ''}` });
  const graves = w.graves || [];
  for (const g of graves) if (g.by && g.dd) out.push({ key: 'g' + g.id, text: `of ${g.n} ${g.by}, who ${andJoin(g.dd)}, and ${g.why} in ${yearOf(g.d)}. The children make ${t.sex === 'f' ? 'her' : 'him'} tell it twice.` });
  const own = t.dd && deedsText(t.dd);
  if (own) out.push({ key: 'me' + t.id, text: `of ${poss(t)} own young days: ${pron(t)} ${andJoin(own)}. ${His} hands show it as ${pron(t)} talks.` });
  for (const p of w.people) if (p !== t && !p.dead && p.dd && p.dd.by) out.push({ key: 'by' + p.id, text: `how ${p.name} came to be called ${p.name} ${byname(p)}: ${pron(p)} ${andJoin(deedsText(p.dd))}. ${p.name} looks into the fire and says nothing.` });
  for (const g of graves) {
    if (g.by) continue;
    const kin = t.mother === g.id ? `${poss(t)} mother, ` : t.father === g.id ? `${poss(t)} father, ` : g.m === t.id || g.f === t.id ? `${poss(t)} own child, ` : '';
    const end = ['The fire cracks, and for a while nobody speaks.', 'The little ones ask where the mound is, and are told.', 'Somebody wipes their eyes on a sleeve.'][g.id % 3];
    out.push({ key: 'g' + g.id, text: `of ${g.n}, ${kin}who ${g.why} in ${yearOf(g.d)}. ${end}` });
  }
  for (const e of w.chronicle) {
    if (w.t - e.t < TICKS_PER_YEAR) break;
    const s = /^Y(\d+) (\w+)/.exec(e.s), first = (/^.*?[.!?](?=\s|$)/.exec(e.text) || [e.text])[0];
    if (!s || first.length < 40 || first.length > 220 || /^\d|is home to|aged \d|longest night|nights are long/.test(first)) continue;
    const y = +s[1];
    out.push({ key: 'c' + e.t, text: `again of the ${s[2].toLowerCase()} of ${ORD[y] ? `the ${ORD[y]} year` : `year ${y}`}: "${first}"` });
  }
  return out;
}
function tellTale(w, t) {
  const F = w.tale, first = !w.techs.includes('tales'), who = `${t.name}${byname(t) ? ' ' + byname(t) : ''}`;
  const all = taleChoices(w, t), fresh = all.filter((o) => !F.told.includes(o.key));
  F.n++;
  if (!fresh.length) {
    log(w, `On the longest night ${w.name} sits close round the hearth, and ${who} tells the old tales again. The children know every word and say them along with ${t.sex === 'f' ? 'her' : 'him'}.`, 'good');
    return;
  }
  const o = rnd(w) < 0.6 ? fresh[0] : fresh[ri(w, fresh.length)];
  F.told.push(o.key);
  if (F.told.length > TALE_KEEP) F.told.shift();
  let text = first
    ? `The nights are long and black, and ${who}, the eldest, says the old days must not be forgotten. On the longest night all of ${w.name} sits close round the hearth, the children in front, and ${t.name} tells ${o.text}`
    : `On the longest night all of ${w.name} sits close round the hearth, the children in front, and ${who} tells ${o.text}`;
  if (!/[.!?"]$/.test(text)) text += '.';
  if (o.lore && !F.lore) { F.lore = 1; text += ` Since that night the children of ${w.name} keep close to the houses when the fog comes in.`; }
  if (first) { w.techs.push('tales'); text += ' From now on a tale is told every year on the longest night.'; }
  milestone(w, text);
}

// ---------- the far isle ----------
// Beyond the sea haze lies another isle, and a towering midsummer fire can be seen from it. Some years
// a dugout paddles over: the guests dance, feast, sleep by the fire, trade hides for grain and leave at
// first light. An islander with nobody to marry at home may be pledged to one of them, who stays.
// Once the island is crowded, a restless single islander may sail away with them instead.
function landing(w) { return landAt(w, w.fire.x, w.fire.y, ISLE_OUT); }
function landAt(w, x, y, out) {
  // the beach nearest (x, y), the water off it, and a spot out to sea straight beyond
  let bi = -1, bd = 1e9;
  for (const i of w.shore || []) { const dd = d2(i % MAP, (i / MAP) | 0, x, y); if (dd < bd) { bd = dd; bi = i; } }
  if (bi < 0) return null;
  const bx = bi % MAP, by = (bi / MAP) | 0;
  const off = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([a, b]) => tile(w, bx + a, by + b) === T.WATER);
  if (!off) return null;
  let sx = bx + off[0], sy = by + off[1];
  for (let k = 0; k < out && inMap(sx + off[0], sy + off[1]) && tile(w, sx + off[0], sy + off[1]) === T.WATER; k++) { sx += off[0]; sy += off[1]; }
  return { bx, by, lx: bx + off[0], ly: by + off[1], sx, sy };
}
function boatComes(w, c) {
  if (c.year < ISLE_YEAR || Math.min(FEST_WOOD, Math.floor(w.timber / 4)) < 6 || (w.isle && w.isle.boat)) return; // only a towering fire is seen
  if (w.isle && w.isle.feud >= c.year) return; // the summer after a raid, nobody from the far isle dares show their face
  if (rnd(w) >= (w.isle ? ISLE_COME * (w.raid && w.raid.lean === c.year ? ISLE_HUNGRY : 1) : ISLE_SEEN)) return;
  const L = landing(w);
  if (!L) return;
  w.isle ||= { n: 0, wed: 0, gone: 0, hides: 0, grain: 0, boat: null };
  const gs = [], n = 2 + ri(w, 3);
  for (let i = 0; i < n; i++) {
    gs.push({ nm: makeName(w), sex: rnd(w) < 0.5 ? 'f' : 'm', a: 18 + ri(w, 20), x: L.sx + 0.5, y: L.sy + 0.5, px: L.sx + 0.5, py: L.sy + 0.5, k: 'boat' });
  }
  w.isle.boat = { ...L, x: L.sx + 0.5, y: L.sy + 0.5, px: L.sx + 0.5, py: L.sy + 0.5, st: 'in', d: c.day, gs };
}
// nobody on the island they could marry
function alone(w, p) {
  if (p.sex === 'f') return !mate(w, p);
  const a = ageY(w, p);
  return !w.people.some((f) => !f.dead && f.sex === 'f' && f.partner == null && ageY(w, f) >= 17 &&
    Math.abs(ageY(w, f) - a) < 14 && !sibling(f, p) && f.mother !== p.id && p.mother !== f.id);
}
// late in the dance: one guest may be pledged to an islander who had nobody, and stays
function isleWed(w) {
  const B = w.isle.boat;
  if (B.st !== 'ashore' || B.wed) return;
  for (const g of B.gs) {
    if (g.k !== 'fest') continue;
    const p = w.people.find((o) => !o.dead && o.sex !== g.sex && o.partner == null && ageY(w, o) >= 17 && ageY(w, o) <= 45 &&
      Math.abs(ageY(w, o) - g.a) < 14 && alone(w, o));
    if (!p || rnd(w) >= ISLE_WED) continue;
    const q = addPerson(w, g.sex, g.a, null, null, null);
    q.name = g.nm; q.x = q.px = g.x; q.y = q.py = g.y;
    q.partner = p.id; p.partner = q.id;
    (p.sex === 'f' ? p : q).wants = true;
    B.gs.splice(B.gs.indexOf(g), 1);
    B.wed = `${g.nm} of the far isle is pledged to ${p.name} and will stay on ${w.name}`;
    w.isle.wed++;
    return;
  }
}
// the feast: the guests trade, and the evening's tale gains a line
function isleFeast(w) {
  const B = w.isle.boat, I = w.isle, pop = w.people.length;
  if (B.st !== 'ashore') return ' Out on the dark water a boat is still paddling toward the fire.';
  const n = B.gs.length + (B.wed ? 1 : 0), R = w.raid, y = clock(w.t).year;
  let text = ` ${n === 2 ? 'Two' : n === 3 ? 'Three' : n === 4 ? 'Four' : n} guests from the far isle dance with them.`;
  const lean = !!(R && R.lean === y);
  const take = lean ? 0 : Math.max(0, Math.min(ISLE_TRADE, Math.floor(w.food - pop * 400)));
  const give = take >= 50 ? 1 + ri(w, 3) : 0;
  if (lean) text += isleGift(w, B, R, y);
  else if (give) {
    w.food = Math.round((w.food - take) * 100) / 100; w.hides = (w.hides || 0) + give;
    I.grain += take; I.hides += give;
    text += ` They trade ${plural(give, 'hide', 'hides')} for ${take} grain.`;
  }
  if (B.wed) text += ` ${B.wed}.`;
  if (I.feud) { text += ' Nobody speaks of the stolen grain.'; delete I.feud; }
  return text;
}
// a thin year on the far isle: the guests come with nothing to trade. Once the islanders have been robbed they
// know what that means, and send each guest home with a sack of grain; that year no dugout comes by night.
function isleGift(w, B, R, y) {
  if (!R.n) return ' They are thin and have brought nothing to trade, and their eyes keep going to the granaries.';
  const want = B.gs.filter((g) => !g.isl).length * GIFT_SACK;
  const give = Math.max(0, Math.min(want, Math.floor(w.food * GIFT_SHARE), Math.floor(w.food - w.people.length * GIFT_KEEP)));
  if (give < GIFT_SACK) return ' They are thin and have brought nothing to trade, and there is no grain to spare for them.';
  if (!w.techs.includes('gifts')) {
    w.techs.push('gifts');
    const who = elder(w), nm = who ? who.name : 'The eldest';
    milestone(w, `${nm} watches the guests at the midsummer fire: sharp cheekbones, no hides, nothing to trade. ${nm} remembers the open granary door of year ${R.y} and says it is better to give the grain by day than lose it by night. ${w.name} learns to send hungry guests home with a gift.`);
  }
  w.food = Math.round((w.food - give) * 100) / 100;
  R.peace = (R.peace || 0) + 1; R.pg = (R.pg || 0) + give; R.yv = (R.yv || 0) + give; R.gift = y;
  B.gift = give;
  for (const g of B.gs) if (!g.isl) g.s = 1;
  return ` They are thin and have brought nothing to trade. Before they sleep, ${give} grain is sacked up for them to carry home.`;
}
function boatLands(w, B) {
  const I = w.isle;
  I.n++;
  B.gs.forEach((g, k) => { // up the beach to wait by the hearth until the fire is lit
    g.x = B.bx + 0.5; g.y = B.by + 0.5;
    g.tx = w.fire.x + 0.5 + (k % 3) - 1; g.ty = w.fire.y + 2.5 + (k >> 1) * 0.5;
    g.k = 'walk';
  });
  if (w.techs.includes('farisle')) return;
  w.techs.push('farisle');
  const who = elder(w), n = B.gs.length;
  milestone(w, `On midsummer day ${who ? who.name : 'a child'} sees a dugout come in over the sea with ${n} strangers at the paddles. ` +
    `They come from an isle beyond the haze, where the midsummer fires of ${w.name} have been seen. Their words are strange, but they have come for the dance. ${w.name} is not alone in the sea.`);
}
// the boat that leaves at first light: perhaps with an islander aboard, perhaps leaving a fever behind
function boatLeaves(w, B) {
  B.st = 'out';
  for (const g of B.gs) { g.x = B.x; g.y = B.y; g.k = 'boat'; }
  const I = w.isle, pop = w.people.length;
  if (pop >= ISLE_CROWD) {
    const p = w.people.find((o) => !o.dead && o.partner == null && !o.sick && !o.hurt && ageY(w, o) >= 17 && ageY(w, o) <= 30 && alone(w, o) &&
      !(w.heal && w.heal.id === o.id) && !(w.horn && w.horn.hid === o.id) && !(w.goats && w.goats.hid === o.id) && !(w.lost && w.lost.cur && w.lost.cur.id === o.id) &&
      !w.people.some((k) => !k.dead && (k.mother === o.id || k.father === o.id) && ageY(w, k) < 14));
    if (p && rnd(w) < ISLE_LEAVE) {
      release(w, p); p.dead = true; I.gone++; unname(w, p);
      B.gs.push({ nm: p.name, sex: p.sex, a: Math.floor(ageY(w, p)), x: B.x, y: B.y, px: p.x, py: p.y, k: 'boat', isl: 1 });
      if (I.gone === 1) milestone(w, `At first light the guests push off for the far isle, and ${p.name} goes with them. Nobody on ${w.name} was left for ${p.sex === 'f' ? 'her' : 'him'} to marry. The first islander to leave ${w.name} waves from the boat until it is gone into the haze.`);
      else log(w, `${p.name} sails away with the guests to the far isle.`, 'info');
    }
  }
  if (w.fever && rnd(w) < ISLE_FEVER) {
    const sick = w.people.filter((o) => !o.dead && !o.sick && !(o.imm > w.t));
    if (sick.length) {
      const p = sick[ri(w, sick.length)];
      fall(w, p, null);
      if (w.fever.n === 1) feverBegins(w, p, `The boat from the far isle is hardly out of sight when ${p.name} begins to shiver.`);
    }
  }
}
function isleHour(w, c) {
  const B = w.isle.boat, h = c.hour;
  B.px = B.x; B.py = B.y;
  for (const g of B.gs) { g.px = g.x; g.py = g.y; }
  if (B.st === 'in') {
    if (moveToward(B, B.lx + 0.5, B.ly + 0.5, BOAT_SPEED)) { B.st = 'ashore'; boatLands(w, B); }
    else for (const g of B.gs) { g.x = B.x; g.y = B.y; }
  } else if (B.st === 'ashore') {
    const fest = w.fest && w.fest.on === c.day && h >= FEST_FROM && h < FEST_TO;
    if (c.day > B.d && h >= 6) { // first light: back down to the boat
      let all = true;
      for (const g of B.gs) { g.k = 'walk'; if (!moveToward(g, B.bx + 0.5, B.by + 0.5, GUEST_SPEED)) all = false; }
      if (all) boatLeaves(w, B);
      return;
    }
    for (const g of B.gs) {
      if (fest && g.r == null) { const s = festSpot(w); g.tx = s.x + 0.5; g.ty = s.y + 0.5; g.r = s.r; } // into the ring, behind the islanders
      else if (!fest && g.r != null) { // the dance is over: they lie down by the embers
        g.tx = Math.round(((g.tx + w.fire.x + 0.5) / 2) * 1000) / 1000; g.ty = Math.round(((g.ty + w.fire.y + 0.5) / 2 + 0.6) * 1000) / 1000; delete g.r;
      }
      g.k = moveToward(g, g.tx, g.ty, GUEST_SPEED) ?(fest ? 'fest' : c.day === B.d && h < FEST_FROM ? 'wait' : 'sleep') : 'walk';
    }
  } else if (moveToward(B, B.sx + 0.5, B.sy + 0.5, BOAT_SPEED)) w.isle.boat = null;
  else for (const g of B.gs) { g.x = B.x; g.y = B.y; }
}

// ---------- raiders ----------
// The far isle has danced at the midsummer fire and seen the granaries. In a thin year there, the dugout comes
// back by night after the harvest, lands below the granary nearest the sea and creeps up to empty it.
// w.raid: n raids, g grain carried off ever, yg this year, d driven off, lean year of hunger, y year of the
// last raid, on the night chosen, cur the raid under way (the boat, rs raiders, ch islanders running after them).
// After a raid w.isle.feud holds the next year: no boat comes to that midsummer fire.
function raidYear(w, c) {
  const I = w.isle;
  if (w.raid) w.raid.yg = w.raid.yv = 0;
  if (!I || !I.n) return;
  w.raid ||= { n: 0, g: 0, yg: 0, d: 0, lean: 0, y: 0, on: null, cur: null, peace: 0, pg: 0, yv: 0, gift: 0 };
  if (rnd(w) < RAID_LEAN / (1 + Math.min(I.wed, 2))) w.raid.lean = c.year; // kin on both shores make them think twice
}
// the finished granary nearest the sea
function raidTarget(w) {
  let best = null, bd = 1e9;
  for (const b of w.buildings) {
    if (b.kind !== 'granary' || b.progress < 1) continue;
    for (const i of w.shore || []) { const dd = d2(i % MAP, (i / MAP) | 0, b.x, b.y); if (dd < bd) { bd = dd; best = b; } }
  }
  return best;
}
function raidNight(w, c, wx) {
  const R = w.raid;
  if (R.lean !== c.year || R.gift === c.year || R.cur || R.on != null || R.y === c.year) return;
  if (!raidSeason(c) || wx === 'storm' || wx === 'snow') return;
  if (w.food < RAID_RICH || (w.isle && w.isle.boat) || !raidTarget(w)) return;
  if (rnd(w) < RAID_NIGHT * (wx === 'fog' ? RAID_FOG : 1)) { R.on = c.day; R.y = c.year; }
}
function raidHour(w, c) {
  const R = w.raid, h = c.hour;
  if (!R.cur) {
    if (h !== RAID_SAIL) return;
    R.on = null;
    const g = raidTarget(w), L = g && landAt(w, g.x, g.y, RAID_OUT);
    if (!L) return;
    const rs = [], n = 3 + ri(w, 3);
    for (let i = 0; i < n; i++) rs.push({ nm: makeName(w), x: L.sx + 0.5, y: L.sy + 0.5, px: L.sx + 0.5, py: L.sy + 0.5, k: 'boat', s: 0 });
    R.cur = { ...L, gx: g.x, gy: g.y, x: L.sx + 0.5, y: L.sy + 0.5, px: L.sx + 0.5, py: L.sy + 0.5, st: 'in', rs, ch: [], take: 0, drop: 0, woke: null, hurt: null, dog: null };
    return;
  }
  const C = R.cur;
  C.px = C.x; C.py = C.y;
  for (const r of C.rs) { r.px = r.x; r.py = r.y; }
  for (const o of C.ch) { o.px = o.x; o.py = o.y; }
  if (C.st === 'in') {
    if (watchSees(w, C)) return;
    if (moveToward(C, C.lx + 0.5, C.ly + 0.5, RAID_ROW)) {
      C.st = 'ashore';
      C.rs.forEach((r, k) => { // up the beach in a file, to crouch along the granary's front
        r.x = C.bx + 0.5; r.y = C.by + 0.5; r.k = 'walk';
        r.tx = C.gx + 0.15 + (k % 4) * 0.25; r.ty = C.gy + 1.15 + (k >> 2) * 0.35;
      });
    } else for (const r of C.rs) { r.x = C.x; r.y = C.y; }
    return;
  }
  if (C.st === 'ashore') {
    // creeping, they make no sound; at the door they do, and from first light anyone near the granary is seen
    if (C.rs.some((r) => r.k === 'wait' || (h >= RAID_DAWN && d2(r.x, r.y, C.gx + 0.5, C.gy + 0.5) < RAID_SEEN))) raidAlarm(w, C, h);
    if (C.st === 'ashore') {
      if (C.rs.every((r) => r.k === 'wait')) { // the door is forced and the sacks filled
        C.take = Math.max(0, Math.min(C.rs.length * RAID_CARRY, Math.floor(w.food * RAID_SHARE)));
        w.food = Math.round((w.food - C.take) * 100) / 100;
        for (const r of C.rs) { r.k = 'back'; r.s = 1; }
        return;
      }
      for (const r of C.rs) {
        if (r.k === 'walk' && moveToward(r, r.tx, r.ty, RAID_SPEED)) r.k = 'wait';
        else if (r.k === 'back' && moveToward(r, C.bx + 0.5, C.by + 0.5, RAID_SPEED)) { r.k = 'boat'; r.x = C.x; r.y = C.y; }
      }
    }
  }
  if (C.st === 'flee') {
    for (const r of C.rs) if (r.k !== 'boat' && moveToward(r, C.bx + 0.5, C.by + 0.5, RAID_RUN)) { r.k = 'boat'; r.x = C.x; r.y = C.y; }
    C.ch.forEach((o, k) => moveToward(o, C.bx + 0.5 + (k - 1) * 0.6, C.by + 0.5 + (C.by > w.fire.y ? -1 : 1), GUEST_SPEED));
  }
  if ((C.st === 'ashore' || C.st === 'flee') && C.rs.every((r) => r.k === 'boat')) { raidOver(w, C); return; }
  if (C.st === 'out') {
    if (C.ch.length) C.ch.forEach((o, k) => moveToward(o, C.bx + 0.5 + (k - 1) * 0.6, C.by + 0.5 + (C.by > w.fire.y ? -1 : 1), GUEST_SPEED));
    if (moveToward(C, C.sx + 0.5, C.sy + 0.5, BOAT_SPEED)) {
      if (C.tell && h < 6) C.st = 'gone'; // nobody knows yet: it is found at first light
      else { if (C.tell) raidTold(w, C); R.cur = null; }
    } else for (const r of C.rs) { r.x = C.x; r.y = C.y; }
  } else if (C.st === 'gone' && h >= 6 && h < RAID_SAIL) { raidTold(w, C); R.cur = null; }
}
// a door creaks, a dog barks, or someone up before dawn sees shapes at the granary
function raidAlarm(w, C, h) {
  const gx = C.gx + 0.5, gy = C.gy + 0.5, p = waker(w, gx, gy, RAID_NEAR);
  if (!p) return;
  const dog = dogNear(w, gx, gy, RAID_NEAR), fog = w.wx && w.wx.k === 'fog';
  const dawn = h >= RAID_DAWN && h < RAID_SAIL;
  const odds = dawn ? 1 : RAID_WAKE * (dog ? 3 : 1) * (fog ? 0.5 : 1);
  if (rnd(w) >= odds) return;
  C.st = 'flee'; C.woke = p.id;
  if (dawn) C.dawn = 1;
  else if (dog) { C.dog = dog.nm; w.dogs.p++; }
  if (C.take) { // half the sacks are flung down in the dark
    C.drop = Math.floor(C.take / 2); C.take -= C.drop;
    w.food = Math.round((w.food + C.drop) * 100) / 100;
    C.rs.forEach((r, k) => { if (k & 1) r.s = 0; });
  }
  if (rnd(w) < RAID_HURT) { p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY; C.hurt = p.id; }
  const run = C.hurt == null ? [p] : [], skip = [p.id];
  while (run.length < RAID_CHASE) {
    const q = waker(w, gx, gy, 400, skip);
    if (!q) break;
    run.push(q); skip.push(q.id);
  }
  C.ch = run.map((q) => {
    const b = w.buildings.find((o) => o.id === q.home);
    return { id: q.id, nm: q.name, x: b.x + 0.5, y: b.y + 0.5, px: b.x + 0.5, py: b.y + 0.5 };
  });
  for (const r of C.rs) if (r.k !== 'boat') r.k = 'run';
}
function raidOver(w, C) {
  const R = w.raid;
  C.st = 'out';
  R.n++; R.g += C.take; R.yg += C.take;
  if (w.isle) w.isle.feud = clock(w.t).year + 1;
  if (C.woke == null) C.tell = 1;
  else { R.d++; raidTold(w, C); }
}
function raidTold(w, C) {
  const R = w.raid, p = aliveId(w, C.woke), hurt = aliveId(w, C.hurt);
  let text;
  if (C.woke == null) {
    const f = waker(w, C.gx + 0.5, C.gy + 0.5, 1e9) || elder(w);
    text = `In the grey of the morning ${f ? f.name : 'someone'} finds the granary door hanging open and the floor swept half bare: ${C.take} grain are gone. Down on the beach there are footprints and the long groove of a keel, and only the far isle has a boat.`;
  } else {
    const who = p ? p.name : 'Someone';
    text = C.dawn ? `At first light ${who} steps out to see strangers at the granary door. ${who} snatches a brand from the hearth and shouts the village awake.`
      : `${C.dog ? `In the dead of night ${C.dog} starts up barking at the granary.` : 'In the dead of night the granary door creaks.'} ${who} runs out with a brand from the hearth and shouts the village awake.`;
    if (hurt) text += ` A dark figure swings a paddle at ${hurt.name} and knocks ${hurt.sex === 'f' ? 'her' : 'him'} flat.`;
    text += ` Shapes ${C.take || C.drop ? 'with sacks on their backs ' : ''}scatter for the beach${C.drop ? `, flinging down half of what they carry` : ''}, and a dugout slides off into the night.`;
    text += C.take ? ` ${C.take} grain are gone.` : ' They get away with nothing.';
  }
  if (R.n === 1) milestone(w, `${text} The far isle has had a thin year, and its people have not forgotten the granaries they saw at midsummer. Next summer nobody on ${w.name} will look for their boat.`);
  else log(w, text, 'bad');
}

// ---------- the beach watch ----------
// Robbed twice, the village stops trusting to luck. On autumn and early-winter nights, the season the raiders
// come in, one islander in turn sits up by a driftwood fire on the beach below the granary nearest the sea.
// A dugout seen creeping in is shouted at and turns back before it lands; nothing is taken and no feud follows.
// w.watch: hid tonight's watcher, last the one sleeping it off, x/y the beach, n nights kept, s boats turned back,
// k turn (whose night it is next).
const raidSeason = (c) => c.season >= 2 && c.doy < DAYS_PER_SEASON * 3 + 45;
export const watchOn = (w) => !!(w.watch && w.watch.hid != null);
function watchable(w, p) {
  if (p.dead || p.sick || p.hurt || isLost(w, p) || p.home == null) return false;
  const a = ageY(w, p);
  if (a < 16 || a >= 56) return false;
  if ((w.goats && w.goats.hid === p.id) || (w.heal && w.heal.id === p.id) || (w.horn && w.horn.hid === p.id)) return false;
  return !(p.haul || (p.task && (p.task.k === 'hunt' || p.task.k === 'haul')));
}
function learnWatch(w) {
  const g = raidTarget(w), L = g && landAt(w, g.x, g.y, RAID_OUT);
  const who = elder(w);
  if (!L || !who) return;
  w.techs.push('watch');
  w.watch = { hid: null, last: null, x: L.bx, y: L.by, n: 0, s: 0, k: 0 };
  milestone(w, `${w.raid.n === 2 ? 'Twice' : 'Again and again'} now raiders from the far isle have come for the granary in the night. ${who.name} walks down to the beach where their dugout ran ashore, ` +
    `piles up driftwood above the tide line and says that from now on, from the harvest to midwinter, somebody will sit up there by a fire and watch the sea. ${w.name} keeps a beach watch.`);
}
function watchHour(w, c) {
  const W = w.watch, h = c.hour;
  if (h === WATCH_TO && W.hid != null) { W.last = W.hid; W.hid = null; }
  if (h === WATCH_REST) W.last = null;
  if (W.hid != null) {
    const p = aliveId(w, W.hid);
    if (!p || p.sick || p.hurt || isLost(w, p)) { if (p && p.task && p.task.k === 'watch') release(w, p); W.hid = null; }
  }
  if (h !== WATCH_FROM || !raidSeason(c)) return;
  const wx = w.wx && w.wx.k;
  if (wx === 'storm' || wx === 'snow' || w.timber < WATCH_WOOD || (w.tale && w.tale.on === c.day)) return;
  const g = raidTarget(w), L = g && landAt(w, g.x, g.y, RAID_OUT);
  if (!L) return;
  const can = w.people.filter((p) => p.id !== W.last && watchable(w, p));
  if (!can.length) return;
  can.sort((a, b) => a.id - b.id);
  const p = can[W.k % can.length];
  W.k = (W.k + 1) % 9973;
  W.x = L.bx; W.y = L.by; W.hid = p.id; W.n++;
  w.timber = Math.round((w.timber - WATCH_WOOD) * 100) / 100;
}
// the dugout creeps in toward the beach: does the one at the fire see it?
function watchSees(w, C) {
  const W = w.watch;
  if (!W || W.hid == null || C.bx !== W.x || C.by !== W.y) return false;
  const p = aliveId(w, W.hid);
  if (!p || d2(p.x, p.y, W.x + 0.5, W.y + 0.5) >= WATCH_AT) return false;
  if (rnd(w) >= WATCH_SEE * (WATCH_DIM[w.wx && w.wx.k] || 1)) return false;
  C.st = 'out'; C.ch = []; C.seen = p.id;
  W.s++;
  const fog = w.wx && w.wx.k === 'fog';
  const text = `${fog ? 'Through the fog' : 'Out of the dark'} ${p.name}, sitting up by the beach fire, sees a dugout creeping in, low in the water and full of hooded shapes. ` +
    `${p.name} snatches a burning branch from the fire, runs down to the water's edge and shouts. The paddles stop; the boat swings round and slides back into the night. Not a grain is lost.`;
  if (W.s === 1) milestone(w, `${text} The far isle knows now that ${w.name} is watching.`);
  else log(w, text, 'good');
  return true;
}

// ---------- fences ----------
function learnFencing(w) {
  if (w.techs.includes('fencing') || !w.techs.includes('farming') || !w.techs.includes('woodcut')) return;
  w.techs.push('fencing');
  const who = elder(w);
  milestone(w, who
    ? `${who.name} drives a row of stakes along the trampled grain and weaves hazel rods between them. ${w.name} learns to fence its fields.`
    : `The islanders weave hazel between stakes to keep the boars from the grain. ${w.name} learns to fence its fields.`);
}
// fields within two tiles of the trees, where the boars come out; relisted whenever a tile changes
function exposed(w) {
  const c = cacheOf(w);
  if (c.exTv !== c.tv || c.exN !== w.fields.length) {
    c.exTv = c.tv; c.exN = w.fields.length; c.ex = [];
    for (const f of w.fields) if (byWoods(w, f)) c.ex.push(f);
  }
  return c.ex;
}
function fenceTask(w, p, c) {
  if (c.season === 3 || w.timber < FENCE_COST + HOUSE_COST || !w.techs.includes('fencing')) return null;
  const f = nearest(exposed(w), p, (o) => !o.fence && w.res['g' + o.id] == null);
  return f && { k: 'fence', key: 'g' + f.id, x: f.x, y: f.y, h: FENCE_WORK };
}

// ---------- the hunt ----------
const elder = (w) => w.people.filter((p) => !p.dead && ageY(w, p) >= 14).sort((a, b) => a.born - b.born || a.id - b.id)[0];
function learnHunting(w) {
  if (w.techs.includes('hunting')) return;
  w.techs.push('hunting');
  w.hides = w.hides || 0;
  const who = elder(w);
  milestone(w, who
    ? `${who.name} lashes a flint point to a long ash pole. If the beasts come for ${w.name}, ${w.name} will go out after them. The islanders learn to hunt.`
    : `The islanders lash flint to ash poles and learn to hunt.`);
}
// what is worth tracking today: the pack in winter or after it has drawn blood, otherwise the boars
function quarry(w, c) {
  const F = w.fauna;
  let wolves = 0, boars = 0, deer = 0;
  for (const b of w.beasts) if (b.k === 'wolf') wolves++; else if (b.k === 'deer') deer++; else boars++;
  if (F.den && wolves >= HUNT_KEEP && (c.season === 3 || F.fear > w.t)) return 'wolf';
  if (F.lair && boars >= HUNT_KEEP) return 'boar';
  if (F.mead && deer >= DEER_KEEP && c.season === 2 && !(F.dy && F.dy[0] === c.year && F.dy[1] >= DEER_YEAR)) return 'deer'; // the autumn deer hunt, when they are fat from summer grass
  return null;
}
// can a hunter setting out now reach the lair and finish before the village comes in for the evening?
function inDaylight(w, p, c, x, y) {
  const dusk = w.fauna.fear > w.t ? 16 : 18;
  return c.hour + Math.ceil(Math.sqrt(d2(x + 0.5, y + 0.5, p.x, p.y)) / SPEED) + HUNT_WORK < dusk;
}
function hunt(w, p, c) {
  if (!w.fauna || !w.techs.includes('hunting') || c.hour > 10 || ageY(w, p) > 55) return null;
  const F = w.fauna;
  const lead = w.res.h0 != null ? w.people.find((o) => o.id === w.res.h0) : null;
  if (lead) { // a hunter rarely goes alone: the next free hand follows the trail
    const t = lead.task;
    if (w.res.h1 != null || !t || t.k !== 'hunt' || !inDaylight(w, p, c, t.x, t.y) || !lineOfLand(w, p.x, p.y, t.x + 0.5, t.y + 0.5)) return null;
    return { k: 'hunt', key: 'h1', x: t.x, y: t.y, h: HUNT_WORK + 2, q: t.q };
  }
  if ((F.hunt || 0) > w.t || (w.wx && w.wx.k === 'fog')) return null; // no trail can be followed in fog
  const q = quarry(w, c);
  if (!q) return null;
  const at = q === 'wolf' ? F.den : q === 'deer' ? F.mead : F.lair;
  if (d2(at.x, at.y, w.fire.x, w.fire.y) > HUNT_REACH || !inDaylight(w, p, c, at.x, at.y) || !lineOfLand(w, p.x, p.y, at.x + 0.5, at.y + 0.5)) return null;
  F.hunt = w.t + HUNT_GAP * TICKS_PER_DAY;
  return { k: 'hunt', key: 'h0', x: at.x, y: at.y, h: HUNT_WORK, q };
}
// the leader's hours at the lair are up: the beast is taken, gets away, or fights back
function strike(w, p, t) {
  const F = w.fauna, q = t.q;
  const herd = w.beasts.filter((b) => b.k === q);
  if (herd.length < (q === 'deer' ? DEER_KEEP : HUNT_KEEP)) return;
  const mate = w.people.find((o) => o !== p && !o.dead && o.task && o.task.key === 'h1' && d2(o.x, o.y, p.x, p.y) < 9);
  const odds = (q === 'boar' ? 0.5 : q === 'deer' ? 0.45 : 0.35) * (mate ? 1 : 0.55);
  const harm = (q === 'boar' ? 0.08 : q === 'deer' ? 0.02 : 0.1) * (mate ? 1 : 2);
  const r = rnd(w), who = mate ? `${p.name} and ${mate.name}` : p.name;
  if (q === 'deer') {
    if (r < odds) {
      const prey = herd[herd.length - 1];
      w.beasts = w.beasts.filter((b) => b !== prey);
      w.hides = (w.hides || 0) + 1;
      w.stats.yk = (w.stats.yk || 0) + 1;
      p.haul = q;
      F.sd = (F.sd || 0) + 1;
      const yr = clock(w.t).year;
      F.dy = F.dy && F.dy[0] === yr ? [yr, F.dy[1] + 1] : [yr, 1];
      const text = `${who} ${mate ? 'creep' : 'creeps'} up through the long grass downwind and ${mate ? 'bring' : 'brings'} down a deer.`;
      if (F.sd === 1) milestone(w, `${text} The first venison on ${w.name}; the hide is pegged out to dry and the bones are kept for needles.`);
      else log(w, text, 'good');
      deed(w, p, 'd'); deed(w, mate, 'd');
    } else if (r < odds + harm) {
      p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
      log(w, `A stag lashes out at ${p.name} with its hooves and crashes away. ${p.sex === 'f' ? 'She' : 'He'} limps home empty-handed.`, 'bad');
    } else if (r < odds + harm + 0.3) log(w, `${who} ${mate ? 'stalk' : 'stalks'} the deer all morning, but a doe barks and the herd is gone into the trees.`, 'info');
    return;
  }
  if (r < odds) {
    const prey = herd.find((b) => !b.out) || herd[herd.length - 1];
    w.beasts = w.beasts.filter((b) => b !== prey);
    w.hides = (w.hides || 0) + 1;
    w.stats.yk = (w.stats.yk || 0) + 1;
    p.haul = q;
    const n = q === 'boar' ? (F.sb = (F.sb || 0) + 1) : (F.sw = (F.sw || 0) + 1);
    const text = q === 'boar'
      ? `${who} ${mate ? 'spear' : 'spears'} a boar in its wallow and ${mate ? 'carry' : 'drags'} it home.`
      : `${who} ${mate ? 'track' : 'tracks'} the pack to its den and ${mate ? 'kill' : 'kills'} a wolf. Its pelt will hang by the fire.`;
    if (n === 1) milestone(w, q === 'boar' ? `${text} The first boar taken on ${w.name}; there is roast pork at the fire tonight.` : `${text} The first wolf ever slain on ${w.name}.`);
    else log(w, text, 'good');
    const dk = q === 'boar' ? 'b' : 'w';
    deed(w, p, dk); deed(w, mate, dk);
  } else if (r < odds + harm) {
    const fatal = rnd(w) < (mate ? 0.1 : 0.3);
    const beast = q === 'boar' ? 'A boar' : 'A wolf';
    if (fatal) die(w, p, q === 'boar' ? 'was gored by a boar' : 'was killed hunting wolves');
    else p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
    log(w, fatal
      ? `${beast} turns on ${p.name} at the lair. ${mate ? mate.name + ' brings the body home.' : 'Nobody was there to help.'}`
      : `${beast} turns on ${p.name} at the lair. ${p.sex === 'f' ? 'She' : 'He'} comes home ${q === 'boar' ? 'gored' : 'bitten'}, empty-handed.`, 'bad');
  } else if (q === 'wolf') log(w, `${who} ${mate ? 'follow' : 'follows'} wolf tracks to the den, but the pack slips away into the trees.`, 'info');
}

// ---------- fever ----------
// A fever that comes mostly in the cold months, when everyone is shut in together. It runs through a
// house first, then out into the village; it is the very young and the old that it takes. Those who
// get up again are spared it for a few years, so each outbreak burns itself out.
function fall(w, p, fx) {
  const F = w.fever;
  p.sick = w.t + (FEVER_DAYS + ri(w, 5)) * TICKS_PER_DAY;
  F.n++; F.all = (F.all || 0) + 1;
  w.stats.yi = (w.stats.yi || 0) + 1;
  if (fx) fx.push({ x: p.x, y: p.y - 0.5, text: 'fever', color: 'sick' });
}
function feverBegins(w, p, how) {
  const F = w.fever;
  F.k++; F.who = p.name;
  if (F.k === 1) milestone(w, `A fever comes to ${w.name}. ${how} Nobody on ${w.name} has seen its like, and nobody knows what to do but keep the fire going and wait.`);
  else log(w, `The fever is back. ${how}`, 'bad');
}
function fever(w, c, fx) {
  const F = w.fever, pop = w.people.length;
  // fevers break, or kill
  let sick = 0;
  for (const p of w.people) {
    if (p.dead) continue;
    if (p.imm && p.imm <= w.t) delete p.imm;
    if (p.sick && p.sick <= w.t) { delete p.sick; p.imm = w.t + FEVER_IMMUNE * TICKS_PER_YEAR; continue; }
    if (!p.sick) continue;
    const a = ageY(w, p);
    let risk = 0.002;
    if (a < 3) risk += 0.02; else if (a < 6) risk += 0.008;
    if (a > 55) risk += 0.006 + (a - 55) * 0.001;
    if (p.hunger > 4) risk *= 2;
    if (w.stats.cold) risk *= 2;
    if (p.tend === c.day - 1) risk *= HERB_FEVER; // willow bark and broth, spooned in yesterday
    if (rnd(w) < risk) { F.d++; F.lost = (F.lost || 0) + 1; die(w, p, 'died of the fever'); continue; }
    sick++;
  }
  if (!sick && F.n) { // the last one is up again: the outbreak is over
    const year = clock(w.t).year;
    let text = F.d
      ? `The fever leaves ${w.name}. It laid ${plural(F.n, 'islander', 'islanders')} low and took ${F.d} of them.`
      : `The fever leaves ${w.name}. ${F.n === 1 ? `${F.who} is up again` : F.n === 2 ? 'Both who fell ill are up again' : `All ${F.n} who fell ill are up again`}, and nobody was lost.`;
    if (F.t && w.heal && w.heal.nm) text += ` ${w.heal.nm} went from bed to bed with willow bark ${F.t === 1 ? 'once' : `${F.t} times`}.`;
    delete F.t;
    if (F.d >= 3) milestone(w, `${text} They will speak of the fever of year ${year} for a long time.`);
    else if (F.k === 1) milestone(w, text);
    else log(w, text, F.d ? 'bad' : 'good');
    F.n = F.d = 0; delete F.who;
  }
  if (sick) { // it passes through a house first, then out into the village
    const at = new Map();
    for (const p of w.people) if (p.sick && !p.dead && p.home != null) at.set(p.home, (at.get(p.home) || 0) + 1);
    const k = c.season === 3 ? 1.4 : c.season === 1 ? 0.6 : 1;
    const town = (FEVER_TOWN * sick) / Math.max(1, pop);
    const caught = [];
    for (const p of w.people) {
      if (p.dead || p.sick || p.imm) continue;
      const h = p.home != null ? at.get(p.home) || 0 : 0;
      if (rnd(w) < Math.min(0.6, (h * FEVER_HOUSE + town) * k)) caught.push(p);
    }
    for (const p of caught) fall(w, p, fx);
    return;
  }
  // a fever takes hold more easily where people are packed in, and where there are more of them
  if (pop < 4) return;
  const homes = new Set();
  for (const p of w.people) if (!p.dead && p.home != null) homes.add(p.home);
  const crowd = pop / Math.max(1, homes.size) / 4;
  const vermin = w.rats ? 1 + RAT_FEVER * Math.min(1, w.rats.n / (RAT_SWARM * 1.5)) : 1;
  if (rnd(w) >= FEVER_SEED * crowd * (1 + pop / 50) * FEVER_SEASON[c.season] * vermin) return;
  const open = w.people.filter((p) => !p.dead && !p.imm);
  if (!open.length) return;
  const p = open[ri(w, open.length)], a = ageY(w, p);
  fall(w, p, fx);
  feverBegins(w, p, a < 14
    ? `${p.name} will not eat, burns hot to the touch and cries through the night.`
    : `${p.name} wakes burning hot, shivering, and cannot stand.`);
}

// ---------- rats ----------
// Once the stores grow fat, rats find them (w.rats: n colony, y eaten this year, all eaten ever,
// top largest colony, k times they have come, sw swarm noticed). They breed fast while grain lies in
// heaps in the open, slower when it is all under a roof, and die back in a winter with nothing left
// out. The island can only feed so many: a few for every granary they nest under, and never more
// than the stores will carry. Every rat eats and fouls a little grain each day, and where they
// swarm a fever takes hold more easily. Nobody on the island has an answer to them yet.
function rats(w, c) {
  const open = w.food - storeCap(w);
  const R = w.rats;
  if (!R || R.n <= 0) {
    if (c.year < 2 || !w.techs.includes('granary') || (open < RAT_HEAP && w.food < RAT_RICH) || rnd(w) >= RAT_COME) return;
    if (!R) {
      w.rats = { n: RAT_FIRST, y: 0, all: 0, top: RAT_FIRST, k: 1, sw: 0 };
      const who = elder(w);
      milestone(w, `Something has been at the grain: husks strewn over the granary floor, droppings in the chaff, a little trail worn into the grass. At dusk ${who ? who.name : 'someone'} sees a grey shape run along the granary beam and drop into the heap. Rats have come to ${w.name}, and nobody knows how they came ashore.`);
    } else {
      R.n = RAT_FIRST; R.k++; R.sw = 0;
      log(w, 'The rats are back. Fresh droppings in the granary, and the heap is tunnelled through.', 'bad');
    }
    return;
  }
  let g;
  if (c.season < 3) g = open > 0 ? RAT_BREED : RAT_BREED_DRY;
  else g = open > 0 ? RAT_BREED_DRY : RAT_WINTER;
  if (c.season === 3 && (w.wx.k === 'cold' || w.wx.k === 'snow')) g = Math.min(g, RAT_FROST);
  const d = R.n * g, whole = Math.floor(d);
  R.n += whole + (rnd(w) < d - whole ? 1 : 0);
  let gran = 0;
  for (const b of w.buildings) if (b.kind === 'granary' && b.progress >= 1) gran++;
  const loose = w.food - sealed(w); // grain sealed in jars is out of their reach
  const cap = Math.min(RAT_MAX, RAT_BASE + RAT_PER_GRANARY * gran, Math.floor(loose / RAT_FOOD));
  if (R.n > cap) R.n -= Math.ceil((R.n - cap) * 0.25); // the hungry ones fight, starve or wander off
  if (R.n <= 0) {
    R.n = 0;
    log(w, `The last of the rats ${c.season === 3 ? 'die in the frost' : 'starve in the empty stores'}. For now the granary is quiet.`, 'good');
    return;
  }
  if (R.n > R.top) R.top = R.n;
  const eat = Math.max(0, Math.min(loose, Math.round(R.n * RAT_EAT * 100) / 100));
  w.food = Math.round((w.food - eat) * 100) / 100;
  R.y = Math.round((R.y + eat) * 100) / 100;
  R.all = Math.round((R.all + eat) * 100) / 100;
  if (R.n >= RAT_SWARM && !R.sw) {
    R.sw = 1;
    const k = w.people.find((p) => !p.dead && ageY(w, p) < 14 && p.home != null);
    if (!R.told) { R.told = 1; milestone(w, `The rats have multiplied past counting. At night the granary floor seethes, they run along the rafters and squeal in the thatch${k ? `, and ${k.name} wakes screaming with one on the blanket` : ''}. Whatever grain they do not eat, they foul.`); }
    else log(w, 'The rats swarm in the stores again. The thatch squeaks all night.', 'bad');
  }
  if (R.n < RAT_SWARM / 4) R.sw = 0;
}

// ---------- pottery ----------
// Once the rats have eaten enough of the stores, someone digs clay from the bank above the beach and
// coils it into jars. From then on there is one potter (w.pot: id, nm, k potters so far, kx/ky the kiln,
// cx/cy the clay bank, c lumps of clay, wet jars shaped but not fired, sd day of the last jar, j whole
// jars in use, made, broke, f firings, lf tick of the last firing). In dry weather from spring to autumn
// the potter digs clay and shapes one jar a day; with a batch ready, a morning's firing in the kiln burns
// timber and cracks some of them. Grain sealed in jars is out of the rats' reach. Jars break with use.
export const sealed = (w) => (w.pot ? Math.min(w.food, w.pot.j * JAR_HOLD) : 0);
function findKilnSite(w) {
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 2; y < MAP - 3; y++) for (let x = 2; x < MAP - 2; x++) {
    const tt = tile(w, x, y), below = tile(w, x, y + 1);
    if ((tt !== T.GRASS && tt !== T.FOREST) || (below !== T.GRASS && below !== T.FOREST && below !== T.FIELD && below !== T.SAND)) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 16 || dd > 81 || nearBuild(w, x, y, 1)) continue;
    const sc = Math.abs(Math.sqrt(dd) - 6) + (tt === T.FOREST ? 1 : 0) + hash(x, y, w.seed + 29) * 2;
    if (sc >= bs || !lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
function clayBank(w, k) {
  let best = null, bd = 1e9;
  for (const i of w.shore || []) {
    const x = i % MAP, y = (i - x) / MAP, dd = d2(x, y, k.x, k.y);
    if (dd < bd && lineOfLand(w, x + 0.5, y + 0.5, k.x + 0.5, k.y + 1.5)) { bd = dd; best = { x, y }; }
  }
  return best;
}
// the potter: a grown child or housemate of the last one first, then whoever is nearest 24; never the
// healer, the goatherd or the keeper of the horn, who have their own work
function pickPotter(w, old) {
  let best = null, bs = 1e9;
  const busy = [w.heal && w.heal.id, w.goats && w.goats.hid, w.horn && w.horn.hid];
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || p === old || a < 16 || a > 45 || p.sick || busy.includes(p.id)) continue;
    const tier = old && (p.mother === old.id || p.father === old.id) ? 0 : old && old.home != null && p.home === old.home ? 1 : 2;
    const sc = tier * 100 + Math.abs(a - 24);
    if (sc < bs) { bs = sc; best = p; }
  }
  return best;
}
function learnPottery(w, c) {
  if (c.season === 3 || !w.rats || w.rats.all < POT_LEARN || !w.techs.includes('granary') || rnd(w) >= POT_SPARK) return;
  const who = pickPotter(w, null), k = findKilnSite(w), cb = k && clayBank(w, k);
  if (!who || !k || !cb) return;
  const i = idx(k.x, k.y);
  w.timber += w.wood[i]; w.wood[i] = 0;
  setTile(w, i, T.BUILD);
  w.pot = { id: who.id, nm: who.name, k: 1, kx: k.x, ky: k.y, cx: cb.x, cy: cb.y, c: 0, wet: 0, sd: -1, j: 0, made: 0, broke: 0, f: 0, lf: -1 };
  w.techs.push('pottery');
  const P = pron(who), Pc = P[0].toUpperCase() + P.slice(1);
  milestone(w, `Sick of sweeping rat droppings out of the grain, ${who.name} digs sticky grey clay from the bank above the beach, rolls it into ropes and coils them into a jar with a fat belly and a narrow neck. ${Pc} heaps turf and clay into a dome beside the village to fire it in. Grain sealed in a jar under a clay lid is out of the rats' reach. ${w.name} learns to make pots.`);
}
function potDay(w, c) {
  if (w.pot === null) { learnPottery(w, c); return; }
  const P = w.pot;
  if (c.doy === 0 && P.j > 0) { // jars knocked over, chipped, dropped on the granary floor
    let b = 0;
    for (let k = 0; k < P.j; k++) if (rnd(w) < POT_BREAK) b++;
    if (b) { P.j -= b; P.broke += b; log(w, `${plural(b, 'jar was', 'jars were')} broken over the year. ${P.j} still stand in the stores.`, 'info'); }
  }
  const cur = aliveId(w, P.id);
  const busy = cur && ((w.heal && w.heal.id === cur.id) || (w.goats && w.goats.hid === cur.id) || (w.horn && w.horn.hid === cur.id));
  if (cur && !busy && ageY(w, cur) < POT_OLD) return;
  const next = pickPotter(w, cur || (P.id != null ? { id: P.id, home: null } : null)); // the dead potter's children still come first
  if (!next) { if (!cur) P.id = null; return; }
  const before = P.nm;
  P.id = next.id; P.nm = next.name; P.k++;
  if (cur && busy) log(w, `${cur.name} has no time for the clay now, and ${next.name} takes over the kiln.`, 'info');
  else if (cur) log(w, `${cur.name}'s fingers are too stiff for the coils. ${next.name} takes over the kiln.`, 'info');
  else log(w, `With ${before} gone, ${next.name} takes up the clay. ${w.name} has its ${ORD[P.k] || `${P.k}th`} potter.`, 'info');
}
// the potter's own work, on dry days from spring to autumn
function potTask(w, p, c) {
  const P = w.pot;
  if (!P || P.id !== p.id || c.season === 3 || c.hour > 13) return null;
  const wx = w.wx ? w.wx.k : 'clear';
  if (wx === 'rain' || wx === 'storm' || wx === 'fog' || wx === 'snow') return null;
  const late = c.doy >= DAYS_PER_SEASON * 3 - 10; // fire what is left before the winter damp gets into it
  if ((P.wet >= POT_BATCH || (late && P.wet >= 3)) && c.hour <= 10 && wx !== 'cold' && w.timber >= POT_WOOD * 2) return { k: 'fire', x: P.kx, y: P.ky + 1, h: 6 };
  const want = Math.min(POT_MAX, Math.ceil(w.food / JAR_HOLD));
  if (P.j + P.wet >= want || P.wet >= POT_BATCH * 2 || c.day - P.sd < POT_GAP || late) return null;
  if (P.c >= 1) return { k: 'shape', x: P.kx, y: P.ky + 1, h: 4 };
  return { k: 'clay', x: P.cx, y: P.cy, h: 3 };
}
function fireKiln(w, p) {
  const P = w.pot, n = P.wet;
  if (!n || w.timber < POT_WOOD) return 0;
  let ok = 0;
  for (let k = 0; k < n; k++) if (rnd(w) >= POT_CRACK) ok++;
  w.timber = Math.round((w.timber - POT_WOOD) * 100) / 100;
  P.wet = 0; P.j += ok; P.made += ok; P.broke += n - ok; P.f++; P.lf = w.t;
  if (P.f === 1) milestone(w, `${p.name} rakes the embers off the kiln and lifts out the first jars, still warm: ${ok} of ${n} come out whole and ring like stone when tapped. The grain is poured in and the lids are sealed with wet clay. For the first time the rats run over the jars and cannot get in.`);
  else if (!ok) log(w, `${p.name} opens the kiln to a heap of sherds: all ${n} jars cracked in the fire.`, 'bad');
  else log(w, `${p.name} opens the kiln: ${ok} of ${n} jars come out whole${n - ok ? `, ${n - ok} cracked in the fire` : ''}.`, 'good');
  return ok;
}

// ---------- herb lore ----------
// After the fever has taken someone (or worn the village out nursing it), one islander goes looking for
// a cure at the wood's edge. From then on there is always one healer on the island (w.heal: id, nm name,
// s bundles of dried herbs, n tendings ever, k healers so far). The healer gathers willow bark and
// bitter leaves from spring to autumn and spends a bundle a day on each person lying sick or bitten:
// a tended fever is half as deadly, a tended wound closes days sooner. In a long winter outbreak the
// bundles can run out. When the healer dies or grows too old, the basket passes to a daughter, a
// housemate, or the woman best placed to carry it on.
const aliveId = (w, id) => (id == null ? null : w.people.find((p) => p.id === id && !p.dead) || null);
function heir(w, old) {
  let best = null, bs = 1e9;
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || p === old || a < 16 || a > 50 || p.sick) continue;
    const tier = old && (p.mother === old.id || p.father === old.id) ? 0 : old && old.home != null && p.home === old.home ? 1 : p.sex === 'f' ? 2 : 3;
    const sc = tier * 100 + Math.abs(a - 28);
    if (sc < bs) { bs = sc; best = p; }
  }
  return best;
}
const pron = (p) => (p.sex === 'f' ? 'she' : 'he'), poss = (p) => (p.sex === 'f' ? 'her' : 'his');
function learnHerbs(w) {
  const F = w.fever, who = heir(w, null);
  if (!who) return;
  w.techs.push('herbs');
  w.heal = { id: who.id, nm: who.name, s: 6, n: 0, k: 1 };
  const lost = (w.graves || []).filter((g) => g.why === 'died of the fever').pop();
  milestone(w, `${lost ? `After ${lost.n} is laid in the earth, ${who.name}` : `Worn out by nursing the fever, ${who.name}`} walks to the edge of the woods and comes back with willow bark and bitter leaves. ${who.sex === 'f' ? 'She' : 'He'} steeps them by the fire and spoons the brew into the sick. ${w.name} learns the herb lore, and has a healer.`);
  if (F) F.t = 0;
}
function herbs(w, c) {
  if (!w.techs.includes('herbs')) {
    if (w.fever && ((w.fever.lost || 0) >= 1 || (w.fever.all || 0) >= HERB_LEARN)) learnHerbs(w);
    return;
  }
  const H = w.heal;
  if (c.doy === 0) H.s = Math.floor(H.s * HERB_KEEP); // last year's leaves crumble to dust
  const cur = aliveId(w, H.id);
  if (cur && ageY(w, cur) < HEAL_OLD) return;
  const next = heir(w, cur || (H.id != null ? { id: H.id, home: null } : null)); // the dead healer's children still come first
  if (!next) { if (!cur) H.id = null; return; }
  const before = H.nm;
  H.id = next.id; H.nm = next.name; H.k++;
  if (cur) milestone(w, `${cur.name} is too stiff now to walk to the woods. ${pron(cur)[0].toUpperCase() + pron(cur).slice(1)} hands ${poss(cur)} herb basket to ${next.name}, and the names of every leaf with it.`);
  else milestone(w, `With ${before} gone, ${next.name} takes down the herb basket from its peg. ${w.name} has its ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][H.k] || `${H.k}th`} healer.`);
}
// the healer's own work: the sick first, then the woods when the bundles run low
function healerTend(w, p, c) {
  const H = w.heal;
  if (!H || H.id !== p.id || H.s < 1) return null;
  let best = null, bd = 1e9;
  for (const o of w.people) {
    if (o === p || o.dead || !(o.sick || o.hurt) || o.tend === c.day || w.res['n' + o.id] != null) continue;
    const h = homeOf(w, o), dd = d2(h.x, h.y, p.x, p.y);
    if (dd < bd) { bd = dd; best = { o, h }; }
  }
  return best && { k: 'tend', key: 'n' + best.o.id, x: best.h.x, y: best.h.y + 1, h: 1, o: best.o.id };
}
function healerGather(w, p, c) {
  const H = w.heal;
  if (!H || H.id !== p.id || c.season === 3 || c.hour > 13 || H.s >= HERB_CAP || (w.wx && w.wx.k === 'fog')) return null;
  if (H.s >= HERB_LOW && w.people.some((o) => o.sick || o.hurt)) return null;
  for (let tries = 0; tries < 10; tries++) { // willow and feverfew grow where the trees meet the open
    const x = w.fire.x + ri(w, HERB_REACH * 2 + 1) - HERB_REACH, y = w.fire.y + ri(w, HERB_REACH * 2 + 1) - HERB_REACH;
    if (tile(w, x, y) !== T.FOREST) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const t = tile(w, x + a, y + b); return t === T.GRASS || t === T.SAND || t === T.FIELD; })) continue;
    if (lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return { k: 'herb', x, y, h: 3 };
  }
  return null;
}

// ---------- goats ----------
// A raft drifts ashore with three goats on it. They get a wattle pen beside the village and a herder,
// a child if one is old enough. By day the herd grazes the open grass near the pen and eats the
// saplings back; at four it is brought in, before the wolves stir. Milk in spring and summer, spare
// grain in winter, the surplus and the old to the pot in autumn. Goats nobody minds wander into the
// young grain, and in fog a wolf may take one that has strayed.
function findPenSite(w) {
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 2; y < MAP - PEN_H - 2; y++) for (let x = 2; x < MAP - PEN_W - 2; x++) {
    const cx = x + PEN_W / 2, cy = y + PEN_H / 2;
    const dd = d2(cx, cy, fx + 0.5, fy + 0.5);
    if (dd < 25 || dd > 144) continue;
    let ok = true, trees = 0;
    for (let yy = y - 1; yy <= y + PEN_H && ok; yy++) for (let xx = x - 1; xx <= x + PEN_W; xx++) {
      const t = tile(w, xx, yy), inside = yy >= y && yy < y + PEN_H && xx >= x && xx < x + PEN_W;
      if (t === T.BUILD || (inside && t !== T.GRASS && t !== T.FOREST)) { ok = false; break; }
      if (inside && t === T.FOREST) trees++;
    }
    if (!ok) continue;
    let grass = 0;
    for (let yy = y - 5; yy <= y + 6; yy++) for (let xx = x - 5; xx <= x + 6; xx++) if (tile(w, xx, yy) === T.GRASS) grass++;
    const sc = Math.abs(Math.sqrt(dd) - 7) - grass * 0.08 + trees * 0.7 + hash(x, y, w.seed + 17);
    if (sc >= bs || !lineOfLand(w, fx + 0.5, fy + 0.5, cx, cy)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
const penMid = (G) => ({ x: G.pen.x + PEN_W / 2, y: G.pen.y + PEN_H / 2 });
function addGoat(w, x, y, ageY) {
  const g = { id: w.nextId++, x, y, px: x, py: y, b: w.t - Math.floor(ageY * TICKS_PER_YEAR), tx: null, ty: null, h: 0, out: 1 };
  w.goats.herd.push(g); w.goats.n++;
  return g;
}
function goatsCome(w, c) {
  if (c.season > 1 || c.year < 2 || !w.techs.includes('fencing') || w.people.length < 8 || rnd(w) >= GOAT_COME) return;
  const s = findPenSite(w);
  if (!s) return;
  const mid = { x: s.x + PEN_W / 2, y: s.y + PEN_H / 2 };
  let land = null, bd = 1e9;
  for (const i of w.shore || []) {
    const x = i % MAP, y = (i - x) / MAP, dd = d2(x + 0.5, y + 0.5, mid.x, mid.y);
    if (dd < bd && lineOfLand(w, x + 0.5, y + 0.5, mid.x, mid.y)) { bd = dd; land = { x, y }; }
  }
  if (!land) land = { x: w.fire.x, y: w.fire.y + 2 };
  for (let y = s.y; y < s.y + PEN_H; y++) for (let x = s.x; x < s.x + PEN_W; x++) {
    const i = idx(x, y);
    w.timber += w.wood[i]; w.wood[i] = 0;
    setTile(w, i, T.BUILD);
  }
  w.goats = { pen: { x: s.x, y: s.y }, herd: [], hid: null, at: null, ah: 0, n: 0, lost: 0, eaten: 0, milk: 0, ym: 0, yf: 0, yl: 0, ate: 0, nib: 0, pr: 0, pk: 0, yp: 0, gap: 0 };
  for (let k = 0; k < GOAT_FIRST; k++) addGoat(w, land.x + 0.3 + k * 0.3, land.y + 0.5, 2 + ri(w, 3));
  w.techs.push('goats');
  const who = elder(w);
  pickHerder(w, true);
  const kid = aliveId(w, w.goats.hid);
  milestone(w, `A raft of lashed logs drifts onto the beach with nobody aboard but three goats, thin and bleating. ${who ? who.name : 'Someone'} wades out and leads them ashore, and by nightfall a wattle pen stands beside the village.` +
    (kid && kid === who ? ` ${who.name} takes a crook and goes out with them each morning.` : kid ? ` ${kid.name} is given a crook and sent out with them each morning.` : '') + ` ${w.name} keeps goats.`);
}
// a child of 7 to 13 minds the goats; with no child old enough, the eldest grown islander does
function pickHerder(w, quiet) {
  const G = w.goats, cur = aliveId(w, G.hid);
  const healer = w.heal && w.heal.id;
  let kid = null, old = null;
  for (const p of w.people) {
    if (p.dead || p.sick || p.id === healer) continue;
    const a = ageY(w, p);
    if (a >= 7 && a < 14) { if (!kid || p.born > kid.born || (p.born === kid.born && p.id < kid.id)) kid = p; } // the youngest old enough, so the crook stays a while
    else if (a >= 14 && a < 70 && (!old || p.born < old.born || (p.born === old.born && p.id < old.id))) old = p;
  }
  if (cur && ageY(w, cur) < 14) return; // a child keeps the crook until grown
  if (cur && !kid && ageY(w, cur) < 70) return;
  const next = kid || old;
  if (!next || (cur && next.id === cur.id)) { if (!next) G.hid = null; return; }
  G.hid = next.id;
  if (quiet) return;
  const ca = cur ? ageY(w, cur) : 0;
  if (cur && next === kid && ca < 15) log(w, `${cur.name} is grown now and hands the goat crook to ${next.name}.`, 'info');
  else if (cur && next === kid && ca < 70) log(w, `${next.name} is old enough now to mind the goats, and ${cur.name} goes back to the fields.`, 'info');
  else log(w, `${next.name} takes up the crook and goes out with the goats.`, 'info');
}
function goatCap(w) {
  const m = penMid(w.goats);
  let grass = 0;
  for (let y = Math.floor(m.y) - 8; y <= Math.floor(m.y) + 8; y++) for (let x = Math.floor(m.x) - 8; x <= Math.floor(m.x) + 8; x++) if (tile(w, x, y) === T.GRASS) grass++;
  return Math.max(3, Math.min(GOAT_MAX, Math.round(grass / GOAT_PER)));
}
function killGoats(w, list) {
  const G = w.goats;
  G.herd = G.herd.filter((g) => !list.includes(g));
  G.eaten += list.length;
  w.food += GOAT_MEAT * list.length;
  w.hides = (w.hides || 0) + list.length;
}
function goatDay(w, c) {
  if (w.goats === null) { goatsCome(w, c); return; }
  const G = w.goats;
  if (c.doy === 0) { G.ym = 0; G.yf = 0; G.yl = 0; G.yp = 0; }
  if (G.gap && w.timber >= PEN_MEND) { w.timber -= PEN_MEND; G.gap = 0; } // the torn wattle is woven back
  pickHerder(w);
  const n = G.herd.length, m = penMid(G);
  // they strip the saplings creeping out onto their grazing
  for (let k = 0; k < n; k++) {
    const x = Math.floor(m.x) + ri(w, GOAT_REACH * 2 + 1) - GOAT_REACH, y = Math.floor(m.y) + ri(w, GOAT_REACH * 2 + 1) - GOAT_REACH;
    if (!inMap(x, y)) continue;
    const i = idx(x, y);
    if (w.tiles[i] === T.FOREST && w.wood[i] <= GOAT_BROWSE) { setTile(w, i, T.GRASS); w.wood[i] = 0; }
  }
  let grown = 0;
  for (const g of G.herd) if (w.t - g.b >= TICKS_PER_YEAR) grown++;
  if (c.season < 2 && grown) {
    const milk = Math.round(grown * GOAT_MILK * 10) / 10;
    w.food = Math.round((w.food + milk) * 100) / 100; G.ym = Math.round((G.ym + milk) * 10) / 10; G.milk = Math.round((G.milk + milk) * 10) / 10;
  }
  if (c.season === 3 && n) { // winter: grain from the stores, if there is grain to spare
    const need = n * GOAT_FODDER;
    if (w.food >= w.people.length * 60 + need) { w.food = Math.round((w.food - need) * 100) / 100; G.yf += need; }
    else if (rnd(w) < 0.08) {
      killGoats(w, [G.herd.reduce((a, g) => (g.b < a.b ? g : a))]);
      log(w, 'The stores are too thin to feed the goats. One is killed for the pot.', 'bad');
    }
  }
  if (G.ate) { // told once in a while, not every day they do it
    G.nib++;
    const text = 'With nobody minding them, the goats get in among the young grain.';
    if (G.nib === 1) { milestone(w, `${text} By the time they are driven out, the shoots are bitten to the ground.`); G.nd = c.day; }
    else if (c.day - (G.nd || 0) >= 20) { log(w, text, 'bad'); G.nd = c.day; }
    G.ate = 0;
  }
  if (c.doy === 45 && grown >= 2) { // kidding
    let k = 0;
    for (let i = 0; i < grown && n + k < GOAT_MAX + 4; i++) if (rnd(w) < 0.7) k++;
    for (let i = 0; i < k; i++) addGoat(w, G.pen.x + 0.5 + i * 0.3, G.pen.y + 1, 0);
    if (k) log(w, k === 1 ? 'A kid is born in the goat pen, all legs.' : `${plural(k, 'kid', 'kids')} are born in the goat pen and are soon butting heads.`, 'good');
  }
  if (c.doy === 280 && n) { // autumn: the old, and whatever the grass cannot carry through the year, go to the pot
    const cap = goatCap(w);
    const byAge = [...G.herd].sort((a, b) => a.b - b.b || a.id - b.id);
    const kill = byAge.filter((g) => w.t - g.b >= GOAT_OLD * TICKS_PER_YEAR);
    for (const g of byAge) if (byAge.length - kill.length > cap && !kill.includes(g)) kill.push(g);
    if (kill.length) {
      killGoats(w, kill);
      log(w, `${plural(kill.length, 'goat is', 'goats are')} killed before winter. Meat for the smoke, ${kill.length === 1 ? 'a hide' : 'hides'} for the doorways.`, 'info');
    }
  }
}
// someone close enough to shout, wave a stick and bring the herd together
function goatGuard(w, g) {
  const grown = w.t - 7 * TICKS_PER_YEAR;
  for (const p of w.people) if (!p.dead && !p.asleep && p.born <= grown && d2(p.x, p.y, g.x, g.y) < 9) return p;
  return null;
}
// out on the open grass, far enough from the hearth and the houses that a wolf will come for it
const goatOpen = (w, g) => g.out && d2(g.x, g.y, w.fire.x + 0.5, w.fire.y + 0.5) >= WOLF_SAFE && !nearBuild(w, Math.floor(g.x), Math.floor(g.y), 2);
function strayGoat(w, b) {
  let best = null, bd = 64;
  for (const g of w.goats.herd) {
    const dd = d2(g.x, g.y, b.x, b.y);
    if (dd < bd && goatOpen(w, g) && !goatGuard(w, g) && !dogNear(w, g.x, g.y)) { bd = dd; best = g; }
  }
  return best;
}
function takeGoat(w, b, g) {
  const G = w.goats;
  b.goat = null;
  const guard = goatGuard(w, g);
  if (guard) {
    b.rest = w.t + 24;
    log(w, `A wolf rushes the goats. ${guard.name} yells and swings ${ageY(w, guard) < 14 ? 'the crook' : 'a stick'}, and it slinks back into the trees.`, 'info');
    return;
  }
  const dog = dogNear(w, g.x, g.y);
  if (dog) {
    b.rest = w.t + 24; w.dogs.k++;
    log(w, `A wolf rushes a straying goat, but ${dog.nm} is there first, hackles up and barking, and it slinks back into the trees.`, 'info');
    return;
  }
  G.herd = G.herd.filter((o) => o !== g);
  G.lost++; G.yl++;
  b.rest = w.t + 48;
  const text = w.wx && w.wx.k === 'fog'
    ? 'A wolf comes out of the fog and carries off a goat. Its bleating stops somewhere in the grey.'
    : 'A wolf darts out of the trees and drags off a goat that wandered from the herd.';
  if (G.lost === 1) milestone(w, `${text} Now the herd has to be watched as closely as the children.`);
  else log(w, text, 'bad');
}
// ---------- wolves at the pen ----------
// In winter the woods go empty. On a hungry night one wolf of the pack stops waiting at the treeline and
// goes straight for the goat pen, hearth or no hearth, and works at the back wall where the village can't
// see. The wattle may hold; someone sleeping close by may wake to the goats screaming and run out with a
// brand; or in the morning there is a hole in the wattle and one goat fewer.
function penNight(w, c, wx) {
  const G = w.goats, F = w.fauna;
  if (c.season !== 3 || G.herd.length < 3 || !F.den || wx === 'storm') return;
  const pack = w.beasts.filter((b) => b.k === 'wolf');
  if (pack.length < 2) return;
  let deer = 0;
  for (const b of w.beasts) if (b.k === 'deer') deer++;
  const odds = PEN_ODDS * (wx === 'cold' || wx === 'snow' ? PEN_COLD : 1) * (deer > 3 ? PEN_DEER : 1);
  if (rnd(w) >= odds) return;
  const b = pack.find((o) => (o.rest || 0) <= w.t && o.prey == null && o.goat == null);
  if (b) b.pen = 1;
}
// just outside the back wall of the pen, the side away from the hearth
function penBack(w) {
  const G = w.goats, m = penMid(G);
  const dx = m.x - (w.fire.x + 0.5), dy = m.y - (w.fire.y + 0.5);
  if (Math.abs(dx) > Math.abs(dy)) return { x: dx > 0 ? G.pen.x + PEN_W + 0.4 : G.pen.x - 0.4, y: m.y };
  return { x: m.x, y: dy > 0 ? G.pen.y + PEN_H + 0.4 : G.pen.y - 0.4 };
}
// someone grown and able who sleeps in a house within earshot of the pen
function penWaker(w) {
  const m = penMid(w.goats);
  return waker(w, m.x, m.y, PEN_NEAR);
}
function waker(w, mx, my, near, skip) {
  let best = null, bd = near;
  for (const p of w.people) {
    if (p.dead || p.sick || p.hurt || p.home == null || isLost(w, p) || (skip && skip.includes(p.id)) || (w.watch && w.watch.hid === p.id)) continue;
    const a = ageY(w, p);
    if (a < 14 || a >= 65) continue;
    const h = w.buildings.find((b) => b.id === p.home);
    if (!h) continue;
    const dd = d2(h.x + 0.5, h.y + 0.5, mx, my);
    if (dd < bd || (dd === bd && best && p.id < best.id)) { bd = dd; best = p; }
  }
  return best;
}
function penRaid(w, b) {
  const G = w.goats, F = w.fauna;
  b.pen = 0; b.rest = w.t + 72; edge(w, b);
  if (!G.herd.length) return;
  G.pr = (G.pr || 0) + 1; G.yp = (G.yp || 0) + 1;
  const first = G.pr === 1, snow = w.wx && w.wx.k === 'snow';
  const tail = first ? ' The winter woods are empty, and the wolves have found the goat pen.' : '';
  if (rnd(w) < PEN_HOLD) {
    const text = 'A wolf comes out of the dark to the goat pen and digs and scrabbles at the wattle half the night. It never gets in, but in the morning the goats will not come out of the lean-to.';
    if (first) milestone(w, text + tail); else log(w, text, 'info');
    return;
  }
  G.gap = 1;
  const p = penWaker(w), m = penMid(G), bark = dogNear(w, m.x, m.y, PEN_NEAR);
  if (p && rnd(w) < (bark ? DOG_WAKE : PEN_WAKE)) {
    if (bark) w.dogs.p++;
    let text = `${bark ? `In the dead of night ${bark.nm} starts up barking at the goat pen and will not stop.` : 'In the dead of night the goats scream.'} ${p.name} runs out with a burning brand from the hearth, and the wolf, already halfway through the wattle, turns and runs.`;
    deed(w, p, 'p');
    if (rnd(w) < PEN_BITE) {
      p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
      F.att++;
      text += ` It snaps at ${p.name} on the way past; the bite is deep.`;
    }
    if (first) milestone(w, text + tail); else log(w, text, 'bad');
    return;
  }
  const g = G.herd.reduce((a, o) => (o.b > a.b || (o.b === a.b && o.id > a.id) ? o : a)); // the smallest is the easiest to drag
  const kid = w.t - g.b < TICKS_PER_YEAR;
  G.herd = G.herd.filter((o) => o !== g);
  G.lost++; G.yl++; G.pk = (G.pk || 0) + 1;
  const text = `A wolf tears through the back of the goat pen in the night and drags off ${kid ? 'a kid' : 'a goat'}. Nobody wakes until it is over; in the morning there is a hole in the wattle and a red trail ${snow ? 'across the snow' : 'into the trees'}.`;
  if (first) milestone(w, text + tail); else log(w, text, 'bad');
}
function goatHour(w, c) {
  const G = w.goats, h = c.hour, wx = w.wx ? w.wx.k : 'clear';
  const fest = w.fest && w.fest.on === c.day && h >= FEST_FROM;
  const out = G.herd.length > 0 && h >= GOAT_OUT && h < GOAT_HOME && wx !== 'storm' && wx !== 'snow' && !(c.season === 3 && wx === 'cold') && !fest;
  const herder = G.hid != null ? aliveId(w, G.hid) : null;
  const minded = !!(herder && !herder.sick && !herder.hurt && (h === GOAT_OUT || (herder.task && herder.task.k === 'herd')));
  const m = penMid(G);
  if (!out) G.at = null;
  else if (!G.at || --G.ah <= 0) { // the herd drifts to a fresh patch of grass every few hours
    G.at = { x: Math.floor(m.x), y: G.pen.y + PEN_H };
    for (let k = 0; k < 8; k++) {
      const x = Math.floor(m.x) + ri(w, GOAT_REACH * 2 + 1) - GOAT_REACH, y = Math.floor(m.y) + ri(w, GOAT_REACH * 2 + 1) - GOAT_REACH;
      if (tile(w, x, y) === T.GRASS && lineOfLand(w, m.x, m.y, x + 0.5, y + 0.5)) { G.at = { x, y }; break; }
    }
    G.ah = 3 + ri(w, 3);
  }
  for (let k = 0; k < G.herd.length; k++) {
    const g = G.herd[k];
    g.px = g.x; g.py = g.y;
    if (!out) { // back into the pen, each to its corner of the straw
      g.tx = null;
      const sx = G.pen.x + 0.35 + (k % 4) * 0.42, sy = G.pen.y + 0.45 + (Math.floor(k / 4) % 4) * 0.4;
      if (moveToward(g, sx, sy, SPEED)) g.out = 0;
      continue;
    }
    g.out = 1;
    if (minded && g.tx != null && tile(w, g.tx, g.ty) === T.FIELD) g.tx = null; // the herder turns it back
    if (g.tx == null) {
      let tx = G.at.x, ty = G.at.y;
      for (let tries = 0; tries < 4; tries++) {
        const x = minded ? G.at.x + ri(w, 5) - 2 : Math.floor(m.x) + ri(w, GOAT_REACH * 2 + 1) - GOAT_REACH;
        const y = minded ? G.at.y + ri(w, 5) - 2 : Math.floor(m.y) + ri(w, GOAT_REACH * 2 + 1) - GOAT_REACH;
        const t = tile(w, x, y);
        if ((t === T.GRASS || (!minded && t === T.FIELD)) && lineOfLand(w, g.x, g.y, x + 0.5, y + 0.5)) { tx = x; ty = y; break; }
      }
      g.tx = tx; g.ty = ty; g.h = 1 + ri(w, 3);
    }
    const far = d2(g.x, g.y, g.tx + 0.5, g.ty + 0.5) > 9;
    if (!moveToward(g, g.tx + 0.2 + (g.id % 3) * 0.3, g.ty + 0.2 + (g.id % 2) * 0.5, far ? SPEED : GOAT_SPEED)) continue;
    if (!minded) { // nobody to stop them: a mouthful of the young grain
      const fx = Math.floor(g.x), fy = Math.floor(g.y);
      if (tile(w, fx, fy) === T.FIELD) {
        const f = w.fields.find((o) => o.x === fx && o.y === fy);
        if (f && !f.fence && f.stage === 'planted') { f.growth = Math.max(0, Math.round((f.growth - GOAT_NIBBLE) * 10000) / 10000); G.ate++; }
        else if (f && !f.fence && f.stage === 'ripe') { f.lost = Math.min(0.8, Math.round(((f.lost || 0) + 0.02) * 100) / 100); G.ate++; }
      }
    }
    if (--g.h <= 0) g.tx = null;
  }
}
function herdTask(w, p) {
  const G = w.goats;
  if (!G || G.hid !== p.id || !G.at || !G.herd.length || p.hurt || p.haul) return null;
  return { k: 'herd', x: G.at.x, y: G.at.y, h: 99 };
}

// ---------- dogs ----------
// One spring a child comes in from the edge of the woods with a wolf cub that crept out of the den alone.
// It stays, grows up thinking the village is its pack, and the next cub found is let in beside it; after
// that there is a litter most springs, as many as the scraps can feed (w.dogs {d [{id, nm, sex, b, own,
// x, y, lie}], n ever, k wolves turned, f lost ones scented, p pen alarms, r rats, dead killed by wolves}).
// Each grown dog keeps at the heels of one islander (the goatherd first) and sleeps across their doorway.
const dogGrown = (w, d) => w.t - d.b >= DOG_GROWN * TICKS_PER_YEAR;
function dogNear(w, x, y, r = DOG_NEAR) {
  if (!w.dogs) return null;
  let best = null, bd = r;
  for (const d of w.dogs.d) {
    if (!dogGrown(w, d)) continue;
    const dd = d2(d.x, d.y, x, y);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}
// the grown dog at someone's side, if they have one
function dogBy(w, p) {
  if (!w.dogs) return null;
  for (const d of w.dogs.d) if (d.own === p.id && dogGrown(w, d) && d2(d.x, d.y, p.x, p.y) < DOG_NEAR) return d;
  return null;
}
function dogName(w) {
  const used = new Set(w.dogs.d.map((d) => d.nm));
  for (let k = 0; k < 6; k++) { const nm = DOG_NAMES[ri(w, DOG_NAMES.length)]; if (!used.has(nm)) return nm; }
  return DOG_NAMES.find((n) => !used.has(n)) || DOG_NAMES[ri(w, DOG_NAMES.length)];
}
function addDog(w, sex, ageY, own, x, y) {
  const d = { id: w.nextId++, nm: dogName(w), sex, b: w.t - Math.floor(ageY * TICKS_PER_YEAR), own, x, y, px: x, py: y, lie: 0 };
  w.dogs.d.push(d); w.dogs.n++;
  return d;
}
function cubFound(w) {
  let kids = w.people.filter((p) => !p.dead && !p.sick && !p.asleep && ageY(w, p) >= 6 && ageY(w, p) < 14);
  if (!kids.length) kids = w.people.filter((p) => !p.dead && !p.sick && !p.asleep && ageY(w, p) >= 14 && ageY(w, p) < 60);
  if (!kids.length) return;
  const who = kids[ri(w, kids.length)];
  const first = !w.dogs;
  if (first) w.dogs = { d: [], n: 0, k: 0, f: 0, p: 0, r: 0, dead: 0 };
  const D = w.dogs;
  const sex = D.d.length ? (D.d.some((d) => d.sex === 'f') ? 'm' : 'f') : rnd(w) < 0.5 ? 'f' : 'm';
  const d = addDog(w, sex, 0.15, who.id, who.x, who.y);
  const it = sex === 'f' ? 'her' : 'him';
  if (first) {
    w.techs.push('dogs');
    milestone(w, `${who.name} comes in from the edge of the woods with a wolf cub in ${poss(who)} arms, thin and shivering; it had crept out of the den alone. The grown-ups argue half the night about knocking it on the head. In the end it stays: ${who.name} calls ${it} ${d.nm}, feeds ${it} fish heads and lets ${it} sleep across the doorway. ${d.nm} grows up thinking the village is ${sex === 'f' ? 'her' : 'his'} pack. ${w.name} has a dog.`);
  } else {
    const old = D.d.find((o) => o !== d);
    log(w, `${who.name} brings home another cub from the woods, ${sex === 'f' ? 'a she-cub' : 'a dog-cub'}.${old ? ` ${old.nm} sniffs ${it} all over and lets ${it} sleep against ${old.sex === 'f' ? 'her' : 'his'} side.` : ''} They call ${it} ${d.nm}.`, 'good');
  }
}
// one grown dog to an islander; the eldest dogs keep theirs, the goatherd gets the first one free
function dogOwners(w) {
  const D = w.dogs, taken = new Set();
  const order = [...D.d].sort((a, b) => a.b - b.b || a.id - b.id);
  const keep = new Set();
  for (const d of order) { // grown dogs keep the owner they have, eldest first
    const o = dogGrown(w, d) && aliveId(w, d.own);
    if (o && !taken.has(o.id)) { taken.add(o.id); keep.add(d); }
  }
  for (const d of order) {
    if (keep.has(d)) continue;
    const o = aliveId(w, d.own), grown = dogGrown(w, d);
    if (o && !grown) continue;
    if (!grown) { const m = order.find((q) => q.sex === 'f' && q !== d && aliveId(w, q.own)); d.own = m ? m.own : null; continue; }
    const herder = w.goats && aliveId(w, w.goats.hid);
    let next = herder && !taken.has(herder.id) && !herder.sick ? herder : null;
    if (!next) {
      let bs = -1;
      for (const p of w.people) {
        if (p.dead || taken.has(p.id)) continue;
        const a = ageY(w, p);
        if (a < 14 || a >= 60) continue;
        const dd = p.dd || {}, sc = ((dd.w || 0) + (dd.b || 0) + (dd.d || 0)) * 10 + (dd.l || 0) * 5 + (dd.p || 0) * 5;
        if (sc > bs || (sc === bs && p.id < next.id)) { bs = sc; next = p; }
      }
    }
    d.own = next ? next.id : null;
    if (!next) continue;
    taken.add(next.id);
    log(w, o ? `${d.nm} is grown now, and leaves ${o.name}'s heels to follow ${next.name} everywhere.` : `${d.nm} lies by the hearth for days, then takes to following ${next.name}.`, 'info');
  }
}
function dogDay(w, c) {
  const F = w.fauna;
  let pack = 0;
  for (const b of w.beasts || []) if (b.k === 'wolf') pack++;
  const D0 = w.dogs, pair = !!(D0 && D0.d.some((d) => d.sex === 'f') && D0.d.some((d) => d.sex === 'm'));
  if (!pair && c.year >= 3 && c.season < 2 && F && F.den && pack >= 3 && w.techs.includes('hunting') && rnd(w) < (D0 ? DOG_CUB / 2 : DOG_CUB)) cubFound(w);
  const D = w.dogs;
  if (!D) return;
  if (D.d.length) w.food = Math.max(0, Math.round((w.food - D.d.length * DOG_EAT) * 100) / 100);
  for (const d of D.d) {
    if (w.t - d.b < (DOG_OLD + (d.id % 5)) * TICKS_PER_YEAR) continue;
    const o = aliveId(w, d.own);
    d.gone = 1;
    log(w, `${o ? `${o.name}'s` : 'The'} old dog ${d.nm} lies down by the hearth one evening and does not get up.`, 'death');
  }
  if (D.d.some((d) => d.gone)) D.d = D.d.filter((d) => !d.gone);
  dogOwners(w);
  if (w.rats && w.rats.n > 0) for (const d of D.d) {
    if (!dogGrown(w, d) || w.rats.n <= 0 || rnd(w) >= DOG_RAT) continue;
    w.rats.n--; D.r++;
    if (D.r === 1) log(w, `${d.nm} pounces in the granary chaff and comes out with a rat in ${d.sex === 'f' ? 'her' : 'his'} jaws, shaking it. After that ${d.nm} goes rat-hunting every evening.`, 'good');
  }
  if (c.doy === 40) { // a litter in the straw
    const cap = Math.min(DOG_MAX, Math.max(2, Math.floor(w.people.length / DOG_PER)));
    const room = cap - D.d.length;
    const ma = D.d.find((d) => d.sex === 'f' && dogGrown(w, d) && w.t - d.b < 8 * TICKS_PER_YEAR);
    if (room > 0 && ma && D.d.some((d) => d.sex === 'm' && dogGrown(w, d)) && rnd(w) < 0.7) {
      const n = Math.min(room, 1 + ri(w, 3));
      for (let k = 0; k < n; k++) addDog(w, rnd(w) < 0.5 ? 'f' : 'm', 0, ma.own, ma.x, ma.y);
      const o = aliveId(w, ma.own);
      log(w, `${ma.nm} whelps ${n === 1 ? 'a pup' : `${n} pups`} in the straw ${o ? `behind ${o.name}'s house` : 'by the hearth'}. The children fight over who gets to name ${n === 1 ? 'it' : 'them'}.`, 'birth');
    }
  }
}
// every hour: at heel while the owner is up and about, across the doorway while they sleep
function dogHour(w, c) {
  const C = cacheOf(w);
  for (const d of w.dogs.d) {
    d.px = d.x; d.py = d.y;
    const o = aliveId(w, d.own), k = (d.id % 5) * 0.25 - 0.5;
    let tx, ty;
    if (!o) { tx = w.fire.x + 0.5 + k; ty = w.fire.y + 1.6; d.lie = 1; }
    else if (o.asleep) {
      if (C.hb !== w.buildings.length) { C.hb = w.buildings.length; C.byId = new Map(); for (const b of w.buildings) C.byId.set(b.id, b); }
      const h = (o.home != null && C.byId.get(o.home)) || { x: w.fire.x, y: w.fire.y };
      tx = h.x + 0.5 + k * 0.6; ty = h.y + 1.2; d.lie = 1;
    } else { tx = o.x + ((d.id & 1) ? 0.7 : -0.7); ty = o.y + 0.3 + k * 0.4; d.lie = 0; }
    moveToward(d, tx, ty, DOG_SPEED);
  }
}

// ---------- lost in the fog ----------
// On a fog day a small child (or a very old islander) can drift away from the others and lose the village
// in the grey. When they are missed, every grown islander who can walk goes out calling, in a circle that
// closes in on where the voice last answered; at night they carry torches. Out alone, the lost one is fair
// game for a wolf, and a winter night in the open can kill. When the fog lifts they see the hearth smoke.
const isLost = (w, p) => !!(w.lost && w.lost.cur && w.lost.cur.id === p.id);
function lostWander(w, p, L) {
  p.asleep = false;
  if (!p.task || p.task.k !== 'lost') { release(w, p); p.task = { k: 'lost', x: L.x, y: L.y, h: 99 }; }
  if (L.hh && hornOn(w)) { // stumbling toward the sound of the horn; the searchers' ring follows
    moveToward(p, w.fire.x + 0.5, w.fire.y + 0.5, HORN_WALK);
    L.x = Math.floor(p.x); L.y = Math.floor(p.y);
    return;
  }
  moveToward(p, L.x + 0.5, L.y + 0.5, LOST_WALK);
}
function searchSpot(w, p, L) {
  const R = Math.max(2, 10 - (L.h >> 1)); // the ring of searchers draws in as the hours pass
  for (let k = 0; k < 6; k++) {
    const x = L.x + ri(w, R * 2 + 1) - R, y = L.y + ri(w, R * 2 + 1) - R;
    if (tile(w, x, y) !== T.WATER && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return { k: 'search', x, y, h: 99 };
  }
  return { k: 'search', x: L.x, y: L.y, h: 99 };
}
function search(w, p, L) {
  p.asleep = false;
  if (!p.task || p.task.k !== 'search') { release(w, p); p.task = searchSpot(w, p, L); }
  if (walk(w, p, p.task.x + 0.5, p.task.y + 0.5)) p.task = searchSpot(w, p, L);
}
function strays(w) {
  const list = w.people.filter((p) => {
    if (p.dead || p.asleep || p.sick || p.hurt || (p.task && (p.task.k === 'fest' || p.task.k === 'tale')) || (w.horn && w.horn.hid === p.id)) return false;
    const a = ageY(w, p);
    if (a < 11 && w.tale && w.tale.lore && hash(p.id, w.t, 83) < TALE_HEED) return false; // they remember the tale
    return (a >= 3 && a < 11) || a >= 72;
  });
  if (!list.length) return;
  const p = list[ri(w, list.length)];
  for (let k = 0; k < 12; k++) {
    const x = w.fire.x + ri(w, 31) - 15, y = w.fire.y + ri(w, 31) - 15, dd = d2(x, y, w.fire.x, w.fire.y), t = tile(w, x, y);
    if (dd < 64 || dd > 225 || (t !== T.GRASS && t !== T.FOREST) || !lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) continue;
    release(w, p);
    const S = w.lost;
    S.cur = { id: p.id, x, y, t: w.t, seen: 0, h: 0, o: 0 };
    S.n++; S.y++;
    return;
  }
}
function lostHour(w, c) {
  const S = w.lost, L = S.cur, h = c.hour, fog = !!(w.wx && w.wx.k === 'fog');
  if (!L) { if (fog && h >= 9 && h <= 15 && rnd(w) < LOST_ODDS) strays(w); return; }
  const p = aliveId(w, L.id);
  if (!p) { S.cur = null; for (const o of w.people) if (o.task && o.task.k === 'search') release(w, o); return; } // the wolves found them first; the chronicle has it
  const first = S.n === 1, hn = w.t - L.t, hrs = plural(hn, 'hour', 'hours');
  const night = h >= 20 || h < 6, obj = p.sex === 'f' ? 'her' : 'him', old = ageY(w, p) >= 14;
  const who = old ? `Old ${p.name}` : `${p.name}, ${Math.floor(ageY(w, p))},`;
  if (night && L.seen) L.o = 1;
  const end = (text, big, k = 'good') => {
    S.cur = null; release(w, p);
    for (const o of w.people) if (o.task && o.task.k === 'search') release(w, o);
    if (big) milestone(w, text); else log(w, text, k);
  };
  if (p.hurt) return end(`${p.name} stumbles home out of the grey, bleeding, ${hrs} after ${pron(p)} wandered off.`, false, 'bad');
  if (!L.seen && hn >= LOST_NOTICE) {
    L.seen = 1;
    const text = `${who} has wandered off into the fog and does not answer. All of ${w.name} goes out into the grey, calling ${poss(p)} name.`;
    if (first) milestone(w, text); else log(w, text, 'bad');
  }
  if (L.seen) L.h++;
  if (!L.hh && hornOn(w) && rnd(w) < HORN_FOLLOW) L.hh = 1;
  const reach = fog ? LOST_HEAR : LOST_SEE;
  const finder = w.people.find((o) => o !== p && !o.dead && !o.asleep && ageY(w, o) >= 14 && d2(o.x, o.y, p.x, p.y) < reach);
  const t = tile(w, Math.floor(p.x), Math.floor(p.y));
  const where = t === T.FOREST ? 'curled up under a tree at the edge of the woods' : old ? 'sitting on a stone, quite lost' : 'huddled in the wet grass';
  if (!finder && L.seen && w.dogs) for (const d of w.dogs.d) { // a dog out with the searchers picks up the scent
    const o = dogGrown(w, d) && aliveId(w, d.own);
    if (!o || o === p || !o.task || o.task.k !== 'search' || d2(d.x, d.y, p.x, p.y) >= DOG_NOSE) continue;
    S.f++; w.dogs.f++;
    deed(w, o, 'l');
    const text = `${d.nm} puts ${d.sex === 'f' ? 'her' : 'his'} nose to the wet grass and drags ${o.name} off through the ${fog ? 'fog' : 'dark'}, straight to ${p.name} ${where}, ${hrs} after ${pron(p)} wandered off.`;
    return end(w.dogs.f === 1 ? `${text} From then on, when anyone is missing, the dogs go out first.` : text, first || L.o || w.dogs.f === 1);
  }
  if (finder) {
    S.f++;
    if (L.seen) deed(w, finder, 'l');
    if (!L.seen) return end(`${finder.name} comes across ${p.name} ${where}, far from the village, and walks ${obj} home before anyone has missed ${obj}.`, false);
    return end(`${finder.name} finds ${p.name} ${where}${night ? ' by torchlight' : ''}, ${hrs} after ${pron(p)} wandered off, and brings ${obj} home.` +
      (L.o ? ` Nobody on ${w.name} slept that night.` : ''), first || L.o);
  }
  if (L.hh && hornOn(w) && d2(p.x, p.y, w.fire.x + 0.5, w.fire.y + 0.5) < HORN_HOME) {
    S.f++;
    const H = w.horn, blower = aliveId(w, H.hid);
    H.f++;
    const by = blower ? `${blower.name}'s horn` : 'the horn';
    if (!L.seen) return end(`${p.name} comes out of the grey to the hearth, following ${by}, before anyone has missed ${obj}.`, false);
    const text = `${p.name} walks in out of the fog to the hearth, following the sound of ${by}, ${hrs} after ${pron(p)} wandered off.`;
    if (H.f === 1) return end(`${text} The searchers come in one by one, and the old shell gets a peg of its own by the hearth.`, true);
    return end(text, first || L.o);
  }
  if (c.season === 3 && night && rnd(w) < LOST_COLD) {
    S.d++;
    die(w, p, 'died of cold, lost in the fog');
    end(`The searchers find ${p.name} ${where}, cold and still. The fog came down too thick, and the night was too long.`, true);
    return;
  }
  if ((!fog && !night) || hn >= LOST_MAX) {
    S.f++;
    end(`${fog ? 'Through a thin place in the fog' : 'The fog lifts, and'} ${p.name} sees the smoke of the hearth and walks home alone, ${hrs} after ${pron(p)} wandered off.`, first || L.o);
  }
}

// ---------- the fog horn ----------
// Once the fog has cost the village (a wolf out of the grey, or a child lost in it), someone brings up a great
// whelk shell from the beach and knocks off its tip. On fog days the oldest islander who can stand keeps by the
// hearth and blows it. Within earshot, nobody is alone; and someone lost can follow the sound home.
export const hornOn = (w) => !!(w.horn && w.horn.hid != null);
const heard = (w, p) => hornOn(w) && w.wx && w.wx.k === 'fog' && d2(p.x, p.y, w.fire.x + 0.5, w.fire.y + 0.5) < HORN_EAR;
function hornKeeper(w) {
  let best = null;
  for (const p of w.people) {
    if (p.dead || p.sick || p.hurt || isLost(w, p) || ageY(w, p) < 14) continue;
    if (w.goats && w.goats.hid === p.id) continue;
    if (p.haul || (p.task && (p.task.k === 'hunt' || p.task.k === 'haul'))) continue;
    if (!best || p.born < best.born || (p.born === best.born && p.id < best.id)) best = p;
  }
  return best;
}
function learnHorn(w) {
  const who = hornKeeper(w);
  if (!who) return;
  w.techs.push('foghorn');
  w.horn = { hid: null, f: 0, d: 0 };
  const why = w.lost && w.lost.n ? 'Nobody wants to go calling through the grey for a lost child again.' : 'The wolves come out of the fog, and nobody hears them until it is too late.';
  milestone(w, `${why} ${who.name} brings up a great whelk shell from the beach, knocks off its tip and blows: a low moan rolls out over the fields and into the trees. ` +
    `On fog days now someone keeps by the hearth and blows the horn, and whoever can hear it can call back. ${w.name} has a fog horn.`);
}
function hornHour(w, c) {
  const fog = !!(w.wx && w.wx.k === 'fog'), h = c.hour;
  if (!w.techs.includes('foghorn')) {
    if (fog && h === 7 && (((w.fauna && w.fauna.fa) || 0) >= 1 || (w.lost && w.lost.n >= 1 && !w.lost.cur))) learnHorn(w);
    if (!w.horn) return;
  }
  const H = w.horn, L = w.lost && w.lost.cur;
  const want = (fog && h >= 6 && h < 21) || !!(L && L.seen);
  const cur = aliveId(w, H.hid);
  let next = null;
  if (want) {
    next = cur && !cur.sick && !cur.hurt && !isLost(w, cur) ? cur : hornKeeper(w);
  }
  if (next && fog && h === 6) H.d++; // fog days the horn has been blown
  if (cur && cur !== next && cur.task && cur.task.k === 'horn') release(w, cur);
  H.hid = next ? next.id : null;
}

// ---------- the burying ground ----------
// At the first death the village walls off a quiet patch of ground nearby. Every grave has a place in
// rows inside the wall; the morning after a death the family stands at the graveside. When the rows
// are full the oldest stone has long sunk into the grass, and the newest grave is dug in its place.
function findYardSite(w) {
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 2; y < MAP - YARD_H - 2; y++) for (let x = 2; x < MAP - YARD_W - 2; x++) {
    const cx = x + YARD_W / 2, cy = y + YARD_H / 2;
    const dd = d2(cx, cy, fx + 0.5, fy + 0.5);
    if (dd < 36 || dd > 196) continue;
    let ok = true, trees = 0;
    for (let yy = y - 1; yy <= y + YARD_H && ok; yy++) for (let xx = x - 1; xx <= x + YARD_W; xx++) {
      const t = tile(w, xx, yy), inside = yy >= y && yy < y + YARD_H && xx >= x && xx < x + YARD_W;
      if (t === T.BUILD || (inside && t !== T.GRASS && t !== T.FOREST)) { ok = false; break; }
      if (inside && t === T.FOREST) trees++;
    }
    if (!ok) continue;
    const sc = Math.abs(Math.sqrt(dd) - 8) + trees * 0.7 + hash(x, y, w.seed + 13);
    if (sc >= bs || !lineOfLand(w, fx + 0.5, fy + 0.5, cx, cy)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
// the middle of grave s, in tile units
export function gravePos(yard, s) {
  return { x: yard.x + (2 + (s % GRAVE_COLS) * 3) / 8, y: yard.y + (4 + Math.floor(s / GRAVE_COLS) * 4) / 8 };
}
function bury(w, p, why) {
  if (!w.graves) return;
  let first = false;
  if (!w.yard) {
    const s = findYardSite(w);
    if (!s) return; // nowhere fit yet: the body is given to the sea, and the next death tries again
    for (let y = s.y; y < s.y + YARD_H; y++) for (let x = s.x; x < s.x + YARD_W; x++) {
      const i = idx(x, y);
      w.timber += w.wood[i]; w.wood[i] = 0;
      setTile(w, i, T.BUILD);
    }
    w.yard = { x: s.x, y: s.y, n: 0, sunk: 0 };
    first = true;
  }
  const Y = w.yard;
  const used = new Array(GRAVE_CAP).fill(false);
  for (const g of w.graves) used[g.s] = true;
  let s = used.indexOf(false), old = null;
  if (s < 0) { old = w.graves.shift(); s = old.s; Y.sunk++; }
  const g = { id: p.id, n: p.name, x: p.sex, b: p.born, d: w.t, why, m: p.mother, f: p.father, s };
  if (p.dd && p.dd.by) { g.by = byname(p); g.dd = deedsText(p.dd); }
  w.graves.push(g);
  Y.n++;
  // the morning after, the family stands at the graveside
  const day = clock(w.t).day + 1;
  let kin = 0;
  for (const o of w.people) {
    if (o.dead || o === p) continue;
    if (o.id === p.partner || o.mother === p.id || o.father === p.id || p.mother === o.id || p.father === o.id ||
      sibling(o, p) || (p.home != null && o.home === p.home)) { o.mourn = [day, s]; kin++; }
  }
  if (first) {
    w.techs.push('burial');
    const dx = Y.x + YARD_W / 2 - w.fire.x, dy = Y.y + YARD_H / 2 - w.fire.y;
    const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north';
    const who = elder(w);
    milestone(w, `${who && who !== p ? `${who.name} walks out to a quiet patch of ground ${side} of the village and sets a ring of stones there.` : `The islanders set a ring of stones on a quiet patch of ground ${side} of the village.`} ${p.name} is laid in the earth inside it${kin ? `, and ${kin === 1 ? 'one mourner stands' : `${kin} mourners stand`} at the graveside next morning` : ''}. ${w.name} has a burying ground.`);
  } else if (old) log(w, `The oldest stone in the burying ground, ${old.n}'s, has sunk into the grass. ${p.name} is laid in the same earth.`, 'death');
  else if (Y.n === GRAVE_CAP) log(w, `The last row in the burying ground is filled. ${GRAVE_CAP} lie there now.`, 'info');
}
function mournSpot(w, p, s) {
  const g = gravePos(w.yard, s), k = p.id % 6;
  // a half ring below the grave, nearest kin in front
  return { k: 'mourn', x: Math.round((g.x - 0.5 + [0, -0.4, 0.4, -0.75, 0.75, 0][k]) * 1000) / 1000, y: Math.round((g.y - 0.5 + [0.45, 0.4, 0.4, 0.2, 0.2, 0.75][k]) * 1000) / 1000, h: 99 };
}

// ---------- deeds ----------
// Every islander keeps a tally of what they have done (p.dd: b boars, w wolves, d deer taken, f fish landed,
// g grain reaped, h roofs helped raise, l lost ones found, p wolves driven from the pen, n sick tended).
// Pass a mark and the island gives them a byname that sticks for life (p.dd.by = the DEEDS key).
const DEEDS = [
  { k: 'w', mark: 3, by: 'the Wolf-slayer' },
  { k: 'k', mark: 10, by: 'the Hunter' },     // b + d + w
  { k: 'l', mark: 2, by: 'the Finder' },
  { k: 'h', mark: 10, by: 'the Builder' },
  { k: 'f', mark: 3000, by: 'the Fisher' },
  { k: 'g', mark: 30000, by: 'the Reaper' },
];
const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const thou = (n) => (n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, '0')}` : String(n));
export function byname(p) {
  const e = p && p.dd && p.dd.by && DEEDS.find((o) => o.k === p.dd.by);
  return e ? e.by : '';
}
export function deedsText(d) {
  if (!d) return '';
  const out = [], kill = [];
  const n = (v, one, many) => `${thou(v)} ${v === 1 ? one : many}`;
  if (d.w) kill.push(n(d.w, 'wolf', 'wolves'));
  if (d.b) kill.push(n(d.b, 'boar', 'boars'));
  if (d.d) kill.push(n(d.d, 'deer', 'deer'));
  if (kill.length) out.push('took ' + (kill.length > 1 ? kill.slice(0, -1).join(', ') + ' and ' + kill[kill.length - 1] : kill[0]));
  if (d.f) out.push('landed ' + n(d.f, 'fish', 'fish'));
  if (d.g) out.push(`reaped ${thou(d.g)} grain`);
  if (d.h) out.push('helped raise ' + n(d.h, 'roof', 'roofs'));
  if (d.l) out.push('found ' + n(d.l, 'lost one', 'lost ones') + ' in the fog');
  if (d.p) out.push('drove ' + n(d.p, 'wolf', 'wolves') + ' from the goat pen');
  if (d.n) out.push('tended the sick ' + n(d.n, 'time', 'times'));
  return out.join('; ');
}
function deed(w, p, k, v = 1) {
  if (!p || p.dead || !v) return;
  const d = p.dd || (p.dd = {});
  d[k] = (d[k] || 0) + v;
  if (d.by) return;
  const kk = k === 'b' || k === 'd' ? 'k' : k, held = w.by || (w.by = {});
  for (const e of DEEDS) {
    if (e.k !== kk && !(k === 'w' && e.k === 'k')) continue;
    const have = e.k === 'k' ? (d.b || 0) + (d.d || 0) + (d.w || 0) : d[e.k] || 0;
    if (have < e.mark || held[e.k] != null) continue; // one living Fisher at a time; the name passes on at death
    d.by = e.k; held[e.k] = p.id;
    nameThem(w, p, e, have);
    return;
  }
}
// the byname is free again once its holder is dead or gone over the sea
function unname(w, p) {
  if (w.by && p.dd && p.dd.by && w.by[p.dd.by] === p.id) delete w.by[p.dd.by];
}
function nameThem(w, p, e, n) {
  const he = pron(p), him = p.sex === 'f' ? 'her' : 'him', His = poss(p)[0].toUpperCase() + poss(p).slice(1), full = `${p.name} ${e.by}`;
  const text = {
    w: `${p.name} pegs out a ${ORD[n] || `${n}th`} wolf pelt beside the others. Around the fire they have started calling ${him} ${full}, and the children hush when ${he} walks by.`,
    k: `${p.name} carries home ${poss(p)} ${ORD[n] || `${n}th`} kill. The children play at being ${full} now, with sticks for spears.`,
    l: `${p.name} has brought a second lost one home out of the fog. ${His} ears are sharper than the horn, they say. From now on it is ${full}.`,
    h: `${p.name} has had a hand in raising ${n} roofs on ${w.name}. People call ${him} ${full}, and come to ${him} first when a beam will not sit.`,
    f: `${p.name} has pulled ${thou(n)} fish out of the shallows. The others call ${him} ${full} and watch where ${he} casts.`,
    g: `${p.name} has cut and carried ${thou(n)} measures of grain in ${poss(p)} life. At harvest the others fall in behind ${full}.`,
  }[e.k];
  milestone(w, text);
}

function die(w, p, why) {
  p.dead = true;
  release(w, p);
  w.stats.deaths++; w.stats.yd++;
  const by = byname(p);
  unname(w, p);
  if (by) {
    const tale = deedsText(p.dd);
    milestone(w, `${p.name} ${by} ${why}, aged ${Math.floor(ageY(w, p))}. In ${poss(p)} life ${pron(p)} ${tale.replace(/; ([^;]*)$/, ' and $1').replace(/; /g, ', ')}. ${w.name} will tell of ${p.sex === 'f' ? 'her' : 'him'} at the fire.`);
  } else log(w, `${p.name} ${why}, aged ${Math.floor(ageY(w, p))}.`, 'death');
  bury(w, p, why);
  for (const o of w.people) if (o.partner === p.id) o.partner = null;
}

function lifeAndDeath(w, c) {
  const pop = w.people.length;
  const wx = w.wx ? w.wx.k : 'clear';
  const bitter = wx === 'cold' && c.season === 3; // a deep frost reaches the frail even by the fire
  for (const p of w.people) {
    if (p.dead) continue;
    const a = ageY(w, p);
    const frail = a < 6 || a > 55;
    let risk = 0.00003;
    if (a > 45) { const k = (a - 45) / 30; risk += k * k * k * 0.012; }
    if (a < 2) risk += 0.0002;
    if (w.stats.cold && frail) risk += 0.006;
    if (bitter && frail) risk += 0.0008;
    if (wx === 'heat' && a > 65) risk += 0.0006;
    if (p.hunger > 12) risk += 0.0015 * (p.hunger - 12) * (a < 6 || a > 60 ? 2 : 1);
    if (rnd(w) < risk) {
      const why = p.hunger > 12 ? 'starved' : (w.stats.cold || bitter) && frail ? 'died of the cold' : wx === 'heat' && a > 65 ? 'died in the heat' : 'passed away';
      if (why !== 'passed away' && w.wx) w.wx.d++;
      die(w, p, why);
    }
  }
  // births
  for (const p of w.people) {
    if (p.dead || p.sex !== 'f' || p.partner == null || p.wants || p.home == null) continue;
    const a = ageY(w, p);
    if (a < 18 || a > 42 || w.t - p.lastBirth < 2 * TICKS_PER_YEAR) continue;
    const dad = w.people.find((o) => o.id === p.partner);
    if (!dad || dad.home !== p.home) continue;
    if (w.people.filter((o) => o.home === p.home).length >= HOUSE_CAP) continue;
    if (w.food < pop * 250) continue;
    if (rnd(w) < 0.0035) {
      const k = addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', 0, p.id, dad.id, p.home);
      k.x = k.px = p.x; k.y = k.py = p.y;
      p.lastBirth = w.t;
      w.stats.births++; w.stats.yb++;
      if (w.stats.births === 1) milestone(w, `${k.name}, the first child born on ${w.name}, arrives to ${p.name} and ${dad.name}.`);
      else log(w, `${p.name} and ${dad.name} welcome ${k.sex === 'f' ? 'a daughter' : 'a son'}, ${k.name}.`, 'birth');
    }
  }
  w.people = w.people.filter((p) => !p.dead);
}

const sibling = (a, b) => (a.mother != null && a.mother === b.mother) || (a.father != null && a.father === b.father);
function mate(w, f) {
  const fa = ageY(w, f);
  return w.people.find((o) => !o.dead && o.sex === 'm' && o.partner == null && ageY(w, o) >= 17 &&
    Math.abs(ageY(w, o) - fa) < 14 && !sibling(f, o) && f.mother !== o.id && o.mother !== f.id);
}
function pairing(w) {
  for (const f of w.people) {
    if (f.dead || f.sex !== 'f' || f.partner != null || ageY(w, f) < 17) continue;
    if (rnd(w) >= 0.012) continue;
    const m = mate(w, f);
    if (!m) continue;
    f.partner = m.id; m.partner = f.id; f.wants = true;
    log(w, `${f.name} and ${m.name} are joined at the fire.`, 'love');
  }
}

function occupants(w, id) { let n = 0; for (const p of w.people) if (!p.dead && p.home === id) n++; return n; }
function housing(w) {
  const houses = w.buildings.filter((b) => b.progress >= 1 && isHouse(b));
  // children follow their mother
  for (const p of w.people) {
    if (p.dead || p.home != null || ageY(w, p) >= 14) continue;
    const mum = w.people.find((o) => o.id === p.mother && !o.dead);
    if (mum && mum.home != null) p.home = mum.home;
  }
  // couples who want their own home take an empty one
  for (const f of w.people) {
    if (f.dead || !(f.wants || (f.home == null && f.partner != null))) continue;
    const h = houses.find((b) => occupants(w, b.id) === 0);
    if (!h) continue;
    const m = w.people.find((o) => o.id === f.partner);
    f.home = h.id; f.wants = false;
    if (m) { m.home = h.id; m.wants = false; }
    log(w, `${f.name}${m ? ' and ' + m.name : ''} move into a home of their own.`, 'info');
  }
  // anyone else without a roof squeezes in where there's room
  for (const p of w.people) {
    if (p.dead || p.home != null) continue;
    const h = houses.find((b) => occupants(w, b.id) < HOUSE_CAP - 1);
    if (h) p.home = h.id;
  }
}

// Homes are only ever handed out and couples only start wanting one at the daily reckoning, so once
// nobody needs a house this hour, nobody will until the next.
function needHouse(w) {
  const c = cacheOf(w);
  if (c.nhT === w.t && !c.nh) return false;
  c.nhT = w.t;
  c.nh = w.people.some((p) => !p.dead && (p.home == null || (p.sex === 'f' && p.wants)));
  return c.nh;
}
// This hour's ripe fields, fallow fields and unfinished buildings, in their usual order. During the
// villagers' hour fields only leave these states (or are added, which rebuilds the lists), so callers
// re-check the state and get the same answer a sweep of every field would give.
function workLists(w) {
  const c = cacheOf(w);
  if (c.wt !== w.t || c.wf !== w.fields.length || c.wb !== w.buildings.length) {
    c.wt = w.t; c.wf = w.fields.length; c.wb = w.buildings.length;
    c.ripe = []; c.fallow = []; c.raw = [];
    for (const f of w.fields) if (f.stage === 'ripe') c.ripe.push(f); else if (f.stage === 'fallow') c.fallow.push(f);
    for (const b of w.buildings) if (b.progress < 1) c.raw.push(b);
  }
  return c;
}
const isHouse = (b) => b.kind !== 'granary';
// how much food can be kept dry: a little in every house, a lot in each granary
export function storeCap(w) {
  let n = 0;
  for (const b of w.buildings) if (b.progress >= 1) n += b.kind === 'granary' ? GRANARY_CAP : HOME_STORE;
  return n;
}
function needGranary(w) {
  if (!w.techs.includes('granary')) return false;
  const c = cacheOf(w);
  if (c.gb !== w.buildings.length) { c.gb = w.buildings.length; c.g = 0; for (const b of w.buildings) if (b.kind === 'granary') c.g++; }
  return c.g < 1 + Math.floor(w.people.length / 12) && w.food >= storeCap(w) * 0.85;
}
function woodTarget(w) { return HOUSE_COST * 2 + w.buildings.length * 25; }
function needFields(w) {
  const expect = w.fields.length * FIELD_YIELD * 0.9;
  const pop = w.people.length;
  return expect < pop * DAYS_PER_YEAR * 1.3 || (w.food < pop * 120 && w.fields.length < pop * 2.5);
}

function release(w, p) {
  if (p.task && p.task.key) {
    delete w.res[p.task.key];
    if (p.task.h > 0 && p.task.k === 'clear') w.prog[p.task.key] = p.task.h;
  }
  p.task = null;
}
function reserve(w, p, task) {
  if (task.key) {
    w.res[task.key] = p.id;
    if (w.prog[task.key] != null) { task.h = w.prog[task.key]; delete w.prog[task.key]; }
  }
  p.task = task;
}

function nearest(list, p, ok) {
  let best = null, bd = 1e9;
  for (const o of list) { if (!ok(o)) continue; const dd = d2(o.x + 0.5, o.y + 0.5, p.x, p.y); if (dd < bd) { bd = dd; best = o; } }
  return best;
}
// the nearest field in a given stage that nobody has claimed; the claim is only looked up for a field
// that would be the new nearest, which picks the same field as checking every one
function nearestFree(w, list, p, stage, pre) {
  let best = null, bd = 1e9;
  for (const o of list) {
    if (o.stage !== stage) continue;
    const dd = d2(o.x + 0.5, o.y + 0.5, p.x, p.y);
    if (dd < bd && w.res[pre + o.id] == null) { bd = dd; best = o; }
  }
  return best;
}

function pickTask(w, p, c) {
  const free = (k) => w.res[k] == null;
  const L = workLists(w);
  // the healer looks in on the sick and the bitten before anything else
  if (w.heal && w.heal.id === p.id) {
    const nk = healerTend(w, p, c);
    if (nk) return nk;
  }
  // harvest
  let f = nearestFree(w, L.ripe, p, 'ripe', 'f');
  if (f) return { k: 'harvest', key: 'f' + f.id, x: f.x, y: f.y, h: 4 };
  // planting
  if (c.season === 0) {
    f = nearestFree(w, L.fallow, p, 'fallow', 'f');
    if (f) return { k: 'plant', key: 'f' + f.id, x: f.x, y: f.y, h: 3 };
  }
  // lean times: everyone who can, forages
  if (c.season < 3 && w.food < w.people.length * 20 && w.wild >= 3) {
    const tk = forage(w, p);
    if (tk) return tk;
  }
  if (w.food < w.people.length * 20) {
    const tk = fish(w, p);
    if (tk) return tk;
  }
  // then out to the wood's edge if the bundles are running low
  if (w.heal && w.heal.id === p.id) {
    const hk = healerGather(w, p, c);
    if (hk) return hk;
  }
  // the potter at the clay bank and the kiln
  if (w.pot && w.pot.id === p.id) {
    const pk = potTask(w, p, c);
    if (pk) return pk;
  }
  // construction
  let b = nearest(L.raw, p, (o) => o.progress < 1 && free('b' + o.id));
  if (b) return { k: 'build', key: 'b' + b.id, x: b.x, y: b.y, h: 4 };
  const building = L.raw.some((o) => o.progress < 1);
  if (w.timber >= HOUSE_COST && !building && needHouse(w)) {
    const id = addBuilding(w, 0);
    if (id != null) {
      w.timber -= HOUSE_COST;
      b = w.buildings[w.buildings.length - 1];
      log(w, 'Timber is stacked for a new house.', 'info');
      return { k: 'build', key: 'b' + b.id, x: b.x, y: b.y, h: 4 };
    }
  }
  if (w.timber >= GRANARY_COST + HOUSE_COST && !building && needGranary(w) && !needHouse(w)) {
    const id = addBuilding(w, 0, 'granary');
    if (id != null) {
      w.timber -= GRANARY_COST;
      b = w.buildings[w.buildings.length - 1];
      log(w, 'Posts are sunk for a granary.', 'info');
      return { k: 'build', key: 'b' + b.id, x: b.x, y: b.y, h: 4 };
    }
  }
  // the hunt
  const hk = hunt(w, p, c);
  if (hk) return hk;
  // fences around the grain by the woods
  const gk = fenceTask(w, p, c);
  if (gk) return gk;
  // timber
  if (w.timber < woodTarget(w)) {
    const bt = nearestTimber(w, p);
    if (bt) return { k: 'chop', key: 't' + bt.i, x: bt.x, y: bt.y, h: 3 };
  }
  // new fields
  if (c.season <= 1 && needFields(w)) {
    const s = findFieldSite(w);
    if (s) {
      const key = 'c' + idx(s.x, s.y);
      if (free(key)) return { k: 'clear', key, x: s.x, y: s.y, h: tile(w, s.x, s.y) === T.FOREST ? 9 : 6 };
    }
  }
  // foraging
  if (c.season < 3 && w.wild >= 3) {
    const tk = forage(w, p);
    if (tk) return tk;
  }
  // the shore: in winter, or when the woods are picked bare
  const tk = fish(w, p);
  if (tk) return tk;
  return wander(w, p, w.fire.x, w.fire.y, 3, 2);
}

// The nearest standing timber within 20 tiles of the hearth that the worker can walk straight to.
// Searched in square rings out from the worker, stopping once no farther ring can hold anything closer;
// ties go to the tile first in map order, exactly as a full sweep of the square would choose.
// Trees only grow at the daily reckoning; during the day they are only cut down. So the list of tall
// trees near the hearth, taken once a day in map order, holds every tree that can still be chosen.
function nearestTimber(w, p) {
  const R = 20, fx = w.fire.x, fy = w.fire.y;
  const x0 = Math.max(0, fx - R), x1 = Math.min(MAP - 1, fx + R), y0 = Math.max(0, fy - R), y1 = Math.min(MAP - 1, fy + R);
  const c = cacheOf(w), day = Math.floor(w.t / TICKS_PER_DAY);
  if (c.treesDay !== day) {
    c.treesDay = day; c.trees = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = idx(x, y); if (w.tiles[i] === T.FOREST && w.wood[i] >= 6) c.trees.push(i); }
  }
  let best = null, bd = 1e9, bi = 0;
  if (c.trees.length < 400) { // few trees left: just look at each of them
    for (const i of c.trees) {
      if (w.tiles[i] !== T.FOREST || w.wood[i] < 6) continue;
      const x = i % MAP, y = (i - x) / MAP, dd = d2(x + 0.5, y + 0.5, p.x, p.y);
      if (dd < bd && w.res['t' + i] == null && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) { bd = dd; best = { x, y, i }; }
    }
    return best;
  }
  const cx = Math.floor(p.x), cy = Math.floor(p.y);
  const far = Math.max(Math.abs(cx - x0), Math.abs(cx - x1), Math.abs(cy - y0), Math.abs(cy - y1));
  for (let r = 0; r <= far; r++) {
    if (r > 0 && (r - 0.5) * (r - 0.5) > bd + 1e-6) break; // every tile on ring r is at least r - 0.5 away
    for (let y = cy - r; y <= cy + r; y++) {
      if (y < y0 || y > y1) continue;
      const step = r === 0 || y === cy - r || y === cy + r ? 1 : 2 * r; // whole top and bottom rows, ends of the rest
      for (let x = cx - r; x <= cx + r; x += step) {
        if (x < x0 || x > x1) continue;
        const i = idx(x, y);
        if (w.tiles[i] !== T.FOREST || w.wood[i] < 6) continue;
        const dd = d2(x + 0.5, y + 0.5, p.x, p.y);
        if (dd > bd || (dd === bd && i > bi)) continue;
        if (w.res['t' + i] != null || !lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) continue;
        bd = dd; bi = i; best = { x, y, i };
      }
    }
  }
  return best;
}

// Fishing spots within reach of the hearth, sorted into 8x8 blocks of the map. The beach never moves,
// so this is built once per world.
function shoreBlocks(w) {
  const c = cacheOf(w);
  if (c.shoreOf === w.shore) return c.shore;
  const R2 = 22 * 22, fx = w.fire.x, fy = w.fire.y, blocks = [];
  const at = new Array(64).fill(null);
  for (let k = 0; k < w.shore.length; k++) {
    const i = w.shore[k], x = i % MAP, y = (i - x) / MAP;
    if ((x - fx) * (x - fx) + (y - fy) * (y - fy) > R2) continue;
    const b = (y >> 3) * 8 + (x >> 3);
    if (!at[b]) { at[b] = { x0: x & ~7, y0: y & ~7, md: 0, spots: [] }; blocks.push(at[b]); }
    at[b].spots.push({ x, y, i, k, key: 's' + i });
  }
  c.shoreOf = w.shore; c.shore = blocks;
  return blocks;
}

function fish(w, p) {
  if (!w.shore || w.fish < 3 || !w.techs.includes('fishing')) return null;
  if (w.wx && w.wx.k === 'fog') return null; // nobody can see a fish in grey water
  // the nearest free spot; ties go to the spot listed first, as a sweep along the beach would choose
  let best = null, bd = 1e9, bk = 0;
  const px = p.x - 0.5, py = p.y - 0.5, blocks = shoreBlocks(w);
  for (const b of blocks) {
    const dx = px < b.x0 ? b.x0 - px : px > b.x0 + 7 ? px - (b.x0 + 7) : 0;
    const dy = py < b.y0 ? b.y0 - py : py > b.y0 + 7 ? py - (b.y0 + 7) : 0;
    b.md = dx * dx + dy * dy;
  }
  blocks.sort((a, b) => a.md - b.md || a.y0 - b.y0 || a.x0 - b.x0);
  for (const b of blocks) {
    if (b.md > bd) break; // no spot in this block, or any later one, can be nearer
    for (const s of b.spots) {
      const dd = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
      if (dd > bd || (dd === bd && s.k > bk) || w.res[s.key] != null) continue;
      bd = dd; bk = s.k; best = s;
    }
  }
  // only the nearest free spot is checked for a dry path; if the way is blocked, try another day
  if (!best || !lineOfLand(w, p.x, p.y, best.x + 0.5, best.y + 0.5)) return null;
  return { k: 'fish', key: 's' + best.i, x: best.x, y: best.y, h: 4 };
}

function forage(w, p) {
  for (let tries = 0; tries < 6; tries++) {
    const x = w.fire.x + ri(w, 25) - 12, y = w.fire.y + ri(w, 25) - 12;
    const tt = tile(w, x, y);
    if ((tt === T.GRASS || tt === T.FOREST) && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return { k: 'forage', x, y, h: 3 };
  }
  return null;
}

function wander(w, p, cx, cy, r, h) {
  for (let tries = 0; tries < 5; tries++) {
    const x = cx + ri(w, r * 2 + 1) - r, y = cy + ri(w, r * 2 + 1) - r;
    if (tile(w, x, y) !== T.WATER && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return { k: 'idle', x, y, h };
  }
  return { k: 'idle', x: cx, y: cy, h };
}

function homeOf(w, p) {
  let b = null;
  if (p.home != null) {
    const c = cacheOf(w);
    if (c.hb !== w.buildings.length) { c.hb = w.buildings.length; c.byId = new Map(); for (const o of w.buildings) c.byId.set(o.id, o); }
    b = c.byId.get(p.home);
  }
  return b && b.progress >= 1 ? b : { x: w.fire.x, y: w.fire.y + 1 };
}

function moveToward(p, tx, ty, sp = SPEED) {
  const dx = tx - p.x, dy = ty - p.y, dd = Math.sqrt(dx * dx + dy * dy);
  if (dd <= sp) { p.x = tx; p.y = ty; return true; }
  p.x = Math.round((p.x + (dx / dd) * sp) * 1000) / 1000;
  p.y = Math.round((p.y + (dy / dd) * sp) * 1000) / 1000;
  return false;
}

function act(w, p, c, fx) {
  const a = ageY(w, p), h = c.hour;
  if (w.lost && w.lost.cur) { // someone is out in the fog: they wander, and everyone able goes looking
    const L = w.lost.cur;
    if (p.id === L.id) { lostWander(w, p, L); return; }
    if (L.seen && a >= 14 && a < 65 && !p.sick && !p.hurt && !(w.horn && w.horn.hid === p.id)) { search(w, p, L); return; }
  }
  if (w.horn && w.horn.hid === p.id) { // keeping the fog horn at the hearth
    p.asleep = false;
    if (!p.task || p.task.k !== 'horn') { release(w, p); p.task = { k: 'horn', x: w.fire.x + 1, y: w.fire.y - 1, h: 99 }; }
    walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
    return;
  }
  if (w.watch && w.watch.hid === p.id && !taleNow(w, c)) { // sitting up by the fire on the beach
    p.asleep = false;
    if (!p.task || p.task.k !== 'watch') { release(w, p); p.task = { k: 'watch', x: w.watch.x, y: w.watch.y, h: 99 }; }
    walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
    return;
  }
  // after a wolf attack the village keeps in from dusk to full daylight
  const afraid = w.fauna && w.fauna.fear > w.t;
  const night = h >= 21 || h < (afraid ? 7 : 6) || (w.watch && w.watch.last === p.id && h < WATCH_REST); // the night's watcher sleeps late
  const evening = h >= (afraid ? 16 : 18) && h < 21;
  const storm = w.wx && w.wx.k === 'storm';
  if (w.fest && w.fest.on === c.day && h >= FEST_FROM && h < FEST_TO && !p.sick) { // midsummer: everyone (who can stand) to the bonfire
    if (p.task && p.task.k !== 'fest') release(w, p);
    if (!p.task) p.task = festSpot(w);
    p.asleep = false;
    walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
    return;
  }
  if (taleNow(w, c) && !p.sick) { // the longest night: everyone round the hearth to hear the tale
    if (p.task && p.task.k !== 'tale') release(w, p);
    if (!p.task) p.task = taleSpot(w, p);
    p.asleep = false;
    walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
    return;
  }
  if (night || storm || p.sick) { // in a storm nobody works outdoors: they wait it out at home. The sick keep to their beds
    if (p.task && p.task.k !== 'home') release(w, p);
    const home = homeOf(w, p);
    const off = (p.id % 3) * 0.25 - 0.25;
    if (!night && !storm) { // by day the sick lie wrapped up in the doorway, out of the smoke
      p.asleep = false;
      moveToward(p, home.x + 0.5 + off, home.y + 1.25);
      return;
    }
    if (walk(w, p, home.x + 0.5 + off, home.y + 0.5)) p.asleep = p.home != null;
    return;
  }
  p.asleep = false;
  if (evening) {
    if (p.task && p.task.k !== 'gather') release(w, p);
    if (!p.task) {
      const ang = (p.id * 2654435761) >>> 0;
      p.task = { k: 'gather', x: w.fire.x + ((ang % 5) - 2), y: w.fire.y + (((ang >>> 8) % 3) - 1) + ((ang >>> 4) & 1 ? 1 : -1), h: 99 };
    }
    walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
    return;
  }
  if (p.mourn) { // the morning after a death in the family: to the graveside
    const [d, s] = p.mourn;
    if (c.day > d || (c.day === d && h >= MOURN_TO) || !w.yard) delete p.mourn;
    else if (c.day === d && h >= MOURN_FROM && !(p.task && (p.task.k === 'hunt' || p.task.k === 'haul'))) {
      if (!p.task || p.task.k !== 'mourn') { release(w, p); p.task = mournSpot(w, p, s); }
      walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
      return;
    }
  }
  if (p.task && (p.task.k === 'gather' || p.task.k === 'home' || p.task.k === 'fest' || p.task.k === 'tale' || p.task.k === 'mourn' || p.task.k === 'search' || p.task.k === 'lost' || p.task.k === 'horn' || p.task.k === 'watch' || (p.task.k === 'herd' && !(w.goats && w.goats.hid === p.id)))) p.task = null;
  // daytime
  if (w.goats && w.goats.hid === p.id) { // the herder goes where the goats are grazing
    const ht = herdTask(w, p);
    if (ht) {
      if (p.task && p.task.k !== 'herd') release(w, p);
      p.task = ht;
      walk(w, p, ht.x + 0.5, ht.y + 1);
      return;
    }
    if (p.task && p.task.k === 'herd') p.task = null;
  }
  if (!p.task && p.haul && !p.hurt) p.task = { k: 'haul', x: w.fire.x, y: w.fire.y - 1, h: 1, q: p.haul };
  if (!p.task) {
    if (a < 5) p.task = wander(w, p, homeOf(w, p).x, homeOf(w, p).y, 2, 3);
    else if (a < 14) p.task = wander(w, p, w.fire.x, w.fire.y, 6, 2);
    else if (a >= 65 || p.hurt) p.task = wander(w, p, homeOf(w, p).x, homeOf(w, p).y, 2, 4);
    else reserve(w, p, pickTask(w, p, c));
  }
  const t = p.task;
  if (!walk(w, p, t.x + 0.5, t.y + 0.5)) return;
  t.h--;
  if (t.h > 0) return;
  finish(w, p, t, c, fx);
  release(w, p);
}

function finish(w, p, t, c, fx) {
  const pop = (text, color) => fx && fx.push({ x: t.x + 0.5, y: t.y, text, color });
  if (t.k === 'harvest') {
    const f = w.fields.find((o) => 'f' + o.id === t.key);
    if (!f || f.stage !== 'ripe') return;
    const y = Math.round(FIELD_YIELD * w.harvest * (1 - (f.lost || 0)));
    w.food += y; w.stats.yh += y; f.stage = 'harvested'; f.growth = 0; delete f.lost;
    deed(w, p, 'g', y);
    pop('+' + y, 'food');
  } else if (t.k === 'plant') {
    const f = w.fields.find((o) => 'f' + o.id === t.key);
    if (f && f.stage === 'fallow') { f.stage = 'planted'; f.growth = 0; delete f.flat; delete f.root; pop('sown', 'muted'); }
  } else if (t.k === 'build') {
    const b = w.buildings.find((o) => 'b' + o.id === t.key);
    if (!b || b.progress >= 1) return;
    if (!b.dmg) { const hs = b.hands || (b.hands = []); if (!hs.includes(p.id)) hs.push(p.id); }
    b.progress = Math.min(1, Math.round((b.progress + 4 / (b.kind === 'granary' ? GRANARY_WORK : HOUSE_WORK)) * 1000) / 1000);
    pop('+' + Math.round(b.progress * 100) + '%', 'build');
    if (b.progress >= 1 && b.hands) {
      for (const id of b.hands) deed(w, aliveId(w, id), 'h');
      delete b.hands;
    }
    if (b.progress >= 1 && b.dmg) {
      delete b.dmg;
      log(w, b.kind === 'granary' ? 'The granary roof is thatched again.' : 'A storm-torn roof is mended.', 'good');
    } else if (b.progress >= 1 && b.kind === 'granary') {
      const n = w.buildings.filter((o) => o.kind === 'granary' && o.progress >= 1).length;
      if (n === 1) milestone(w, `The first granary stands on ${w.name}, its floor raised above the damp.`);
      else log(w, `A granary is finished. ${n} now guard the harvest.`, 'good');
    } else if (b.progress >= 1) {
      const n = w.buildings.filter((o) => o.progress >= 1 && isHouse(o)).length;
      if (n === 10 || n === 25 || n === 50) milestone(w, `The ${n}th house is raised on ${w.name}.`);
      else log(w, 'A new house is finished.', 'good');
      housing(w);
    }
  } else if (t.k === 'chop') {
    const i = idx(t.x, t.y);
    if (w.tiles[i] !== T.FOREST) return;
    const got = Math.min(CHOP, w.wood[i]);
    w.wood[i] -= got; w.timber += got;
    if (w.wood[i] <= 0) { setTile(w, i, T.GRASS); w.wood[i] = 0; }
    pop('+' + got, 'wood');
  } else if (t.k === 'clear') {
    const tt = tile(w, t.x, t.y);
    if ((tt !== T.GRASS && tt !== T.FOREST) || !needFields(w)) return;
    if (tt === T.FOREST) { const got = w.wood[idx(t.x, t.y)]; w.timber += got; w.wood[idx(t.x, t.y)] = 0; if (got) pop('+' + got, 'wood'); }
    const f = addField(w, { x: t.x, y: t.y });
    if (f && w.fields.length % 10 === 0) log(w, `${w.fields.length} fields now ring the village.`, 'good');
  } else if (t.k === 'fence') {
    const f = w.fields.find((o) => 'g' + o.id === t.key);
    if (!f || f.fence || w.timber < FENCE_COST) return;
    w.timber -= FENCE_COST; f.fence = 1;
    w.fauna.fences = (w.fauna.fences || 0) + 1;
    pop('fenced', 'wood');
    if (w.fauna.fences === 1) milestone(w, `${p.name} ties off the last hazel rod. The first fence on ${w.name} stands between the grain and the woods.`);
  } else if (t.k === 'tend') {
    const o = w.people.find((q) => q.id === t.o), H = w.heal;
    if (!o || o.dead || !(o.sick || o.hurt) || !H || H.s < 1) return;
    H.s--; H.n++; o.tend = c.day;
    deed(w, p, 'n');
    if (o.sick && w.fever) w.fever.t = (w.fever.t || 0) + 1;
    if (o.hurt) o.hurt = Math.max(w.t + 1, o.hurt - HERB_WOUND * TICKS_PER_DAY);
    pop('tended', 'herb');
  } else if (t.k === 'herb') {
    const H = w.heal;
    if (!H) return;
    const got = Math.min(HERB_CAP - H.s, 4 + ri(w, 3));
    H.s += got;
    if (got > 0) pop('+' + got + ' herbs', 'herb');
  } else if (t.k === 'clay') {
    if (!w.pot) return;
    w.pot.c += POT_CLAY;
    pop('+clay', 'muted');
  } else if (t.k === 'shape') {
    const P = w.pot;
    if (!P || P.c < 1) return;
    P.c--; P.wet++; P.sd = c.day;
    pop('a jar', 'pot');
  } else if (t.k === 'fire') {
    if (!w.pot) return;
    const ok = fireKiln(w, p);
    if (ok) pop('+' + ok + ' jars', 'pot');
  } else if (t.k === 'forage') {
    const got = Math.min(w.wild, 3 + ri(w, 3));
    w.wild -= got; w.food += got;
    if (got > 0) pop('+' + got, 'food');
  } else if (t.k === 'hunt') {
    if (t.key === 'h0') strike(w, p, t);
  } else if (t.k === 'haul') {
    const n = MEAT[t.q] || 0;
    w.food += n; delete p.haul;
    pop('+' + n, 'meat');
  } else if (t.k === 'fish') {
    const got = Math.min(w.fish, 3 + ri(w, 4));
    w.fish -= got; w.food += got;
    deed(w, p, 'f', got);
    if (got > 0) pop('+' + got, 'fish');
  }
}

// ---------- upgrades ----------
// Every rules change that alters the saved shape bumps SIM_VERSION and adds a step here.
// The live world must always load and carry on: never reset it, never drop people.
const MIGRATIONS = {
  // v1 -> v2: fishing. Mark the beaches, stock the shallows, and let someone find out.
  1: (w) => {
    w.shore = findShore(w);
    w.fish = FISH_CAP;
    if (!w.techs.includes('fishing')) {
      w.techs.push('fishing');
      const who = w.people.find((p) => ageY(w, p) >= 14);
      milestone(w, who
        ? `${who.name} wades into the shallows with a sharpened stick and comes back with fish. ${w.name} learns to fish.`
        : `The islanders learn to spear fish in the shallows.`);
    }
  },
  // v2 -> v3: granaries. Old buildings are houses; food left in the open now rots faster.
  2: (w) => {
    for (const b of w.buildings) if (!b.kind) b.kind = 'house';
    if (!w.techs.includes('granary')) {
      w.techs.push('granary');
      const who = w.people.filter((p) => ageY(w, p) >= 14).sort((a, b) => a.born - b.born || a.id - b.id)[0];
      milestone(w, who
        ? `${who.name} lays a timber floor on four posts and heaps the grain on it, out of the damp. ${w.name} learns to build granaries.`
        : `The islanders learn to keep grain dry in raised granaries.`);
    }
  },
  // v3 -> v4: weather. The sky gets moods; storms, frosts and heat now come in spells.
  3: (w) => {
    w.wx = { k: 'clear', n: 1, f: 0, r: 0, d: 0 };
    w.stats.ys = 0; w.stats.yf = 0;
    const who = w.people.filter((p) => ageY(w, p) >= 14).sort((a, b) => a.born - b.born || a.id - b.id)[0];
    milestone(w, who
      ? `${who.name} watches the clouds pile up over the sea and says the gentle days are over. From now on the sky brings rain, storms, heat and hard frost.`
      : `Clouds pile up over the sea. From now on the sky brings rain, storms, heat and hard frost.`);
  },
  // v4 -> v5: creatures. A wolf pack and a sounder of boars wake in the deep woods.
  4: (w) => {
    stockWilds(w);
    w.stats.yw = 0; w.stats.yr = 0;
    const who = w.people.filter((p) => ageY(w, p) >= 14).sort((a, b) => a.born - b.born || a.id - b.id)[0];
    milestone(w, who
      ? `${who.name} finds great paw prints in the mud and hears howling from the deep woods. Wolves live on ${w.name}, and boars root among the trees.`
      : `Howls drift from the deep woods. Wolves live on ${w.name}, and boars root among the trees.`);
  },
  // v5 -> v6: hunting. Spears for the boars and the pack; meat for the pot, hides for the doorways.
  5: (w) => {
    w.hides = w.hides || 0;
    w.stats.yk = 0;
    if (w.fauna) { w.fauna.hunt = w.fauna.hunt || 0; w.fauna.sb = w.fauna.sb || 0; w.fauna.sw = w.fauna.sw || 0; }
    learnHunting(w);
  },
  // v6 -> v7: fences. Fields by the woods can be fenced once the boars have raided often enough.
  6: (w) => {
    if (w.fauna) { w.fauna.fences = w.fauna.fences || 0; if (w.fauna.raids >= FENCE_LEARN) learnFencing(w); }
  },
  // v7 -> v8: midsummer. The longest day is kept with a bonfire, a feast and a dance.
  7: (w) => {
    w.fest = w.fest || { y: 0, on: -1, n: 0, k: 0 };
    learnMidsummer(w);
  },
  // v8 -> v9: fever. Sickness can now take hold in crowded houses and spread through the village.
  8: (w) => {
    w.fever = w.fever || { k: 0, n: 0, d: 0, all: 0 };
    w.stats.yi = w.stats.yi || 0;
  },
  // v9 -> v10: footpaths. Feet now wear the grass; the first worn track is noticed in-world.
  9: (w) => {
    if (!Array.isArray(w.wear) || w.wear.length !== MAP * MAP) w.wear = new Array(MAP * MAP).fill(0);
    w.paths = w.paths || 0;
  },
  // v10 -> v11: the burying ground. Nothing to dig yet; the first death after this founds it.
  10: (w) => {
    w.graves = w.graves || [];
    if (w.yard === undefined) w.yard = null;
  },
  // v11 -> v12: deer. A small herd comes out of the trees to graze the open meadow.
  11: (w) => {
    if (!w.fauna || !w.beasts) return;
    findMeadow(w);
    if (w.beasts.some((b) => b.k === 'deer')) return;
    for (let i = 0; i < 4; i++) addBeast(w, 'deer');
    const who = elder(w), m = w.fauna.mead;
    let where = 'far';
    if (m) {
      const dx = m.x - w.fire.x, dy = m.y - w.fire.y, ns = dy < 0 ? 'north' : 'south', ew = dx < 0 ? 'west' : 'east';
      where = Math.abs(dy) * 2 < Math.abs(dx) ? ew : Math.abs(dx) * 2 < Math.abs(dy) ? ns : `${ns}-${ew}`;
    }
    milestone(w, who
      ? `At first light ${who.name} sees four deer grazing on the open grass ${where} of the village. They lift their heads, stare, and are gone into the trees. Not everything in the woods of ${w.name} has teeth.`
      : `Deer are seen grazing on the open grass at first light.`);
  },
  // v12 -> v13: sea fog joins the weather. The first fog bank is noticed in-world when it comes.
  12: (w) => {
    w.stats.fogs = w.stats.fogs || 0;
    w.stats.yg = w.stats.yg || 0;
  },
  // v13 -> v14: herb lore. Nothing to change yet; the first fever death (or a long nursing) teaches it.
  13: (w) => {
    if (w.heal === undefined) w.heal = null;
  },
  // v14 -> v15: remember when each discovery was made. Older ones are read back from the chronicle.
  14: (w) => {
    const seen = { fishing: /learns to fish/, granary: /learns to build granaries/, hunting: /learn to hunt/, midsummer: /longest day/,
      fencing: /fence/i, paths: /path/i, burial: /bur(y|ial)/i, herbs: /herb|healer/i };
    w.learned = { fire: 0, shelter: 0, gather: 0, farming: 0, woodcut: 0 };
    for (const id of w.techs) if (!(id in w.learned)) {
      const e = seen[id] && (w.log || []).find((l) => l.k === 'major' && seen[id].test(l.text));
      w.learned[id] = e ? e.t : w.t;
    }
    w.nLearned = w.techs.length;
  },
  // v15 -> v16: rats. None yet; they come on their own once the heaps grow large.
  15: (w) => {
    if (w.rats === undefined) w.rats = null;
  },
  // v16 -> v17: goats. None yet; a raft brings the first three ashore some spring or summer day.
  16: (w) => {
    if (w.goats === undefined) w.goats = null;
  },
  // v17 -> v18: lost in the fog. Nobody has strayed yet; the first fog day that takes someone is told in the chronicle.
  17: (w) => {
    if (!w.lost) w.lost = { n: 0, y: 0, f: 0, d: 0, cur: null };
  },
  // v18 -> v19: the fog horn. Count the wolf attacks that came out of the fog so far; the next fog morning after one teaches it.
  18: (w) => {
    if (w.horn === undefined) w.horn = null;
    if (w.fauna && w.fauna.fa === undefined) {
      const seen = new Set();
      for (const l of [...(w.chronicle || []), ...(w.log || [])]) if (/wol/i.test(l.text) && /(out of the fog|in the fog)/.test(l.text) && !/wandered off/.test(l.text)) seen.add(l.t + ' ' + l.text);
      w.fauna.fa = seen.size;
    }
  },
  // v19 -> v20: the far isle. Nobody has come yet; a towering midsummer fire may bring the first boat.
  19: (w) => {
    if (w.isle === undefined) w.isle = null;
  },
  // v20 -> v21: wolves at the goat pen. No winter raid yet; the pen gets counters and a wattle that can be torn.
  20: (w) => {
    if (w.goats) for (const k of ['pr', 'pk', 'yp', 'gap']) if (w.goats[k] === undefined) w.goats[k] = 0;
  },
  // v21 -> v22: deeds. Every islander starts a tally (p.dd); the hunts and finds the island still speaks of are counted in.
  // Nobody gets a byname here: the first is given in-world, when someone passes a mark.
  21: (w) => {
    if (!w.by) w.by = {};
    const byName = new Map(w.people.filter((p) => !p.dead).map((p) => [p.name, p]));
    const seen = new Set();
    const add = (nm, k) => {
      const p = byName.get(nm);
      if (p) { const d = p.dd || (p.dd = {}); d[k] = (d[k] || 0) + 1; }
    };
    for (const l of [...(w.chronicle || []), ...(w.log || [])]) {
      const key = l.t + ' ' + l.text;
      if (seen.has(key)) continue;
      seen.add(key);
      const m = /^(\S+)(?: and (\S+))? (spears? a boar|tracks? the pack to its den|creeps? up through the long grass)/.exec(l.text);
      if (m) {
        const k = m[3][0] === 's' ? 'b' : m[3][0] === 't' ? 'w' : 'd';
        add(m[1], k); if (m[2]) add(m[2], k);
        continue;
      }
      const f = /^(\S+) finds \S+ .*brings (?:him|her) home/.exec(l.text);
      if (f) add(f[1], 'l');
    }
  },
  // v22 -> v23: dogs. None yet; a cub may be found at the edge of the woods from this spring on.
  22: (w) => {
    if (w.dogs === undefined) w.dogs = null;
  },
  // v23 -> v24: the longest night. No tale told yet; the first is told at the hearth this winter.
  23: (w) => {
    if (w.tale === undefined) w.tale = null;
  },
  // v24 -> v25: raiders. Nothing yet; once the far isle has seen the granaries, a thin year there may bring them by night.
  24: (w) => {
    if (w.raid === undefined) w.raid = null;
  },
  // v25 -> v26: pottery. No jars yet; once the rats have eaten enough grain, someone thinks of sealing it away.
  25: (w) => {
    if (w.pot === undefined) w.pot = null;
  },
  // v26 -> v27: the beach watch. Not set yet; once twice raided, it is learned when the raiding season opens.
  26: (w) => {
    if (w.watch === undefined) w.watch = null;
  },
  // v27 -> v28: peace gifts. Not learned yet; the first thin-year guests after a raid go home with grain.
  27: (w) => {
    if (w.raid) { w.raid.peace ||= 0; w.raid.pg ||= 0; w.raid.yv ||= 0; w.raid.gift ||= 0; }
  },
};
export function migrate(w) {
  while (w.v < SIM_VERSION) {
    const m = MIGRATIONS[w.v];
    if (m) m(w);
    w.v++;
  }
  return w;
}

// ---------- summaries ----------
export function summary(w) {
  const c = clock(w.t);
  const adults = w.people.filter((p) => ageY(w, p) >= 14).length;
  return {
    name: w.name, year: c.year, season: SEASONS[c.season], day: c.dos, hour: c.hour,
    pop: w.people.length, adults, children: w.people.length - adults,
    food: Math.floor(w.food), timber: Math.floor(w.timber),
    houses: w.buildings.filter((b) => b.progress >= 1 && isHouse(b)).length, fields: w.fields.length,
    granaries: w.buildings.filter((b) => b.progress >= 1 && b.kind === 'granary').length, safe: storeCap(w),
    births: w.stats.births, deaths: w.stats.deaths, peak: w.stats.peak,
    weather: w.wx ? WEATHER[w.wx.k].name : 'clear', weatherDays: w.wx ? w.wx.n : 1,
    roofsDown: w.buildings.filter((b) => b.dmg && isHouse(b)).length,
    wolves: (w.beasts || []).filter((b) => b.k === 'wolf').length, boars: (w.beasts || []).filter((b) => b.k === 'boar').length,
    afraid: !!(w.fauna && w.fauna.fear > w.t), hurt: w.people.filter((p) => p.hurt).length,
    hunting: w.techs.includes('hunting'), hides: w.hides || 0,
    fencing: w.techs.includes('fencing'), fenced: w.fields.filter((f) => f.fence).length,
    boarsTaken: (w.fauna && w.fauna.sb) || 0, wolvesTaken: (w.fauna && w.fauna.sw) || 0,
    deer: (w.beasts || []).filter((b) => b.k === 'deer').length, deerTaken: (w.fauna && w.fauna.sd) || 0,
    festival: !!(w.fest && w.fest.on === c.day && c.hour >= FEST_FROM && c.hour < FEST_TO), midsummers: (w.fest && w.fest.n) || 0,
    sick: w.people.filter((p) => p.sick).length, fevers: (w.fever && w.fever.k) || 0, feverLost: (w.fever && w.fever.lost) || 0,
    paths: w.paths || 0,
    graves: (w.yard && w.yard.n) || 0, lying: (w.graves || []).length,
    herbs: w.heal ? w.heal.s : 0, healer: (w.heal && w.heal.id != null && w.heal.nm) || null, tended: (w.heal && w.heal.n) || 0,
    rats: w.rats ? w.rats.n : 0, ratsAte: w.rats ? Math.round(w.rats.y) : 0, ratsCame: !!w.rats,
    goats: w.goats ? w.goats.herd.length : 0, goatsCame: !!w.goats, goatsLost: w.goats ? w.goats.lost : 0, penRaids: w.goats ? w.goats.pr || 0 : 0, penTaken: w.goats ? w.goats.pk || 0 : 0, penYear: w.goats ? w.goats.yp || 0 : 0,
    horn: (hornOn(w) && (aliveId(w, w.horn.hid) || {}).name) || null, hornFound: w.horn ? w.horn.f : 0,
    lost: (w.lost && w.lost.cur && (aliveId(w, w.lost.cur.id) || {}).name) || null, lostEver: w.lost ? w.lost.n : 0,
    isleVisits: w.isle ? w.isle.n : 0, isleWed: w.isle ? w.isle.wed : 0, isleGone: w.isle ? w.isle.gone : 0,
    guests: w.isle && w.isle.boat ? w.isle.boat.gs.filter((g) => !g.isl).length : 0,
    dogs: w.dogs ? w.dogs.d.length : 0, dogsCame: !!w.dogs, dogsTurned: w.dogs ? w.dogs.k : 0, dogsFound: w.dogs ? w.dogs.f : 0, dogsRats: w.dogs ? w.dogs.r : 0,
    tales: (w.tale && w.tale.n) || 0, teller: (taleNow(w, c) && (aliveId(w, w.tale.id) || {}).name) || null,
    raids: w.raid ? w.raid.n : 0, raidGrain: w.raid ? w.raid.g : 0, raidsDriven: w.raid ? w.raid.d : 0, raidLean: !!(w.raid && w.raid.lean === c.year),
    watch: !!w.watch, watcher: (watchOn(w) && (aliveId(w, w.watch.hid) || {}).name) || null, watchNights: w.watch ? w.watch.n : 0, watchTurned: w.watch ? w.watch.s : 0,
    gifts: (w.raid && w.raid.peace) || 0, giftGrain: (w.raid && w.raid.pg) || 0, gifted: !!(w.raid && w.raid.gift === c.year),
    raiders: w.raid && w.raid.cur ? w.raid.cur.st : null, feud: !!(w.isle && w.isle.feud >= c.year),
    jars: w.pot ? w.pot.j : 0, jarsWet: w.pot ? w.pot.wet : 0, jarsSealed: Math.round(sealed(w)), potter: (w.pot && w.pot.id != null && w.pot.nm) || null, firings: w.pot ? w.pot.f : 0,
    goatMilk: w.goats ? Math.round(w.goats.ym) : 0, herder: (w.goats && w.goats.hid != null && (w.people.find((p) => p.id === w.goats.hid) || {}).name) || null,
  };
}

export function fingerprint(w) {
  const s = JSON.stringify(w);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
