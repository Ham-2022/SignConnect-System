import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import * as alphabets from '../Animations/alphabets';
import { defaultPose } from '../Animations/defaultPose';
import * as words from '../Animations/words';

const MODEL_URL = '/models/ybot/ybot.glb';

interface UseTextToSignReturn {
  signFromString: (text: string) => void;
  isSigning: boolean;
  currentSign: string;
}

export function useTextToSign(): UseTextToSignReturn {
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const avatarEngine = useRef<any>({});
  const [isSigning, setIsSigning] = useState(false);
  const [currentSign, setCurrentSign] = useState('');
  const isInitialized = useRef(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const ref = avatarEngine.current;
    ref.animations = [];
    ref.flag = false;

    ref.scene = new THREE.Scene();
    ref.scene.background = new THREE.Color(0xffffff);

    ref.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
    ref.camera.position.set(0, 1.4, 1.6);

    ref.renderer = new THREE.WebGLRenderer({ antialias: true });
    ref.renderer.setSize(500, 400);
    
    // Find the container or create one
    let container = document.getElementById('text-to-sign-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'text-to-sign-container';
      container.style.width = '500px';
      container.style.height = '400px';
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    container.appendChild(ref.renderer.domElement);

    ref.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 3);
    ref.scene.add(light);

    new GLTFLoader().load(MODEL_URL, (gltf) => {
      ref.avatar = gltf.scene;
      ref.avatar.scale.set(1.2, 1.2, 1.2);
      ref.avatar.rotation.y = Math.PI;
      ref.scene.add(ref.avatar);

      ref.avatar.traverse((obj: any) => {
        if (obj.isBone && defaultPose[obj.name]) {
          obj.rotation.set(
            defaultPose[obj.name].x,
            defaultPose[obj.name].y,
            defaultPose[obj.name].z
          );
        }
      });
    });

    const animate = () => {
      requestAnimationFrame(animate);

      if (ref.animations.length && !ref.flag && ref.avatar) {
        const step = ref.animations[0];

        for (let i = 0; i < step.length; ) {
          const [b, a, ax, lim, s] = step[i];
          const o = ref.avatar?.getObjectByName(b);

          if (!o) {
            step.splice(i, 1);
            continue;
          }

          if (s === '+' && o[a][ax] < lim) o[a][ax] += 0.1;
          else if (s === '-' && o[a][ax] > lim) o[a][ax] -= 0.1;
          else step.splice(i, 1);
        }

        if (!step.length) {
          ref.flag = true;
          setTimeout(() => {
            ref.flag = false;
            ref.animations.shift();
            if (ref.animations.length === 0) {
              setIsSigning(false);
            }
          }, 500);
        }
      }

      ref.renderer.render(ref.scene, ref.camera);
    };

    animate();

    return () => {
      ref.renderer.dispose();
      const container = document.getElementById('text-to-sign-container');
      if (container) {
        container.removeChild(ref.renderer.domElement);
      }
    };
  }, []);

  // Text to sign conversion function
  const signFromString = useCallback((text: string) => {
    const ref = avatarEngine.current;
    if (!ref || !ref.avatar) {
      console.warn('Avatar not loaded yet');
      return;
    }

    const cleanText = text.toUpperCase().trim().replace(/ISL: /g, '');
    if (!cleanText) return;

    setCurrentSign(cleanText);
    setIsSigning(true);

    ref.animations.length = 0;
    ref.flag = false;

    const strWords = cleanText.split(' ');
    
    for (const word of strWords) {
      // First try to find a word animation
      if ((words as any)[word]) {
        (words as any)[word](ref);
      } else {
        // Fall back to individual letters
        for (const ch of word) {
          if ((alphabets as any)[ch]) {
            (alphabets as any)[ch](ref);
          }
        }
      }
    }
  }, []);

  return {
    signFromString,
    isSigning,
    currentSign
  };
}

export default useTextToSign;
