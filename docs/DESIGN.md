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
