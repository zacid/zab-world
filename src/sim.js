// Deterministic island simulation. Runs identically in Node and the browser.
// Rules: no Math.random, no Date, no trig/exp in the step path; all state lives in
// the JSON-serialisable world object so save -> load -> continue == continue.

export const SIM_VERSION = 70;
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
  race:     { name: 'Midsummer race', added: '2026-11-24T21:12Z', desc: 'Before the feast the young of the island, from nine to thirty, line up by the bonfire, run out to a hazel stake across the open grass, slap it and run back. The whole village shouts them home. The winner wears an oak-leaf wreath for the rest of the night, and a single winner of age seldom goes home unpledged. Win three times and the island calls you the Swift.', req: ['midsummer'] },
  paths:    { name: 'Footpaths', added: '2026-11-15T01:30Z', desc: 'Nobody lays them out: the grass the islanders cross every day is trodden down to bare earth. Walking is quicker on a path, and the woods cannot creep back over it. Unused paths grass over.', req: ['shelter'] },
  burial:   { name: 'Burying ground', added: '2026-11-15T01:59Z', desc: 'A low ring of stones near the village where the dead are laid in rows, each under a mound and a marker. The morning after a death the family stands at the graveside.', req: ['shelter'] },
  herbs:    { name: 'Herb lore', added: '2026-11-15T05:00Z', desc: 'Willow bark and bitter leaves from the edge of the woods, dried in bundles under the eaves. One healer goes from bed to bed: a tended fever is half as deadly, a tended wound closes sooner. The basket passes on when the healer dies or grows old.', req: ['gather'] },
  farisle:  { name: 'The far isle', added: '2026-11-17T22:26Z', desc: 'Another isle lies beyond the sea haze, and its people can see a big midsummer fire. Some years a dugout full of strangers paddles over for the dance. They trade hides for grain, and now and then one of them stays to marry an islander who had nobody at home; once the island is crowded, a restless islander may sail away with them.', req: ['midsummer', 'fishing'] },
  foghorn:  { name: 'Fog horn', added: '2026-11-17T21:42Z', desc: 'A great whelk shell from the beach with its tip knocked off. On fog days the oldest islander who can stand keeps by the hearth and blows it every little while. Within earshot nobody is alone: a wolf will not single out someone who can call back to the horn. Someone lost in the grey can follow the sound home.', req: ['fire', 'fishing'] },
  tales:    { name: 'Winter tales', added: '2026-11-18T01:02Z', desc: 'On the longest night of the year the whole island sits close round the hearth, children in front, and the eldest tells a tale from the island\'s own past: the landing, the dead in the burying ground and what they did, how the named got their names, what the fog can do. A new tale each winter. Once the fog has been told of, the children keep close to the houses when it comes in.', req: ['fire', 'burial'] },
  dogs:     { name: 'Dogs', added: '2026-11-18T00:21Z', desc: 'A wolf cub raised by the hearth that never went back to the woods. Each grown dog keeps at the heels of one islander and sleeps across their doorway. It flies at a wolf that springs on its owner, barks the village awake when the pen is raided, keeps the goats from straying, follows a scent through the fog and snaps up rats. A litter most springs, as many as the scraps can feed.', req: ['hunting'] },
  pottery:  { name: 'Pottery', added: '2026-11-21T00:12Z', desc: 'Clay dug from the bank above the beach, coiled into big-bellied jars and fired in a domed kiln of turf and clay. One potter digs, shapes a jar a day in dry weather and fires them in batches; some crack in the fire. Grain sealed in a jar under a lid of clay is out of reach of the rats. Jars break with use and must be made again.', req: ['granary', 'fire'] },
  watch:    { name: 'Beach watch', added: '2026-11-21T02:39Z', desc: 'Robbed twice by the far isle, the village keeps watch. On autumn and early-winter nights one islander in turn sits up by a driftwood fire on the beach below the granary and watches the sea. A dugout seen coming in is shouted at with a burning branch and turns back before it lands. The fire keeps the wolves off; the watcher sleeps late the next morning.', req: ['fire', 'farisle'] },
  wading:   { name: 'The shallows', added: '2026-11-21T11:20Z', desc: 'On hot summer afternoons the children are let off down to the beach below the village. They wade in to the knee, shriek at the cold, splash each other and feel in the wet sand with their toes for cockles, which they carry home in their shirts. The beach is close to the houses, but the sea pulls harder than it looks, and now and then someone grown has to go in after a child who went too far.', req: ['fishing'] },
  snowmen:  { name: 'Snowmen', added: '2026-11-21T04:41Z', desc: 'When the snow lies deep the children are sent out of the smoke and onto the green by the hearth. They roll it into balls, stack three, and give each figure pebble eyes, a stick nose and a name: often the name of someone the island tells of. Up to three stand at once, the rest of the snow goes in fights. They keep all winter and slump into the mud in the first warm days of spring.', req: ['fire'] },
  gifts:    { name: 'Peace gifts', added: '2026-11-21T03:05Z', desc: 'The far isle has thin years, and in a thin year its dugout comes back by night for the granaries. Once robbed, the islanders learn the signs: guests who come to midsummer with sharp cheekbones and nothing to trade. Before they push off at first light each one is given a sack of grain to carry home, and that autumn nobody comes by night.', req: ['farisle'] },
  canoe:    { name: 'Dugout', added: '2026-11-21T06:13Z', desc: 'A tall oak felled above the beach, its back burnt out with small fires and scraped hollow with shell adzes, a little each dry day. Pushed into the sea it carries one islander past the surf to the deep water, where the shore fishers cannot reach and the big fish are. Out on calm days from spring to autumn, home by mid-afternoon. A storm can drag it off the sand and smash it, and in time the sun splits it, and a new oak must be felled.', req: ['fishing', 'farisle', 'woodcut'] },
  coppice:  { name: 'Coppice', added: '2026-11-21T07:01Z', desc: 'A hazel cut low sends up a ring of straight poles from the stump. Trees felled near the village are left as stools instead of grubbed out; the fields and houses go round them and the goats and deer are kept off. A stool grows back to a stand of poles in a year or two, far faster than a wild tree, so there is still wood in reach of the hearth when the fields have eaten the woods.', req: ['woodcut'] },
  hedges:   { name: 'Hedges', added: '2026-11-21T09:42Z', desc: 'Slips of hawthorn dug from the wood\'s edge and set a hand apart along the fields by the trees, in autumn and winter while the thorn sleeps. For three years a hedge is only twigs behind the wattle; then it is a wall of thorn that turns nearly every boar and keeps the goats out of the grain. It costs no timber, does not rot and stands up to storms, so the fence behind it is left to fall. Only fire kills it.', req: ['fencing'] },
  whale:    { name: 'Whales', added: '2026-11-21T10:08Z', desc: 'Once in a few years a long storm drives a whale onto the sand. The morning after, everyone who can hold a flint knife goes down to the beach and cuts: strips of meat for the stores, blubber for the fires. In three days it begins to stink and the gulls and the tide take what is left; the great ribs stay on the beach for good.', req: ['fishing'] },
  smudge:   { name: 'Smudge fires', added: '2026-11-21T11:57Z', desc: 'Twice blackened by a late frost, the village fights back. When a spring cold snap settles in and the evenings turn clear and still, the young and strong carry damp straw and green wood out between the rows at dusk and keep small fires smouldering till dawn. The smoke lies low over the young grain like a blanket and the frost mostly cannot settle under it. It costs firewood and a night\'s sleep; the smudgers lie in late the next morning.', req: ['fire', 'farming'] },
  frost:    { name: 'Late frost', added: '2026-11-21T10:44Z', desc: 'Some springs the cold comes back after the sowing. On a still, clear night the frost settles on the fields, and by morning the young green shoots have gone black and limp. Grain killed while it is still short has to be dug over and sown again; grain already knee-high only has its leaf tips burnt. Nobody on the island yet knows how to read a frost coming.', req: ['farming'] },
  moon:     { name: 'Moon lore', added: '2026-11-21T12:31Z', desc: 'The moon fills and empties every thirty days, twelve times a year. Sitting up night after night by the beach fire, the watchers learn what the far isle already knew: a dugout only comes in when the moon is dark, or under a fog. A notch is cut in the doorpost of the granary for each night, and on bright nights the beach fire is left unlit and the watcher sleeps in a bed. Fog still keeps somebody down by the water.', req: ['watch'] },
  rust:     { name: 'Grain rust', added: '2026-11-21T13:07Z', desc: 'In a warm, wet summer orange flecks come up on the leaves of the grain, like rust on a blade. Wet days and wind carry it from a spotted field to the fields beside it, and wherever it sits the ears fill thin and light. Hot dry weather stops it; the harvest or the autumn frost ends it for the year. Fields packed side by side lose the most. Nobody on the island yet knows how to stop it spreading.', req: ['farming'] },
  rogue:    { name: 'Rogueing', added: '2026-11-21T14:42Z', desc: 'After a bad rust year the islanders treat sick grain the way the healer treats a fever: keep it apart from the well. A day or two after orange flecks are seen in a field, idle hands walk its rows, pull every spotted plant up by the roots and carry the armfuls off to burn. The field gives a little less, but the rust goes no further from it. Once every spotted field is pulled clean, the outbreak is over. The faster the rows are walked, the fewer fields it reaches.', req: ['rust'] },
  bees:     { name: 'Bees', added: '2026-11-21T15:23Z', desc: 'A wild swarm found humming in a hollow tree, the log sawn off and stood up by the houses with a flat stone on top. The bees work the flowers from spring into autumn. When a hive grows crowded in late spring, half of it swarms; caught in time, it fills a new log. In late summer someone takes the honey with a smoking brand and leaves the bees enough to eat through the winter. A poor summer or a long hard winter can starve a hive. Honey dresses wounds, and at midsummer it is poured out as mead.', req: ['woodcut'] },
  lone:     { name: 'The lone wolf', added: '2026-11-21T16:37Z', desc: 'Years of spears have kept the pack at the den down to two, and a young wolf driven out of it has no pack to run with. It stays near the village, lies up in a thicket by the fields and walks the treeline by day, when the pack sleeps. It takes goats that stray and springs on anyone working alone. While it lives every hunt goes after it, and the pack at the den is left to grow. If nobody kills it, in a few years it moves on.', req: ['hunting'] },
  lore:     { name: 'Sky lore', added: '2026-11-21T20:43Z', desc: 'The eldest has sat out a lifetime of storms and at dusk reads the sky over the sea: a red sky in the west with mares\' tails high up, a long swell under a flat sea, gulls coming in off the water, hearth smoke that beats down instead of rising. When the signs say a storm by morning the village works on into the dark: the ripe grain is cut by firelight, and ropes weighted with stones are thrown over every roof so the wind cannot lift the thatch. The signs are not always right, and some storms come without any.', req: ['fire', 'shelter'] },
  muck:     { name: 'Muck', added: '2026-11-21T21:34Z', desc: 'Dung forked out of the goat pen goes on a heap beside it, with the hearth ash and the kitchen scraps, and steams there through the winter. After the harvest it is carried out in baskets and forked over the bare fields, nearest the pen first. A mucked field stands thicker and heavier at its next harvest, by about a third, so the village needs fewer fields and fells less of the wood. The more goats, the bigger the heap.', req: ['goats', 'farming'] },
  cheese:   { name: 'Cheese', added: '2026-11-22T02:52Z', desc: 'Half the summer milk goes into the pails instead of the cups. It is curdled, pressed in a wicker basket under a stone and set out on a rack of hazel rods by the goat pen, where the rounds dry and harden and keep for months. On the bitter days of winter, and whenever the woodpile is bare, rounds come down off the rack and are shared out by the fire among the small children and the old, and the cold reaches them less than half as hard.', req: ['goats'] },
  footrot:  { name: 'Foot rot', added: '2026-11-21T22:51Z', desc: 'After days of rain the goat pen turns to a wallow of mud and dung, and the hooves go soft in it. A goat starts holding up a foot and hobbling on three; the hoof is grey and stinking between the claws. Lame goats lie in the straw and will not go out to graze, give no milk and kid no more, and a few never stand up again. It passes from hoof to hoof through the mud, fastest when the pen is wet and crowded, and goes when the ground dries. Nobody yet knows what to do for it.', req: ['goats'] },
  paring:   { name: 'Hoof paring', added: '2026-11-21T23:32Z', desc: 'A little hurdle fold against the goat pen, with a dry straw floor. A day after a goat starts to limp it is caught, the soft grey horn is pared back with a flint to clean hoof, the foot is washed in sea water or the healer\'s willow-bark brew, and the goat is put in the fold until it walks sound. Out of the mud it passes the rot to nobody and mends in days instead of weeks; caught early, an outbreak stops at a goat or two.', req: ['footrot'] },
  cloak:    { name: 'Wolf-skin cloak', added: '2026-11-22T00:06Z', desc: 'The pelt of a lone wolf, bigger and paler than any from the den, scraped, rubbed with ash and brains and worn over the shoulders by the one whose spear killed it. No wolf will single out someone who walks in a wolf\'s skin. When the wearer dies the cloak goes to the eldest child, or to the widow or widower; with nobody to take it, it is laid in the grave.', req: ['lone'] },
  squall:   { name: 'Squalls', added: '2026-11-22T02:14Z', desc: 'Out past the surf the weather turns faster than anyone on the beach can see. On a hot afternoon, or in autumn, or the day before a storm, a black squall can come down on the deep water in minutes: wind, slanting rain and a short steep sea. The one in the dugout turns for home and fights the paddle; the village runs down to the landing to watch. Some come in through the surf with the catch thrown over the side, some are rolled over and swim for it, and the sea keeps a few. Nobody has an answer for it yet.', req: ['canoe'] },
  crows:    { name: 'Rooks', added: '2026-11-22T03:27Z', desc: 'A flock of rooks from the woods that comes down by day on new-sown fields to dig out the seed, and on the ripe grain to strip the ears. A field picked bare of its seed has to be sown again. The flock grows a little every year with the fields.', req: ['farming'] },
  scaring:  { name: 'Bird-scaring', added: '2026-11-22T03:27Z', desc: 'Two flat boards tied loosely with a thong, swung so they clap like a breaking branch. When the rooks come down on the grain the children run out with clappers and stones and shout until the flock lifts and goes back to the trees for a while. A flock driven off often enough in a year loses some of its birds to other woods.', req: ['crows'] },
  scarecrow: { name: 'Scarecrows', added: '2026-11-24T22:42Z', desc: 'Two poles lashed in a cross and driven into the middle of a field, stuffed with straw, a turnip-pale head and an old hide hung on the arms to flap in the wind. A flock that wheels in over the rows sees a man standing there and goes on to a field nobody is guarding. Rooks are not fools: every time they are turned away they look a little longer, and in a few weeks one lands on its head and the rest come down around it. Then it has to be pulled up and stood somewhere new, where they have not seen it yet. One dressed in a hide frightens them longer than one in straw.', req: ['scaring'] },
  foglore:  { name: 'Fog signs', added: '2026-11-22T04:18Z', desc: 'The sky reader learns the fog as well as the storm. On the evening before a sea fog the wind dies away, the sea lies flat and oily, the far isle stands up sharp and close, and the dew comes down heavy before dark. When the eldest says "fog by morning", the goats stay shut in the pen next day and the small children and the old are kept by the houses, so the wolves that walk in the grey find nothing to take. Once the fog is down, anyone can see it, and the goats stay in until it lifts. Some fogs come in with no sign the evening before.', req: ['lore', 'goats'] },
  drought:  { name: 'Dry spring', added: '2026-11-22T04:45Z', desc: 'The spring by the village is fed by the rain. A hot, dry summer draws it down, and the more mouths there are the faster it goes, until one morning there is only cracked mud between the stones. Then the water comes from a deep pool in the woods, a long walk each way with a skin bag, or a jar once there is a potter. On a day with too few carries the small children and the old go thirsty and some sicken, and the goats give less milk. The autumn rains fill the spring again. Nobody has an answer for it yet.', req: ['fire'] },
  bear:     { name: 'The bear', added: '2026-11-24T20:06Z', desc: 'Some summers, when the bees are heavy with comb, a brown bear wades over the sand bar from the far isle at low tide and lies up in a thicket near the village until the first frosts. On quiet nights it comes out of the trees for the honey logs and the cheese rack: it tears the comb out with its claws, sometimes knocks a log over and splits it, and pulls the rounds off the rods. If a dog barks or someone sleeping nearby wakes, they run out with a burning brand and shout it back into the dark, and now and then it turns and swipes before it goes. A bear nobody kills comes back. Nobody has an answer for it yet.', req: ['bees'] },
  bearpit:  { name: 'Bear pit', added: '2026-11-25T21:15Z', desc: 'A pit as deep as a man is tall, dug between the bee logs and the trees the bear comes out of, with a wattle hurdle over it while no bear is on the island. When the clawed prints come in off the bar again, the hunters drive sharpened stakes into its floor and hide it under hazel rods and turf. A bear walking in for the comb may go straight through it, and in the morning the spears finish it from the rim: meat for the stores, a great skin for one hearth. A wary bear smells the fresh earth and goes round, and a child running about in the dark can find it too.', req: ['bear', 'hunting'] },
  seals:    { name: 'Seals', added: '2026-11-24T20:41Z', desc: 'Grey seals that followed the dugout in from the deep water. They haul out on a quiet beach out of sight of the village, lie on the sand groaning to each other, and slide into the sea when anyone comes near. They eat from the same deep water as the dugout all year round, and every early winter they pup on the sand, so the herd grows and the catch out past the surf grows thin.', req: ['canoe'] },
  sealing:  { name: 'Sealing', added: '2026-11-24T20:41Z', desc: 'When the white pups are on the sand in early winter, a hunter walks out with a short blackthorn club and keeps between the seals and the sea. Most days they all flop into the water first; now and then one is taken and carried home: meat for the pot, blubber for the fires and a thick grey skin. An old bull may rear up and bite. After each try the herd keeps to the water for days, and it is never taken below eight, or it would not come back. A sealskin sewn up and blown full like a bladder rides in the dugout, and whoever a squall rolls into the sea hangs on to it; the sea keeps far fewer. A float perishes after a few years and is sewn again.', req: ['seals', 'hunting'] },
  goats:    { name: 'Goats', added: '2026-11-17T20:22Z', desc: 'A wattle pen beside the village and a child with a crook. The herd grazes the open grass by day and eats the saplings back, gives milk in spring and summer, eats spare grain in winter, and the surplus goes to the pot in autumn. Unminded goats get into the young grain; in fog the wolves come for them.', req: ['fencing'] },
  stones:   { name: 'Standing stones', added: '2026-11-25T03:47Z', desc: 'A ring of eight stakes on open grass away from the houses, and grey boulders as long as a man lying on the shore. Every summer, once the grain is in and the stores are full, the strongest go down with ropes of plaited hide and an armful of logs, lever one boulder onto the rollers and drag it up to the ring, a few steps at a time, moving the back log to the front as they go. A pit is dug, the stone tipped in and hauled upright, and that night there is a feast in the ring. Each stone is raised for one of the dead. Now and then it slews off the logs onto a foot.', req: ['burial', 'midsummer'] },
  vigil:    { name: 'The night at the stones', added: '2026-11-26T07:51Z', desc: 'In the first autumn after turning thirteen, on a clear night near the full moon, a child of the island walks out to the standing stones after supper with a cloak and a heel of bread. The eldest goes as far as the ring and turns back. The child sits alone till first light by a stone raised for one of the dead, a small fire in the middle of the ring, and walks home at dawn to the first bowl at the hearth, counted among the grown. An owl, a howl in the woods or a stone that seems to lean in the firelight sends some running home in the dark; they must sit it again, and nobody is pledged to one who ran until they have.', req: ['stones'] },
  feud:     { name: 'Feuds', added: '2026-11-25T20:06Z', desc: 'Two households next door to each other fall out over something small: goats in the young grain, a trip at the race, comb gone from the bee log, a stone thrown at a dog. Then they stop speaking. A thorn branch lies across each doorstep, they sit apart at the fire, and no child of one is married to a child of the other. Now and then it comes to blows and somebody is laid up for a few days. It can last for years, and it ends at a graveside if nothing ends it sooner.', req: ['fire'] },
  peacecup: { name: 'The peace cup', added: '2026-11-25T20:06Z', desc: 'At midsummer or on the longest night the eldest who is not of either house brings the two heads of a feud into the firelight and makes them drink from one bowl, mead if there is any, in front of everyone. Once it has worked, it is the custom: a quarrel is brought to the next gathering and nearly always ended there, and fewer of them come to blows while they last. Often a match between the two houses seals it.', req: ['feud', 'midsummer'] },
  incomers: { name: 'Incomers', added: '2026-11-25T20:38Z', desc: 'The far isle is small and stony, and some springs a household there has nothing left to stay for: a thin year that ate the seed grain, a house burnt in the winter, a husband lost at sea, a match a father will not allow. They load their dugout with bundles and a pot of embers and come over by day. While the granaries are full and the island has room, the eldest takes them in. They sleep where there is space until a house is raised for them, their dugout is broken up for its roof-beams, and their children grow up to marry island children.', req: ['farisle'] },
  loom:     { name: 'Spinning and weaving', added: '2026-11-25T21:44Z', desc: 'Each spring, when the goats moult, the herder combs the loose winter coats out of them with a bone comb. The children and the old spin the hair into yarn on drop spindles, a stone whorl twirling on a thread, in every idle moment. One weaver keeps an upright loom against the wall of their house, the warp threads pulled straight by hanging weights, and on winter days and wet days the cloth grows on it a finger at a time. A blanket on every bed means a house keeps warm on less firewood, and the cold reaches the small and the old less hard. Blankets wear through in a few years and have to be woven again.', req: ['goats'] },
  surge:    { name: 'Storm tides', added: '2026-11-26T00:44Z', desc: 'Twice a month, at new moon and full moon, the tide runs higher than on other days. When a gale out of the sea comes on top of such a tide, the water does not stop at the sand: it pours over the low ground behind the beach, through the hedges and over the nearest fields. In a day it drains away, and leaves the earth grey and crusted with salt. Grain sown in it comes up yellow and dies, so a drowned field lies bare until enough rain has fallen to wash the salt back out, most of a year. The tide line is left heaped with wrack and driftwood. Nobody has an answer for it yet.', req: ['farming'] },
  ale:      { name: 'Ale', added: '2026-11-26T06:44Z', desc: 'Grain that gets wet in the jar sprouts; dried by the fire, cracked on a flat stone and steeped in hot water, it turns sweet, and a few days later it froths and turns to ale. One brewer keeps a wooden vat against the wall of their house and mashes a sack of the spare grain whenever the jugs run low. Ale is poured at midsummer and on the night the last sheaf comes in, the harvest home, when the whole village sits up late round the hearth. When the spring fails the children drink small ale and fewer skins have to come in from the pool. Ale goes sour in the summer heat, and a jug too many can turn words into blows.', req: ['pottery'] },
  well:     { name: 'The well', added: '2026-11-26T11:43Z', desc: 'The water of the spring does not come from the stones but up from under them. Once the spring has failed, it is dug down in the dry of the year while the water is low: one islander in the shaft with a digging stick, another hauling up the clay in a basket, the sides lined ring on ring with round stones from the beach. A ring is dug in a summer when the water gets down near the bottom, four at most before the rock. Each ring lets the spring fall further before there is only mud, and past two rings a sweep pole on a forked post dips the bucket. A wet side can slump in on the digger. More mouths draw it down faster, and in a long hot summer the deepest well can still go dry.', req: ['drought'] },
  wreck:    { name: 'Castaways', added: '2026-11-26T12:19Z', desc: 'Some autumn and winter gales out of the open sea throw up more than weed: the broken planks of a boat from no shore anyone on the island knows, and now and then someone still alive among them, face down in the surf and blue with cold. The morning after, whoever walks the beach first runs for help, and two of them carry the stranger up between them to the herb-healer\'s fire. Out on the sand in winter the cold kills in hours, so a long walk can come too late; the drowned are buried with the island\'s own. Those who live stay. For a year they have only their own name and a few island words; after that they can tell where the sea took them from. The planks are dragged up above the tide line and the ribs of the boat are left on the sand.', req: ['fishing'] },
  cough:    { name: 'Whooping cough', added: '2026-11-25T00:43Z', desc: 'A cough that comes in long fits until the child cannot breathe, then a great whooping gasp. Every settler had it as a child far over the sea, and anyone who has had it never takes it again, so it waits until enough children have been born who never have. Then it goes through them in a few weeks, in the house and wherever they play together. The big children are kept by the door; a mother sits at home with a coughing baby. It is the babies it kills. Nobody has an answer for it yet.', req: ['fire'] },
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
// sky lore: the eldest reads the dusk sky and calls a storm a day ahead. Once it is learned, tomorrow's weather is rolled a
// day early (w.wx.nx) so a reading can be right; the reader still misses some storms and calls some that never come
const LORE_STORMS = 100;     // storm days the island has lived through before the signs are put together
const LORE_AGE = 30;         // and the eldest must be at least this old
const LORE_READ = 19;        // the hour the sky is read, at the evening fire
const LORE_HIT = 0.8;        // chance a coming storm is read right
const LORE_FALSE = 0.025;    // chance, on an evening before rain or fog, of calling a storm that never comes
const LORE_LATE = 23;        // on a warned night the work goes on until this hour
const LORE_HOLD = 0.85;      // chance a stone-weighted roof holds through a gust that would have torn it
const LORE_REAP = 2;         // hours to cut a ripe field by firelight, all hands
// fog signs: once the fog has cost the village (a wolf out of it, someone lost in it), a long fog that ends teaches the
// reader its signs. w.lore gains fl (tick learned), fnm (who), fg (day fog is called for), fn calls, fh right, fm missed,
// ff false, fk days the goats were kept in, fc strays kept by the houses.
const FOG_LEARN = 2;         // days a fog must last before its signs are put together
const FOG_HIT = 0.7;         // chance a coming fog is read right (fog gives fewer signs than a storm)
const FOG_FALSE = 0.004;    // chance, on an evening before a clear day, of calling a fog that never comes
const FOG_HEED = 0.85;       // chance, while the fog is kept, that a child or old one who would stray stays by the houses
const FOG_FRESH = () => ({ fl: null, fnm: null, fg: -1, fn: 0, fh: 0, fm: 0, ff: 0, fk: 0, fc: 0 });
const FOG_SIGNS = ['the wind has died away and the sea lies flat and oily', 'the far isle stands up sharp and close, every tree on it plain', 'the dew is down on the grass before dark', 'the sea is warm and the air above it cold and still', 'the hearth smoke hangs in a flat sheet over the roofs'];
const LORE_SIGNS = ['the sky in the west is red as an ember and mares\' tails stand high up', 'a long swell rolls in under a sea as flat as a plate', 'the gulls are coming in off the sea in a hurry', 'the hearth smoke beats down and creeps along the ground', 'a ring stands round the sun as it goes down'];

// ---------- creatures ----------
const WOLF_SPEED = 4;        // tiles per hour
const BOAR_SPEED = 3;
const WOLF_SAFE = 49;        // wolves keep 7 tiles from the hearth (squared)
const WOLF_STALK = 0.015;   // chance per hour that a prowling wolf picks out a lone villager nearby (a third by day)
const WOLF_KILL = 0.2;      // share of attacks on someone alone that end in death
const WOUND_DAYS = 12;
const FEAR_DAYS = 45;        // after an attack, nobody lingers outside at dusk or dawn
const BOAR_RAID = 0.08;      // chance per spring/summer night that the boars come for the growing grain
// ---------- the lone wolf ----------
// Once the spears have held the pack down for years, a young wolf driven from the den with no pack to
// join may stay near the village. It lies up in a thicket close to the fields and walks out by day.
const LONE_KILLS = 3;        // wolves the hunters must have taken before one turns up
const LONE_DAY = 60;         // the day of the year it may be first seen (spring, after the cubs)
const LONE_ODDS = 0.5;       // chance that spring, once the pack is held at two
const LONE_GAP = 8;          // years before another can come after one is gone
const LONE_STALK = 0.006;   // chance per hour at the treeline that it picks out someone alone or a goat
const LONE_REST = 5;         // days it lies low after it strikes
const LONE_YEARS = 3;        // a lone wolf nobody kills moves on after this long
const LONE_HUNT = 0.1;     // chance the hunters corner it at its bed (a pair; alone it is half that)
const LONE_NAMES = [['One-Ear', 'one ear torn half away'], ['Greyback', 'a back gone grey as ash'], ['Pale-Eye', 'one eye milky and blind'],
  ['Longshank', 'legs as long as a deer\'s'], ['Scar-Muzzle', 'an old white scar across its muzzle']];

// ---------- the bear ----------
// Once the village keeps honey or cheese, now and then a summer brings a bear over the bar from the far isle.
const BEAR_YEAR = 5;         // the first summer one can come
const BEAR_DAY = 150;        // the day of the year it may wade over (late summer, the comb heavy in the logs)
const BEAR_LEAVE = 282;      // the day it goes back over the bar (the first frosts)
const BEAR_ODDS = 0.5;       // chance that summer
const BEAR_GAP = 3;          // years at least between two visits
const BEAR_BACK = 0.6;       // chance the bear that comes is the one that came before
const BEAR_NIGHT = 0.12;     // chance per quiet night it comes out of the trees
const BEAR_SPEED = 2.5;      // tiles per hour
const BEAR_COMB = 7;         // comb it eats each hour at a log
const BEAR_SPLIT = 0.18;     // chance per night at the hives that it knocks a log over and splits it (the hive dies)
const BEAR_CHEESE = 3;       // rounds it pulls off the rack each hour
const BEAR_WAKE = 0.22;      // chance per hour that someone sleeping near wakes and runs out with a brand
const BEAR_BARK = 0.65;      // the same with a grown dog near
const BEAR_NEAR = 100;       // a house this close (squared) is close enough to hear it
const BEAR_SWIPE = 0.12;     // chance it turns and swipes at whoever drives it off (a wound, never worse)
// the bear pit: dug once a bear has been in the village often enough, staked and covered whenever one is on the island
const PIT_NIGHTS = 5;        // nights in the village over one visit (or a split log) before the hunters dig for it
export const PIT_DIG = 64;   // work hours to dig it
const PIT_SPELL = 4;         // hours in one spell of digging
const PIT_FALL = 0.2;        // chance a bear walking in by it goes through the cover
const PIT_WISE = 0.06;       // the same for a bear that has once smelled it out and gone round
const PIT_DAWN = 7;        // the hour the spears come to the rim
const PIT_MEAT = 300;        // meat and fat off a bear
const PIT_HIDES = 2;         // hides' worth of skin
const PIT_CHILD = 0.003;     // chance per day, while it is covered, that a child running about after dusk drops through
const BEAR_NAMES = [['Old Brown', 'a coat the colour of wet bark'], ['Honey-Paw', 'one forepaw pale as a peeled stick'], ['the Grey Sow', 'a grizzled back and a sow\'s heavy belly'],
  ['Broad-Back', 'shoulders as wide as a doorway'], ['Notch-Ear', 'a notch bitten out of one ear']];

// ---------- hunting ----------
const HUNT_GAP = 6;          // days between hunts
const HUNT_WORK = 3;         // hours spent tracking and closing in at the lair
const HUNT_REACH = 24 * 24;  // a lair farther than this from the hearth is out of a day's reach
const HUNT_KEEP = 3;         // hunters leave the last two of a herd, so it can breed again
const MEAT = { boar: 45, wolf: 12, deer: 30, seal: 60 }; // a seal is carried home for the pot like any kill
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
// ---------- hedges ----------
// Hawthorn slips dug from the wood's edge and set along the fields by the woods in autumn and winter.
// A hedge does nothing for three years; grown, it turns nearly every boar, never rots, shrugs off storms
// and costs no timber, so the wattle behind it is no longer mended.
const HEDGE_LEARN = 5;       // fences shouldered through (once fencing is known) before someone thinks of thorn
const HEDGE_WORK = 4;        // hours to dig the slips and set a field's edge
export const HEDGE_GROW = 3 * 360 * 24; // ticks from planting until the thorn is thick enough to hold
const HEDGE_HOLD = 0.97;     // chance a grown hedge turns a boar away
// ---------- muck ----------
// Dung forked out of the goat pen, with hearth ash and kitchen scraps, goes on a heap beside the pen. After the
// harvest idle hands carry it out in baskets and fork it over the bare fields, nearest the pen first. A mucked
// field yields a third more at its next harvest, so the village needs fewer fields and fells less of the wood.
const MUCK_YEARS = 2;        // years of goats before someone sees the grain stand tallest by the pen
const MUCK_NEAR = 6;         // the field whose harvest shows it lies within this many tiles of the pen
const MUCK_GOAT = 1;         // heap per goat per day
const MUCK_HOME = 0.2;       // heap per islander per day (ash and scraps)
export const MUCK_FIELD = 100; // heap it takes to muck one field
export const MUCK_CAP = 40;        // the heap holds at most this many fields' worth
const MUCK_GAIN = 0.3;       // extra yield at the next harvest
const MUCK_WORK = 3;         // hours to fork a field over

// ---------- cheese ----------
// Summer milk curdled, pressed under a stone and dried on a rack by the pen. The rounds keep, and come
// down off the rack on the bitter days of winter for the small children and the old.
const CHEESE_YEARS = 3;      // years of goats before someone sees the milk turn in the sun
const CHEESE_FIND = 0.05;    // daily chance on a warm summer day, once 4+ goats are in milk
const CHEESE_SHARE = 0.5;    // share of each day's milk set aside for the press
const CHEESE_PAIL = 24;      // milk the pails hold; whatever does not fit is drunk
export const CHEESE_MILK = 8; // milk for one round
const CHEESE_WORK = 3;       // hours to curd, press and set out a round
export const CHEESE_RACK = 60; // rounds the rack holds
const CHEESE_FRAIL = 6;      // a round a day feeds this many of the small and the old
const CHEESE_GUARD = 0.4;    // on a day they have cheese, the cold reaches the frail this much as hard

// ---------- the spring ----------
// A spring by the village gives the water. Rain fills it; summer sun and many mouths draw it down. In a
// hot dry summer it can fail, and then water must be carried from a deep pool in the woods, a long walk
// each way. A day with too few carries leaves the small and the old thirsty, and the goats give less.
export const SPRING_FULL = 200; // the spring brim-full
const SPRING_BACK = 40;      // a failed spring runs again once it has filled back to this
const SPRING_GAIN = [['rain', 8], ['storm', 6], ['snow', 4], ['fog', 2], ['cold', 0], ['heat', -8]]; // per day; clear is below
const SPRING_CLEAR = 2;      // a clear day outside summer: the ground still gives
const SPRING_SUN = -2;       // a clear summer day
const SPRING_DRAW = 40;      // in spring and summer, one more point drawn a day for every this many islanders
const SPRING_DRAW_MAX = 4;
const SPRING_DRYYEAR = -1;   // in a dry year (thin harvest called), spring and summer
const SPRING_SKIN = 3;       // islanders one carry keeps in water: a skin bag
const SPRING_JAR = 5;        // with the potter's jars
const SPRING_LATE = 15;      // nobody sets out for the pool after this hour
const SPRING_THIRST = 0.004; // daily death risk for the small and the old on a day with no water at all (twice in a heatwave)
const SPRING_MILK = 0.5;     // share of the milk lost on a day with no water at all

// ---------- midsummer ----------
const FEST_DAY = 135;        // day of the year (summer day 46); rain puts it off a few days, a storm until it passes
const FEST_LAST = 165;       // after this the summer is too far gone and the year goes without
const FEST_FROM = 16, FEST_TO = 23; // hours of the gathering; nobody goes home until it ends
const FEST_LEARN = 10;       // people on the island before anyone thinks to keep the day
const FEST_WOOD = 12;        // timber heaped on the bonfire (at most a quarter of the pile)
const FEST_FEAST = 2;        // extra food each person eats, if the stores can spare it
const FEST_PAIR = 0.4;       // chance a single woman finds a partner in the firelight
const RACE_FROM = 17;        // midsummer race: line up at 17:00, out to the stake at 18:00, back at 19:00, winner crowned at 20:00
const RACE_MIN = 9, RACE_MAX = 30; // who runs: the young, from nine to thirty
const RACE_N = 8;            // at most this many on the line; the rest cheer from the ring
const RACE_LEN = [9, 8, 7, 6]; // tiles out to the turning stake, longest clear run first
const RACE_PAIR = 0.7;       // chance a single winner of 17+ is pledged that night (the wreath helps)
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
// bees: log hives by the houses, honey in late summer, mead at midsummer
const BEE_YEAR = 3;          // from this year a woodcutter may hear a wild swarm in a hollow tree
const BEE_FIND = 0.02;       // daily chance, on a warm summer day, that someone does
const BEE_FLY = { clear: 0.42, heat: 0.3, rain: 0.04, fog: 0.08, cold: 0, storm: 0, snow: 0 }; // comb a hive fills on a day like this
const BEE_FROM = 20, BEE_TO = 230; // flowers from the end of the spring cold to the middle of autumn
const BEE_SEASON = [0.8, 1.2, 0.45, 0]; // blossom in spring, clover and lime in summer, a little heather in autumn
const BEE_COMB = 80;         // comb one log holds
const BEE_EAT = 0.12;       // comb a hive eats on each flowerless day, and twice this in a cold snap or snow
const BEE_KEEP = 22;         // comb left in the log at the honey taking, to see the bees through the winter
const BEE_KEEP_MORE = 12;    // after a winter loss the takers leave 4 more, up to this much more
const BEE_TAKE = 160, BEE_LAST = 215; // the days of the year the honey is taken
const BEE_SWARM = 0.04;      // daily chance in late spring that a crowded hive swarms
const BEE_SWARM_AT = 12;    // comb a hive needs before it is crowded enough to swarm
const BEE_CATCH = 0.7;       // chance the swarm is caught before it flies off into the woods
const BEE_MAX = 8;           // logs in the bee garden at most
const BEE_STORE = 240;       // honey the village can keep
const BEE_STUNG = 0.12;      // chance the honey taker comes home stung
const MEAD_PAIR = 0.6;       // chance a single woman finds a partner at a midsummer with mead (else FEST_PAIR)
const HONEY_WOUND = 2;       // extra days honey on a dressing takes off a wound's healing

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
const RAID_NIGHT = 0.05;     // chance per dark-moon (or fog) autumn or early-winter night of a thin year that they come
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
export const MOON_DAYS = 30;    // new moon to new moon; day 0 of the world was a new moon
export const MOON_DARK = 6;     // a night with this much light or less (0 new .. 15 full) is dark enough to row in unseen
const MOON_WATCH = 20;          // nights at the beach fire before the watchers see the pattern
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
// foot rot: a wet spell turns the pen to mud and the hooves go soft. w.rot {n outbreaks, k lame ever, d died,
// y lame this year, yd died this year, yr year of the last outbreak, last tick, cur {at, n, d} | null}; g.lm lame since, g.im sound until
const ROT_HERD = 6;          // goats in the pen before it gets crowded and fouled enough
const ROT_WET = 3;           // days of rain, fog or storm in a row before the mud gets into the hooves
const ROT_START = 0.015;     // daily chance on such a day (scaled by how full the pen is), at most one outbreak a year
const ROT_SPREAD = 0.3;      // daily chance a sound goat goes lame, times the share of the herd already lame (wet days)
const ROT_SPREAD_DRY = 0.1;  // the same on dry days
const ROT_HEAL = 0.07;       // daily chance a lame goat walks sound again once the ground is dry (after ROT_MIN days)
const ROT_HEAL_WET = 0.02;
const ROT_MIN = 6;
const ROT_DIE = 0.006;       // daily chance a lame goat dies in the straw (kids twice as likely)
const ROT_IMM = 200;        // days a goat that has had it stays sound
const PEN_ODDS = 0.025;     // chance per winter night that a hungry wolf comes to the goat pen
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
// the moon: 0 new .. 15 full .. back to 0, integer, from the day alone (nothing saved)
export const moonAge = (day) => day % MOON_DAYS;
export const moonLight = (day) => { const a = day % MOON_DAYS; return a <= 15 ? a : MOON_DAYS - a; };
export const moonDark = (day) => moonLight(day) <= MOON_DARK;
export function moonName(day) {
  const a = day % MOON_DAYS;
  return a <= 1 || a === 29 ? 'new moon' : a < 7 ? 'waxing crescent' : a < 9 ? 'first quarter' : a < 14 ? 'waxing gibbous'
    : a <= 16 ? 'full moon' : a < 22 ? 'waning gibbous' : a < 24 ? 'last quarter' : 'waning crescent';
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
    graves: [], yard: null, heal: null, nLearned: 5, rats: null, goats: null, lost: { n: 0, y: 0, f: 0, d: 0, cur: null }, horn: null, isle: null, dogs: null, raid: null, pot: null, watch: null, snow: null, blaze: null, canoe: null, copse: null, hedge: null, whale: null, frost: null, wade: null, smudge: null, moon: null, rust: null, rogue: null, bees: null, lone: null, bow: null, lore: null, muck: null, rot: null, pare: null, cloak: null, squall: null, cheese: null, crow: null, spring: null, bear: null, seal: null, cough: null, stones: null, quarrel: null, inc: null, loom: null, surge: null, ale: null, vigil: null, well: null, wreck: null, roll: [],
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

// ---------- object shapes ----------
// People, fields and buildings are built with every key they can ever hold, always in the same order
// (unset ones are undefined, which JSON leaves out), and the step path clears a key by setting it to
// undefined, never with delete. Then every villager shares one hidden class and property reads stay
// fast. A world loaded from JSON is rebuilt the same way in migrate(). Only speed depends on this.
const personShape = (o) => ({
  id: o.id, name: o.name, sex: o.sex, born: o.born, mother: o.mother, father: o.father, partner: o.partner, home: o.home,
  wants: o.wants, lastBirth: o.lastBirth, hunger: o.hunger, x: o.x, y: o.y, px: o.px, py: o.py, task: o.task, asleep: o.asleep,
  haul: o.haul, dd: o.dd, sick: o.sick, imm: o.imm, tend: o.tend, hurt: o.hurt, mourn: o.mourn, cl: o.cl, cg: o.cg, cgi: o.cgi, fi: o.fi, vg: o.vg, vr: o.vr, cw: o.cw, cf: o.cf,
});
const fieldShape = (o) => ({
  id: o.id, x: o.x, y: o.y, stage: o.stage, growth: o.growth, rg: o.rg, rl: o.rl, ru: o.ru, fr: o.fr, burnt: o.burnt,
  lost: o.lost, root: o.root, flat: o.flat, mk: o.mk, fence: o.fence, hg: o.hg, sa: o.sa, sw: o.sw,
});
const buildingShape = (o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, progress: o.progress, hands: o.hands, dmg: o.dmg, tie: o.tie, burnt: o.burnt });
// rebuild a list loaded from JSON in the shared shape, keeping any key the shape does not know about
function reshape(list, make) {
  if (!list) return list;
  return list.map((o) => {
    const n = make(o);
    for (const k of Object.keys(o)) if (!(k in n)) n[k] = o[k];
    return n;
  });
}

function addPerson(w, sex, ageYears, mother, father, home) {
  const id = w.nextId++, name = makeName(w); // name first, then the spot: both draw on rnd(w), in this order
  const x = w.fire.x + 0.5 + (rnd(w) - 0.5) * 3, y = w.fire.y + 0.5 + (rnd(w) - 0.5) * 3;
  const p = personShape({
    id, name, sex, born: w.t - Math.floor(ageYears * TICKS_PER_YEAR),
    mother, father, partner: null, home, wants: false, lastBirth: -1e9, hunger: 0,
    x, y, px: x, py: y, task: null, asleep: false,
  });
  w.people.push(p);
  return p;
}

function findHouseSite(w) {
  let best = null, bd = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 1; y < MAP - 1; y++) for (let x = 1; x < MAP - 1; x++) {
    const tt = tile(w, x, y);
    if ((tt !== T.GRASS && tt !== T.FOREST) || nearBuild(w, x, y, 1) || (tt === T.FOREST && isStool(w, idx(x, y)))) continue;
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
  const b = buildingShape({ id: w.nextId++, kind, x: s.x, y: s.y, progress });
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
    if (dd < 16 || (tt === T.FOREST && isStool(w, idx(x, y)))) continue;
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
  const f = fieldShape({ id: w.nextId++, x: s.x, y: s.y, stage: 'fallow', growth: 0 });
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
  if (w.smudge) smudgeHour(w, c);
  if (c.hour === 19) supper(w);
  if (w.lore && c.hour === LORE_READ) loreRead(w, c);
  if (w.fest && w.fest.on === c.day) midsummer(w, c, fx);
  if (w.tale && w.tale.on === c.day) longNight(w, c, fx);
  if (w.ale && w.ale.hd === c.day && c.hour === ALE_POUR) harvestHome(w, c, fx);
  if (w.blaze && w.blaze.cur) blazeHour(w, c);
  if (w.stones && w.stones.cur) stoneHour(w, c, fx);
  if (w.vigil && w.vigil.cur) vigilHour(w, c, fx);
  if (w.wreck && w.wreck.cur) wreckHour(w, c);
  for (const p of w.people) if (!p.dead) act(w, p, c, fx);
  if (w.beasts) prowl(w, c);
  if (w.goats) goatHour(w, c);
  if (w.crow !== undefined) crowHour(w, c);
  if (w.dogs) dogHour(w, c);
  if (w.lost) lostHour(w, c);
  if (w.isle && w.isle.boat) isleHour(w, c);
  if (w.raid && (w.raid.cur || w.raid.on === c.day)) raidHour(w, c);
  if (w.inc && (w.inc.cur ? w.inc.cur.st === 'in' : w.inc.on === c.day)) incHour(w, c);
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
      w.hist.yearly.push({ y: c.year - 1, pop, births: w.stats.yb, deaths: w.stats.yd, harvest: w.stats.yh, food: Math.round(w.food), timber: Math.round(w.timber), storms: w.stats.ys || 0, flattened: w.stats.yf || 0, wolves: w.stats.yw || 0, raids: w.stats.yr || 0, hunted: w.stats.yk || 0, fences: w.fields.filter((f) => f.fence).length, sick: w.stats.yi || 0, fog: w.stats.yg || 0, rats: w.rats ? Math.round(w.rats.y) : 0, ...(w.goats ? { goats: w.goats.herd.length, goatsLost: w.goats.yl, pens: w.goats.yp || 0 } : {}), ...(w.lost ? { lost: w.lost.y } : {}), ...(w.dogs ? { dogs: w.dogs.d.length } : {}), ...(w.raid ? { stolen: w.raid.yg, given: w.raid.yv || 0 } : {}), ...(w.pot ? { jars: w.pot.j } : {}), ...(w.snow ? { snowmen: w.snow.y } : {}), ...(w.blaze ? { burnt: w.blaze.y } : {}), ...(w.canoe ? { deep: w.canoe.y } : {}), ...(w.copse ? { copse: Math.round(w.copse.y) } : {}), ...(w.hedge ? { hedges: w.fields.filter((f) => f.hg != null).length, hedgesNew: w.hedge.y } : {}), ...(w.whale ? { whales: w.whale.n } : {}), ...(w.frost ? { frosted: w.stats.yfr || 0 } : {}), ...(w.wade ? { cockles: w.wade.y } : {}), ...(w.smudge ? { smudged: w.smudge.y } : {}), ...(w.rust ? { rusted: w.rust.y } : {}), ...(w.rogue ? { rogued: w.rogue.y } : {}), ...(w.bees ? { honey: w.bees.y, hives: beesAlive(w) } : {}), ...(w.lone ? { lone: w.lone.yh || 0 } : {}), ...(w.bear ? { bear: w.bear.yr || 0 } : {}),...(w.bow ? { bows: w.bow.y || 0 } : {}), ...(w.lore ? { held: w.lore.y } : {}), ...(w.muck ? { mucked: w.muck.y, muckGrain: w.muck.yg } : {}), ...(w.rot ? { lame: w.rot.y, rotDied: w.rot.yd } : {}), ...(w.pare ? { pared: w.pare.y } : {}), ...(w.squall ? { squalls: w.squall.y } : {}), ...(w.seal ? { seals: w.seal.n, sealsTaken: w.seal.yk, sealFish: w.seal.ye } : {}), ...(w.cheese ? { cheese: w.cheese.y, cheeseEaten: w.cheese.ye } : {}), ...(w.crow ? { rooks: Math.round(w.crow.y), scared: w.crow.ys, ...(w.crow.m ? { crowTurned: w.crow.my } : {}) } : {}), ...(w.spring && w.spring.yd ? { dry: w.spring.yd, thirst: w.spring.yt, carried: w.spring.yc } : {}), ...(w.cough && w.cough.y ? { coughs: w.cough.y, coughDied: w.cough.yd } : {}), ...(w.quarrel && (w.quarrel.y || w.quarrel.yf) ? { spats: w.quarrel.y, fights: w.quarrel.yf } : {}), ...(w.inc && w.inc.y === c.year - 1 && w.inc.last ? { came: w.inc.last.n } : {}), ...(w.loom ? { woven: w.loom.yb } : {}), ...(w.surge && w.surge.yt ? { tides: w.surge.yt, ...(w.surge.y ? { salted: w.surge.y } : {}) } : {}), ...(w.ale ? { brewed: w.ale.yg, drunk: Math.round(w.ale.yd) } : {}) });
      log(w, `Year ${c.year - 1} ends: ${pop} people, ${w.stats.yb} born, ${w.stats.yd} died, ${w.stats.yh} grain harvested.`, 'year');
    }
    w.stats.yb = w.stats.yd = w.stats.yh = w.stats.ys = w.stats.yf = 0;
    w.harvest = Math.round((0.65 + rnd(w) * 0.65) * 100) / 100;
    if (w.harvest < 0.8) log(w, 'A dry spring. The elders fear a thin harvest.', 'bad');
    else if (w.harvest > 1.15) log(w, 'Warm rains this spring. The soil feels rich.', 'good');
    for (const f of w.fields) { if (f.stage === 'harvested') f.stage = 'fallow'; if (f.flat) f.flat = undefined; f.root = f.lost = f.burnt = f.fr = f.ru = f.rl = f.rg = undefined; }
    w.stats.yw = w.stats.yr = w.stats.yk = w.stats.yi = w.stats.yg = 0;
    if (w.rats) {
      if (w.rats.y >= 50) log(w, `Rats ate ${Math.round(w.rats.y)} grain from the stores last year.`, 'bad');
      w.rats.y = 0;
    }
    if (w.lost) w.lost.y = 0;
    if (w.cough) w.cough.y = w.cough.yd = 0;
    if (w.quarrel) w.quarrel.y = w.quarrel.yf = 0;
    if (w.hedge) w.hedge.y = 0;
    if (w.frost) w.frost.y = 0;
    if (w.surge) w.surge.y = w.surge.yt = 0;
    if (w.ale) w.ale.yg = w.ale.yd = 0;
    if (w.bear) w.bear.yr = 0;
    if (w.wade) w.wade.y = 0;
    if (w.smudge) w.smudge.y = 0;
    w.stats.yfr = 0;
    if (w.rust) { w.rust.y = 0; w.rust.cur = null; }
    if (w.rogue) w.rogue.y = 0;
    if (w.lone) w.lone.yh = 0;
    if (w.bow) w.bow.y = 0;
    if (w.lore) w.lore.y = 0;
    if (w.muck) { w.muck.y = 0; w.muck.yg = 0; }
    if (w.pare) w.pare.y = 0;
    if (w.cheese) { w.cheese.y = 0; w.cheese.ye = 0; }
    if (w.spring) { w.spring.yd = 0; w.spring.yt = 0; w.spring.yc = 0; }
    crowYear(w);
    raidYear(w, c);
    if (w.hides) w.hides = Math.floor(w.hides * 0.6); // hides crack and wear out over a year of use
    let rot = 0; // wattle rots at the stakes over a wet year
    for (const f of w.fields) if (f.fence && rnd(w) < FENCE_ROT) { f.fence = undefined; rot++; }
    if (rot) log(w, `${plural(rot, 'fence has', 'fences have')} rotted at the stakes over the year.`, 'info');
  }
  if (w.beasts) wilds(w, c);
  const was = w.wx ? w.wx.k : 'clear', wasN = w.wx ? w.wx.n : 0;
  weather(w, c);
  if (w.blaze !== undefined) blazeDay(w, c, was, wasN);
  festDay(w, c);
  taleDay(w, c);
  snowDay(w, c);
  if (w.stones !== undefined) stoneDay(w, c);
  if (w.vigil !== undefined) vigilDay(w, c);
  if (w.wade !== undefined) wadeDay(w, c);
  const wx = w.wx.k;
  if (w.surge !== undefined) surgeDay(w, c, wx);
  if (w.raid) raidNight(w, c, wx);
  if (w.raid && !w.watch && w.raid.n >= WATCH_RAIDS && raidSeason(c)) learnWatch(w);
  if (w.watch && !w.moon && w.watch.n >= MOON_WATCH && raidSeason(c) && moonLight(c.day) === 15) learnMoon(w, c);
  // crops rot at the first frost
  if (c.doy === DAYS_PER_SEASON * 3) {
    let rot = 0;
    for (const f of w.fields) if (f.stage === 'planted' || f.stage === 'ripe') { f.stage = 'fallow'; f.growth = 0; f.lost = undefined; rot++; }
    if (rot) log(w, `Frost takes ${rot} unharvested field${rot > 1 ? 's' : ''}.`, 'bad');
    if (w.rust && w.rust.cur) rustEnds(w);
  }
  // a cold snap after the sowing: frost on the young shoots
  if (w.frost !== undefined && c.season === 0 && wx === 'cold' && c.year >= FROST_YEAR) frostNight(w);
  // growth
  if (c.season < 3) {
    const g = WX_GROW[wx] / GROW_DAYS;
    for (const f of w.fields) if (f.stage === 'planted') {
      f.growth = Math.min(1, Math.round((f.growth + g) * 10000) / 10000);
      if (f.growth >= 1) f.stage = 'ripe';
    }
    if (w.rust !== undefined) rustDay(w, c, wx);
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
    const warm = (homes ? Math.min(HIDE_WARM, ((w.hides || 0) / homes) * HIDE_WARM) : 0) + loomCover(w) * BLANKET_WARM;
    const need = Math.round(homes * FUEL_PER_HOUSE * burn * (1 - warm) * 100) / 100;
    if (w.timber >= need) { w.timber = Math.round((w.timber - need) * 100) / 100; if (w.stats.cold) { w.stats.cold = false; log(w, 'Every hearth is lit again.', 'good'); } }
    else { w.timber = 0; if (!w.stats.cold) { w.stats.cold = true; log(w, 'The woodpile is bare. Homes go cold.', 'bad'); } }
  } else w.stats.cold = false;

  if (w.rats !== undefined) rats(w, c);
  if (w.pot !== undefined) potDay(w, c);
  if (w.bees !== undefined) beeDay(w, c);
  if (w.canoe !== undefined) canoeDay(w, c);
  if (w.seal !== undefined) sealDay(w, c);
  if (w.copse !== undefined) copseDay(w, c);
  if (w.whale) whaleDay(w, c);
  if (w.wreck) wreckDay(w, c);
  if (w.fever) fever(w, c, fx);
  if (w.cough !== undefined) coughDay(w, c, fx);
  if (w.quarrel !== undefined) quarrelDay(w, c, fx);
  if (w.inc !== undefined) incDay(w, c);
  if (w.heal !== undefined) herbs(w, c);
  if (w.spring !== undefined) springDay(w, c, wx);
  if (w.well !== undefined) wellDay(w, c);
  if (w.goats !== undefined) goatDay(w, c);
  if (w.loom !== undefined) loomDay(w, c, wx);
  if (w.ale !== undefined) aleDay(w, c, wx);
  if (w.muck) muckDay(w);
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
  // castaways keep a near-empty island from emptying; on a peopled one they come by wreck in the autumn gales (wreckStorm)
  if (w.people.length < 12 && c.season < 3 && rnd(w) < 0.004) {
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

function rollWx(w, season, k) {
  const odds = WX_ODDS[season];
  if (odds.some(([q]) => q === k) && rnd(w) < WEATHER[k].stay) return k;
  let r = rnd(w) * 100;
  for (const [q, p] of odds) { if (r < p) return q; r -= p; }
  return odds[odds.length - 1][0];
}
function weather(w, c) {
  const s = w.wx;
  const next = s.nx || rollWx(w, c.season, s.k); // with sky lore, today was already rolled yesterday
  if (w.lore) loreMorning(w, c, s.k, next);
  if (next === s.k) s.n++;
  else {
    endSpell(w, s);
    if (s.k === 'storm') { whaleStorm(w, c, s.n); wreckStorm(w, c, s.n); }
    if (s.fk || s.fs) frostTold(w, s);
    if (s.k === 'fog' && w.lore && w.lore.fl == null && s.n >= FOG_LEARN && w.goats && ((w.fauna && w.fauna.fa) || (w.lost && w.lost.n) || s.gl)) learnFog(w, s);
    w.wx = { k: next, n: 1, f: 0, r: 0, d: 0 };
    if ((s.k === 'rain' || s.k === 'storm') && s.n >= BOW_RAIN && (next === 'clear' || next === 'heat') && c.season < 3) bowComes(w, c, s);
    if (next === 'storm' && w.lore) { /* told in loreMorning */ }
    else if (next === 'storm') log(w, 'Black clouds roll in off the sea. Everyone runs for shelter.', 'bad');
    else if (next === 'cold' && c.season === 3) log(w, 'A hard frost grips the island. The woodpile shrinks fast.', 'bad');
    else if (next === 'heat') log(w, 'The sun beats down. The soil cracks.', 'info');
    else if (next === 'fog') fogComes(w);
  }
  if (w.wx.k === 'storm') storm(w);
  if (w.wx.k === 'fog') w.stats.yg = (w.stats.yg || 0) + 1;
  if (w.lore === null && s.k === 'storm' && next !== 'storm' && s.r) learnLore(w);
  if (w.lore) w.wx.nx = rollWx(w, clock(w.t + TICKS_PER_DAY).season, w.wx.k);
}

// ---------- sky lore ----------
// w.lore { nm first reader, at, n storms called, h called right, m storms missed, f false alarms, s roofs held, y this year,
// g fields cut by firelight, on the day a storm is called for, rd who called it }; b.tie: the roof is roped down with stones
const stormDays = (w) => (w.hist.yearly || []).reduce((n, r) => n + (r.storms || 0), 0) + (w.stats.ys || 0);
function learnLore(w) {
  const who = elder(w);
  if (!who || ageY(w, who) < LORE_AGE || stormDays(w) < LORE_STORMS) return;
  w.lore = { nm: who.name, at: w.t, n: 0, h: 0, m: 0, f: 0, s: 0, y: 0, g: 0, on: -1, rd: who.name, ...FOG_FRESH() };
  if (!w.techs.includes('lore')) w.techs.push('lore');
  milestone(w, `The wind drops and ${who.name} climbs up to look at the torn thatch. ${who.name} has sat out ${stormDays(w)} days of storm on ${w.name}, and says every one of them was told the evening before, for anyone who could read it: ` +
    `a red sky in the west, mares' tails high up, the gulls coming in off the sea, the hearth smoke beating down. From now on, at the evening fire, the eldest will look out over the sea and say what the morning will bring. ${w.name} learns to read the sky.`);
}
// the evening fire: the eldest looks at the sky over the sea
function loreRead(w, c) {
  const L = w.lore, nx = w.wx.nx;
  if (w.wx.k === 'storm' || !nx) return; // in a storm already: the stones stay on
  const who = elder(w);
  if (!who) return;
  let call = false;
  if (nx === 'storm') { if (rnd(w) < LORE_HIT) call = true; else L.m++; }
  else if ((nx === 'rain' || nx === 'fog') && rnd(w) < LORE_FALSE) call = true;
  if (!call) { if (L.fl != null && w.wx.k !== 'fog') fogRead(w, c, L, who, nx); return; }
  L.on = c.day + 1; L.n++; L.rd = who.name;
  log(w, `At the evening fire ${who.name} looks out to sea: ${LORE_SIGNS[c.day % LORE_SIGNS.length]}. "A storm by morning." The ripe grain is cut by firelight and stones are hung on the thatch.`, 'info');
}
// the same evening fire: no storm, but is a fog coming in off the sea?
function fogRead(w, c, L, who, nx) {
  let call = false;
  if (nx === 'fog') { if (rnd(w) < FOG_HIT) call = true; else L.fm++; }
  else if (nx === 'clear' && rnd(w) < FOG_FALSE) call = true;
  if (!call) return;
  L.fg = c.day + 1; L.fn++; L.rd = who.name;
  log(w, `At the evening fire ${who.name} looks out to sea: ${FOG_SIGNS[c.day % FOG_SIGNS.length]}. "Fog by morning." ${w.goats ? 'The goats will stay in the pen tomorrow, and the' : 'The'} little ones by the houses.`, 'info');
}
// the goats stay in and the little ones by the houses: on a fog day that was called, or once it has lain a day already
export function fogKept(w) {
  const L = w.lore;
  return !!(L && L.fl != null && w.wx && w.wx.k === 'fog' && (w.wx.n >= 2 || L.fg === clock(w.t).day));
}
function learnFog(w, s) {
  const who = elder(w);
  if (!who) return;
  const L = w.lore, lostN = (w.lost && w.lost.n) || 0, bit = (w.fauna && w.fauna.fa) || 0;
  L.fl = w.t; L.fnm = who.name;
  if (!w.techs.includes('foglore')) w.techs.push('foglore');
  const fogDead = (w.graves || []).filter((g) => /fog/.test(g.why)).map((g) => g.n);
  const cost = [bit && (bit === 1 ? 'a wolf has come out of it' : `wolves have come out of it ${bit} times`), lostN && (lostN === 1 ? 'one of the village has been lost in it' : `${lostN} have been lost in it`), fogDead.length && `${fogDead.slice(0, 3).join(' and ')} did not come home from it`].filter(Boolean);
  const len = spellLen(s.n);
  milestone(w, `${len} of fog ${len.startsWith('A ') ? 'lifts' : 'lift'}, and ${who.name} sits on by the evening fire long after the others have gone in. ${cost.length ? `On ${w.name} ${cost.length > 1 ? cost.slice(0, -1).join(', ') + ' and ' + cost[cost.length - 1] : cost[0]}. ` : ''}` +
    `Thinking back over every grey morning, ${pron(who)} finds the sign was always there the night before: the wind dropping away, the sea lying flat and oily, the far isle standing up sharp and close, the dew down early on the grass. ` +
    `From now on, when the eldest says "fog by morning", the goats stay in the pen and the small ones by the houses. ${w.name} learns the fog signs.`);
}
// first thing in the morning: was the reading right? The stones come off once the wind has gone
function loreMorning(w, c, was, next) {
  const L = w.lore;
  if (L.fl != null && L.fg === c.day) {
    if (next === 'fog') {
      L.fh++;
      if (L.fh === 1) milestone(w, `Grey fog lies over ${w.name} at first light, just as ${L.rd} said it would. The pen gate stays shut and the children are kept in. Out in the white a wolf howls, and finds nothing to take.`);
    } else { L.ff++; log(w, `${L.rd} called a fog, but the morning comes in ${next === 'clear' ? 'bright and clear' : next === 'rain' ? 'wet' : 'grey but open'}. The goats are let out late.`, 'info'); }
  }
  if (L.on === c.day) {
    L.on = -1;
    if (next === 'storm') {
      L.h++;
      if (L.h === 1) milestone(w, `Black clouds roll in off the sea at first light, just as ${L.rd} said they would. This time the ripe grain is already in and the roofs are roped down with stones, and everyone is indoors before the first gust. Nobody on ${w.name} laughs at sky-reading now.`);
      else log(w, `The storm ${L.rd} read in the sky comes in at first light. The village is ready for it.`, 'bad');
    } else {
      L.f++;
      log(w, `${L.rd} called a storm, but the morning comes in ${next === 'rain' ? 'grey and drizzling' : next === 'fog' ? 'thick with fog' : 'calm'}. The children laugh at the stones hanging off the roofs.`, 'info');
    }
  } else if (next === 'storm' && was !== 'storm') log(w, 'Black clouds roll in off the sea with no warning in last night\'s sky. Everyone runs for shelter.', 'bad');
  if (next !== 'storm') for (const b of w.buildings) if (b.tie) b.tie = undefined;
}
// a warned evening: cut what is ripe, then rope the roofs
function prepTask(w, p) {
  const f = nearestFree(w, workLists(w).ripe, p, 'ripe', 'f');
  if (f) return { k: 'harvest', key: 'f' + f.id, x: f.x, y: f.y, h: LORE_REAP, eve: 1 };
  const b = nearest(w.buildings, p, (o) => o.progress >= 1 && !o.dmg && !o.tie && w.res['y' + o.id] == null);
  if (b) return { k: 'tie', key: 'y' + b.id, x: b.x, y: b.y, h: 1 };
  return null;
}
export const loreTied = (b) => !!b.tie;

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
  for (const f of w.fields) if (f.fence && rnd(w) < FENCE_STORM) { f.fence = undefined; s.g = (s.g || 0) + 1; }
  // and now and then it takes a roof
  if (rnd(w) < STORM_ROOF) {
    const standing = w.buildings.filter((b) => b.progress >= 1);
    if (standing.length) {
      const b = standing[ri(w, standing.length)];
      if (b.tie && rnd(w) < LORE_HOLD) { s.held = (s.held || 0) + 1; w.lore.s++; w.lore.y++; }
      else { b.progress = 0.75; b.dmg = 1; b.tie = undefined; s.r++; }
    }
  }
}

// ---------- storm tides ----------
// w.surge { n tides, k fields drowned in all, y this year, s fields salted now, g driftwood, last tick, nm who saw the first, at };
// f.sa wet days still needed to wash the salt out, f.sw tick the sea came over it. A storm day at a spring tide (new or full
// moon) can drive the sea over the low fields behind the beach; nothing is sown in them until the rain has washed them clean.
const SURGE_YEAR = 3;        // never in the first years
const SURGE_P = 0.06;        // chance per storm day at a spring tide (~1 tide in 4 years)
const SURGE_LEVEL = 230;     // how high the sea comes, on the seaReach() scale (sand lies below 200), plus up to SURGE_VAR
const SURGE_VAR = 80;
const SURGE_LONG = 50;      // higher again once the storm has blown 3 days
const SURGE_SHARE = 4;       // it drowns at most a quarter of the fields (at least 3, if that many lie low)
const SURGE_DRIFT = 6;       // driftwood off the tide line, plus up to as much again
const SURGE_WET = 30;        // hours the low ground lies under sea water
const SURGE_GAP = 10;        // days before the next spring tide can bring the sea over again
const SURGE_BOAT = 0.5;    // chance the dugout, drawn up on the landing, is taken by the tide
const SALT_WASH = 45;        // wet days (rain, storm, snow) to wash a drowned field clean, plus up to SALT_MORE
const SALT_MORE = 25;
const SURGE_WRACK = 4;       // driftwood picked off the tide line per drowned field
export const springTide = (day) => { const a = moonAge(day); return a <= 1 || a >= MOON_DAYS - 1 || (a >= 14 && a <= 16); };
// For every tile, the lowest sea (in thousandths of the land height genesis drew the island from) at which the water
// can run to it from the shore without climbing anything higher. Sand lies below 200. The ground and the sea never
// change, so it is worked out once per world and kept in the cache.
export function seaReach(w) {
  const c = cacheOf(w);
  if (c.reach) return c.reach;
  const N = MAP * MAP, H = new Int16Array(N), R = new Int16Array(N).fill(32767), B = [];
  for (let l = 0; l <= 1000; l++) B.push([]);
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const dx = (x - 31.5) / 29, dy = (y - 31.5) / 29, s = w.seed;
    const n = vnoise(x, y, 16, s) * 0.6 + vnoise(x, y, 6, s + 1) * 0.3 + vnoise(x, y, 3, s + 2) * 0.1;
    const h = 1 - Math.sqrt(dx * dx + dy * dy) * 1.1 + (n - 0.5) * 0.6, i = idx(x, y);
    H[i] = Math.max(0, Math.min(1000, Math.round(h * 1000)));
    if (w.tiles[i] === T.WATER) { R[i] = 0; B[0].push(i); }
  }
  for (let l = 0; l <= 1000; l++) {
    const b = B[l];
    for (let k = 0; k < b.length; k++) {
      const i = b[k];
      if (R[i] !== l) continue;
      const x = i % MAP, y = (i / MAP) | 0;
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax, ny = y + ay;
        if (!inMap(nx, ny)) continue;
        const j = idx(nx, ny), nl = Math.max(l, H[j]);
        if (nl < R[j]) { R[j] = nl; B[nl].push(j); }
      }
    }
  }
  c.reach = R;
  return R;
}
function surgeDay(w, c, wx) {
  if (w.surge && w.surge.s) saltWash(w, w.surge, wx);
  if (wx !== 'storm' || c.year < SURGE_YEAR || !springTide(c.day) || !w.fields.length) return;
  if (w.surge && w.t - w.surge.last < SURGE_GAP * TICKS_PER_DAY) return; // one tide to a spring tide
  if (rnd(w) >= SURGE_P) return;
  const lv = SURGE_LEVEL + ri(w, SURGE_VAR) + (w.wx.n >= 3 ? SURGE_LONG : 0), R = seaReach(w), near = [];
  for (const f of w.fields) if (f.sa == null && R[idx(f.x, f.y)] <= lv) near.push(f);
  near.sort((a, b) => R[idx(a.x, a.y)] - R[idx(b.x, b.y)] || a.id - b.id);
  const hit = near.slice(0, Math.max(3, Math.floor(w.fields.length / SURGE_SHARE)));
  let crop = 0, wattle = 0, land = 0;
  for (let i = 0; i < MAP * MAP; i++) if (w.tiles[i] !== T.WATER && R[i] <= lv) land++;
  for (const f of hit) {
    if (f.stage === 'planted' || f.stage === 'ripe') crop++;
    if (f.fence) { f.fence = undefined; wattle++; }
    f.stage = 'fallow'; f.growth = 0; f.lost = f.root = f.flat = f.mk = undefined;
    f.sa = SALT_WASH + ri(w, SALT_MORE); f.sw = w.t;
  }
  const first = !w.surge, who = elder(w), n = hit.length, wood = SURGE_DRIFT + ri(w, SURGE_DRIFT) + n * SURGE_WRACK;
  const S = w.surge || (w.surge = { n: 0, k: 0, y: 0, yt: 0, s: 0, g: 0, b: 0, last: 0, lv: 0, nm: who ? who.name : '', at: w.t });
  S.n++; S.yt++; S.k += n; S.y += n; S.s += n; S.g += wood; S.last = w.t; S.lv = lv;
  w.timber = Math.round((w.timber + wood) * 100) / 100;
  const K = w.canoe, boat = !!(K && K.ok && K.at == null && R[idx(K.bx, K.by)] <= lv && rnd(w) < SURGE_BOAT);
  if (boat) { K.ok = 0; K.wk = -1; K.lost++; S.b++; }
  const bed = !!(w.wade && w.wade.c >= 1);
  if (bed) w.wade.c = 0;
  const shore = (boat ? ' The dugout is lifted off the landing and thrown up into the dunes, split from end to end.' : '') + (bed ? ' The cockle bed is scoured down to bare shingle.' : '');
  const moon = moonLight(c.day) >= 8 ? 'full moon' : 'new moon', low = lowFields(w, R, lv);
  const near2 = low ? ` The water stopped a stone's throw below ${low === 1 ? 'the lowest field' : low <= 5 ? `the ${low} lowest fields` : 'the lowest fields'}.` : '';
  if (first) {
    if (!w.techs.includes('surge')) w.techs.push('surge');
    milestone(w, `On ${w.wx.n === 1 ? 'the first day' : `day ${w.wx.n}`} of the storm, with the ${moon} pulling the tide high, the sea does not stop at the sand. ` +
      (n ? `${who ? who.name : 'The village'} watches grey water pour in over the dunes and spread across ${plural(n, 'field', 'fields')} behind the beach${crop ? ', over the standing grain' : ''}${wattle ? ', and the wattle fences go out with it' : ''}. ` +
        `By evening it has drained back, leaving the ground crusted white and the tide line heaped with weed and ${wood} armfuls of driftwood. ${who ? `${who.name} scoops up a handful of earth, tastes it and spits` : 'The earth tastes of the sea'}: nothing will grow there until the rain has washed it out.`
        : `It comes up over the beach, into the hollows behind the dunes and ${land >= 300 ? 'far up the low ground' : 'up the low ground'} in a sheet of grey water, and by evening it has drained back and left a long line of weed and ${wood} armfuls of driftwood. No field lay low enough to drown.${near2 || ` ${who ? who.name : 'The eldest'} looks from the tide line up to the fields and says grain must never be sown down there.`}`) +
      `${shore} ${w.name} learns what a storm tide can do.`);
  } else {
    const text = (n ? `A storm tide at the ${moon} comes in over the low ground: ${plural(n, 'field', 'fields')} drowned in salt water${crop ? (crop === n ? (n === 1 ? ', grain and all' : ', all of them in grain') : `, ${crop} of them in grain`) : ''}.`
      : `A storm tide at the ${moon} runs up over the beach and into the hollows behind it.${near2}`) + `${shore} ${wood} driftwood is dragged up off the tide line.`;
    if (n >= 5 || boat) milestone(w, text); else log(w, text, n || bed ? 'bad' : 'info');
  }
}
// fields that a sea a little higher than this one would have reached
function lowFields(w, R, lv) {
  let k = 0;
  for (const f of w.fields) { const r = R[idx(f.x, f.y)]; if (r > lv && r <= lv + SURGE_VAR) k++; }
  return k;
}
export const surgeWet = (w) => !!(w.surge && w.surge.last && w.t - w.surge.last < SURGE_WET);
// each wet day rinses the drowned fields a little
function saltWash(w, S, wx) {
  if (wx !== 'rain' && wx !== 'storm' && wx !== 'snow') return;
  let left = 0;
  for (const f of w.fields) {
    if (f.sa == null) continue;
    if (--f.sa > 0) { left++; continue; }
    f.sa = f.sw = undefined;
  }
  const was = S.s;
  S.s = left;
  if (was && !left) log(w, 'The rain has washed the last of the salt out of the drowned fields. They can be dug over and sown again.', 'good');
}

// a spell ends: tell the chronicle if it was one people will remember
function endSpell(w, s) {
  const n = s.n, len = spellLen(n), v = (vb) => (len.startsWith('A ') ? vb + 's' : vb); // "A week of rain ends"
  let text = null, k = 'bad', big = false;
  if (s.k === 'storm' && (n >= 3 || s.f || s.r || s.g >= 3 || s.held)) {
    const hurt = [];
    if (s.f) hurt.push(`${plural(s.f, 'field', 'fields')} flattened`);
    if (s.r) hurt.push(`${plural(s.r, 'roof', 'roofs')} torn away`);
    if (s.g) hurt.push(`${plural(s.g, 'fence', 'fences')} blown down`);
    text = n === 1 ? `A storm tears across ${w.name}` : `${len} of storms ${v('batter')} ${w.name}`;
    text += hurt.length ? `: ${hurt.join(', ')}.` : ', but the village holds.';
    if (s.held) text += ` The stones on the thatch held ${s.held === 1 ? 'a roof' : plural(s.held, 'roof', 'roofs')} the wind tried to lift.`;
    big = n >= 7 || s.r >= 3 || s.f >= Math.max(10, w.fields.length >> 3);
  } else if (s.k === 'heat' && n >= 7) {
    text = `${len} of blazing heat ${v('break')} at last. The grain stood still in the sun.`;
    big = n >= 18 || s.d >= 2;
  } else if (s.k === 'cold' && n >= 6 && !s.fk && !s.fs) {
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

// ---------- rainbows ----------
// When a spell of rain or storm breaks into a clear day, the low sun may throw a rainbow over the island for
// a few hours: in the morning it stands in the west, in the late afternoon in the east. The children run off
// to find where it comes down. Nothing is gained but wet feet; it is there to be seen.
// w.wx.bow { a from hour, b to hour, d side (-1 west, 1 east), x, y foot tile or null, r someone reached it };
// w.bow { n rainbows ever, y this year, nm first child to chase one, at, c chases, k reached the foot }.
const BOW_RAIN = 3;          // days of rain before a clearing can bring one
const BOW_ODDS = 0.3;        // chance that a clearing brings a rainbow
const BOW_HOURS = 3;         // how long it stands
const BOW_CHASE = 2;         // of every 3 children at play, how many run after it
export const BOW_R = 12;     // tiles from the foot to the middle of the arc (render draws it from the foot)
const BOW_TOLD = ['finds only wet grass and a puddle with the sky in it', 'finds that it has moved on, further out over the sea',
  'stands in the wet grass and looks up, and cannot see it at all from there', 'comes back soaked to the knees, sure it was just past the next field'];

function bowComes(w, c, s) {
  if (rnd(w) >= BOW_ODDS) return;
  const am = rnd(w) < 0.5, d = am ? -1 : 1, a = am ? 7 : 15;
  let foot = null;
  for (let k = 0; k < 12 && !foot; k++) {
    const x = w.fire.x + d * (8 + ri(w, 9)), y = w.fire.y + ri(w, 13) - 6;
    if (x < 1 || y < 1 || x >= MAP - 1 || y >= MAP - 1 || tile(w, x, y) === T.WATER) continue;
    if (lineOfLand(w, w.fire.x + 0.5, w.fire.y + 0.5, x + 0.5, y + 0.5)) foot = [x, y];
  }
  w.wx.bow = { a, b: a + BOW_HOURS, d, x: foot ? foot[0] : null, y: foot ? foot[1] : null, r: 0 };
  w.bow ||= { n: 0, y: 0, nm: null, at: null, c: 0, k: 0 };
  const B = w.bow, what = s.k === 'storm' ? 'storms' : 'rain';
  B.n++; B.y++;
  const len = spellLen(s.n).toLowerCase(), side = am ? 'west' : 'east';
  if (B.n > 1) { log(w, `${am ? 'In the morning' : 'Late in the afternoon'} a rainbow stands over the ${side} of ${w.name}, after ${len} of ${what}.`, 'good'); return; }
  const kids = w.people.filter((p) => { const g = ageY(w, p); return g >= 5 && g < 14; });
  const kid = kids.length ? kids[ri(w, kids.length)] : null;
  if (kid) { B.nm = kid.name; B.at = w.t; }
  milestone(w, `After ${len} of ${what} the clouds tear open. ${am ? 'In the morning' : 'Late in the afternoon'} the sun comes out low ` +
    `and a great bow of colours stands over the ${side} of ${w.name}, its feet in the wet grass. Nobody has a word for it.` +
    (kid ? ` ${kid.name} runs off to find where it comes down, and the other children run after.` : ''));
}
export function bowOn(w, c, hf = c.hour) {
  const b = w.wx && w.wx.bow;
  return !!b && hf >= b.a && hf < b.b;
}
function bowTask(w, p) {
  const b = w.wx.bow;
  for (let k = 0; k < 4; k++) {
    const x = b.x + ri(w, 3) - 1, y = b.y + ri(w, 3) - 1;
    if (tile(w, x, y) !== T.WATER && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) { w.bow.c++; return { k: 'bow', x, y, h: 1 }; }
  }
  return null;
}
function bowDone(w, p) {
  const b = w.wx.bow;
  if (!b || b.r) return;
  b.r = 1; w.bow.k++;
  log(w, `${p.name} reaches the place where the rainbow came down and ${BOW_TOLD[ri(w, BOW_TOLD.length)]}.`, 'info');
}

// ---------- late frost ----------
// A spring cold snap after the sowing: each frost night, young shoots in a sown field may be killed outright
// (the field goes back to fallow, black and limp, and has to be sown again while it is still spring), and
// taller grain may have its leaf tips burnt (growth set back). Nothing guards against it yet.
// w.frost { n spells that killed grain, k fields killed ever, y this year, last tick }; f.fr tick a field was
// frosted (cleared when it is sown again); w.wx.fk / fn fields killed / nipped this spell.
const FROST_YEAR = 2;        // the first spring that can turn
const FROST_YOUNG = 0.35;    // shoots shorter than this die in a frost
const FROST_SET_IN = 3;      // the first days of a cold snap are only a chill; the frost settles from the third night
const FROST_KILL = 0.2;   // chance per frost night that a field of young shoots is killed
const FROST_NIP = 0.2;       // chance that taller (but not yet tall) grain is nipped
const FROST_SET = 0.1;       // growth a nip costs
function frostNight(w) {
  const s = w.wx;
  if (s.n < FROST_SET_IN) return;
  const lit = w.smudge ? smudgeLit(w) : null;
  for (const f of w.fields) {
    if (f.stage !== 'planted') continue;
    const smoked = !!(lit && lit.length && lit.some((o) => d2(o.x, o.y, f.x, f.y) <= SMUDGE_R));
    if (f.growth < FROST_YOUNG) {
      if (rnd(w) < FROST_KILL) {
        if (smoked && rnd(w) < SMUDGE_HOLD) { s.fs = (s.fs || 0) + 1; continue; } // the smoke kept the frost off
        f.stage = 'fallow'; f.growth = 0; f.fr = w.t; s.fk = (s.fk || 0) + 1;
      }
    } else if (f.growth < 0.7 && rnd(w) < FROST_NIP) {
      if (smoked && rnd(w) < SMUDGE_HOLD) continue;
      f.growth = Math.max(0, Math.round((f.growth - FROST_SET) * 10000) / 10000); s.fn = (s.fn || 0) + 1;
    }
  }
}
function frostTold(w, s) {
  if (!s.fk) { smudgeTold(w, s); return; }
  const first = !w.frost;
  if (first) { w.frost = { n: 0, k: 0, y: 0, last: 0 }; if (!w.techs.includes('frost')) w.techs.push('frost'); }
  const F = w.frost;
  F.n++; F.k += s.fk; F.y += s.fk; F.last = w.t;
  w.stats.yfr = (w.stats.yfr || 0) + s.fk;
  const who = elder(w), len = spellLen(s.n).toLowerCase(), kill = len.startsWith('a ') ? 'kills' : 'kill';
  const nip = s.fn ? ` On ${plural(s.fn, 'more field', 'more fields')} the leaf tips are burnt brown.` : '';
  if (first) milestone(w, `The sowing is done and the shoots are up when the cold comes back. For ${len} the nights are clear and still, and every dawn the fields are white. ` +
    `When it lifts, ${who ? who.name : 'the eldest'} walks the rows and pulls up a handful of black, limp stalks: the frost has killed the young grain in ${plural(s.fk, 'field', 'fields')}.${nip} ` +
    `There is nothing for it but to dig them over and sow again, and hope the seed is quicker than the summer. Nobody on ${w.name} had thought the spring could turn.`);
  else {
    const black = w.fields.some((f) => f.fr != null);
    const after = !black ? ' The black rows were dug over and sown again before the cold even lifted.'
      : s.fk === 1 ? ' It has to be sown again.' : ' They have to be sown again.';
    if (s.fk >= Math.max(8, w.fields.length >> 2)) milestone(w, `A late frost: ${len} of white dawns ${kill} the young grain in ${plural(s.fk, 'field', 'fields')}.${nip}${after}`);
    else log(w, `A late frost blackens the young grain in ${plural(s.fk, 'field', 'fields')}.${nip}${after}`, 'bad');
  }
  if (s.fs) smudgeTold(w, s);
  if (w.smudge === null && F.n >= SMUDGE_LEARN) learnSmudge(w);
}

// ---------- grain rust ----------
// After a few wet days in late spring or summer, rust can come up on one field of growing grain and spread to the
// fields beside it (4 sides) on wet and windy days. A rusted field loses part of its yield each day it is wet
// (f.lost, which the harvest already counts); heat stops it. It ends for the year when no rusted grain is left in
// the ground. Nothing stops it yet; packed blocks of fields lose the most.
// f.ru tick a field was spotted, f.rl share of its yield the rust has taken (both cleared at harvest / new year).
// w.rust { n outbreaks, k fields spotted ever, g grain lost ever, y fields this year, yr year of the last outbreak,
// last tick, cur { at, n fields, g grain lost, d days } or null }.
const RUST_YEAR = 3;         // the first summer it can come
const RUST_FROM = 45;        // day of the year (mid-spring) from which it can come
const RUST_WET = 3;          // days into a rain or fog spell before it shows
const RUST_ODDS = 0.05;      // chance per such day, once a year at most
const RUST_SPREAD = { rain: 0.3, storm: 0.38, fog: 0.2, clear: 0.08, cold: 0.02, heat: 0, snow: 0 };
const RUST_EAT = { rain: 0.03, storm: 0.03, fog: 0.024, clear: 0.014, cold: 0.005, heat: 0, snow: 0 };
const RUST_MAX = 0.6;        // the most of a field's yield it can take
const growing = (f) => f.stage === 'planted' || f.stage === 'ripe';
function rustDay(w, c, wx) {
  const R = w.rust;
  if (!R || !R.cur) {
    if (c.year < RUST_YEAR || c.doy < RUST_FROM || c.season > 1 || (wx !== 'rain' && wx !== 'fog') || w.wx.n < RUST_WET) return;
    if (R && R.yr === c.year) return;
    const can = w.fields.filter((f) => f.stage === 'planted' && f.growth >= 0.25);
    if (!can.length || rnd(w) >= RUST_ODDS) return;
    rustBegins(w, c, can[ri(w, can.length)]);
    return;
  }
  const C = R.cur;
  C.d++;
  const at = new Map();
  for (const f of w.fields) at.set(f.y * MAP + f.x, f);
  const fresh = [], sp = RUST_SPREAD[wx] || 0, eat = RUST_EAT[wx] || 0;
  let left = 0, pulled = 0;
  for (const f of w.fields) {
    if (f.ru == null || !growing(f)) continue;
    if (f.rg != null) { pulled++; continue; } // a field pulled clean neither loses more nor passes it on
    left++;
    if (eat && (f.rl || 0) < RUST_MAX) {
      const e = Math.min(eat, RUST_MAX - (f.rl || 0));
      f.rl = Math.round(((f.rl || 0) + e) * 1000) / 1000;
      f.lost = Math.min(0.8, Math.round(((f.lost || 0) + e) * 1000) / 1000);
    }
    if (!sp) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const o = at.get((f.y + b) * MAP + f.x + a);
      if (o && o.ru == null && growing(o) && !fresh.includes(o) && rnd(w) < sp) fresh.push(o);
    }
  }
  for (const f of fresh) { f.ru = w.t; C.n++; R.k++; R.y++; }
  if (!left && !fresh.length) rustEnds(w, pulled > 0);
}
function rustBegins(w, c, f) {
  const first = !w.rust;
  if (first) { w.rust = { n: 0, k: 0, g: 0, y: 0, yr: 0, last: 0, cur: null }; if (!w.techs.includes('rust')) w.techs.push('rust'); }
  const R = w.rust;
  R.n++; R.k++; R.y++; R.yr = c.year; R.last = w.t;
  R.cur = { at: w.t, n: 1, g: 0, d: 0 };
  f.ru = w.t;
  const who = elder(w);
  if (first) milestone(w, `After ${spellLen(w.wx.n).toLowerCase()} of ${w.wx.k === 'fog' ? 'warm, dripping fog' : 'warm rain'}, ${who ? who.name : 'one of the old ones'} pulls a stalk from a field of young grain and holds it up: the leaves are flecked with orange, like a blade left out in the wet, and the dust of it comes off on the fingers. ` +
    `Nobody on ${w.name} has seen it before. Nobody knows that the wind and the rain will carry it to the fields beside it.`);
  else log(w, 'Orange flecks on the leaves of the grain again. The rust is back in the fields.', 'bad');
}
// a rusted field is cut: count what the rust took from it
function rustCut(w, f, y) {
  if (f.ru == null) return;
  const lost = f.rl ? Math.round((y / Math.max(0.2, 1 - (f.lost || 0))) * f.rl) : 0;
  if (w.rust) { w.rust.g += lost; if (w.rust.cur) w.rust.cur.g += lost; }
  f.ru = f.rl = f.rg = undefined;
}
function rustEnds(w, stopped) {
  const R = w.rust, C = R.cur;
  R.cur = null;
  if (!w.rogue && C.n >= ROGUE_LEARN) { rustSummary(w, R, C); learnRogue(w); return; }
  if (stopped && w.rogue) { // every spotted field still standing has been pulled clean
    w.rogue.k++;
    const text = `The last spotted field is pulled clean and the armfuls burnt. The rust reached ${plural(C.n, 'field', 'fields')} this year and went no further.`;
    if (!w.rogue.told && C.n >= 3) { w.rogue.told = 1; milestone(w, text + ` ${w.rogue.nm ? w.rogue.nm + ' was right' : 'The rogueing works'}: a little grain given up early saved the rest.`); }
    else log(w, text, 'good');
    return;
  }
  rustSummary(w, R, C);
}
function rustSummary(w, R, C) {
  if (C.n <= 1 && C.g < 50) { log(w, 'The rust stayed in a single field this year and went no further.', 'info'); return; }
  const text = `The rust has run its course. It spread to ${plural(C.n, 'field', 'fields')} over ${plural(C.d, 'day', 'days')}` +
    (C.g ? `, and about ${C.g} grain that should have been harvested came in as thin, light ears or not at all.` : '.');
  if (C.n >= Math.max(10, w.fields.length >> 2) && R.n <= 1) milestone(w, text + ` The fields at the heart of the village, packed side by side, were the worst.`);
  else if (C.n >= Math.max(10, w.fields.length >> 2)) milestone(w, text);
  else log(w, text, 'bad');
}

// ---------- rogueing ----------
// After a rust year that reached ROGUE_LEARN fields, the healer (or the eldest) says sick grain must be kept apart
// from the well, as the fevered are. From then on, once a rusted field has been noticed (ROGUE_SEEN days after it
// was spotted), an idle adult walks its rows and pulls the spotted plants (ROGUE_WORK hours, ROGUE_COST of its
// yield). A pulled field loses no more to rust and passes it to nobody; when every spotted field still standing
// is pulled, the outbreak is over. f.rg tick pulled (cleared with f.ru).
// w.rogue { n fields pulled ever, y this year, k outbreaks stopped, nm who taught it, at, told first big one stopped }.
const ROGUE_LEARN = 6;      // fields one outbreak must reach before anyone thinks of it
export const ROGUE_SEEN = 2 * TICKS_PER_DAY; // the flecks are noticed this long after the field was spotted
const ROGUE_WORK = 3;       // hours to walk a field and carry the pulled plants off
const ROGUE_COST = 0.08;    // share of the field's yield pulled up with the sick plants
function learnRogue(w) {
  const healer = w.heal && aliveId(w, w.heal.id), who = healer || elder(w);
  w.rogue = { n: 0, y: 0, k: 0, nm: who ? who.name : null, at: w.t };
  if (!w.techs.includes('rogue')) w.techs.push('rogue');
  milestone(w, healer
    ? `${healer.name} walks through the thin, rust-red stubble and says it is the fever over again: one field takes it, and it goes to the fields beside it the way a fever goes through a crowded house. The sick are kept apart from the well, and so must the grain be. ` +
      `Next time the flecks show, the spotted plants will be pulled up by the roots before the rust can travel, and the armfuls carried off and burnt. ${w.name} learns to rogue the fields.`
    : `${who ? who.name : 'The eldest'} walks through the thin, rust-red stubble and says the rust must not be left to travel. Next time the flecks show, the spotted plants will be pulled up by the roots and carried off to burn. ${w.name} learns to rogue the fields.`);
}
function rogueTask(w, p) {
  if (!w.rogue || !w.rust || !w.rust.cur) return null;
  const f = nearest(w.fields, p, (o) => o.ru != null && o.rg == null && growing(o) && w.t - o.ru >= ROGUE_SEEN && w.res['r' + o.id] == null);
  return f && { k: 'rogue', key: 'r' + f.id, x: f.x, y: f.y, h: ROGUE_WORK };
}
function rogueDone(w, p, t, pop) {
  const f = w.fields.find((o) => 'r' + o.id === t.key);
  if (!f || f.ru == null || f.rg != null || !growing(f) || !w.rogue) return;
  f.rg = w.t;
  f.lost = Math.min(0.8, Math.round(((f.lost || 0) + ROGUE_COST) * 1000) / 1000);
  w.rogue.n++; w.rogue.y++;
  if (w.rust.cur) w.rust.cur.r = (w.rust.cur.r || 0) + 1;
  pop('pulled', 'muted');
  if (w.rogue.n === 1) milestone(w, `${p.name} wades into the rusted field with a basket and works down the rows, pulling every flecked plant up by the roots, until the orange dust coats both arms to the elbow. ` +
    `When it is done the field looks gap-toothed, and the heap of sick grain at its edge is smoking. The first field is rogued on ${w.name}.`);
}

// ---------- rooks at the seed ----------
// Once there is grain enough to be worth the flight, a flock of rooks from the woods comes down by day in spring
// and summer on a field of new-sown seed (growth < CROW_SEED) or ripe ears. While it is down it eats a share of
// that field's yield each hour (f.lost, which the harvest counts); a sown field picked bare of its seed
// (CROW_STRIP) goes back to fallow and has to be sown again. The flock grows every year with the fields.
// After CROW_LEARN fields' worth of grain has gone, the eldest sends the children out with wooden clappers: while
// a flock is down, a few idle children (CROW_KID_AGE-13) run to the field, and when one gets there the birds
// mostly lift and keep off a while. A village that scares them often enough shrinks the flock the next spring.
// w.crow { b birds, n landings ever, e fields' worth eaten ever, g grain ever, y grain this year, st fields
// stripped ever, ys scared this year, s scared ever, wait tick before the next landing, cur {f, x, y, t, h} the
// flock on a field, up {x, y, t} the flock lifting off, sc scaring learned (tick), nm who taught it, k first child
// to drive them off }.
const CROW_YEAR = 2;          // the first spring they can come
const CROW_FIELDS = 10;       // fields before a flock thinks the village worth a visit
const CROW_FROM = 6, CROW_TO = 19; // hours they feed
const CROW_SEED = 0.2;        // a sown field is seed in the ground until it is this grown
const CROW_LAND = 0.14;       // chance per daylight hour that the flock comes down (half that in rain)
const CROW_PECK = 0.001;      // share of a field's yield each bird eats per hour
const CROW_MAXLOST = 0.6;     // the most they can take of a ripe field
const CROW_STRIP = 0.35;      // seed taken from a sown field before it is bare and must be sown again
const CROW_START = 8, CROW_MAX = 40, CROW_BREED = 5; // birds in the first flock, the most, and the yearly growth
const CROW_LEARN = 2;         // fields' worth eaten before the children are sent out
const CROW_KID_AGE = 6;       // the youngest sent out with a clapper
const CROW_KIDS = 2;          // children who run out to one flock (one more for every 6 children)
const CROW_LIFT = 0.8;        // chance per hour a child at the field puts the flock up
const CROW_SHY = 3;           // hours a scared flock keeps off
const CROW_THIN = 40;         // scarings in a year that send a quarter of the flock to nest elsewhere
const crowField = (f) => (f.stage === 'planted' && f.growth < CROW_SEED) || f.stage === 'ripe';
function crowYear(w) {
  const C = w.crow;
  if (!C) return;
  const was = C.b;
  if (C.sc && C.ys >= CROW_THIN) C.b = Math.max(CROW_START, C.b - Math.floor(C.b / 4));
  else C.b = Math.max(C.b, Math.min(CROW_MAX, CROW_START + (w.fields.length >> 1), C.b + CROW_BREED));
  if (C.y >= 100) log(w, `Rooks ate ${Math.round(C.y).toLocaleString()} grain in the fields last year.`, 'bad');
  if (C.b < was) log(w, `So many times driven off the grain, some of the rooks have gone to build in other woods. The flock is down to ${C.b}.`, 'good');
  if (C.m && C.my >= 20) log(w, `The scarecrows turned the rooks away ${C.my} times last year.`, 'good');
  C.y = 0; C.ys = 0; if (C.m) C.my = 0;
}
function crowHour(w, c) {
  const C = w.crow, h = c.hour, wx = w.wx ? w.wx.k : 'clear';
  const out = c.season > 1 || h < CROW_FROM || h >= CROW_TO || wx === 'storm' || wx === 'snow' || wx === 'fog';
  if (C && C.cur) {
    const f = w.fields.find((o) => o.id === C.cur.f);
    if (out || !f || !crowField(f)) { crowUp(w, C, h >= CROW_TO - 1 ? 2 : 1); return; }
    crowEat(w, C, f, c);
    if (!C.cur) return;
    if (C.sc) crowScare(w, C, f, c);
    if (C.cur && --C.cur.h <= 0) crowUp(w, C, 1 + ri(w, 2));
    return;
  }
  if (out || c.year < CROW_YEAR || w.fields.length < CROW_FIELDS) return;
  if (C && C.wait > w.t) return;
  if (rnd(w) >= (wx === 'rain' ? CROW_LAND / 2 : CROW_LAND)) return;
  const can = w.fields.filter(crowField);
  if (!can.length) return;
  const f = can[ri(w, can.length)];
  if (!C) crowCome(w, f);
  const K = w.crow;
  if (K.m && scareTurn(w, K, f)) return;
  if (K.sc && !K.m && K.s >= SCARE_LEARN) learnScarecrow(w, K);
  K.cur ={ f: f.id, x: f.x, y: f.y, t: w.t, h: 3 + ri(w, 4) };
  K.n++;
}
function crowCome(w, f) {
  w.crow = { b: CROW_START, n: 0, e: 0, g: 0, y: 0, st: 0, ys: 0, s: 0, wait: 0, cur: null, up: null, sc: null, nm: null, k: null, ...SCARE_FRESH() };
  if (!w.techs.includes('crows')) w.techs.push('crows');
  const who = elder(w);
  milestone(w, `A ragged black cloud comes up out of the woods at first light, wheels once over the houses, calling, and drops onto ${f.stage === 'ripe' ? 'the ripe grain' : 'a field sown only days ago'}. ` +
    `Rooks: ${CROW_START} of them, walking the rows like old men, ${f.stage === 'ripe' ? 'pulling the ears down and stripping them' : 'stabbing into the soft earth for the seed'}. ${who ? `${who.name} runs at them waving both arms and they lift, but they only settle again further down the rows. ` : ''}` +
    `There is enough grain on ${w.name} now for the rooks to think it worth the flight.`);
}
function crowEat(w, C, f, c) {
  const seed = f.stage === 'planted';
  const cap = seed ? 1 : CROW_MAXLOST, had = f.lost || 0;
  const take = Math.min(C.b * CROW_PECK, Math.max(0, cap - had));
  if (take <= 0) { crowUp(w, C, 1); return; }
  f.lost = Math.round((had + take) * 10000) / 10000;
  const g = Math.round(take * FIELD_YIELD * w.harvest * 100) / 100;
  C.e = Math.round((C.e + take) * 10000) / 10000;
  C.g = Math.round((C.g + g) * 100) / 100; C.y = Math.round((C.y + g) * 100) / 100;
  if (seed && f.lost >= CROW_STRIP) { // picked bare: dig it over and sow again
    f.stage = 'fallow'; f.growth = 0; f.lost = undefined;
    C.st++;
    const again = c.season === 0;
    if (C.st === 1 || (C.st % 5 === 0)) log(w, `The rooks have had nearly every seed out of a field. ${again ? 'It will have to be sown again.' : 'It is too late in the year to sow it again.'}`, 'bad');
    crowUp(w, C, 1);
    return;
  }
  if (!C.sc && C.e >= CROW_LEARN) learnScare(w, C, f);
}
// the flock lifts off the field it was on: back to the trees for a while
function crowUp(w, C, shy) {
  if (!C.cur) return;
  C.up = { x: C.cur.x, y: C.cur.y, t: w.t };
  C.cur = null;
  C.wait = w.t + shy;
}
const crowKid = (w, p) => { const a = ageY(w, p); return a >= CROW_KID_AGE && a < 14 && !p.cg; };
function learnScare(w, C, f) {
  const kids = w.people.filter((p) => !p.dead && !p.sick && crowKid(w, p));
  if (!kids.length) return; // nobody to send yet
  const who = elder(w);
  C.sc = w.t; C.nm = who ? who.name : null;
  if (!w.techs.includes('scaring')) w.techs.push('scaring');
  const kid = kids.sort((a, b) => a.born - b.born || a.id - b.id)[0];
  milestone(w, `${who ? who.name : 'The eldest'} counts the bare patches in the rows and says the grown-ups cannot stand in the fields all day. ` +
    `That evening two flat boards are tied loosely together with a thong, and ${kid.name} is shown how to swing them so they clap like a branch breaking. ` +
    `From now on, when the rooks come down, the children run out with clappers and stones and shout until they lift. ${w.name} keeps bird-scarers.`);
}
// a few idle children run out to the flock; once one is there, the birds go up
function crowScare(w, C, f, c) {
  let there = false, going = 0;
  for (const p of w.people) {
    if (p.dead || !p.task || p.task.k !== 'scare') continue;
    if (p.task.f !== f.id) { p.task.f = f.id; p.task.x = f.x; p.task.y = f.y; p.task.h = 2; } // to the field they are on now
    going++;
    if (d2(p.x, p.y, f.x + 0.5, f.y + 0.5) <= 2.25) there = true;
  }
  if (there && rnd(w) < CROW_LIFT) {
    const by = w.people.find((p) => !p.dead && p.task && p.task.k === 'scare' && d2(p.x, p.y, f.x + 0.5, f.y + 0.5) <= 2.25);
    C.s++; C.ys++;
    if (!C.k && by) { C.k = by.name; log(w, `${by.name} runs into the rows swinging the clapper and yelling, and the whole flock goes up at once, cawing, and makes for the trees.`, 'good'); }
    crowUp(w, C, CROW_SHY);
    return;
  }
  const kids = w.people.filter((p) => !p.dead && !p.sick && !p.asleep && !p.hurt && crowKid(w, p)).length;
  const want = Math.min(kids, CROW_KIDS + Math.floor(kids / 6));
  for (let k = going; k < want; k++) {
    const p = nearest(w.people, { x: f.x + 0.5, y: f.y + 0.5 }, (o) => !o.dead && !o.sick && !o.asleep && !o.hurt && crowKid(w, o) && (!o.task || o.task.k === 'idle'));
    if (!p) break;
    release(w, p);
    p.task = { k: 'scare', f: f.id, x: f.x, y: f.y, h: 2 };
  }
}
export const crowsDown = (w) => !!(w.crow && w.crow.cur);

// ---------- scarecrows ----------
// Once the children have run out after the rooks SCARE_LEARN times, the eldest stands a cross of poles in a field
// with straw and an old hide on it. When the flock picks a field to come down on and a scarecrow still frightens
// them stands within SCARE_R2 of it, they wheel away and try again later; each time they are turned the
// scarecrow loses a little of its fright (s.d). The turn it reaches nothing, one lands on its head and the flock
// comes down around it: it is found out, guards nothing, and waits for an idle adult to pull it up and stand it
// somewhere new (spring and summer only). The village keeps 1 + fields/SCARE_PER of them (up to SCARE_MAX);
// each new one costs a pole of timber, and a hide when there are spare ones, which frightens them longer.
// w.crow gains { m null | scarecrows [{x, y, f field id, d fright left, n flocks turned, by maker, hd hide, t made}],
// mk made ever, mt flocks turned ever, my this year, mv moved ever, mo found out ever, mnm who made the first, mat }.
const SCARE_LEARN = 30;       // times the children have driven the flock off before a scarecrow is thought of
const SCARE_R2 = 10;          // squared tiles from a field to a scarecrow that guards it (about 3 tiles round)
const SCARE_FEAR = 20;        // flocks a straw scarecrow turns before it is found out
const SCARE_HIDE = 1.5;       // a hide-coated one lasts this much longer
const SCARE_HIDES = 4;        // hides kept back before one goes on a scarecrow
const SCARE_PER = 10, SCARE_MAX = 8; // fields per scarecrow, and the most kept
const SCARE_WORK = 3;         // hours to drive the poles in and dress it
const SCARE_FRESH = () => ({ m: null, mk: 0, mt: 0, my: 0, mv: 0, mo: 0, mnm: null, mat: null });
const scareMax = (w) => Math.min(SCARE_MAX, 1 + Math.floor(w.fields.length / SCARE_PER));
const scareFear = (s) => (s.hd ? Math.round(SCARE_FEAR * SCARE_HIDE) : SCARE_FEAR);
function learnScarecrow(w, C) {
  const who = elder(w);
  if (!who) return;
  C.m = []; C.mnm = who.name; C.mat = w.t;
  if (!w.techs.includes('scarecrow')) w.techs.push('scarecrow');
  milestone(w, `The children have run out after the rooks ${C.s} times, and still the flock comes back. ${who.name} watches it come in over the trees and turn away from a field where somebody stands hoeing, and laughs: they are afraid of a man, not of a clapper. ` +
    `That evening two poles are lashed into a cross and stuffed with straw, ${w.hides >= SCARE_HIDES ? 'an old hide is hung over the arms' : 'a bundle of straw is tied on for a head'}, and the figure is carried out to the fields. ${w.name} learns to make scarecrows.`);
}
// the flock comes in over a field: is it still frightened of a scarecrow by it?
function scareTurn(w, C, f) {
  let s = null, bd = 1e9;
  for (const o of C.m) {
    if (o.x == null || o.d <= 0) continue;
    const dd = d2(o.x, o.y, f.x, f.y);
    if (dd <= SCARE_R2 && dd < bd) { bd = dd; s = o; }
  }
  if (!s) return false;
  s.d--;
  if (s.d <= 0) { // they have seen through it: one sits on its head, the rest come down
    C.mo++;
    const whose = s.by ? `${s.by}'s` : 'the';
    log(w, [`A rook drops onto the hat of ${whose} scarecrow and sits there cawing, and the flock comes down round its feet. It frightens nobody now.`,
      `The rooks walk the rows right up to ${whose} scarecrow now, and one is pulling straw out of its sleeve. It will have to be moved.`,
      `The flock has seen through ${whose} scarecrow: they come down all round it and one perches on the crossbar.`][C.mo % 3], 'bad');
    return false;
  }
  s.n++; C.mt++; C.my++;
  if (C.mt === 1) log(w, `The rooks come in low over the trees, see the figure standing in the rows with its arms out, and wheel away cawing. Not one of them lands.`, 'good');
  C.up = { x: f.x, y: f.y, t: w.t };
  C.wait = w.t + 1 + ri(w, 2);
  return true;
}
// where a new or moved scarecrow should stand: the field that brings the most unguarded fields inside its reach
function scareSite(w, C, moving) {
  const F = w.fields;
  if (!F.length) return null;
  const guarded = (f) => C.m.some((o) => o !== moving && o.x != null && o.d > 0 && d2(o.x, o.y, f.x, f.y) <= SCARE_R2);
  const open = F.filter((f) => !guarded(f));
  if (!open.length) return null;
  const st = Math.max(1, Math.floor(open.length / 60)), fx = w.fire.x, fy = w.fire.y;
  let best = null, bn = 0, bd = 1e9;
  for (let k = 0; k < open.length; k += st) {
    const f = open[k];
    if (C.m.some((o) => o.x === f.x && o.y === f.y)) continue;
    let n = 0;
    for (const g of open) if (d2(g.x, g.y, f.x, f.y) <= SCARE_R2) n++;
    const dd = d2(f.x, f.y, fx, fy);
    if (n > bn || (n === bn && dd < bd)) { bn = n; bd = dd; best = f; }
  }
  return bn >= 2 ? best : null;
}
function scareTask(w, c) {
  const C = w.crow;
  if (!C || !C.m || c.season > 1 || w.res.zk != null) return null;
  let o = -1;
  for (let k = 0; k < C.m.length; k++) if (C.m[k].d <= 0) { o = k; break; }
  if (o < 0 && (C.m.length >= scareMax(w) || w.timber < 1)) return null;
  const f = scareSite(w, C, o >= 0 ? C.m[o] : null);
  if (!f) return null;
  return { k: 'crowman', key: 'zk', x: f.x, y: f.y, h: SCARE_WORK, o, f: f.id };
}
function scareDone(w, p, t, pop) {
  const C = w.crow;
  if (!C || !C.m) return;
  const f = w.fields.find((o) => o.id === t.f);
  if (!f || C.m.some((o) => o.x === f.x && o.y === f.y)) return;
  if (t.o >= 0) { // a found-out one pulled up and stood where they have not seen it
    const s = C.m[t.o];
    if (!s || s.d > 0) return;
    s.x = f.x; s.y = f.y; s.f = f.id; s.d = scareFear(s); s.n = 0;
    C.mv++;
    pop('moved', 'muted');
    if (C.mv === 1) log(w, `${p.name} pulls the found-out scarecrow up by its poles, carries it across the fields over one shoulder and drives it in again where the rooks have not seen it. The next flock that comes in turns away.`, 'good');
    return;
  }
  if (C.m.length >= scareMax(w) || w.timber < 1) return;
  w.timber -= 1;
  const hd = w.hides >= SCARE_HIDES ? 1 : 0;
  if (hd) w.hides -= 1;
  const s = { x: f.x, y: f.y, f: f.id, d: 0, n: 0, by: p.name, hd, t: w.t };
  s.d = scareFear(s);
  C.m.push(s); C.mk++;
  pop('scarecrow', 'food');
  if (C.mk === 1) milestone(w, `${p.name} drives the poles into the middle of a field and hangs ${hd ? 'an old hide' : 'straw'} on the arms. In the wind it flaps and turns, and from the trees it looks like someone standing there. The first scarecrow stands on ${w.name}.`);
  else if (C.m.length > 1 && C.m.length === scareMax(w)) log(w, `${C.m.length} scarecrows stand in the fields now, each one keeping the rooks off the rows round it.`, 'good');
}

// ---------- smudge fires ----------
// Twice blackened by a late frost, the village fights it. On the second evening of a spring cold snap (the night
// before the frost can settle) the young and strong go out at dusk with damp straw and green wood and keep small
// smoky fires going between the rows of young grain till dawn; the smoke keeps most of the frost off the fields
// round each fire. Each fire costs firewood; the smudgers sleep late the next morning.
// w.smudge { n nights lit, f fires lit ever, s fields saved ever, y saved this year, nm who first lit them, at,
// on [{x, y, id}] tonight's fires and their tenders, last [ids] sleeping it off, k turn }.
const SMUDGE_LEARN = 2;     // killing frosts before the village fights back
const SMUDGE_FROM = 20;     // hour the smudgers go out
const SMUDGE_TO = 6;        // and come in at dawn
const SMUDGE_REST = 10;     // they sleep until
const SMUDGE_R = 10;        // (squared) the smoke from one fire covers fields this close
const SMUDGE_CREW = 12;     // most fires lit in a night
const SMUDGE_WOOD = 0.5;    // timber per fire per night
const SMUDGE_HOLD = 0.8;    // chance the smoke keeps the frost off a covered field
const SMUDGE_AT = 4;        // (squared) the tender must be this close to keep a fire going
// fires that are really burning: their tender is there, awake and well
function smudgeLit(w) {
  return w.smudge.on.filter((o) => { const p = aliveId(w, o.id); return p && !p.asleep && d2(p.x, p.y, o.x + 0.5, o.y + 0.5) < SMUDGE_AT; });
}
export const smudgeOn = (w) => !!(w.smudge && w.smudge.on.length);
function learnSmudge(w) {
  const who = elder(w);
  if (!who) return;
  w.smudge = { n: 0, f: 0, s: 0, y: 0, nm: who.name, at: w.t, on: [], last: [], k: 0 };
  if (!w.techs.includes('smudge')) w.techs.push('smudge');
  milestone(w, `Twice now the cold has come back after the sowing and blackened the young grain. ${who.name} has seen that the rows downwind of the hearth, where the smoke drifts in the night, came through green. ` +
    `From now on, when a spring cold snap sets in and the evenings are clear and still, the young will carry damp straw and green wood out to the fields at dusk and keep smoky fires going between the rows till dawn. ${w.name} learns to smudge the fields.`);
}
function smudgeHour(w, c) {
  const S = w.smudge, h = c.hour;
  if (h === SMUDGE_TO && S.on.length) { S.last = S.on.map((o) => o.id); S.on = []; }
  if (h === SMUDGE_REST && S.last.length) S.last = [];
  if (S.on.length) S.on = S.on.filter((o) => {
    const p = aliveId(w, o.id);
    if (p && !(p.sick || p.hurt || isLost(w, p))) return true;
    if (p && p.task && p.task.k === 'smudge') release(w, p);
    return false;
  });
  if (h !== SMUDGE_FROM || c.season !== 0 || c.year < FROST_YEAR || !w.wx || w.wx.k !== 'cold' || w.wx.n < FROST_SET_IN - 1) return;
  const risk = w.fields.filter((f) => f.stage === 'planted' && f.growth < 0.7);
  if (!risk.length) return;
  const fx = w.fire.x, fy = w.fire.y;
  risk.sort((a, b) => d2(a.x, a.y, fx, fy) - d2(b.x, b.y, fx, fy) || a.id - b.id);
  const can = w.people.filter((p) => watchable(w, p) && !(w.watch && w.watch.hid === p.id));
  if (!can.length) return;
  can.sort((a, b) => a.id - b.id);
  const crew = Math.min(SMUDGE_CREW, can.length), on = [];
  let k = S.k % can.length;
  for (const f of risk) {
    if (on.length >= crew || w.timber < SMUDGE_WOOD) break;
    if (on.some((o) => d2(o.x, o.y, f.x, f.y) <= SMUDGE_R)) continue;
    on.push({ x: f.x, y: f.y, id: can[k].id });
    k = (k + 1) % can.length;
    w.timber = Math.round((w.timber - SMUDGE_WOOD) * 100) / 100;
  }
  if (!on.length) return;
  S.k = (S.k + on.length) % 9973;
  S.on = on; S.n++; S.f += on.length;
}
function smudgeTold(w, s) {
  const S = w.smudge;
  if (!S || !s.fs) return;
  const firstSave = !S.s;
  S.s += s.fs; S.y += s.fs;
  const len = spellLen(s.n).toLowerCase();
  if (firstSave) milestone(w, `For ${len} the nights are clear and bitter, and every night the smudge fires smoulder between the rows. At dawn the grass by the houses is white, but under the smoke the young grain stands green: ` +
    `${plural(s.fs, 'field', 'fields')} the frost would have killed came through.${s.fk ? ` Farther out, past the reach of the smoke, ${plural(s.fk, 'field', 'fields')} went black all the same.` : ''} ${S.nm} walks the rows with smoke-red eyes and says the lost sleep was cheap.`);
  else if (s.fk) log(w, `The smudge fires kept the frost off ${plural(s.fs, 'more field', 'more fields')}.`, 'good');
  else log(w, `${spellLen(s.n)} of frost ${len.startsWith('a ') ? 'lifts' : 'lift'}. Under the smudge smoke ${plural(s.fs, 'field', 'fields')} of young grain came through green.`, 'good');
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
const beastHome = (w, k) => (k === 'wolf' ? w.fauna.den : k === 'deer' ? w.fauna.bed : k === 'lone' ? (w.lone && w.lone.cur && w.lone.cur.at) : w.fauna.lair);
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
  for (const p of w.people) if (p.hurt && p.hurt <= w.t) p.hurt = undefined;
  if (c.day % 30 === 0 || (F.den && tile(w, F.den.x, F.den.y) !== T.FOREST) || (F.lair && tile(w, F.lair.x, F.lair.y) !== T.FOREST)) findLairs(w);
  else if (!F.mead || tile(w, F.mead.x, F.mead.y) !== T.GRASS) findMeadow(w);
  deerDay(w, c);
  if (w.lone !== undefined) loneDay(w, c);
  if (w.bear !== undefined) bearDay(w, c);
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
    if (w.tiles[i] === T.FOREST && w.wood[i] <= DEER_BROWSE && !isStool(w, i)) { setTile(w, i, T.GRASS); w.wood[i] = 0; }
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
    else if (b.k === 'lone') loneWolf(w, b, !storm && h >= 6 && h < 19 && b.rest <= w.t);
    else if (b.k === 'deer') deer(w, b, deerOut);
    else if (b.k === 'bear') bear(w, b, c, storm);
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
      : F.gap ? `A boar forces its way through a gap in the hawthorn and roots through ${plural(F.hit, 'field', 'fields')} in the night.`
      : `Boars root through ${plural(F.hit, 'field', 'fields')} by the woods in the night.`;
    if (!F.raids) milestone(w, `${text} The grain is trampled and torn up. Nobody on ${w.name} has an answer for them yet.`);
    else log(w, text, 'bad');
    F.raids++; F.hit = 0;
    learnHunting(w);
    if (F.raids >= FENCE_LEARN) learnFencing(w);
    if (!w.hedge && (F.br || 0) >= HEDGE_LEARN) learnHedges(w, c);
  }
  if (h === 20 && w.goats) penNight(w, c, wx);
  if (h === 6 && w.hedge && w.hedge.th && !w.hedge.held && !F.hit) {
    w.hedge.held = 1;
    milestone(w, `A boar comes snuffling out of the trees in the night and walks the length of the hawthorn, looking for a way through. There is none. In the morning there are tufts of bristle caught on the thorns and the grain behind them stands untouched. The hedges have grown.`);
  }
  if (h === 6) { F.raid = 0; F.turned = 0; F.broke = 0; F.gap = 0; if (w.hedge) w.hedge.th = 0; }
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
    if (p.task && p.task.k === 'smudge') continue; // nor near the smoke in the fields
    if (p.task && p.task.k === 'vigil') continue; // nor in among the stones, round the little fire
    if (p.task && p.task.sea) continue; // out on the water in the dugout
    if (p.cl) continue; // walking in a wolf's skin: no wolf singles them out
    if (w.people.some((o) => o !== p && !o.dead && !o.asleep && d2(o.x, o.y, p.x, p.y) < 9 && ageY(w, o) >= 14)) continue;
    bd = dd; best = p;
  }
  return best;
}

function bite(w, b, p) {
  const F = w.fauna;
  b.prey = null; b.rest = w.t + 48; // the wolf slinks off and lies low for two days
  const L = b.k === 'lone' && w.lone.cur, A = L ? L.nm : 'A wolf';
  if (L) { b.rest = w.t + LONE_REST * TICKS_PER_DAY; L.b++; w.lone.yh = (w.lone.yh || 0) + 1; }
  w.stats.yw = (w.stats.yw || 0) + 1;
  const first = !F.att;
  F.att++;
  const wasAfraid = F.fear > w.t;
  F.fear = w.t + FEAR_DAYS * TICKS_PER_DAY;
  const after = wasAfraid ? '' : L ? ' For weeks after, nobody goes out to the woodpile alone.' : ' For weeks after, nobody stays out past dusk.';
  const helper = w.people.find((o) => o !== p && !o.dead && !o.asleep && ageY(w, o) >= 14 && d2(o.x, o.y, p.x, p.y) < 9);
  const fog = w.wx && w.wx.k === 'fog';
  if (fog) { w.wx.b = (w.wx.b || 0) + 1; F.fa = (F.fa || 0) + 1; }
  const where = fog ? 'out of the fog' : 'at the edge of the trees';
  let text;
  const dog = !helper && dogBy(w, p);
  if (helper) text = `${A} springs at ${p.name}${fog ? ' out of the fog' : ''}; ${helper.name} runs over and together they drive it off with sticks and stones.`;
  else if (dog) { // the dog flies at it: half wolf itself, and fighting for its own pack
    const D = w.dogs, him = dog.sex === 'f' ? 'her' : 'him';
    D.k++;
    if (rnd(w) < DOG_DIES) {
      D.d = D.d.filter((o) => o !== dog); D.dead++;
      text = `${A} springs at ${p.name}${fog ? ' out of the fog' : ''}. ${dog.nm} flies at it, and the two roll snarling over and over in the ${fog ? 'grey' : 'grass'} until the wolf breaks away and runs. ${dog.nm} does not get up. ${p.name} carries ${him} home.`;
    } else text = `${A} springs at ${p.name}${fog ? ' out of the fog' : ''}; ${p.name}'s dog ${dog.nm} flies at its throat, and the wolf breaks off and runs for the trees.`;
    if (D.k === 1) { milestone(w, `${text} That night ${w.name} ${D.dead ? `buries ${dog.nm} by the door` : `gives ${dog.nm} the best bone in the pot`}. A wolf the village raised has turned on its own kind for them.`); return; }
  } else if (rnd(w) < WOLF_KILL) {
    if (L) { // in broad day, with the village in earshot and nobody near enough to help
      die(w, p, `was dragged down by the lone wolf ${L.nm}`);
      L.k++; F.kills = (F.kills || 0) + 1;
      milestone(w, `${L.nm} takes ${p.name} ${fog ? 'out of the fog' : 'in broad daylight, a stone\'s throw from the fields'}. By the time the others come running there is only a trail of blood into the trees. Nobody on ${w.name} works alone now if they can help it.`);
      learnHunting(w);
      return;
    }
    die(w, p, fog ? 'was dragged down by wolves in the fog' : 'was dragged down by wolves');
    text = fog ? `Wolves take ${p.name} in the fog. Nobody saw them come.` : `Wolves take ${p.name} at the edge of the trees.`;
    if (fog) w.wx.x = (w.wx.x || 0) + 1;
    F.kills = (F.kills || 0) + 1;
    if (F.kills === 1) { milestone(w, text + ` ${w.name} learns to fear the dark woods.` + after); return; }
  } else {
    p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
    release(w, p);
    text = L ? `${A} leaps on ${p.name} ${fog ? where : 'in broad daylight'}. ${p.sex === 'f' ? 'She' : 'He'} limps home, badly bitten.`
      : `A wolf leaps on ${p.name} ${where}. ${p.sex === 'f' ? 'She' : 'He'} limps home, badly bitten.`;
  }
  if (first) milestone(w, text + after);
  else log(w, text + after, 'bad');
  learnHunting(w);
}

// ---------- the lone wolf ----------
// w.lone = { n arrivals, y year the last one came or went, dead killed by hunters, gone moved on, yh attacks this year,
// cur: { id beast, nm, at {x, y} bed, t came, g goats, b bitten, k killed, h hunts } | null, last: { nm, how, by } }
const loneOut = (w) => !!(w.lone && w.lone.cur);
// a thicket close to the fields, 10-20 tiles from the hearth, not the den
function loneBed(w) {
  const { x: fx, y: fy } = w.fire, den = w.fauna.den;
  let best = null, bs = -1e9;
  for (let y = fy - 20; y <= fy + 20; y++) for (let x = fx - 20; x <= fx + 20; x++) {
    if (!inMap(x, y) || w.tiles[idx(x, y)] !== T.FOREST) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 100 || dd > 400 || (den && d2(x, y, den.x, den.y) < 25)) continue;
    const n = thicket(w, x, y);
    if (n < 10) continue;
    const s = n * 0.4 - Math.sqrt(dd) + hash(x, y, w.seed + 61) * 3;
    if (s > bs && lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) { bs = s; best = { x, y }; }
  }
  return best;
}
// once a day: it may come in spring, keeps a bed near the fields, and in time moves on
function loneDay(w, c) {
  const F = w.fauna;
  if (loneOut(w)) {
    const L = w.lone.cur, b = w.beasts.find((o) => o.id === L.id);
    if (!b) { w.lone.cur = null; return; }
    if (!L.at || tile(w, L.at.x, L.at.y) !== T.FOREST) L.at = loneBed(w);
    if (!L.at) L.at = F.den ? { x: F.den.x, y: F.den.y } : null;
    if (c.doy === 300 && w.t - L.t >= LONE_YEARS * TICKS_PER_YEAR) {
      w.beasts = w.beasts.filter((o) => o !== b);
      w.lone.gone++; w.lone.y = c.year; w.lone.last = { nm: L.nm, how: 'gone' };
      w.lone.cur = null;
      milestone(w, `The tracks of ${L.nm} go down onto the sand at low tide, out along the bar towards the far isle, and the sea fills them in. Nobody sees ${L.nm} again. ${w.name} lets the children out to the woodpile on their own again.`);
    }
    return;
  }
  if (c.doy !== LONE_DAY || !F.den || !w.techs.includes('hunting') || (F.sw || 0) < LONE_KILLS) return;
  if (w.lone && c.year < w.lone.y + LONE_GAP) return;
  let pack = 0;
  for (const b of w.beasts) if (b.k === 'wolf') pack++;
  if (pack > 2 || rnd(w) >= LONE_ODDS) return;
  const at = loneBed(w);
  if (!at) return;
  const who = w.people.filter((p) => !p.dead && ageY(w, p) >= 14);
  if (!who.length) return;
  const p = who[ri(w, who.length)];
  const L0 = w.lone || (w.lone = { n: 0, y: 0, dead: 0, gone: 0, yh: 0, cur: null, last: null });
  const used = L0.last ? L0.last.nm : '';
  let k = ri(w, LONE_NAMES.length);
  if (LONE_NAMES[k][0] === used) k = (k + 1) % LONE_NAMES.length;
  const [nm, look] = LONE_NAMES[k];
  const b = addBeast(w, 'lone');
  b.x = b.px = at.x + 0.5; b.y = b.py = at.y + 0.5;
  L0.n++; L0.y = c.year;
  L0.cur = { id: b.id, nm, at, t: w.t, g: 0, b: 0, k: 0, h: 0 };
  const first = !w.techs.includes('lone');
  if (first) w.techs.push('lone');
  milestone(w, first
    ? `${p.name} comes in from the woodpile white in the face. A wolf stood at the edge of the trees at midday and watched ${p.sex === 'f' ? 'her' : 'him'}, alone and bold as a dog, with ${look}. The spears have kept the pack at the den small for years, and a young wolf driven out of it has nowhere to go but here. It walks by day, when the others sleep. The islanders call it ${nm}.`
    : `${p.name} sees a lone wolf with ${look} watching the fields at midday. The den has driven out another one with nowhere to go. The islanders call it ${nm}.`);
}
function loneWolf(w, b, active) {
  const L = w.lone.cur, home = L.at || { x: Math.floor(b.x), y: Math.floor(b.y) };
  if (!active) {
    b.prey = null; b.goat = null;
    if (b.out && moveBeast(b, home.x + 0.5, home.y + 0.5, WOLF_SPEED)) b.out = 0;
    return;
  }
  if (!b.out) { b.out = 1; b.x = b.px = home.x + 0.5; b.y = b.py = home.y + 0.5; edge(w, b); }
  if (b.goat != null) {
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
  if (rnd(w) < LONE_STALK) {
    const p = lone(w, b);
    if (p) { b.prey = p.id; return; }
    const g = w.goats && strayGoat(w, b);
    if (g) { b.goat = g.id; return; }
  }
  if (--b.h <= 0) edge(w, b);
}
// the hunters' hours at its bed are up: cornered, gone, or it turns on them
function loneHunt(w, p) {
  const L = w.lone.cur, F = w.fauna;
  const b = L && w.beasts.find((o) => o.id === L.id);
  if (!b) return;
  L.h++;
  const mate = w.people.find((o) => o !== p && !o.dead && o.task && o.task.key === 'h1' && d2(o.x, o.y, p.x, p.y) < 9);
  const who = mate ? `${p.name} and ${mate.name}` : p.name, r = rnd(w);
  const odds = LONE_HUNT * (mate ? 1 : 0.5), harm = 0.04 * (mate ? 1 : 2);
  if (r < odds) {
    w.beasts = w.beasts.filter((o) => o !== b);
    w.hides = (w.hides || 0) + 1;
    w.stats.yk = (w.stats.yk || 0) + 1;
    F.sw = (F.sw || 0) + 1;
    p.haul = 'wolf';
    const yrs = Math.floor((w.t - L.t) / TICKS_PER_YEAR);
    w.lone.dead++; w.lone.y = clock(w.t).year; w.lone.last = { nm: L.nm, how: 'killed', by: who };
    w.lone.cur = null;
    milestone(w, `${who} ${mate ? 'come' : 'comes'} on ${L.nm} asleep in the bracken after ${L.h === 1 ? 'one hunt' : `${L.h} hunts`}${yrs ? ` and ${plural(yrs, 'year', 'years')} of it walking the treeline` : ''}, and ${mate ? 'put' : 'puts'} a spear through it before it is up. The pelt, paler and bigger than any from the den, is pegged out by the hearth, and that night everybody stays up late round the fire.`);
    deed(w, p, 'w'); deed(w, mate, 'w');
    cloakMade(w, p, L.nm, mate);
  } else if (r < odds + harm) {
    const fatal = rnd(w) < (mate ? 0.1 : 0.3);
    if (fatal) die(w, p, `was killed hunting the lone wolf ${L.nm}`);
    else p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
    log(w, fatal
      ? `${L.nm} doubles back on its own trail and comes at ${p.name} from behind. ${mate ? mate.name + ' brings the body home.' : 'Nobody was there to help.'}`
      : `${L.nm} doubles back on its own trail and comes at ${p.name} from behind. ${p.sex === 'f' ? 'She' : 'He'} comes home bitten.`, 'bad');
  } else if (L.h % 3 === 1) log(w, `${who} ${mate ? 'find' : 'finds'} the bed where ${L.nm} lies up, the bracken still warm, but the wolf is gone.`, 'info');
}

// ---------- the bear ----------
// w.bear = { n visits, y year the last one came, r nights it raided, yr this year, hc comb eaten, cc cheese rounds eaten,
// k logs split, dv nights driven off, m swipes, last { nm, look, y, how } the bear that went last,
// cur: { id beast, nm, look, at {x, y} bed, t came, r, hc, cc, k, dv, m this visit, back came before } | null }.
// While it is out for the night the beast carries b.raid ('hive' | 'rack'), b.tx/ty the target tile, b.hv the log,
// b.eat hours at it, b.hc/b.cc eaten tonight, b.sp log split tonight. A split log is h.tp (stood up again when the bear goes).
const BEAR_FRESH = () => ({ n: 0, y: 0, r: 0, yr: 0, hc: 0, cc: 0, k: 0, dv: 0, m: 0, last: null, cur: null });
const bearSweet = (w) => beesAlive(w) > 0 || !!(w.cheese && w.cheese.r && w.cheese.c > 0);
// what it goes for tonight: the heaviest log, or the cheese rack
function bearPrey(w) {
  let hive = null, bc = 12;
  if (w.bees) for (let i = 0; i < w.bees.h.length; i++) { const h = w.bees.h[i]; if (h.a && h.c > bc) { bc = h.c; hive = { k: 'hive', i, x: h.x, y: h.y }; } }
  const R = w.cheese, rack = R && R.r && R.c > 0 ? { k: 'rack', i: -1, x: R.r.x, y: R.r.y } : null;
  if (hive && rack) return rnd(w) < 0.6 ? hive : rack;
  return hive || rack;
}
// once a day: late in summer it may wade over the bar, and with the first frosts it goes back
function bearDay(w, c) {
  const B = w.bear;
  if (B && B.cur) {
    const C = B.cur, b = w.beasts.find((o) => o.id === C.id);
    if (!b) { B.cur = null; return; }
    if (!C.at || tile(w, C.at.x, C.at.y) !== T.FOREST) C.at = loneBed(w) || C.at;
    if (b.pit) return; // in the pit: the spears come at dawn
    if (c.doy >= BEAR_LEAVE) { bearGoes(w, b, c); return; }
    pitChild(w, c);
    return;
  }
  if (c.doy !== BEAR_DAY || c.year < BEAR_YEAR || !w.fauna || !bearSweet(w)) return;
  if (B && B.n && c.year < B.y + BEAR_GAP) return;
  if (rnd(w) >= BEAR_ODDS) return;
  const at = loneBed(w);
  if (!at) return;
  const who = w.people.filter((p) => !p.dead && ageY(w, p) >= 14);
  if (!who.length) return;
  const p = who[ri(w, who.length)];
  const B0 = B || (w.bear = BEAR_FRESH());
  let nm, look, back = 0;
  if (B0.last && B0.last.how === 'gone' && rnd(w) < BEAR_BACK) { nm = B0.last.nm; look = B0.last.look; back = 1; }
  else {
    let k = ri(w, BEAR_NAMES.length);
    if (B0.last && BEAR_NAMES[k][0] === B0.last.nm) k = (k + 1) % BEAR_NAMES.length;
    [nm, look] = BEAR_NAMES[k];
  }
  const b = addBeast(w, 'bear');
  b.x = b.px = at.x + 0.5; b.y = b.py = at.y + 0.5;
  B0.n++; B0.y = c.year;
  B0.cur = { id: b.id, nm, look, at, t: w.t, r: 0, hc: 0, cc: 0, k: 0, dv: 0, m: 0, back };
  if (back && B0.last.wise) B0.cur.wise = 1; // it went round the pit last time, and remembers
  const first = !w.techs.includes('bear'), Nm = Cap(nm), sweet = beesAlive(w) ? 'the honey' : 'the cheese';
  if (first) w.techs.push('bear');
  if (first) milestone(w, `${p.name} comes up from the beach at first light white in the face. In the wet sand below the tide line there are prints as long as a forearm, five claws pressed deep in front of each, coming in off the bar from the far isle and going straight up into the woods. ` +
    `At dusk something big breaks through the bracken at the edge of the trees, stands up on its hind legs to sniff the wind, and drops down again: a bear, with ${look}. Nobody alive on ${w.name} has ever seen one. It has smelled ${sweet} from across the water. The islanders call it ${nm}.`);
  else if (back) milestone(w, `The great clawed prints are in the sand below the tide line again, coming in off the bar. ${Nm} is back for ${sweet}, and the children are kept by the houses after dark.`);
  else milestone(w, `Clawed prints come in off the bar at low tide again, but this bear is a stranger, with ${look}. It goes up into the woods by the village. The islanders call it ${nm}.`);
  pitCover(w, p);
}
// the first frosts: it goes back over the bar
function bearGoes(w, b, c) {
  const B = w.bear, C = B.cur;
  w.beasts = w.beasts.filter((o) => o !== b);
  B.last = { nm: C.nm, look: C.look, y: c.year, how: 'gone' };
  if (C.wise) B.last.wise = 1;
  B.cur = null;
  if (B.pit && B.pit.s === 2) B.pit.s = 1; // the cover is lifted and the hurdle laid back over it
  else if (!B.pit && w.techs.includes('hunting') && (C.r >= PIT_NIGHTS || C.k)) B.pd = 1; // next spring the hunters dig for it
  let split = 0;
  if (w.bees) for (const h of w.bees.h) if (h.tp != null) { h.tp = undefined; split++; }
  const took = [C.hc >= 1 && `${Math.round(C.hc)} comb from the logs`, C.cc && `${plural(C.cc, 'round', 'rounds')} of cheese off the rack`].filter(Boolean);
  const Nm = Cap(C.nm);
  milestone(w, `The first frost is white on the grass, and the prints of ${C.nm} go down onto the sand at low tide and out along the bar towards the far isle. ` +
    (C.r ? `${Nm} came into the village on ${plural(C.r, 'night', 'nights')} and took ${took.length ? took.join(' and ') : 'little'}${C.k ? `, and split ${plural(C.k, 'log', 'logs')} open` : ''}; ${C.dv ? `it was driven off with brands ${plural(C.dv, 'time', 'times')}` : 'nobody ever woke to drive it off'}. ` : `${Nm} never once came out of the trees. `) +
    (split ? `The split ${split === 1 ? 'log is' : 'logs are'} stood up again and bound with withies for a swarm next spring. ` : '') + `It will remember the way.`);
}
// every hour: lie up by day; on a quiet night go for the logs or the rack until driven off or the dawn
function bear(w, b, c, storm) {
  const C = w.bear && w.bear.cur;
  if (!C) return;
  if (b.pit) { if (c.hour === PIT_DAWN) pitKill(w, b, c); return; } // down in the pit, roaring, until the spears come
  const h = c.hour, home = C.at || { x: Math.floor(b.x), y: Math.floor(b.y) };
  if (h === 22 && !b.raid && !storm && (b.rest || 0) <= w.t && rnd(w) < BEAR_NIGHT) {
    const g = bearPrey(w);
    if (g) {
      b.raid = g.k; b.tx = g.x; b.ty = g.y; b.hv = g.i; b.eat = 0; b.hc = 0; b.cc = 0; b.sp = 0;
      b.vp = w.bear.pit && w.bear.pit.s === 2 ? 1 : 0; // the way in from the trees runs past the covered pit
      if (!b.out) { b.out = 1; b.x = b.px = home.x + 0.5; b.y = b.py = home.y + 0.5; }
    }
  }
  if (!b.raid) {
    if (b.out && moveBeast(b, home.x + 0.5, home.y + 0.5, BEAR_SPEED)) b.out = 0;
    return;
  }
  if (h >= 5 && h < 22) { bearNightEnds(w, b, null, null); return; } // dawn: back to the trees
  if (b.vp) {
    const P = w.bear.pit;
    if (!P || P.s !== 2) b.vp = 0;
    else {
      if (!moveBeast(b, P.x + 0.5, P.y + 0.5, BEAR_SPEED)) return;
      b.vp = 0;
      pitStep(w, b, C);
      return;
    }
  }
  const tx = b.tx + 0.5, ty = b.ty + 1.2; // it stands at the foot of the log or the rack
  if (!moveBeast(b, tx, ty, BEAR_SPEED)) return;
  b.eat++;
  if (b.raid === 'hive') {
    const hv = w.bees && w.bees.h[b.hv];
    if (!hv || !hv.a) { bearNightEnds(w, b, null, null); return; }
    if (b.eat === 1 && rnd(w) < BEAR_SPLIT) { // over it goes: the log splits and the comb spills out
      b.hc += hv.c; hv.c = 0; hv.a = 0; hv.tp = w.t; b.sp = 1;
      bearNightEnds(w, b, null, null);
      return;
    }
    const e = Math.min(BEAR_COMB, Math.round((hv.c - 1) * 100) / 100);
    if (e <= 0) { bearNightEnds(w, b, null, null); return; }
    hv.c = Math.round((hv.c - e) * 100) / 100; b.hc += e;
  } else {
    const R = w.cheese;
    if (!R || !R.c) { bearNightEnds(w, b, null, null); return; }
    const e = Math.min(BEAR_CHEESE, R.c);
    R.c -= e; b.cc += e;
  }
  const p = waker(w, tx, ty, BEAR_NEAR), bark = dogNear(w, tx, ty, BEAR_NEAR);
  if (p && rnd(w) < (bark ? BEAR_BARK : BEAR_WAKE)) bearNightEnds(w, b, p, bark);
  else if (b.raid === 'rack' && !w.cheese.c) bearNightEnds(w, b, null, null);
}
// the night is over: it is driven off, or it has had its fill, or the dawn sends it back to the trees
function bearNightEnds(w, b, p, bark) {
  const B = w.bear, C = B.cur, what = b.raid, hc = Math.round(b.hc), cc = b.cc;
  b.raid = null; b.rest = w.t + 48; b.tx = null; b.ty = null;
  if (!b.eat && !p) return; // the dawn came before it got there
  C.r++; B.r++; B.yr = (B.yr || 0) + 1;
  C.hc += hc; B.hc += hc; C.cc += cc; B.cc += cc;
  if (b.sp) { C.k++; B.k++; }
  const first = B.r === 1, tail = !first ? '' : p ? ` Nobody on ${w.name} sleeps soundly after that.` : ` Nobody on ${w.name} has an answer for it yet.`;
  let text;
  if (p) {
    const swipe = rnd(w) < BEAR_SWIPE, P = Cap(pron(p));
    C.dv++; B.dv++;
    deed(w, p, 'u');
    if (bark) w.dogs.p++;
    text = `In the dead of night ${bark ? `${bark.nm} starts up barking ${what === 'hive' ? 'at the bee logs' : 'by the goat pen'} and will not stop` : what === 'hive' ? 'the bees roar in the dark' : 'the goats scream in the pen'}. ` +
      `${p.name} runs out with a burning brand and finds ${C.nm} ${what === 'hive' ? 'up on its hind legs with its head in a log, eating the comb' : 'pulling the cheese off the rods'}. ${P} shouts and swings the brand, and the bear drops down and lumbers off into the trees${what === 'hive' ? ', swatting at the bees' : ''}.`;
    if (swipe) {
      C.m++; B.m++;
      p.hurt = w.t + WOUND_DAYS * TICKS_PER_DAY;
      text += ` Before it goes it turns and swipes once, and ${p.name} is carried home with ${poss(p)} shoulder torn open.`;
    }
  } else if (what === 'hive') {
    text = b.sp ? `In the morning a bee log lies on its side in the grass, split from end to end, the comb torn out and the bees crawling dazed in the dew. ${Cap(C.nm)} has been in the village in the night.`
      : `In the morning the stone is off the top of a bee log and there are claw marks down its side: ${hc} comb is gone. ${Cap(C.nm)} has been at the hives in the night.`;
  } else text = `In the morning the cheese rack by the goat pen is dragged half down and ${plural(cc, 'round is', 'rounds are')} gone. In the mud below it are the prints of ${C.nm}.`;
  if (first) milestone(w, text + tail); else log(w, text, 'bad');
}

// ---------- the bear pit ----------
// w.bear.pd: the hunters mean to dig one; w.bear.pit = { x, y tile (a BUILD tile, so no field or house goes on it), d hours dug,
// s 0 digging | 1 open, a hurdle over it | 2 staked and covered | 3 a bear in it, nm who began it, at tick begun,
// c bears taken, sk times a bear went round it, ch children who fell in }. w.bear.kl bears taken ever,
// w.bear.skin { nm bear, by, id, y } the last skin, on the floor of the one whose spear finished it.
// On the beast: b.vp the way in tonight runs past the covered pit; b.pit it is down in it.
// a grass tile two or three steps out from the bee logs (or the cheese rack) on the side toward the trees
function pitSite(w) {
  const h0 = w.bees && w.bees.h.length ? w.bees.h[0] : w.cheese && w.cheese.r ? w.cheese.r : null;
  if (!h0) return null;
  let best = null, bs = 1e9;
  for (let y = h0.y - 3; y <= h0.y + 3; y++) for (let x = h0.x - 3; x <= h0.x + 3; x++) {
    if (Math.max(Math.abs(x - h0.x), Math.abs(y - h0.y)) < 2 || x < 2 || y < 2 || x >= MAP - 2 || y >= MAP - 2) continue;
    const i = idx(x, y);
    if (w.tiles[i] !== T.GRASS || (w.wear && w.wear[i] >= PATH_AT) || nearBuild(w, x, y, 1)) continue;
    if (w.goats && w.goats.pen && d2(x, y, w.goats.pen.x, w.goats.pen.y) < 4) continue;
    let fd = 50; // how far to the nearest trees
    for (let yy = y - 5; yy <= y + 5; yy++) for (let xx = x - 5; xx <= x + 5; xx++) if (tile(w, xx, yy) === T.FOREST) fd = Math.min(fd, d2(x, y, xx, yy));
    const sc = fd + hash(x, y, w.seed + 71);
    if (sc < bs && lineOfLand(w, w.fire.x + 0.5, w.fire.y + 0.5, x + 0.5, y + 0.5)) { bs = sc; best = { x, y }; }
  }
  return best;
}
// a spell of digging, for two grown hands at a time, spring to autumn by day
function pitTask(w, p, c) {
  const B = w.bear;
  if (!B || !B.pd || (B.pit && B.pit.s > 0) || c.season > 2 || c.hour < 7 || c.hour > 15) return null;
  const a = ageY(w, p);
  if (a < 16 || a > 50) return null;
  const key = w.res.bp0 == null ? 'bp0' : w.res.bp1 == null ? 'bp1' : null;
  if (!key) return null;
  let P = B.pit;
  if (!P) {
    const s = pitSite(w);
    if (!s) return null;
    P = B.pit = { x: s.x, y: s.y, d: 0, s: 0, nm: p.name, at: w.t, c: 0, sk: 0, ch: 0 };
    setTile(w, idx(s.x, s.y), T.BUILD);
    log(w, `${p.name} paces out a square of turf between the bee logs and the trees, where the prints of the bear came in, and cuts the first sod. A pit is to be dug there, deep enough that a bear cannot climb out.`, 'info');
  }
  const side = key === 'bp1' && tile(w, P.x + 1, P.y) === T.GRASS ? 1 : 0;
  return { k: 'pit', key, x: P.x + side, y: P.y, h: PIT_SPELL };
}
function pitDone(w, p, t, pop) {
  const B = w.bear, P = B && B.pit;
  if (!P || P.s !== 0) return;
  P.d += PIT_SPELL;
  pop('digging', 'wood');
  if (P.d < PIT_DIG) return;
  P.s = B.cur ? 2 : 1; B.pd = 0;
  const first = !w.techs.includes('bearpit');
  if (first) w.techs.push('bearpit');
  const last = B.last && B.last.how === 'gone' ? B.last.nm : null;
  if (first) milestone(w, `${p.name} climbs out of the pit by the bee logs on a notched pole and pulls it up after ${p.sex === 'f' ? 'her' : 'him'}. It is deeper than a man is tall, the sides cut sheer, the spoil carried off into the trees so nothing shows. ` +
    (B.cur ? 'Sharpened stakes go into its floor that same evening, and hazel rods and turf over the top. ' : 'A wattle hurdle is laid over it for now. When the clawed prints come in off the bar again, stakes will go into its floor and turf over the top. ') +
    `${last ? `Let ${last} come for the comb again. ` : ''}${w.name} has a bear pit.`);
}
// the prints are seen: the hurdle comes off, stakes go into the floor, rods and turf over the top
function pitCover(w, p) {
  const P = w.bear && w.bear.pit;
  if (!P || P.s !== 1) return;
  P.s = 2;
  log(w, `By evening the hurdle is off the bear pit. ${p.name} drives sharpened stakes into its floor, and hazel rods and turf go over the top until it looks like the grass around it. The children are told where it is, and told again.`, 'info');
}
// it reaches the covered pit on the way in: through it, or it smells the fresh earth and goes round
function pitStep(w, b, C) {
  const P = w.bear.pit;
  if (rnd(w) < (C.wise ? PIT_WISE : PIT_FALL)) {
    b.pit = 1; b.raid = null; b.tx = null; b.ty = null; b.vp = 0;
    b.x = b.px = P.x + 0.5; b.y = b.py = P.y + 0.5;
    P.s = 3;
    log(w, `In the dead of night there is a crash of rods by the bee logs and a roaring that wakes every house. ${Cap(C.nm)} is in the pit. Nobody goes near it in the dark.`, 'bad');
    return;
  }
  P.sk++;
  if (!C.wise) log(w, `In the morning the prints of ${C.nm} come down from the trees to the edge of the bear pit, stop, and go round it. A clawed hole is torn in the turf at one corner where it smelled the fresh earth.`, 'info');
  C.wise = 1;
}
// dawn: the hunters come to the rim with spears and finish it
function pitKill(w, b, c) {
  const B = w.bear, C = B.cur, P = B.pit;
  const kills = (p) => (p.dd ? (p.dd.b || 0) + (p.dd.d || 0) + (p.dd.w || 0) : 0);
  const able = w.people.filter((p) => !p.dead && !p.sick && !p.hurt && !isLost(w, p) && ageY(w, p) >= 16 && ageY(w, p) <= 55)
    .sort((a, z) => kills(z) - kills(a) || a.id - z.id);
  w.beasts = w.beasts.filter((o) => o !== b);
  B.cur = null;
  P.s = 1; P.c++; B.kl = (B.kl || 0) + 1;
  if (w.bees) for (const h of w.bees.h) if (h.tp != null) h.tp = undefined;
  const p0 = able[0], p1 = able[1];
  const by = p0 ? (p1 ? `${p0.name} and ${p1.name}` : p0.name) : 'the islanders';
  B.last = { nm: C.nm, look: C.look, y: c.year, how: 'pit', by };
  w.food += PIT_MEAT; w.hides = (w.hides || 0) + PIT_HIDES;
  if (p0) { B.skin = { nm: C.nm, by: p0.name, id: p0.id, y: c.year }; deed(w, p0, 'b'); }
  const text = `At first light ${by} stand at the rim of the bear pit with spears, and the whole village behind them. ${Cap(C.nm)} rears up against the stakes, and it is a long time before it lies still. ` +
    `It takes six to haul it out on ropes: ${PIT_MEAT} meat and fat go into the stores, and the great skin is pegged out ${p0 ? `by the door of ${p0.name}` : 'by the hearth'}. ${C.r ? `It came into the village on ${plural(C.r, 'night', 'nights')}; it will not come again.` : 'It never reached the logs.'}`;
  if (B.kl === 1) milestone(w, text + ` The first bear ever taken on ${w.name}.`); else log(w, text, 'good');
}
// while it is covered and a bear is about, a child playing out late may find it first
function pitChild(w, c) {
  const P = w.bear && w.bear.pit;
  if (!P || P.s !== 2 || c.season > 2 || rnd(w) >= PIT_CHILD) return;
  const kids = w.people.filter((p) => !p.dead && !p.sick && !p.hurt && !isLost(w, p) && ageY(w, p) >= 4 && ageY(w, p) < 13);
  if (!kids.length) return;
  const k = kids[ri(w, kids.length)];
  k.hurt = w.t + 4 * TICKS_PER_DAY;
  P.ch++;
  if (w.bear.cur) w.bear.cur.wise = 1; // it heard the screaming from the trees
  log(w, `At dusk ${k.name} runs after the others across the grass by the bee logs and drops through the turf into the bear pit, between the stakes. ${Cap(pron(k))} is pulled out by the arms, screaming, with a torn leg. The cover is mended in the morning, but the bear in the trees heard it all.`, 'bad');
}

// ---------- the wolf-skin cloak ----------
// The one whose spear kills a lone wolf wears its pelt: p.cl = { nm wolf, y year made, by first wearer, n hands it has passed }.
// No wolf singles out the wearer (lone()). At death it passes to the eldest grown child, else the partner, else into the grave.
// w.cloak = { n made, h handed down, g laid in graves }
function cloakMade(w, p, nm, mate) {
  if (!p || p.dead) return;
  const C = w.cloak || (w.cloak = { n: 0, h: 0, g: 0 });
  if (p.cl && mate && !mate.dead && !mate.cl) {
    log(w, `${p.name} already wears a wolf's skin, so ${pron(p)} gives the pelt of ${nm} to ${mate.name}, who was at ${poss(p)} side.`, 'good');
    p = mate;
  } else if (p.cl) { log(w, `${p.name} already wears a wolf's skin, so the pelt of ${nm} is hung on the wall of the house beside the hearth.`, 'info'); return; }
  p.cl = { nm, y: clock(w.t).year, by: p.name, n: 0 };
  C.n++;
  const first = !w.techs.includes('cloak'), He = pron(p)[0].toUpperCase() + pron(p).slice(1);
  if (first) w.techs.push('cloak');
  milestone(w, first
    ? `${p.name} scrapes the pelt of ${nm} clean, rubs it soft with ash and works it for days by the fire, then throws it over ${poss(p)} shoulders, the head hanging down ${poss(p)} back. ${He} wears it everywhere now. The wolves at the treeline smell one of their own on ${p.sex === 'f' ? 'her' : 'him'} and keep away. ${w.name} learns to make a wolf-skin cloak.`
    : `${p.name} works the pelt of ${nm} soft by the fire and wears it over ${poss(p)} shoulders from now on.`);
}
function cloakPass(w, p) {
  const c = p.cl;
  if (!c) return;
  const C = w.cloak || (w.cloak = { n: 0, h: 0, g: 0 });
  let heir = null;
  for (const o of w.people) {
    if (o.dead || o.cl || (o.mother !== p.id && o.father !== p.id) || ageY(w, o) < 14) continue;
    if (!heir || o.born < heir.born) heir = o;
  }
  if (!heir && p.partner != null) { const o = w.people.find((q) => q.id === p.partner && !q.dead && !q.cl); if (o) heir = o; }
  const yrs = clock(w.t).year - c.y;
  if (heir) {
    p.cl = null;
    heir.cl = { nm: c.nm, y: c.y, by: c.by, n: c.n + 1 };
    C.h++;
    const old = yrs >= 2 ? `, ${yrs} years after ${c.by} took it,` : '';
    milestone(w, `${heir.name} takes the wolf-skin cloak of ${c.nm} down from the peg where ${p.name} hung it every night${old} and wears it to the burying ground. ${c.n ? `It has passed through ${c.n + 2} pairs of hands now, and the fur is wearing thin at the shoulders.` : `The teeth of ${c.nm} still hang at the hood.`}`);
  } else {
    C.g++;
    log(w, `There is nobody to take the wolf-skin cloak of ${c.nm}, so ${p.name} is laid in the earth wrapped in it.`, 'info');
  }
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
  if (f && f.fence && (f.stage === 'planted' || f.stage === 'ripe')) {
    f.fence = undefined; F.broke = (F.broke || 0) + 1;
    if (!w.hedge && w.techs.includes('fencing')) F.br = (F.br || 0) + 1;
  } else if (f && hedged(w, f) && (f.stage === 'planted' || f.stage === 'ripe')) F.gap = (F.gap || 0) + 1; // the thorn springs back behind it
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
    if (hedged(w, f) && rnd(w) < HEDGE_HOLD) { w.fauna.turned = 1; w.hedge.k++; w.hedge.th = 1; return null; } // a wall of thorn
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
// ---------- the midsummer race ----------
// Before the feast the young run out from the bonfire to a hazel stake and back (w.fest.race for the day:
// d day, sx/sy start line, ex/ey stake, lx/ly lane step, rs [[id, share of the course run by 18:00]], win id, nm;
// w.fest.rn races run, w.fest.rl last winner {nm, y, a}). The positions are set by the hour, not walked.
const raceOn = (w, c) => !!(w.fest && w.fest.race && w.fest.race.d === c.day && c.hour >= RACE_FROM && c.hour < FEST_TO);
export const raceNow = (w, c) => !!(raceOn(w, c) && c.hour < RACE_FROM + 3);
const racer = (w, p, a) => !p.dead && !p.sick && !p.hurt && !p.cg && a >= RACE_MIN && a <= RACE_MAX && !(w.horn && w.horn.hid === p.id);
// the longest clear run of grass from the fire, in one of eight directions (no water, no buildings, no woods)
function raceCourse(w) {
  let best = null, bs = -1;
  for (const L of RACE_LEN) {
    for (let k = 0; k < 24; k += 3) {
      const [vx, vy] = RING[k];
      let sc = 0, ok = true;
      for (let q = 2; q <= L * 2 && ok; q++) {
        const x = Math.floor(w.fire.x + 0.5 + vx * q / 2), y = Math.floor(w.fire.y + 0.5 + vy * q / 2);
        const t = inMap(x, y) ? w.tiles[idx(x, y)] : T.WATER;
        if (t === T.WATER || t === T.BUILD || t === T.FOREST) ok = false;
        else sc += t === T.GRASS ? 2 : t === T.SAND ? 1 : 0;
      }
      if (ok && sc > bs) { bs = sc; best = { L, vx, vy }; }
    }
    if (best) return best;
  }
  return null;
}
function raceStart(w, c, fx) {
  const F = w.fest;
  const able = w.people.filter((p) => racer(w, p, ageY(w, p)));
  if (able.length < 3 || (!w.techs.includes('race') && !able.some((p) => ageY(w, p) < 16))) return; // the children start it
  const co = raceCourse(w);
  if (!co) return;
  const keen = (p) => Math.abs(ageY(w, p) - 17);
  const run = able.length > RACE_N ? able.slice().sort((a, b) => keen(a) - keen(b) || a.id - b.id).slice(0, RACE_N) : able;
  const sp = run.map((p) => {
    const a = ageY(w, p);
    const base = a < 12 ? 5 : a < 14 ? 6.5 : a < 16 ? 7.5 : a < 25 ? 8.5 : 7.5;
    const legs = (((p.id * 2654435761) >>> 0) % 3) * 0.6; // some are just born quick
    return [p.id, base + legs + rnd(w) * 4];
  });
  const top = Math.max(...sp.map((q) => q[1]));
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const fx0 = w.fire.x + 0.5, fy0 = w.fire.y + 0.5;
  F.race = {
    d: c.day, sx: r3(fx0 + co.vx * 1.6), sy: r3(fy0 + co.vy * 1.6), ex: r3(fx0 + co.vx * co.L), ey: r3(fy0 + co.vy * co.L),
    lx: r3(-co.vy * 0.45), ly: r3(co.vx * 0.45),
    rs: sp.map(([id, s]) => [id, r3(Math.max(0.55, s / top))]), win: null, nm: null,
  };
  if (fx) fx.push({ x: fx0, y: fy0 - 2, text: 'the race', color: 'food' });
}
// where a runner is at the end of hour h: lined up, out toward the stake, then back toward the fire
function racePos(R, i, h) {
  const r = R.rs[i][1], u = h <= RACE_FROM ? 0 : h === RACE_FROM + 1 ? r : Math.min(2, r * 2);
  const lane = i - (R.rs.length - 1) / 2;
  const f = u <= 1 ? u : 2 - u;
  return [Math.round((R.sx + (R.ex - R.sx) * f + R.lx * lane) * 1000) / 1000, Math.round((R.sy + (R.ey - R.sy) * f + R.ly * lane) * 1000) / 1000];
}
function raceEnd(w, c) {
  const F = w.fest, R = F.race;
  let best = null;
  for (const [id, r] of R.rs) { const p = aliveId(w, id); if (p && (!best || r > best[1])) best = [p, r]; }
  if (!best) return;
  const p = best[0], a = Math.floor(ageY(w, p)), first = !w.techs.includes('race');
  R.win = p.id; R.nm = p.name;
  F.rn = (F.rn || 0) + 1; F.rl = { nm: p.name, y: c.year, a };
  const big = R.rs.filter(([id]) => { const q = aliveId(w, id); return q && ageY(w, q) >= 16; }).length;
  const n = R.rs.length;
  if (first) {
    w.techs.push('race');
    const who = elder(w);
    milestone(w, `All summer the children of ${w.name} have been racing each other down to the beach and back. On midsummer evening ${who ? who.name : 'the eldest'} drives a hazel stake into the grass out past the bonfire and says that whoever slaps it and is back at the fire first will wear the oak wreath. ${n} line up, the whole village shouts, and ${p.name}, ${a}, comes in first. From now on the young run at every midsummer.`);
  } else if (a < 14 && big >= 2) log(w, `Midsummer race: ${p.name}, only ${a}, leaves ${big} grown runners behind at the stake and wears the oak wreath. The old ones shake their heads and laugh.`, 'good');
  else log(w, `Midsummer race: ${n} run out to the stake and back, and ${p.name} wears the oak wreath.`, 'good');
  deed(w, p, 'r');
}
function raceWed(w, F) {
  const p = F.race && F.race.win != null ? aliveId(w, F.race.win) : null;
  if (!p || p.partner != null || ageY(w, p) < 17 || rnd(w) >= RACE_PAIR) return;
  const f = p.sex === 'f' ? p : w.people.find((o) => !o.dead && o.sex === 'f' && o.partner == null && ageY(w, o) >= 17 && matches(w, o, p));
  const m = p.sex === 'f' ? mate(w, p) : p;
  if (!f || !m) return;
  f.partner = m.id; m.partner = f.id; f.wants = true;
  F.pairs.push(`${f.name} and ${m.name}`);
  log(w, `${p.name}, still in the oak wreath, is pledged to ${p === f ? m.name : f.name} in the firelight.`, 'love');
}
function midsummer(w, c, fx) {
  const F = w.fest, h = c.hour, pop = w.people.length;
  if (h === RACE_FROM) raceStart(w, c, fx);
  else if (h === RACE_FROM + 3 && F.race && F.race.d === c.day) raceEnd(w, c);
  if (h === ISLE_SAIL) boatComes(w, c); // on the far isle they know the day, and the smoke of the fire-building
  if (h === FEST_FROM) {
    F.k = 0; F.pairs = [];
    F.mead = meadPoured(w, pop);
    F.ale = alePoured(w, pop, ALE_FEST);
    F.wood = Math.min(FEST_WOOD, Math.floor(w.timber / 4));
    w.timber = Math.round((w.timber - F.wood) * 100) / 100;
    if (fx) fx.push({ x: w.fire.x + 0.5, y: w.fire.y - 1, text: 'midsummer', color: 'food' });
  } else if (h === 19) { // after the plain supper, a feast from what the stores can spare
    F.feast = Math.max(0, Math.min(pop * FEST_FEAST, Math.floor(w.food - pop * 60)));
    w.food = Math.round((w.food - F.feast) * 100) / 100;
    if (F.feast >= pop) for (const p of w.people) p.hunger = 0;
  } else if (h === 21) { // late in the dance, the unpaired find each other
    if (w.quarrel && w.quarrel.cur) quarrelMend(w, c, 'fest', !!F.mead); // a feud ended first, so its houses can dance together
    if (F.race && F.race.d === c.day) raceWed(w, F); // the wreath first
    for (const f of w.people) {
      if (f.dead || f.sex !== 'f' || f.partner != null || ageY(w, f) < 17 || rnd(w) >= (F.mead ? MEAD_PAIR : FEST_PAIR)) continue;
      const m = mate(w, f);
      if (!m) continue;
      f.partner = m.id; m.partner = f.id; f.wants = true;
      F.pairs.push(`${f.name} and ${m.name}`);
    }
    if (w.isle && w.isle.boat) isleWed(w);
    if (w.isle && w.isle.boat && w.quarrel && w.quarrel.cur) loveBoat(w);
  } else if (h === 22) {
    F.n = (F.n || 0) + 1;
    const feast = F.feast >= pop ? ' and feast on the best of the stores' : F.feast > 0 ? ' and share what the stores can spare' : ' on empty stomachs';
    const fire = F.wood >= 6 ? 'a towering bonfire' : F.wood > 0 ? 'a small bonfire' : 'the hearth, with no wood to spare for more';
    let text = `${F.wait ? `After ${plural(F.wait, 'day', 'days')} of waiting for the sky to clear, midsummer` : 'Midsummer'} on ${w.name}: ${pop} ${pop === 1 ? 'soul dances' : 'people dance'} around ${fire}${feast}${F.mead && F.ale ? ', and the mead and the ale go round' : F.mead ? ', and the mead goes round' : F.ale ? ', and the ale jugs go round' : ''}.`;
    if (F.mead && w.bees.m === 1) {
      const by = w.people.find((q) => q.name === w.bees.nm) || elder(w);
      milestone(w, `Last summer's honey has stood all year in ${w.pot ? 'a sealed jar' : 'a covered tub'} with water from the spring, and it has turned. ${by ? by.name : 'Somebody'} lifts the lid at midsummer and the smell fills the hearth: sweet, sharp and strong. A bowl goes from hand to hand round the bonfire, and the dancing gets louder and later than it has ever been. ${w.name} has mead.`);
    }
    const P = F.pairs;
    if (P.length === 1) text += ` ${P[0]} are pledged in the firelight.`;
    else if (P.length > 1) text += ` ${P.length} couples are pledged in the firelight: ${P.slice(0, 3).join(', ')}${P.length > 3 ? ' and more' : ''}.`;
    if (w.isle && w.isle.boat) text += isleFeast(w);
    if (F.n === 1) milestone(w, `${text} The first midsummer fire on ${w.name} burns until nearly midnight.`);
    else if (F.n % 25 === 0) milestone(w, `${text} It is the ${F.n}th midsummer kept on ${w.name}.`);
    else log(w, text, P.length ? 'love' : 'good');
    delete F.pairs; delete F.feast; delete F.wood; delete F.wait; delete F.mead; delete F.ale;
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
    if (w.quarrel && w.quarrel.cur) quarrelMend(w, c, 'tale', false);
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
      Math.abs(ageY(w, o) - g.a) < 14 && alone(w, o) && !inLove(w, o));
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
  if (w.quarrel && w.quarrel.el) loveBack(w, B);
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
  if (B.el) loveGone(w, B);
  if (pop >= ISLE_CROWD) {
    const p = w.people.find((o) => !o.dead && o.partner == null && !o.sick && !o.hurt && ageY(w, o) >= 17 && ageY(w, o) <= 30 && alone(w, o) && !inLove(w, o) &&
      !(w.heal && w.heal.id === o.id) && !(w.horn && w.horn.hid === o.id) && !(w.goats && w.goats.hid === o.id) && !(w.lost && w.lost.cur && w.lost.cur.id === o.id) &&
      !w.people.some((k) => !k.dead && (k.mother === o.id || k.father === o.id) && ageY(w, k) < 14));
    if (p && rnd(w) < ISLE_LEAVE) {
      rollCall(w, { id: p.id, n: p.name, x: p.sex, b: p.born, d: w.t, why: 'sailed away to the far isle', m: p.mother, f: p.father, pt: null, by: byname(p) });
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
        g.tx = Math.round(((g.tx + w.fire.x + 0.5) / 2) * 1000) / 1000; g.ty = Math.round(((g.ty + w.fire.y + 0.5) / 2 + 0.6) * 1000) / 1000; g.r = undefined;
      }
      g.k = moveToward(g, g.tx, g.ty, GUEST_SPEED) ?(fest ? 'fest' : c.day === B.d && h < FEST_FROM ? 'wait' : 'sleep') : 'walk';
    }
  } else if (moveToward(B, B.sx + 0.5, B.sy + 0.5, BOAT_SPEED)) w.isle.boat = null;
  else for (const g of B.gs) { g.x = B.x; g.y = B.y; }
}

// ---------- incomers ----------
// The far isle is small and stony. Some springs a household there has nothing left to stay for: a thin year, a house
// burnt in the winter, a man lost at sea, a match the girl's father will not allow. Once the far isle knows Hais well,
// such a household may load its dugout and come over by day, in the hungry gap between the snow and the sowing.
// A rich, half-empty island takes them in; they sleep where there is room until a house is raised for them, and
// the dugout they came in is broken up for its roof-beams.
// w.inc: n households taken in, p people ever, y year the last came, on day one is due, cur the boat
// {bx, by, lx, ly, sx, sy, x, y, px, py, st 'in'|'beached', gs [{nm, sex, a, r role 'm'|'f'|'c'}], k kind, why, d, ids},
// last {nm, n, y}. p.fi is the year an islander came over.
const INC_FROM = 6;          // not before this year
const INC_VISITS = 2;        // and not before the far isle has been to midsummer this often
const INC_ODDS = 0.3;        // chance each spring that a household makes up its mind (x INC_LEAN in a thin year there)
const INC_LEAN = 2;
const INC_GAP = 3;           // years between households
const INC_FOOD = 160;       // grain in store per head before the eldest says there is room
const INC_POP = 70;          // a crowded island has no room, and its own young are leaving
const INC_DAY = 12;          // the first day of spring they might set out, and the window after it
const INC_WIN = 45;
const INC_SAIL = 9;          // hour the boat comes into sight
const INC_WOOD = 10;         // timber the broken-up dugout gives
const INC_BEACHED = 3;       // days it lies on the sand first
export const incBoat = (w) => (w.inc && w.inc.cur) || null;
function incDay(w, c) {
  const I = w.inc;
  if (I && I.cur && I.cur.st === 'beached' && c.day >= I.cur.d + INC_BEACHED) { // the dugout is broken up for roof-beams
    w.timber = Math.round((w.timber + INC_WOOD) * 100) / 100;
    log(w, `The dugout ${I.cur.nm} came over in is dragged up the beach and broken up. Its sides will be roof-beams.`, 'info');
    I.cur = null;
  }
  if (c.doy !== INC_DAY || !w.isle || w.isle.n < INC_VISITS || c.year < INC_FROM) return;
  if (I && (I.cur || c.year - I.y < INC_GAP)) return;
  if (w.isle.feud >= c.year || w.people.length >= INC_POP || w.food < w.people.length * INC_FOOD) return;
  const lean = !!(w.raid && w.raid.lean === c.year - 1); // the thin year was last year; this is the hungry spring after it
  if (rnd(w) >= INC_ODDS * (lean ? INC_LEAN : 1)) return;
  w.inc ||= { n: 0, p: 0, y: 0, on: null, cur: null, last: null };
  w.inc.on = c.day + 1 + ri(w, INC_WIN);
  w.inc.lean = lean ? 1 : 0;
}
// hour by hour on the day: the boat comes in, and the household walks up the beach
function incHour(w, c) {
  const I = w.inc, h = c.hour;
  if (!I.cur) {
    if (h !== INC_SAIL) return;
    const wx = w.wx ? w.wx.k : 'clear';
    if (wx === 'storm' || wx === 'fog' || wx === 'snow') { I.on = c.day + 1; return; } // nobody crosses in that; they wait for a better day
    I.on = null;
    if (w.food < w.people.length * INC_FOOD * 0.6 || w.people.length >= INC_POP) return; // a bad spring here after all: they turn back unseen
    const L = landing(w);
    if (!L) return;
    incSail(w, c, L);
    return;
  }
  const B = I.cur;
  if (B.st !== 'in') return;
  B.px = B.x; B.py = B.y;
  if (moveToward(B, B.lx + 0.5, B.ly + 0.5, BOAT_SPEED)) incLand(w, c, B);
}
function incSail(w, c, L) {
  const kinds = [['house', 50], ['pair', 25], ['widow', 25]];
  let r = rnd(w) * 100, k = 'house';
  for (const [kk, n] of kinds) { if (r < n) { k = kk; break; } r -= n; }
  const gs = [];
  const fa = 20 + ri(w, 14);
  gs.push({ nm: makeName(w), sex: 'f', a: k === 'pair' ? 17 + ri(w, 5) : fa, r: 'f' });
  if (k !== 'widow') gs.push({ nm: makeName(w), sex: 'm', a: Math.max(18, gs[0].a - 2 + ri(w, 7)), r: 'm' });
  if (k !== 'pair') {
    const n = k === 'widow' ? 2 + ri(w, 2) : 1 + ri(w, 3);
    let age = ri(w, 3);
    for (let i = 0; i < n && age < gs[0].a - 16; i++) { gs.push({ nm: makeName(w), sex: rnd(w) < 0.5 ? 'f' : 'm', a: age, r: 'c' }); age += 2 + ri(w, 3); }
  }
  const mum = gs[0].nm, dad = gs[1] && gs[1].r === 'm' ? gs[1].nm : null;
  const why = k === 'pair' ? `${mum}'s father on the far isle would not have ${dad} for her, and the two of them took the old man's boat in the night`
    : k === 'widow' ? `${mum}'s man was lost at sea in the autumn, and the house she was left in is not hers`
      : I_WHY[w.inc.lean ? 0 : 1 + ri(w, I_WHY.length - 1)](mum, dad);
  w.inc.cur = { ...L, x: L.sx + 0.5, y: L.sy + 0.5, px: L.sx + 0.5, py: L.sy + 0.5, st: 'in', gs, k, why, d: c.day, nm: mum, ids: [] };
}
const I_WHY = [
  (m, d) => `the far isle had a thin year, and by the end of winter ${d}'s house had eaten its seed grain`,
  (m, d) => `${m} and ${d}'s house burnt down in the winter with everything in it`,
  (m, d) => `there is no more ground to clear on the far isle, and ${d} is a fourth son`,
  (m, d) => `${d} fell out with his brothers over their father's fields, and will not live beside them`,
];
function incLand(w, c, B) {
  const I = w.inc;
  B.st = 'beached'; B.d = c.day; B.px = B.x; B.py = B.y;
  let mum = null, dad = null;
  for (const g of B.gs) {
    const q = addPerson(w, g.sex, g.a, g.r === 'c' && mum ? mum.id : null, g.r === 'c' && dad ? dad.id : null, null);
    q.name = g.nm; q.x = q.px = B.bx + 0.5; q.y = q.py = B.by + 0.5; q.fi = c.year;
    if (g.r === 'f') mum = q;
    else if (g.r === 'm') dad = q;
    if (g.r !== 'c') q.cgi = 1; // they had the cough as children over there
    B.ids.push(q.id);
  }
  if (mum && dad) { mum.partner = dad.id; dad.partner = mum.id; mum.wants = true; }
  else if (mum) mum.wants = true;
  I.n++; I.p += B.gs.length; I.y = c.year;
  I.last = { nm: B.nm, n: B.gs.length, y: c.year };
  const kids = B.gs.filter((g) => g.r === 'c'), N = B.gs.length;
  const who = kids.length ? `${B.gs.filter((g) => g.r !== 'c').map((g) => g.nm).join(' and ')} with ${kids.length === 1 ? (kids[0].a < 2 ? 'a baby' : 'a child') : `${kids.length} children`}` : `${B.gs[0].nm} and ${B.gs[1].nm}, hardly grown`;
  B.gs = [];
  const el = elder(w), en = el ? el.name : 'The eldest';
  if (!w.techs.includes('incomers')) {
    w.techs.push('incomers');
    milestone(w, `In broad day a dugout comes in over the sea from the far isle, low in the water with bundles and a pot of embers, and ${N} people climb out onto the sand: ${who}. They have not come for a dance. ${Cap(B.why)}. ` +
      `${en} walks down to meet them, looks back at the full granaries and the empty ground beyond the fields, and says there is room on ${w.name}. They sleep where there is space until a house is raised for them. For the first time since the landing, ${w.name} has taken in new people.`);
  } else log(w, `A dugout from the far isle runs up on the beach by day: ${who}. ${Cap(B.why)}. ${en} says there is room, and they stay.`, 'good');
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
  if (wx !== 'fog' && !moonDark(c.day)) return; // under a bright moon a boat is seen a mile off
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
  if (w.vigil && w.vigil.cur && w.vigil.cur.on.some((o) => o.id === p.id)) return false; // out at the stones tonight
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
  if (w.moon && wx !== 'fog' && !moonDark(c.day)) { w.moon.s++; return; } // a bright moon keeps the watch: everyone sleeps
  const can = w.people.filter((p) => p.id !== W.last && watchable(w, p));
  if (!can.length) return;
  can.sort((a, b) => a.id - b.id);
  const p = can[W.k % can.length];
  W.k = (W.k + 1) % 9973;
  W.x = L.bx; W.y = L.by; W.hid = p.id; W.n++;
  w.timber = Math.round((w.timber - WATCH_WOOD) * 100) / 100;
}
// ---------- moon lore ----------
// Twenty nights and more at the beach fire, and the watchers see what the far isle has always known: a dugout
// only comes in under a dark moon, or a fog. From the next full moon the beach fire is lit only on dark or
// foggy nights. w.moon: s bright nights the watch was let off, nm who saw it, at when.
function learnMoon(w, c) {
  const who = aliveId(w, w.watch.hid) || elder(w);
  if (!who) return;
  w.techs.push('moon');
  w.moon = { s: 0, nm: who.name, at: w.t };
  const n = w.watch.n, by = w.raid ? w.raid.n + w.watch.s : 0;
  milestone(w, `${who.name} sits up by the beach fire under a moon as round as a jar lid, after ${n} nights of watching, and the sea lies bright and empty all the way to the far isle. ` +
    `Counting back on ${poss(who)} fingers, ${pron(who)} sees it: ${by === 2 ? 'both boats' : by > 2 ? `all ${by} boats` : 'the boats'} came in the dark of the moon, or under a fog. ` +
    `${who.name} cuts a notch in the granary doorpost for this night and says they will cut one for every night after, and light the beach fire only when the moon is thin. ${w.name} learns to count the moon.`);
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
// Within one villagers' hour a field only stops needing a fence or a hedge (one is put up, or claimed),
// except when a g/q claim is given up (release() counts those in cache.rel) or a tile changes (exposed() is
// relisted). So once a search finds nothing, the next worker that hour gets the same answer without one.
function noneYet(w, cc, tag) {
  const k = cc[tag];
  return !!k && k.t === w.t && k.rel === cc.rel && k.ex === cc.ex;
}
function noneFound(w, cc, tag) { cc[tag] = { t: w.t, rel: cc.rel, ex: cc.ex }; }
function fenceTask(w, p, c) {
  if (c.season === 3 || w.timber < FENCE_COST + HOUSE_COST || !w.techs.includes('fencing')) return null;
  const ex = exposed(w), cc = cacheOf(w);
  if (noneYet(w, cc, 'fenceNone')) return null;
  const f = nearest(ex, p, (o) => !o.fence && !hedged(w, o) && w.res['g' + o.id] == null);
  if (!f) { noneFound(w, cc, 'fenceNone'); return null; }
  return { k: 'fence', key: 'g' + f.id, x: f.x, y: f.y, h: FENCE_WORK };
}

// ---------- hedges ----------
// w.hedge { n slips set ever (one field edge each), y set this year, k boars turned by grown thorn,
// nm who first thought of it, at tick, held first night a grown hedge held, th turned tonight };
// f.hg = tick the field's hedge was set. w.fauna.br counts fences broken before anyone thought of thorn.
export const hedged = (w, f) => f.hg != null && w.t - f.hg >= HEDGE_GROW;
function learnHedges(w, c) {
  const who = elder(w);
  w.hedge = { n: 0, y: 0, k: 0, nm: who ? who.name : null, at: w.t };
  w.techs.push('hedges');
  const P = who ? pron(who) : 'they', Pc = P[0].toUpperCase() + P.slice(1);
  milestone(w, who
    ? `Five times since the fences went up a boar has shouldered through the wattle, and ${who.name} is tired of mending it. ${Pc} walks along the wood's edge and points at the thickets of hawthorn there: not one boar track goes through them. This ${c.season >= 2 ? 'winter' : 'autumn'}, ${P} says, slips of thorn will be dug from the woods and set along every field by the trees. For three summers they will be nothing but twigs, but then they will be a wall no boar can push through, and a hedge does not rot. ${w.name} learns to plant hedges.`
    : `The islanders dig slips of hawthorn from the wood's edge to grow a wall of thorn around the fields. ${w.name} learns to plant hedges.`);
}
function hedgeTask(w, p, c) {
  if (!w.hedge || c.season < 2) return null; // slips are set while the thorn sleeps, from the harvest to the end of winter
  const wx = w.wx ? w.wx.k : 'clear';
  if (wx === 'snow' || wx === 'storm' || wx === 'cold' || wx === 'fog') return null;
  const ex = exposed(w), cc = cacheOf(w);
  if (noneYet(w, cc, 'hedgeNone')) return null;
  const f = nearest(ex, p, (o) => o.hg == null && w.res['q' + o.id] == null);
  if (!f) { noneFound(w, cc, 'hedgeNone'); return null; }
  return { k: 'hedge', key: 'q' + f.id, x: f.x, y: f.y, h: HEDGE_WORK };
}

// ---------- muck ----------
// w.muck { h heap, n fields mucked ever, y this year, g extra grain ever, yg this year, nm who saw it, at tick };
// f.mk = 1 on a field mucked since its last harvest. The heap sits outside the pen; render draws it from h.
// Learned at the harvest of a field near the pen, once goats have been kept MUCK_YEARS.
function learnMuck(w, p, f) {
  const G = w.goats, h = aliveId(w, G.hid), who = h && ageY(w, h) >= 14 ? h : p; // a grown herder knows the pen best
  w.muck = { h: Math.min(MUCK_FIELD * MUCK_CAP, G.herd.length * 60), n: 0, y: 0, g: 0, yg: 0, nm: who.name, at: w.t };
  w.techs.push('muck');
  const P = pron(who), Pc = P[0].toUpperCase() + P.slice(1);
  milestone(w, `${p.name} straightens up from the sheaves and looks back along the rows. The grain on the side by the goat pen, where the dung has been forked out over the wattle for ${G.herd.length > 8 ? 'years' : 'two summers'}, stands a head taller than the rest, the ears fat and heavy. ${who === p ? Pc : who.name} says the muck should not be wasted on a corner. From now on it goes on a heap by the pen with the hearth ash and the scraps, and after the harvest it is carried out in baskets and forked over the bare fields. ${w.name} learns to muck its fields.`);
}
function muckDay(w) {
  const M = w.muck, n = w.goats ? w.goats.herd.length : 0;
  M.h = Math.min(MUCK_FIELD * MUCK_CAP, Math.round((M.h + n * MUCK_GOAT + w.people.length * MUCK_HOME) * 10) / 10);
}
// fields a year of muck can cover, counted as yield when the village decides whether it needs more fields
function muckCover(w) {
  if (!w.muck) return 0;
  const n = w.goats ? w.goats.herd.length : 0;
  return Math.min(w.fields.length, Math.floor(((n * MUCK_GOAT + w.people.length * MUCK_HOME) * DAYS_PER_YEAR) / MUCK_FIELD));
}
function muckTask(w, p) {
  const M = w.muck;
  if (!M || M.h < MUCK_FIELD || !w.goats) return null;
  const wx = w.wx ? w.wx.k : 'clear';
  if (wx === 'snow' || wx === 'storm') return null;
  const cc = cacheOf(w);
  if (cc.muckNone === w.t) return null; // nothing bare and unmucked this hour: don't search again
  const f = nearest(w.fields, penMid(w.goats), (o) => !o.mk && (o.stage === 'harvested' || o.stage === 'fallow') && o.fr == null && o.sa == null && w.res['m' + o.id] == null);
  if (!f) { cc.muckNone = w.t; return null; }
  M.h = Math.round((M.h - MUCK_FIELD) * 10) / 10; // the basket is filled at the heap; spilt if the work is broken off
  return { k: 'muck', key: 'm' + f.id, x: f.x, y: f.y, h: MUCK_WORK };
}
function muckDone(w, p, t, pop) {
  const f = w.fields.find((o) => 'm' + o.id === t.key);
  if (!f || f.mk || !w.muck) return;
  f.mk = 1; w.muck.n++; w.muck.y++;
  pop('mucked', 'muted');
  if (w.muck.n === 1) log(w, `${p.name} forks the first basket of muck over a bare field by the pen. It steams in the cold air.`, 'good');
  else if (w.muck.n === 50 || w.muck.n === 250 || w.muck.n === 1000) log(w, `${w.muck.n} fields have been mucked from the heap by the pen.`, 'good');
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
  for (const b of w.beasts) if (b.k === 'wolf') wolves++; else if (b.k === 'deer') deer++; else if (b.k === 'boar') boars++;
  const L = loneOut(w) && w.lone.cur;
  if (L && L.at && (L.g || L.b || L.k)) return 'lone'; // once it has drawn blood, every hunt goes after the lone wolf
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
  const at = q === 'lone' ? w.lone.cur.at : q === 'wolf' ? F.den : q === 'deer' ? F.mead : F.lair;
  if (d2(at.x, at.y, w.fire.x, w.fire.y) > HUNT_REACH || !inDaylight(w, p, c, at.x, at.y) || !lineOfLand(w, p.x, p.y, at.x + 0.5, at.y + 0.5)) return null;
  F.hunt = w.t + HUNT_GAP * TICKS_PER_DAY;
  return { k: 'hunt', key: 'h0', x: at.x, y: at.y, h: HUNT_WORK, q };
}
// the leader's hours at the lair are up: the beast is taken, gets away, or fights back
function strike(w, p, t) {
  const F = w.fauna, q = t.q;
  if (q === 'lone') return loneHunt(w, p);
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
    if (p.imm && p.imm <= w.t) p.imm = undefined;
    if (p.sick && p.sick <= w.t) { p.sick = undefined; p.imm = w.t + FEVER_IMMUNE * TICKS_PER_YEAR; continue; }
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

// ---------- whooping cough ----------
// A children's cough. Every settler and newcomer had it as a child somewhere else, and nobody takes it twice
// (p.cgi), so it can only take hold once enough children have been born on the island who never had it. Then a
// child wakes coughing in the cold half of the year and within weeks nearly every one of them is whooping: it
// passes in the house and wherever the children play together. A coughing child is kept by the door (p.cg is the
// tick it ends); a parent stays home with a coughing child under COUGH_NURSE (w.cough.nu, set each morning).
// It is the babies it kills. Nobody on the island has an answer to it yet.
// w.cough { k outbreaks, n cases this one, d dead this one, all, lost, y/yd this year, end tick the last ended, who, nu }
const COUGH_DAYS = 20;      // coughing for 20-34 days
const COUGH_OPEN = 7;       // children who never had it before it can take hold
const COUGH_SEED = 0.012;   // daily chance it takes hold then, autumn to spring
const COUGH_GAP = 4;        // years at least between outbreaks
const COUGH_FROM = 3;       // not before this year
const COUGH_HOUSE = 0.1;    // daily chance per coughing housemate
const COUGH_PLAY = 0.3;     // daily chance x share of the children coughing
const COUGH_GROWN = 0.3;    // an island-born grown-up who never had it catches it this much less often (and it never kills them)
const COUGH_RISK = [0.007, 0.003, 0.0014, 0.0007, 0.0003, 0.0002]; // daily risk of dying by age in years; 6-13: COUGH_RISK_BIG
const COUGH_RISK_BIG = 0.0001;
const COUGH_NURSE = 4;
export const coughOpen = (w, p, a) => !p.dead && !p.cg && !p.cgi && (a < 14 || p.mother != null);
export const coughKept = (w, p) => !!(p.cg && ageY(w, p) < 14) || !!(w.cough && w.cough.nu.length && w.cough.nu.includes(p.id));
function coughs(w, p, fx) {
  const C = w.cough;
  p.cg = w.t + (COUGH_DAYS + ri(w, 15)) * TICKS_PER_DAY;
  C.n++; C.all++; C.y++;
  if (fx) fx.push({ x: p.x, y: p.y - 0.5, text: 'cough', color: 'sick' });
}
function coughDay(w, c, fx) {
  let C = w.cough, sick = 0, small = 0, kids = 0;
  if (C) C.nu = [];
  for (const p of w.people) {
    if (p.dead) continue;
    const a = ageY(w, p);
    if (a < 14) kids++;
    if (!p.cg) continue;
    if (p.cg <= w.t) { p.cg = undefined; p.cgi = 1; continue; }
    let risk = a < COUGH_RISK.length ? COUGH_RISK[Math.floor(a)] : a < 14 ? COUGH_RISK_BIG : 0;
    if (p.hunger > 4) risk *= 2;
    if (w.stats.cold) risk *= 1.5;
    if (risk && rnd(w) < risk) { C.d++; C.lost++; C.yd++; die(w, p, 'died of the whooping cough'); continue; }
    sick++;
    if (a < 14) small++;
    if (a < COUGH_NURSE) { // the mother sits at home with it, or the father if she is gone
      const m = aliveId(w, p.mother), f = aliveId(w, p.father);
      const q = m && !m.sick && ageY(w, m) >= 14 ? m : f && !f.sick && ageY(w, f) >= 14 ? f : null;
      if (q && !C.nu.includes(q.id)) C.nu.push(q.id);
    }
  }
  if (C && !sick && C.n) { // the last child is breathing easy again
    const text = C.d
      ? `The whooping cough leaves ${w.name}. ${plural(C.n, 'islander', 'islanders')} coughed through it, and ${C.d === 1 ? 'one of the smallest' : `${C.d} of the smallest`} did not live.`
      : `The whooping cough leaves ${w.name}. ${plural(C.n, 'islander', 'islanders')} coughed through it, and every one of them is still here.`;
    if (C.k === 1 || C.d >= 2) milestone(w, text); else log(w, text, C.d ? 'bad' : 'good');
    C.n = C.d = 0; C.end = w.t; C.who = null;
  }
  if (sick) { // it passes in the house, and wherever the children play together
    const at = new Map();
    for (const p of w.people) if (p.cg && !p.dead && p.home != null) at.set(p.home, (at.get(p.home) || 0) + 1);
    const k = c.season === 3 ? 1.3 : c.season === 1 ? 0.7 : 1;
    const play = (COUGH_PLAY * small) / Math.max(6, kids);
    const caught = [];
    for (const p of w.people) {
      const a = ageY(w, p);
      if (!coughOpen(w, p, a)) continue;
      const h = p.home != null ? at.get(p.home) || 0 : 0;
      if (rnd(w) < Math.min(0.5, (h * COUGH_HOUSE + play) * k * (a < 14 ? 1 : COUGH_GROWN))) caught.push(p);
    }
    for (const p of caught) coughs(w, p, fx);
    return;
  }
  // it takes hold in the cold months, once enough children have never had it
  if (c.year < COUGH_FROM || c.season === 1 || (C && C.end != null && w.t - C.end < COUGH_GAP * TICKS_PER_YEAR)) return;
  const open = w.people.filter((p) => ageY(w, p) < 14 && coughOpen(w, p, ageY(w, p)));
  if (open.length < COUGH_OPEN || rnd(w) >= COUGH_SEED) return;
  const p = open[ri(w, open.length)];
  const first = !C;
  if (first) { C = w.cough = { k: 0, n: 0, d: 0, all: 0, lost: 0, y: 0, yd: 0, end: null, who: null, nu: [] }; if (!w.techs.includes('cough')) w.techs.push('cough'); }
  C.k++; C.who = p.name;
  coughs(w, p, fx);
  const he = pron(p), his = poss(p);
  if (first) milestone(w, `In the dark before dawn ${p.name} wakes coughing: a hard dry cough that comes in long fits until ${he} cannot get a breath, and then a great whooping gasp as the air goes back in. The grown-ups look at each other over ${his} head. Every one of the settlers had this as a child, far away over the sea, and remembers it; none of the ${open.length} children born on ${w.name} ever has. Nobody knows anything to do for it but keep the little ones warm and sit up with them through the night.`);
  else log(w, `The whooping cough is back on ${w.name}. ${p.name} wakes in the night whooping, and ${open.length} children here have never had it.`, 'bad');
}

// ---------- quarrels ----------
// Once the village is big enough, two neighbouring households fall out over something small (goats in the grain,
// the race, missing comb, a dog, a woodpile) and stop speaking. While it lasts nobody from one house is married to
// anyone from the other, there are spats now and then, and sometimes blows: the one who comes off worse is laid up
// for a few days. It ends at a gathering (midsummer or the longest night) when the eldest makes the two heads drink
// from one bowl, or at a graveside when one of them dies. The first time the bowl works, the island keeps the custom
// (the peace cup), and later quarrels end sooner and come to blows less.
// w.quarrel { k quarrels, cur, end tick the last ended, y spats this year, yf fights this year, f fights ever,
//   m mended over the bowl, br [ids laid up after a fight], cup tick the peace cup was first shared or null }
// cur { a, b house ids, ai, bi, an, bn the two heads, d day it began, why, n spats, f fights }
const QUARREL_FROM = 6;      // not before this year
const QUARREL_POP = 18;      // people on the island before households have neighbours enough to fall out with
const QUARREL_GAP = 3;       // years at least between one quarrel ending and the next
const QUARREL_SEED = 0.003;  // daily chance, x houses / 8 (at most x3)
const QUARREL_SPAT = 0.04;   // daily chance of a spat while it lasts
const QUARREL_BLOWS = 0.3;   // chance a spat comes to blows (half that once the peace cup is kept)
const QUARREL_HURT = 3;      // days laid up after coming off worse (3-5)
const QUARREL_MIN = 45;      // days before anyone will try to end it
const QUARREL_MEND = 0.35;   // chance the eldest ends it at a gathering
const QUARREL_MEAD = 0.25;   // more with mead in the bowl
const QUARREL_CUP = 0.85;    // once the peace cup is the custom
const QUARREL_LONG = 2;      // years before both sides are sick of it and it ends at the next gathering
const SPATS = [
  (a, b) => `${a} and ${b} meet on the path to the fields and neither will step aside. They stand there glaring until the people behind them have to go round through the grain.`,
  (a, b) => `Somebody has kicked over ${b}'s woodpile in the night. Nobody asks ${a}'s house about it, but everybody thinks it.`,
  (a, b) => `At the hearth ${a} gets up and moves to the far side as soon as ${b} sits down.`,
  (a, b) => `The children of ${a}'s house throw clods at the children of ${b}'s, and nobody stops them.`,
  (a, b) => `${b} says something about ${a} at the spring, loud enough to be heard.`,
  (a, b) => `${a} will not lend ${b} an axe, though ${b}'s has a cracked haft.`,
];
const quarrelOf = (w) => (w.quarrel && w.quarrel.cur) || null;
export const quarrelHouses = (w) => { const C = quarrelOf(w); return C ? [C.a, C.b] : null; };
export const quarrelBruised = (w, p) => !!(p.hurt && w.quarrel && w.quarrel.br.includes(p.id));
// is this pair kept apart by the quarrel?
const apart = (w, f, o) => { const C = quarrelOf(w); return !!C && f.home != null && o.home != null && ((f.home === C.a && o.home === C.b) || (f.home === C.b && o.home === C.a)); };
function houseHead(w, id) {
  let best = null;
  for (const p of w.people) if (!p.dead && p.home === id && ageY(w, p) >= 18 && (!best || p.born < best.born || (p.born === best.born && p.id < best.id))) best = p;
  return best;
}
function quarrelDay(w, c, fx) {
  const Q = w.quarrel;
  if (Q && Q.br.length) Q.br = Q.br.filter((id) => { const p = aliveId(w, id); return p && p.hurt; });
  if (Q && Q.pr) lovePromise(w);
  const C = Q && Q.cur;
  if (C) {
    const a = aliveId(w, C.ai), b = aliveId(w, C.bi);
    if (!a || !b) return quarrelGrave(w, a || b, C);
    if (a.home !== C.a || b.home !== C.b) { quarrelOver(w); return log(w, `${C.an} and ${C.bn} no longer live next door to each other, and the quarrel between their houses goes cold.`, 'info'); }
    if (rnd(w) < QUARREL_SPAT) quarrelSpat(w, c, C, a, b, fx);
    loveDay(w, c, C, fx);
    return;
  }
  const homes = quarrelHomes(w, c);
  if (!homes || rnd(w) >= QUARREL_SEED * Math.min(3, homes.length / 8)) return;
  quarrelBegin(w, c, homes, fx);
}
// the households that could fall out now, or null if it is too soon (or too few) for a new quarrel
function quarrelHomes(w, c) {
  const Q = w.quarrel;
  if ((Q && Q.cur) || c.year < QUARREL_FROM || w.people.length < QUARREL_POP || (Q && Q.end != null && w.t - Q.end < QUARREL_GAP * TICKS_PER_YEAR)) return null;
  const homes = w.buildings.filter((b) => isHouse(b) && b.progress >= 1 && occupants(w, b.id) >= 2 && houseHead(w, b.id));
  return homes.length >= 3 ? homes : null;
}
function quarrelBegin(w, c, homes, fx, ale) {
  const lov = !ale && rnd(w) < LOVE_CAUSE ? loveCause(w, homes) : null; // a girl caught with a lad her father will not have
  let A = lov ? lov.A : homes[ri(w, homes.length)], B = lov ? lov.B : null, bd = Infinity; // or they fall out with the people next door
  if (!B) for (const o of homes) if (o !== A) { const d = d2(A.x, A.y, o.x, o.y); if (d < bd) { bd = d; B = o; } }
  const a = houseHead(w, A.id), b = houseHead(w, B.id);
  const young = (id, not) => { let best = null; for (const p of w.people) if (!p.dead && p.home === id && p !== not && ageY(w, p) >= 6 && ageY(w, p) < 25 && (!best || p.id < best.id)) best = p; return best; };
  const ay = young(A.id, a), by = young(B.id, b);
  const RL = w.fest && w.fest.rl, racer = RL && RL.y >= c.year - 1 && w.people.find((p) => !p.dead && p.name === RL.nm && p.home === A.id);
  const why = [['word', `${a.name} and ${b.name} fall out over where one woodpile ends and the other begins, and then over everything else.`]];
  if (w.goats && w.goats.herd.length) why.push(['goats', `${ay ? ay.name : 'Somebody'} of ${a.name}'s house leaves a gap in the pen wattle, and by the time anyone sees, the goats have eaten a strip of young grain to the ground beside ${b.name}'s door. ${b.name} says it was done on purpose. ${a.name} says a goat is a goat.`]);
  if (racer && by && racer !== by) why.push(['race', `${by.name} of ${b.name}'s house still swears that ${racer.name} tripped ${by.sex === 'f' ? 'her' : 'him'} at the hazel stake. Words at the spring turn into shouting, and ${a.name} and ${b.name} each take their own child's side.`]);
  if (w.bees && ay) why.push(['honey', `Comb has gone from the bee log, and ${b.name} says ${ay.name} of ${a.name}'s house was seen with sticky hands. ${a.name} calls ${b.name} a liar in front of the whole hearth.`]);
  if (w.dogs && w.dogs.d.length && by) why.push(['dog', `A dog from ${a.name}'s doorway snaps at ${by.name}, and ${b.name} throws a stone at it and lames it. ${a.name} sees it done.`]);
  if (w.techs.includes('hunting') && ageY(w, a) < 55 && ageY(w, b) < 55) why.push(['spear', `${a.name} and ${b.name} both swear it was their spear that brought down the last boar, and neither will give up the hide.`]);
  const [k, text] = ale ? ['ale', `At the harvest home ${a.name} has had a jug too many, and says out loud by the fire what ${pron(a)} has always thought of ${b.name}'s house. ${b.name} stands up and knocks the jug out of ${poss(a)} hand, and the ale soaks into the ashes.`]
    : lov ? ['love', `${a.name} finds ${lov.f.name} after dark at the edge of the woods with ${lov.m.name} of ${b.name}'s house, and drags ${lov.f.sex === 'f' ? 'her' : 'him'} home by the arm. ${a.name} says before the whole hearth that no child of ${a.sex === 'f' ? 'hers' : 'his'} will go to ${b.name}'s house, and ${b.name} takes it as the insult it is.`]
    : why.length > 1 && rnd(w) < 0.85 ? why[1 + ri(w, why.length - 1)] : why[0];
  let Q = w.quarrel;
  const first = !Q;
  if (first) Q = w.quarrel = { k: 0, cur: null, end: null, y: 0, yf: 0, f: 0, m: 0, br: [], cup: null };
  Q.k++;
  Q.cur = { a: A.id, b: B.id, ai: a.id, bi: b.id, an: a.name, bn: b.name, d: c.day, why: k, n: 0, f: 0 };
  if (lov) Q.cur.lv = { f: lov.f.id, m: lov.m.id, fn: lov.f.name, mn: lov.m.name, fh: a.name, mh: b.name, d: c.day, n: 0, on: null, x: 0, y: 0, at: 'beach', s: 1, k: c.day + LOVE_KEPT, go: 0 };
  if (first && !w.techs.includes('feud')) w.techs.push('feud');
  if (fx) fx.push({ x: A.x + 0.5, y: A.y - 0.5, text: 'a quarrel', color: 'sick' });
  const after = `From that day ${a.name}'s house and ${b.name}'s house do not speak. A thorn branch is laid across each doorstep, nobody from one will sit by anyone from the other at the fire, and no child of one will be married to a child of the other.`;
  if (first) milestone(w, `${text} ${after} It is the first feud on ${w.name}, and nobody knows how to end it.`);
  else log(w, `${text} ${after}${Q.cup != null ? ' Everyone waits for the next gathering and the bowl.' : ''}`, 'bad');
}
function quarrelSpat(w, c, C, a, b, fx, ale) {
  const Q = w.quarrel, flip = rnd(w) < 0.5, x = flip ? b : a, y = flip ? a : b;
  C.n++; Q.y++;
  const fit = (id) => { let best = null; for (const p of w.people) { const ag = ageY(w, p); if (!p.dead && p.home === id && ag >= 16 && ag <= 45 && !p.sick && !p.hurt && (!best || Math.abs(ag - 24) < Math.abs(ageY(w, best) - 24))) best = p; } return best; };
  const p = fit(C.a), q = fit(C.b);
  if (!p || !q || rnd(w) >= (ale ? ALE_BLOWS : QUARREL_BLOWS) * (Q.cup != null ? 0.5 : 1)) return log(w, ale ? `At the harvest home ${x.name} and ${y.name} sit on opposite sides of the hearth all night, and every time the jug comes round one of them says something the other pretends not to hear.` : SPATS[ri(w, SPATS.length)](x.name, y.name), 'bad');
  const lose = rnd(w) < 0.5 ? p : q, win = lose === p ? q : p, days = QUARREL_HURT + ri(w, 3);
  lose.hurt = Math.max(lose.hurt || 0, w.t + days * TICKS_PER_DAY);
  if (!Q.br.includes(lose.id)) Q.br.push(lose.id);
  C.f++; Q.f++; Q.yf++;
  if (fx) fx.push({ x: lose.x, y: lose.y - 0.5, text: 'blows', color: 'sick' });
  const where = ale ? 'by the hearth at the harvest home, over the ale, with the whole village pulling them apart' : ['behind the granary', 'down at the landing', 'at the edge of the fields', 'by the spring', 'in the middle of the path'][ri(w, 5)];
  log(w, `Words turn to blows between ${win.name} and ${lose.name} ${where}. ${lose.name} comes home with a split lip and an eye swelling shut, and is no use for ${days} days.${C.f === 1 && Q.f === 1 ? ` Nobody on ${w.name} has struck anyone before.` : ''}`, 'bad');
}
// one head is dead: the other comes to the graveside, and the quarrel is buried with them
function quarrelGrave(w, alive, C) {
  const dead = alive && alive.id === C.ai ? C.bn : C.an;
  quarrelOver(w);
  const wed = loveWed(w, C, (f, m) => ` Before the month is out ${f} and ${m}, who have been slipping out to meet all along, are joined at the fire, and nobody says a word against it.`);
  if (!alive) return log(w, `${C.an} and ${C.bn} are both in the burying ground now, and their houses have forgotten what the quarrel was about.${wed}`, 'info');
  log(w, `${dead} is laid in the earth, and ${alive.name} comes to the graveside and stands with ${dead}'s house. Whatever the quarrel was, it goes into the ground too. The thorn branches are taken off the doorsteps.${wed}`, 'good');
}
function quarrelOver(w) {
  const Q = w.quarrel;
  Q.cur = null; Q.end = w.t;
}
// at a gathering: will the eldest bring the two heads to the fire and make them drink from one bowl?
function quarrelMend(w, c, at, mead) {
  const Q = w.quarrel, C = Q && Q.cur;
  if (!C || c.day - C.d < QUARREL_MIN) return;
  const a = aliveId(w, C.ai), b = aliveId(w, C.bi);
  if (!a || !b || a.sick || b.sick) return;
  const days = c.day - C.d, long = days >= QUARREL_LONG * DAYS_PER_YEAR;
  const L = loveOf(w, C), known = !!(L && L.s);
  const odds = (Q.cup != null ? QUARREL_CUP : QUARREL_MEND + (mead ? QUARREL_MEAD : 0)) * (known ? LOVE_STUBBORN : 1);
  const night = at === 'fest' ? 'midsummer night' : 'the longest night';
  if (!long && rnd(w) >= odds) {
    if (known && !L.go) { // the bowl was not shared, and the two of them give up waiting for it
      L.go = 1;
      return log(w, `On ${night} ${C.an} and ${C.bn} sit on opposite sides of the fire and do not look at each other. ${L.fn} and ${L.mn} do not look at anyone else. Somebody hears ${L.fn} say that the far isle is not so far.`, 'bad');
    }
    return log(w, `On ${night} ${C.an} and ${C.bn} sit on opposite sides of the fire and do not look at each other.`, 'info');
  }
  let who = null;
  for (const p of w.people) if (!p.dead && !p.sick && p.home !== C.a && p.home !== C.b && ageY(w, p) >= 30 && (!who || p.born < who.born || (p.born === who.born && p.id < who.id))) who = p;
  const by = who ? who.name : 'the eldest', bowl = mead ? 'with mead' : 'from the spring';
  const first = Q.cup == null;
  quarrelOver(w);
  Q.m++;
  // and to seal it, a match across the two doorsteps if there is one to be had: the secret lovers first
  let seal = loveWed(w, C, (f, m) => known
    ? ` Then ${by} calls ${f} and ${m} into the light too, and everyone knows why. They are pledged before the bowl is cold, and that settles it.`
    : ` Before the night is out ${f} of one house is pledged to ${m} of the other, and only then does it come out that they have been meeting in secret for months.`);
  if (!seal) for (const f of w.people) {
    if (f.dead || f.sex !== 'f' || f.partner != null || ageY(w, f) < 17 || (f.home !== C.a && f.home !== C.b)) continue;
    const m = w.people.find((o) => o.home === (f.home === C.a ? C.b : C.a) && matches(w, f, o));
    if (!m) continue;
    f.partner = m.id; m.partner = f.id; f.wants = true;
    seal = ` Before the night is out ${f.name} of one house is pledged to ${m.name} of the other, and that settles it.`;
    break;
  }
  const len = days >= DAYS_PER_YEAR ? 'More than a year' : `${Math.round(days / 30)} months`;
  if (first) {
    Q.cup = w.t;
    if (!w.techs.includes('peacecup')) w.techs.push('peacecup');
    milestone(w, `On ${night} ${by} stands up by the fire and will not sit down again until ${C.an} and ${C.bn} come into the light. ${Cap(by)} fills one bowl ${bowl}, puts it in ${C.an}'s hands and then in ${C.bn}'s, and they drink from it in front of everyone. ${len} of not speaking are over, and the thorn branches come off the doorsteps.${seal} From now on any quarrel on ${w.name} is brought to the fire and ended over one shared bowl. ${w.name} keeps the peace cup.`);
  } else log(w, `On ${night} ${by} brings ${C.an} and ${C.bn} to the fire, and they drink from the peace cup in front of everyone. ${len} of not speaking are over.${seal}`, 'good');
}

// ---------- lovers across the thorn branch ----------
// Half the feuds start over a girl still at home who is found after dark with a lad of another house her father will
// not have (loveCause); in any feud a pair from the two houses may also fall for each other later (loveDay). They
// meet in secret after dark, among the standing stones or down on the beach. Each night out they may be seen; then
// the lad may take a beating, and both are kept in for a while. Once it is known, the girl's father is slower to drink
// from the bowl; when the bowl ends it, or a head dies, the two are pledged (or promised, if under 17). If the bowl
// is refused once, they mean to leave: at the next midsummer with far-isle guests they go with the boat, the shame of
// it ends the feud, and from the second summer after, they may come home in the guests' boat with a child.
// cur.lv { f, m ids, fn, mn, fh, mh their heads' names, d day it began, n nights out, on day of the last night out,
//   x, y where they meet, at 'stones'|'beach', s times seen, k kept in until this day, go 1 once they mean to leave }
// w.quarrel.el { f, m: {nm, sex, b born, mo, fa, cg}, y, an, bn, w word sent } once a pair has run off; ran pairs ever
const LOVE_AFTER = 20;       // days into a feud before anyone notices anyone across the thorn branch
const LOVE_SEED = 0.02;      // daily chance, once there is a pair to fall for each other
const LOVE_AGE = 15;         // youngest to slip out at night
const LOVE_CAUSE = 0.5;     // chance a new feud is over a girl and a lad, if there is a pair in two houses to start it
const LOVE_NIGHT = 0.1;    // chance of a night out (none in a storm, snow or a hard cold)
const LOVE_FROM = 21;        // hours they are out: 21:00 to midnight
const LOVE_SEEN = 0.05;     // chance a night out is seen (x2 under a bright moon, half in fog)
const LOVE_KEPT = 20;        // days both are kept in after being seen
const LOVE_STUBBORN = 0.6;   // x the odds of the bowl at a gathering once everyone knows: the girl's father will not drink
const LOVE_BACK = 0.5;       // chance they are in the boat, each far-isle visit from the second summer after they left
const loveOf = (w, C) => {
  const L = C && C.lv;
  if (!L) return null;
  const f = aliveId(w, L.f), m = aliveId(w, L.m);
  return f && m && f.partner == null && m.partner == null ? L : null;
};
const inLove = (w, p) => {
  const Q = w.quarrel;
  if (!Q) return false;
  const L = Q.cur && Q.cur.lv;
  return (!!L && (p.id === L.f || p.id === L.m)) || (!!Q.pr && (p.id === Q.pr[0] || p.id === Q.pr[1]));
};
// for the map: the pair out tonight, and where
export const loveNight = (w) => { const C = quarrelOf(w); return C && C.lv && C.lv.on != null ? C.lv : null; };
export const loveKnown = (w) => { const C = quarrelOf(w); return C && C.lv && C.lv.s ? `${C.lv.fn} and ${C.lv.mn}` : null; };
// a feud about to start: is there a girl still at home (16-24) and an unpledged lad (16-30) under another roof?
function loveCause(w, homes) {
  const H = new Map(homes.map((b) => [b.id, b]));
  for (const f of w.people) {
    if (f.dead || f.sex !== 'f' || f.partner != null || f.sick || !H.has(f.home) || ageY(w, f) < LOVE_AGE || ageY(w, f) > 24) continue;
    const a = houseHead(w, f.home);
    if (!a || a === f) continue;
    for (const m of w.people) {
      if (m.dead || m.sex !== 'm' || m.partner != null || m.sick || m.home === f.home || !H.has(m.home) || ageY(w, m) < LOVE_AGE || ageY(w, m) > 30 ||
        Math.abs(ageY(w, m) - ageY(w, f)) >= 10 || sibling(f, m)) continue;
      const b = houseHead(w, m.home);
      if (!b || b === m || b.partner === a.id) continue;
      return { A: H.get(f.home), B: H.get(m.home), f, m };
    }
  }
  return null;
}
function loveDay(w, c, C, fx) {
  const L = C.lv;
  if (!L) {
    if (c.day - C.d < LOVE_AFTER || rnd(w) >= LOVE_SEED) return;
    // of the house: living under its roof, or a son or daughter of it who has moved out
    const kin = (p, h) => { if (p.home === h) return true; const mo = p.mother != null && aliveId(w, p.mother), fa = p.father != null && aliveId(w, p.father); return !!((mo && mo.home === h) || (fa && fa.home === h)); };
    const ok = (p, sex, h) => !p.dead && p.sex === sex && p.partner == null && !p.sick && ageY(w, p) >= LOVE_AGE && ageY(w, p) <= 35 && kin(p, h);
    for (const [ha, hb] of [[C.a, C.b], [C.b, C.a]]) for (const f of w.people) {
      if (!ok(f, 'f', ha) || kin(f, hb)) continue;
      const m = w.people.find((o) => ok(o, 'm', hb) && !kin(o, ha) && Math.abs(ageY(w, o) - ageY(w, f)) < 10 && !sibling(f, o));
      if (!m) continue;
      const fh = ha === C.a ? C.an : C.bn, mh = ha === C.a ? C.bn : C.an;
      C.lv = { f: f.id, m: m.id, fn: f.name, mn: m.name, fh, mh, d: c.day, n: 0, on: null, x: 0, y: 0, at: 'beach', s: 0, k: 0, go: 0 };
      return log(w, `At the spring ${f.name} of ${fh}'s house and ${m.name} of ${mh}'s house are the only two who do not look away from each other.`, 'love');
    }
    return;
  }
  const f = aliveId(w, L.f), m = aliveId(w, L.m);
  if (!f || !m || f.partner != null || m.partner != null) { C.lv = null; return; }
  const wx = w.wx ? w.wx.k : 'clear';
  if (L.on === c.day - 1) { // last night they were out: was anyone else?
    const lit = (wx === 'clear' || wx === 'heat' || wx === 'cold') && moonLight(c.day - 1) >= 10;
    if (rnd(w) < LOVE_SEEN * (lit ? 2 : wx === 'fog' ? 0.5 : 1)) loveSeen(w, c, C, L, f, m, lit, fx);
  }
  L.on = null;
  if (c.day < L.k || f.sick || m.sick || f.hurt || m.hurt || wx === 'storm' || wx === 'snow' || wx === 'cold' || rnd(w) >= LOVE_NIGHT) return;
  const R = w.stones && w.stones.s.length && !(w.vigil && w.vigil.cur) ? w.stones : null, B = !R && landing(w); // not among the stones on a night someone sits there
  if (!R && !B) return;
  L.on = c.day; L.n++;
  L.at = R ? 'stones' : 'beach';
  L.x = R ? R.cx + 0.5 : B.bx + 0.5; L.y = R ? R.cy + 0.9 : B.by + 0.5;
  if (L.n === 1) log(w, `After dark ${f.name} slips out of ${L.fh}'s house, and ${m.name} out of ${L.mh}'s. They meet ${R ? 'among the standing stones, where nobody goes at night' : 'down on the beach, where the waves cover their voices'}.`, 'love');
}
function loveSeen(w, c, C, L, f, m, lit, fx) {
  const Q = w.quarrel;
  L.s++; L.k = c.day + LOVE_KEPT;
  C.n++; Q.y++;
  const out = w.people.filter((p) => !p.dead && p !== f && p !== m && ageY(w, p) >= 12);
  const by = out.length ? out[ri(w, out.length)] : null;
  const where = L.at === 'stones' ? 'among the standing stones' : 'down on the beach';
  const fit = (h) => { let best = null; for (const p of w.people) { const ag = ageY(w, p); if (!p.dead && p.home === h && p !== f && ag >= 16 && ag <= 50 && !p.sick && !p.hurt && (!best || p.born < best.born)) best = p; } return best; };
  const hit = fit(f.home), days = QUARREL_HURT + ri(w, 3);
  let text = L.s === 1
    ? `${by ? by.name : 'Somebody'} comes home late${lit ? ' under a bright moon' : ''} and sees two people sitting close ${where} under one cloak: ${f.name} of ${L.fh}'s house and ${m.name} of ${L.mh}'s. By morning both houses know. ${f.name} and ${m.name} are kept in, and the thorn branches seem to grow longer.`
    : `${f.name} and ${m.name} are caught ${where} again. Both houses are kept in for weeks, and everyone else on ${w.name} takes a side.`;
  if (hit && rnd(w) < QUARREL_BLOWS * 1.5) {
    m.hurt = Math.max(m.hurt || 0, w.t + days * TICKS_PER_DAY);
    if (!Q.br.includes(m.id)) Q.br.push(m.id);
    C.f++; Q.f++; Q.yf++;
    text += ` ${hit.name} goes to ${L.mh}'s door and knocks ${m.name} down in the doorway; ${pron(m)} is no use for ${days} days.`;
    if (fx) fx.push({ x: m.x, y: m.y - 0.5, text: 'blows', color: 'sick' });
  }
  if (fx) fx.push({ x: f.x, y: f.y - 0.5, text: 'seen!', color: 'sick' });
  log(w, text, 'bad');
}
// a gathering ends the feud, or a head dies: the two of them are free, and pledged at once
function loveWed(w, C, say) {
  const L = loveOf(w, C);
  if (!L) return '';
  const f = aliveId(w, L.f), m = aliveId(w, L.m);
  C.lv = null;
  if (ageY(w, f) < 17 || ageY(w, m) < 17) { // too young yet: promised, and joined when both are grown
    w.quarrel.pr = [f.id, m.id];
    return ` ${f.name} and ${m.name} are promised to each other, to be joined when they are both grown.`;
  }
  f.partner = m.id; m.partner = f.id; f.wants = true;
  return say(f.name, m.name);
}
// a promise made over the bowl, kept once both are 17
function lovePromise(w) {
  const Q = w.quarrel, f = aliveId(w, Q.pr[0]), m = aliveId(w, Q.pr[1]);
  if (!f || !m || f.partner != null || m.partner != null) { Q.pr = null; return; }
  if (ageY(w, f) < 17 || ageY(w, m) < 17) return;
  Q.pr = null;
  f.partner = m.id; m.partner = f.id; f.wants = true;
  log(w, `${f.name} and ${m.name}, promised over the peace bowl, are joined at the fire. Both their houses are there.`, 'love');
}
// midsummer, late in the dance: two who mean to leave slip down to the guests' boat
function loveBoat(w) {
  const C = quarrelOf(w), L = loveOf(w, C), B = w.isle && w.isle.boat;
  if (!L || !L.go || !B || B.st !== 'ashore' || B.el) return;
  const f = aliveId(w, L.f), m = aliveId(w, L.m);
  if (f.sick || m.sick || ageY(w, f) < 17 || ageY(w, m) < 17) return;
  B.el = [f.id, m.id];
}
// first light: they are in the boat, and the feud that drove them out is over
function loveGone(w, B) {
  const Q = w.quarrel, C = quarrelOf(w), ids = B.el;
  delete B.el;
  const f = aliveId(w, ids[0]), m = aliveId(w, ids[1]);
  if (!f || !m || !C) return;
  const y = clock(w.t).year, keep = (p) => ({ nm: p.name, sex: p.sex, b: p.born, mo: p.mother, fa: p.father, cg: p.cgi ? 1 : 0 });
  Q.el = { f: keep(f), m: keep(m), y, an: C.lv.fh, bn: C.lv.mh, w: 0 };
  Q.ran = (Q.ran || 0) + 1;
  for (const [p, o] of [[f, m], [m, f]]) {
    rollCall(w, { id: p.id, n: p.name, x: p.sex, b: p.born, d: w.t, why: `ran away to the far isle with ${o.name}`, m: p.mother, f: p.father, pt: null, by: byname(p) });
    B.gs.push({ nm: p.name, sex: p.sex, a: Math.floor(ageY(w, p)), x: B.x, y: B.y, px: p.x, py: p.y, k: 'boat', isl: 1 });
    release(w, p); p.dead = true; unname(w, p);
  }
  quarrelOver(w);
  log(w, `At first light the guests push off for the far isle, and ${f.name} and ${m.name} are in the boat with them. Nobody stopped them; nobody saw them go down to the beach. ${Q.el.an} and ${Q.el.bn} stand at the water's edge side by side and watch the boat until it is gone into the haze. That evening the thorn branches are taken off both doorsteps, and nobody puts them back.`, 'bad');
}
// a later midsummer: word of them from the guests, or the two of them in the boat with a child
function loveBack(w, B) {
  const Q = w.quarrel, E = Q && Q.el;
  if (!E) return;
  const y = clock(w.t).year;
  if (y - E.y < 2 || rnd(w) >= LOVE_BACK) {
    if (!E.w && y > E.y) { E.w = 1; log(w, `The guests from the far isle bring word of ${E.f.nm} and ${E.m.nm}: they have a house of their own over there now, against the wind.`, 'info'); }
    return;
  }
  const f = addPerson(w, 'f', 0, E.f.mo, E.f.fa, null), m = addPerson(w, 'm', 0, E.m.mo, E.m.fa, null);
  for (const [p, e] of [[f, E.f], [m, E.m]]) { p.name = e.nm; p.born = e.b; p.x = p.px = B.bx + 0.5; p.y = p.py = B.by + 0.5; if (e.cg) p.cgi = 1; }
  f.partner = m.id; m.partner = f.id; f.wants = true;
  const k = addPerson(w, rnd(w) < 0.5 ? 'f' : 'm', Math.min(y - E.y - 1, 3), f.id, m.id, null);
  k.x = k.px = B.bx + 0.5; k.y = k.py = B.by + 0.5;
  Q.el = null; Q.back = (Q.back || 0) + 1;
  log(w, `There are two more in the dugout from the far isle than anyone expected: ${f.name} and ${m.name} have come home, and ${f.name} carries a child, ${k.name}, on ${poss(f)} hip. ${E.an} and ${E.bn} both walk down to the beach to meet them. The child is passed from one to the other, and nobody speaks of thorn branches.`, 'love');
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

// ---------- bees ----------
// One warm summer day a woodcutter hears a hum in a hollow tree. The log with the swarm in it is sawn
// off and stood up by the houses. From then on there is a bee garden (w.bees: h hives [{x, y, c comb,
// a alive, s year it last swarmed}], nm finder, at tick found, hy honey kept, g honey ever taken, y this
// year, sw swarms caught, sl swarms lost, d hives died, st stings, m midsummers with mead, mw wounds
// dressed with honey, ml tick of the last mead, kp extra comb left after winter losses). On flower days each hive fills comb; on every other day it
// eats it. A crowded hive swarms in late spring, and the swarm is shaken into a new log if there is room
// and someone is quick. In late summer idle hands take the honey, leaving each log enough for the winter.
// A hive that runs out of comb dies, and the empty log waits for a swarm.
const beeCap = (w) => Math.min(BEE_MAX, 2 + Math.floor(w.people.length / 8));
const beesAlive = (w) => (w.bees ? w.bees.h.filter((h) => h.a).length : 0);
function findHiveSite(w) {
  const B = w.bees, hs = B ? B.h : [];
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 2; y < MAP - 3; y++) for (let x = 2; x < MAP - 2; x++) {
    const tt = tile(w, x, y);
    if ((tt !== T.GRASS && tt !== T.FOREST) || tile(w, x, y + 1) === T.WATER || (w.wear && w.wear[idx(x, y)] >= PATH_AT) || isStool(w, idx(x, y))) continue;
    const dd = d2(x, y, fx, fy);
    if (dd < 16 || dd > (hs.length ? 196 : 100)) continue;
    let sc;
    if (!hs.length) {
      if (nearBuild(w, x, y, 1)) continue;
      sc = Math.abs(Math.sqrt(dd) - 7) + hash(x, y, w.seed + 41) * 2;
    } else { // the next log goes beside the others, never against a house, the kiln or the granary
      const h0 = hs[0], dh = d2(x, y, h0.x, h0.y);
      if (dh > 25) continue;
      let clash = false;
      for (let yy = y - 1; yy <= y + 1 && !clash; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (tile(w, xx, yy) === T.BUILD && !hs.some((h) => h.x === xx && h.y === yy)) { clash = true; break; }
      if (clash) continue;
      sc = dh + hash(x, y, w.seed + 43);
    }
    if (tt === T.FOREST) sc += 3; // a clear spot first; a tree is felled for the log only if there is none
    if (sc >= bs || !lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
function beeHand(w, not) { // whoever is grown, steady and at hand: the healer, the herder and the horn keeper have their own work
  const busy = [w.heal && w.heal.id, w.goats && w.goats.hid, w.horn && w.horn.hid, not];
  let best = null, bs = 1e9;
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || p.sick || p.hurt || a < 14 || a > 60 || busy.includes(p.id)) continue;
    const sc = Math.abs(a - 30) + hash(p.id, w.t % 997, 47) * 20;
    if (sc < bs) { bs = sc; best = p; }
  }
  return best;
}
function newHive(w, c0) {
  const s = findHiveSite(w);
  if (!s) return null;
  const i = idx(s.x, s.y);
  w.timber += w.wood[i]; w.wood[i] = 0;
  setTile(w, i, T.BUILD);
  const h = { x: s.x, y: s.y, c: c0, a: 1, s: 0 };
  w.bees.h.push(h);
  return h;
}
function learnBees(w, c) {
  const wx = w.wx ? w.wx.k : 'clear';
  if (c.year < BEE_YEAR || c.season !== 1 || (wx !== 'clear' && wx !== 'heat') || !w.techs.includes('woodcut') || rnd(w) >= BEE_FIND) return;
  const who = beeHand(w, null);
  if (!who) return;
  w.bees = { h: [], nm: who.name, at: w.t, hy: 0, g: 0, y: 0, sw: 0, sl: 0, d: 0, st: 0, m: 0, mw: 0, ml: -1, kp: 0 };
  if (!newHive(w, 14)) { w.bees = null; return; }
  w.techs.push('bees');
  const P = pron(who), Pc = Cap(P);
  milestone(w, `${who.name} is splitting a dead oak at the edge of the woods when the axe goes into a hollow and the whole trunk starts to hum. ${Pc} runs, stung on the neck and the hands. That evening ${P} comes back with a smoking brand, saws the hollow length off above and below, plugs the ends with turf and rolls it home with the bees still inside. ` +
    `The log is stood on end beside the village with a flat stone on top, and by morning the bees are going in and out of the split as if nothing had happened. ${w.name} keeps bees.`);
}
function beeDay(w, c) {
  if (w.bees === null) { learnBees(w, c); return; }
  const B = w.bees, wx = w.wx ? w.wx.k : 'clear';
  if (c.doy === 0) B.y = 0;
  const flowers = c.doy >= BEE_FROM && c.doy <= BEE_TO;
  let died = 0;
  for (const h of B.h) {
    if (!h.a) continue;
    if (flowers && BEE_FLY[wx] > 0) h.c = Math.min(BEE_COMB, Math.round((h.c + BEE_FLY[wx] * BEE_SEASON[c.season]) * 100) / 100);
    else h.c = Math.round((h.c - BEE_EAT * (wx === 'cold' || wx === 'snow' ? 2 : 1)) * 100) / 100;
    if (h.c <= 0) { h.a = 0; h.c = 0; died++; }
  }
  if (died) {
    B.d += died;
    const left = beesAlive(w), winter = c.season === 3 || c.doy < BEE_FROM;
    let why = winter ? 'The winter was too long for the comb they had.' : 'The flowers failed them.';
    if (winter && (B.kp || 0) < BEE_KEEP_MORE) { B.kp = Math.min(BEE_KEEP_MORE, (B.kp || 0) + 4); why += ' From now on more comb is left in the logs at the honey taking.'; }
    if (B.d === died) milestone(w, `The log by the houses has gone quiet. When the stone is lifted the comb is empty and the bees lie in a dry heap at the bottom. ${why} ${left ? `${plural(left, 'hive still hums', 'hives still hum')} beside it.` : `There are no bees left on ${w.name} but the wild ones in the woods.`}`);
    else log(w, `${plural(died, 'hive has', 'hives have')} died in the log${died > 1 ? 's' : ''}. ${why}${left ? '' : ' The bee garden is silent.'}`, 'bad');
  }
  // late spring: a crowded hive sends out half its bees with the old queen
  if (c.season === 0 && c.doy >= 40 && (wx === 'clear' || wx === 'heat')) {
    for (const h of B.h.slice()) {
      if (!h.a || h.s >= c.year || h.c < BEE_SWARM_AT || rnd(w) >= BEE_SWARM) continue;
      h.s = c.year; h.c = Math.round(h.c * 0.6 * 100) / 100;
      const room = beesAlive(w) < beeCap(w), who = beeHand(w, null);
      const empty = B.h.find((o) => !o.a);
      if (room && who && rnd(w) < BEE_CATCH && (empty || B.h.length < BEE_MAX)) {
        const nh = empty || newHive(w, 0);
        if (!nh) { B.sl++; log(w, 'A hive swarms, and there is nowhere left by the houses to stand another log. The swarm goes off into the woods.', 'info'); continue; }
        nh.a = 1; nh.c = 6; nh.s = c.year;
        B.sw++;
        if (B.sw === 1) milestone(w, `A roar goes up from the bee log and a cloud of bees pours out into the sun, whirls over the houses and settles in a hanging clump on a hazel bough. ${who.name} holds ${empty ? 'the empty log' : 'a fresh hollow log'} under it and gives the bough one hard shake. Most of the bees fall in, and the rest follow them by dusk. ${beesAlive(w) === 2 ? `${w.name} has two hives` : `There are ${beesAlive(w)} hives by the houses now`}.`);
        else log(w, `A hive swarms. ${who.name} shakes the clump off a branch into ${empty ? 'an empty log' : 'a new log'}. ${plural(beesAlive(w), 'hive', 'hives')} in the bee garden now.`, 'good');
      } else {
        B.sl++; // with every log full the swarms just go back to the woods, unremarked
        if (room) log(w, 'A hive swarms, and the swarm is up and over the trees before anyone can reach it. It goes off into the woods.', 'info');
      }
    }
  }
  // a summer day with no hive left: another wild swarm may yet be found
  if (!beesAlive(w) && c.season === 1 && (wx === 'clear' || wx === 'heat') && rnd(w) < BEE_FIND / 2) {
    const who = beeHand(w, null), h = B.h[0];
    if (who && h) {
      h.a = 1; h.c = 12; h.s = c.year;
      log(w, `${who.name} finds a wild swarm in a hollow ash and brings it home in a sack. The old log by the houses hums again.`, 'good');
    }
  }
}
// late summer: an idle grown-up takes the honey from a full log with a smoking brand
function beeTask(w, p, c) {
  const B = w.bees;
  if (!B || c.doy < BEE_TAKE || c.doy > BEE_LAST || c.hour < 9 || c.hour > 15 || B.hy >= BEE_STORE) return null;
  const wx = w.wx ? w.wx.k : 'clear';
  if (wx !== 'clear' && wx !== 'heat') return null;
  const a = ageY(w, p);
  if (a < 14 || a > 60) return null;
  for (let k = 0; k < B.h.length; k++) {
    const h = B.h[k];
    if (!h.a || h.c < BEE_KEEP + B.kp + 6 || w.res['e' + k] != null) continue;
    return { k: 'honey', key: 'e' + k, x: h.x, y: h.y, h: 2, o: k };
  }
  return null;
}
function honeyDone(w, p, t, pop) {
  const B = w.bees, h = B && B.h[t.o];
  if (!h || !h.a || h.c < BEE_KEEP + B.kp + 6) return;
  const got = Math.min(Math.floor(h.c - BEE_KEEP - B.kp), BEE_STORE - B.hy);
  if (got <= 0) return;
  h.c = Math.round((h.c - got) * 100) / 100;
  B.hy += got; B.g += got; B.y += got;
  pop('+' + got + ' honey', 'food');
  const first = B.g === got;
  if (first) milestone(w, `${p.name} lifts the stone off the bee log, wafts in smoke from a smouldering brand and cuts out the heavy comb from the top, leaving the bottom for the bees to winter on. The comb is squeezed through a cloth into ${w.pot ? 'a clay jar' : 'a wooden bowl'}: ${got} measures of dark honey. The children lick the cloth clean.`);
  else if (rnd(w) < BEE_STUNG) { B.st++; log(w, `${p.name} takes ${got} honey from the bee log and comes home stung, ${poss(p)} face swelling.`, 'info'); }
}
// at midsummer the honey kept from last year goes into the mead
function meadPoured(w, pop) {
  const B = w.bees;
  if (!B || B.hy < Math.ceil(pop / 2)) return 0;
  const m = Math.min(B.hy, pop);
  B.hy -= m; B.m++; B.ml = w.t;
  return m;
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
    if (w.tiles[i] === T.FOREST && w.wood[i] <= GOAT_BROWSE && !isStool(w, i)) { setTile(w, i, T.GRASS); w.wood[i] = 0; }
  }
  let grown = 0;
  for (const g of G.herd) if (w.t - g.b >= TICKS_PER_YEAR && g.lm == null) grown++; // a lame goat gives no milk and does not kid
  if (c.season < 2 && grown) {
    const milk = Math.round(grown * GOAT_MILK * (1 - thirst(w) * SPRING_MILK) * 10) / 10, kept = w.cheese ? cheeseMilk(w, milk) : 0;
    w.food = Math.round((w.food + milk - kept) * 100) / 100; G.ym = Math.round((G.ym + milk) * 10) / 10; G.milk = Math.round((G.milk + milk) * 10) / 10;
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
  cheeseDay(w, c, grown);
  rotDay(w, c);
}
// ---------- cheese ----------
// w.cheese { r rack tile or null, p milk in the pails, c rounds on the rack, n made ever, y this year, e eaten ever,
// ye this year, d bitter days it was eaten, f last day it was eaten, nm who saw it, mk who pressed the first, at tick, told }.
// The rack stands against the pen wall nearest the village (not the gate, muck heap or fold side);
// with no room it goes in a corner of the pen.
function rackSite(w) {
  const G = w.goats, m = penMid(G);
  const dx = m.x - (w.fire.x + 0.5), dy = m.y - (w.fire.y + 0.5);
  const gate = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'w' : 'e') : dy > 0 ? 'n' : 's';
  const heap = Math.abs(dx) <= Math.abs(dy) ? 'e' : 's';
  const cand = [];
  for (let k = 0; k < PEN_W; k++) { cand.push(['n', G.pen.x + k, G.pen.y - 1]); cand.push(['s', G.pen.x + k, G.pen.y + PEN_H]); }
  for (let k = 0; k < PEN_H; k++) { cand.push(['w', G.pen.x - 1, G.pen.y + k]); cand.push(['e', G.pen.x + PEN_W, G.pen.y + k]); }
  let best = null, bd = 1e9;
  for (const [s, x, y] of cand) {
    if (s === gate || s === heap || !inMap(x, y)) continue;
    const t = tile(w, x, y), i = idx(x, y);
    if ((t !== T.GRASS && t !== T.FOREST) || isStool(w, i)) continue;
    const dd = d2(x + 0.5, y + 0.5, w.fire.x + 0.5, w.fire.y + 0.5);
    if (dd < bd) { bd = dd; best = { x, y }; }
  }
  return best;
}
function learnCheese(w, c, grown) {
  const G = w.goats, wx = w.wx ? w.wx.k : 'clear';
  if (c.season !== 1 || (wx !== 'clear' && wx !== 'heat') || grown < 4 || !w.learned || w.learned.goats == null ||
    w.t - w.learned.goats < CHEESE_YEARS * TICKS_PER_YEAR || rnd(w) >= CHEESE_FIND) return;
  const h = aliveId(w, G.hid), old = elder(w), who = h || old;
  if (!who) return;
  const mk = ageY(w, who) >= 14 ? who : old;
  const r = rackSite(w);
  if (r) { const i = idx(r.x, r.y); w.timber += w.wood[i]; w.wood[i] = 0; setTile(w, i, T.BUILD); }
  w.cheese = { r, p: 0, c: 0, n: 0, y: 0, e: 0, ye: 0, d: 0, f: -1, nm: who.name, mk: mk ? mk.name : who.name, at: w.t, told: 0 };
  w.techs.push('cheese');
  const M = mk && mk !== who ? mk.name : Cap(pron(who));
  milestone(w, `${who.name} takes the morning milk out to the grazing in a bag sewn from the stomach of a kid killed last autumn, and leaves it hanging on a thorn in the sun. By noon it has gone to soft white curd in thin green whey. ` +
    `${M} tastes it and does not spit it out. The curd is tipped into a wicker basket with a flat stone on top, the whey runs out through the weave, and in a few days there is a firm pale round with a rind on it. A rack of hazel rods goes up ${r ? 'against the pen wall' : 'in a corner of the pen'}, out of the rain, to dry the rounds. Half the summer milk goes to the press now, to be eaten when the frost comes. ${w.name} learns to make cheese.`);
}
// ---------- the spring ----------
// w.spring { x, y spring tile, l level (0..SPRING_FULL), dry 0/1, px, py pool in the woods (null until first needed),
//   nd carries needed today, c carried today, o out now, sh share of yesterday's water that never came (0..1),
//   n carries ever, f times it failed, k days of this dry spell, dd dry days ever, th thirsty days ever, d died of thirst,
//   yd, yt, yc dry days, thirsty days and carries this year, at first failed, nm who found the pool, tk thirst told this spell }
const thirst = (w) => (w.spring ? w.spring.sh : 0);
const springDry = (w) => !!(w.spring && w.spring.dry);
function springSite(w) {
  const { x: fx, y: fy } = w.fire;
  for (const any of [false, true]) {
    let best = null, bd = 1e9;
    for (let y = fy - 7; y <= fy + 7; y++) for (let x = fx - 7; x <= fx + 7; x++) {
      if (!inMap(x, y)) continue;
      const tt = tile(w, x, y), dd = d2(x, y, fx, fy);
      if (dd < 6 || dd > 49 || (tt !== T.GRASS && !(any && tt === T.FOREST)) || isStool(w, idx(x, y)) || (!any && nearBuild(w, x, y, 1))) continue;
      const sc = dd + hash(x, y, w.seed + 13) * 3;
      if (sc < bd) { bd = sc; best = { x, y }; }
    }
    if (best) return best;
  }
  return null;
}
function poolSite(w) {
  const { x: fx, y: fy } = w.fire, R = 18;
  let best = null, bd = 1e9;
  for (let y = fy - R; y <= fy + R; y++) for (let x = fx - R; x <= fx + R; x++) {
    if (!inMap(x, y) || x < 1 || y < 1 || x >= MAP - 1 || y >= MAP - 1) continue;
    const tt = tile(w, x, y), dd = d2(x, y, fx, fy);
    if (dd < 64 || dd > R * R || (tt !== T.FOREST && tt !== T.GRASS) || isStool(w, idx(x, y)) || nearBuild(w, x, y, 1)) continue;
    const sc = Math.abs(dd - 121) + (tt === T.FOREST ? 0 : 60) + hash(x, y, w.seed + 17) * 20; // about 11 tiles out, under the trees
    if (sc >= bd || !lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bd = sc; best = { x, y };
  }
  return best;
}
function placeSpring(w) {
  const s = springSite(w);
  if (!s) return;
  const i = idx(s.x, s.y);
  w.timber += w.wood[i]; w.wood[i] = 0; setTile(w, i, T.BUILD);
  w.spring = { x: s.x, y: s.y, l: SPRING_FULL, dry: 0, px: null, py: null, nd: 0, c: 0, o: 0, sh: 0, n: 0, f: 0, k: 0, dd: 0, th: 0, d: 0, yd: 0, yt: 0, yc: 0, at: null, nm: null, tk: 0 };
}
const carryFor = (w) => (w.techs.includes('pottery') ? SPRING_JAR : SPRING_SKIN);
function springDay(w, c, wx) {
  if (!w.spring) { placeSpring(w); return; }
  const S = w.spring, pop = w.people.length;
  // yesterday's reckoning: how much of the water the village needed came up from the pool
  if (S.dry && S.nd) {
    S.sh = S.c >= S.nd ? 0 : Math.round(((S.nd - S.c) / S.nd) * 100) / 100;
    if (S.sh > 0) {
      S.th++; S.yt++;
      if (!S.tk && S.sh >= 0.25) {
        S.tk = 1;
        log(w, S.th === 1
          ? `Not enough water came up from the pool yesterday. The babies cry with dry mouths, the old lie still in the doorways, and the goats stand bleating at the empty trough.`
          : `Too few carries came up from the pool again. Cups are rationed, and the small and the old go thirsty.`, 'bad');
      }
    }
  } else S.sh = 0;
  // the spring fills with the rain and falls in the sun, faster with more mouths and in a dry year
  let g = wx === 'clear' ? (c.season === 1 ? SPRING_SUN : SPRING_CLEAR) : 0;
  for (const [k, v] of SPRING_GAIN) if (k === wx) g = v;
  if (c.season < 2) g -= Math.min(SPRING_DRAW_MAX, Math.floor(pop / SPRING_DRAW)) + (w.harvest < 0.8 ? -SPRING_DRYYEAR : 0);
  const floor = -wellDeep(w) * WELL_RING, was = S.l;
  S.l = Math.max(floor, Math.min(SPRING_FULL, S.l + g));
  if (!S.dry && S.l <= floor) springFails(w, c, wx);
  else if (!S.dry && floor < 0 && S.l < 0 && was >= 0 && w.well.bl++ < 3) log(w, `The spring has sunk below its old stones, but the well under it still holds water. The ${w.techs.includes('pottery') ? 'jars go' : 'skins go'} down on a rope, and nobody has to walk to the woods.`, 'good');
  else if (S.dry && S.l >= floor + SPRING_BACK) {
    S.dry = 0;
    log(w, `${floor < 0 ? 'Water rises in the well again' : 'Water wells up between the stones of the spring again'} after ${plural(S.k, 'dry day', 'dry days')}. The skins and jars are hung up${S.yt ? '. Nobody has to go thirsty now' : ''}.`, 'good');
    S.k = 0; S.tk = 0;
  } else if (!S.dry && S.l <= SPRING_BACK && S.l - g > SPRING_BACK && c.season === 1) log(w, 'The spring by the village runs low. The water comes up muddy and slow.', 'info');
  S.c = 0; S.o = 0;
  if (S.dry) { S.k++; S.dd++; S.yd++; S.nd = S.px != null ? Math.ceil((pop - aleWater(w, S, pop)) / carryFor(w)) : 0; }
  else S.nd = 0;
}
function springFails(w, c, wx) {
  const S = w.spring;
  S.dry = 1; S.f++; S.k = 0;
  if (S.px == null) {
    const p = poolSite(w);
    if (p) { const i = idx(p.x, p.y); w.timber += w.wood[i]; w.wood[i] = 0; setTile(w, i, T.BUILD); S.px = p.x; S.py = p.y; }
  }
  if (S.f === 1) {
    const old = elder(w), who = old ? old.name : 'The eldest';
    S.at = w.t; S.nm = old ? old.name : null;
    if (!w.techs.includes('drought')) w.techs.push('drought');
    milestone(w, `In the grey of the morning the first one down to the spring with a skin comes back with it empty. Between the stones there is only a skin of cracked mud, and the cress on the bank has gone brown. ${wx === 'heat' ? 'The sun has beaten down for days, and n' : 'N'}obody on ${w.name} has seen it fail before. ` +
      (S.px != null ? `${who} remembers a deep pool in the woods where the deer go to drink, a long walk under the trees, and by noon a line of islanders is going out to it with skins and ${w.techs.includes('pottery') ? 'jars' : 'gourds'} and coming back bent under the weight. Until the rain comes, every cup on ${w.name} is carried in from the woods.` : `Nobody knows where else to find water.`));
  } else if (wellDeep(w)) log(w, `The bucket comes up from the bottom of the well with a scrape of mud in it. Even the well under the spring is dry, ${WELL_DEPTHS[wellDeep(w)]}, and the long walks to the pool in the woods begin again.`, 'bad');
  else log(w, `The spring has failed again. The skins and ${w.techs.includes('pottery') ? 'jars' : 'gourds'} come down from the rafters, and the long walks to the pool in the woods begin.`, 'bad');
}
function waterTask(w, p, c) {
  const S = w.spring;
  if (!S || !S.dry || S.px == null || c.hour > SPRING_LATE || S.c + S.o >= S.nd) return null;
  S.o++;
  return { k: 'water', x: S.px, y: S.py, h: 1 };
}
function waterDone(w, p, t, pop) {
  const S = w.spring;
  if (!S || !t.b) return;
  t.b = 2; S.c++; S.n++; S.yc++;
  pop('water', 'muted');
  if (S.n === 1) log(w, `${p.name} sets the first ${w.techs.includes('pottery') ? 'jar' : 'skin'} of pool water down by the dry spring, and the children crowd round it with their cups.`, 'good');
  else if (S.n === 500 || S.n === 2000 || S.n === 10000) log(w, `${S.n} loads of water have been carried in from the pool in the woods.`, 'info');
}
// ---------- the well ----------
// Once the spring has failed and come back, the islanders dig it down: a shaft under the old spring stones, lined
// ring by ring with stones from the beach. Each ring lets the level fall WELL_RING further before the bottom is mud,
// so a dry summer drains it later; but more mouths draw it faster, and the deepest well can still go dry.
// w.well { d rings lined, h hours into the ring now being dug, yr year the last ring was finished, nm who cut the
//   first sod, at when, n spells dug ever, c cave-ins, hit times the diggers struck water in a dry spell, sp sweep up (0/1),
//   bl times the level has sunk below the old spring stones (told the first 3) }
export const WELL_RING = 40;  // spring level points per ring (the spring holds SPRING_FULL above the old stones)
export const WELL_MAX = 4;    // the bedrock: no deeper than this
const WELL_WORK = 24;         // digger-hours for the first ring; each deeper ring takes WELL_DEEPER more
const WELL_DEEPER = 8;
const WELL_SPELL = 4;         // hours in one spell in the shaft
const WELL_LOW = 40;          // they dig only while the water is within this of the bottom (or gone): a ring is dug when it was needed
const WELL_CAVE = 0.025;     // chance per spell that a side gives way on the digger (more in rain)
const WELL_HURT = 8;          // days laid up after a cave-in
const WELL_SWEEP = 2;         // rings before the water is too far down to dip: a sweep pole goes up beside it
export const WELL_DEPTHS = ['', 'knee deep', 'waist deep', 'deeper than the tallest islander', 'twice the height of the tallest islander', 'three times the height of the tallest islander'];
export const wellDeep = (w) => (w.well ? w.well.d : 0);
export const wellWork = (d) => WELL_WORK + WELL_DEEPER * d;
const wellOn = (w, c) => {
  const W = w.well, S = w.spring;
  return !!(W && S && W.d < WELL_MAX && W.yr !== c.year && c.season < 3 && (S.dry || S.l < WELL_LOW - W.d * WELL_RING || (W.h > 0 && S.l < WELL_LOW - (W.d - 1) * WELL_RING)));
};
// the eldest says to dig, the first summer the spring runs low after it has once failed
function wellDay(w, c) {
  const S = w.spring;
  if (w.well || !S || S.f < 1 || S.dry || c.season > 1 || S.l >= WELL_LOW) return;
  const old = elder(w);
  w.well = { d: 0, h: 0, yr: -1, nm: old ? old.name : null, at: w.t, n: 0, c: 0, hit: 0, sp: 0, bl: 0 };
  log(w, `The spring is falling again. ${old ? old.name : 'The eldest'} stands over it with a digging stick and says the water does not come from the stones, it comes up from under them, and will be there still when the cress goes brown. While it is low, the spring is to be dug down.`, 'info');
}
// a spell in the shaft, two grown hands at a time (one digs, one hauls up the spoil), by day
function wellTask(w, p, c) {
  if (c.hour < 7 || c.hour > 15 || !wellOn(w, c)) return null;
  const a = ageY(w, p);
  if (a < 16 || a > 50) return null;
  const key = w.res.wl0 == null ? 'wl0' : w.res.wl1 == null ? 'wl1' : null;
  if (!key) return null;
  const S = w.spring;
  const side = key === 'wl1' && tile(w, S.x + 1, S.y) === T.GRASS ? 1 : 0; // the hauler at the lip
  return { k: 'well', key, x: S.x + side, y: S.y, h: WELL_SPELL };
}
function wellDone(w, p, t, pop) {
  const W = w.well, S = w.spring, c = clock(w.t);
  if (!W || !S || !wellOn(w, c)) return;
  W.n++;
  if (t.key === 'wl0' && rnd(w) < WELL_CAVE * (w.wx && (w.wx.k === 'rain' || w.wx.k === 'storm') ? 3 : 1)) { // the side gives way
    W.c++;
    p.hurt = Math.max(p.hurt || 0, w.t + WELL_HURT * TICKS_PER_DAY);
    W.h = Math.max(0, W.h - WELL_SPELL * 2);
    log(w, W.c === 1
      ? `A side of the shaft at the spring slumps in on ${p.name} with a wet sigh, up to ${poss(p)} chest. ${Cap(pron(p))} is dug out with bare hands, grey with clay and bruised all down one side. Stones go in to hold the wall before anyone goes down again.`
      : `Part of the well side gives way under ${p.name}. ${Cap(pron(p))} is hauled out by the arms, bruised, and the fallen clay must be lifted out again.`, 'bad');
    pop('cave-in', 'bad');
    return;
  }
  W.h += WELL_SPELL;
  pop('digging', 'wood');
  if (W.h < wellWork(W.d)) return;
  W.h = 0; W.d++; W.yr = c.year;
  const ids = [w.res.wl0, w.res.wl1].filter((id) => id != null);
  if (!ids.includes(p.id)) ids.push(p.id);
  for (const id of ids) deed(w, aliveId(w, id), 'e');
  const wet = S.dry; // dug down through the mud in a dry spell: water seeps in at the new bottom
  if (wet) { S.dry = 0; S.l = -(W.d - 1) * WELL_RING; S.k = 0; S.tk = 0; W.hit++; }
  if (W.d >= WELL_SWEEP && !W.sp) W.sp = 1;
  const deep = WELL_DEPTHS[W.d];
  if (W.d === 1) {
    if (!w.techs.includes('well')) w.techs.push('well');
    milestone(w, `${p.name} climbs out of the hole under the spring stones and hands the last basket of clay up to the light. ` +
      `${wet ? 'At the bottom, in the cracked mud, dark water is already seeping in round the digging stick. ' : 'At the bottom the clay is wet and cold, and the water fills it slowly from below. '}` +
      `The sides are lined with round stones carried up from the beach, one ring laid on the next, and the shaft is ${deep} below the old spring. When the summer draws the spring down now, there is water under it still. ${w.name} has a well.`);
  } else log(w, `The well under the spring is dug down another ring and lined with beach stones; it is ${deep} now.` +
    (wet ? ' The diggers strike water at the bottom, and the skins go down on a rope instead of out to the woods.' : '') +
    (W.d === WELL_SWEEP ? ' The water is too far down to dip a jar by hand, so a long pole is set on a forked post beside it, a stone tied on one end and a bucket on the other.' : '') +
    (W.d === WELL_MAX ? ' Under the last ring the digging stick hits rock. It will go no deeper.' : ''), 'good');
}
// half of each day's milk goes into the pails, as far as they hold; returns what was kept back
function cheeseMilk(w, milk) {
  const C = w.cheese, k = Math.max(0, Math.min(CHEESE_PAIL - C.p, Math.round(milk * CHEESE_SHARE * 10) / 10));
  C.p = Math.round((C.p + k) * 10) / 10;
  return k;
}
const dayNo = (w) => Math.floor(w.t / TICKS_PER_DAY);
function cheeseFed(w) { return !!(w.cheese && w.cheese.f === dayNo(w)); }
// on a bitter winter day, or with the woodpile bare, rounds come down off the rack for the small children and the old
function cheeseDay(w, c, grown) {
  if (!w.cheese) { learnCheese(w, c, grown); return; }
  const C = w.cheese, wx = w.wx ? w.wx.k : 'clear';
  if (!(w.stats.cold || (wx === 'cold' && c.season === 3)) || C.c <= 0) return;
  let frail = 0;
  for (const p of w.people) { const a = ageY(w, p); if (!p.dead && (a < 6 || a > 55)) frail++; }
  if (!frail) return;
  const eat = Math.min(C.c, Math.ceil(frail / CHEESE_FRAIL));
  C.c -= eat; C.e += eat; C.ye += eat; C.d++; C.f = dayNo(w);
  if (!C.told) {
    C.told = 1;
    milestone(w, `The frost bites hard and the smoke hangs low over the roofs. ${plural(eat, 'round comes', 'rounds come')} down off the rack by the goat pen and ${eat === 1 ? 'is' : 'are'} cut into wedges by the fire, one for each of the little ones and the old. The summer milk has kept, and it keeps them going. ${plural(C.c, 'round is', 'rounds are')} left on the rack.`);
  } else if (!C.c) log(w, 'The last round of cheese comes down off the rack by the goat pen.', 'info');
}
function cheeseTask(w) {
  const C = w.cheese;
  if (!C || !w.goats || C.p < CHEESE_MILK || C.c >= CHEESE_RACK || w.res.zc != null) return null;
  C.p = Math.round((C.p - CHEESE_MILK) * 10) / 10; // the pail is poured into the pot; spilt if the work is broken off
  const at = C.r || w.goats.pen;
  return { k: 'cheese', key: 'zc', x: at.x, y: at.y, h: CHEESE_WORK };
}
function cheeseDone(w, p, pop) {
  const C = w.cheese;
  if (!C || C.c >= CHEESE_RACK) return;
  C.c++; C.n++; C.y++;
  pop('cheese', 'muted');
  if (C.n === 1) log(w, `${p.name} turns the first round of cheese out of the basket and sets it on the rack to dry.`, 'good');
  else if (C.c === CHEESE_RACK) log(w, `The cheese rack by the goat pen is full: ${CHEESE_RACK} rounds drying on the rods. The rest of the milk is drunk.`, 'good');
  else if (C.n === 100 || C.n === 500 || C.n === 2000) log(w, `${C.n} rounds of cheese have been pressed by the goat pen.`, 'good');
}
// ---------- the loom ----------
// One bitter winter, with the goats long settled, the eldest pulls tufts of moulted hair off the pen wattle and
// twists them into a thread between finger and thumb. From then on: each spring, once the kids are born, the
// herder combs out the winter coats (hair); through the year the children and the old spin it on drop spindles
// in idle moments (yarn); and one weaver sets up an upright loom against the wall of their house, its warp held
// taut by hanging weights, and weaves on winter days and wet days. A blanket on every bed keeps a house warm on
// less wood, and keeps the cold off the small and the old. Blankets wear through over the years.
// w.loom { id weaver, nm, k weavers so far, at tick, by who found it, h hair, y yarn, wv sittings on the web now,
//   b blankets in use, n woven ever, yb this year, wo worn out ever, cv cover (0..1, blankets per bed, set daily) }
const LOOM_YEARS = 3;        // years after the goats came before anyone thinks of the hair on the wattle
const LOOM_HERD = 8;         // goats in the pen before there is enough hair to bother with
const LOOM_FIND = 0.06;      // daily chance on a bitter winter day
const COMB_DAY = 50;         // the spring moult: combed out a few days after the kidding
const HAIR_GOAT = 1.5;       // hair combed from each grown goat
const HAIR_MAX = 80;
const SPIN_HAND = 0.04;      // yarn spun a day by each child (7-13) and each of the old (55+)
const YARN_MAX = 24;         // balls of yarn put by before the spindles are set aside
const BLANKET_YARN = 3;      // yarn in one blanket
const BLANKET_WORK = 3;      // four-hour sittings at the loom for one blanket
const BLANKET_HOUSE = 2;     // blankets a lived-in house needs before every bed has one
const BLANKET_WEAR = 0.15;   // chance each year that a blanket is worn through
const BLANKET_WARM = 0.15;   // winter firewood saved at full cover, on top of the hides
const BLANKET_GUARD = 0.35;  // at full cover the cold reaches the frail this much less
const LOOM_OLD = 70;
export const spinning = (w) => !!(w.loom && w.loom.h > 0 && w.loom.y < YARN_MAX);
export const loomCover = (w) => (w.loom ? w.loom.cv || 0 : 0);
const livedIn = (w) => { let n = 0; for (const b of w.buildings) if (isHouse(b) && b.progress >= 1 && w.people.some((p) => p.home === b.id)) n++; return n; };
// where the loom leans: against the weaver's house, on whichever side is open (right, left, then in front)
export function loomAt(w) {
  const L = w.loom, p = L && aliveId(w, L.id);
  const b = p && p.home != null && w.buildings.find((o) => o.id === p.home);
  if (!b || b.progress < 1) return null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) {
    const x = b.x + dx, y = b.y + dy, t = inMap(x, y) ? tile(w, x, y) : T.WATER;
    if (t !== T.BUILD && t !== T.WATER) return { x, y, b: b.id, s: dx };
  }
  return { x: b.x, y: b.y + 1, b: b.id, s: 0 };
}
// the weaver: a grown child or housemate of the last one first, then whoever with a roof of their own is nearest 40;
// never the healer, the goatherd, the potter or the keeper of the horn
function pickWeaver(w, old) {
  let best = null, bs = 1e9;
  const busy = [w.heal && w.heal.id, w.goats && w.goats.hid, w.horn && w.horn.hid, w.pot && w.pot.id];
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || p === old || a < 16 || a >= LOOM_OLD - 5 || p.sick || p.home == null || busy.includes(p.id)) continue;
    const tier = old && (p.mother === old.id || p.father === old.id) ? 0 : old && old.home != null && p.home === old.home ? 1 : 2;
    const sc = tier * 100 + Math.abs(a - 40);
    if (sc < bs) { bs = sc; best = p; }
  }
  return best;
}
function learnLoom(w, c, wx) {
  const G = w.goats;
  if (c.season !== 3 || (wx !== 'cold' && wx !== 'snow') || !G || G.herd.length < LOOM_HERD || !w.learned || w.learned.goats == null ||
    w.t - w.learned.goats < LOOM_YEARS * TICKS_PER_YEAR || rnd(w) >= LOOM_FIND) return;
  const old = elder(w), wv = pickWeaver(w, null);
  if (!old || !wv) return;
  const hair = Math.min(HAIR_MAX, Math.round(G.herd.length * HAIR_GOAT));
  w.loom = { id: wv.id, nm: wv.name, k: 1, at: w.t, by: old.name, h: hair, y: 0, wv: 0, b: 0, n: 0, yb: 0, wo: 0, cv: 0 };
  w.techs.push('loom');
  const O = Cap(pron(old)), W = wv === old ? Cap(pron(wv)) : wv.name;
  milestone(w, `The frost has the island by the throat and the children cry with the cold at night. ${old.name} walks round the goat pen and pulls the tufts of moulted hair off the wattle, a whole fistful of it, and sits by the fire twisting it between finger and thumb into a thread. ${O} hangs a stone off the end and sets it spinning, and the thread draws itself out long and even. ` +
    `${W} lashes two poles against the wall of ${poss(wv)} house with a beam across the top, hangs the threads from it in a row and ties ${w.pot ? 'clay weights from the kiln' : 'pebbles with holes worn through them'} on the ends to pull them straight. Thread goes over and under, and a hand's breadth of rough grey cloth grows on the frame. ${w.name} learns to spin and weave.`);
}
function loomDay(w, c, wx) {
  if (w.loom === null) { learnLoom(w, c, wx); return; }
  const L = w.loom, G = w.goats;
  if (c.doy === 0) {
    L.yb = 0;
    let worn = 0;
    for (let k = 0; k < L.b; k++) if (rnd(w) < BLANKET_WEAR) worn++;
    L.b -= worn; L.wo += worn;
    if (worn && L.b < livedIn(w) * BLANKET_HOUSE) log(w,`${plural(worn, 'blanket has', 'blankets have')} worn through over the year and gone for rags. ${L.b} still lie on the beds.`, 'info');
  }
  // the spring moult: the herder combs the loose winter coats out of the goats
  if (c.doy === COMB_DAY && G && G.herd.length) {
    let grown = 0;
    for (const g of G.herd) if (w.t - g.b >= TICKS_PER_YEAR) grown++;
    const got = Math.min(HAIR_MAX - L.h, Math.round(grown * HAIR_GOAT));
    if (got > 0) {
      L.h += got;
      const hd = aliveId(w, G.hid);
      log(w, `The goats are moulting. ${hd ? hd.name : 'Someone'} combs the loose winter coats out of the herd with a bone comb: ${got} ${got === 1 ? 'handful' : 'handfuls'} of hair for the spindles.`, 'good');
    }
  }
  // spinning, in odd moments: children and the old with a spindle on a thread
  if (L.h > 0 && L.y < YARN_MAX) {
    let n = 0;
    for (const p of w.people) { if (p.dead || p.sick || p.cg) continue; const a = ageY(w, p); if ((a >= 7 && a < 14) || a >= 55) n++; }
    const s = Math.min(L.h, Math.round(n * SPIN_HAND * 100) / 100);
    L.h = Math.round((L.h - s) * 100) / 100; L.y = Math.round((L.y + s) * 100) / 100;
  }
  L.cv = Math.round(Math.min(1, L.b / Math.max(1, livedIn(w) * BLANKET_HOUSE)) * 100) / 100;
  // a new weaver when the old one dies, grows too stiff, or takes on other work
  const cur = aliveId(w, L.id);
  const busy = cur && ((w.heal && w.heal.id === cur.id) || (w.goats && w.goats.hid === cur.id) || (w.horn && w.horn.hid === cur.id) || (w.pot && w.pot.id === cur.id));
  if (cur && !busy && ageY(w, cur) < LOOM_OLD && cur.home != null) return;
  const next = pickWeaver(w, cur || (L.id != null ? { id: L.id, home: null } : null));
  if (!next) { if (!cur) L.id = null; return; }
  const before = L.nm;
  L.id = next.id; L.nm = next.name; L.k++; L.wv = 0;
  if (cur && busy) log(w, `${cur.name} has no time for the loom now. ${next.name} carries the poles and the weights over to ${next.sex === 'f' ? 'her' : 'his'} own wall.`, 'info');
  else if (cur) log(w, `${cur.name}'s eyes are too dim for the threads. ${next.name} takes the loom.`, 'info');
  else log(w, `With ${before} gone, the half-woven web is cut down and ${next.name} sets the loom up again against ${next.sex === 'f' ? 'her' : 'his'} own wall.`, 'info');
}
// the weaver at the loom: on winter days and wet days, in daylight, while there is yarn and beds without a blanket
function loomTask(w, p, c) {
  const L = w.loom;
  if (!L || L.id !== p.id || c.hour < 8 || c.hour > 14 || w.res.lw != null) return null;
  const wx = w.wx ? w.wx.k : 'clear';
  if (c.season !== 3 && wx !== 'rain' && wx !== 'fog' && wx !== 'storm' && wx !== 'cold') return null;
  if (!L.wv && (L.y < BLANKET_YARN || L.b >= livedIn(w) * BLANKET_HOUSE + 2)) return null;
  const at = loomAt(w);
  return at ? { k: 'weave', key: 'lw', x: at.x, y: at.y, h: 4 } : null;
}
function loomDone(w, p, pop) {
  const L = w.loom;
  if (!L || L.id !== p.id) return;
  if (!L.wv) { if (L.y < BLANKET_YARN) return; L.y = Math.round((L.y - BLANKET_YARN) * 100) / 100; }
  L.wv++;
  if (L.wv < BLANKET_WORK) { pop('weaving', 'muted'); return; }
  L.wv = 0; L.b++; L.n++; L.yb++;
  pop('a blanket', 'muted');
  if (L.n === 1) milestone(w, `${p.name} cuts the first blanket down off the loom: goat hair, grey and brown, rough as a dog's back and as warm. It goes on the bed where the youngest sleep. Nobody on ${w.name} has slept under cloth before.`);
  else if (L.n === 50 || L.n === 200 || L.n === 1000) log(w, `${L.n} blankets have come off the loom.`, 'good');
}
// ---------- ale and the harvest home ----------
// Once the stores run deep, a jar of grain left open in the wet sprouts. The potter (or the eldest) dries it by the
// fire, cracks it on a flat stone and steeps it in hot water, and a few days later it froths: ale. From then on one
// brewer keeps a wooden vat against the wall of their house and mashes a sack of spare grain whenever the jugs run
// low (never while the stores are thin). Ale is poured at midsummer and at the harvest home, the night after the last
// sheaf is in, when the whole village sits up late round the hearth: couples pair off, and a feud in the village may
// come to blows over the jug, or a new one start. When the spring fails, small ale stands in for some of the water
// carried in from the pool. In the summer heat a little of it sours every day.
// w.ale { id brewer, nm, k brewers so far, at tick found, by who found it, a jugs in store, v day the vat is ready (0 empty),
//   n brews ever, g grain brewed ever, yg this year, yd jugs drunk this year, d drunk ever, s soured ever,
//   hh harvest homes kept, hd day of this year's harvest home, hy year of the last, wa jugs drunk for water, ws dry spell told }
const ALE_RICH = 300;        // grain in store per islander before anyone has grain to spare for brewing
const ALE_FIND = 0.08;       // daily chance on a wet day after the harvest
const BREW_GRAIN = 120;      // grain mashed in one brew
const ALE_BREW = 20;         // jugs of ale it makes
const ALE_DAYS = 4;          // days in the vat before it is ready
const ALE_KEEP = 250;        // grain per islander kept back: below this the brewer does not brew
const ALE_PER = 1.5;         // jugs kept on hand per islander (plus ALE_BASE)
const ALE_BASE = 12;
const ALE_SOUR = 0.005;     // share of the jugs that turn sour each summer day
const ALE_POUR = 20;         // hour the jugs come out at the harvest home
export const ALE_LATE = 23;  // nobody goes to bed before this on the night of the harvest home
const ALE_CUP = 0.6;         // jugs poured per islander at the harvest home
const ALE_FEST = 0.4;        // and at midsummer, with the feast
const ALE_SMALL = 0.5;       // islanders a day who drink small ale instead of pool water when the spring fails
const ALE_PAIR = 0.15;       // chance a single woman is paired off at the harvest home
const ALE_ROW = 0.5;         // chance a running feud flares up over the jug
const ALE_BLOWS = 0.6;       // and that it comes to blows (half that with the peace cup)
const ALE_FEUD = 0.12;       // chance a new feud starts at the harvest home, when one could
const ALE_OLD = 70;
const aleCap = (w) => ALE_BASE + Math.round(w.people.length * ALE_PER);
export const aleNight = (w, c) => !!(w.ale && w.ale.hd === c.day && c.hour >= ALE_POUR && c.hour < ALE_LATE);
export const brewing = (w) => !!(w.ale && w.ale.v);
// the vat: against the brewer's house wall, on an open side, never where the loom stands
export function aleAt(w) {
  const L = w.ale, p = L && aliveId(w, L.id);
  const b = p && p.home != null && w.buildings.find((o) => o.id === p.home);
  if (!b || b.progress < 1) return null;
  const lm = w.loom ? loomAt(w) : null;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
    const x = b.x + dx, y = b.y + dy, t = inMap(x, y) ? tile(w, x, y) : T.WATER;
    if (t !== T.BUILD && t !== T.WATER && !(lm && lm.x === x && lm.y === y)) return { x, y, b: b.id, s: dx };
  }
  return null;
}
// the brewer: a grown child or housemate of the last one first, then whoever with a roof of their own is nearest 35;
// never the healer, the goatherd, the potter, the weaver or the keeper of the horn
function pickBrewer(w, old) {
  let best = null, bs = 1e9;
  const busy = [w.heal && w.heal.id, w.goats && w.goats.hid, w.horn && w.horn.hid, w.pot && w.pot.id, w.loom && w.loom.id];
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || p === old || a < 18 || a >= ALE_OLD - 5 || p.sick || p.home == null || busy.includes(p.id)) continue;
    const tier = old && (p.mother === old.id || p.father === old.id) ? 0 : old && old.home != null && p.home === old.home ? 1 : 2;
    const sc = tier * 100 + Math.abs(a - 35) + (p.sex === 'f' ? 0 : 4);
    if (sc < bs) { bs = sc; best = p; }
  }
  return best;
}
function learnAle(w, c, wx) {
  const pop = w.people.length;
  if (c.season < 1 || c.season > 2 || (wx !== 'rain' && wx !== 'storm') || !w.pot || pop < 10 || w.food < pop * ALE_RICH ||
    !w.stats.yh || w.fields.some(growing) || rnd(w) >= ALE_FIND) return;
  const po = aliveId(w, w.pot.id), old = po || elder(w), br = pickBrewer(w, null);
  if (!old || !br) return;
  w.ale = { id: br.id, nm: br.name, k: 1, at: w.t, by: old.name, a: 0, v: 0, n: 0, g: 0, yg: 0, yd: 0, d: 0, s: 0, hh: 0, hd: null, hy: c.year, wa: 0, ws: 0 };
  w.techs.push('ale');
  const B = br === old ? Cap(pron(br)) : br.name;
  milestone(w, `The rain has got in under the lid of a jar of the new grain, and when ${old.name} tips it out the seed has sprouted, a pale beard on every grain. ${Cap(pron(old))} cannot bear to throw it to the goats, so ${pron(old)} dries it on a hide by the fire, cracks it on a flat stone and steeps it in a pot of hot water. It turns sweet as honey. ` +
    `Three days later the pot is frothing and sour-smelling, and the first cup of it goes round the hearth to a great deal of coughing and laughing. ${B} hollows out a log for a vat and sets it against the wall of ${poss(br)} house. ${w.name} learns to brew ale.`);
}
function aleDay(w, c, wx) {
  if (w.ale === null) { learnAle(w, c, wx); return; }
  const L = w.ale;
  if (L.v && dayNo(w) >= L.v) { // the vat has worked: into the jugs
    L.v = 0; L.a += ALE_BREW;
    if (L.n === 1) log(w, `${L.nm}'s vat has stopped frothing. The ale is ladled out into ${plural(ALE_BREW, 'jug', 'jugs')} and stoppered with clay. It will keep until the harvest is in.`, 'good');
  }
  if (c.season === 1 && L.a > 0) { // the summer heat sours it a little every day
    const s = Math.round(L.a * ALE_SOUR * 100) / 100;
    L.a = Math.round((L.a - s) * 100) / 100; L.s = Math.round((L.s + s) * 100) / 100;
  }
  // the day after the last sheaf is in: the harvest home, if there is ale for it
  if (L.hy !== c.year && c.season >= 1 && c.season <= 2 && w.stats.yh > 0 && L.a >= 1 && wx !== 'storm' && !w.fields.some(growing) &&
    !(w.fest && w.fest.on === c.day) && !(w.tale && w.tale.on === c.day)) { L.hd = c.day; L.hy = c.year; }
  // a new brewer when the old one dies, grows too old, or takes on other work
  const cur = aliveId(w, L.id);
  const busy = cur && ((w.heal && w.heal.id === cur.id) || (w.goats && w.goats.hid === cur.id) || (w.horn && w.horn.hid === cur.id) || (w.pot && w.pot.id === cur.id) || (w.loom && w.loom.id === cur.id));
  if (cur && !busy && ageY(w, cur) < ALE_OLD && cur.home != null) return;
  const next = pickBrewer(w, cur || (L.id != null ? { id: L.id, home: null } : null));
  if (!next) { if (!cur) L.id = null; return; }
  const before = L.nm;
  L.id = next.id; L.nm = next.name; L.k++;
  if (cur && busy) log(w, `${cur.name} has no time for brewing now. ${next.name} rolls the ale vat over to ${poss(next)} own wall.`, 'info');
  else if (cur) log(w, `${cur.name} is too old to lift the mash. ${next.name} takes over the ale vat.`, 'info');
  else log(w, `With ${before} gone, ${next.name} scrubs out the ale vat and sets it against ${poss(next)} own wall.`, 'info');
}
// jugs poured at a gathering, if there are any: a share per islander
function alePoured(w, pop, share) {
  const L = w.ale;
  if (!L || L.a < 1) return 0;
  const n = Math.min(Math.floor(L.a), Math.ceil(pop * share));
  L.a = Math.round((L.a - n) * 100) / 100; L.yd += n; L.d += n;
  return n;
}
// the spring has failed: the children and the old drink small ale, and that many fewer cups come in from the pool
function aleWater(w, S, pop) {
  const L = w.ale;
  if (!L || L.a < 1) return 0;
  const n = Math.min(Math.floor(L.a), Math.ceil(pop * ALE_SMALL));
  L.a = Math.round((L.a - n) * 100) / 100; L.yd += n; L.d += n; L.wa += n;
  if (L.ws !== S.f) {
    L.ws = S.f;
    log(w, `With the spring dry, the ale jugs come down from the rafters. The small children are given small ale with their bread, and ${plural(n, 'cup', 'cups')} a day fewer have to be carried in from the pool.`, 'good');
  }
  return n;
}
function harvestHome(w, c, fx) {
  const L = w.ale, pop = w.people.length;
  const n = alePoured(w, pop, ALE_CUP);
  if (!n) return;
  L.hh++;
  const pairs = [];
  for (const f of w.people) {
    if (f.dead || f.sex !== 'f' || f.partner != null || ageY(w, f) < 17 || rnd(w) >= ALE_PAIR) continue;
    const m = mate(w, f);
    if (!m) continue;
    f.partner = m.id; m.partner = f.id; f.wants = true;
    pairs.push(`${f.name} and ${m.name}`);
  }
  if (fx) fx.push({ x: w.fire.x + 0.5, y: w.fire.y - 1, text: 'harvest home', color: 'food' });
  const wed = pairs.length === 1 ? ` By the end of the night ${pairs[0]} are sitting under one cloak.` : pairs.length > 1 ? ` By the end of the night ${plural(pairs.length, 'couple is', 'couples are')} paired off: ${pairs.slice(0, 3).join(', ')}${pairs.length > 3 ? ' and more' : ''}.` : '';
  if (L.hh === 1) {
    const by = aliveId(w, L.id);
    milestone(w, `The last sheaf on ${w.name} is cut and carried in, and ${by ? by.name : 'the brewer'} twists a handful of its straw into a little figure with arms and hangs it over the hearth. That night nobody goes to bed. ${plural(n, 'jug', 'jugs')} of ale go round the fire, the old sing songs nobody has sung since they left the far shore, and the children fall asleep where they sit.${wed} From now on the end of the harvest is kept with ale: ${w.name} has a harvest home.`);
  } else log(w, `Harvest home: the last sheaf is in and a new straw figure hangs over the hearth. ${plural(n, 'jug', 'jugs')} of ale go round, and the singing goes on until nearly midnight.${wed}`, pairs.length ? 'love' : 'good');
  // a jug too many: a feud flares up, or a new one begins
  const C = quarrelOf(w);
  if (C) {
    const a = aliveId(w, C.ai), b = aliveId(w, C.bi);
    if (a && b && rnd(w) < ALE_ROW) quarrelSpat(w, c, C, a, b, fx, true);
  } else {
    const homes = quarrelHomes(w, c);
    if (homes && rnd(w) < ALE_FEUD) quarrelBegin(w, c, homes, fx, true);
  }
}
// the brewer at the vat: in daylight, while the jugs are low and the stores can spare a sack
function brewTask(w, p, c) {
  const L = w.ale;
  if (!L || L.id !== p.id || L.v || c.hour < 8 || c.hour > 14 || w.res.ab != null) return null;
  if (L.a + ALE_BREW > aleCap(w) || w.food < w.people.length * ALE_KEEP + BREW_GRAIN) return null;
  const at = aleAt(w);
  return at ? { k: 'brew', key: 'ab', x: at.x, y: at.y, h: 3 } : null;
}
function brewDone(w, p, pop) {
  const L = w.ale;
  if (!L || L.id !== p.id || L.v || w.food < BREW_GRAIN) return;
  w.food = Math.round((w.food - BREW_GRAIN) * 100) / 100;
  L.v = dayNo(w) + ALE_DAYS; L.n++; L.g += BREW_GRAIN; L.yg += BREW_GRAIN;
  pop('mashing', 'muted');
  if (L.n === 1) log(w, `${p.name} heats stones in the fire and drops them hissing into the vat, stirring a sack of sprouted grain into the water with a paddle. A sweet steam hangs round ${poss(p)} doorway all afternoon.`, 'info');
  else if (L.n === 50 || L.n === 200 || L.n === 1000) log(w, `${L.n} brews have been mashed in the ale vat.`, 'info');
}
// ---------- foot rot ----------
// A long wet spell turns a full pen into a wallow of mud and dung, and the hooves go soft in it. One goat
// starts to limp; others follow, fastest while the wet holds. Lame goats bed down in the straw: no grazing,
// no milk, no kids, and now and then one dies. When the ground dries they walk sound again and stay sound a while.
function rotDay(w, c) {
  const G = w.goats, n = G.herd.length;
  if (w.rot && c.doy === 0) { w.rot.y = 0; w.rot.yd = 0; }
  const wx = w.wx ? w.wx.k : 'clear', wet = wx === 'rain' || wx === 'fog' || wx === 'storm';
  const R = w.rot, C = R && R.cur;
  if (!C) {
    if (n < ROT_HERD || c.season > 2 || !wet || w.wx.n < ROT_WET || (R && R.yr === c.year)) return;
    if (rnd(w) >= ROT_START * Math.min(1, n / GOAT_MAX)) return;
    const sound = G.herd.filter((g) => w.t - g.b >= TICKS_PER_YEAR && !(g.im > w.t));
    if (!sound.length) return;
    rotBegins(w, c, sound[ri(w, sound.length)]);
    return;
  }
  let lame = 0;
  for (const g of G.herd) if (g.lm != null && !folded(g)) lame++; // the folded stand on dry straw and pass it to nobody
  // spread through the mud, hoof to hoof
  if (lame && lame < n) {
    const odds = (wet ? ROT_SPREAD : ROT_SPREAD_DRY) * lame / n * Math.min(1, n / 10); // a small herd has room to keep its feet out of the mud
    for (const g of G.herd) if (g.lm == null && !(g.im > w.t) && rnd(w) < odds) { g.lm = w.t; C.n++; R.k++; R.y++; }
  }
  // the lame mend or die
  const dead = [];
  for (const g of G.herd) {
    if (g.lm == null || g.lm === w.t) continue;
    const kid = w.t - g.b < TICKS_PER_YEAR, fd = folded(g);
    if (rnd(w) < ROT_DIE * (kid ? 2 : 1) * (fd ? PARE_DIE : 1)) { dead.push(g); continue; }
    if (fd ? w.t - g.pf >= PARE_MIN * TICKS_PER_DAY && rnd(w) < PARE_HEAL
      : w.t - g.lm >= ROT_MIN * TICKS_PER_DAY && rnd(w) < (wet ? ROT_HEAL_WET : ROT_HEAL)) { g.lm = null; g.im = w.t + ROT_IMM * TICKS_PER_DAY; }
  }
  if (dead.length) {
    G.herd = G.herd.filter((g) => !dead.includes(g));
    C.d += dead.length; R.d += dead.length; R.yd += dead.length;
    w.hides = (w.hides || 0) + dead.length; // the hide is still worth taking; the meat is not
    log(w, dead.length === 1 ? 'A lame goat that has not stood up for days dies in the straw. Its hide is kept; the carcass is dragged off and burnt.'
      : `${dead.length} lame goats die in the straw. Their hides are kept; the carcasses are dragged off and burnt.`, 'bad');
  }
  if (!G.herd.some((g) => g.lm != null)) rotEnds(w);
  for (const g of G.herd) if (g.lm == null && g.pf != null) g.pf = undefined; // walked sound out of the sick fold
}
// ---------- hoof paring and the sick fold ----------
// After foot rot has killed PARE_LEARN goats, the herder (or the healer) sees that the lame ones on dry ground mend
// and the ones left in the mud pass it on. A hurdle fold with a dry floor is put up against the pen wall, and once a
// goat has limped for PARE_SEEN, an idle adult catches it, pares the rotten horn back with a flint, washes the hoof
// (in willow-bark brew if there is a healer) and puts it in the fold. A folded goat passes it to nobody, heals at
// PARE_HEAL a day wet or dry and dies half as often. g.pf tick folded (cleared when it walks sound).
// w.pare { n pared ever, y this year, s outbreaks held to 3 or fewer, nm who saw it, at, f fold tile {x, y} | null
// (a hurdle across a corner inside the pen), wash 1 if the healer's brew is used }.
const PARE_LEARN = 2;       // goats dead of foot rot before anyone thinks of it
export const PARE_SEEN = 2 * TICKS_PER_DAY; // a goat limps this long before it is noticed
const PARE_WORK = 2;        // hours to catch, pare and wash one goat
const PARE_HEAL = 0.12;     // daily chance a folded goat walks sound (after PARE_MIN days)
const PARE_MIN = 4;
const PARE_DIE = 0.5;       // folded goats die this much as often
const PARE_TIMBER = 2;      // hurdles for the fold
function foldSite(w) {
  const G = w.goats, m = penMid(G);
  const dx = m.x - (w.fire.x + 0.5), dy = m.y - (w.fire.y + 0.5);
  const gate = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'w' : 'e') : dy > 0 ? 'n' : 's';
  const heap = Math.abs(dx) <= Math.abs(dy) ? 'e' : 's'; // where render.js stands the muck heap
  const cand = [];
  for (let k = 0; k < PEN_W; k++) { cand.push(['n', G.pen.x + k, G.pen.y - 1]); cand.push(['s', G.pen.x + k, G.pen.y + PEN_H]); }
  for (let k = 0; k < PEN_H; k++) { cand.push(['w', G.pen.x - 1, G.pen.y + k]); cand.push(['e', G.pen.x + PEN_W, G.pen.y + k]); }
  let best = null, bd = -1;
  for (const [s, x, y] of cand) {
    if (s === gate || s === heap || !inMap(x, y)) continue;
    const t = tile(w, x, y), i = idx(x, y);
    if ((t !== T.GRASS && t !== T.FOREST) || isStool(w, i)) continue;
    const dd = d2(x + 0.5, y + 0.5, w.fire.x + 0.5, w.fire.y + 0.5); // the far side, out of the way
    if (dd > bd) { bd = dd; best = { x, y }; }
  }
  return best;
}
function learnPare(w) {
  const G = w.goats, h = aliveId(w, G.hid), healer = w.heal && aliveId(w, w.heal.id);
  const herder = h && ageY(w, h) >= 14 ? h : null, who = herder || healer || elder(w);
  const f = foldSite(w);
  if (f) {
    const i = idx(f.x, f.y);
    w.timber += w.wood[i]; w.wood[i] = 0;
    setTile(w, i, T.BUILD);
  }
  w.timber = Math.max(0, w.timber - PARE_TIMBER);
  w.pare = { n: 0, y: 0, s: 0, nm: who ? who.name : null, at: w.t, f, wash: healer ? 1 : 0 };
  if (!w.techs.includes('paring')) w.techs.push('paring');
  const N = who ? who.name : 'The herder';
  milestone(w, `${N} has buried ${plural(w.rot.d, 'goat', 'goats')} that the foot rot took, and has watched the rest. The lame ones that limped up onto the dry bank mended; the ones left lying in the mud gave it to the others. ` +
    `${N} weaves hurdles into a little fold ${f ? 'against the pen wall' : 'across a corner of the pen'} and lays it with dry straw. Next time a goat limps it will be caught, the rotten horn pared back to clean hoof with a flint, the foot washed${healer ? ` in ${healer === who ? '' : healer.name + '\'s '}willow-bark brew` : ' in sea water'}, and the goat put in the fold until it walks sound. ${w.name} learns to pare hooves.`);
}
function pareTask(w, p) {
  if (!w.pare || !w.goats || !w.rot || !w.rot.cur) return null;
  const G = w.goats;
  let best = null;
  for (const g of G.herd) if (g.lm != null && g.pf == null && w.t - g.lm >= PARE_SEEN && w.res['v' + g.id] == null && (!best || g.lm < best.lm)) best = g;
  if (!best) return null;
  return { k: 'pare', key: 'v' + best.id, x: Math.floor(penMid(G).x), y: G.pen.y + PEN_H, h: PARE_WORK };
}
function pareDone(w, p, t, pop) {
  const G = w.goats, P = w.pare;
  const g = G && G.herd.find((o) => 'v' + o.id === t.key);
  if (!g || g.lm == null || g.pf != null || !P) return;
  g.pf = w.t; P.n++; P.y++;
  if (w.rot.cur) w.rot.cur.f = (w.rot.cur.f || 0) + 1;
  pop('pared', 'muted');
  if (P.n === 1) milestone(w, `${p.name} catches the limping goat by the horns, sits on it in the straw and pares the soft grey horn away with a flint until the hoof shows pink and clean. ` +
    `The foot is washed${P.wash ? ' in willow-bark brew' : ''}, the goat is lifted over the hurdles into the dry fold, and it stands there on three legs, bleating at the others. The first hoof is pared on ${w.name}.`);
}
const folded = (g) => g.pf != null && g.lm != null;
function rotBegins(w, c, g) {
  const first = !w.rot;
  if (first) w.rot = { n: 0, k: 0, d: 0, y: 0, yd: 0, yr: 0, last: 0, cur: null };
  const R = w.rot, G = w.goats;
  g.lm = w.t;
  R.n++; R.k++; R.y++; R.yr = c.year; R.last = w.t;
  R.cur = { at: w.t, n: 1, d: 0 };
  const h = aliveId(w, G.hid), who = h || elder(w), wet = w.wx.k === 'fog' ? 'fog' : 'rain';
  if (first) {
    if (!w.techs.includes('footrot')) w.techs.push('footrot');
    milestone(w, `After ${spellLen(w.wx.n).toLowerCase()} of ${wet} the goat pen is a wallow of mud and dung, churned knee-deep by the gate. ${who ? who.name : 'The herder'} finds one of the goats holding up a foreleg and hobbling on three; between the claws the hoof is soft, grey and stinking. The lame ones lie down in the straw and will not go out to graze, and their milk dries up. Nobody on ${w.name} has seen it before, and nobody knows what to do for it but wait for the ground to dry.`);
  } else log(w, `After ${spellLen(w.wx.n).toLowerCase()} of ${wet} a goat is limping again. The foot rot is back in the muddy pen.`, 'bad');
}
function rotEnds(w) {
  const R = w.rot, C = R.cur;
  R.cur = null;
  const text = `The pen dries out and the last lame goat walks sound again. The foot rot laid ${plural(C.n, 'goat', 'goats')} lame${C.d ? ` and killed ${C.d}` : ', and every one came through'}.`;
  const P = w.pare;
  if (P && C.f) {
    if (C.n <= 3) P.s++;
    const t2 = `The last goat is let out of the sick fold. The foot rot laid ${plural(C.n, 'goat', 'goats')} lame${C.d ? ` and killed ${C.d}` : ''}; ${plural(C.f, 'hoof was', 'hooves were')} pared.`;
    if (C.n <= 3 && P.s === 1) milestone(w, `${t2} ${P.nm || 'The herder'} was right: caught early and kept out of the mud, it went no further.`);
    else log(w, t2, C.d ? 'bad' : 'good');
  } else if (R.n === 1) milestone(w, text); else log(w, text, C.d ? 'bad' : 'info');
  if (!P && R.d >= PARE_LEARN && w.goats.herd.length) learnPare(w);
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
  if (w.wx && w.wx.k === 'fog') w.wx.gl = (w.wx.gl || 0) + 1;
  b.rest = w.t + 48;
  const L = b.k === 'lone' && w.lone.cur;
  if (L) {
    b.rest = w.t + LONE_REST * TICKS_PER_DAY; L.g++; w.lone.yh = (w.lone.yh || 0) + 1;
    const t2 = `${L.nm} trots out of the trees in the middle of the day, takes a goat by the neck and is gone before anyone can shout.`;
    if (L.g === 1) milestone(w, `${t2} It does not even run.`); else log(w, t2, 'bad');
    return;
  }
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
  const kept = wx === 'fog' && fogKept(w);
  if (kept && h === GOAT_OUT && G.herd.length) w.lore.fk++;
  const out = G.herd.length > 0 && h >= GOAT_OUT && h < GOAT_HOME && wx !== 'storm' && wx !== 'snow' && !(c.season === 3 && wx === 'cold') && !fest && !kept;
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
    if (!out || g.lm != null) { // back into the pen, each to its corner of the straw; the lame stay bedded down
      g.tx = null;
      const F = w.pare && g.pf != null && g.lm != null && (w.pare.f || { x: G.pen.x, y: G.pen.y }), fk = g.id % 4;
      const sx = F ? F.x + 0.25 + (fk % 2) * 0.45 : G.pen.x + 0.35 + (k % 4) * 0.42, sy = F ? F.y + 0.4 + (fk >> 1) * 0.4 : G.pen.y + 0.45 + (Math.floor(k / 4) % 4) * 0.4;
      if (moveToward(g, sx, sy, g.lm != null ? GOAT_SPEED / 2 : SPEED)) g.out = 0;
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
        if (f && !f.fence && !hedged(w, f) && f.stage === 'planted') { f.growth = Math.max(0, Math.round((f.growth - GOAT_NIBBLE) * 10000) / 10000); G.ate++; }
        else if (f && !f.fence && !hedged(w, f) && f.stage === 'ripe') { f.lost = Math.min(0.8, Math.round(((f.lost || 0) + 0.02) * 100) / 100); G.ate++; }
      }
    }
    if (--g.h <= 0) g.tx = null;
  }
}
function herdTask(w, p) {
  const G = w.goats;
  if (!G || G.hid !== p.id || !G.at || !G.herd.some((g) => g.lm == null) || p.hurt || p.haul) return null;
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
    else if (o.task && o.task.sea && w.canoe) { tx = w.canoe.bx + 0.5 + k * 0.6; ty = w.canoe.by + 0.4; d.lie = 1; } // waits on the sand for the dugout to come in
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
  if (!L) {
    if (fog && h >= 9 && h <= 15 && rnd(w) < LOST_ODDS) {
      if (fogKept(w) && rnd(w) < FOG_HEED) w.lore.fc++; // kept by the houses, as the eldest said
      else strays(w);
    }
    return;
  }
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
// the roll of names: everyone whose grave has sunk into the turf, or who sailed away, so the family
// tree keeps them. Only the Families view reads it; nothing in the step path looks at it.
function rollCall(w, g) {
  if (!w.roll) w.roll = [];
  const r = { id: g.id, n: g.n, x: g.x, b: g.b, d: g.d, why: g.why, m: g.m, f: g.f };
  if (g.pt != null) r.pt = g.pt;
  if (g.by) r.by = g.by;
  w.roll.push(r);
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
  if (s < 0) { old = w.graves.shift(); s = old.s; Y.sunk++; rollCall(w, old); }
  const g = { id: p.id, n: p.name, x: p.sex, b: p.born, d: w.t, why, m: p.mother, f: p.father, s };
  if (p.partner != null) g.pt = p.partner;
  if (p.dd && p.dd.by) { g.by = byname(p); g.dd = deedsText(p.dd); }
  if (p.cl) g.cl = p.cl.nm; // nobody to hand the wolf-skin cloak to: buried in it
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
  { k: 'r', mark: 3, by: 'the Swift' },       // midsummer races won
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
  if (d.u) out.push('drove the bear off with a brand ' + n(d.u, 'time', 'times'));
  if (d.n) out.push('tended the sick ' + n(d.n, 'time', 'times'));
  if (d.r) out.push('won the midsummer race ' + n(d.r, 'time', 'times'));
  if (d.s) out.push('hauled ' + n(d.s, 'stone', 'stones') + ' up to the ring');
  if (d.e) out.push('dug and lined ' + n(d.e, 'ring', 'rings') + ' of the well');
  if (d.c) out.push('carried ' + n(d.c, 'castaway', 'castaways') + ' up off the beach');
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
    r: `${p.name} slaps the hazel stake and is back at the bonfire first for the ${ORD[n] || `${n}th`} midsummer, and the oak wreath goes on ${poss(p)} head before ${he} has caught ${poss(p)} breath. From now on the children call ${him} ${full}, and race each other along the paths to be next.`,
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
  cloakPass(w, p);
  bury(w, p, why);
  for (const o of w.people) if (o.partner === p.id) o.partner = null;
}

function lifeAndDeath(w, c) {
  const pop = w.people.length;
  const wx = w.wx ? w.wx.k : 'clear';
  const bitter = wx === 'cold' && c.season === 3; // a deep frost reaches the frail even by the fire
  const fed = (cheeseFed(w) ? CHEESE_GUARD : 1) * (1 - loomCover(w) * BLANKET_GUARD); // a wedge of cheese by the fire on the bitter days, a blanket on the bed
  const dry = thirst(w) * SPRING_THIRST * (wx === 'heat' ? 2 : 1); // too little water carried up from the pool yesterday
  for (const p of w.people) {
    if (p.dead) continue;
    const a = ageY(w, p);
    const frail = a < 6 || a > 55;
    let risk = 0.00003;
    if (dry && frail) risk += dry;
    if (a > 45) { const k = (a - 45) / 30; risk += k * k * k * 0.012; }
    if (a < 2) risk += 0.0002;
    if (w.stats.cold && frail) risk += 0.006 * fed;
    if (bitter && frail) risk += 0.0008 * fed;
    if (wx === 'heat' && a > 65) risk += 0.0006;
    if (p.hunger > 12) risk += 0.0015 * (p.hunger - 12) * (a < 6 || a > 60 ? 2 : 1);
    if (rnd(w) < risk) {
      const why = p.hunger > 12 ? 'starved' : (w.stats.cold || bitter) && frail ? 'died of the cold' : dry && frail && dry * 2 >= risk ? 'died of thirst' : wx === 'heat' && a > 65 ? 'died in the heat' : 'passed away';
      if (why === 'died of thirst') { w.spring.d++; }
      else if (why !== 'passed away' && w.wx) w.wx.d++;
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
const matches = (w, f, o) => !o.dead && o.sex === 'm' && o.partner == null && ageY(w, o) >= 17 &&
  Math.abs(ageY(w, o) - ageY(w, f)) < 14 && !sibling(f, o) && f.mother !== o.id && o.mother !== f.id && !apart(w, f, o) && !inLove(w, f) && !inLove(w, o) && !vigilShy(f) && !vigilShy(o);
function mate(w, f) {
  return w.people.find((o) => matches(w, f, o));
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
    const frozen = w.wx && w.wx.k === 'cold'; // nobody sows the frost-black rows again while the cold holds
    for (const f of w.fields) if (f.stage === 'ripe') c.ripe.push(f); else if (f.stage === 'fallow' && f.sa == null && !(frozen && f.fr != null)) c.fallow.push(f);
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
  const expect = (w.fields.length + muckCover(w) * MUCK_GAIN) * FIELD_YIELD * 0.9;
  const pop = w.people.length;
  return expect < pop * DAYS_PER_YEAR * 1.3 || (w.food < pop * 120 && w.fields.length < pop * 2.5);
}

function release(w, p) {
  if (p.task && p.task.sea && w.canoe) { // called in off the water: back on the beach at once
    p.x = w.canoe.bx + 0.5; p.y = w.canoe.by + 0.5; w.canoe.at = null;
  }
  if (p.task && p.task.k === 'water' && w.spring) { // back with the water, or the carry is given up
    if (w.spring.o > 0) w.spring.o--;
    if (p.task.b === 1) { w.spring.c++; w.spring.n++; w.spring.yc++; } // called in on the way home: the water still comes in with them
  }
  if (p.task && p.task.key) {
    delete w.res[p.task.key];
    const k0 = p.task.key.charCodeAt(0);
    if (k0 === 103 || k0 === 113) { const cc = cacheOf(w); cc.rel = (cc.rel || 0) + 1; } // a fence (g) or hedge (q) claim is given up: look again
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

// ok() is only asked about a candidate that would be the new nearest; every ok() is a pure test, so
// this picks the same one as testing them all
function nearest(list, p, ok) {
  let best = null, bd = 1e9;
  const px = p.x, py = p.y;
  for (let k = 0; k < list.length; k++) {
    const o = list[k], dx = o.x + 0.5 - px, dy = o.y + 0.5 - py, dd = dx * dx + dy * dy;
    if (dd < bd && ok(o)) { bd = dd; best = o; }
  }
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
  // the spring has failed: to the pool in the woods for water
  const ak = waterTask(w, p, c);
  if (ak) return ak;
  // rust in the grain: pull the spotted plants before it travels
  const rk = rogueTask(w, p);
  if (rk) return rk;
  // a limping goat: catch it, pare the hoof and put it in the fold
  const vk = pareTask(w, p);
  if (vk) return vk;
  // a whale on the beach: knives out before it turns
  const wk = whaleTask(w, p);
  if (wk) return wk;
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
  // the weaver at the loom against the house wall
  if (w.loom && w.loom.id === p.id) {
    const lk = loomTask(w, p, c);
    if (lk) return lk;
  }
  // the brewer at the vat, when the jugs run low and the stores can spare a sack
  if (w.ale && w.ale.id === p.id) {
    const bk = brewTask(w, p, c);
    if (bk) return bk;
  }
  // the honey, from the logs that hold more than the bees need for the winter
  const ek = beeTask(w, p, c);
  if (ek) return ek;
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
  // the bear pit by the bee logs, dug in the year after a bear has been at them
  const bpk = pitTask(w, p, c);
  if (bpk) return bpk;
  // the spring dug down into a well while the water is low
  const wlk = wellTask(w, p, c);
  if (wlk) return wlk;
  // the hunt
  const hk = hunt(w, p, c);
  if (hk) return hk;
  // in early winter, down to the seals on the sand with a club
  const sk = sealTask(w, p, c);
  if (sk) return sk;
  // fences around the grain by the woods
  const gk = fenceTask(w, p, c);
  if (gk) return gk;
  // timber
  if (w.timber < woodTarget(w)) {
    const bt = nearestTimber(w, p);
    if (bt) return { k: 'chop', key: 't' + bt.i, x: bt.x, y: bt.y, h: 3 };
  }
  // hawthorn slips along the fields by the woods, in autumn and winter
  const qk = hedgeTask(w, p, c);
  if (qk) return qk;
  // the summer milk in the pails: curdled, pressed and set out on the rack
  const zk = cheeseTask(w);
  if (zk) return zk;
  // a scarecrow for the fields, or a found-out one moved where the rooks have not seen it
  const sck = scareTask(w, c);
  if (sck) return sck;
  // muck from the heap by the pen, forked over the bare fields after the harvest
  const mk = muckTask(w, p);
  if (mk) return mk;
  // the dugout: hollowing a new one, or out to the deep water, once the woodpile is seen to
  const uk = canoeTask(w, p, c);
  if (uk) return uk;
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

// ---------- the dugout ----------
// ---------- coppice ----------
// A hazel cut low does not die: by the next spring a ring of straight poles has sprung from the stump. Once
// the island sees it, a tree felled to the stump near the village is left as a stool instead of grubbed out.
// Fields and houses leave the stools be, the deer and goats are kept off them, and they grow back far
// faster than wild wood, so the woodpile still has trees in reach once the fields have eaten the woods.
// w.copse { s: [tile indices of the stools], n poles cut from them ever, y timber from them this year,
//   nm who first kept one, at tick learned }
const COPSE_YEAR = 8;        // from this year on
const COPSE_SPARK = 0.05;    // daily chance in spring that someone notices the shoots
const COPSE_R2 = 14 * 14;    // stools are kept within 14 tiles of the hearth (squared)
const COPSE_BASE = 10;       // stools kept at most: this many,
const COPSE_PER_HOUSE = 1.5; // and this many more for each house
const COPSE_MAX = 150;
const COPSE_GROW = 0.1;      // daily chance from spring to autumn that a stool puts on another measure of poles
const COPSE_FIRST = 6;       // trees cut to the stool on the day it is learned
function copseCap(w) {
  let h = 0;
  for (const b of w.buildings) if (isHouse(b)) h++;
  return Math.min(COPSE_MAX, COPSE_BASE + Math.floor(h * COPSE_PER_HOUSE));
}
// a mask of stool tiles, rebuilt whenever the list changes (it is only ever pushed to or replaced)
export function isStool(w, i) {
  const K = w.copse;
  if (!K) return false;
  const c = cacheOf(w);
  if (c.copS !== K.s || c.copL !== K.s.length) {
    c.copS = K.s; c.copL = K.s.length; c.cop = new Uint8Array(MAP * MAP);
    for (const j of K.s) c.cop[j] = 1;
  }
  return c.cop[i] === 1;
}
// a tree near the hearth felled to the stump: kept as a stool if there is room for one more
function keepStool(w, x, y, i) {
  const K = w.copse;
  if (!K || isStool(w, i) || K.s.length >= copseCap(w) || d2(x, y, w.fire.x, w.fire.y) > COPSE_R2) return false;
  K.s.push(i);
  setTile(w, i, T.FOREST); // the map has changed for the field and house searches
  return true;
}
function learnCopse(w, c) {
  if (c.season !== 0 || c.year < COPSE_YEAR || !w.techs.includes('woodcut') || rnd(w) >= COPSE_SPARK) return;
  let who = null;
  for (const p of w.people) { const a = ageY(w, p); if (!p.dead && !p.sick && a >= 16 && a < 60 && (!who || p.born < who.born)) who = p; }
  if (!who) return;
  w.copse = { s: [], n: 0, y: 0, nm: who.name, at: w.t };
  w.techs.push('coppice');
  // the trees nearest the hearth are cut to the stool at once
  const near = [];
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    const i = idx(x, y), dd = d2(x, y, w.fire.x, w.fire.y);
    if (w.tiles[i] === T.FOREST && w.wood[i] >= 6 && dd <= COPSE_R2 && w.res['t' + i] == null) near.push([dd, i]);
  }
  near.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let got = 0;
  for (const [, i] of near.slice(0, COPSE_FIRST)) { got += w.wood[i]; w.wood[i] = 0; keepStool(w, i % MAP, (i - (i % MAP)) / MAP, i); }
  w.timber = Math.round((w.timber + got) * 100) / 100;
  const P = pron(who), Pc = P[0].toUpperCase() + P.slice(1);
  milestone(w, `Out at the edge of the woods ${who.name} stops by a hazel ${P} cut down two winters ago. The stump has not died: a ring of straight green poles has sprung up from it, taller than a child. ${Pc} says a tree cut low grows back faster than a seedling ever could, and that the stumps nearest the village must be left in the ground and fenced from the goats. That day ${plural(near.slice(0, COPSE_FIRST).length, 'tree is', 'trees are')} cut to the stool. ${w.name} learns to coppice.`);
}
function copseDay(w, c) {
  const K = w.copse;
  if (!K) { learnCopse(w, c); return; }
  if (c.doy === 0) K.y = 0; // last year's poles are already in the history
  // a stool that has been burnt out, built on or ploughed is gone
  if (K.s.some((i) => w.tiles[i] !== T.FOREST)) K.s = K.s.filter((i) => w.tiles[i] === T.FOREST);
  if (c.season === 3) return;
  for (const i of K.s) if (w.wood[i] < TREE_MAX && rnd(w) < COPSE_GROW) w.wood[i]++;
}

// After watching the far isle's dugout come in a few summers, the island's best fisher fells an oak above
// the landing beach and burns and scrapes it hollow, one spell of work a dry day. Once afloat, one islander
// at a time paddles it out past the surf on calm mornings from spring to autumn, fishes the deep water and
// is back on the sand by mid-afternoon. The deep water is a stock of its own, apart from the shallows.
// A storm can drag the boat off the beach and smash it, and the sun splits it in time; then, once there is
// timber to spare, another oak is felled.
// w.canoe { hid maker id, nm maker name, bx, by beach, lx, ly water off it, wk hours of hollowing done (-1: no boat
//   being made), dd last day dug, ok afloat, n boats made, lost boats lost, d fish in the deep, t trips, f fish ever,
//   y fish this year, at id of whoever is out in it, sp tick the last boat was finished }
const CANOE_SEEN = 2;        // far-isle visits before anyone thinks to copy their boat
const CANOE_SPARK = 0.04;    // daily chance in spring and summer, once seen and timber to spare
const CANOE_WOOD = 24;       // timber: the oak itself
const CANOE_WORK = 40;       // hours of burning and scraping, at most one 4-hour spell a day
const CANOE_OUT = 7;         // tiles out past the surf to the fishing grounds, at most
const CANOE_HOURS = 7;       // hours from pushing off to landing again
const CANOE_BACK = 3;        // turn for home with this many hours left
const CANOE_ROW = 3;         // tiles per hour at the paddle
const DEEP_CAP = 220;        // fish in the deep water off the landing
const DEEP_REGEN = 4;        // per day, spring to autumn (1 in winter)
const CANOE_STORM = 0.008;   // chance per storm day that the boat is dragged off the sand and smashed
const CANOE_SPLIT = 0.05;    // chance each new year that the old wood has split past mending
function canoeMaker(w) { // the best fisher who has the years and the time for it
  let best = null, bs = -1;
  const busy = [w.heal && w.heal.id, w.goats && w.goats.hid, w.horn && w.horn.hid, w.pot && w.pot.id];
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || a < 16 || a > 50 || p.sick || p.hurt || busy.includes(p.id)) continue;
    const sc = (p.dd && p.dd.f) || 0;
    if (sc > bs) { bs = sc; best = p; }
  }
  return best;
}
function learnCanoe(w, c) {
  if (c.season > 1 || !w.isle || w.isle.n < CANOE_SEEN || !w.techs.includes('farisle') || w.timber < CANOE_WOOD + HOUSE_COST || rnd(w) >= CANOE_SPARK) return;
  const L = landAt(w, w.fire.x, w.fire.y, 0), who = canoeMaker(w);
  if (!L || !who) return;
  w.timber = Math.round((w.timber - CANOE_WOOD) * 100) / 100;
  w.canoe = { hid: who.id, nm: who.name, bx: L.bx, by: L.by, lx: L.lx, ly: L.ly, wk: 0, dd: -1, ok: 0, n: 0, lost: 0, d: DEEP_CAP, t: 0, f: 0, y: 0, at: null, sp: -1 };
  w.techs.push('canoe');
  const P = pron(who), Pc = P[0].toUpperCase() + P.slice(1);
  const n = w.isle.n, nw = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || n;
  milestone(w, `${who.name} has stood on the beach ${nw} summers now and watched the far isle's dugout come in over the swell. This spring ${P} fells a tall straight oak above the landing, lights small fires along its back and scrapes out the charcoal with a shell, a little every dry day. ${Pc} means to fish where the big ones are, out past the surf. ${w.name} learns to hollow a dugout.`);
}
function canoeDay(w, c) {
  const K = w.canoe;
  if (!K) { learnCanoe(w, c); return; }
  if (c.doy === 0) { K.y = 0; if (w.squall) w.squall.y = 0; } // last year's catch is already in the history
  if (w.squall && w.squall.cur) squallGone(w);
  K.d = Math.min(DEEP_CAP, K.d + (c.season < 3 ? DEEP_REGEN : 1));
  if (K.ok && K.at == null) {
    const storm = w.wx && w.wx.k === 'storm' && rnd(w) < CANOE_STORM;
    const split = !storm && c.doy === 0 && w.t - K.sp > TICKS_PER_YEAR && rnd(w) < CANOE_SPLIT;
    if (storm || split) {
      K.ok = 0; K.wk = -1; K.lost++;
      const yrs = Math.max(1, Math.floor((w.t - K.sp) / TICKS_PER_YEAR));
      if (split) w.timber = Math.round((w.timber + 4) * 100) / 100;
      log(w, storm
        ? `In the night the storm drags the dugout off the sand. In the morning its halves lie on the rocks below the landing.`
        : `The dugout has split along the grain after ${plural(yrs, 'year', 'years')} of sun and salt, too far to mend. It is broken up for the fire.`, 'bad');
    }
  }
  if (!K.ok && K.wk < 0 && c.season <= 1 && w.timber >= CANOE_WOOD + HOUSE_COST * 2 && !needHouse(w)) {
    w.timber = Math.round((w.timber - CANOE_WOOD) * 100) / 100;
    K.wk = 0;
    log(w, 'An oak is felled above the landing beach for a new dugout.', 'info');
  }
}
// a spot on the deep water for the day, reached in a straight line from the landing over open sea
function canoeGround(w, K) {
  const ox = K.lx - K.bx, oy = K.ly - K.by;
  for (let k = 0; k < 6; k++) {
    const r = 2 + ri(w, CANOE_OUT - 1), s = ri(w, 7) - 3;
    const x = K.lx + ox * r + oy * s, y = K.ly + oy * r + ox * s;
    if (inMap(x, y) && seaLine(w, K.lx + 0.5, K.ly + 0.5, x + 0.5, y + 0.5)) return { x, y };
  }
  return { x: K.lx, y: K.ly };
}
function seaLine(w, x0, y0, x1, y1) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2);
  for (let i = 0; i <= n; i++) if (tile(w, Math.floor(x0 + ((x1 - x0) * i) / n), Math.floor(y0 + ((y1 - y0) * i) / n)) !== T.WATER) return false;
  return true;
}
function canoeTask(w, p, c) {
  const K = w.canoe;
  if (!K || c.season === 3 || w.res.u != null || p.hurt) return null;
  const wx = w.wx ? w.wx.k : 'clear';
  if (wx === 'fog' || wx === 'storm' || wx === 'snow') return null;
  if (!K.ok) {
    if (K.wk < 0 || K.dd === c.day || c.hour > 13 || wx === 'rain') return null; // the fires along its back will not burn in the wet
    if (!lineOfLand(w, p.x, p.y, K.bx + 0.5, K.by + 0.5)) return null;
    return { k: 'dig', key: 'u', x: K.bx, y: K.by, h: 4 };
  }
  if (c.hour > 8 || K.d < 12 || (w.fauna && w.fauna.fear > w.t) || (w.fest && w.fest.on === c.day)) return null;
  if (!lineOfLand(w, p.x, p.y, K.bx + 0.5, K.by + 0.5)) return null;
  const g = canoeGround(w, K);
  return { k: 'paddle', key: 'u', x: K.bx, y: K.by, h: CANOE_HOURS, gx: g.x, gy: g.y, sw: 0 };
}
function canoeDig(w, p, c) {
  const K = w.canoe;
  if (!K || K.ok || K.wk < 0) return null;
  K.wk = Math.min(CANOE_WORK, K.wk + 4); K.dd = c.day;
  if (K.wk < CANOE_WORK) return Math.round((K.wk / CANOE_WORK) * 100) + '%';
  K.ok = 1; K.n++; K.sp = w.t;
  if (K.n === 1) milestone(w, `${p.name === K.nm ? `${K.nm} and a crowd of helpers` : `${p.name} and ${K.nm}`} roll the hollowed oak down the sand on logs and push it out into the surf. It wallows, rights itself and floats. ${w.name} has a boat of its own, and the deep water past the breakers is no longer out of reach.`);
  else log(w, `A new dugout is rolled down the sand and floats. ${w.name} can fish the deep water again.`, 'good');
  return 'afloat';
}
// the trip: out to the day's ground, fish there, turn for home with CANOE_BACK hours left
function paddle(w, p, t, c, fx) {
  const K = w.canoe;
  p.asleep = false;
  if (K && w.squall !== undefined && (K.ok || t.sw) && squallHour(w, p, t, c, fx)) return;
  if (!K || !K.ok) { release(w, p); return; }
  t.h--;
  if (t.h > CANOE_BACK) { moveToward(p, t.gx + 0.5, t.gy + 0.5, CANOE_ROW); return; }
  if (!moveToward(p, K.bx + 0.5, K.by + 0.5, CANOE_ROW)) return;
  const got = Math.min(K.d, 12 + ri(w, 10));
  K.d -= got; K.f += got; K.y += got; K.t++;
  w.food += got;
  deed(w, p, 'f', got);
  if (fx && got) fx.push({ x: K.bx + 0.5, y: K.by, text: '+' + got, color: 'fish' });
  t.sea = 0; K.at = null;
  release(w, p);
  if (K.t === 1) milestone(w, `${p.name} comes in through the surf in the dugout with ${got} fish in the bottom of it, fat ones the size of a forearm that never come near the beach. The children run down the sand to see.`);
}

// ---------- squalls ----------
// Out past the surf the sky can turn in minutes. On a hot afternoon, in autumn, or the day before a storm, a squall may
// come down on the deep water while the dugout is out. The paddler turns for home at half speed, and each hour it blows
// the boat may roll over; then they swim for the landing, where the village stands watching. The sea keeps a few.
// w.squall { n squalls, y this year, h came in through it, s swam ashore, d drowned, b boats lost,
//   cur { id, nm, h hours it still blows, x, y where it came down, sw in the water, w boat comes in whole, m, f, pt kin, n onlookers } | null,
//   last { nm, how ('in' | 'swam' | 'drowned' | 'rode'), y } }
const SQUALL_TRIPS = 5;      // trips made before the first one
const SQUALL_FROM = 10, SQUALL_TO = 14; // the afternoon hours it can come down in
const SQUALL_ODDS = 0.002;   // chance per hour at sea in those hours on a mild spring or summer day; x2 in heat, x2 in autumn, x3 before a storm
const SQUALL_LONG = 2;       // hours it blows, plus up to 2 more
const SQUALL_ROW = 1.5;      // tiles per hour at the paddle, into the wind
const SQUALL_TIP = 0.2;      // chance per hour it blows that the dugout rolls over
const SQUALL_SWIM = 2;       // tiles per hour, swimming
const SQUALL_SINK = 0.07;    // chance per hour in the water that the sea keeps them (twice that for the old and the young)
const SQUALL_WHOLE = 0.4;    // chance the rolled dugout comes in on the tide whole
const SQUALL_HURT = 5;       // days a swimmer lies up afterwards
const SQUALL_CROWD = 12;     // onlookers on the sand besides the kin
const himHer = (p) => (p.sex === 'f' ? 'her' : 'him');
function squallHour(w, p, t, c, fx) {
  const K = w.canoe;
  let Q = w.squall && w.squall.cur;
  if (Q && Q.id !== p.id) { w.squall.cur = Q = null; }
  if (!Q) {
    if (t.sw || c.hour < SQUALL_FROM || c.hour > SQUALL_TO || K.t < SQUALL_TRIPS) return false;
    const wx = w.wx ? w.wx.k : 'clear';
    const odds = SQUALL_ODDS * (wx === 'heat' ? 2 : 1) * (c.season === 2 ? 2 : 1) * (w.wx && w.wx.nx === 'storm' ? 3 : 1);
    if (rnd(w) >= odds) return false;
    Q = squallBegins(w, p, c);
  }
  const S = w.squall, bx = K.bx + 0.5, by = K.by + 0.5;
  if (Q.h > 0) Q.h--;
  if (Q.sw) { // in the water, swimming for the landing
    const a = ageY(w, p), fl = !!(w.seal && w.seal.fl != null);
    if (rnd(w) < SQUALL_SINK * (a > 50 || a < 16 ? 2 : 1) * (Q.h > 0 ? 1 : 0.5) * (fl ? FLOAT_SINK : 1)) {
      S.d++;
      if (fl) w.seal.fl = null; // the float went with them
      squallEnds(w, p, Q, 'drowned', c);
      die(w, p, 'drowned off the landing when a squall rolled the dugout over');
      log(w, Q.w ? 'The dugout comes in on the evening tide, upside down and empty.' : 'For days after, pieces of the dugout wash up along the beach.', 'bad');
      return true;
    }
    if (!moveToward(p, bx, by, SQUALL_SWIM)) return true;
    S.s++;
    const o = w.people.find((q) => !q.dead && q.task && q.task.k === 'shore' && ageY(w, q) >= 14);
    p.hurt = Math.max(p.hurt || 0, w.t + SQUALL_HURT * TICKS_PER_DAY);
    squallEnds(w, p, Q, 'swam', c);
    if (fl) w.seal.fs++;
    log(w, `${o ? `${o.name} wades out into the surf and drags ${p.name} up the sand` : `${p.name} crawls up the sand on ${poss(p)} hands and knees`}, half drowned and coughing up sea water${fl ? ', still hugging the sealskin float' : ''}. ${Q.w ? 'The dugout washes in after, upside down but whole.' : 'The dugout is gone; only the paddle comes in.'}`, 'good');
    release(w, p);
    return true;
  }
  t.h = Math.min(t.h - 1, CANOE_BACK); // turn for home
  if (Q.h > 0 && rnd(w) < SQUALL_TIP) {
    Q.sw = 1; t.sw = 1; Q.w = rnd(w) < SQUALL_WHOLE ? 1 : 0;
    const far = Math.round(Math.sqrt((p.x - bx) * (p.x - bx) + (p.y - by) * (p.y - by)));
    log(w, `A wave comes green over the side and the dugout rolls. ${p.name} is in the water, ${far <= 2 ? 'close in under the surf' : `a long swim from the landing`}.`, 'bad');
    return true;
  }
  if (moveToward(p, bx, by, Q.h > 0 ? SQUALL_ROW : CANOE_ROW)) { // in through the surf
    const got = Math.min(K.d, ri(w, 6));
    K.d -= got; K.f += got; K.y += got; K.t++;
    w.food += got;
    if (fx && got) fx.push({ x: K.bx + 0.5, y: K.by, text: '+' + got, color: 'fish' });
    S.h++;
    squallEnds(w, p, Q, 'in', c);
    log(w, `${p.name} comes in through the surf half swamped, bailing with both hands. The catch went over the side to keep the dugout up${got ? `, all but ${got} fish` : ''}.`, 'good');
    t.sea = 0; K.at = null;
    release(w, p);
    return true;
  }
  if (Q.h === 0) { // it blows over before they are in
    squallEnds(w, p, Q, 'rode', c);
    log(w, `The squall blows over as fast as it came. ${p.name} is still afloat, bailing, and paddles on for the landing.`, 'good');
  }
  return true;
}
function squallBegins(w, p, c) {
  if (!w.squall) w.squall = { n: 0, y: 0, h: 0, s: 0, d: 0, b: 0, cur: null, last: null };
  const S = w.squall;
  S.n++; S.y++;
  const Q = S.cur = { id: p.id, nm: p.name, h: SQUALL_LONG + ri(w, 3), x: p.x, y: p.y, sw: 0, w: 0, m: p.mother, f: p.father, pt: p.partner, n: 0 };
  if (!w.techs.includes('squall')) w.techs.push('squall');
  if (S.n === 1) milestone(w, `Out on the deep water ${p.name} looks up from the line. The sky over the sea has gone black in the time it takes to haul a fish, and a wall of rain is walking across the water toward the dugout. On the beach the shore fishers shout and point, and soon all of ${w.name} is running down to the landing to watch ${himHer(p)} fight the paddle home. Nobody knew the weather out there could turn so fast.`);
  else log(w, `A squall comes down on the deep water with ${p.name} out in the dugout. Half of ${w.name} runs down to the landing to watch.`, 'bad');
  return Q;
}
function squallEnds(w, p, Q, how, c) {
  const S = w.squall, K = w.canoe;
  S.cur = null;
  S.last = { nm: p.name, how, y: c.year };
  if ((how === 'swam' || how === 'drowned') && !Q.w && K) { K.ok = 0; K.wk = -1; K.lost++; S.b++; }
}
// the paddler is no longer out there (died at sea of something else, or called in): nobody waits on the sand
function squallGone(w) {
  const Q = w.squall.cur, o = aliveId(w, Q.id);
  if (!o || !o.task || !o.task.sea) w.squall.cur = null;
}
// while it blows, the paddler's kin and anyone with nothing pressing stand on the landing beach and watch the sea
function shoreWatch(w, p, a) {
  squallGone(w);
  const Q = w.squall.cur, K = w.canoe;
  if (!Q || !K) return false;
  if (!p.task || p.task.k !== 'shore') {
    if (a < 6 || p.sick || p.hurt) return false;
    const kin = Q.pt === p.id || Q.m === p.id || Q.f === p.id || p.mother === Q.id || p.father === Q.id;
    const k = p.task ? p.task.k : 'idle';
    if (!kin && (a < 14 || Q.n >= SQUALL_CROWD || (k !== 'idle' && k !== 'forage' && k !== 'fish'))) return false;
    if (!kin) Q.n++;
    release(w, p);
    const dx = K.bx - K.lx, dy = K.by - K.ly, back = ((p.id * 7) % 5) * 0.2, side = ((p.id * 13) % 9) * 0.1 - 0.4;
    p.task = { k: 'shore', x: K.bx, y: K.by, h: 99, ox: dx * back + dy * side, oy: dy * back + dx * side };
  }
  p.asleep = false;
  walk(w, p, K.bx + 0.5 + p.task.ox, K.by + 0.5 + p.task.oy);
  return true;
}

// ---------- seals ----------
// Once the dugout has been out on the deep water for a while, grey seals follow the fish in and take to a quiet
// beach out of sight of the village to haul out. They eat from the same deep water as the dugout, and every
// winter they pup on the sand, so the herd grows and the catch shrinks. Once the paddlers have seen what the
// seals cost them, the hunters go down in the winter with clubs: meat for the pot, blubber for the fire and a
// skin. A sealskin sewn up and blown full like a bladder rides in the dugout; whoever a squall rolls into the
// sea hangs on to it, and the sea keeps far fewer.
// w.seal { x, y haul-out (a sand tile), dx, dy toward the sea, n herd, p pups this winter, e fish eaten ever,
//   ye this year, k taken ever, yk taken this winter, d day last tried, s skins kept, fl tick the float was sewn
//   (null: none in the boat), fn floats sewn, fs swimmers it kept up, b bites, nm who first saw them, at tick,
//   h tick the hunters first went down (null: not yet), hn who led them }
const SEAL_TRIPS = 40;       // trips out before the seals have followed the dugout in
const SEAL_SPARK = 0.03;     // daily chance in spring and summer after that
const SEAL_FIRST = 5;        // in the first herd
const SEAL_MAX = 16;         // the beach holds no more
const SEAL_EAT = 5;          // seals that eat one fish a day between them from the deep water
const SEAL_PUP = 285;        // the day of the year the pups are born on the sand (early winter)
const SEAL_WHITE = 330;      // and the day their white coats are gone
const SEAL_NOTICE = 500;     // fish eaten before the paddlers see what the seals cost them
const SEAL_KEEP = 8;         // the hunters never take the herd below this, or it would not come back
const SEAL_TAKE = 0.4;       // chance the hunter gets one before they all flop into the sea
const SEAL_WARY = 9;         // days the herd keeps to the water after anyone has come at it with a club
const SEAL_BITE = 0.07;     // chance an old bull rears and bites
const SEAL_HURT = 6;         // days a bite takes to mend
const SEAL_OIL = 4;          // timber's worth of blubber for the fires
const SEAL_SKINS = 2;        // skins kept for floats; the rest go to the drying rack as hides
const FLOAT_SINK = 0.35;     // share of the sea's pull on a swimmer who hangs on to a float
const FLOAT_YEARS = 5;       // years before a float perishes and must be sewn again
const SEAL_SITE_R2 = 26 * 26;
function sealSite(w) {
  const K = w.canoe, fx = w.fire.x + 0.5, fy = w.fire.y + 0.5;
  let best = null, bd = -1;
  for (const i of w.shore || []) {
    const x = i % MAP, y = (i - x) / MAP;
    if (w.tiles[i] !== T.SAND) continue;
    const dd = d2(x + 0.5, y + 0.5, fx, fy);
    if (dd > SEAL_SITE_R2 || dd < 100 || d2(x, y, K.bx, K.by) < 64 || dd <= bd) continue;
    if (!DIRS4.some(([a, b]) => tile(w, x + a, y + b) === T.WATER) || !lineOfLand(w, fx, fy, x + 0.5, y + 0.5)) continue;
    bd = dd; best = { x, y };
  }
  return best;
}
function sealsCome(w, c) {
  const K = w.canoe;
  if (!K || K.t < SEAL_TRIPS || c.season > 1 || rnd(w) >= SEAL_SPARK) return;
  const at = sealSite(w);
  if (!at) return;
  const [dx, dy] = DIRS4.find(([a, b]) => tile(w, at.x + a, at.y + b) === T.WATER);
  const who = aliveId(w, K.hid) || elder(w);
  w.seal = { x: at.x, y: at.y, dx, dy, n: SEAL_FIRST, p: 0, e: 0, ye: 0, k: 0, yk: 0, d: -1, s: 0, fl: null, fn: 0, fs: 0, b: 0, nm: who ? who.name : null, at: w.t, h: null, hn: null };
  w.techs.push('seals');
  const side = sideOf(w, at.x, at.y);
  milestone(w, `For days now round dark heads have come up in the swell behind the dugout, watching with big wet eyes, and sinking without a ripple when anyone looks back. This evening ${who ? who.name : 'someone'} walks the ${side} beach and finds them: ${SEAL_FIRST} grey seals hauled up on the sand, fat as sacks of grain, groaning to each other. They have followed the fish in. ${w.name} has seals.`);
}
function learnSealing(w, c) {
  const W = w.seal;
  if (W.h != null || W.e < SEAL_NOTICE || c.doy < SEAL_PUP || !w.techs.includes('hunting') || rnd(w) >= 0.25) return;
  let who = null, bs = -1;
  for (const p of w.people) {
    const a = ageY(w, p);
    if (p.dead || a < 16 || a > 55 || p.sick || p.hurt) continue;
    const sc = ((p.dd && p.dd.f) || 0) + ((p.dd && p.dd.b) || 0) * 50;
    if (sc > bs) { bs = sc; who = p; }
  }
  if (!who) return;
  W.h = w.t; W.hn = who.name;
  w.techs.push('sealing');
  const K = w.canoe, P = pron(who), Pc = P[0].toUpperCase() + P.slice(1);
  milestone(w, `${who.name} has watched the seals take ${W.e.toLocaleString()} fish out of the deep water in front of the dugout, and the catch grow thin. Now there are pups on the sand, white as snow, and the herd is ${W.n}. ${Pc} cuts a short club of blackthorn and walks out to the ${sideOf(w, W.x, W.y)} beach at low tide, keeping between the seals and the sea. From now on, when the pups are on the sand, the hunters go down to the seals: meat for the pot, blubber for the fires, and skins${K ? ' for whatever the dugout needs' : ''}. ${w.name} learns to take seals.`);
}
function sealDay(w, c) {
  const W = w.seal;
  if (!W) { sealsCome(w, c); return; }
  if (c.doy === 0) { W.yk = 0; W.ye = 0; if (W.fl != null && w.t - W.fl > FLOAT_YEARS * TICKS_PER_YEAR) { W.fl = null; log(w, 'The sealskin float in the dugout has gone stiff and split at the seams. It will hold no more air.', 'info'); } }
  const K = w.canoe;
  if (K) { // the herd eats from the deep water, all year
    const eat = Math.min(K.d, Math.floor((W.n + (c.day % SEAL_EAT)) / SEAL_EAT));
    K.d -= eat; W.e += eat; W.ye += eat;
  }
  if (c.doy === SEAL_PUP && W.n >= 2) {
    W.p = Math.min(SEAL_MAX - W.n, Math.max(1, Math.floor(W.n / 3)));
    W.n += W.p;
    if (W.p > 0) log(w, `${plural(W.p, 'white pup lies', 'white pups lie')} on the sand among the seals on the ${sideOf(w, W.x, W.y)} beach. The herd is ${W.n} now.`, 'info');
  }
  if (c.doy === SEAL_WHITE) W.p = 0;
  if (W.h == null) learnSealing(w, c);
  sealFloat(w);
}
// a skin in store and a squall remembered: it is sewn up and blown full, and goes in the dugout
function sealFloat(w) {
  const W = w.seal;
  if (W.fl != null || W.s < 1 || !w.squall || !w.squall.n || !w.canoe) return;
  W.s--; W.fl = w.t; W.fn++;
  if (W.fn > 1) { log(w, 'A new sealskin float is sewn up, blown full and tied into the dugout.', 'good'); return; }
  const S = w.squall, Lt = S.last, who = aliveId(w, w.canoe.hid) || elder(w);
  milestone(w, `${who ? who.name : 'The paddler'} turns the first sealskin over by the fire and thinks of ${!Lt ? 'the squalls out on the deep water' : who && Lt.nm === who.name ? `${poss(who)} own fight with the squall in year ${Lt.y}` : `${Lt.nm} in the squall of year ${Lt.y}`}. The skin is sewn up tight with sinew, all but one leg, which is blown into until the whole thing is round and hard as a drum, and tied off. It goes in the bottom of the dugout on a thong. Whoever the sea rolls out of the boat now has something to hang on to.`);
}
const sealCap = (W) => 1 + Math.floor(W.n / 3);
function sealTask(w, p, c) {
  const W = w.seal;
  if (!W || W.h == null || c.doy < SEAL_PUP || c.hour > 11 || c.day < W.d || W.n <= SEAL_KEEP || W.yk >= sealCap(W) || w.res.zs != null || p.hurt || p.haul) return null;
  const a = ageY(w, p), wx = w.wx ? w.wx.k : 'clear';
  if (a < 16 || a > 55 || wx === 'storm' || wx === 'fog') return null;
  if (!lineOfLand(w, p.x, p.y, W.x + 0.5, W.y + 0.5)) return null;
  return { k: 'seal', key: 'zs', x: W.x, y: W.y, h: 2 };
}
function sealDone(w, p, c, pop) {
  const W = w.seal;
  if (!W || W.n <= SEAL_KEEP || c.day < W.d) return;
  W.d = c.day + SEAL_WARY;
  if (rnd(w) < SEAL_BITE) {
    W.b++;
    p.hurt = Math.max(p.hurt || 0, w.t + SEAL_HURT * TICKS_PER_DAY);
    log(w, `An old bull seal rears up off the sand as ${p.name} comes in with the club, and bites ${himHer(p)} through the leg before the herd goes into the sea.`, 'bad');
    pop('bitten', 'meat');
    return;
  }
  if (rnd(w) >= SEAL_TAKE) { pop('into the sea', 'muted'); return; }
  W.n--; W.k++; W.yk++;
  if (W.p > 0) W.p--;
  p.haul = 'seal';
  w.timber = Math.round((w.timber + SEAL_OIL) * 100) / 100;
  if (W.s < SEAL_SKINS) W.s++; else w.hides = (w.hides || 0) + 1;
  pop('a seal', 'meat');
  if (W.k === 1) log(w, `${p.name} comes up from the ${sideOf(w, W.x, W.y)} beach bent under the first seal: meat for the pot, a slab of blubber for the fire, and a thick grey skin pegged out to dry.`, 'good');
  sealFloat(w);
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
  if (p.task && p.task.sea) { paddle(w, p, p.task, c, fx); return; } // out past the surf, nothing on land can call them
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
  if (w.vigil && w.vigil.cur && vigilAct(w, p, c)) return; // sitting the night out at the standing stones
  if (w.smudge && w.smudge.on.length) { // out among the young grain, keeping a smoky fire going till dawn
    const o = w.smudge.on.find((q) => q.id === p.id);
    if (o) {
      p.asleep = false;
      if (!p.task || p.task.k !== 'smudge') { release(w, p); p.task = { k: 'smudge', x: o.x, y: o.y, h: 99 }; }
      walk(w, p, o.x + 0.5, o.y + 0.5);
      return;
    }
  }
  // wildfire: everyone able goes out with green branches, dawn to late evening
  if (w.blaze && w.blaze.cur && w.t - w.blaze.cur.at >= BLAZE_SEEN && a >= 14 && a < 65 && !p.sick && !p.hurt && h >= 5 && h < 23 && blazeFight(w, p, c)) return; // even in a storm
  if (w.wreck && w.wreck.cur && wreckAct(w, p)) return; // down on the beach for a castaway, or carrying one up, by night if need be
  // after a wolf attack the village keeps in from dusk to full daylight
  const afraid = w.fauna && w.fauna.fear > w.t;
  const warned = !!(w.lore && w.lore.on === c.day + 1) && h >= LORE_READ && h < LORE_LATE && a >= 14 && a < 65 && !p.hurt && !p.sick; // a storm is called: work on by firelight
  const late = w.ale && w.ale.hd === c.day ? ALE_LATE : 21; // the harvest home: everyone sits up round the hearth
  const night = (h >= late && !warned) || h < (afraid ? 7 : 6) || (w.watch && w.watch.last === p.id && h < WATCH_REST) || (w.smudge && h < SMUDGE_REST && w.smudge.last.includes(p.id)); // the night's watcher sleeps late, and so do the smudgers
  const evening = h >= (afraid ? 16 : 18) && h < late;
  const storm = w.wx && w.wx.k === 'storm';
  if (w.fest && w.fest.on === c.day && h >= FEST_FROM && h < FEST_TO && !p.sick) { // midsummer: everyone (who can stand) to the bonfire
    const R = raceNow(w, c) ? w.fest.race : null, ri = R ? R.rs.findIndex((q) => q[0] === p.id) : -1;
    if (ri >= 0) { // on the line, out to the stake, home to the fire
      if (!p.task || p.task.k !== 'race') { // keep the place in the ring for afterwards
        const ring = p.task && p.task.k === 'fest' ? p.task : null;
        if (!ring) release(w, p);
        p.task = { k: 'race', x: Math.floor(R.ex), y: Math.floor(R.ey), h: 99, f: ring };
      }
      p.asleep = false;
      [p.x, p.y] = racePos(R, ri, h);
      return;
    }
    if (p.task && p.task.k === 'race') p.task = p.task.f; // back to the same place in the ring
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
  const kept = w.cough != null && coughKept(w, p); // a whooping child, or the parent sitting with a small one
  if (night || storm || p.sick || kept) { // in a storm nobody works outdoors: they wait it out at home. The sick keep to their beds
    if (p.task && p.task.k !== 'home') release(w, p);
    const home = homeOf(w, p);
    const off = (p.id % 3) * 0.25 - 0.25;
    if (!night && !storm) { // by day the sick lie wrapped up in the doorway, out of the smoke (and the coughers sit there)
      p.asleep = false;
      moveToward(p, home.x + 0.5 + off, home.y + 1.25);
      return;
    }
    if (walk(w, p, home.x + 0.5 + off, home.y + 0.5)) p.asleep = p.home != null;
    return;
  }
  p.asleep = false;
  if (warned) {
    if (p.task && p.task.k !== 'tie' && !p.task.eve) release(w, p);
    if (!p.task) { const t = prepTask(w, p); if (t) reserve(w, p, t); }
    const t = p.task;
    if (t) {
      if (!walk(w, p, t.x + 0.5, t.y + 0.5)) return;
      if (--t.h > 0) return;
      finish(w, p, t, c, fx);
      release(w, p);
      return;
    }
    if (h >= 21) { // nothing left to do: to bed
      const home = homeOf(w, p);
      if (walk(w, p, home.x + 0.5 + (p.id % 3) * 0.25 - 0.25, home.y + 0.5)) p.asleep = p.home != null;
      return;
    }
  }
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
    if (c.day > d || (c.day === d && h >= MOURN_TO) || !w.yard) p.mourn = undefined;
    else if (c.day === d && h >= MOURN_FROM && !(p.task && (p.task.k === 'hunt' || p.task.k === 'haul'))) {
      if (!p.task || p.task.k !== 'mourn') { release(w, p); p.task = mournSpot(w, p, s); }
      walk(w, p, p.task.x + 0.5, p.task.y + 0.5);
      return;
    }
  }
  if (w.squall && w.squall.cur && shoreWatch(w, p, a)) return; // the dugout is out in a squall: down to the landing to watch
  if (p.task && (p.task.k === 'shore' || p.task.k === 'gather' || p.task.k === 'home' || p.task.k === 'fest' || p.task.k === 'race' ||p.task.k === 'tale' || p.task.k === 'mourn' || p.task.k === 'search' || p.task.k === 'lost' || p.task.k === 'horn' || p.task.k === 'watch' || p.task.k === 'smudge' || p.task.k === 'blaze' || p.task.k === 'stone' || p.task.k === 'vigil' || p.task.k === 'wreck' || (p.task.k === 'herd' && !(w.goats && w.goats.hid === p.id)))) p.task = null;
  if (w.stones && w.stones.cur && stoneRope(w, p, c)) return; // on the ropes, dragging this summer's stone up to the ring
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
    else if (a >= 5 && a < 14 && w.wx.bow && w.wx.bow.x != null && bowOn(w, c) && (p.id + c.day) % 3 < BOW_CHASE) p.task = bowTask(w, p) || wander(w, p, w.fire.x, w.fire.y, 6, 2);
    else if (a < 14 && w.snow && snowOk(w, c) && (p.id + c.day) % 3 < SNOW_PLAY) p.task = snowTask(w, p, c) || wander(w, p, w.fire.x, w.fire.y, 6, 2);
    else if (a < 14 && a >= WADE_AGE && w.wade && wadeOk(w, c, h) && (p.id + c.day) % 3 < (w.wx.k === 'heat' ? 2 : 1)) p.task = wadeTask(w, p) || wander(w, p, w.fire.x, w.fire.y, 6, 2);
    else if (a < 14) p.task = wander(w, p, w.fire.x, w.fire.y, 6, 2);
    else if (a >= 65 || p.hurt) p.task = wander(w, p, homeOf(w, p).x, homeOf(w, p).y, 2, 4);
    else reserve(w, p, pickTask(w, p, c));
  }
  const t = p.task;
  if (!walk(w, p, t.x + 0.5, t.y + 0.5)) return;
  if (t.k === 'paddle') { t.sea = 1; w.canoe.at = p.id; return; } // down at the boat: push off
  t.h--;
  if (t.h > 0) return;
  if (t.k === 'water' && !t.b && w.spring) { t.b = 1; t.x = w.spring.x; t.y = w.spring.y; t.h = 1; return; } // filled at the pool: the long walk home
  finish(w, p, t, c, fx);
  release(w, p);
}

function finish(w, p, t, c, fx) {
  const pop = (text, color) => fx && fx.push({ x: t.x + 0.5, y: t.y, text, color });
  if (t.k === 'harvest') {
    const f = w.fields.find((o) => 'f' + o.id === t.key);
    if (!f || f.stage !== 'ripe') return;
    const base = FIELD_YIELD * w.harvest * (1 - (f.lost || 0));
    const y = Math.round(base * (f.mk ? 1 + MUCK_GAIN : 1));
    if (f.mk && w.muck) { const more = y - Math.round(base); w.muck.g += more; w.muck.yg += more; }
    w.food += y; w.stats.yh += y; f.stage = 'harvested'; f.growth = 0; rustCut(w, f, y); f.lost = f.mk = undefined;
    if (!w.muck && w.goats && w.learned && w.learned.goats != null && w.t - w.learned.goats >= MUCK_YEARS * TICKS_PER_YEAR &&
      d2(f.x + 0.5, f.y + 0.5, penMid(w.goats).x, penMid(w.goats).y) <= MUCK_NEAR * MUCK_NEAR) learnMuck(w, p, f);
    deed(w, p, 'g', y);
    if (t.eve && w.lore) w.lore.g++;
    pop('+' + y, 'food');
  } else if (t.k === 'plant') {
    const f = w.fields.find((o) => 'f' + o.id === t.key);
    if (f && f.stage === 'fallow' && f.sa == null) {
      const fr = f.fr != null;
      f.stage = 'planted'; f.growth = 0; f.flat = f.root = f.fr = f.ru = f.rl = f.rg = f.lost = undefined; pop(fr ? 'sown again' : 'sown', 'muted');
      if (fr && w.wx.k !== 'cold' && !w.fields.some((o) => o.fr != null)) log(w, 'The last of the frost-black fields is dug over and sown again.', 'good');
    }
  } else if (t.k === 'build') {
    const b = w.buildings.find((o) => 'b' + o.id === t.key);
    if (!b || b.progress >= 1) return;
    if (!b.dmg) { const hs = b.hands || (b.hands = []); if (!hs.includes(p.id)) hs.push(p.id); }
    b.progress = Math.min(1, Math.round((b.progress + 4 / (b.kind === 'granary' ? GRANARY_WORK : HOUSE_WORK)) * 1000) / 1000);
    pop('+' + Math.round(b.progress * 100) + '%', 'build');
    if (b.progress >= 1 && b.hands) {
      for (const id of b.hands) deed(w, aliveId(w, id), 'h');
      b.hands = undefined;
    }
    if (b.progress >= 1 && b.dmg) {
      log(w, b.kind === 'granary' ? 'The granary roof is thatched again.' : b.burnt ? 'A burnt roof is thatched again.' : 'A storm-torn roof is mended.', 'good');
      b.dmg = b.burnt = undefined;
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
    // a stool's poles are all cut at once, down to the stump; a tree near the village left too small to
    // fell again is cut to the stool and kept, once the island coppices
    const stool = !!w.copse && isStool(w, i);
    let got = stool ? w.wood[i] : Math.min(CHOP, w.wood[i]);
    if (!stool && w.copse && w.wood[i] - got < 6 && keepStool(w, t.x, t.y, i)) got = w.wood[i];
    w.wood[i] -= got; w.timber += got;
    if (stool) { w.copse.n++; w.copse.y += got; }
    if (w.wood[i] <= 0) { w.wood[i] = 0; if (!isStool(w, i)) setTile(w, i, T.GRASS); }
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
  } else if (t.k === 'rogue') {
    rogueDone(w, p, t, pop);
  } else if (t.k === 'pare') {
    pareDone(w, p, t, pop);
  } else if (t.k === 'muck') {
    muckDone(w, p, t, pop);
  } else if (t.k === 'cheese') {
    cheeseDone(w, p, pop);
  } else if (t.k === 'weave') {
    loomDone(w, p, pop);
  } else if (t.k === 'brew') {
    brewDone(w, p, pop);
  } else if (t.k === 'crowman') {
    scareDone(w, p, t, pop);
  } else if (t.k === 'pit') {
    pitDone(w, p, t, pop);
  } else if (t.k === 'well') {
    wellDone(w, p, t, pop);
  } else if (t.k === 'water') {
    waterDone(w, p, t, pop);
  } else if (t.k === 'hedge') {
    const f = w.fields.find((o) => 'q' + o.id === t.key);
    if (!f || f.hg != null || !w.hedge) return;
    f.hg = w.t; w.hedge.n++; w.hedge.y++;
    pop('hedge', 'food');
    if (w.hedge.n === 1) milestone(w, `${p.name} comes back from the woods with a basket of thorny slips and torn hands, and heels them into a trench along the field by the trees, a hand apart. They look like nothing at all. The first hedge is planted on ${w.name}.`);
  } else if (t.k === 'tend') {
    const o = w.people.find((q) => q.id === t.o), H = w.heal;
    if (!o || o.dead || !(o.sick || o.hurt) || !H || H.s < 1) return;
    H.s--; H.n++; o.tend = c.day;
    deed(w, p, 'n');
    if (o.sick && w.fever) w.fever.t = (w.fever.t || 0) + 1;
    let honey = 0;
    if (o.hurt && w.bees && w.bees.hy >= 1) { w.bees.hy--; w.bees.mw++; honey = HONEY_WOUND; } // honey on the dressing keeps the bite clean
    if (o.hurt) o.hurt = Math.max(w.t + 1, o.hurt - (HERB_WOUND + honey) * TICKS_PER_DAY);
    pop(honey ? 'honey dressing' : 'tended', 'herb');
  } else if (t.k === 'herb') {
    const H = w.heal;
    if (!H) return;
    const got = Math.min(HERB_CAP - H.s, 4 + ri(w, 3));
    H.s += got;
    if (got > 0) pop('+' + got + ' herbs', 'herb');
  } else if (t.k === 'honey') {
    honeyDone(w, p, t, pop);
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
  } else if (t.k === 'snow') {
    snowDone(w, p, t);
  } else if (t.k === 'tie') {
    const b = w.buildings.find((o) => 'y' + o.id === t.key);
    if (b && b.progress >= 1 && !b.dmg) { b.tie = 1; pop('roped', 'muted'); }
  } else if (t.k === 'bow') {
    bowDone(w, p);
  } else if (t.k === 'wade') {
    wadeDone(w, p, c, pop);
  } else if (t.k === 'whale') {
    whaleCut(w, p, pop);
  } else if (t.k === 'seal') {
    sealDone(w, p, c, pop);
  } else if (t.k === 'dig') {
    const got = canoeDig(w, p, c);
    if (got) pop(got, 'build');
  } else if (t.k === 'forage') {
    const got = Math.min(w.wild, 3 + ri(w, 3));
    w.wild -= got; w.food += got;
    if (got > 0) pop('+' + got, 'food');
  } else if (t.k === 'hunt') {
    if (t.key === 'h0') strike(w, p, t);
  } else if (t.k === 'haul') {
    const n = MEAT[t.q] || 0;
    w.food += n; p.haul = undefined;
    pop('+' + n, 'meat');
  } else if (t.k === 'fish') {
    const got = Math.min(w.fish, 3 + ri(w, 4));
    w.fish -= got; w.food += got;
    deed(w, p, 'f', got);
    if (got > 0) pop('+' + got, 'fish');
  }
}

// ---------- snowmen ----------
// In winter the children play in the snow on the green near the hearth. They roll a snowman (three balls,
// one per spell of rolling), name it, and once three stand the rest of the play goes in snowball fights.
// Snowmen last all winter and melt in spring. Children do no other work, so this is for the eye only.
// w.snow { k next id, n built ever, y built this year, men [{ id, x, y, s balls 1..3, m melting, nm name, by builder }] }.
const SNOW_MAX = 3;          // standing at once
const SNOW_PLAY = 2;         // of every 3 children, this many go out on a winter day
const SNOW_MELT = { clear: 0.45, rain: 0.7, heat: 1, fog: 0.3, storm: 0.6, cold: 0.05, snow: 0 }; // daily chance a melting snowman loses a ball
const SNOW_PROP = [ // what the children give a snowman named after someone, by byname
  ['Wolf-slayer', 'with a wolf pelt of dead bracken over its shoulders'], ['Hunter', 'with an ash stick for a spear'],
  ['Finder', 'with a burnt stick held up like a torch'], ['Builder', 'with a stone axe stuck in its belly'],
  ['Fisher', 'with a dried fish for a nose'], ['Reaper', 'with a crown of straw'], ['Swift', 'with a wreath of holly where the oak leaves should be'], ['','with a beard of dry grass'],
];
const snowOk = (w, c) => c.season === 3 && w.wx && w.wx.k !== 'storm' && w.wx.k !== 'fog';
function learnSnow(w, c) {
  if (w.snow || c.season !== 3 || !w.wx || w.wx.k !== 'snow' || !w.techs.includes('fire')) return;
  const kids = w.people.filter((p) => !p.dead && ageY(w, p) >= 4 && ageY(w, p) < 14);
  if (kids.length < 2) return;
  w.snow = { k: 0, n: 0, y: 0, men: [] };
  w.techs.push('snowmen');
  const a = kids[0], b = kids[1];
  milestone(w, `The snow lies knee-deep and the houses are full of smoke and squabbling, so the children are sent out to the green. ` +
    `${a.name} and ${b.name} pack a snowball, roll it until it will not move, and heave a second one on top. By dusk a white figure stands by the hearth with pebble eyes and a stick for a nose, and the children of ${w.name} build snowmen every winter from now on.`);
}
function snowSite(w) {
  const S = w.snow;
  for (let tries = 0; tries < 14; tries++) {
    const x = w.fire.x + ri(w, 13) - 6, y = w.fire.y + ri(w, 13) - 6;
    const tt = tile(w, x, y);
    if (tt !== T.GRASS && tt !== T.SAND) continue;
    if (d2(x, y, w.fire.x, w.fire.y) < 5) continue;
    if (S.men.some((m) => d2(m.x, m.y, x, y) < 5)) continue;
    if (tile(w, x, y + 1) === T.BUILD || tile(w, x, y - 1) === T.BUILD) continue;
    return [x, y];
  }
  return null;
}
// the snowman's name: someone with a byname first, otherwise the eldest, otherwise none
function snowName(w) {
  if (rnd(w) < 0.4) return null;
  const named = w.people.filter((p) => !p.dead && byname(p) && ageY(w, p) >= 14);
  if (named.length && rnd(w) < 0.7) { const p = named[ri(w, named.length)]; return `${p.name} ${byname(p)}`; }
  const g = (w.graves || []).filter((o) => o.by);
  if (g.length && rnd(w) < 0.5) { const o = g[ri(w, g.length)]; return `${o.n} ${o.by}`; }
  const e = elder(w);
  return e ? e.name : null;
}
function snowTask(w, p, c) {
  const S = w.snow, side = (p.id & 1) ? 1 : -1;
  let m = S.men.find((o) => o.s < SNOW_MAX && !o.m);
  if (!m && S.men.length < SNOW_MAX) {
    const at = snowSite(w);
    if (at) { m = { id: S.k++, x: at[0], y: at[1], s: 0, m: 0, nm: null, by: p.id }; S.men.push(m); }
  }
  if (m && m.s < 3) return { k: 'snow', x: m.x + side, y: m.y, h: 2 + ri(w, 2), o: m.id };
  const x = w.fire.x + ri(w, 11) - 5, y = w.fire.y + ri(w, 11) - 5; // a snowball fight on the green
  return tile(w, x, y) !== T.WATER && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5) ? { k: 'snow', x, y, h: 3 + ri(w, 2) } : null;
}
function snowDone(w, p, t) {
  const S = w.snow, m = S && t.o != null && S.men.find((o) => o.id === t.o);
  if (!m || m.m || m.s >= 3) return;
  m.s++;
  if (m.s < 3) return;
  S.n++; S.y++;
  m.nm = snowName(w);
  const who = aliveId(w, m.by), two = who && who !== p, by = two ? `${who.name} and ${p.name} finish` : `${p.name} finishes`;
  if (S.y === 1 || m.nm) log(w, m.nm
    ? `${by} a snowman by the hearth ${SNOW_PROP.find(([k]) => m.nm.endsWith(k))[1]}. The children call it ${m.nm}.`
    : `${by} ${S.y === 1 ? 'the first snowman of the winter' : 'a snowman'} by the hearth, with pebble eyes and a stick nose.`, 'good');
}
function snowDay(w, c) {
  if (!w.snow) { learnSnow(w, c); return; }
  const S = w.snow;
  if (c.doy === 0) S.y = 0;
  for (const m of S.men) {
    const tt = tile(w, m.x, m.y);
    if (tt !== T.GRASS && tt !== T.SAND) { m.s = 0; m.m = 1; }
    else if (c.season !== 3 && m.s > 0) { // spring: they slump, lean and shrink into the mud
      if (!m.m) m.m = 1;
      if (rnd(w) < (SNOW_MELT[w.wx.k] ?? 0.4)) m.s--;
    }
  }
  const had = S.men.length;
  S.men = S.men.filter((m) => m.s > 0 || (c.season === 3 && !m.m));
  if (had && !S.men.length && c.season !== 3) log(w, `The last snowman by the hearth slumps into the mud. Spring has come to ${w.name}.`, 'info');
}

// ---------- the standing stones ----------
// Once the stores are full and there are hands to spare after the harvest, the eldest marks out a ring on open
// grass away from the houses, and every summer after that a crew drags one boulder up from the shore on log
// rollers and stands it in the ring: levered onto the logs, a few tiles an hour on the ropes, then a pit dug and
// the stone hauled upright, and a feast. Each stone is raised for one of the dead. Eight close the ring.
// w.stones { cx, cy centre tile, sx, sy the boulders on the shore, s [{ k slot, y year, n on the ropes, nm raised
//   for, g their id, t tick }], cur null | { x, y, px, py the stone (tile coords), k slot, ids today's crew, w hours
//   levering, h hours on the ropes, up hours raising, d day begun, nm raised for, g their id, ld who led it },
//   n stones up, y year of the last, hurt feet crushed, at tick learned, nm who marked the ring, done tick closed }
export const STONE_RING = [[0, -3], [2, -2], [3, 0], [2, 2], [0, 3], [-2, 2], [-3, 0], [-2, -2]]; // slots round the centre
const STONE_ORDER = [0, 4, 2, 6, 1, 5, 3, 7]; // north and south first, then east and west, then between
const STONE_R2 = 10;          // the ground kept clear round the centre (squared tiles)
const STONE_POP = 20, STONE_ADULTS = 10; // islanders, and grown ones, before anyone thinks of it
const STONE_RICH = 200;       // food per head in the stores before the ring is marked out
const STONE_SPARE = 120;      // food per head before a summer's haul begins
const STONE_FROM = 140, STONE_TO = 215; // days of the year a haul may begin: after midsummer, into early autumn
const STONE_GO = 0.3;         // chance a fair morning in that window is the morning
const STONE_H0 = 6, STONE_H1 = 18; // hours on the ropes
const STONE_MIN = 6, STONE_MAX = 10; // a crew
const STONE_PULL = 0.06;      // tiles an hour for each one on the ropes
const STONE_TOP = 0.6;        // and never faster than this
export const STONE_LEVER = 3; // hours to lever it out of the sand and onto the rollers
export const STONE_UP = 4;    // hours to dig the pit and haul it upright
const STONE_SLIP = 0.004;     // chance an hour on the ropes that it slews off the logs onto a foot
const STONE_HURT = 8;         // days the foot keeps them in
const STONE_FEAST = 3;        // extra food each islander eats the night a stone goes up
export const stoneOn = (w, c) => !!(w.stones && w.stones.cur && w.stones.cur.ids.length && (c.season === 1 || c.season === 2) &&
  c.hour >= STONE_H0 && c.hour < STONE_H1 && w.wx && w.wx.k !== 'storm' && w.wx.k !== 'snow');
export const stoneSlot = (S, k) => [S.cx + STONE_RING[k][0] + 0.5, S.cy + STONE_RING[k][1] + 0.5];
function stoneHand(w, p) {
  if (p.dead || p.sick || p.hurt || p.cg) return false;
  const a = ageY(w, p);
  if (a < 16 || a >= 50) return false;
  if ((w.horn && w.horn.hid === p.id) || (w.watch && w.watch.hid === p.id) || (w.goats && w.goats.hid === p.id) ||
    (w.heal && w.heal.id === p.id) || (w.pot && w.pot.id === p.id) || (w.canoe && w.canoe.at === p.id)) return false;
  return !(w.cough && coughKept(w, p));
}
// open ground 8 to 18 tiles from the hearth, no water within 6, nothing built within 4, grass or woods (no stools) inside the ring
function stoneSite(w) {
  let best = null, bs = 1e9;
  const { x: fx, y: fy } = w.fire;
  for (let y = 6; y < MAP - 6; y++) for (let x = 6; x < MAP - 6; x++) {
    const dd = d2(x, y, fx, fy);
    if (dd < 64 || dd > 324) continue;
    let sc = Math.abs(dd - 120) / 12 + hash(x, y, w.seed + 61) * 3;
    if (sc >= bs) continue;
    let ok = true, nf = 0;
    for (let yy = y - 6; yy <= y + 6 && ok; yy++) for (let xx = x - 6; xx <= x + 6; xx++) {
      const q = d2(xx, yy, x, y);
      if (q > 36) continue;
      const t = tile(w, xx, yy);
      if (t === T.WATER || (q <= 16 && t === T.BUILD)) { ok = false; break; }
      if (q > STONE_R2) continue;
      if (t === T.FOREST && !isStool(w, idx(xx, yy))) nf++;
      else if (t !== T.GRASS) { ok = false; break; }
    }
    sc += nf * 0.4;
    if (!ok || sc >= bs || !lineOfLand(w, fx + 0.5, fy + 0.5, x + 0.5, y + 0.5)) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
// grey boulders on a beach 9 to 20 tiles off, in a straight run of land to the ring
function stoneShore(w, cx, cy) {
  let best = null, bs = 1e9;
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    if (w.tiles[idx(x, y)] !== T.SAND) continue;
    const dd = d2(x, y, cx, cy);
    if (dd < 81 || dd > 400) continue;
    const sc = Math.abs(dd - 144) / 12 + hash(x, y, w.seed + 67) * 4;
    if (sc >= bs) continue;
    let ok = true;
    for (const [ox, oy] of STONE_RING) if (!lineOfLand(w, x + 0.5, y + 0.5, cx + ox + 0.5, cy + oy + 0.5)) { ok = false; break; }
    if (!ok) continue;
    bs = sc; best = { x, y };
  }
  return best;
}
function learnStones(w, c) {
  if (c.season !== 1 || c.doy < STONE_FROM || c.doy > STONE_TO || !w.yard || !w.techs.includes('midsummer')) return;
  const n = w.people.length;
  if (n < STONE_POP || w.food < n * STONE_RICH || !w.wx || (w.wx.k !== 'clear' && w.wx.k !== 'heat')) return;
  if (w.people.filter((p) => ageY(w, p) >= 14).length < STONE_ADULTS || rnd(w) >= 0.2) return;
  const who = elder(w), at = who && stoneSite(w), sh = at && stoneShore(w, at.x, at.y);
  if (!sh) return;
  for (let y = at.y - 3; y <= at.y + 3; y++) for (let x = at.x - 3; x <= at.x + 3; x++) {
    if (d2(x, y, at.x, at.y) > STONE_R2) continue;
    const i = idx(x, y);
    w.timber += w.wood[i]; w.wood[i] = 0;
    setTile(w, i, T.BUILD);
  }
  w.stones = { cx: at.x, cy: at.y, sx: sh.x, sy: sh.y, s: [], cur: null, n: 0, y: 0, hurt: 0, at: w.t, nm: who.name, done: null };
  w.techs.push('stones');
  const he = pron(who), He = Cap(he);
  milestone(w, `${who.name} stands a long time by the burying ground, where the ring of small stones round the dead is half grown over with grass. ` +
    `The stores are fuller than they have ever been, ${he} says, the grain is in and there are hands to spare: ${w.name} should raise something that will still be standing when everyone at the fire tonight is in the ground. ` +
    `On the open grass ${sideOf(w, at.x, at.y)} of the village ${he} walks a circle round a peg on a cord and drives in eight stakes. Down on the ${sideOf(w, sh.x, sh.y)} shore lie grey boulders as long as a man. ` +
    `${He} says one will be dragged up on rollers every summer after the harvest, and stood in the ring for one of the dead. ${w.name} begins a ring of standing stones.`);
}
// the one this summer's stone is raised for: the longest dead who has none yet, else the one who marked the ring
function stoneFor(w) {
  const S = w.stones, used = new Set(S.s.map((o) => o.g));
  const g = (w.graves || []).find((o) => !used.has(o.id));
  return g ? { nm: g.n, g: g.id } : { nm: S.nm, g: null };
}
function stoneDay(w, c) {
  if (!w.stones) { learnStones(w, c); return; }
  const S = w.stones;
  if (S.cur || S.s.length >= STONE_RING.length || S.y >= c.year) return;
  if ((c.season !== 1 && c.season !== 2) || c.doy < STONE_FROM || c.doy > STONE_TO) return;
  if (!w.wx || (w.wx.k !== 'clear' && w.wx.k !== 'heat') || (w.fest && w.fest.on === c.day)) return;
  if (w.food < w.people.length * STONE_SPARE || workLists(w).ripe.length) return;
  if (w.people.filter((p) => stoneHand(w, p)).length < STONE_MIN || rnd(w) >= STONE_GO) return;
  const f = stoneFor(w), x = S.sx + 0.5, y = S.sy + 0.5;
  S.cur = { x, y, px: x, py: y, k: STONE_ORDER[S.s.length], ids: [], d: c.day, w: 0, h: 0, up: 0, nm: f.nm, g: f.g, ld: null };
}
// each morning of the haul: the strongest who are free, those who have hauled before first
function stoneCrew(w, c) {
  const S = w.stones, C = S.cur;
  C.ids = [];
  if ((c.season !== 1 && c.season !== 2) || !w.wx || w.wx.k === 'storm' || w.wx.k === 'snow' || workLists(w).ripe.length) return;
  const hands = w.people.filter((p) => stoneHand(w, p));
  if (hands.length < STONE_MIN) return;
  hands.sort((a, b) => ((b.dd && b.dd.s) || 0) - ((a.dd && a.dd.s) || 0) || a.born - b.born || a.id - b.id);
  C.ids = hands.slice(0, STONE_MAX).map((p) => p.id);
  if (C.ld != null) return;
  C.ld = hands[0].name;
  log(w, `At first light ${hands[0].name} leads ${C.ids.length - 1} others down to the boulders on the ${sideOf(w, S.sx, S.sy)} shore with ropes of plaited hide and an armful of logs. This summer's stone is for ${C.nm}.`, 'good');
}
function stoneHour(w, c, fx) {
  const S = w.stones, C = S.cur;
  C.px = C.x; C.py = C.y;
  if (c.hour === STONE_H0) stoneCrew(w, c);
  if (!stoneOn(w, c)) return;
  const on = [];
  for (const id of C.ids) { const p = aliveId(w, id); if (p && !p.hurt && d2(p.x, p.y, C.x, C.y) <= 16) on.push(p); }
  if (on.length * 2 < STONE_MIN) return; // still walking out to it
  if (C.w < STONE_LEVER) { C.w++; return; } // levering it up out of the sand and onto the logs
  const [tx, ty] = stoneSlot(S, C.k), dx = tx - C.x, dy = ty - C.y, dd = Math.sqrt(dx * dx + dy * dy);
  if (dd > 0.001) {
    const sp = Math.min(STONE_TOP, STONE_PULL * on.length) * (w.wx.k === 'rain' || w.wx.k === 'fog' ? 0.5 : 1); // mud and wet ropes
    C.h++;
    if (dd <= sp) { C.x = tx; C.y = ty; } else { C.x = Math.round((C.x + (dx / dd) * sp) * 1000) / 1000; C.y = Math.round((C.y + (dy / dd) * sp) * 1000) / 1000; }
    if (rnd(w) < STONE_SLIP) {
      const p = on[ri(w, on.length)];
      p.hurt = Math.max(p.hurt || 0, w.t + STONE_HURT * TICKS_PER_DAY);
      release(w, p);
      C.ids = C.ids.filter((id) => id !== p.id);
      S.hurt++;
      log(w, `The stone slews off the rollers on a slope and comes down on ${p.name}'s foot. ${Cap(pron(p))} is carried home white in the face, and the others lever it back onto the logs.`, 'bad');
      if (fx) fx.push({ x: p.x, y: p.y - 0.5, text: 'crushed foot', color: 'sick' });
    }
    return;
  }
  if (++C.up < STONE_UP) return; // the pit dug, the stone tipped in and hauled upright with ropes and props
  stoneUp(w, c, fx, on.length);
}
function stoneUp(w, c, fx, n) {
  const S = w.stones, C = S.cur, [tx, ty] = stoneSlot(S, C.k);
  S.s.push({ k: C.k, y: c.year, n, nm: C.nm, g: C.g, t: w.t });
  S.n++; S.y = c.year; S.cur = null;
  for (const id of C.ids) { const p = aliveId(w, id); if (p) { deed(w, p, 's'); if (p.task && p.task.k === 'stone') p.task = null; } }
  const eat = Math.min(Math.floor(w.food * 0.05), w.people.length * STONE_FEAST);
  w.food = Math.round((w.food - eat) * 100) / 100;
  if (fx) fx.push({ x: tx, y: ty - 1, text: 'a stone stands', color: 'food' });
  const left = STONE_RING.length - S.s.length;
  if (S.n === 1) milestone(w, `${n} islanders lean back on the ropes, the stone tips over the lip of the pit and drops in with a thud the children feel through their feet. ` +
    `Packed round with rubble and stamped down, it stands taller than any of them: the first standing stone on ${w.name}, raised for ${C.nm}. That night the stores are opened and there is a feast in the ring.`);
  else if (!left) {
    S.done = w.t;
    const yrs = c.year - clock(S.at).year + 1;
    milestone(w, `The eighth stone drops into its pit and the ring is closed, ${yrs} summers after ${S.nm} drove in the stakes. ` +
      `That evening everyone on ${w.name} walks out and stands inside it, among stones raised for ${S.s.slice(0, 3).map((o) => o.nm).join(', ')} and the rest, and for once nobody has much to say.`);
  } else log(w, `Another stone goes up in the ring, raised for ${C.nm}: ${S.s.length} of ${STONE_RING.length} stand now. ${n} hands were on the ropes, and there is a feast in the ring tonight.`, 'good');
}
// on the ropes: strung out ahead of the stone while it is hauled, round it while it is levered or raised
function stoneRope(w, p, c) {
  const S = w.stones, C = S.cur, i = C.ids.indexOf(p.id);
  if (i < 0 || p.hurt || !stoneOn(w, c)) return false;
  if (p.task && p.task.k !== 'stone') release(w, p);
  const [tx, ty] = stoneSlot(S, C.k), dx = tx - C.x, dy = ty - C.y, dd = Math.sqrt(dx * dx + dy * dy);
  const pull = C.w >= STONE_LEVER && dd > 0.001;
  let sx, sy;
  if (pull) {
    const ux = dx / dd, uy = dy / dd, along = 1.2 + (i >> 1) * 0.55, side = i & 1 ? 0.4 : -0.4;
    sx = C.x + ux * along - uy * side; sy = C.y + uy * along + ux * side;
  } else { const [rx, ry] = RING[(i * 5) % 24]; sx = C.x + rx * 1.1; sy = C.y + ry * 1.1; }
  if (tile(w, Math.floor(sx), Math.floor(sy)) === T.WATER) { sx = C.x; sy = C.y; }
  sx = Math.round(sx * 1000) / 1000; sy = Math.round(sy * 1000) / 1000;
  p.task = { k: 'stone', x: Math.floor(sx), y: Math.floor(sy), h: 99, pull: pull ? 1 : 0 };
  walk(w, p, sx, sy);
  return true;
}

// ---------- the night at the stones ----------
// Once stones stand in the ring, a child does not become grown just by getting tall. On a clear night near the
// full moon in autumn, every islander of 13 to 17 who has not done it walks out after supper, the eldest with
// them as far as the ring, and sits alone till first light by a stone raised for one of the dead, with a small
// fire in the middle. Whoever is still there at dawn is counted among the grown. A howl in the woods or a noise
// in the dark sends some running home; they must sit it again, and nobody is pledged to one who ran until they
// have. A storm or snow in the night sends them all home, and the night does not count either way.
// w.vigil { n sat it out ever, r ran ever, k nights ever, d day of the last, y its year, nm first to sit it,
//   at tick learned, cur null | { d day it began, on [{ id, x, y, nm stone for }], ld eldest id, ln eldest name,
//   ran [names] } }; p.vg year they sat it out, p.vr times they ran home
const VIGIL_AGE = 13, VIGIL_TO = 18; // ages who sit it the first time
const VIGIL_LATE = 30;       // one who ran home keeps trying until this age
const VIGIL_MOON = 13;       // moonlight it needs (15 = full)
const VIGIL_GO = 0.5;        // chance a fit night is the night
const VIGIL_GAP = 20;        // days between nights at the stones (one each moon at most)
const VIGIL_OUT = 19;        // after supper they walk out; the eldest turns home at 21
export const VIGIL_HOME = 6; // first light: home to the hearth
const VIGIL_FEAR = 0.012;   // chance an hour (22:00 to 05:00) that a noise in the dark sends one running
const VIGIL_SOUNDS = ['an owl shrieks right over the ring', 'the fire spits and sinks, and the stones stand up black all round', 'something moves out in the long grass and stops when they stop breathing',
  'a stone seems to lean in when the fire flickers', 'the wind gets up and moans round the stones like a voice'];
export const vigilOn = (w) => !!(w.vigil && w.vigil.cur && w.vigil.cur.on.length);
export const vigilFire = (w, c) => { // the small fire in the middle of the ring, lit from the walk out till dawn
  const C = vigilOn(w) && w.vigil.cur;
  if (!C || !w.stones) return null;
  return (c.day === C.d && c.hour >= VIGIL_OUT + 1) || (c.day === C.d + 1 && c.hour < VIGIL_HOME) ? { x: w.stones.cx + 0.5, y: w.stones.cy + 0.5 } : null;
};
export const vigilWas = (p) => (p.vg ? `sat the night out at the standing stones in year ${p.vg}` : p.vr ? `ran home from the stones in the dark${p.vr > 1 ? ` ${p.vr} times` : ''}; must sit it again` : null);
const vigilShy = (p) => !!p.vr && !p.vg; // ran from the stones, and not sat it out since: nobody is pledged to them
function vigilFit(w, p) {
  if (p.dead || p.vg || p.sick || p.hurt || p.cg || p.home == null || isLost(w, p)) return false;
  const a = ageY(w, p);
  if (a < VIGIL_AGE || a >= (p.vr ? VIGIL_LATE : VIGIL_TO)) return false;
  return !((w.watch && w.watch.hid === p.id) || (w.heal && w.heal.id === p.id));
}
function vigilDay(w, c) {
  const V = w.vigil, R = w.stones;
  if (V && V.cur) { // a night already under way: did the weather turn at midnight?
    if (w.wx.k === 'storm' || w.wx.k === 'snow') vigilBroken(w);
    return;
  }
  if (!R || !R.s.length || c.season !== 2 || moonLight(c.day) < VIGIL_MOON) return;
  if (!w.wx || (w.wx.k !== 'clear' && w.wx.k !== 'cold') || (V && c.day - V.d < VIGIL_GAP)) return;
  if ((w.lost && w.lost.cur) || (w.blaze && w.blaze.cur) || (w.ale && w.ale.hd === c.day)) return;
  const can = w.people.filter((p) => vigilFit(w, p));
  if (!can.length || rnd(w) >= VIGIL_GO) return;
  can.sort((a, b) => a.born - b.born || a.id - b.id);
  const ld = elder(w), take = can.slice(0, R.s.length); // one to a stone
  const on = take.map((p, i) => {
    const o = R.s[i], [ox, oy] = STONE_RING[o.k];
    return { id: p.id, x: Math.round((R.cx + 0.5 + ox * 0.62) * 1000) / 1000, y: Math.round((R.cy + 0.5 + oy * 0.62 + 0.3) * 1000) / 1000, nm: o.nm };
  });
  if (!V) {
    w.vigil = { n: 0, r: 0, k: 0, d: c.day, y: c.year, nm: take[0].name, at: w.t, cur: null };
    w.techs.push('vigil');
    const p = take[0], he = ld ? pron(ld) : 'they', His = p.sex === 'f' ? 'Her' : 'His';
    milestone(w, `${ld ? ld.name : 'The eldest'} watches ${p.name} carry a full skin of water up from the spring without stopping, and says ${he} has seen ${p.sex === 'f' ? 'her' : 'him'} grow a hand taller since the spring. ` +
      `But nobody on ${w.name} should become grown just by getting tall. Tonight the moon is full, and ${p.name} will walk out to the standing stones, sit alone till first light by the stone raised for ${on[0].nm}, with a small fire and ${poss(p)} back to the village, and walk home at dawn. ` +
      `${His} mother packs ${poss(p)} cloak with a heel of bread. From now on every child of ${w.name} sits a night at the stones in the first autumn after turning thirteen.`);
  }
  const W = w.vigil;
  W.d = c.day; W.y = c.year; W.k++;
  W.cur = { d: c.day, on, ld: ld && !take.includes(ld) ? ld.id : null, ln: ld ? ld.name : null, ran: [] };
}
const vigilNames = (w, ids) => { const n = ids.map((id) => { const p = aliveId(w, id); return p ? p.name : null; }).filter(Boolean); return n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0] || ''; };
function vigilBroken(w) {
  const C = w.vigil.cur, ids = C.on.map((o) => o.id);
  for (const id of ids) { const p = aliveId(w, id); if (p && p.task && p.task.k === 'vigil') release(w, p); }
  w.vigil.cur = null;
  if (ids.length) log(w, `${w.wx.k === 'snow' ? 'Snow comes on' : 'A storm gets up'} in the middle of the night, and ${vigilNames(w, ids)} ${ids.length === 1 ? 'is' : 'are'} fetched home from the stones by torchlight. It does not count either way; there will be another moon.`, 'info');
}
function vigilHour(w, c, fx) {
  const V = w.vigil, C = V.cur, h = c.hour;
  C.on = C.on.filter((o) => { const p = aliveId(w, o.id); return p && !p.sick && !p.hurt && !p.cg && !isLost(w, p); });
  if (!C.on.length) { V.cur = null; return; }
  if (c.day === C.d && h === VIGIL_OUT) {
    const n = C.on.length, ids = C.on.map((o) => o.id), lead = C.ld != null && aliveId(w, C.ld);
    if (V.k > 1) log(w, `After supper ${vigilNames(w, ids)} ${n === 1 ? 'walks' : 'walk'} out to the standing stones${lead ? ` with ${lead.name}` : ''} under a ${moonLight(c.day) >= 15 ? 'full' : 'fat'} moon, ${n === 1 ? 'a cloak' : 'cloaks'} over ${n === 1 ? 'one arm' : 'their arms'}, to sit the night out by ${n === 1 ? `the stone for ${C.on[0].nm}` : 'the stones of the dead'}.`, 'info');
    return;
  }
  if (c.day === C.d + 1 && h === VIGIL_HOME) { vigilDawn(w, c, fx); return; }
  if (!(c.day === C.d && h >= 22) && !(c.day === C.d + 1 && h < VIGIL_HOME - 1)) return;
  const wolves = !!(w.beasts && w.beasts.some((b) => b.k === 'wolf')), big = !!((w.lone && w.lone.cur) || (w.bear && w.bear.cur));
  const odds = VIGIL_FEAR * (wolves ? 1.6 : 1) * (big ? 2 : 1) * (w.wx && w.wx.k === 'cold' ? 1.3 : 1);
  for (const o of [...C.on]) {
    const p = aliveId(w, o.id);
    if (d2(p.x, p.y, o.x, o.y) > 1 || rnd(w) >= odds * (ageY(w, p) < 15 ? 1.5 : 1)) continue; // still walking out, or holding fast
    const sound = big && w.bear && w.bear.cur ? 'something big crashes through the bracken at the edge of the trees' : big ? `${w.lone.cur.nm || 'the lone wolf'} howls close by, out past the ring` :
      wolves && rnd(w) < 0.5 ? 'a wolf howls in the woods behind the ring' : VIGIL_SOUNDS[(c.day + o.id) % VIGIL_SOUNDS.length];
    C.on = C.on.filter((q) => q !== o);
    C.ran.push(p.name);
    p.vr = (p.vr || 0) + 1; V.r++;
    release(w, p);
    if (fx) fx.push({ x: p.x, y: p.y - 0.5, text: 'runs home', color: 'sick' });
    log(w, `In the dead of the night ${sound}, and ${p.name} runs all the way home through the dark${p.vr > 1 ? ' again' : ''}. ${Cap(pron(p))} will have to sit it again; until then nobody will be pledged to ${p.sex === 'f' ? 'her' : 'him'}.`, 'bad');
    if (!C.on.length) { V.cur = null; return; }
  }
}
function vigilDawn(w, c, fx) {
  const V = w.vigil, C = V.cur, ids = C.on.map((o) => o.id), n = ids.length, ld = elder(w);
  for (const id of ids) {
    const p = aliveId(w, id);
    p.vg = c.year; V.n++;
    if (p.task && p.task.k === 'vigil') p.task = null;
    if (fx) fx.push({ x: p.x, y: p.y - 0.5, text: 'grown', color: 'food' });
  }
  V.cur = null;
  const names = vigilNames(w, ids), again = ids.filter((id) => { const p = aliveId(w, id); return p && p.vr; });
  const text = `At first light ${names} ${n === 1 ? 'walks' : 'walk'} home from the standing stones, stiff with cold and grey with ash, and ${ld ? ld.name : 'the eldest'} hands ${n === 1 ? (aliveId(w, ids[0]).sex === 'f' ? 'her' : 'him') : 'them'} the first bowl at the hearth. ` +
    `${n === 1 ? `${names} is` : 'They are'} counted among the grown now${again.length ? `, and nobody says a word about the night ${vigilNames(w, again)} ran` : ''}.` +
    (C.ran.length ? ` ${C.ran.join(' and ')} ${C.ran.length === 1 ? 'keeps' : 'keep'} to the house all day.` : '');
  if (V.n === n) milestone(w, text);
  else log(w, text, 'good');
}
// sitting the night out: by a stone, cloak round the shoulders. The eldest walks them out and turns home at 21:00
function vigilAct(w, p, c) {
  const C = w.vigil.cur, h = c.hour, R = w.stones;
  if (!((c.day === C.d && h >= VIGIL_OUT) || (c.day === C.d + 1 && h < VIGIL_HOME))) return false;
  const o = C.on.find((q) => q.id === p.id);
  if (!o) {
    if (p.id !== C.ld || c.day !== C.d || h >= VIGIL_OUT + 2 || p.sick || p.hurt) return false;
    if (!p.task || p.task.k !== 'vigil') { release(w, p); p.task = { k: 'vigil', x: R.cx, y: R.cy + 1, h: 99, ld: 1 }; }
    p.asleep = false;
    walk(w, p, R.cx + 0.5, R.cy + 1.6);
    return true;
  }
  if (!p.task || p.task.k !== 'vigil') { release(w, p); p.task = { k: 'vigil', x: Math.floor(o.x), y: Math.floor(o.y), h: 99 }; }
  p.asleep = false;
  walk(w, p, o.x, o.y);
  return true;
}

// ---------- the shallows ----------
// On hot summer afternoons the children go down to the beach nearest the village to paddle. They stand in
// the surf, splash, and feel for cockles with their toes (a handful of food, not much). The bed thins as it
// is dug and fills again slowly. Once a summer at most, the sea pulls a child out and the nearest grown
// islander goes in after them; nobody drowns. w.wade { b bathing tile (sand), n spells ever, c cockles in
// the bed, g cockles ever, y this year, nm first child, at tick learned, s scares ever, sy year of the last
// scare, sn who went in }
const WADE_AGE = 5;          // from this age
const WADE_R2 = 24 * 24;    // the bathing beach is within this of the hearth (squared)
const WADE_SPREAD = 4 * 4;   // the children spread along this much of it (squared)
const WADE_FROM = 10, WADE_TO = 18; // hours
const WADE_BED = 60;         // cockles the bed holds
const WADE_REFILL = 2;       // a day, spring to autumn
const WADE_DIG = 0.5;        // chance a spell turns any up
const WADE_GAP = 3;          // summers at least between two of them
const WADE_SCARE = 0.006;  // chance per spell that the sea takes a child out (once a summer at most)
const wadeOk = (w, c, h) => c.season === 1 && h >= WADE_FROM && h < WADE_TO && !!w.wx && (w.wx.k === 'heat' || w.wx.k === 'clear');
function wadeBeach(w) {
  let best = -1, bd = WADE_R2 + 1;
  for (const i of w.shore || []) {
    const x = i % MAP, y = (i - x) / MAP, dd = d2(x, y, w.fire.x, w.fire.y);
    if (dd < bd && lineOfLand(w, w.fire.x + 0.5, w.fire.y + 0.5, x + 0.5, y + 0.5)) { bd = dd; best = i; }
  }
  return best;
}
function seaSide(w, x, y) {
  for (const [a, b] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (tile(w, x + a, y + b) === T.WATER) return [a, b];
  return null;
}
function learnWade(w, c) {
  if (c.season !== 1 || !w.wx || w.wx.k !== 'heat' || !w.techs.includes('fishing')) return;
  const kids = w.people.filter((p) => !p.dead && ageY(w, p) >= WADE_AGE && ageY(w, p) < 14);
  if (kids.length < 2) return;
  const b = wadeBeach(w);
  if (b < 0) return;
  const a = kids[0], k = kids[kids.length - 1];
  w.wade = { b, n: 0, c: WADE_BED, g: 0, y: 0, nm: a.name, at: w.t, s: 0, sy: -99, sn: null };
  w.techs.push('wading');
  milestone(w, `The heat lies on ${w.name} like a blanket and the children are good for nothing, so ${a.name} leads them down to the beach below the village. ` +
    `They wade in to the knee and shriek at the cold, and ${k.name} feels something hard under a toe: a cockle. By evening they come home wet through with their shirts full of shells, and from now on the children go down to the shallows on hot afternoons.`);
}
function wadeTask(w, p) {
  const Wd = w.wade, bx = Wd.b % MAP, by = (Wd.b - bx) / MAP, spots = [];
  for (const i of w.shore) { const x = i % MAP, y = (i - x) / MAP; if (d2(x, y, bx, by) <= WADE_SPREAD) spots.push(i); }
  if (!spots.length) return null;
  const i = spots[ri(w, spots.length)], x = i % MAP, y = (i - x) / MAP, sd = seaSide(w, x, y);
  if (!sd || !lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return null;
  return { k: 'wade', x, y, dx: sd[0], dy: sd[1], h: 2 + ri(w, 2) };
}
function wadeDone(w, p, c, pop) {
  const Wd = w.wade;
  if (!Wd) return;
  Wd.n++;
  if (Wd.c >= 1 && rnd(w) < WADE_DIG) {
    const got = Math.min(Wd.c, 1 + ri(w, 3));
    Wd.c -= got; Wd.g += got; Wd.y += got; w.food += got;
    pop('+' + got + ' cockles', 'fish');
  }
  if (c.year - Wd.sy < WADE_GAP || rnd(w) >= WADE_SCARE) return;
  // the sea takes a child out: the nearest grown islander who is up and about goes in after them
  let who = null, bd = 1e9;
  for (const o of w.people) {
    if (o.dead || o.asleep || o.sick || o.hurt || (o.task && o.task.sea)) continue;
    const a = ageY(w, o);
    if (a < 14 || a >= 65) continue;
    const dd = d2(o.x, o.y, p.x, p.y);
    if (dd < bd) { bd = dd; who = o; }
  }
  Wd.sy = c.year; Wd.s++; Wd.sn = who ? who.id : null;
  const them = p.sex === 'f' ? 'her' : 'him';
  const kin = who && (who.id === p.mother || who.id === p.father) ? `, ${p.name}'s ${who.sex === 'f' ? 'mother' : 'father'},` : '';
  const how = [
    `wades out after a cockle, steps off the edge of the sand bar and is pulled away by the sea`,
    `is knocked flat by a big wave and dragged out with the backwash`,
    `swims out on a dare to the dark water past the breakers and cannot get back`,
  ][Wd.s === 1 ? 0 : ri(w, 3)];
  const after = Wd.s === 1 ? ' Nobody goes past the knee for the rest of the summer.' : [' The children are kept on the sand for a week.', ' That night the children are told the sea is not their friend.', ''][ri(w, 3)];
  const text = who
    ? `${p.name} ${how}. The other children scream from the beach. ${who.name}${kin} comes running, goes in to the chest, gets hold of ${them} by the hair and drags ${them} back, coughing and blue.${after}`
    : `${p.name} ${how}. The other children scream, but there is nobody grown on the beach; at last ${p.name} kicks free of the current and crawls back up the sand, coughing and blue.`;
  if (Wd.s === 1) milestone(w, text); else log(w, text, 'bad');
}
function wadeDay(w, c) {
  if (!w.wade) { learnWade(w, c); return; }
  if (c.season < 3) w.wade.c = Math.min(WADE_BED, w.wade.c + WADE_REFILL);
}

// ---------- the whale ----------
// Now and then a long storm drives a whale onto the sand. The morning after, whoever can be spared goes
// down with flint knives and cuts it up: strips of meat for the stores and blubber for the fires. After a
// few days it starts to rot and the gulls take the rest; the ribs are left standing on the beach for good.
// w.whale { n strandings ever, g meat ever, last tick, cur { x, y sand tile, dx, dy toward the sea, at, d day ashore,
//   m meat left, m0 at the start, g meat cut, hands [ids], nm finder, rot told }, bones [{ x, y, dx, dy, t, g, n hands }] }
const WHALE_YEAR = 2;        // nobody walks the far beaches in the first year
const WHALE_ODDS = 0.02;     // chance per storm day of a spell that ends, that it leaves a whale behind
const WHALE_MAX = 0.1;       // however long the storm
const WHALE_GAP = 3 * TICKS_PER_YEAR; // at most one every few years
const WHALE_MEAT = 1200;     // meat and blubber on a whale
const WHALE_CUT = 18;        // meat a cutter carries up for each spell of work (+0..9)
const WHALE_OIL = 0.08;      // timber's worth of blubber for the fires per meat
const WHALE_HANDS = 8;       // knives at the carcass at once
const WHALE_FRESH = 3;       // days before it turns
const WHALE_ROT = 0.7;       // share left each day after that
const WHALE_GONE = 30;       // meat left that is not worth the stink
const WHALE_BONES = 6;       // skeletons kept on the beaches
const WHALE_SPOTS = [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4], [0, -0.7], [0, 0.7], [-0.9, 0], [0.9, 0]];
function whaleStorm(w, c, n) {
  if (w.whale === undefined || c.year < WHALE_YEAR || !w.shore || !w.shore.length) return;
  const W = w.whale;
  if (W && (W.cur || w.t - W.last < WHALE_GAP)) return;
  if (rnd(w) >= Math.min(WHALE_MAX, WHALE_ODDS * n)) return;
  const R2 = 26 * 26, fx = w.fire.x + 0.5, fy = w.fire.y + 0.5, spots = [];
  for (const i of w.shore) {
    const x = i % MAP, y = (i - x) / MAP, dd = d2(x + 0.5, y + 0.5, fx, fy);
    if (dd < 36 || dd > R2 || (W && W.bones.some((b) => d2(b.x, b.y, x, y) < 9))) continue;
    if (lineOfLand(w, fx, fy, x + 0.5, y + 0.5)) spots.push(i);
  }
  if (!spots.length) return;
  const i = spots[ri(w, spots.length)], x = i % MAP, y = (i - x) / MAP;
  const [dx, dy] = DIRS4.find(([a, b]) => tile(w, x + a, y + b) === T.WATER);
  const adults = w.people.filter((p) => !p.dead && ageY(w, p) >= 14);
  const who = adults.length ? adults[ri(w, adults.length)] : null;
  const first = !W;
  if (first) { w.whale = { n: 0, g: 0, last: 0, cur: null, bones: [] }; w.techs.push('whale'); }
  const V = w.whale;
  V.n++; V.last = w.t;
  V.cur = { x, y, dx, dy, at: w.t, d: c.day, m: WHALE_MEAT, m0: WHALE_MEAT, g: 0, hands: [], nm: who ? who.name : null, rot: 0 };
  const side = sideOf(w, x, y), len = n === 1 ? 'the storm' : `${spellLen(n).toLowerCase()} of storm`;
  if (first) milestone(w, `After ${len} ${who ? who.name : 'someone'} walks the ${side} beach to see what the sea has thrown up, and finds a whale: a grey hill of a beast longer than any house, lying in the surf with gulls already on its back. ` +
    `It is dead. By noon every islander who can carry a knife is down there, cutting. ${w.name} learns that the sea sometimes gives as well as takes.`);
  else log(w, `${len.charAt(0).toUpperCase() + len.slice(1)} ${n === 1 ? 'leaves' : 'leave'} a whale stranded on the ${side} beach. ${who ? who.name : 'Someone'} runs up to the village with the news, and the knives come out.`, 'good');
}
function whaleTask(w, p) {
  const C = w.whale && w.whale.cur;
  if (!C || C.m <= 0) return null;
  for (let s = 0; s < WHALE_HANDS; s++) {
    const key = 'w' + s;
    if (w.res[key] != null) continue;
    const [ox, oy] = WHALE_SPOTS[s];
    const x = C.x + ox - C.dx * 0.3, y = C.y + oy - C.dy * 0.3; // on the landward side of the carcass
    if (tile(w, Math.floor(x + 0.5), Math.floor(y + 0.5)) === T.WATER) continue;
    if (!lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) return null;
    return { k: 'whale', key, x, y, h: 3 };
  }
  return null;
}
function whaleCut(w, p, pop) {
  const C = w.whale && w.whale.cur;
  if (!C || C.m <= 0) return;
  const got = Math.min(C.m, WHALE_CUT + ri(w, 10));
  C.m -= got; C.g += got; w.whale.g += got;
  w.food += got;
  w.timber = Math.round((w.timber + got * WHALE_OIL) * 100) / 100;
  if (!C.hands.includes(p.id)) C.hands.push(p.id);
  pop('+' + got, 'meat');
  if (C.m <= 0) whaleDone(w, 'cut');
}
function whaleDone(w, how) {
  const W = w.whale, C = W.cur;
  W.bones.push({ x: C.x, y: C.y, dx: C.dx, dy: C.dy, t: w.t, g: C.g, n: C.hands.length });
  if (W.bones.length > WHALE_BONES) W.bones.shift();
  W.cur = null;
  const hands = plural(C.hands.length, 'pair of hands', 'pairs of hands');
  log(w, how === 'cut'
    ? `The whale is cut to the bone: ${C.g} meat and blubber carried up from the beach by ${hands}. The ribs stand on the sand like the frame of a house.`
    : `The gulls and the tide have the rest of the whale. ${C.g} meat was carried up before it turned; the ribs are left bleaching on the sand.`, 'good');
}
function whaleDay(w, c) {
  const C = w.whale && w.whale.cur;
  if (!C) return;
  const days = c.day - C.d;
  if (days < WHALE_FRESH) return;
  C.m = Math.floor(C.m * WHALE_ROT);
  if (!C.rot && C.m >= 200) { C.rot = 1; log(w, 'The whale on the beach has begun to stink. The cutters hurry to strip what is still good before the gulls and the tide take it.', 'info'); }
  if (C.m < WHALE_GONE) { C.m = 0; whaleDone(w, 'rot'); }
}

// ---------- castaways ----------
// Some autumn and winter gales out of the open sea leave a wreck on a far beach: the broken planks of a boat from no
// shore anyone knows, and among them, sometimes, someone still breathing. The morning after, whoever walks the beach
// first finds it and shouts for the nearest pair of hands; the two of them carry the stranger up between them to the
// healer's fire. Out on the sand the cold kills in hours (fewer in winter), so a long walk can come too late, and the
// drowned are buried with the island's own. Those who live stay: laid up a while, with nothing but their own name, and
// after a year the words to say where they came from. The planks are dragged up for timber; the ribs stay on the sand.
// w.wreck { n wrecks, s saved, dr dead, last tick, cur, hulks [{ x, y, dx, dy, t, nm }], tl [castaway ids yet to tell], lo { nm, k, y } }
// cur { x, y sand tile, dx, dy toward the sea, at, d day, n storm days, nm, sex, a, live, life tick the cold takes them, st 'lie'|'carry'|'done',
//   by [carrier ids], fnd finder's name, id the castaway once reached, cx, cy where they lie or are carried, ux, uy carry heading,
//   tx, ty, hm home id they are carried to, k 'saved'|'cold'|'drowned'|'sea', side, wood }
// p.cw is the tick a castaway was carried in, p.cf which tale of where they came from (once told).
const WRECK_YEAR = 6;         // nobody walks the far beaches looking before this
const WRECK_ODDS = 0.05;      // chance per storm day of an autumn or winter spell that ends
const WRECK_MAX = 0.25;
const WRECK_GAP = 4 * TICKS_PER_YEAR;
const WRECK_LIVE = 0.7;       // someone is still alive among the planks
const WRECK_SEEN = 7;         // hour the first one out on the beach finds it
const WRECK_CARRY = 2;        // tiles an hour with someone carried between two (half with one)
const WRECK_HURT = 14;        // days laid up by the healer's fire
const WRECK_DAYS = 3;         // days before the planks are dragged up
const WRECK_WOOD = 14;        // timber in the planks (+0..10)
const WRECK_HULKS = 4;        // old wrecks kept on the beaches
const WRECK_SYL = ['tor', 'vak', 'ung', 'skal', 'dra', 'eik', 'gun', 'hjal', 'brak', 'orm', 'sve', 'ald', 'ryk', 'thu', 'oda', 'kel'];
const WRECK_FROM = [
  ['a long coast to the south', (p) => `a long coast far to the south, where the cliffs are black and the people burn whale oil in stone lamps. ${Cap(pron(p))} draws its shape in the ash with a stick`],
  ['a big island toward the sunrise', (p) => `an island far bigger than this one, three days toward the sunrise, where the boats carry a square sail of stitched hides and need no paddles. ${Cap(pron(p))} draws one in the sand for the children`],
  ['a crowded shore', (p) => `a crowded shore where every field is taken, and the young are sent off in boats each spring to find their own ground. The gale found ${p.sex === 'f' ? 'hers' : 'his'} first`],
  ['a fishing boat of six', (p) => `a fishing boat of six from a shore beyond sight of the far isle, driven out of sight of land by the gale. ${Cap(pron(p))} is the only one the sea gave back`],
];
export const wreckFrom = (p) => (p && p.cf != null && WRECK_FROM[p.cf] ? WRECK_FROM[p.cf][0] : null);
export const wreckNow = (w) => (w.wreck && w.wreck.cur) || null;
function wreckStorm(w, c, n) {
  if (w.wreck === undefined || c.year < WRECK_YEAR || c.season < 2 || !w.shore || !w.shore.length) return;
  const W = w.wreck;
  if (W && (W.cur || w.t - W.last < WRECK_GAP)) return;
  if (rnd(w) >= Math.min(WRECK_MAX, WRECK_ODDS * n)) return;
  const R2 = 26 * 26, fx = w.fire.x + 0.5, fy = w.fire.y + 0.5, spots = [], wh = w.whale;
  for (const i of w.shore) {
    const x = i % MAP, y = (i - x) / MAP, dd = d2(x + 0.5, y + 0.5, fx, fy);
    if (dd < 64 || dd > R2) continue;
    if (wh && (wh.bones.some((b) => d2(b.x, b.y, x, y) < 9) || (wh.cur && d2(wh.cur.x, wh.cur.y, x, y) < 9))) continue;
    if (W && W.hulks.some((b) => d2(b.x, b.y, x, y) < 9)) continue;
    if (w.seal && w.seal.x != null && d2(w.seal.x, w.seal.y, x, y) < 9) continue;
    if (lineOfLand(w, fx, fy, x + 0.5, y + 0.5)) spots.push(i);
  }
  if (!spots.length) return;
  const i = spots[ri(w, spots.length)], x = i % MAP, y = (i - x) / MAP;
  const [dx, dy] = DIRS4.find(([a, b]) => tile(w, x + a, y + b) === T.WATER);
  if (!W) w.wreck = { n: 0, s: 0, dr: 0, last: 0, cur: null, hulks: [], tl: [], lo: null };
  const V = w.wreck;
  V.n++; V.last = w.t;
  const sex = rnd(w) < 0.5 ? 'f' : 'm', a = 16 + ri(w, 24);
  const s1 = ri(w, WRECK_SYL.length), nm = Cap(WRECK_SYL[s1] + WRECK_SYL[(s1 + 1 + ri(w, WRECK_SYL.length - 1)) % WRECK_SYL.length]);
  const live = rnd(w) < WRECK_LIVE ? 1 : 0;
  const life = w.t + (c.season === 3 ? 12 + ri(w, 12) : 18 + ri(w, 14));
  V.cur = { x, y, dx, dy, at: w.t, d: c.day, n, nm, sex, a, live, life, st: 'lie', by: [], fnd: null, id: null,
    cx: Math.round((x + 0.5 + dx * 0.1) * 1000) / 1000, cy: Math.round((y + 0.5 + dy * 0.1) * 1000) / 1000, ux: 0, uy: 0,
    tx: 0, ty: 0, hm: null, k: null, side: sideOf(w, x, y), wood: WRECK_WOOD + ri(w, 11) };
}
function wreckFit(w, p) {
  if (p.dead || p.sick || p.hurt || isLost(w, p) || (p.task && p.task.sea)) return false;
  const a = ageY(w, p);
  return a >= 16 && a <= 55 && !(w.horn && w.horn.hid === p.id) && !(w.watch && w.watch.hid === p.id) && !(w.heal && w.heal.id === p.id);
}
// the morning after: the first one out on that beach sees it, and shouts for whoever is nearest
function wreckSeen(w, c, C) {
  const able = w.people.filter((p) => wreckFit(w, p));
  if (!able.length) return;
  const f = C.fnd == null ? able[ri(w, able.length)] : nearest(able, { x: C.x + 0.5, y: C.y + 0.5 }, () => true);
  let h = null, bd = 1e9;
  for (const p of able) { if (p === f) continue; const dd = d2(p.x, p.y, f.x, f.y); if (dd < bd) { bd = dd; h = p; } }
  C.by = h ? [f.id, h.id] : [f.id];
  if (C.fnd != null) return; // the first pair gave out; others go down in their place
  C.fnd = f.name;
  const len = C.n === 1 ? 'the storm' : `${spellLen(C.n).toLowerCase()} of storm`, one = C.sex === 'f' ? 'a woman' : 'a man';
  if (!w.techs.includes('wreck')) {
    w.techs.push('wreck');
    milestone(w, `After ${len} ${f.name} walks the ${C.side} beach to see what the sea has thrown up, and finds planks: the broken ribs and sides of a boat bigger than any dugout, pegged together by hands nobody on ${w.name} knows. ` +
      `Among them, face down at the edge of the surf, lies ${one}. ${f.name} shouts${h ? ` for ${h.name}` : ''} and runs. There are other shores out there than the far isle.`);
  } else log(w, `After ${len} ${f.name} finds a wreck on the ${C.side} beach, and ${one} lying among the planks. ${h ? `${f.name} and ${h.name} run` : `${f.name} runs`} down to the surf.`, 'bad');
}
function wreckSpot(C, i) { // kneeling on the landward side, one at the head and one at the feet
  const bx = C.x + 0.5 - C.dx * 0.35, by = C.y + 0.5 - C.dy * 0.35, s = i ? -0.4 : 0.4;
  return [Math.round((bx + C.dy * s) * 1000) / 1000, Math.round((by + C.dx * s) * 1000) / 1000];
}
function wreckHour(w, c) {
  const W = w.wreck, C = W.cur;
  if (C.st === 'done') return;
  if (C.live && C.id == null && w.t >= C.life) { C.live = 0; C.cold = 1; } // the cold gets there before anyone does
  if (C.by.length) C.by = C.by.filter((id) => { const p = aliveId(w, id); return p && !p.sick && !p.hurt && !isLost(w, p); });
  if (C.st === 'lie') {
    if (!C.by.length) { if (c.hour >= WRECK_SEEN && c.hour < 18) wreckSeen(w, c, C); return; }
    const at = C.by.map((id, i) => { const p = aliveId(w, id), [sx, sy] = wreckSpot(C, i); return p.x === sx && p.y === sy; });
    if (C.id == null && at.some(Boolean)) { wreckReach(w, c, C); if (C.st === 'done') return; }
    if (C.id != null && at.every(Boolean)) wreckLift(w, C);
    return;
  }
  // carrying: up the beach and in to the fire, slowly, by torchlight if it comes to that
  const q = aliveId(w, C.id);
  if (!q || !C.by.length) { C.st = 'done'; for (const id of C.by) { const p = aliveId(w, id); if (p) release(w, p); } C.by = []; return; }
  const o = { x: C.cx, y: C.cy }, there = moveToward(o, C.tx, C.ty, C.by.length >= 2 ? WRECK_CARRY : WRECK_CARRY / 2);
  const dx = o.x - C.cx, dy = o.y - C.cy, dd = Math.sqrt(dx * dx + dy * dy);
  if (dd > 0) { C.ux = Math.round((dx / dd) * 1000) / 1000; C.uy = Math.round((dy / dd) * 1000) / 1000; }
  C.cx = o.x; C.cy = o.y;
  if (there) wreckHome(w, c, C, q);
}
// the first of them gets there: alive, or not
function wreckReach(w, c, C) {
  const W = w.wreck, f = aliveId(w, C.by[0]) || aliveId(w, C.by[1]);
  const q = addPerson(w, C.sex, C.a, null, null, null);
  q.x = q.px = C.cx; q.y = q.py = C.cy; q.cgi = 1;
  const him = C.sex === 'f' ? 'her' : 'him', he = C.sex === 'f' ? 'she' : 'he';
  if (!C.live) {
    q.name = 'Nameless';
    C.k = C.cold ? 'cold' : 'drowned';
    W.dr++; W.lo = { nm: null, k: C.k, y: c.year };
    for (const id of C.by) deed(w, aliveId(w, id), 'c');
    log(w, C.k === 'cold' ? `${f ? f.name : 'The finder'} gets to the stranger too late: the sea let ${him} go alive, but the cold on the sand came first. ${w.name} buries ${him} with its own, and nobody knows what name to cut.` : `${f ? f.name : 'The finder'} turns the stranger over: the sea had ${him} long before the storm let go. ${w.name} buries ${him} with its own, and nobody knows what name to cut.`, 'death');
    die(w, q, C.k === 'cold' ? `was found cold and still among the planks of a wreck on the ${C.side} beach` : `was found drowned among the planks of a wreck on the ${C.side} beach`);
    for (const id of C.by) { const p = aliveId(w, id); if (p) release(w, p); }
    C.by = []; C.st = 'done';
    return;
  }
  q.name = C.nm; q.cw = w.t; q.hurt = w.t + WRECK_HURT * TICKS_PER_DAY;
  C.id = q.id; C.k = 'saved';
  log(w, `${f ? f.name : 'Someone'} turns the ${C.sex === 'f' ? 'woman' : 'man'} in the surf over: blue with cold, but breathing. ${Cap(he)} opens ${C.sex === 'f' ? 'her' : 'his'} eyes and says something in a tongue nobody on ${w.name} has heard.`, 'good');
}
// both carriers there: lift, and make for the healer's fire (or the finder's own)
function wreckLift(w, C) {
  const hl = w.heal && aliveId(w, w.heal.id), f = aliveId(w, C.by[0]), to = hl || f;
  const hb = homeOf(w, to);
  C.hm = to && to.home != null && hb.id != null ? to.home : null;
  C.tx = hb.x + 0.5; C.ty = Math.round((hb.y + 1.2) * 1000) / 1000;
  C.st = 'carry';
}
function wreckHome(w, c, C, q) {
  const W = w.wreck, hl = w.heal && aliveId(w, w.heal.id);
  const names = C.by.map((id) => aliveId(w, id)).filter(Boolean);
  for (const p of names) { deed(w, p, 'c'); release(w, p); }
  q.x = C.tx; q.y = C.ty;
  if (C.hm != null && w.buildings.some((b) => b.id === C.hm)) q.home = C.hm;
  W.s++; W.tl.push(q.id); W.lo = { nm: q.name, k: 'saved', y: c.year };
  C.by = []; C.st = 'done';
  const who = names.length ? names.map((p) => p.name).join(' and ') : 'They', his = q.sex === 'f' ? 'her' : 'his', He = q.sex === 'f' ? 'She' : 'He';
  const where = hl && C.hm === hl.home ? `${hl.name}'s fire` : 'a fire';
  const text = `${who} carry the stranger up from the ${C.side} beach to ${where}, and ${hl ? `${hl.name} rubs ${q.sex === 'f' ? 'her' : 'him'} warm with goose fat and herbs` : `they rub ${q.sex === 'f' ? 'her' : 'him'} warm`}. ${He} has one word for them, over and over, a hand on ${his} chest: ${q.name}.`;
  if (W.s === 1) milestone(w, `${text} ${w.name} has taken in someone the sea brought.`);
  else log(w, text, 'good');
}
function wreckDay(w, c) {
  const W = w.wreck, C = W.cur;
  if (C && c.day >= C.d + WRECK_DAYS && C.st !== 'carry' && !(C.st === 'lie' && C.by.length)) {
    if (C.st === 'lie' && C.id == null) { // nobody ever got down to it
      W.dr++; W.lo = { nm: null, k: 'sea', y: c.year };
      log(w, `The tide comes back for the stranger on the ${C.side} beach before anyone could get down to ${C.sex === 'f' ? 'her' : 'him'}.`, 'death');
    }
    w.timber = Math.round((w.timber + C.wood) * 100) / 100;
    W.hulks.push({ x: C.x, y: C.y, dx: C.dx, dy: C.dy, t: C.at, nm: C.k === 'saved' ? C.nm : null });
    if (W.hulks.length > WRECK_HULKS) W.hulks.shift();
    log(w, `The planks of the wreck on the ${C.side} beach are dragged up above the tide line: ${C.wood} timber of good split oak. Its ribs are left in the sand.`, 'info');
    W.cur = null;
  }
  // a year on, a castaway has the words to say where they came from
  for (let k = W.tl.length - 1; k >= 0; k--) {
    const p = aliveId(w, W.tl[k]);
    if (!p) { W.tl.splice(k, 1); continue; }
    if (w.t - p.cw < TICKS_PER_YEAR) continue;
    W.tl.splice(k, 1);
    p.cf = ri(w, WRECK_FROM.length);
    log(w, `A year after the sea gave ${p.name} to ${w.name}, ${pron(p)} has the words at last to tell where ${pron(p)} came from: ${WRECK_FROM[p.cf][1](p)}.`, 'good');
  }
}
// the carriers, and the castaway between them
function wreckAct(w, p) {
  const C = w.wreck.cur;
  if (C.st === 'done') return false;
  if (C.id === p.id) { p.asleep = false; if (p.task) release(w, p); p.x = C.cx; p.y = C.cy; return true; }
  const i = C.by.indexOf(p.id);
  if (i < 0) return false;
  p.asleep = false;
  if (!p.task || p.task.k !== 'wreck') { release(w, p); p.task = { k: 'wreck', x: C.x, y: C.y, h: 99 }; }
  if (C.st === 'carry') {
    const s = i ? -0.45 : 0.45;
    p.x = Math.round((C.cx + C.ux * s) * 1000) / 1000; p.y = Math.round((C.cy + C.uy * s) * 1000) / 1000;
    return true;
  }
  const [sx, sy] = wreckSpot(C, i);
  walk(w, p, sx, sy);
  return true;
}

// ---------- wildfire ----------
// After a run of summer heat the woods are tinder. Dry thunder, or a storm that brings lightning but no
// rain at first, can set a tall tree alight; the fire creeps from tree to tree with the wind, through
// dry grass and into the standing grain, and can catch a roof. Every islander who can stand goes out
// with green branches to beat at the edge nearest the houses; rain puts it out. Burnt woods lie black
// for a season, then open grass, and in a few years birch saplings creep back.
// w.blaze { n fires ever, burnt tiles ever, y tiles this year, last tick, ash [[tile, tick, k 0 grass|1 trees|2 scorched]],
//   cur { at, x, y origin, wd wind 0..3, b [[tile, hours left]], t tiles burnt, s scorched, f fields, r roofs, g grain, hands [ids], first,
//   gt/gd the hour and the spots where beaters stood } }
const BLAZE_YEAR = 2;        // the first summer is too green
const BLAZE_HEAT = 0.02;   // chance per heatwave day from the 4th that dry thunder strikes the woods
const BLAZE_BOLT = 0.25;     // chance a summer storm that breaks a heat spell of 3+ days sets a tree alight first
const BLAZE_SPREAD = 0.2;// chance per hour that a burning tree sets a full-grown neighbour alight
const BLAZE_GRASS = 0.025;   // dry grass
const BLAZE_CROP = 0.07;     // standing or ripe grain, or the stubble
const BLAZE_ROOF = 0.04;     // a thatch next to the flames
const BLAZE_GUARD = 0.25;    // x this with someone beating at the flames beside it
const BLAZE_WIND = [1.8, 1, 0.4, 1]; // downwind, across, upwind, across
const BLAZE_WX = { heat: 1.4, clear: 0.7, cold: 0.6, fog: 0.4, storm: 0.6, rain: 0.2, snow: 0 };
const BLAZE_DOUSE = { rain: 0.35, storm: 0.25, fog: 0.06, snow: 1 }; // chance per hour each burning tile is put out
const BLAZE_NIGHT = 0.5;     // the dew damps it down from dusk to dawn
const BLAZE_BEAT = 0.15;     // chance per hour a beater puts out the tile in front of them
const BLAZE_SEEN = 3;        // hours before the smoke is seen and the alarm goes round
const BLAZE_REACH = 22 * 22; // flames farther than this from the hearth are left to burn
const BLAZE_SCALD = 0.003;   // chance per hour a beater is burnt
const BLAZE_GRAIN = 400;     // grain a burning granary loses at most
const ASH_SPROUT = 360;      // days before saplings come up through the ash
const ASH_TREE = 0.001;     // daily chance after that, for each burnt tile still open
const ASH_KEEP = 1080;       // days the ground still shows the burn
const DIRS4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const WIND_NAME = ['west', 'north', 'east', 'south']; // the wind blows from here (it drives the fire the other way)
function sideOf(w, x, y) {
  const dx = x - w.fire.x, dy = y - w.fire.y, ns = dy < 0 ? 'north' : 'south', ew = dx < 0 ? 'west' : 'east';
  return Math.abs(dy) * 2 < Math.abs(dx) ? ew : Math.abs(dx) * 2 < Math.abs(dy) ? ns : `${ns}-${ew}`;
}
export const blazeOn = (w) => !!(w.blaze && w.blaze.cur);
function blazeDay(w, c, was, wasN) {
  const B = w.blaze;
  if (B) {
    if (c.doy === 0) B.y = 0;
    if (B.ash.length) B.ash = B.ash.filter((a) => ashDay(w, a));
  }
  if (B && B.cur) return;
  if (c.year < BLAZE_YEAR || c.season !== 1 || !w.wx) return;
  const k = w.wx.k;
  let odds = 0, bolt = false;
  if (k === 'heat' && w.wx.n >= 3) odds = BLAZE_HEAT * (w.harvest < 0.8 ? 2 : 1); // worse in a dry year
  else if (k === 'storm' && w.wx.n === 1 && was === 'heat' && wasN >= 3) { odds = BLAZE_BOLT; bolt = true; }
  if (!odds || rnd(w) >= odds) return;
  let at = -1;
  for (let tries = 0; tries < 300 && at < 0; tries++) {
    const x = 1 + ri(w, MAP - 2), y = 1 + ri(w, MAP - 2), i = idx(x, y);
    if (w.tiles[i] === T.FOREST && w.wood[i] >= 8 && d2(x, y, w.fire.x, w.fire.y) >= 36) at = i;
  }
  if (at < 0) return;
  blazeStart(w, at, bolt, k === 'heat' ? w.wx.n : wasN);
}
// once a day each burnt tile ages: black, then grass, then saplings; dropped once it is built on, ploughed or grown over
function ashDay(w, a) {
  const [i, t, k] = a, age = (w.t - t) / TICKS_PER_DAY, tt = w.tiles[i];
  if (age >= ASH_KEEP || (k === 2 ? tt !== T.FOREST : tt !== T.GRASS)) return false;
  if (k === 2 || age < ASH_SPROUT || rnd(w) >= ASH_TREE) return true;
  const x = i % MAP, y = (i - x) / MAP;
  if ((w.wear && w.wear[i] >= PATH_AT) || nearBuild(w, x, y, 1) || DIRS4.some(([ax, ay]) => tile(w, x + ax, y + ay) === T.FIELD)) return true;
  setTile(w, i, T.FOREST); w.wood[i] = 1;
  return false;
}
function blazeStart(w, at, bolt, n) {
  if (!w.blaze) w.blaze = { n: 0, burnt: 0, y: 0, last: -1, ash: [], cur: null };
  const B = w.blaze, x = at % MAP, y = (at - x) / MAP, wd = ri(w, 4);
  B.n++; B.last = w.t;
  B.cur = { at: w.t, x, y, wd, b: [[at, blazeHours(w, at)]], t: 0, s: 0, f: 0, r: 0, g: 0, hands: [], first: B.n === 1 ? 1 : 0 };
  const where = sideOf(w, x, y), wind = WIND_NAME[wd], far = d2(x, y, w.fire.x, w.fire.y) > BLAZE_REACH, who = elder(w);
  const how = bolt ? 'A storm walks in off the sea with no rain in it yet, and lightning' : 'Dry thunder rolls over the island at noon, and a bolt';
  if (B.n === 1) {
    milestone(w, `${spellLen(n)} of heat have dried the woods of ${w.name} to tinder. ${how} strikes a tall tree in the ${where} woods. ` +
      `By the time ${who ? who.name : 'anyone'} sees the smoke the treetops are alight, and ${wind === 'east' ? 'an' : 'a'} ${wind} wind is driving the flames on. Nobody on ${w.name} has fought a fire before. ` +
      (far ? 'It is too far off to reach; the village can only watch it burn.' : `${who ? who.name : 'The eldest'} sends everyone who can stand to cut green branches and beat at the edge nearest the houses.`));
  } else log(w, `${bolt ? 'Lightning' : 'Dry thunder'} sets the ${where} woods alight. Smoke rolls over ${w.name} on ${wind === 'east' ? 'an' : 'a'} ${wind} wind` + (far ? ', too far off to reach.' : ', and everyone runs for green branches.'), 'bad');
}
function blazeHours(w, i) {
  const tt = w.tiles[i];
  return tt === T.FOREST ? 3 + (w.wood[i] >> 2) : tt === T.FIELD ? 2 : 1;
}
// the hour's burning: each tile alight can set its neighbours going, then burns down a little
function blazeHour(w, c) {
  const B = w.blaze, C = B.cur, wx = w.wx ? w.wx.k : 'clear';
  const busy = new Set();
  for (const e of C.b) busy.add(e[0]);
  for (let k = B.ash.length - 1; k >= 0 && B.ash[k][1] >= C.at; k--) busy.add(B.ash[k][0]);
  const dry = wx === 'storm' && w.wx.n === 1 && C.at > w.t - 24; // the storm that brought the lightning has no rain in it at first
  const f0 = (dry ? 1 : BLAZE_WX[wx] ?? 1) * (c.hour >= 21 || c.hour < 6 ? BLAZE_NIGHT : 1), douse = dry ? 0.02 : BLAZE_DOUSE[wx] || 0;
  const gd = C.gt === w.t - 1 ? C.gd : []; // where the beaters stood last hour
  const guarded = (x, y) => gd.some(([gx, gy]) => d2(gx, gy, x + 0.5, y + 0.5) <= 4);
  const keep = [], lit = [];
  for (const e of C.b) {
    const i = e[0], x = i % MAP, y = (i - x) / MAP;
    if (douse && rnd(w) < douse) { blazeOut(w, i, true); continue; }
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS4[d][0], ny = y + DIRS4[d][1];
      if (!inMap(nx, ny)) continue;
      const n = idx(nx, ny);
      if (busy.has(n)) continue;
      const tt = w.tiles[n], fw = BLAZE_WIND[(d - C.wd + 4) % 4] * f0;
      if (tt === T.FOREST) {
        if (rnd(w) < BLAZE_SPREAD * (0.3 + (0.7 * w.wood[n]) / TREE_MAX) * fw) { busy.add(n); lit.push([n, blazeHours(w, n)]); }
      } else if (tt === T.GRASS) {
        if (rnd(w) < BLAZE_GRASS * (wx === 'heat' ? 2 : 1) * fw) { busy.add(n); lit.push([n, 1]); }
      } else if (tt === T.FIELD) {
        const f = fieldAt(w, nx, ny);
        if (!f || !(f.stage === 'ripe' || f.stage === 'harvested' || (f.stage === 'planted' && f.growth >= 0.4))) continue;
        if (rnd(w) < BLAZE_CROP * fw * (guarded(nx, ny) ? BLAZE_GUARD : 1)) {
          busy.add(n); lit.push([n, 2]);
          if (f.stage !== 'harvested') C.f++;
          f.stage = 'fallow'; f.growth = 0; f.burnt = 1; f.lost = f.fence = f.hg = undefined;
        }
      } else if (tt === T.BUILD) {
        const b = w.buildings.find((o) => o.x === nx && o.y === ny);
        if (!b || b.progress < 1 || b.dmg) continue;
        if (rnd(w) < BLAZE_ROOF * fw * (guarded(nx, ny) ? BLAZE_GUARD : 1)) {
          busy.add(n);
          b.progress = 0.75; b.dmg = 1; b.burnt = 1; C.r++;
          let lost = 0;
          if (b.kind === 'granary') {
            const gs = w.buildings.filter((o) => o.kind === 'granary' && o.progress >= 0.75).length || 1;
            lost = Math.round(Math.min(BLAZE_GRAIN, Math.max(0, w.food - sealed(w)) / gs));
            w.food = Math.round((w.food - lost) * 100) / 100; C.g += lost;
          }
          log(w, b.kind === 'granary' ? `Sparks catch the granary thatch. The roof burns off${lost ? ` and ${lost} grain is scorched` : ''} before the fire can be beaten out.`
            : 'Sparks catch a thatch by the woods. The roof burns off over the hearth inside; the family drag out what they can.', 'bad');
        }
      }
    }
    if (--e[1] <= 0) blazeOut(w, i, false);
    else keep.push(e);
  }
  C.b = keep.concat(lit);
  if (!C.b.length) blazeOver(w, wx);
}
function fieldAt(w, x, y) {
  for (const f of w.fields) if (f.x === x && f.y === y) return f;
  return null;
}
// a tile stops burning: put out (the trees stand scorched) or burnt down (ash)
function blazeOut(w, i, saved) {
  const B = w.blaze, C = B.cur, tt = w.tiles[i];
  if (tt === T.FOREST && saved) { w.wood[i] = Math.max(1, w.wood[i] >> 1); B.ash.push([i, w.t, 2]); C.s++; return; }
  if (tt === T.FOREST) { w.wood[i] = 0; setTile(w, i, T.GRASS); B.ash.push([i, w.t, 1]); C.t++; B.burnt++; B.y++; return; }
  if (tt === T.GRASS) { B.ash.push([i, w.t, 0]); C.t++; B.burnt++; B.y++; }
}
function blazeOver(w, wx) {
  const B = w.blaze, C = B.cur, hrs = w.t + 1 - C.at;
  B.cur = null;
  const where = `the ${sideOf(w, C.x, C.y)} woods`;
  const long = hrs <= 30 ? 'a day' : spellLen(Math.max(2, Math.round(hrs / 24))).toLowerCase();
  const head = BLAZE_DOUSE[wx] ? `Rain puts out the fire in ${where} after ${long}.`
    : C.hands.length ? `The last flames in ${where} are beaten out after ${long}.` : `The fire in ${where} burns itself out after ${long}.`;
  const hurt = [];
  if (C.t) hurt.push(`${plural(C.t, 'acre', 'acres')} of wood and grass ${C.t === 1 ? 'is' : 'are'} black ash`);
  if (C.s) hurt.push(`${plural(C.s, 'stand', 'stands')} of trees ${C.s === 1 ? 'was' : 'were'} saved, scorched`);
  if (C.f) hurt.push(`${plural(C.f, 'field', 'fields')} of grain burnt`);
  if (C.r) hurt.push(`${plural(C.r, 'roof', 'roofs')} lost${C.g ? ` and ${C.g} grain with it` : ''}`);
  let text = head + (hurt.length ? ' ' + Cap(andJoin(hurt.join('; '))) + '.' : '');
  const names = C.hands.map((id) => aliveId(w, id)).filter(Boolean);
  if (names.length) {
    const top = names.slice(0, 3).map((p) => p.name), more = names.length - top.length;
    text += ` ${andJoin((more ? top.concat([`${more} more`]) : top).join('; '))} beat at the flames with green branches until their arms gave out.`;
  }
  if (C.first) text += ' Where the woods burnt, the grass will come up first.';
  if (C.first || C.t >= 30 || C.r) milestone(w, text); else log(w, text, 'bad');
}
// someone able goes to beat at the flames nearest the houses, so long as they are within reach
function blazeFight(w, p, c) {
  const C = w.blaze.cur, fx = w.fire.x, fy = w.fire.y;
  const cc = cacheOf(w);
  if (!cc.blazeAt || cc.blazeAt.t !== w.t || cc.blazeAt.c !== C) cc.blazeAt = { t: w.t, c: C, n: new Map() }; // beaters already sent to each tile this hour
  const G = cc.blazeAt;
  if (C.gt !== w.t) { C.gt = w.t; C.gd = []; }
  let t = p.task && p.task.k === 'blaze' && C.b.some((e) => e[0] === p.task.o) ? p.task.o : -1;
  if (t < 0) {
    let bs = 1e9;
    for (const [i] of C.b) {
      const x = i % MAP, y = (i - x) / MAP, dh = d2(x, y, fx, fy);
      if (dh > BLAZE_REACH) continue;
      const s = dh + d2(x + 0.5, y + 0.5, p.x, p.y) + 30 * (G.n.get(i) || 0);
      if (s < bs && lineOfLand(w, p.x, p.y, x + 0.5, y + 0.5)) { bs = s; t = i; }
    }
    if (t < 0) return false;
  }
  G.n.set(t, (G.n.get(t) || 0) + 1);
  const x = t % MAP, y = (t - x) / MAP, cx = x + 0.5, cy = y + 0.5;
  if (!p.task || p.task.k !== 'blaze' || p.task.o !== t) {
    release(w, p);
    const dx = p.x - cx, dy = p.y - cy, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    p.task = { k: 'blaze', o: t, x: Math.round((cx + (dx / dd) * 0.9 - 0.5) * 100) / 100, y: Math.round((cy + (dy / dd) * 0.9 - 0.5) * 100) / 100, h: 99 };
  }
  p.asleep = false;
  if (!walk(w, p, p.task.x + 0.5, p.task.y + 0.5)) return true;
  C.gd.push([p.x, p.y]);
  if (rnd(w) < BLAZE_SCALD) {
    p.hurt = w.t + 6 * TICKS_PER_DAY;
    log(w, `${p.name} is caught by a gust of flame and staggers back with ${poss(p)} arms burnt.`, 'bad');
    release(w, p);
    return true;
  }
  if (rnd(w) < BLAZE_BEAT) {
    C.b = C.b.filter((e) => e[0] !== t);
    blazeOut(w, t, true);
    if (!C.hands.includes(p.id)) C.hands.push(p.id);
    if (!C.b.length) blazeOver(w, w.wx ? w.wx.k : 'clear');
  }
  return true;
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
  // v28 -> v29: snowmen. None yet; the first winter day of deep snow sends the children out to the green.
  28: (w) => {
    if (w.snow === undefined) w.snow = null;
  },
  // v29 -> v30: wildfire. Nothing has burnt yet; a summer heat spell can bring the first dry thunder.
  29: (w) => {
    if (w.blaze === undefined) w.blaze = null;
  },
  // v30 -> v31: the dugout. No boat yet; once the far isle's has been seen often enough, the best fisher fells an oak for one.
  30: (w) => {
    if (w.canoe === undefined) w.canoe = null;
  },
  // v31 -> v32: coppice. No stools yet; from year 8 someone notices the shoots on an old stump one spring.
  31: (w) => {
    if (w.copse === undefined) w.copse = null;
  },
  // v33: the roll of names behind the Families view. The living and the graves are already known;
  // only those whose graves sink or who sail away from now on are added.
  32: (w) => {
    if (!w.roll) w.roll = [];
  },
  // v33 -> v34: hedges. Nobody has thought of thorn yet; fences broken from now on are counted toward it.
  33: (w) => {
    if (w.hedge === undefined) w.hedge = null;
    if (w.fauna && w.fauna.br === undefined) w.fauna.br = 0;
  },
  // v34 -> v35: whales. None stranded yet; the next long storm may leave one on the sand.
  34: (w) => {
    if (w.whale === undefined) w.whale = null;
  },
  // v35 -> v36: late frost. No spring has turned yet; the next cold snap after the sowing can kill the young grain.
  35: (w) => {
    if (w.frost === undefined) w.frost = null;
  },
  // v36 -> v37: the shallows. Nobody has gone wading yet; the first heatwave of a summer sends the children to the beach.
  36: (w) => {
    if (w.wade === undefined) w.wade = null;
  },
  // v37 -> v38: smudge fires. Learned once a second late frost has killed young grain.
  37: (w) => {
    if (w.smudge === undefined) w.smudge = null;
  },
  // v38 -> v39: the moon. Raiders row in only on dark-moon or foggy nights; the watchers learn it at a full moon.
  38: (w) => {
    if (w.moon === undefined) w.moon = null;
  },
  // v39 -> v40: grain rust. A wet spell in late spring or summer can bring rust to the growing grain.
  39: (w) => {
    if (w.rust === undefined) w.rust = null;
  },
  // v40 -> v41: rogueing. Learned after a rust outbreak reaches 6 fields; pulled fields carry f.rg.
  40: (w) => {
    if (w.rogue === undefined) w.rogue = null;
  },
  // v41 -> v42: bees. None kept yet; from year 3 a woodcutter may find a wild swarm in a hollow tree on a warm summer day.
  41: (w) => {
    if (w.bees === undefined) w.bees = null;
  },
  // v42 -> v43: the lone wolf. None yet; one may come in spring once the hunters have taken 3 wolves and the pack is held at two.
  42: (w) => {
    if (w.lone === undefined) w.lone = null;
  },
  // v43 -> v44: rainbows. None seen yet; one may stand over the island when a spell of rain breaks into a clear day.
  43: (w) => {
    if (w.bow === undefined) w.bow = null;
  },
  // v44 -> v45: sky lore. Not learned yet; the eldest may put the signs together after a storm that tears a roof.
  44: (w) => {
    if (w.lore === undefined) w.lore = null;
  },
  // v45 -> v46: muck. Not learned yet; a harvest by the goat pen, once goats have been kept two years, shows it.
  45: (w) => {
    if (w.muck === undefined) w.muck = null;
  },
  // v46 -> v47: foot rot. None yet; a long wet spell with a full pen may lame the goats (g.lm, g.im).
  46: (w) => {
    if (w.rot === undefined) w.rot = null;
  },
  // v47 -> v48: hoof paring. Not learned yet; once foot rot has killed 2 goats, the end of that outbreak teaches it (g.pf, w.pare).
  47: (w) => {
    if (w.pare === undefined) w.pare = null;
  },
  // v48 -> v49: the wolf-skin cloak (p.cl, w.cloak). None yet; the one who kills the next lone wolf will wear its pelt.
  48: (w) => {
    if (w.cloak === undefined) w.cloak = null;
  },
  // v49 -> v50: squalls at sea (w.squall). None yet; an afternoon out in the dugout may be caught by one.
  49: (w) => {
    if (w.squall === undefined) w.squall = null;
  },
  // v50 -> v51: cheese (w.cheese). Not learned yet; a warm summer day, once goats have been kept three years, turns the milk.
  50: (w) => {
    if (w.cheese === undefined) w.cheese = null;
  },
  // v51 -> v52: rooks (w.crow). None yet; once there are 10 fields a flock comes down on the seed or the ripe grain.
  51: (w) => {
    if (w.crow === undefined) w.crow = null;
  },
  // v52 -> v53: fog signs. Not learned yet; a sky reader who has seen the fog cost the village learns them when a long fog lifts.
  52: (w) => {
    if (w.lore) for (const [k, v] of Object.entries(FOG_FRESH())) if (w.lore[k] === undefined) w.lore[k] = v;
  },
  // v53 -> v54: the spring (w.spring). Set by the village at the next daily reckoning, brim-full; a dry summer can make it fail.
  53: (w) => {
    if (w.spring === undefined) w.spring = null;
  },
  // v54 -> v55: the bear (w.bear). None yet; a late summer with honey or cheese in the village may bring one over the bar.
  54: (w) => {
    if (w.bear === undefined) w.bear = null;
  },
  // v55 -> v56: seals (w.seal). None yet; once the dugout has made enough trips they follow the fish in to a quiet beach.
  55: (w) => {
    if (w.seal === undefined) w.seal = null;
  },
  // v56 -> v57: the midsummer race (w.fest.race, rn, rl). Not run yet; the children start it at the next midsummer.
  56: (w) => {
    if (w.fest) { if (w.fest.race === undefined) w.fest.race = null; if (w.fest.rn === undefined) w.fest.rn = 0; if (w.fest.rl === undefined) w.fest.rl = null; }
  },
  // v57 -> v58: scarecrows (w.crow.m and its counts). None stand yet; the eldest thinks of one once the children have driven the flock off often enough.
  57: (w) => {
    if (w.crow) for (const [k, v] of Object.entries(SCARE_FRESH())) if (w.crow[k] === undefined) w.crow[k] = v;
  },
  // v58 -> v59: the whooping cough (w.cough, p.cg, p.cgi). Not come yet; it waits for enough island-born children who never had it.
  58: (w) => {
    if (w.cough === undefined) w.cough = null;
  },
  // v59 -> v60: the standing stones (w.stones). Not begun; a rich late summer with hands to spare sets the eldest marking out a ring.
  59: (w) => {
    if (w.stones === undefined) w.stones = null;
  },
  // v60 -> v61: quarrels between households (w.quarrel). None yet; two neighbouring houses fall out once the village is big enough.
  60: (w) => {
    if (w.quarrel === undefined) w.quarrel = null;
  },
  // v61 -> v62: incomers from the far isle (w.inc, p.fi). None yet; a household may cross over some spring once the far isle knows the island.
  61: (w) => {
    if (w.inc === undefined) w.inc = null;
  },
  // v62 -> v63: the bear pit (w.bear.pd, pit, kl, skin). A village a bear has raided often enough sets the hunters digging next spring.
  62: (w) => {
    const B = w.bear;
    if (!B) return;
    if (B.pit === undefined) B.pit = null;
    if (!B.pit && !B.cur && w.techs.includes('hunting') && (B.r >= PIT_NIGHTS || B.k)) B.pd = 1;
  },
  // v63 -> v64: spinning and the loom (w.loom). Not found yet; a bitter winter day once the goat herd is big enough.
  63: (w) => {
    if (w.loom === undefined) w.loom = null;
  },
  // v64 -> v65: lovers across the thorn branch (w.quarrel.cur.lv, w.quarrel.el/ran/back). No feud is running yet.
  64: (w) => {
    if (w.quarrel && w.quarrel.cur && w.quarrel.cur.lv === undefined) w.quarrel.cur.lv = null;
  },
  // v65 -> v66: storm tides (w.surge, f.sa/f.sw). None yet; a storm at a new or full moon can bring the sea over the low fields.
  65: (w) => {
    if (w.surge === undefined) w.surge = null;
  },
  // v66 -> v67: ale and the harvest home (w.ale). Not found yet; a wet day after the harvest once the stores are deep.
  66: (w) => {
    if (w.ale === undefined) w.ale = null;
  },
  // v67 -> v68: the night at the stones (w.vigil; p.vg, p.vr). Not begun; the first clear autumn night near the full moon
  // with a stone in the ring and an islander of 13 to 17 begins it. Nobody alive has run from it, so nobody is barred from a match.
  67: (w) => {
    if (w.vigil === undefined) w.vigil = null;
  },
  // v68 -> v69: the well (w.well). Not begun; the first spring or summer the spring runs low after it has once failed,
  // the eldest says to dig it down. The spring level may now fall below 0, down to the bottom of the well.
  68: (w) => {
    if (w.well === undefined) w.well = null;
  },
  // v69 -> v70: castaways (w.wreck; p.cw). Nothing washed up yet; an autumn or winter storm from year 6 may leave a wreck.
  69: (w) => {
    if (w.wreck === undefined) w.wreck = null;
  },
};
export function migrate(w) {
  while (w.v < SIM_VERSION) {
    const m = MIGRATIONS[w.v];
    if (m) m(w);
    w.v++;
  }
  // every load: one shared shape for villagers, fields and buildings (see personShape)
  w.people = reshape(w.people, personShape);
  w.fields = reshape(w.fields, fieldShape);
  w.buildings = reshape(w.buildings, buildingShape);
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
    hedging: !!w.hedge, hedges: w.fields.filter((f) => f.hg != null).length, hedgesGrown: w.fields.filter((f) => hedged(w, f)).length, hedgeTurned: (w.hedge && w.hedge.k) || 0,
    boarsTaken: (w.fauna && w.fauna.sb) || 0, wolvesTaken: (w.fauna && w.fauna.sw) || 0,
    deer: (w.beasts || []).filter((b) => b.k === 'deer').length, deerTaken: (w.fauna && w.fauna.sd) || 0,
    festival: !!(w.fest && w.fest.on === c.day && c.hour >= FEST_FROM && c.hour < FEST_TO), midsummers: (w.fest && w.fest.n) || 0,
    race: !!(w.fest && w.fest.rn), racing: raceNow(w, c) ? w.fest.race.rs.length : 0, raceWin: (raceOn(w, c) && w.fest.race.nm) || null,
    races: (w.fest && w.fest.rn) || 0, raceLast: (w.fest && w.fest.rl) || null,
    coughing: w.people.filter((p) => p.cg).length, nursing: w.cough ? w.cough.nu.length : 0, coughs: (w.cough && w.cough.k) || 0, coughLost: (w.cough && w.cough.lost) || 0, coughHad: w.people.filter((p) => p.cgi).length,
    quarrel: quarrelOf(w) ? `${w.quarrel.cur.an}'s and ${w.quarrel.cur.bn}'s houses` : null, quarrels: (w.quarrel && w.quarrel.k) || 0,
    quarrelFights: (w.quarrel && w.quarrel.f) || 0, quarrelsMended: (w.quarrel && w.quarrel.m) || 0, peaceCup: !!(w.quarrel && w.quarrel.cup != null),
    bruised: w.quarrel ? w.people.filter((p) => quarrelBruised(w, p)).length : 0,
    lovers: loveKnown(w), loversOut: !!(loveNight(w) && loveNight(w).on === c.day && c.hour >= LOVE_FROM),
    ranAway: (w.quarrel && w.quarrel.ran) || 0, cameBack: (w.quarrel && w.quarrel.back) || 0, awayNow: (w.quarrel && w.quarrel.el) ? `${w.quarrel.el.f.nm} and ${w.quarrel.el.m.nm}` : null,
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
    moon: moonName(c.day), moonLight: moonLight(c.day), moonLore: !!w.moon, moonRested: w.moon ? w.moon.s : 0,
    gifts: (w.raid && w.raid.peace) || 0, giftGrain: (w.raid && w.raid.pg) || 0, gifted: !!(w.raid && w.raid.gift === c.year),
    incomers: w.inc ? w.inc.p : 0, incHouses: w.inc ? w.inc.n : 0, incBoat: w.inc && w.inc.cur ? w.inc.cur.st : null, incDue: !!(w.inc && w.inc.on != null),
    raiders: w.raid && w.raid.cur ? w.raid.cur.st : null, feud: !!(w.isle && w.isle.feud >= c.year),
    jars: w.pot ? w.pot.j : 0, jarsWet: w.pot ? w.pot.wet : 0, jarsSealed: Math.round(sealed(w)), potter: (w.pot && w.pot.id != null && w.pot.nm) || null, firings: w.pot ? w.pot.f : 0,
    snowmen: w.snow ? w.snow.men.filter((m) => m.s >= 3).length : 0, snowmenEver: w.snow ? w.snow.n : 0,
    blaze: blazeOn(w), blazeAlight: blazeOn(w) ? w.blaze.cur.b.length : 0, blazeFires: w.blaze ? w.blaze.n : 0, blazeBurnt: w.blaze ? w.blaze.burnt : 0,
    blazeFighting: blazeOn(w) ? w.people.filter((p) => p.task && p.task.k === 'blaze').length : 0,
    canoe: !!w.canoe, canoeOk: !!(w.canoe && w.canoe.ok), canoeDug: w.canoe && !w.canoe.ok && w.canoe.wk >= 0 ? Math.round((w.canoe.wk / CANOE_WORK) * 100) : null,
    canoeOut: (w.canoe && w.canoe.at != null && (aliveId(w, w.canoe.at) || {}).name) || null, canoeTrips: w.canoe ? w.canoe.t : 0,
    canoeFish: w.canoe ? w.canoe.f : 0, canoeYear: w.canoe ? w.canoe.y : 0, canoeDeep: w.canoe ? w.canoe.d : 0, canoeLost: w.canoe ? w.canoe.lost : 0,
    squall: (w.squall && w.squall.cur && w.squall.cur.nm) || null, squallSwim: !!(w.squall && w.squall.cur && w.squall.cur.sw),
    squallWatch: w.squall && w.squall.cur ? w.people.filter((p) => !p.dead && p.task && p.task.k === 'shore').length : 0,
    squalls: w.squall ? w.squall.n : 0, squallYear: w.squall ? w.squall.y : 0, squallIn: w.squall ? w.squall.h : 0,
    squallSwam: w.squall ? w.squall.s : 0, squallDrowned: w.squall ? w.squall.d : 0, squallBoats: w.squall ? w.squall.b : 0,
    squallLast: (w.squall && w.squall.last) || null,
    copse: !!w.copse, copseStools: w.copse ? w.copse.s.length : 0, copseReady: w.copse ? w.copse.s.filter((i) => w.wood[i] >= 6).length : 0,
    copseYear: w.copse ? Math.round(w.copse.y) : 0, copseCut: w.copse ? w.copse.n : 0, copseCap: w.copse ? copseCap(w) : 0,
    whales: w.whale ? w.whale.n : 0, whaleMeat: w.whale ? w.whale.g : 0, whaleLeft: w.whale && w.whale.cur ? w.whale.cur.m : null,
    whaleCutting: w.whale && w.whale.cur ? w.people.filter((p) => p.task && p.task.k === 'whale').length : 0,
    wrecks: w.wreck ? w.wreck.n : 0, wreckSaved: w.wreck ? w.wreck.s : 0, wreckDrowned: w.wreck ? w.wreck.dr : 0,
    wreckNow: w.wreck && w.wreck.cur ? w.wreck.cur.st : null, wreckWho: w.wreck && w.wreck.cur ? (w.wreck.cur.st === 'carry' || w.wreck.cur.k === 'saved' ? w.wreck.cur.nm : null) : null,
    wreckLast: (w.wreck && w.wreck.last) || null,
    frosts: w.frost ? w.frost.n : 0, frostKilled: w.frost ? w.frost.k : 0, frostYear: w.frost ? w.frost.y : 0,
    frostBlack: w.fields.filter((f) => f.fr != null).length,
    surges: w.surge ? w.surge.n : 0, saltNow: w.surge && w.surge.s ? w.fields.filter((f) => f.sa != null).length : 0,
    saltEver: w.surge ? w.surge.k : 0, saltYear: w.surge ? w.surge.y : 0, surgeWood: w.surge ? w.surge.g : 0,
    surgeBoats: w.surge ? w.surge.b : 0, surgeNow: surgeWet(w),
    wading: !!w.wade, waders: w.wade ? w.people.filter((p) => p.task && p.task.k === 'wade').length : 0,
    cockles: w.wade ? w.wade.g : 0, cocklesYear: w.wade ? w.wade.y : 0, cockleBed: w.wade ? w.wade.c : 0, wadeScares: w.wade ? w.wade.s : 0,
    smudge: !!w.smudge, smudgeFires: w.smudge ? w.smudge.on.length : 0, smudgeNights: w.smudge ? w.smudge.n : 0,
    smudgeSaved: w.smudge ? w.smudge.s : 0, smudgeYear: w.smudge ? w.smudge.y : 0,
    rusts: w.rust ? w.rust.n : 0, rustOn: !!(w.rust && w.rust.cur), rusted: w.fields.filter((f) => f.ru != null && f.rg == null && growing(f)).length,
    rustEver: w.rust ? w.rust.k : 0, rustYear: w.rust ? w.rust.y : 0, rustGrain: w.rust ? w.rust.g : 0,
    rogue: !!w.rogue, rogueEver: w.rogue ? w.rogue.n : 0, rogueStopped: w.rogue ? w.rogue.k : 0,
    rogued: w.fields.filter((f) => f.rg != null && growing(f)).length,
    rogueing: w.rogue && w.rust && w.rust.cur ? w.people.filter((p) => p.task && p.task.k === 'rogue').length : 0,
    bees: !!w.bees, hives: beesAlive(w), hiveLogs: w.bees ? w.bees.h.length : 0, honey: w.bees ? w.bees.hy : 0, honeyYear: w.bees ? w.bees.y : 0,
    honeyEver: w.bees ? w.bees.g : 0, swarms: w.bees ? w.bees.sw : 0, swarmsLost: w.bees ? w.bees.sl : 0, hivesDied: w.bees ? w.bees.d : 0,
    meads: w.bees ? w.bees.m : 0, honeyWounds: w.bees ? w.bees.mw : 0, honeyTaking: w.bees ? w.people.filter((p) => p.task && p.task.k === 'honey').length : 0,
    lone: (w.lone && w.lone.cur && w.lone.cur.nm) || null, loneCame: w.lone ? w.lone.n : 0, loneGoats: (w.lone && w.lone.cur && w.lone.cur.g) || 0,
    loneBit: (w.lone && w.lone.cur && w.lone.cur.b) || 0, loneHunts: (w.lone && w.lone.cur && w.lone.cur.h) || 0,
    loneKilled: w.lone ? w.lone.dead : 0, loneLast: (w.lone && w.lone.last) || null,
    bear: w.bear && w.bear.cur ? w.bear.cur.nm : null, bearRaid: (w.bear && w.bear.cur && (w.beasts.find((b) => b.id === w.bear.cur.id) || {}).raid) || null,
    bearVisits: w.bear ? w.bear.n : 0, bearNights: w.bear ? w.bear.r : 0, bearYear: w.bear ? w.bear.yr || 0 : 0, bearComb: w.bear ? w.bear.hc : 0,
    bearCheese: w.bear ? w.bear.cc : 0, bearSplit: w.bear ? w.bear.k : 0, bearDriven: w.bear ? w.bear.dv : 0, bearSwipes: w.bear ? w.bear.m : 0,
    bearPit: !w.bear ? null : w.bear.pit ? ['digging', 'open', 'covered', 'bear in it'][w.bear.pit.s] : w.bear.pd ? 'planned' : null,
    pitDug: w.bear && w.bear.pit && !w.bear.pit.s ? Math.round(w.bear.pit.d / PIT_DIG * 100) : 0,
    pitDigging: w.bear && w.bear.pit && !w.bear.pit.s ? w.people.filter((p) => !p.dead && p.task && p.task.k === 'pit').length : 0,
    pitRound: w.bear && w.bear.pit ? w.bear.pit.sk : 0, pitChildren: w.bear && w.bear.pit ? w.bear.pit.ch : 0,
    bearsTaken: (w.bear && w.bear.kl) || 0, bearSkin: (w.bear && w.bear.skin) || null,
    cloaks: w.people.filter((p) => !p.dead && p.cl).map((p) => `${p.name} (${p.cl.nm})`), cloaksMade: w.cloak ? w.cloak.n : 0,
    rainbows: w.bow ? w.bow.n : 0, rainbowYear: w.bow ? w.bow.y : 0, rainbow: bowOn(w, c), rainbowReached: w.bow ? w.bow.k : 0,
    rainbowChasers: bowOn(w, c) ? w.people.filter((p) => p.task && p.task.k === 'bow').length : 0,
    lore: !!w.lore, skyReader: w.lore ? w.lore.rd : null, stormCalled: !!(w.lore && w.lore.on === c.day + 1 && c.hour >= LORE_READ),
    loreCalls: w.lore ? w.lore.n : 0, loreRight: w.lore ? w.lore.h : 0, loreMissed: w.lore ? w.lore.m : 0, loreFalse: w.lore ? w.lore.f : 0,
    loreHeld: w.lore ? w.lore.s : 0, loreHeldYear: w.lore ? w.lore.y : 0, loreReaped: w.lore ? w.lore.g : 0,
    fogLore: !!(w.lore && w.lore.fl != null), fogCalled: !!(w.lore && w.lore.fl != null && w.lore.fg === c.day + 1 && c.hour >= LORE_READ), fogKept: fogKept(w),
    fogCalls: w.lore ? w.lore.fn || 0 : 0, fogRight: w.lore ? w.lore.fh || 0 : 0, fogMissed: w.lore ? w.lore.fm || 0 : 0, fogFalse: w.lore ? w.lore.ff || 0 : 0,
    fogPenned: w.lore ? w.lore.fk || 0 : 0, fogStayed: w.lore ? w.lore.fc || 0 : 0,
    roofsTied: w.buildings.filter((b) => b.tie).length, roping: w.people.filter((p) => p.task && (p.task.k === 'tie' || p.task.eve)).length,
    muck: !!w.muck, muckHeap: w.muck ? Math.floor(w.muck.h / MUCK_FIELD) : 0, mucked: w.fields.filter((f) => f.mk).length,
    muckYear: w.muck ? w.muck.y : 0, muckEver: w.muck ? w.muck.n : 0, muckGrain: w.muck ? w.muck.g : 0, muckGrainYear: w.muck ? w.muck.yg : 0,
    mucking: w.muck ? w.people.filter((p) => p.task && p.task.k === 'muck').length : 0,
    lame: w.goats ? w.goats.herd.filter((g) => g.lm != null).length : 0, rots: w.rot ? w.rot.n : 0, rotLame: w.rot ? w.rot.k : 0, rotDied: w.rot ? w.rot.d : 0,
    paring: !!w.pare, pared: w.pare ? w.pare.n : 0, paredYear: w.pare ? w.pare.y : 0, rotHeld: w.pare ? w.pare.s : 0,
    folded: w.goats ? w.goats.herd.filter((g) => g.lm != null && g.pf != null).length : 0,
    paringNow: w.pare ? w.people.filter((p) => p.task && p.task.k === 'pare').length : 0,
    cheese: !!w.cheese, cheeseRack: w.cheese ? w.cheese.c : 0, cheesePail: w.cheese ? Math.floor(w.cheese.p) : 0, cheeseMade: w.cheese ? w.cheese.n : 0,
    cheeseYear: w.cheese ? w.cheese.y : 0, cheeseEaten: w.cheese ? w.cheese.e : 0, cheeseDays: w.cheese ? w.cheese.d : 0, cheeseFed: cheeseFed(w),
    cheeseMaking: w.cheese ? w.people.filter((p) => p.task && p.task.k === 'cheese').length : 0,
    loom: !!w.loom, weaver: w.loom ? w.loom.nm : null, weaverAlive: !!(w.loom && aliveId(w, w.loom.id)), blankets: w.loom ? w.loom.b : 0, blanketCover: loomCover(w),
    hair: w.loom ? Math.round(w.loom.h) : 0, yarn: w.loom ? Math.floor(w.loom.y) : 0, onLoom: w.loom ? w.loom.wv : 0, woven: w.loom ? w.loom.n : 0, wovenYear: w.loom ? w.loom.yb : 0,
    weaving: w.loom ? w.people.filter((p) => p.task && p.task.k === 'weave').length : 0,
    ale: !!w.ale, brewer: w.ale ? w.ale.nm : null, brewerAlive: !!(w.ale && aliveId(w, w.ale.id)), aleJugs: w.ale ? Math.floor(w.ale.a) : 0, aleCap: w.ale ? aleCap(w) : 0,
    aleVat: brewing(w), brews: w.ale ? w.ale.n : 0, aleGrain: w.ale ? w.ale.g : 0, aleGrainYear: w.ale ? w.ale.yg : 0, aleDrunk: w.ale ? w.ale.d : 0,
    aleSour: w.ale ? Math.round(w.ale.s) : 0, aleWater: w.ale ? w.ale.wa : 0, harvestHomes: w.ale ? w.ale.hh : 0, harvestHomeNow: !!(w.ale && aleNight(w, clock(w.t))),
    brewingNow: w.ale ? w.people.filter((p) => p.task && p.task.k === 'brew').length : 0,
    well: !!w.well, wellRings: wellDeep(w), wellDug: w.well ? Math.round((w.well.h / wellWork(w.well.d)) * 100) : 0,
    wellCaves: w.well ? w.well.c : 0, wellHit: w.well ? w.well.hit : 0, wellBy: w.well ? w.well.nm : null,
    wellDigging: w.well ? w.people.filter((p) => p.task && p.task.k === 'well').length : 0,
    crows: !!w.crow, crowFlock: w.crow ? w.crow.b : 0, crowDown: crowsDown(w), crowLandings: w.crow ? w.crow.n : 0,
    crowYear: w.crow ? Math.round(w.crow.y) : 0, crowEver: w.crow ? Math.round(w.crow.g) : 0, crowStripped: w.crow ? w.crow.st : 0,
    scaring: !!(w.crow && w.crow.sc), scared: w.crow ? w.crow.s : 0, scaredYear: w.crow ? w.crow.ys : 0,
    scarers: w.crow && w.crow.cur ? w.people.filter((p) => !p.dead && p.task && p.task.k === 'scare').length : 0,
    scarecrows: w.crow && w.crow.m ? w.crow.m.length : 0, scareFound: w.crow && w.crow.m ? w.crow.m.filter((o) => o.d <= 0).length : 0,
    scareTurned: w.crow ? w.crow.mt || 0 : 0, scareYear: w.crow ? w.crow.my || 0 : 0, scareMoved: w.crow ? w.crow.mv || 0 : 0,
    scareMaking: w.crow && w.crow.m ? w.people.filter((p) => !p.dead && p.task && p.task.k === 'crowman').length : 0,
    spring: !!w.spring, springLevel: w.spring ? Math.round((w.spring.l / SPRING_FULL) * 100) : 0, springDry: springDry(w),
    springNeed: w.spring ? w.spring.nd : 0, springCarried: w.spring ? w.spring.c : 0, springThirst: thirst(w),
    springDays: w.spring ? w.spring.k : 0, springFailed: w.spring ? w.spring.f : 0, springDryYear: w.spring ? w.spring.yd : 0,
    springThirstYear: w.spring ? w.spring.yt : 0, springThirstEver: w.spring ? w.spring.th : 0, springDied: w.spring ? w.spring.d : 0,
    springLoads: w.spring ? w.spring.n : 0, springCarrying: w.spring && w.spring.dry ? w.people.filter((p) => p.task && p.task.k === 'water').length : 0,
    seals: w.seal ? w.seal.n : 0, sealsCame: !!w.seal, sealPups: w.seal ? w.seal.p : 0, sealFish: w.seal ? w.seal.e : 0, sealFishYear: w.seal ? w.seal.ye : 0,
    sealing: !!(w.seal && w.seal.h != null), sealsTaken: w.seal ? w.seal.k : 0, sealsYear: w.seal ? w.seal.yk : 0, sealSkins: w.seal ? w.seal.s : 0,
    sealBites: w.seal ? w.seal.b : 0, sealFloat: !!(w.seal && w.seal.fl != null), floatSaves: w.seal ? w.seal.fs : 0,
    sealer: (w.seal && (w.people.find((p) => !p.dead && p.task && p.task.k === 'seal') || {}).name) || null,
    stones: !!w.stones, stonesUp: w.stones ? w.stones.s.length : 0, stoneHaul: w.stones && w.stones.cur ? w.stones.cur.nm : null,
    stoneHauling: stoneOn(w, c) ? w.people.filter((p) => !p.dead && p.task && p.task.k === 'stone').length : 0, stoneFeet: w.stones ? w.stones.hurt : 0,
    vigil: !!w.vigil, vigilSat: w.vigil ? w.vigil.n : 0, vigilRan: w.vigil ? w.vigil.r : 0, vigilNights: w.vigil ? w.vigil.k : 0,
    vigilNow: vigilFire(w, c) ? vigilNames(w, w.vigil.cur.on.map((o) => o.id)) : null,
    vigilShy: w.people.filter((p) => vigilShy(p)).map((p) => p.name),
    goatMilk: w.goats ? Math.round(w.goats.ym) : 0, herder: (w.goats && w.goats.hid != null && (w.people.find((p) => p.id === w.goats.hid) || {}).name) || null,
  };
}

// Keys are hashed in sorted order: a world reloaded from JSON holds the same values as the one that ran on,
// but a key that was cleared to undefined and set again may sit in a different place in the object.
const sortedKeys = (k, v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v) || ArrayBuffer.isView(v)) return v;
  const o = {};
  for (const key of Object.keys(v).sort()) o[key] = v[key];
  return o;
};
export function fingerprint(w) {
  const s = JSON.stringify(w, sortedKeys);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
