# Screw Garden design

The game is a quiet, tactile workshop: warm ivory, soft green, dark evergreen type,
and vivid, saturated screw heads. Models use original geometric parts and a soft
ground shadow. Important actions use a consistent filled green button; utility
actions use light outlined buttons. There are no commercial calls to action.

The interface follows a portrait sequence: level and progress, matching trays,
3D object, temporary storage, then undo/hint/restart controls. Keep the
object as the primary visual element. A desktop viewport displays the same
focused portrait game panel. Safe-area padding accommodates phone cutouts.

The collection uses recognizable real objects and buildings assembled from many
individually removable parts. The models keep their material colors restrained
so saturated screw colors remain easy to read. Rotate objects by dragging on the
board, or use the 44-pixel left/reset/right controls at the bottom of the board.
The board caption and drag reminder sit at the top to leave rotation controls
clear. Rotation must preserve touch targets and occlusion: hidden screws cannot
be tapped through the object.

Up to four sorting buckets fit in one horizontal row, with compact labeled
three-slot buckets when four are active. Bucket colors are supplied by the game
systems palette, as are shelf screw colors. Distinguish screw hues from the
subdued model materials; avoid strong lighting that washes out their colors.

Color names, status text, and accessible button labels must accompany colors and
icons. Touch controls have at least 44-pixel targets. System fonts avoid remote
font requests, and reduced-motion preferences disable interface transitions.

`src/styles.css` contains the shared palette, layout, responsive compact mode,
tray and storage states, and completion/help dialog styles. Check portrait
viewports at 360 × 740 and 390 × 844 when changing the interface.
