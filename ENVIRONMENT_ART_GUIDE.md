# A FORM UNWRITTEN: Environment Art & Architecture Guide
## Technical Standards for Region Environments & Parallax Systems

This guide establishes the technical specifications, layering conventions, lighting rules, and asset creation pipelines for expanding regions in *A FORM UNWRITTEN*.

---

## 1. Depth Plane Hierarchy & Z-Ordering

Every visual element in the game operates on a strictly disciplined depth plane hierarchy to maintain visual clarity, correct parallax layering, and total separation from gameplay physics.

| Depth Value | Layer Name | Object Types | Scroll Factor X | Scroll Factor Y |
| :--- | :--- | :--- | :--- | :--- |
| `0.0 .. 0.1` | Sky Dynamic | `tex_sky_dynamic` canvas gradient | `0.0` (fixed) | `0.0` (fixed) |
| `0.2` | Stars | Night celestial star field | `0.0` (fixed) | `0.0` (fixed) |
| `0.3` | Horizon Glow | Dawn / sunset horizon arc | `0.0` (fixed) | `0.0` (fixed) |
| `0.4 .. 0.5` | Sun & Moon | Celestial solar disc and crescent moon | `0.0` (fixed) | `0.0` (fixed) |
| `1.0` | Parallax Far | Distant mountains, clouds, distant monoliths | `0.10 .. 0.15` | `0.02 .. 0.05` |
| `2.0` | Parallax Mid | Aqueducts, major landmarks, waterfalls | `0.25 .. 0.30` | `0.06 .. 0.09` |
| `3.0` | Parallax Near | Near ruins, colonnades, distant trees | `0.45 .. 0.50` | `0.10 .. 0.14` |
| `10.0` | Static Props | Background pillars, archways, distant masonry | `1.0` (world) | `1.0` (world) |
| `11.0 .. 12.0` | Inscriptions | Carved stone rune tablets and subtitles | `1.0` (world) | `1.0` (world) |
| `13.0 .. 14.0` | Active Props | Animated braziers, lanterns, waterfalls, wildflowers | `1.0` (world) | `1.0` (world) |
| `15.0 .. 15.9` | Under-Terrain | Contact shadows, foundation masonry | `1.0` (world) | `1.0` (world) |
| `16.0` | Terrain Skin | Platform visual tiles (grass, pavers, rock) | `1.0` (world) | `1.0` (world) |
| `17.0` | Local Lights | Dynamic additive point lights (lanterns, braziers) | `1.0` (world) | `1.0` (world) |
| `20.0` | Gameplay Plane | Player sprite, NPCs, movable blocks, particles | `1.0` (world) | `1.0` (world) |
| `30.0 .. 35.0` | Environmental Mist | Drifting horizontal mist bands | `1.0` (world) | `1.0` (world) |
| `65.0 .. 66.0` | Foreground Depth | Foreground occluder silhouettes and ivy overhang | `1.05 .. 1.14` | `1.0` (world) |
| `85.0` | Atmospheric Grade | Full-screen color grading overlay | `0.0` (screen) | `0.0` (screen) |
| `90.0` | Vignette | Screen-edge darkening overlay | `0.0` (screen) | `0.0` (screen) |
| `100.0+` | UI / HUD Camera | Health, quests, maps, dialogues, menus | UI Camera | UI Camera |

---

## 2. Gameplay Separation & Physics Invariant

1. **Colliders Are Sovereign**: Visual assets (textures, props, parallax) MUST NEVER modify, offset, or reshape Phaser Arcade Physics static platform bodies.
2. **Invisible Physics Boxes**: Platform colliders exist as transparent bounding boxes in `platformsGroup`. Terrain skins are rendered as visual representations on depth 16.
3. **Sub-Pixel Origin Precision**: Platform tile sprites must be positioned at `p.x` with origin `(0.5, 0)` at `p.y - p.height / 2` to guarantee that walking surfaces align precisely with the collision surface.
4. **Zero Float / Zero Sink Rule**: Player feet must touch the top pixel of the platform skin. No gap may exceed 1px.

---

## 3. Real-Time Lighting & Atmosphere Integration

All environment artwork must comply with the dynamic lighting pipeline:

1. **Neutral Daylight Source**:
   - Artwork must be painted under soft, neutral daylight (color temperature ~5500K to 6000K).
   - Never bake permanent golden hour orange, sunset crimson, or night darkness into texture assets.
   - Contrast should be clean but diffuse; avoid deep black shadows in open areas.

2. **Tints Handled by LightingController**:
   - `parallaxFar` receives `state.parallaxFarTint`.
   - `parallaxMid` receives `state.parallaxMidTint`.
   - `parallaxNear` receives `state.parallaxNearTint`.
   - Full-scene color grading is applied via `gradeOverlay` at depth 85 with `gradeColor` and `gradeAlpha`.

3. **Local Point Lights**:
   - Light-emitting props (lanterns, braziers) must register with `LightingController.registerLocalLight()`.
   - Lights use `tex_light_cookie` in additive blend mode on depth 17.
   - Lights automatically flicker and scale intensity based on the atmospheric phase (dimmer at midday, glowing brightly at dusk and night).

---

## 4. Asset Authoring Specifications

### Dimensions and Seamless Wrapping
- **Far Backgrounds**: 1920x680 WEBP. Must wrap horizontally with zero seam (`pixel(0) == pixel(width-1)`). The top 140px must smoothly dissolve to transparent alpha (`alpha = 0`) to seamlessly blend with the celestial sky.
- **Mid Backgrounds**: 1920x680 WEBP (RGBA). The upper sky above the architecture must be 100% transparent. Openings through arches must be transparent to allow the far peaks to peek through. Left and right margins must blend seamlessly.
- **Near Backgrounds**: 1920x700 WEBP (RGBA). Columns, arches, and hanging pennants along the bottom half, with the top half fully transparent.
- **Platform Tiles**: 256x48 PNG (RGBA). Must tile horizontally with zero seam. Height should match or cleanly tile platform heights (typically 48px or 28px).
- **Props**: Isolated PNG (RGBA) trimmed to visible content bounding box with smooth anti-aliased alpha borders.

### Memory & File Size Budget
- Each major region is allotted a maximum of 5.0 MB in compressed image assets.
- Future regions should be loaded dynamically or preloaded on approaching the region boundary.

---

## 5. Adding a New Biome / Region: Step-by-Step

When creating the next region (e.g. The Wind-Spires or Sunken Sanctum):

1. **Define Region Bounds**: Add bounds in `src/game/environment/regions/<biomeName>.ts` using `RegionDefinition`.
2. **Author Source Art**:
   - Far matte (peaks, horizons, distant landmarks).
   - Mid architecture (spires, temples, ruins).
   - Near architecture (overhangs, pillars).
   - Region-specific platform skins (e.g. aqueduct stone, sunken masonry).
   - Environmental props (e.g. spires, water cascades, glowing runes).
3. **Register Preload in BootScene**: Add `this.load.image(...)` calls in `BootScene.preload()`.
4. **Configure Overrides**: Map platform IDs in `platformSkinOverrides` to appropriate `TerrainSkinId`.
5. **Verify With Tests**: Run `npm test`, `npm run build`, and `npm run verify:e2e` to ensure collision parity and progression preservation.
