# Ideas backlog

## Owner requests (do these next, one per visit)


Loose, unordered. Take whatever the island needs most; add new ideas at the bottom.

- Fishing: shore tiles, boats later; steady food that doesn't depend on harvest.
- Granaries / pottery: lower spoilage of stored grain.
- Better crops (crop rotation, irrigation from the coast): higher field yield, fewer dry-year losses.
- Forestry: replanting so the woods don't vanish as the village grows.
- Stone and quarries: stone houses that hold more people and last.
- Paths and roads drawn between houses, fields and the hearth (faster walking).
- Sickness and herbal medicine: outbreaks that sweep through crowded houses.
- Festivals at midsummer: everyone gathers at the fire, couples pair up.
- Boats and a second settlement on the far shore.
- Elders tell stories: richer chronicle entries, named generations, family trees.
- Visual: weather (rain, snowfall particles), smoke from chimneys in winter, birds, waves.
- UI: click a villager to follow them; family tree view; timelapse of the past year.
- Performance: spatial indexes so 1000+ villagers stay fast.
- Boats: fishing is done (shore only). Dugout canoes could fish deeper water, raise the fish cap, and later
  carry settlers to nearby isles.
- Smoking/drying fish: preserved catch for winter; fish spoils faster than grain once spoilage matters.
- Food is far above need in long runs (stores reach 1-2 years of supply). Spoilage, feasts or trade
  could give the surplus a purpose; births could depend on diet variety (grain + fish + wild food).
- Grass vanishes: forest reclaims nearly all open land by year 25, so every new field is cleared woodland.
  Grazing animals or coppicing could keep meadows open.
- Granaries are done. Field sprawl is now the big long-run problem: needFields keeps ~2 fields per person
  and they eat the woods. On seed 20261114 forest fell to ~210 tiles by Y85, timber hit 0, winters went
  cold and pop dropped 334 -> 281. Crop rotation / manuring (more yield per field, fewer fields) or
  forestry (replanting, coppice) would fix it; also stop building houses when the woodpile can't heat them.
- Granary discovery triggers in year 1 on new worlds (open heap >= 1000). Could tie it to a first
  visible loss instead (a "rats in the grain" event) so it feels earned.
- Weather is done (w.wx: k, n days, f fields flattened, r roofs, d deaths). Answers it invites:
  weather lore (elders read the sky: harvest ripe fields before a storm, stack wood before a frost),
  stone or thatch-pegged roofs that resist storms, irrigation ditches against heatwaves, a storm cellar.
- Storms could wreck fishers caught on the shore, or wash up driftwood / a castaway boat.
- Snow could slow walking and pile up on the map (white tiles that melt in spring); rainbows after rain.
- Spring cold snaps can run 15-20 days; a late frost could kill young shoots outright for real drama.
- Yearly history now records `storms` (storm days) and `flattened` (fields); a weather row in the
  graph panel would show bad years at a glance.
- Creatures are done (w.beasts, w.fauna: den, lair, fear, att, kills, raids; p.hurt; f.root/f.lost;
  yearly `wolves` attacks and `raids` nights). Answers they invite:
  - Hunting: spears, a hunter role that tracks boars into the lair (meat, hides) and thins the wolf
    pack (remove a beast; herd regrows in spring at doy 45 if >= 2 remain).
  - Fences / hedges around fields next to the woods (f.root never set behind a fence).
  - Guard dogs (tamed wolf cubs?): a dog with a lone worker counts as a helper in bite().
  - A palisade or watch fire at the treeline: wolves' edge() picks tiles farther out.
  - Herbal medicine shortens WOUND_DAYS; a bad bite could fester.
  - Boars only raid spring/summer here because grain is harvested by ~day 100; a second (autumn) crop
    or orchards/nuts would give them autumn targets.
- Speed pass done (results identical, fingerprints match the old code for 100 years): seed 4242 went
  from 2773 to 631 ms/yr on average and ~1.5 s at 331 people. Lookup caches live in a WeakMap in
  sim.js (never saved); tiles must change through setTile() in the step path or the field-site cache
  goes stale. What's left at 300+: the per-person cost of act() itself, garbage from task objects and
  'f'+id / 't'+i key strings, and idle adults calling pickTask every 2 h (~110k calls/yr). Giving idle
  workers longer rests, or numeric reservation keys, would be the next step (behaviour changes slightly).
- Goats are done (w.goats: pen, herd[], hid herder, at grazing spot, lost/eaten/milk, ym/yf/yl yearly). Answers
  they invite: cheese (milk kept for winter instead of drunk at once), a guard dog with the herder, wool or goat-hair
  cloth, keeping the herd in on fog days once a goat is lost (weather lore), a second pen when the herd is capped,
  goats browsing coppice near the village. Wolves could also try the pen on hungry winter nights.
- The first herder is often an adult founder for a few years until a child turns 7; that adult does no other work.
- Late game the woods within 20 tiles of the hearth are cut out: on seed 4242 timber falls from ~3000
  to 0 in Y97-100 with 98 houses burning 0.3 a day each. Charcoal, coppicing near the village, or
  shared longhouses (fewer hearths) would answer it; so would letting woodcutters walk farther.
- Hunting is done (tech 'hunting', SIM_VERSION 6; w.hides, fauna.hunt/sb/sw, p.haul, task keys h0/h1,
  yearly `hunted`). Hunters pin both herds at the floor of 2 most of the year, yet boars still raid
  ~10-20 nights a year (two boars are enough). Answers it invites:
  - Fences / hedges (still open above): the only real fix for raids now that hunting is capped.
  - Tanning: hides only cut winter firewood (up to 30%) and wear out by 40% a year; a tannery could
    turn them into leather (clothing for the frail in cold snaps, boat skins, water bags).
  - Hunter as a lasting role: the same pairs keep going out; skill could grow with each kill.
  - Deer on the meadows would give a non-dangerous quarry and keep grass open (see grass vanishing).
  - If the wolf pack is held at 2 too long, a lone wolf could turn bold (attacks by day) as a twist.
- Fences are done (tech 'fencing', SIM_VERSION 7; f.fence, fauna.fences/held/turned/broke, task key g<fieldId>,
  yearly `fences` standing). Raid nights fall to ~3-4 a year. Answers it invites:
  - Hedges: plant a living hawthorn hedge that takes years to grow but never rots (slow, cheap, lasting).
  - Boars that are shut out of the grain could turn hungry and bold, or root up the gardens near the houses.
  - Pigs: once the fences stand, piglets caught at the lair could be penned and fattened (first livestock).
  - A fence/raids row in the graph panel would show the boar years at a glance.
  - Fences cost timber every year (~20% rot + storms); late-game timber shortages could leave fences unmended.
- Midsummer is done (tech 'midsummer', SIM_VERSION 8; w.fest: y last year held, on day, n count, k ring slots;
  task k 'fest' with ring index r). Festival pairing rarely fires because daily pairing already finds most
  matches; the live world has a lone castaway woman and no single men. Answers it invites:
  - A harvest festival in autumn (thanksgiving at the granary) or a midwinter fire that lifts spirits in cold snaps.
  - Games at the festival: a footrace or spear throw whose winner is named in the chronicle (seeds a hunter/hero role).
  - Visitors: a boat from another isle that comes for the midsummer fire, bringing a bride/groom or trade goods.
  - A thin year (no feast, small fire) could lower births the next year; a lavish one could raise them.
  - Festival memory: elders recall "the year of the great storm midsummer" in later entries.
