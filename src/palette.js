// ── Landseed brand palette — the logo's colours, defined ONCE ───────────────
// Every per-file semantic map references these instead of restating the hex, so
// a brand-colour change is a single edit:
//   · src/main.js   DEVICES[].hue    — the device colours (source of truth for
//                                       which brand colour each product wears)
//   · demo/demo.js  HUES             — the film's signal colours
//   · ai/map3d.js   DEVLAYERS[].hue  — the 3D map's device tokens
//   · ai/ai.js      CLASS_HUE        — human/vehicle detection classes
// HEX = CSS / canvas strings · NUM = Three.js material colours.
// check-facts.mjs asserts DEVICES and DEVLAYERS reference the same token, so a
// mismatch can't ship. Naturalistic species colours (buffalo, hippo, …) are not
// brand and stay as literals where they're used.
export const HEX = {
  green: '#00FF64',    // Monitor · to see · park protection
  gold: '#FFC800',     // VillageGuard · coexistence
  cyan: '#32C8FF',     // Relay Station · to connect
  orange: '#FF8C42',   // Survey Unit · biodiversity
  magenta: '#E682E6',  // Listener · to listen (acoustic)
  blue: '#1482FF',     // Mobile · to report
  purple: '#9B6CE0',   // Landseed AI · the brain
};
export const NUM = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, parseInt(v.slice(1), 16)]));
