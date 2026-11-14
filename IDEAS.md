# Ideas backlog

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
