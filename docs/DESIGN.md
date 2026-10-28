# Screw Garden design

The game is a quiet, tactile workshop: warm ivory, soft green, dark evergreen type,
and candy-colored screw heads. Models use original geometric parts and a soft
ground shadow. Important actions use a consistent filled green button; utility
actions use light outlined buttons. There are no commercial calls to action.

The interface follows a portrait sequence: level and progress, matching trays,
3D object, temporary storage, then undo/hint/restart controls. Keep the
object as the primary visual element. A desktop viewport displays the same
focused portrait game panel. Safe-area padding accommodates phone cutouts.

Color names, status text, and accessible button labels must accompany colors and
icons. Touch controls have at least 44-pixel targets. System fonts avoid remote
font requests, and reduced-motion preferences disable interface transitions.

`src/styles.css` contains the shared palette, layout, responsive compact mode,
tray and storage states, and completion/help dialog styles. Check portrait
viewports at 360 × 740 and 390 × 844 when changing the interface.