- Follow card is done (render.js only: follow/track/cam, known id->name cache, card #who). Answers it invites:
  - Dead parents loaded from the save show no name (dead people are dropped from w.people). A small
    w.ancestry ring {id, name, mother, father, died} in the sim would give real family trees and
    "granddaughter of the first settler" lines; needs a SIM_VERSION bump.
  - Per-person memory: count of fish caught, boars taken, houses built, so the card can say
    "the best hunter on Hais" and the chronicle can name heroes.
  - Mood or hunger on the card once the sim tracks it per person.
  - A shareable link (#follow=Name) so people can watch the same islander across visits.
- Fever is done (SIM_VERSION 9; w.fever {k outbreaks, n/d this outbreak, all cases, lost deaths, who}, p.sick until-tick,
  p.imm until-tick, yearly `sick`). Constants FEVER_* in sim.js. ~60-90 outbreaks per 100 years, most 1-10 cases, a big one
  (50-100 cases) every decade or two late game; ~3.5% of cases die, mostly under-3s and over-55s. Answers it invites:
  - Herbal medicine: a herb-woman/healer role who gathers willow bark and feverfew from the woods (wild stock), halving
    fever deaths and shortening WOUND_DAYS; learned after the first fever deaths.
  - Nursing: a healthy housemate staying home to tend the sick cuts the risk (costs a worker).
  - Isolation: a sick hut away from the houses, so spread is per hut, not per house (cuts FEVER_HOUSE).
  - Crowding matters: more houses (or stone longhouses) lower the outbreak odds; tie house building to it.
  - Mourning: the chronicle could name the dead of a bad fever year; a burial ground on the map.
  - A yearly `sick` row in the graph panel would show the fever years at a glance.
- Boats were considered and skipped for now: the shallows sit at 0-20 fish all year (every idle adult fishes),
  but food is already 10-20k in store, so more catch adds nothing. Boats become worth it once food is tight,
  or as transport (a second settlement, trade, visitors at midsummer).
- Footpaths are done (SIM_VERSION 10; w.wear[MAP*MAP] 0..60, PATH_AT 24, w.paths count, tech 'paths'; walk()/tread()
  in sim.js, drawPath() in render.js). Answers it invites:
  - Roads: lay stone or log corduroy on the busiest paths (needs stone/quarry); faster still, never grass over.
  - Paths through forest: woodcutters' tracks could wear forest edges into rides; wolves could follow paths at night.
  - Snow slows walking off-path (2 tiles/h) so winter tracks matter more; trodden snow already shows grey.
  - Bridges or stepping stones where a path meets a stream (no rivers yet; rivers would be a big terrain change).
  - Wayside things along old paths: a cairn where someone died, a shrine, a bench for elders.
  - Paths keep grass open but only along tracks; grass still vanishes elsewhere (see grass vanishing).
- Burying ground is done (SIM_VERSION 11; w.yard {x,y,n buried ever,sunk}, w.graves [{id,n,x sex,b,d,why,m,f,s slot}] max 50,
  p.mourn [day, slot]; task k 'mourn'; gravePos() exported). Note: footpaths were invisible in the browser until this visit
  because build.mjs did not export PATH_AT/WEAR_SEEN; it now exports every `export const/function` and fails if render.js
  uses a missing S.* name. Answers it invites:
  - Family trees: graves keep m/f ids, so the follow card could walk back generations ("granddaughter of Goulys").
  - Elders' stories: on the anniversary of a big fever or wolf death, an elder recalls the dead by name in the chronicle.
  - Visiting graves: widows/widowers walk to the grave now and then on quiet evenings; flowers at midsummer.
  - A cairn or marker where someone fell far from home (wolf kills, hunting deaths), drawn on the map.
  - A second, larger burying ground once the first fills (instead of reusing the oldest places), or a yew tree that grows over decades.
  - Grief: a widow(er) works less for a season, or a lost child makes parents wait longer for the next.
- Deer are done (SIM_VERSION 12; beasts k 'deer', fauna.mead/bed meadow and bedding spot, fauna.sd taken, fauna.dy [year, n],
  fauna.dw wolf kills; deer()/deerDay()/findMeadow() in sim.js; DEER_* constants). On test seeds the herd sits at 3-5 while
  grass is wide, then 2-3 once fields take the meadows (~Y30+). Answers it invites:
  - Grass still shrinks 550 -> ~90 tiles over 100 years; browsing only holds the herd's own meadow. Common grazing land
    (fields not allowed within N tiles of the meadow) or hay meadows would keep it, and give the deer a real future.
  - Antler and bone: needles, combs, picks; a bone-carver craft once deer are taken every autumn.
  - Tame the fawns: a hand-reared doe (first livestock) or goats/sheep later on the open grass.
  - Wolves follow the deer: when the herd is down to 2 in a hard winter, the pack could turn back to the village.
  - Deer could graze young grain at the edge of the fields in spring (a second reason for fences).
  - Children could watch the deer at dawn; a hunter who takes many becomes "the stalker" in the chronicle.
  - deer() scans every person each hour per deer (~4% of a late-game year); a per-hour list of adults
    outside the village would cut that if the herd grows.
- Ambience is done (render.js only: ambience() with surf[] from drawTerrain, house smoke, gulls[]). Answers it invites:
  - Smoke could follow the sim: no smoke from a house when the woodpile is empty (late-game timber shortage shows on screen).
  - A real wind in w.wx (direction per day) would let smoke, rain and storm damage all lean the same way.
  - Gulls could steal from the fish catch, or flock behind the sowers in spring; crows in the fields in autumn.
  - Fog days (a new weather kind) would hide the sea glints and muffle the surf; fishers stay in. (done, see below)
- Sea fog is done (SIM_VERSION 13; WEATHER.fog, w.stats.fogs count, yearly `fog` days, wx.b attacks / wx.x kills per spell;
  FOG_SPEED, FOG_BOLD in sim.js; fog banks in skyFx()). In fog: no fishing, no new hunts, 2 tiles/h off paths, wolves out by day.
  Test seeds: ~3-4 fog deaths per 100 years, a couple of them in the first decade on small islands. Answers it invites:
  - A fog horn or a beacon fire on the beach: people within earshot count as "not alone", so the wolf turns away.
  - Work in pairs on fog days (woodcutters go out two by two), or keep everyone inside the village ring until it lifts.
  - Lost in the fog: a child or elder wanders off and the village goes out searching (found by a path, or by the hearth smoke).
  - Fog lore: elders read a still, warm evening over cold sea and call people in early the next day.
  - A boat caught out in fog (once there are boats) drifts to another isle and brings back news.
- Herb lore is done (SIM_VERSION 14; tech 'herbs', w.heal {id, nm, s bundles, n tendings, k healers}, p.tend day tended,
  w.fever.t tendings this outbreak; HERB_* / HEAL_OLD in sim.js; task kinds 'tend' (key n<personId>) and 'herb').
  Test seeds learn it ~Y5-6; 4-5 healers per 100 years, all died before 62 so the "too stiff" handover never fired;
  100-yr pop on seed 20261114 rose ~151 -> 190. Answers it invites:
  - Why do healers die young? They walk alone to the wood's edge; check causes, maybe the healer takes a companion.
  - Big winter outbreaks (50-60 cases) empty the 30 bundles fast: a herb garden by the healer's house (spring
    planting, cap +20) or a drying shed would be the next step.
  - A healer's renown: count lives tended and name them in the chronicle at death ("Morlin, who nursed 300 through the fever").
  - Birth help: a healer at a birth lowers infant risk (a < 2), and childbed could become a real danger first.
  - Herbs for the cold: a warming brew cuts "died of the cold" for the frail in bitter snaps.
  - Coppicing was measured and skipped for now: on seed 4242 tall trees within 20 tiles fall 1000 -> 322 by Y100
    and timber stays ~2000, so the woods only run out after ~Y120. Worth doing before the live world reaches Y100.
- Rats are done, as a problem only (SIM_VERSION 15 -> 16; w.rats {n colony, y eaten this year, all, top, k arrivals,
  sw swarm flag, told}; rats() in sim.js, RAT_* constants; yearly `rats` eaten; drawRats() in render.js). They come
  from year 2 once 500+ grain lies in the open (or 4000+ in store), breed 5%/day while grain is heaped outside, 1.5%
  when it is all under a roof, die back in a winter with nothing left out. Cap min(150, 30 + 15/granary, food/80);
  each eats 0.05 grain a day; a swarm makes fevers up to 60% likelier to start. On test seeds they never die out:
  ~40-75 rats, ~1-2k grain a year, pop at Y90 close to the no-rat baseline. Answers it invites (none exist yet):
  - Staddle stones: granary posts on mushroom-shaped stones the rats cannot climb (needs stone; cuts RAT_PER_GRANARY
    and the dry-store breeding to ~0). The natural first answer.
  - Clay jars / pottery: sealed jars in every house (HOME_STORE up, rats can't reach it). Also the pottery idea above.
  - A rat-catcher role or children set to trapping (a daily cull), or terriers (first dog) that also help on fog days.
  - Cats off a visiting boat: once boats exist, a trader brings a cat; kittens spread through the houses.
  - Clearing the open heap: rats are what makes grain left outside hurt; building granaries fast enough starves them.
  - Rats in the healer's herbs, or a plague year: if they swarm past ~100, a deadlier fever could come with them.
- Lost in the fog is done (SIM_VERSION 18; w.lost {n ever, y this year, f found, d died, cur {id, x, y spot, t, seen, h search hours,
  o out overnight}}; task kinds 'lost' and 'search'; LOST_* in sim.js; yearly `lost`). Test seeds: ~25 per century, nearly all found in
  2-16 hours, no deaths in 100 years (the cold only bites on winter nights). Answers it invites:
  - A fog horn or a cow-horn at the hearth blown every hour in fog: lost ones walk toward it (shorter searches), and it could also
    count as "not alone" against wolves.
  - Children kept inside the village ring on fog days once one has been lost (fog lore); fewer searches later.
  - A dog (see terriers/guard dogs) that finds the lost by scent in an hour or two.
  - The finder's name could be remembered on the follow card ("found little Emser in the fog of year 4").
  - Whole-village searches pull every adult off work; late game (200+ people) a search party of ~10 would be enough.
- Fog horn is done (SIM_VERSION 19; tech 'foghorn', w.horn {hid keeper, f lost ones who walked home to it, d fog days blown},
  fauna.fa fog attacks ever, lost.cur.hh heard the horn; HORN_* in sim.js; hornOn() exported; task kind 'horn'; hornRings() in render.js).
  Test seeds learn it in Y1-2. Fog wolf deaths stay ~1-6 per century (woodcutters and hunters work past the 13-tile earshot);
  only 1-2 lost ones per century reach the hearth by the horn because searchers usually meet them first. Answers it invites:
  - Woodcutters go out in pairs on fog days, or stay inside earshot (the remaining fog deaths are all far out).
  - A horn on the beach for boats coming home in fog (once there are boats).
  - The keeper is the oldest islander: an elder role with its own name on the card ("keeper of the horn"), handed on at death.
  - Wolves learn the horn means people: a bold wolf could come right up to the sound on a hungry winter fog day.
  - A History count of horn days per year.
- The far isle is done (SIM_VERSION 20; tech 'farisle', w.isle {n, wed, gone, hides, grain, boat {bx,by beach, lx,ly landing, sx,sy offshore,
  st in|ashore|out, d day, gs [{nm, sex, a, x, y, k boat|walk|wait|fest|sleep, r ring, isl}]}}; ISLE_* / BOAT_SPEED / GUEST_SPEED in sim.js;
  boatComes/isleWed/isleFeast/boatLands/boatLeaves/isleHour; drawIsle() in render.js). Guests are not in w.people; a guest who weds is
  made a real person. Test seeds: first visit Y4-6, a wedding every few visits, first islander leaves ~Y13-38. Answers it invites:
  - Seafaring: the islanders learn to build their own dugout from the guests (a beached boat to copy), then fish deeper water or row over.
  - Trade goods beyond hides: flint, seed of a new crop, a cat for the rats, a dog for the fog, salt for curing fish.
  - Visits outside midsummer: a boat blown in by a storm, or a guest who comes back the next year to see their kin.
  - Rivalry: a thin year on the far isle could send a raiding boat for the granaries instead of dancers.
  - The landing beach is the shore tile nearest the hearth; a landing stage or a beacon there would give it a place on the map.
- Wolves at the pen are done, as a problem only (SIM_VERSION 21; goats.pr raids ever, pk taken, yp this year, gap torn wattle; penNight/penBack/
  penWaker/penRaid in sim.js, PEN_* constants; yearly `pens`; b.pen on the raiding wolf). Test seeds: ~3 pen nights and ~1 goat taken per winter.
  Nobody has an answer yet. Answers it invites:
  - A thorn-brush or blackthorn hedge around the pen (PEN_HOLD up to ~0.9), learned after the first goat taken from the pen.
  - A dog: a tamed wolf cub or a dog off the far isle's boat sleeps by the pen and barks (PEN_WAKE to ~1); also useful in fog and for the lost.
  - A watch fire or the herder sleeping in the lean-to on frost nights (costs a worker and wood; risk of a bite).
  - Bring the herd inside the houses in the worst cold (goats in the byre end of a longhouse).
  - Hunters track the raider back to the den after a pen night (a winter wolf hunt).
- Deeds and bynames are done (SIM_VERSION 22; p.dd {b,w,d,f,g,h,l,p,n, by}, w.by {deedKey: living holder id}, b.hands ids while a
  building goes up; DEEDS marks, deed()/nameThem()/unname() in sim.js; byname() and deedsText() exported; grave g.by/g.dd).
  Test seeds: ~23 bynames per century, mostly Reaper and Fisher late, Hunter/Wolf-slayer early; the Builder almost never fires because
  founders who raise the roofs earn a hunting name first, and late-game houses are rare. Answers it invites:
  - A skill effect: a named Hunter strikes more often, a Fisher lands more per cast, a Builder works faster (makes names matter in the sim).
  - Apprentices: a child who follows a named islander picks up the trade, and the name can pass down a family ("Hamor the Fisher's daughter").
  - Elders' stories: on long winter nights an elder retells a dead hero's deeds in the chronicle, years after the death.
  - Rivalry: two islanders close to the same mark race for it; a footrace or spear throw at midsummer settles it.
  - Bynames for bad deeds too: someone who loses a goat to the wolves or lets a fire go out gets a mocking name.
- Speed: on this machine seed 4242 ran ~2.9 s/yr at Y90-95 (307 people) even with deeds switched off (scripts/_bench.mjs compares);
  check whether earlier visits (goats, isle, pen, lost, horn) pushed the late-game cost up, and trim per-hour scans (aliveId, people.find).
- Dogs are done (SIM_VERSION 23; tech 'dogs', w.dogs {d [{id, nm, sex, b, own, x, y, lie}], n, k wolves turned, f lost found, p pen alarms,
  r rats, dead}; DOG_* in sim.js; cubFound/dogOwners/dogDay/dogHour/dogNear/dogBy; drawDogs() in render.js; yearly `dogs`).
  Test seeds: first cub Y3-4, 1-8 dogs, wolves rarely meet a dog (wolf attacks are rare once hunters thin the pack); the pen alarm
  and the rat catching do most of the work. The line can die out (litters need a bitch under 8) and a new cub refounds it. Answers it invites:
  - lone() ignores dogs: a wolf could hesitate to stalk anyone with a dog at heel (fewer attacks) instead of the dog fighting it.
  - Hunting dogs: a hunter with a dog strikes more often and finds deer faster (and the dog can be gored by a boar).
  - Sheepdog work: the goatherd's dog lets the herd graze farther (GOAT_REACH up) and turns goats out of the young grain.
  - A dog that loses its owner pines; a dog's grave beside its owner's; dogs howling with the wolves on winter nights.
  - Pups given to the far isle guests as gifts (trade), or a far-isle dog of a new coat brought in to breed.
  - Wolf blood: a dog that runs off to the pack one hungry winter, or a half-wolf litter that is wilder.
- The longest night is done (SIM_VERSION 24; tech 'tales', w.tale {y, on, n, id, told [keys], lore, k/j ring slots, kids}; TALE_* in sim.js;
  taleDay/teller/taleSpot/longNight/taleChoices/tellTale; taleNow() exported; task kind 'tale'). One chronicle tale per winter from Y2;
  late game most tales are graves of named Reapers because they die every year or two. Only the fog tale changes the sim. Answers it invites:
  - More lessons: a tale of a boar goring makes hunters take boars only in pairs of three; a tale of a cold death sends the frail to the
    biggest woodpile on bitter nights; a tale of the far isle makes the young restless (more leave with the boat).
  - Heroes inspire: a child who hears a named hunter's tale is likelier to take up the spear (a bias in pickTask for 14-20 year olds).
  - Tales that drift: a tale retold after 30+ years grows (the boar gets bigger, the number of wolves doubles) in the chronicle text.
  - Song and memory: once the tellers have told 20 tales, a song or a carved tally stick by the hearth keeps them (a visible object on the map).
  - Late-game the tale candidate list scans the whole chronicle every winter; cheap now (~once a year), but keep it that way.
- Raiders are done, as a problem only (SIM_VERSION 25; w.raid {n, g grain carried off, yg this year, d driven off, lean year, y last raid year,
  on night, cur {boat bx/by/lx/ly/sx/sy, gx/gy granary, st in|ashore|flee|out|gone, rs raiders [{nm, k boat|walk|wait|back|run, s sack}],
  ch chasers [{id, nm}], take, drop, woke, hurt, dog, dawn, tell}}; w.isle.feud year with no midsummer boat; RAID_* in sim.js; raidYear/
  raidTarget/raidNight/raidHour/raidAlarm/raidOver/raidTold; waker() shared with the pen; drawRaid() in render.js; yearly `stolen`).
  Test seeds: 5-12 raids per century, about half driven off (a dog by the granary does most of it); each costs 0-350 grain, small next to
  the 10-90k stores, so the real cost is the lost midsummer visit. Nobody has an answer yet. Answers it invites:
  - A night watch: once raided twice, an adult sits up by the granary on autumn nights (RAID_WAKE to ~0.6; costs a worker's morning).
  - A beacon or watch fire on the landing beach in autumn: the dugout is seen coming in and turns back before it lands.
  - A barred or stone granary door, or moving the next granary inland; raidTarget picks the one nearest the sea.
  - Peace: a gift of grain sent back with the midsummer boat in a lean year (the islanders learn the signs) stops the raid; kin ties
    already cut RAID_LEAN, so a "peace-weaving" wedding could end raids for a generation.
  - A raider caught in the scuffle (left behind with a twisted ankle) who is kept over the winter and either weds in or is rowed home.
  - Revenge as a twist: once the islanders have boats, young hotheads row over to the far isle after a raid.
- Pottery is done (SIM_VERSION 26; tech 'pottery', w.pot {id, nm, k, kx/ky kiln tile (BUILD), cx/cy clay bank, c clay, wet, sd, j, made, broke,
  f, lf}; POT_* / JAR_HOLD in sim.js; sealed() exported; learnPottery/potDay/potTask/fireKiln/pickPotter; drawKiln() and the kiln fire in
  render.js; yearly `jars`). Rats now only count and eat loose grain (food - sealed). Test seeds learn it Y3-4; ~45 jars in the first year,
  then 50-56 held. Late game (40-70k grain) 60 jars seal only a sliver, so rats come back to full strength; POT_MAX could scale with granaries.
  The kiln burns 6 timber a firing (~2-3 a year). Over 100 years rat losses fell 24k->19k, 85k->32k, 94k->20k and Y100 pop went
  230->245, 199->332, 237->260 (seeds 20261114, 777, 4242; scripts/_potpop.mjs). Seed 777 grows fastest and its jars fall to 11 by
  Y100 because timber runs out and the kiln cannot be fired: the late-game wood shortage now hits pottery too. Answers it invites:
  - Cooking pots and porridge: a pot on every hearth stretches grain (less eaten per head) or feeds the sick better (ties to herbs).
  - A tiled or clay-daubed granary floor, or staddle stones: the next answer to the rats once the stores outgrow the jars.
  - Pots as trade with the far isle (they have none): jars for hides, or a gift jar that eases the feud after a raid.
  - Raiders could smash jars or carry off sealed ones; a storm could crack the kiln; a wet spring delays the firing.
  - Beakers and decorated ware: each potter's mark on the sherds; graves get a pot (a visible offering in the burying ground).
  - A named potter (deed 'the Potter' after 200 jars) and an apprentice child who learns the coils.
  - Salt fish in sealed jars: preserved catch for winter once food is tight.
- The beach watch is done (SIM_VERSION 27; tech 'watch', w.watch {hid, last, x, y beach tile, n nights, s turned back, k rotation}; WATCH_* in sim.js;
  learnWatch/watchHour/watchSees/watchable; watchOn() exported; task kind 'watch'). About 110 watch nights a year for roughly one raid a decade,
  so it costs far more mornings than the grain it saves; fog raids (3x likelier) still get through most of the time. Answers it invites:
  - The watch grows lax: after 5+ quiet years the village could stop keeping it (or keep it only in fog), and the next raid hits hard.
  - A watcher who sees the boat could blow the fog horn or light a beacon so the whole village runs down (a fight on the beach).
  - Peace instead of watching: grain sent back with the midsummer boat in a lean year, or a wedding that ends raids for a generation.
  - Raiders who are turned back might try a second beach, out of sight of the fire (raidTarget picks the next-nearest granary).
  - The watcher is safe from wolves by the fire; if the driftwood runs out on a hungry winter fog night, that could change.
- Peace gifts are done (SIM_VERSION 28; tech 'gifts', w.raid.peace/pg/yv/gift; GIFT_*, ISLE_HUNGRY in sim.js; isleGift(); guest g.s sack;
  yearly `given`). Learned at the first thin-year midsummer after a raid. Test seeds: 4-5 gifts and 3-7 raids per century (was 5-12).
  Raids still come in lean years with no visit (40-60% chance the boat stays home) and in feud summers. Answers it invites:
  - Gratitude: guests who were given grain come back the next summer with something new (seed of a second crop, a dog of a new coat, flint).
  - A gift remembered: a year after a gift, the lean-year odds drop (they trust the island), or a gift-giver is named "the Open-handed".
  - Grudges: someone hurt in a raid refuses to give, and the eldest overrules them (a family feud seed for later visits).
  - Sending grain over unasked: once there are boats, the islanders could row a gift across in a lean year that the guests did not come.
  - `scripts/_giftprobe.mjs [years] [seed]` prints raids and gifts per 20 years.
- Snowmen are done (SIM_VERSION 29; w.snow {k, n, y, men [{id, x, y, s 0..3, m melting, nm, by}]}; snowDay/snowTask/snowDone in sim.js,
  drawSnowmen()/snowmanAt() in render.js; `scripts/_snowprobe.mjs` runs the live world 3 years). Only 3 stand at once, so they
  are all built in the first days of snow. Answers it invites:
  - Summer play to match: children paddle in the shallows on heatwave days, or race at midsummer (winner named in the chronicle).
  - Sledging on a hide down a slope; a child going through thin ice once there are ponds.
  - A storm or a dog knocks a snowman down; the children rebuild it on the next snow day.
  - Children who played together pair up more often later (a "friends" link per person).
  - Snow depth as state (builds on snow days, melts on warm ones) would let snow slow walking and show bare patches in a mild winter.
- Wildfire is done, as a problem only (SIM_VERSION 30; w.blaze {n, burnt, y, last, ash [[tile, tick, k 0 grass|1 trees|2 scorched]],
  cur {at, x, y, wd, b [[tile, hours]], t, s, f, r, g, hands, first, gt/gd}}; BLAZE_* / ASH_* in sim.js; blazeDay/ashDay/blazeStart/blazeHour/
  blazeOut/blazeOver/blazeFight; blazeOn() exported; task kind 'blaze'; drawAsh()/drawBlaze()/blazeAt() in render.js; yearly `burnt`).
  Summer only: a heatwave day from the 3rd (x2 after a dry spring) or a storm breaking a 3+ day heat spell. Every able adult beats at the
  flames nearest the hearth (within 22 tiles) from the 3rd hour; rain puts it out. Test seeds: ~20-40 fires a century, most 1-20 acres,
  a few 100-400 when a west-or-east wind drives one through a big unbroken wood far from the village. Burnt land is grass for a year or more,
  then saplings come back (ASH_TREE) and the normal creep refills it within ~3 years. Fields and roofs are rarely hit, because the beaters
  stand between the fire and the houses. `scripts/_blazeprobe.mjs [years] [seed] [live]`, `scripts/_blazedet.mjs` (save/load mid-fire). Answers it invites:
  - Firebreaks: after a big fire the village keeps a cleared strip between the woods and the fields (chop a ring of tiles each spring).
  - Slash-and-burn: grain sown on fresh ash yields more for 2-3 harvests; the islanders notice and later burn scrub on purpose (a tech).
  - Water lines: a bucket chain from the shore or a pond puts out tiles faster than branches; skins or jars as buckets (pottery).
  - Beasts flee the smoke: wolves and boars driven out of the burning wood into the open, deer onto the beach; a scorched den moves.
  - A fire-beater byname for whoever puts out the most tiles; the great fire as a winter tale with a lesson (stack wood away from the trees).
  - The kiln, the bonfire or the beach watch fire as a human cause of a fire in a dry summer.
- The dugout is done (SIM_VERSION 31; tech 'canoe', w.canoe {hid, nm, bx/by beach, lx/ly water, wk hours dug or -1, dd, ok, n, lost, d deep stock,
  t trips, f, y, at paddler id, sp}; CANOE_* / DEEP_* in sim.js; learnCanoe/canoeDay/canoeTask/canoeDig/paddle/canoeGround/seaLine; task kinds
  'dig' and 'paddle' (p.task.sea while afloat; act() hands it to paddle() before anything else, release() snaps them back to the beach);
  drawCanoe() and the afloat sprite in render.js; yearly `deep`; `scripts/_canoeprobe.mjs [years] [seed|live]`, `scripts/_canoebench.mjs`).
  Deep catch is capped by the regrowth (~1,150 fish a year), tiny next to late-game grain. Trips rank below chopping, so late-game islands with
  no timber hardly use the boat. Answers it invites:
  - A second or third boat as the village grows (one per 40 people), each a reserved key 'u0'..'u2'; two boats out together could go farther.
  - Caught out: a storm that blows up in the afternoon (weather is daily now; an hourly squall chance) and a search along the shore at dusk.
  - Rowing to the far isle: a gift sent over in a lean year without waiting for midsummer, a visit to kin married away, or revenge after a raid.
  - Smoked or salted deep-water fish in jars for winter (pottery), and a drying rack on the beach.
  - Seals or a whale washed up after a storm; a "Boatwright" byname once someone has hollowed two boats.
  - The paddler could spot the far isle's dugout coming in by night and warn the beach watch.
- Coppice is done (w.copse { s stool tiles, n cuts, y timber this year, nm, at }; isStool() mask in the cache; stools are
  FOREST tiles that never turn to grass when cut). Chop only picks trees with wood >= 6 and takes 4, so wild trees near the
  hearth were never cut to 0 before; now the last of a tree near the village is taken and the stump kept. Answers it invites:
  - Hazel rods from the coppice for fences and the goat pen (FENCE_COST could come from poles, not timber).
  - Woodcutters still walk past stools to wild trees farther out only when no stool is ready; a woodward who keeps a
    cutting rotation (one panel a year) would make the ring show visible age bands.
  - Field sprawl itself is untouched (needFields ~2 per person, 500 fields at 230 people). Manuring with goat dung or
    rotation would shrink it; houses could also stop being built when the woodpile cannot heat them.
  - Fire through the coppice kills the stools (they drop out of the list); real stools resprout after fire.
- Families view is done (render.js kinFolk/drawFamilies; w.roll keeps sunk graves and far-isle leavers; graves keep pt).
  Answers it invites:
  - Kinship in the sim: mate() only blocks siblings; after 3-4 generations cousins will marry. An elder's rule against
    it (or a far-isle bride brought home for it) would be a story and a reason for the isle boat.
  - Family names: the eldest line could take a house name ("of Vidor's hearth") that shows in tales and on graves.
  - Heirlooms: a byname holder's spear or crook passes to a child, who gets a head start on the same deed.
  - The tree shows infant deaths plainly († aged 0): a midwife or herb lore for childbirth could cut them.
  - w.roll grows by ~100 bytes per sunk grave (~60 KB a century at 300 people); drop `why` from roll entries if save
    size starts to matter.
- Hedges are done (SIM_VERSION 34; w.hedge {n, y, k boars turned, nm, at, held, th}, f.hg planting tick, fauna.br fences broken
  before learning; hedged() exported, HEDGE_GROW exported; hedgeTask/learnHedges in sim.js; drawHedges()/hedgeAt() in render.js;
  `scripts/_hedgeprobe.mjs [years] [seed|live]`). Nearly every exposed field is hedged in the first autumn, so the boars lose
  almost all their raids ~3 years later. Answers it invites:
  - Boars shut out of the grain turn hungry: they root up the burying ground or the gardens by the houses, or grow bold and charge.
  - Haws and sloes from the hedges as autumn wild food; birds nest in them (more gulls/finches on screen in spring).
  - Hedge laying: an old hedge grows gappy after ~20 years unless someone lays it in winter (a craft and a byname, "the Hedger").
  - Wolves or deer could use hedgerows as cover to come close to the village; a fire runs along a hedge line in a dry summer.
  - Fences now only matter for the 3 years a hedge grows; timber saved on fences could show in History.
- Whales are done (SIM_VERSION 35; w.whale {n, g, last, cur, bones}; whaleStorm/whaleTask/whaleCut/whaleDone/whaleDay in sim.js;
  drawWhales()/whaleAt() and whale gulls in render.js; `scripts/_whaleprobe.mjs [years] [seed|live]`). ~1 whale every 5-8 years.
  Late game only 4-10 of 280 people cut, because only idle adults pick it. Answers it invites:
  - Whale oil: render the blubber in pots (pottery) into lamp oil kept for winter, so it saves real fuel in the cold months.
  - Whalebone: ribs as rafters for a bigger house or a longhouse, or a whalebone arch over the path to the burying ground.
  - Scavengers: wolves and boars come down to the carcass at night (a danger for late cutters, and a chance for the hunters).
  - A whale seen from the dugout in calm water: the boldest paddler tries to drive one into the shallows (high risk).
  - Rotting whale brings flies and a fever if it is left near the houses.
  - The far isle hears of a whale and its dugout comes for a share (trade, or a quarrel).
- Late frost is done, as a problem only (SIM_VERSION 36; w.frost {n, k, y, last}, f.fr tick killed, w.wx.fk/fn this spell; frostNight/frostTold
  in sim.js, FROST_* constants; workLists hides f.fr fields from sowing while the cold holds; yearly `frosted`; frostAt() and black rimed rows
  in render.js; `scripts/_frostprobe.mjs [years] [seed|live]`, `scripts/_frostbench.mjs`). About one spring in two loses some fields; at
  Y90-95 on seed 4242 pop is ~224 instead of ~270 without it. Nobody has an answer yet. Answers it invites:
  - Weather lore: after the first frost the eldest learns to read a still, clear evening sky and the village holds back the sowing a few
    days (sow only after doy ~20), or waits to sow until a cold snap has passed (normal fallow fields are still sown in the cold today).
  - Straw or smudge fires: on a frost night the young set damp fires along the rows; the smoke keeps the frost off (costs timber and a night's sleep).
  - Seed corn: resowing is free now. A kept seed store (in jars) that a bad frost can empty would make a double frost really bite.
  - Hedges as shelter: hedged fields could be nipped less (a windbreak), giving the hawthorn a second use.
  - A frost tale on the longest night that teaches the children not to sow before the blackthorn flowers.
- The shallows are done (SIM_VERSION 37; w.wade {b bathing tile, n spells, c cockle bed, g ever, y this year, nm, at, s scares, sy, sn rescuer};
  learnWade/wadeTask/wadeDone/wadeDay in sim.js, WADE_* constants; the bathing beach must be within 24 tiles of the hearth by a dry line;
  `scripts/_wadeprobe.mjs [years] [seed|live]`, `scripts/_wadebench.mjs` HEAD vs working copy). Cockles are tiny next to grain. Answers it invites:
  - A rescuer byname ("the Swimmer") after two rescues, or a deed tally for it; the rescued child remembers it in a tale when grown.
  - Swimming as a skill: children who waded every summer could later be the ones chosen to paddle the dugout, or survive a capsize.
  - Older children (10-13) could fish with a hand line off the rocks beside the bathers; a dog splashing with them.
  - A real danger: a drowning would be a heavy event; only worth it once there is something to answer it (a rule, a watcher on the beach).
  - The cockle bed could run out in a crowded late game, sending the children farther along the beach (or to the far shore).
  - Shell necklaces worn at midsummer (a colour on the dancers' sprites), or shells pressed into the clay of the pots as a pattern.
- Smudge fires are done (SIM_VERSION 38; w.smudge {n nights, f fires, s saved, y this year, nm, at, on [{x, y, id}], last, k};
  learnSmudge/smudgeHour/smudgeLit/smudgeTold in sim.js, SMUDGE_* constants; frostNight checks smudgeLit(); smudgeOn() exported;
  `scripts/_smudgeprobe.mjs [years] [seed|live]`). Learned after the second killing frost; saves about half of what a frost would kill.
  Answers it invites:
  - Crew is capped at 12 fires (fields nearest the hearth first), so at 200+ people with 400 fields most outer fields are still bare.
    A rota by household, or a horn call that wakes the whole village on the worst night, would scale it.
  - Smudging burns timber in spring; in a year the woodpile is bare there are no fires at all. Coppice poles could be kept for it.
  - A smudger who sits out every frost night could catch a chill (fever chance) or earn a byname ("the Smoker").
  - Weather lore is still open: reading a clear, still evening and lighting the fires on the first night instead of the second.
- The moon is done (SIM_VERSION 39; moonAge/moonLight/moonDark/moonName exported, MOON_DAYS 30, MOON_DARK 6, day 0 is a new moon, nothing
  saved for the phase; w.moon {s bright nights the watch slept, nm, at}; learnMoon in sim.js; drawMoon() in render.js). Raids come only on
  dark-moon (13 of 30) or fog nights, at RAID_NIGHT 0.05. Moon lore is learned at the first full moon of raid season after 20 watch nights.
  Answers it invites:
  - Fog is now the raiders' best chance under a bright moon. The fog horn or a second watcher on fog nights would close that gap.
  - Spring tides at new and full moon: the cockle bed refills faster, or a very low tide uncovers a wreck or a causeway.
  - Wolves at the full moon: a ring of pale eyes at the treeline, bolder pen raids; full-moon deer hunts.
  - Sowing by the moon (weather lore against late frost), midsummer set by a full moon, the moon count shown as a "month" in the top line.
  - A lunar eclipse once in decades: a red moon, a frightened village, the eldest tells of the last one.
- Grain rust is done, as a problem only (SIM_VERSION 40; w.rust {n, k, g grain lost, y, yr, last, cur {at, n, g, d}}, f.ru / f.rl;
  rustDay/rustBegins/rustCut/rustEnds in sim.js, RUST_* constants; yearly `rusted`; rustAt() and orange flecks in render.js;
  `scripts/_rustprobe.mjs [years] [seed|live]`). Spreads only to 4-side neighbour fields, so the big late-game blocks suffer most.
  Nobody has an answer yet. Answers it invites:
  - Rogueing: after the first big outbreak, the healer or the eldest walks the rows and pulls up spotted plants on the first day
    (stops spread from that field at the cost of some of its yield).
  - Hedges as breaks: rust does not cross a grown hawthorn hedge; field blocks broken up by hedges or grass strips lose less.
  - A second crop (beans, or a rust-proof barley off the far isle's boat) sown in alternate fields: a rotation that breaks the chain.
  - Burning the rusted stubble in autumn (the islanders notice that ash fields come up clean), tying in with slash-and-burn.
  - Storm tides were tried this visit and dropped: every field on all test seeds and the live world lies 10+ tiles from the sea,
    because fields grow out from the hearth. A coastal hazard would need to hit the beach things (dugout, watch fire, whale, kiln clay bank).
- Rogueing is done (SIM_VERSION 41; w.rogue {n, y, k, nm, at, told}, f.rg; ROGUE_* in sim.js, ROGUE_SEEN exported; rogueTask/rogueDone/
  learnRogue; rustEnds(w, stopped) and rustSummary; `scripts/_rogueprobe.mjs [years] [seed|live]`). Once learned it stops nearly every
  outbreak at 1-14 fields, so rust is now mostly a nuisance. Answers it invites:
  - Rust that comes back stronger: a strain that the rogueing cannot keep up with in a very wet summer, or rust in the stored seed corn.
  - Rogueing ranks just below sowing, so in a busy late game it takes many hands for a day; a named "Rogue-walker" byname for many fields.
  - The burning heaps could set off a wildfire in a dry, windy summer (the smoking heap is already drawn).
  - Still open from rust: hedges as breaks, a second crop in rotation, burning stubble.
- Housekeeping: scripts/_surgeprobe.mjs is a dead stub and scripts/_coastprobe.mjs (field distance to the sea) is a one-off; both can go.
- Bees are done (SIM_VERSION 42; w.bees {h hives [{x, y, c, a, s}], nm, at, hy, g, y, sw, sl, d, st, m, mw, ml, kp}; beeDay/learnBees/
  beeTask/honeyDone/meadPoured/findHiveSite in sim.js, BEE_* constants; hives are T.BUILD tiles beside the first log; `scripts/_beeprobe.mjs
  [years] [seed|live]`, `scripts/_beebench.mjs`, `scripts/_beeprof.mjs` times the bee functions alone, ~13 ms/yr at 300 people). Honey
  fills the store (240) in big villages and mead is poured almost every midsummer. Seed 4242 reached ~400 at Y100 (was ~260), but 777 and
  20261114 grew about as before, so check whether mead pairing is part of it. Answers it invites:
  - Wax: candles for the longest night (a warm glow in the windows) or a wax seal on the jar lids.
  - A bee keeper as a lasting role with a byname; "telling the bees" when a keeper dies (an old custom: the hives are told of every death).
  - Honey traded to the far isle at midsummer, or a jar of mead as a peace gift that works better than grain.
  - A wet summer (many rain days) starves the hives as well as rusting the grain: honey and harvest fail in the same year.
  - Bears or martens at the logs, or the boars knocking one over; wolves are no threat to bees.
  - Fields of clover or beans (a second crop) would feed the bees and the soil: ties into crop rotation.
- The lone wolf is done (SIM_VERSION 43; w.lone, beast kind 'lone' in w.beasts, loneDay/loneBed/loneWolf/loneHunt in sim.js, LONE_* constants;
  bite() and takeGoat() name it; quarry() sends every hunt after it once it has drawn blood; `scripts/_loneprobe.mjs [years] [seed|live]`,
  `scripts/_lonebench.mjs [seed] [from] [to]` times HEAD against the working copy). Hunters mostly kill it within 2-30 hunts. Answers it invites:
  - A pit trap or snare on its trail (a craft that catches it without the hunters walking into its bed), or a lure: a staked goat.
  - Working in pairs: once it has taken someone, woodcutters and far-field farmers go out two by two (fewer lone targets, slower work).
  - A dog that tracks it to its bed (dogs already follow scents in the fog) would raise the hunters' odds.
  - Its pelt as a lasting thing: a cloak worn by whoever killed it, shown on the sprite; a winter tale of each one by name.
  - Lone wolf names repeat over a century (5 names, only the last is skipped); more names, or "the second One-Ear".
  - While it lives the den is left alone, so the pack grows and the winter pen raids climb: watch whether that is too harsh.
- Rainbows are done, for show only (SIM_VERSION 44; w.bow {n, y, nm, at, c chases, k reached}, w.wx.bow {a, b hours, d side, x, y foot, r};
  bowComes/bowOn/bowTask/bowDone in sim.js, BOW_* constants, BOW_R exported; task 'bow'; drawBow()/bowSprite() in render.js; yearly `bows`;
  `scripts/_bowprobe.mjs [years] [seed|live]`). About 2-3 a year. Answers it invites:
  - Weather lore at last: an elder who has watched many rainbows learns "a rainbow in the morning, the rain comes back" (a west bow means
    more rain, so the harvest is hurried in) — the first real sky-reading, and a way into frost and storm lore.
  - The children's search could find something real now and then at the foot: a flint nodule, an amber lump (a midsummer gift or trade good).
  - A double rainbow once in a while (a second, fainter arc with the colours turned round) and a line in the chronicle for it.
  - The far isle has its own word for it, and a guest who weds in teaches it (a small kinship/language thread).
- Sky lore is done, for storms only (SIM_VERSION 45; w.lore {nm, at, n calls, h right, m missed, f false, s roofs held, y this year,
  g fields cut by firelight, on day called for, rd reader}; b.tie roped roof; w.wx.nx is tomorrow's weather, rolled a day early once
  learned; rollWx/learnLore/loreRead/loreMorning/prepTask in sim.js, LORE_* constants; tasks 'tie' and harvest with t.eve;
  `scripts/_loreprobe.mjs [years] [seed|live]`). Learned after a storm that tears a roof once the island has seen 100 storm days.
  Calls ~80% of storms, a false alarm now and then; roped roofs hold 85% of the time. Firelight reaping is rare: ripe grain is
  usually cut before a storm anyway. Answers it invites:
  - Now that w.wx.nx exists, the same reader can call other weather: a hard frost (stack wood, smudge on the first night instead of
    the second), fog (keep the goats in, nobody to the shore), a heatwave (the children to the shallows, water the young grain).
  - The reader's skill could grow with years of reading (LORE_HIT rising from 0.6), and a byname ("Weather-eye") after many right calls;
    when the reader dies, the next eldest starts less sure.
  - Storms still flatten tall green grain (Y11 on Hais: 14 fields). Staking, or sowing a shorter, stiffer grain, would answer it.
  - A storm called while the dugout or hunters are far out: a run to call them home.
- Muck is done (SIM_VERSION 46; w.muck {h heap, n, y, g extra grain, yg, nm, at}, f.mk; learnMuck/muckDay/muckCover/muckTask/muckDone in sim.js,
  MUCK_* constants, MUCK_FIELD/MUCK_CAP exported; heapRect/heapAt/muckAt in render.js; `scripts/_muckprobe.mjs [years] [seed|live]`).
  Small villages muck every field and the heap sits full; late game goats cap at 14, so only about half the fields get muck. Answers it invites:
  - A second pen (or pigs, or a byre for cattle off the far isle's boat) to feed a bigger heap as the village grows.
  - Seaweed carried up from the beach after a storm as a second muck for the far fields (ties the coast to the farm).
  - Night soil and a midden by every house: the heap grows with people, but a midden near the houses could bring sickness.
  - Fields sown many years running without muck could tire (yield falls each year), so muck or rotation matters more.
  - The muck heap as a rat and fly nest in a hot summer, or the dogs rolling in it (show only).
- Hard-years strip is done (render.js only: HARD rows, drawHardYears/hardCap/hardAt/hardGo; year entries have id hy<y>). Answers it invites:
  - A matching "good years" strip (births, harvest, honey, deep fish, midsummer guests) in green, or a toggle between the two.
  - The chronicle could name the hardest year in elders' tales ("the year of the 24 storms"), now that a score per year exists in the UI;
    moving hardScore into the sim would let tales and the eldest refer to it.
  - The year in progress has no column yet (yearly rows are written at year end); a partial column from w.stats would show it live.
  - Rows only cover what `hist.yearly` records; hunger or cold deaths are not split out of `deaths`. A `cold` count per year would help.
- Foot rot is done, as a problem only (SIM_VERSION 47; w.rot, g.lm / g.im; rotDay/rotBegins/rotEnds in sim.js, ROT_* constants; yearly `lame`,
  `rotDied`; muddied coats and flies in drawGoats(); `scripts/_rotprobe.mjs [years] [seed|live]`). Outbreaks usually reach most of the herd and kill
  1-5. Nobody has an answer yet, and it is not in the Hard-years strip. Answers it invites:
  - Hoof trimming: the herder pares the rotten horn with a flint and stands the lame in a trough of salt water or crushed oak bark (heal faster).
  - A sick fold: the first lame goat is penned apart (a second small wattle pen), which stops most of the spread. Ties to how rogueing and the healer work.
  - A raised floor or stone-laid floor in the pen, or moving the herd to a drier pen on higher ground after a bad year; fresh straw from the harvest.
  - Herbs for goats: the healer learns that the same willow-bark wash helps hooves.
  - Thinning: a smaller herd stays sound (the spread is scaled by herd size), so the village might choose to kill more for the pot in autumn.
  - A Hard-years cell for goats (lame + dead of rot + lost to wolves) would show bad herd years.
- Hoof paring and the sick fold are done (SIM_VERSION 48; w.pare {n, y, s outbreaks held to <= 3, nm, at, f fold tile | null, wash}, g.pf;
  foldSite/learnPare/pareTask/pareDone in sim.js, PARE_* constants; foldRect/drawFold/foldAt in render.js; `scripts/_pareprobe.mjs [years] [seed|live]`).
  Learned at the end of an outbreak once foot rot has killed 2 goats. Afterwards outbreaks are 1-4 goats and almost none die, so foot rot is
  mostly answered. What is left:
  - The fold is a second weak spot: a wolf at the pen in winter could go for the fold, where the lame goats cannot run.
  - A child herder cannot pare; a herder grown into the job could get a byname ("Goat-foot") after many hooves pared.
  - A wet year with two outbreaks at once, or a herd past GOAT_MAX, could fill the fold (cap it at 4 and leave the rest in the mud).
  - Goat numbers drift down late game on the test seeds (grass near the pen is ploughed or grows over): a second pen or a summer shieling
    on far grass would keep the herd (and the muck heap) up.
- Wolf-skin cloaks are done (SIM_VERSION 49; p.cl {nm, y, by, n hands passed}, w.cloak {n, h, g}, grave g.cl; cloakMade/cloakPass in sim.js;
  CLOAK_FUR in render.js; `scripts/_cloakprobe.mjs [years] [seed|live]`). On Hais 4 cloaks are made in 60 years, and on seed 20261114
  one is still worn after 76 years and 6 wearers. Answers it invites:
  - Cloaks never wear out. One that has passed through 5+ pairs of hands could fall apart one winter, with a line about who wore it first.
  - Spare pelts hang on the house wall (log only). They could be shown on the house sprite, or given as a midsummer gift to the far isle.
  - Lone wolf names repeat, so two "Pale-Eye" cloaks can be worn at once. More names, or "the second Pale-Eye", would fix the chronicle.
  - A cloak wearer could get warmth in hard frost (frail old wearers die of cold less), which matters more as the cloak passes to the old.
  - Snowmen already dress up as the Wolf-slayer; they could wear a little grey cloak drawn on the sprite too.
- Speed pass 2 is done (same world, sorted-key fingerprints match HEAD): seed 4242 Y80-83 went from ~3.8 to ~2.1 s/yr at ~210 people.
  The causes were not the newer hooks. Nearly every person, field and building had fallen into V8 dictionary mode because of `delete`,
  and the rest had 40+ hidden classes; fenceTask/hedgeTask also scanned every exposed field for each idle worker every hour.
  Rules for later visits:
  - Never `delete` a key on a person, field, building or goat in the step path: set it to undefined. Add any new key to personShape /
    fieldShape / buildingShape in sim.js (`node scripts/_keys.mjs [seed] [years]` lists the keys seen;
    `node --allow-natives-syntax scripts/_fastprops.mjs [seed] [year]` counts shapes, which should be 1 each).
  - `fingerprint()` now hashes keys in sorted order, so key order no longer matters; values still must match exactly.
  - `node scripts/_speedbench.mjs [seed] [from] [to]` times HEAD against the working copy on a loaded world and checks the worlds match;
    `node --cpu-prof scripts/_prof.mjs` plus `node scripts/_profsum.mjs <file>` gives self time, hot lines and inclusive time.
  What is left: act() itself (~50% inclusive), walk/tread (~12%), prowl/deer (~9%), GC (~7%). Goats, guests, beasts and tasks still
  have mixed shapes; tasks are new object literals with different keys per kind, so a common task shape would help. Idle adults still
  run the whole pickTask chain every 2 hours (half of daytime adult hours are idle, foraging or fishing).
- Squalls are done, as a problem only (SIM_VERSION 50; w.squall, task 'shore', t.sw on the paddle task; squallHour/shoreWatch in sim.js,
  SQUALL_* constants; drawSquall/squallSpot in render.js; `scripts/_squallprobe.mjs [years] [seed|live] [quiet]`). About 0.8 a year once the
  dugout is busy; on seed 4242 6 drowned in 60 years at the old double rate. Nobody has an answer yet. Answers it invites:
  - Sky lore for squalls: the reader (w.lore) already sees tomorrow's storm (w.wx.nx), which triples the odds; the eldest could keep the
    dugout in on those days, or learn the "anvil cloud" sign on hot mornings.
  - A float: an inflated goat skin or a lashed log tied in the dugout halves SQUALL_SINK (ties goats/hides to the sea).
  - A second dugout, or the far isle's boat at midsummer, could paddle out for the swimmer instead of everyone standing on the sand.
  - A rope and a strong swimmer at the landing: a byname ("Seal") for someone who has dragged three out of the surf.
  - A drowned islander has no body to bury now (bury() still makes a grave); a cairn or a "sea grave" stone on the beach would mark them.
  - Old paddlers (57+) still go out; a rule that the young take the boat would cut drownings and give the elders a reason to teach.
- Timing note: check.mjs on seed 20261114 now runs ~2.7 s/yr at ~350-430 people on this machine (HEAD ~11 ms per person-year, now ~8.4);
  the 1.5 s at 300 guide is not met at the top end, so another speed pass would help before the live world gets that big.
- Cheese is done (SIM_VERSION 51; w.cheese {r, p, c, n, y, e, ye, d, f, nm, mk, at, told}; rackSite/learnCheese/cheeseMilk/cheeseDay/
  cheeseTask/cheeseDone/cheeseFed in sim.js, CHEESE_* constants; drawRack/rackAt in render.js; `scripts/_cheeseprobe.mjs [years] [seed|live]`).
  The rack (60) sits full most of the year on Hais; only a long cold spell at 40+ people empties it. Answers it invites:
  - Rats get at the rack (the potter's jars could hold cheese too, or a cat comes ashore); a bad rat year leaves the frail without.
  - A second rack, or a cool cheese cave dug into the clay bank, once the village outgrows one rack.
  - Cheese as a gift: the far isle's raiders go for the rack, or a round sent home with hungry guests eases the feud.
  - Cheese in the paddler's and hunter's bag on long days (fewer turning back hungry), or a "Cheesemaker" byname after 200 rounds.
  - Whey fed to the dogs or the pigs; a kid's stomach (rennet) only comes from autumn kills, so a year with no kids killed means no cheese.
- Rooks and bird-scaring are done (SIM_VERSION 52; w.crow {b birds, n landings, e fields' worth eaten, g, y, st stripped, ys, s scared, wait, cur, up,
  sc, nm, k}; crowHour/crowEat/crowUp/crowScare/crowYear/learnScare in sim.js, CROW_* constants, crowsDown() exported; task 'scare'; drawRooks()
  in render.js; `scripts/_crowprobe.mjs [years] [seed|live]`). Sowing now clears f.lost (old crop losses no longer carry onto a resown field).
  One flock only, so at 300+ people and 500 fields it is a small nuisance (1-3% of the harvest). Answers it invites:
  - A scarecrow: an old cloak or hides on a cross of poles in a field keeps the flock off it for a season, then they get used to it (a craft
    the eldest invents after the children grow up or when there are too few of them; a pixel figure in the fields, maybe in a wolf-skin).
  - Slings: older children (10-13) who scared many flocks learn to sling stones and now and then kill one (rook pie; a "Slinger" byname).
  - A rookery: the flock's nest trees in the woods could be shown on the map (a ring of black nests), and woodcutters felling them drive the
    flock off for good, at the cost of timber and a few years of more seed-eating birds.
  - A second flock (or gulls off the beach) once there are 100+ fields, so the late game feels it too.
  - Children out scaring can't wade, chase rainbows or mind goats at the same time; a busy spring could show the tension.
- Good-years strip is done (render.js only: GOOD rows, STRIPS {hard, good}, drawStrip/stripCap/stripAt/stripGo, sb layouts; canvas #gband,
  caption #gbcap, class .yr.gl). Larder mixes units (cheese rounds + honey/4 + coppice timber/10) and sea adds cockles/4. Answers it invites:
  - Midsummer guests, far-isle weddings and mead are not in `hist.yearly`; recording them (sim, yearly keys) would give a "feast" row.
  - Harvest and births grow with the population, so late years always look best. Per-head rows (harvest / pop) would make a small
    good year stand out.
  - A tale on the longest night could name the best year ("the year of the eleven births") the way the hard year could be named.
- Fog signs are done (SIM_VERSION 53; w.lore.fl/fnm/fg/fn/fh/fm/ff/fk/fc; fogRead/fogKept (exported)/learnFog in sim.js, FOG_* constants;
  w.wx.gl counts goats taken in this fog spell; `scripts/_fogprobe.mjs [years] [seed|live]`). Calls ~70% of fogs; on a kept day the goats
  stay penned and strays are mostly stopped. Penned goats get no extra food and give milk as usual. Answers it invites:
  - Kept-in goats could eat hay or spare grain (a cost), and a long fog spell could leave them hungry and bleating.
  - Woodcutters and foragers still go out to the treeline in fog; on a called day they could work in pairs or stay by the fields.
  - The beach watch could be doubled on a called fog night in a lean raid year (raiders favour fog).
  - The reader's skill (FOG_HIT, LORE_HIT) could grow with years of right calls, with a byname ("Weather-eye").
  - Heat and frost are still uncalled; the same evening fire could call them next.
- The bear is done (SIM_VERSION 55; w.bear {n, y, r, yr, hc, cc, k, dv, m, last {nm, look, y, how}, cur {id, nm, look, at, t, r, hc, cc, k, dv, m,
  back}}; beast k 'bear' with b.raid/hv/eat/hc/cc/sp; bearDay/bearGoes/bear/bearNightEnds/bearPrey in sim.js, BEAR_* constants; h.tp a split log;
  deed 'u'; yearly `bear`; BEAR/BEAR_UP sprites and HIVE_DOWN in render.js). From year 5, once there is honey or cheese, a late summer
  (doy 150, 50%, 3+ years apart) may bring a named bear over the bar; it lies up in a thicket (loneBed) and on ~12% of quiet nights goes for the
  heaviest log or the cheese rack until a waker (dog makes it likely) drives it off; it may split a log (hive dies) or swipe (a wound only).
  It leaves at doy 282, and often the same bear comes back. Answers it invites:
  - A bear hunt: hunters with spears and dogs at its thicket in autumn; a bearskin (a warmer bed than hides), claws as a necklace, a byname
    ("Bear-killer"). It should be dangerous: a real chance someone dies. A bear killed never comes back by name.
  - Logs raised on a platform or hung in a tree, or a thorn ring round the bee garden (the hedge craft), so it can't reach the comb.
  - A bear pit dug on its path, with a sharpened stake; or the beach watch fire moved up by the hives in bear summers.
  - Leaving it a gift (a comb on a stone at the edge of the woods) so it stays out of the village: a superstition the tale-teller tells.
  - The cheese could go in the potter's jars or a clay-sealed pit by the houses, out of its reach.
  - The bear and the lone wolf could meet; the wolves keep away from its thicket.
- Seals are done (SIM_VERSION 56; w.seal {x, y haul-out sand tile, dx, dy, n, p pups, e/ye fish eaten, k/yk taken, d wary until day, s skins,
  fl float tick, fn, fs, b bites, nm, at, h, hn}; sealSite/sealsCome/learnSealing/sealDay/sealFloat/sealTask/sealDone in sim.js, SEAL_* and
  FLOAT_* constants; task 'seal' (key zs), haul 'seal'; techs 'seals' and 'sealing'; yearly `seals`, `sealsTaken`, `sealFish`; drawSeals/sealSand
  and the float on the dugout in render.js). After 40 dugout trips a herd of 5 hauls out on the sand beach farthest from the hearth (within 26
  tiles); it eats 1 deep fish per 5 seals a day, all year, and pups at doy 285. Once 500 fish are gone the best fisher/hunter learns to take them
  in early winter (40%, then the herd keeps off for 9 days, never below 8). Test runs: herd swings 11-16, ~3 taken a winter, dugout catch falls
  from ~900 to ~300-480 a year. The first skin becomes a float once a squall has been seen: a swimmer's chance of drowning drops to 35%.
  Answers it invites:
  - The dugout catch stays low for good with 12+ seals. A second dugout, nets (a craft that lands more per trip), or a bolder cull rule
    once the catch fails (keep 5 instead of 8) would answer it. Or the seals could move on if they are taken every winter for years.
  - Seal oil: blubber rendered in the potter's jars into lamp oil for the longest night (a warm light in the windows), or to proof the dugout.
  - Sealskin for more than floats: boots for the winter woodcutters, a skin boat (a curragh) once timber is scarce late game.
  - A pup taken in by the children as a pet that follows them into the shallows; or a "Seal" byname for someone who swam ashore twice.
  - Orca or a shark chasing the herd in once a decade (the seals scatter and the dugout stays in).
  - Spare skins go to w.hides (winter warmth); hides already wear out 40% a year, so the effect is small.
- Housekeeping: scripts/.deerpeek.mjs is an old committed probe and can go, and so can scripts/_bear.mjs, _sea.mjs, _seal.mjs,
  _seal2.mjs, _st.mjs and _race.mjs (the last visit could not delete files).
- The midsummer race is done (SIM_VERSION 57; w.fest.race {d, sx/sy start, ex/ey stake, lx/ly lane step, rs [[id, share run by 18:00]], win, nm},
  w.fest.rn, w.fest.rl {nm, y, a}; raceCourse/raceStart/racePos/raceEnd/raceWed in sim.js, RACE_* constants, raceNow() exported; deed 'r' and
  byname "the Swift"; raceStake() and OAK wreath in render.js). Positions are set by the hour (not walked), so runners do not wear paths.
  Answers it invites:
  - Other games at the same fire: a spear throw at a straw boar (the winner joins the next hunt), or a tug of war between the two ends of the village.
  - Far-isle guests could run too; a guest who beats the island's Swift is a story, and a rivalry for the next summer.
  - A fall on the course (a twisted ankle: a few days laid up), or an old Swift who keeps running past 30 and is beaten by a child.
  - The Swift as a runner in the sim: sent to call the hunters or the dugout home when a storm is called, or to wake the village in a raid.
  - The course runs over open grass; late game, when fields fill the land near the hearth, raceCourse may find no clear run and the race lapses.
    A kept green (no fields within N tiles of the fire) would save it and the dancing ground.
- The bear visit left render.js with two `const RCOL` declarations, so the bundled page threw a SyntaxError and showed nothing until this
  visit renamed the bear one to BEARCOL. build.mjs now compiles the bundle (node:vm Script) and fails if it does not parse; `node --check
  src/render.js` catches the same thing. Nothing yet runs render.js itself, so a runtime error in a draw function would still blank the page:
  a smoke test that runs one frame against a stub canvas would close that gap.
- Scarecrows are done (SIM_VERSION 58; w.crow.m [{x, y, f, d fright left, n turned, by, hd hide, t}], mk, mt, my, mv, mo, mnm, mat;
  learnScarecrow/scareTurn/scareSite/scareTask/scareDone in sim.js, SCARE_* constants; task 'crowman' (key zk, t.o index of a found-out one
  being moved or -1); drawScarecrows/scarecrowAt in render.js; yearly `crowTurned`). On the live world rook losses fall to ~30-60 grain a year.
  Because the children scare far less now, the flock no longer thins (CROW_THIN) and climbs toward 40. Answers it invites:
  - Late game 8 scarecrows cover only a part of 500+ fields; a second flock (or the gulls) would make them matter again.
  - Snowmen and scarecrows: the children dress a scarecrow in the Wolf-slayer's old cloak, or name them like the snowmen.
  - A storm could blow one down (it lies in the rows until someone stands it up again); the bear or boars could knock one over.
  - Scarecrows in the History good-years strip (crowTurned is recorded but not shown).
- Housekeeping: scripts/_scareprobe.mjs (runs the live world N years and prints rooks/scarecrow numbers) is a throwaway this visit could
  not delete; it can go with .deerpeek.mjs, _bear.mjs, _sea.mjs, _seal.mjs, _seal2.mjs, _st.mjs and _race.mjs.
- Whooping cough is done, as a problem only (SIM_VERSION 59; w.cough {k, n, d, all, lost, y, yd, end, who, nu nursing parent ids}, p.cg tick
  the cough ends, p.cgi had it; coughDay/coughs in sim.js, coughOpen/coughKept exported, COUGH_* constants; tech 'cough'; yearly `coughs`,
  `coughDied`; doorstep sprite in render.js). Only island-born people who never had it can catch it (p.mother != null or under 14); grown-ups
  catch it at 0.3x and never die of it. Seed 4242: an outbreak every 5-9 years, ~2 babies lost each at 100+ people. Answers it invites:
  - Honey and thyme: a spoon of honey in warm water eases the fits (the bees are there already); the healer could learn it after the first
    baby dies, halving the risk for a tended child, at a cost in honey.
  - Keeping the coughers apart: one house (or a hut by the woods) for the whooping children, so it does not reach the babies in other houses.
  - Far-isle guests bringing it at midsummer, or carrying it home (the far isle's children die, and its people blame Hais).
  - A mother who lost a baby to it could take the healer's basket later, or tell the cough tale on the longest night.
  - The parents sitting up lose sleep too: tired workers the next day, slower harvests in a bad outbreak.
- Housekeeping: scripts/_cough.mjs (live/seed cough probe), _bench.mjs and _oldsim.mjs (a copy of the old sim.js for a speed check) are
  throwaways this visit could not delete either; delete them with the older ones listed above.
- Standing stones are done (SIM_VERSION 60; w.stones {cx, cy, sx, sy, s [{k, y, n, nm, g grave id, t}], cur {x, y, px, py, k, ids, w, h,
  up, d, nm, g, ld}, n, y, hurt, at, nm, done}; STONE_RING slots exported with stoneOn/stoneSlot; the 37 tiles within d2 <= 10 of the
  centre are T.BUILD so nothing is built or sown inside; task 'stone' with t.pull; deed 's' shows in tales and graves). The ring has no
  effect beyond the haul and the feast. Answers it invites:
  - Midwinter sunrise: once closed, the village walks out before dawn on the shortest day and watches the sun come up between two stones
    (a yearly gathering like the tale night); the sky reader could count the year by it and time the sowing against late frost.
  - The midsummer dance or weddings held in the ring; far-isle guests who see it and want one of their own (or envy it).
  - A stone that topples in a storm or a wet winter, or a haul that breaks a rope on a slope and rolls back; a second outer ring or a
    heel stone once the first is closed, for a bigger island with more hands.
  - A byname for whoever hauls the most (the Stone-raiser), and stones in the History good-years strip.
  - The haul takes up to 10 of the grown-ups for 3-5 days and picks the strongest; late game at 200+ people it barely shows. Several crews
    at once, or bigger stones (more haulers, slower), would keep it a village event.
- Housekeeping: this visit could not delete scripts/_stones.mjs (stone haul probe) or scripts/_bench2.mjs (speed check with the stones
  switched off) either; delete them with the ones listed above. On this machine seed 777 runs ~1.6-1.8 s/yr at 150-270 people with or
  without the stones, so the slowness comes from the machine, not this change.
- Feuds are done (SIM_VERSION 61; w.quarrel {k, cur {a, b house ids, ai, bi, an, bn heads, d, why, n spats, f fights}, end, y, yf, f, m,
  br [bruised ids], cup}; quarrelDay/quarrelBegin/quarrelSpat/quarrelMend/quarrelGrave in sim.js, QUARREL_* constants; quarrelHouses and
  quarrelBruised exported; apart() blocks matches() across the two houses; techs 'feud' and 'peacecup'; thorn() in render.js). Only one
  feud runs at a time, and the sides are fixed by house id. Ideas it opens up:
  - A feud that does not end: one house packs up and builds a hamlet on the far side of the island (a second hearth, its own fields).
  - Blood-price: the house that struck the blow pays goats, cheese or hides, and the elders count it out at the fire.
  - Lovers across the thorn branch: a couple from the two houses meet in secret, or run off on the dugout to the far isle.
  - Feuding houses will not help each other: no hands at each other's roof-raising, separate harvest crews, a slower village.
  - Far-isle guests taking sides at midsummer; or the far isle as the other party, with a feud between whole islands.
  - Tales: the eldest tells the story of the first feud and the first peace cup on the longest night.
- Housekeeping: deleting files is still blocked on this machine, so scripts/_*.mjs and scripts/.deerpeek.mjs are all still there.
- Incomers are done (SIM_VERSION 62; w.inc {n households, p people, y, on day due, lean, cur boat {.., st 'in'|'beached', gs [{nm, sex, a,
  r 'f'|'m'|'c'}], k 'house'|'pair'|'widow', why, d, nm, ids}, last}; p.fi year came over; incBoat exported; drawInc and the shell bead in
  render.js; yearly `came`). Once ashore they are ordinary islanders; nothing else treats them differently yet. Ideas it opens up:
  - Strangers' ways: the newcomers keep a far-isle custom (a different midsummer song, shell beads, a way of smoking fish) that the island
    slowly takes up, or a skill Hais lacks (weaving, a better net) arriving with them as a new tech.
  - Distrust: in the first years their house is the first one blamed when comb or grain goes missing (a feud seed tied to p.fi), until a
    marriage or a shared hardship settles it.
  - Kin on both shores: a household with family left behind makes the far isle less likely to raid (like isleWed), and the guests at
    midsummer ask after them by name.
  - A crowded Hais (70+) turns them away with a sack of grain; the far isle remembers who was refused.
  - The runaway pair: the girl's father paddles over at midsummer to fetch her back.
- The bear pit is done (SIM_VERSION 63; w.bear.pd/pit/kl/skin, b.vp/b.pit on the beast; pitSite/pitTask/pitDone/pitCover/pitStep/pitKill/
  pitChild, PIT_* in sim.js; tech 'bearpit'; pit is a BUILD tile). A wary bear (C.wise, remembered in last.wise) can dodge it for years.
  Answers it invites:
  - The bearskin: worn by the one who took it (like the wolf cloak), or laid on the eldest's bed so the old stay warm in cold snaps.
  - Bear's grease for the healer (wounds heal faster) or for the dugout seams; claws strung as a necklace worn at midsummer.
  - A fence of thorn round the pit after a child falls in, or the children taught a rhyme about it in the winter tale.
  - A wary bear that keeps dodging could earn a legend ("the bear that cannot be taken") told on the longest night.
  - Boars or a lone wolf could also go into a covered pit; the far isle could ask for a bearskin as a peace gift.
- Spinning and the loom are done (SIM_VERSION 64; w.loom {id, nm, k, at, by, h, y, wv, b, n, yb, wo, cv}; learnLoom/loomDay/loomTask/
  loomDone, loomAt/loomCover/spinning exported; drawLoom/loomRect in render.js). Hair comes only from goats, and the herd is capped near 14,
  so a big late-game village cannot cover every bed. Answers it invites:
  - Sheep (a ram and ewes off a far-isle boat, or traded for a bearskin): wool, many times the hair a goat gives.
  - Flax in a wet field by the spring: linen for shirts and sails, retted in the stream (a smell, a new field kind).
  - Dyes: woad blue, onion-skin yellow, madder red; dyed cloaks for the midsummer dancers, a coloured shirt per household on the sprites.
  - A sail for the dugout (faster trips to the far isle, or a second, bigger boat); fishing nets instead of lines.
  - Cloth as a gift or trade with the far isle; a blanket sent home with hungry guests; a shroud for the dead in the burying ground.
  - A second loom once the village passes ~20 houses, or girls apprenticed to the weaver (a byname, "the Weaver").
  - Moths in the blankets in a damp year, or a winter fire in the weaver's house that takes the loom and the web.
- Lovers across the thorn branch are done (SIM_VERSION 65; quarrel cur.lv {f, m, fn, mn, fh, mh, d, n, on, x, y, at, s, k, go}, w.quarrel.el
  {f, m: {nm, sex, b, mo, fa, cg}, y, an, bn, w}, pr [f, m] promised, ran, back; drawTryst/trystNow in render.js). Young islanders pair
  off at 17 within months, so single teens are rare; that is why the love feud is chosen at quarrelBegin rather than waited for. Answers it invites:
  - A child of the secret match born before the bowl is shared (talk at the spring, the grandmothers come round).
  - The runaways' child, raised on the far isle, could carry far-isle ways home (shell beads, a song, a better net).
  - A pair caught at the stones could be blamed for a stone that falls or a bad harvest ("they have angered the dead").
  - The tale on the longest night: the eldest tells of the pair who ran off and came home.
  - Lovers could use the island's own dugout if no guests come, and the island goes without it until they bring it back.
- Housekeeping: scripts/_love.mjs and scripts/_love2.mjs (lovers probes) also could not be deleted. Earlier: deleting files is still blocked on this machine; scripts/_loom.mjs (loom probe) joins the scripts/_*.mjs and
  scripts/.deerpeek.mjs that should all be deleted. check.mjs ran 1.5-2.5 s/yr here on all three seeds; verify on the live world 866 ms/yr.
- Storm tides are done, as a problem only (SIM_VERSION 66; w.surge {n, k, y, yt, s salted now, g driftwood, b dugouts, last, lv level, nm, at};
  f.sa wet days left, f.sw; seaReach(w) in sim.js rebuilds genesis heights and gives each tile the lowest sea that can run to it, cached,
  never saved; surgeDay/saltWash, SURGE_*/SALT_*; surgeWet exported; drawTide/saltAt in render.js). Village fields start at height ~700
  and the tide reaches 230-360, so early on only the beach suffers; coastal fields from ~Y40 do. Answers it invites:
  - Tide lore: the sky reader learns that a storm at new or full moon brings the sea up, and the dugout is hauled up to the houses on
    those nights (sky lore and moon lore already exist; this would close the dugout losses).
  - A sea bank: a turf-and-stone dyke along the low edge of the fields, built a stretch each winter; it raises the level the sea must reach.
  - Seaweed: the wrack line is hauled up in baskets and spread on the fields (like goat muck, a yield bonus), giving the tide a gift too.
  - Salt pans: sea water left in clay pans on the rocks to dry; salt for curing fish and meat, for the cheese, or to trade with the far isle.
  - Samphire and sea beet on the salted ground as a famine food; a salt-tolerant grain (barley) brought by incomers for low fields.
  - needFields still counts salted fields as if they will crop, so the village does not clear more land after a big tide; a lean year
    after one could make it clear inland fields, adding to sprawl.
- Housekeeping: scripts/_surge.mjs and scripts/_surge2.mjs (tide probes) could not be deleted either. check.mjs here: 20261114 2.2 s/yr,
  777 2.7 s/yr at ~390 people, 4242 1.5 s/yr; verify on the live world 934 ms/yr.
