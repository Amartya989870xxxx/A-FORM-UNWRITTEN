# A FORM UNWRITTEN: Asset Manifest (Phase 3)
## Whispering Precipice & Counterweight Courtyard Illustrated Environment

This manifest catalogs all illustrated art assets created and integrated for Phase 3: The Whispering Precipice and Counterweight Courtyard (`x: 0..1500`, `y: 560..1000`).

---

## 1. Asset Summary & Budget Compliance

- Budget Limit: 5,000 KB (5.0 MB)
- Total Region Asset Size: 1,327 KB (~1.33 MB)
- Budget Utilization: 26.5% of allowed allocation
- Image Formats: WEBP for continuous backgrounds; PNG (RGBA) for isolated transparent props, framing, and tileable terrain skins.
- Color Neutrality: All source textures authored under neutral midday diffuse lighting, allowing the dynamic LightingController and TimeOfDayService to handle Dawn, Morning, Day, Golden Hour, Sunset, and Night color grading without baked lighting conflicts.

---

## 2. Complete Asset Catalog

| Filename | Dimensions | File Size | Format | Depth Plane | Visual Function |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bg_highland_far.webp` | 1920x680 | 90 KB | WEBP | Depth 1 (scroll 0.12) | Distant alpine peaks, cloud sea, Broken Ring-Monolith, smooth top dissolve |
| `bg_highland_mid.webp` | 1920x680 | 186 KB | WEBP | Depth 2 (scroll 0.27) | Ancient limestone aqueducts, cascading waterfalls, pine groves, transparent sky |
| `bg_highland_near.webp` | 1920x700 | 18 KB | WEBP | Depth 3 (scroll 0.48) | Weathered fluted columns, ruined arch tops, climbing ivy, hanging cloth banners |
| `fg_highland_overhang.png` | 1920x360 | 29 KB | PNG | Depth 66 (scroll 1.08) | Foreground framing canopy with transparent backdrop and hanging vines |
| `prop_wind_chimes.png` | 294x666 | 252 KB | PNG | Depth 13 | Ancient bronze and sea-glass wind chimes with prayer ribbons and wind sway |
| `prop_stone_lantern.png` | 285x458 | 193 KB | PNG | Depth 14 | Carved limestone lantern with runic lattice and 110px dynamic amber point light |
| `prop_statue_fragment.png` | 346x503 | 314 KB | PNG | Depth 13 | Moss-draped classical stone bust fragment resting on echo tablet overlook |
| `prop_wildflowers.png` | 305x463 | 242 KB | PNG | Depth 14 | Highland gentian blue and edelweiss wildflower clumps with wind sway |
| `terrain_highland_ground.png` | 256x48 | 1.8 KB | PNG | Depth 16 | Seamless grass lip, stratified dark limestone bedrock, golden kintsugi veins |
| `terrain_stone_paving.png` | 256x48 | 0.6 KB | PNG | Depth 16 | Fitted ancient flagstone pavers with moss joints and remnant gold runic specks |
| `terrain_rocky_outcrop.png` | 256x28 | 0.5 KB | PNG | Depth 16 | Craggy chiseled limestone ledge with sunlit upper ridge line |

---

## 3. Authoring Prompts & Source Metadata

### Parallax Far Layer (`bg_highland_far.webp`)
- Source: High-resolution digital matte illustration with seamless wrapping.
- Aesthetic Brief: 2D side-scrolling distant alpine panorama, vast sea of cumulus clouds, sharp jagged snow-capped peaks, colossal broken ancient ring monolith rising on the horizon. Daylight diffuse sky, neutral color palette for real-time tinting, soft top edge fade.

### Parallax Mid Layer (`bg_highland_mid.webp`)
- Source: Classical monumental architecture illustration with custom alpha-mask segmentation.
- Aesthetic Brief: Ancient weathered limestone aqueduct spanning the highland gorge, multiple Roman arches, cascading waterfalls pouring into misty abyss, wind-bent pines and mossy rock terraces. Transparent upper sky and open arch apertures.

### Parallax Near Layer (`bg_highland_near.webp`)
- Source: Ruined colonnade matte illustration with horizontal seamless wrapping.
- Aesthetic Brief: Weathered fluted limestone columns, ruined arch springers, climbing ivy tendrils, antique crimson and gold pennants. Transparent upper space to prevent obscuring midground vista.

### Foreground Overhang Layer (`fg_highland_overhang.png`)
- Source: Botanical and architectural framing layer with full alpha transparency.
- Aesthetic Brief: Overhanging limestone cornice with trailing ivy vines, ferns, and highland leaves. Designed for depth 66 top-edge screen framing.

### Environmental Props (`prop_*.png`)
- Source: High-resolution isolated environmental prop sheet extracted with alpha channels.
- Aesthetic Brief:
  - Wind Chimes: Aged bronze bracket, weathered sea-glass fragments, linen ribbons responding to highland drafts.
  - Stone Lantern: Carved limestone hexagonal structure with warm inner illumination channel.
  - Statue Fragment: Ancient classical bust fragment overgrown with lichens and ivy.
  - Wildflowers: Alpine gentian blue blooms, silvery edelweiss, and slender mountain grass tufts.

### Terrain Platform Skins (`terrain_*.png`)
- Source: Hand-crafted 256px horizontally seamless cross-sections tuned to platform dimensions.
- Aesthetic Brief:
  - Ground: Verdant highland grass cap with soil roots, deep blue-gray stratified limestone, delicate golden fractures.
  - Paving: Fitted rectangular ashlar pavers, moss-filled mortar joints, gold flecks.
  - Rock: Faceted chiseled rock faces with rim highlight.
