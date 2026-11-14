# Ideas backlog

## Owner requests (do these next, one per visit)

### Creatures
- Wolves live in the deep forest. In winter and at night they come to the forest edge; a villager
  out alone far from the fire can be attacked (rare, and mostly the unlucky or careless).
- Boars trample fields near the forest in summer and autumn.
- Visible: grey wolf sprites prowling the treeline at night with glowing eyes; boars rooting in
  fields. Villagers react: stay closer to the fire at night after an attack.
- Leave room for later answers: hunting (food and fewer wolves), a palisade, guard dogs.


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
- Performance: findFieldSite (full 64x64 scan per idle worker in spring/summer) and the timber scan in
  pickTask dominate at 300 people (~1.6 s/yr). Cache the best field site per day; keep a forest-tile list.
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
- Speed: one 100-year run took 934 ms/yr on average once pop passed 300; findFieldSite is still the hot spot.
- Weather is done (w.wx: k, n days, f fields flattened, r roofs, d deaths). Answers it invites:
  weather lore (elders read the sky: harvest ripe fields before a storm, stack wood before a frost),
  stone or thatch-pegged roofs that resist storms, irrigation ditches against heatwaves, a storm cellar.
- Storms could wreck fishers caught on the shore, or wash up driftwood / a castaway boat.
- Snow could slow walking and pile up on the map (white tiles that melt in spring); rainbows after rain.
- Spring cold snaps can run 15-20 days; a late frost could kill young shoots outright for real drama.
- Yearly history now records `storms` (storm days) and `flattened` (fields); a weather row in the
  graph panel would show bad years at a glance.
