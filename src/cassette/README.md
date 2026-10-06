# Cassette model source

The geometry, procedural textures, animation helpers and studio environment in
this directory were migrated from the user's local `模板/cassette/src` template.
`cassette.js` imports the project's vendored Three.js add-ons. The geometry and
materials retain the original model, including the chamfered shell, smoked
window, wound tape, guide pins, hubs and rear screw assembly.

The blog limits total tape to one reel's capacity, keeps interior support ribs
outside the viewing window, and tracks both reel radii when rebuilding the tape
path. This prevents oversized windings and keeps the spans tangent to the guides.

`../music-cassette.js` adapts that model for the blog: transparent canvas,
drag-to-rotate controls, aspect-aware framing, playback-driven tape transport,
current-song labels with truncation and resource cleanup. Album artwork lives
in a separate cover view above the shared transport controls. No runtime files are loaded
from the excluded `模板` directory.
