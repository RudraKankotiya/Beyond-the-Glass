import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_ZOOM_DISTANCE, MIN_ZOOM_DISTANCE } from './viewerSettings.js';

const FILL = 0.85; // the model fills 85% of the view's width or height, whichever runs out first

const vertex = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();

// Works out how far from the centre the camera must be, looking from `direction`, so that every
// vertex (corner point) of the model is inside the view.
function distanceToFit(model, camera, direction, aspect) {
  camera.position.copy(direction);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
  cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);

  const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * FILL;
  const tanHorizontal = tanVertical * aspect;

  let distance = 0;
  model.updateWorldMatrix(true, true);
  model.traverse((object) => {
    if (!object.isMesh) return;
    const positions = object.geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      const toward = vertex.dot(direction);
      distance = Math.max(
        distance,
        toward + Math.abs(vertex.dot(cameraRight)) / tanHorizontal,
        toward + Math.abs(vertex.dot(cameraUp)) / tanVertical
      );
    }
  });
  return distance;
}

// Places the camera so the whole model is in view, looking from `direction`.
function FitCamera({ modelRef, direction }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const { width, height } = useThree((state) => state.size);
  const hasSize = width > 0 && height > 0;

  useEffect(() => {
    if (!modelRef.current || !hasSize) return;

    const viewDirection = new THREE.Vector3(...direction).normalize();
    const distance = THREE.MathUtils.clamp(
      distanceToFit(modelRef.current, camera, viewDirection, width / height),
      MIN_ZOOM_DISTANCE,
      MAX_ZOOM_DISTANCE
    );

    camera.position.copy(viewDirection).multiplyScalar(distance);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
      controls.saveState();
    } else {
      camera.lookAt(0, 0, 0);
    }
  }, [controls, hasSize, direction]);

  return null;
}

export default FitCamera;
