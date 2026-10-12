import { useEffect, useMemo } from 'react';
import { ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DRACO_DECODER_PATH, MODEL_SIZE } from './viewerSettings.js';

// Loads a .glb, centres it on (0, 0, 0), scales it to MODEL_SIZE and puts a soft shadow under it.
function Model({ url, modelRef, onFit, onModelClick, shadowOpacity }) {
  const { scene: original } = useGLTF(url, DRACO_DECODER_PATH);

  // useGLTF caches one copy per URL; we work on a clone so moving/scaling it here never affects another viewer
  const scene = useMemo(() => cloneModel(original), [original]);

  // Measure the model once and work out how to centre and scale it
  const { scale, offset, floorY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) throw new Error('The model has no visible geometry');

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = MODEL_SIZE / Math.max(size.x, size.y, size.z);

    return {
      scale,
      offset: center.multiplyScalar(-scale).toArray(),
      floorY: (-size.y * scale) / 2,
    };
  }, [scene]);

  // Tell the viewer where the floor is (used to keep the camera above it)
  useEffect(() => {
    onFit?.(floorY);
  }, [floorY, onFit]);

  const handleClick = (event) => {
    if (event.delta > 2) return;
    event.stopPropagation();
    const local = event.eventObject.parent.worldToLocal(event.point.clone());
    onModelClick?.({
      position: local.toArray().map((n) => Number(n.toFixed(4))),
      worldPosition: event.point.toArray(),
    });
  };

  return (
    <>
      <group>
        <group position={offset} scale={scale}>
          <primitive ref={modelRef} object={scene} onClick={onModelClick ? handleClick : undefined} />
        </group>
      </group>

      <ContactShadows
        position={[0, floorY, 0]}
        scale={MODEL_SIZE * 2.5}
        far={MODEL_SIZE}
        blur={2.5}
        opacity={shadowOpacity}
        resolution={512}
        frames={1}
      />
    </>
  );
}

export default Model;
