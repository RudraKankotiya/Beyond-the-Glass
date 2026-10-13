// Lighting preset for the 3D viewer.
// Positions are in viewer units (model normalised to 2 units, centered at 0,0,0).

export const LIGHTING_PRESETS = {
  studio: {
    label: 'Studio',
    background: '#ebe6dd',
    ambient: { color: '#ffffff', intensity: 0.4 },
    keyLight: { color: '#ffffff', intensity: 1.6, position: [3, 5, 4] },
    environmentIntensity: 1,
    shadowOpacity: 0.55,
    formers: [
      { color: '#ffffff', intensity: 3, position: [0, 5, 0], scale: [8, 8, 1] },
      { color: '#ffffff', intensity: 1.5, position: [-5, 1, 2], scale: [3, 6, 1] },
      { color: '#ffffff', intensity: 1.5, position: [5, 1, -2], scale: [3, 6, 1] },
    ],
  },
};

export const DEFAULT_LIGHTING = 'studio';
