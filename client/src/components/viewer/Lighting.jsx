import { Environment, Lightformer } from '@react-three/drei';
import { LIGHTING_PRESETS } from './lightingPresets.js';

// Renders the lights of one preset (see lightingPresets.js for what each light does)
function Lighting({ preset }) {
  const { background, ambient, keyLight, environmentIntensity, formers } = LIGHTING_PRESETS[preset];

  return (
    <>
      {/* Colour behind the model */}
      <color attach="background" args={[background]} />

      <ambientLight color={ambient.color} intensity={ambient.intensity} />
      <directionalLight color={keyLight.color} intensity={keyLight.intensity} position={keyLight.position} />

      {/* The environment map is drawn once from these panels. `key` forces a redraw when the
          preset changes; otherwise the old reflections would stay. */}
      <Environment key={preset} resolution={256} environmentIntensity={environmentIntensity}>
        {formers.map((former, index) => (
          <Lightformer key={index} form="rect" {...former} />
        ))}
      </Environment>
    </>
  );
}

export default Lighting;
