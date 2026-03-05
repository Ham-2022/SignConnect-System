import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import { Camera } from "@mediapipe/camera_utils";
import { Hands } from "@mediapipe/hands";

import * as alphabets from "../Animations/alphabets";
import { defaultPose } from "../Animations/defaultPose";
import * as words from "../Animations/words";
import ybot from "../Models/ybot/ybot.glb";

function GestureToSign() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ref = useRef({}).current;

  const [detectedText, setDetectedText] = useState("");

  /* ---------- THREE.JS SETUP ---------- */
  useEffect(() => {
    ref.scene = new THREE.Scene();
    ref.scene.background = new THREE.Color(0xdddddd);

    ref.camera3D = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
    ref.camera3D.position.set(0, 1.4, 1.6);

    ref.renderer = new THREE.WebGLRenderer({ antialias: true });
    ref.renderer.setSize(500, 500);
    const avatarContainer = document.getElementById("avatar");
    avatarContainer.appendChild(ref.renderer.domElement);

    const light = new THREE.SpotLight(0xffffff, 2);
    light.position.set(0, 5, 5);
    ref.scene.add(light);

    ref.animations = [];
    ref.flag = false;

    const loader = new GLTFLoader();
    loader.load(ybot, (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
          if (child.name.toLowerCase().includes("joints")) {
            child.visible = false;
          }
        }
      });
      ref.avatar = gltf.scene;
      ref.scene.add(ref.avatar);
      defaultPose(ref);
    });

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (ref.animations.length && !ref.flag) {
        if (!ref.avatar) return;
        const anim = ref.animations[0];
        for (let i = 0; i < anim.length; ) {
          let [bone, action, axis, limit, sign] = anim[i];
          let obj = ref.avatar.getObjectByName(bone);
          if (!obj) {
            anim.splice(i, 1);
            continue;
          }
          if (sign === "+" && obj[action][axis] < limit) {
            obj[action][axis] += 0.1;
            i++;
          } else if (sign === "-" && obj[action][axis] > limit) {
            obj[action][axis] -= 0.1;
            i++;
          } else {
            anim.splice(i, 1);
          }
        }
        if (!anim.length) {
          ref.flag = true;
          setTimeout(() => {
            ref.flag = false;
            ref.animations.shift();
          }, 600);
        }
      }

      ref.renderer.render(ref.scene, ref.camera3D);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (avatarContainer && ref.renderer.domElement) {
        avatarContainer.removeChild(ref.renderer.domElement);
      }
    };
  }, []);

  /* ---------- MEDIAPIPE ---------- */
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();
  }, []);

  /* ---------- SIMPLE GESTURE LOGIC ---------- */
  const onResults = (results) => {
    if (!results.multiHandLandmarks) return;

    // DEMO logic – replace with ML later
    const gesture = "HELLO"; // Example detected word
    setDetectedText(gesture);

    if (words[gesture]) {
      words[gesture](ref);
    } else {
      for (let ch of gesture) {
        alphabets[ch](ref);
      }
    }
  };

  return (
    <div className="container">
      <h3>Detected Gesture: {detectedText}</h3>

      <video ref={videoRef} autoPlay playsInline style={{ width: 400 }} />
      <div id="avatar" />

    </div>
  );
}

export default GestureToSign;
