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
