> Current draft override: arcade cabinet controls and full impact feedback are enabled at the user’s explicit request. Reduced-motion handling described in earlier sections is disabled for now.

# Screw Garden visual direction

Use the approved dusty-blue camera mockup as the reference: a quiet, sparse,
slightly fuzzy early-2000s console game. Keep the model as the focus. No large
logo, sticker collage, decorative scenery, cardboard textures, neon, or
vaporwave/synthwave imagery.

The page uses a dusty blue field (`#50677d`), soft off-white monospace type, and
compact rectangular controls. Trays have subdued tinted surfaces with clear
color strips and labels. Saturated screws remain easy to identify against
ivory, slate, muted rust, and grey-green model materials. The shelf has five
simple octagonal sockets. Dialogs and the collection picker use the same palette.

The 3D scene uses matte diffuse materials, small procedural texture maps,
low-sided cylinders, and one restrained ground shadow. Render the scene below
its displayed resolution with anti-aliasing off, then softly upscale it; this
produces actual rasterized edges. A very low-opacity static scanline overlay
completes the display character. Do not add animated noise, flicker, aggressive
RGB splitting, heavy blur, or complex postprocessing. No generated concept image
is used as a runtime backdrop or texture.

Models remain real, individually removable assemblies. Surface details attach
to their owning components. Do not move screw anchors or change blockers solely
to decorate a model. Preserve vivid screw colors, visual occlusion, accessible
HTML hit targets, and keyboard controls. Default framing should make the object
large enough to inspect; drag and pinch still rotate and zoom it.

Keep portrait controls visible at 360×740 and 390×844. Smaller screens may scroll
vertically; never introduce horizontal scrolling. Maintain 44-pixel utility
buttons and readable color labels. Page zoom remains available outside the board.
Pinching the model must not remove screws; Reset restores angle and zoom.

Screws spin around their own axes and extract along outward surface normals,
revealing their shafts. A part waits until its last screw clears before dropping.
Undo restores exact positions and orientations, including mid-extraction.
Reduced motion removes pieces immediately and disables interface transitions.

`src/styles.css` owns the UI palette and layout. `src/renderer.ts` owns the raster
resolution, materials, lighting, framing, and ground shadow. `src/objects.ts`
owns original geometry, details, and muted model colors.


## Arcade presentation

Classic remains quiet. Arcade adds a compact score/time/combo HUD and a combo
meter while retaining the dusty-blue scene. Pixel bursts and on-screen score
numbers originate at the selected screw. Bucket/model clears have larger bursts
and a short warm flash, throttled to avoid repeated flashing. Effects are bounded
and removed after finishing; they never intercept pointer input. Reduced motion
suppresses particles/flashes and keeps stationary numeric feedback. Arcade
extracts screws faster, while preserving their outward axes and Undo poses.

Use 44-pixel mode controls. Keep the score HUD and bottom tools visible at
360×740 and 390×844; retain vertical scrolling on shorter screens. Explain time
costs next to Arcade Undo/Hint. Timer announcements should not flood screen readers.


## Tactile feedback in both modes

Successful screw taps have a small expanding ring and a short impact kick. Part
releases and bucket clears give stronger kicks, capped at five pixels. A new
pointer-down or keyboard input cancels the stage shake before interaction;
shakes never stack or run as a continuous loop.

A new screw slot briefly pops. Completed buckets show all three screws and a
check mark, squash, lift away, and reveal the incoming bucket. Arcade uses a
faster sequence than Classic. Completion copies sit in an aria-hidden,
pointer-transparent overlay, separate from the four live trays. Logical bucket
replacement and rewards happen immediately. Game completion events include
buckets auto-filled from the shelf, so cascades animate the correct colors.
Undo, Restart, and model changes clear stale completion feedback.

Reduced motion suppresses shakes, tap rings, slot scaling, and bucket movement;
a stationary full bucket/check briefly fades instead. Keep the Classic backdrop
quiet and preserve the existing Arcade particles and score popups.


## Longer Classic teardowns

Classic variants have 20–55 parts, 42–120 screws, and inner frames/core components.
Use larger geometry and 1–3 carefully spaced fasteners per part; do not create
artificial waiting periods. Typical collection estimates are 2–5 minutes, not
forced completion times. Arcade keeps the original compact variants.

The model view uses wider edge-to-edge framing. Pinch to zoom, move two fingers
together to pan, and use Reset/Home to recenter. Rotation reaches the top and
bottom faces for deep cavities. Covered screw meshes stay hidden until their
physical blockers are removed, preserving readability and mobile performance.

## Workshop progression and tactile rewards

Keep the sparse blue game board. The Workshop tab adds a compact wallet/time strip, one starting bucket, and a three-slot shelf. Energy comes from momentary salvage chips, numbers, layered-discovery bursts, rechargeable-tool callouts, and short button depressions. Detaching parts tumble slightly while accelerating downward; screws retain axial extraction and exact Undo. Avoid moving the screw hit target when pressing it. Reduced motion retains numeric feedback and static completion checks.

The workshop is a quiet miniature room in the upgrade dialog: a workbench, then a tool wall, then display shelves. Three branching maps separate Workbench, Tools, and Mastery. Show scrap prices, total-XP gates, prerequisite names and exclusive specialist choices on each node. Purchases affect the next attempt. Results itemize screws, discoveries, completion, and speed bonuses so failure still shows meaningful progress.

## Icon-led branch map

Upgrade browsing uses a fixed-height dialog with four icon tabs: Workbench, Tools, Mastery, and Room. Each skill branch fits on a single screen, with SVG prerequisite connections and selectable icon nodes. Locked nodes remain inspectable. A fixed panel shows only the selected skill's short effect, XP threshold, scrap price and install state; selecting a node does not buy it. Installed/ready/locked states use checks, plus signs and locks as well as color. The Room tab preserves workshop restoration separately. All actions fit at 320×568 without scrolling. Mode tabs, game tools and currency use original SVG icons with short labels or accessible names. Preserve the sparse dusty-blue visual language and reduced-motion support.

## Cabinet controls and pressure

Give visible buttons a raised cap, inset upper highlight, dark lower rim and mechanical press travel. Preserve the hit regions on invisible screw targets and the fixed skill-tree layout. Stage shakes, camera punches and bucket bursts create a volatile, machine-like feel without adding scenery. A warm edge vignette signals low time or a nearly full shelf. Zoom punches last 260ms, restore the user’s inspection zoom and cancel on new board input. Keep particle counts bounded and flash events brief, at least 900ms apart.
