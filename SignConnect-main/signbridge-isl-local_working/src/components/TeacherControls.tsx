import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import '../App.css';

import xbot from '../assets/Models/xbot/xbot.glb';
import xbotPic from '../assets/Models/xbot/xbot.png';
import ybot from '../assets/Models/ybot/ybot.glb';
import ybotPic from '../assets/Models/ybot/ybot.png';

import * as alphabets from '../Animations/alphabets';
import { defaultPose } from '../Animations/defaultPose';
import * as words from '../Animations/words';

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface TeacherControlsProps {
  isListening: boolean;
  onSpeechDetected: (text: string) => void;
}

function Convert({ isListening, onSpeechDetected }: TeacherControlsProps) {

  const [text, setText] = useState("");
  const [bot, setBot] = useState(ybot);
  const [speed, setSpeed] = useState(0.1);
  const [pause, setPause] = useState(800);

  const componentRef = useRef<any>({});
  const { current: ref } = componentRef;

  const textFromAudio = useRef<HTMLTextAreaElement>(null);
  const textFromInput = useRef<HTMLTextAreaElement>(null);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (isListening) {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    } else {
      SpeechRecognition.stopListening();
    }
  }, [isListening, resetTranscript]);

  /* ================= THREE SETUP ================= */

  useEffect(() => {

    ref.flag = false;
    ref.pending = false;

    ref.animations = [];
    ref.characters = [];

    ref.scene = new THREE.Scene();
    ref.scene.background = new THREE.Color(0xdddddd);
// 🌞 Ambient Light (fills shadows)
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
ref.scene.add(ambientLight);

// 💡 Main Directional Light (front light)
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(0, 3, 5);
ref.scene.add(dirLight);

// 💡 Back Light (removes dark edges)
const backLight = new THREE.DirectionalLight(0xffffff, 1.5);
backLight.position.set(0, 2, -5);
ref.scene.add(backLight);
    ref.renderer = new THREE.WebGLRenderer({ antialias: true });

    ref.camera = new THREE.PerspectiveCamera(
        30,
        window.innerWidth * 0.57 / (window.innerHeight - 70),
        0.1,
        1000
    )
    ref.renderer.setSize(window.innerWidth * 0.57, window.innerHeight - 70);

    document.getElementById("canvas").innerHTML = "";
    document.getElementById("canvas").appendChild(ref.renderer.domElement);

    ref.camera.position.z = 1.5;
    ref.camera.position.y = 1.4;

    let loader = new GLTFLoader();
    loader.load(
      bot,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if ( child.type === 'SkinnedMesh' ) {
            child.frustumCulled = false;
          }
    });
        ref.avatar = gltf.scene;
        ref.scene.add(ref.avatar);
        defaultPose(ref);
      },
      (xhr) => {
        console.log(xhr);
      }
    );

  }, [ref, bot]);


  /* ================= ANIMATION ENGINE ================= */

  ref.animate = () => {
    if(ref.animations.length === 0){
        ref.pending = false;
      return ;
    }
    requestAnimationFrame(ref.animate);
    if(ref.animations[0].length){
        if(!ref.flag) {
          if(ref.animations[0][0]==='add-text'){
            setText(text + ref.animations[0][1]);
            ref.animations.shift();
          }
          else{
            for(let i=0;i<ref.animations[0].length;){
              let [boneName, action, axis, limit, sign] = ref.animations[0][i]
              if(sign === "+" && ref.avatar.getObjectByName(boneName)[action][axis] < limit){
                  ref.avatar.getObjectByName(boneName)[action][axis] += speed;
                  ref.avatar.getObjectByName(boneName)[action][axis] = Math.min(ref.avatar.getObjectByName(boneName)[action][axis], limit);
                  i++;
              }
              else if(sign === "-" && ref.avatar.getObjectByName(boneName)[action][axis] > limit){
                  ref.avatar.getObjectByName(boneName)[action][axis] -= speed;
                  ref.avatar.getObjectByName(boneName)[action][axis] = Math.max(ref.avatar.getObjectByName(boneName)[action][axis], limit);
                  i++;
              }
              else{
                  ref.animations[0].splice(i, 1);
              }
            }
          }
        }
    }
    else {
      ref.flag = true;
      setTimeout(() => {
        ref.flag = false
      }, pause);
      ref.animations.shift();
    }
    ref.renderer.render(ref.scene, ref.camera);
  }

  /* ================= SIGN FUNCTION ================= */

  const sign = useCallback((inputRef, isFromSpeech = false) => {
    if (inputRef.current) {
      const textToProcess = inputRef.current.value;
      if (!textToProcess.trim()) {
        return;
      }

      // Report text to parent for transcript log
      onSpeechDetected(textToProcess);

      // Animate the text
      var str = textToProcess.toUpperCase();
      var strWords = str.split(' ');
      setText('')

      for(let word of strWords){
        if(words[word]){
          ref.animations.push(['add-text', word+' ']);
          words[word](ref);
          
        }
        else{
          for(const [index, ch] of word.split('').entries()){
            if(index === word.length-1)
              ref.animations.push(['add-text', ch+' ']);
            else 
              ref.animations.push(['add-text', ch]);
            alphabets[ch](ref);
            
          }
        }
      }

      // Clear the inputs after processing
      if (isFromSpeech) {
        resetTranscript();
      } else {
        if (textFromInput.current) textFromInput.current.value = '';
      }
    }
    // `ref` is a stable ref object, so it's not needed in the dependency array.
  }, [onSpeechDetected, resetTranscript]);

  // This effect will automatically process the speech when the user stops talking.
  const wasListening = useRef(listening);
  useEffect(() => {
    if (wasListening.current && !listening && transcript) {
      sign(textFromAudio, true);
    }
    wasListening.current = listening;
  }, [listening, transcript, sign]);

  /* ================= UI ================= */

  return (
    <div className='container-fluid py-4'>
      <div className='row'>
        <div className='col-md-3'>

          <label>Processed Text</label>
          <textarea rows={3} value={text} className='w-100' readOnly />

          <label>Speech Recognition: {listening ? 'On' : 'Off'}</label>

          <div className='d-flex justify-content-between mb-2'>
            <button className="btn btn-secondary w-100" onClick={resetTranscript}>
              Clear
            </button>
          </div>

          <textarea rows={3} ref={textFromAudio} value={transcript} className='w-100' readOnly placeholder="Speech will appear here..." />

          {/* The "Start Animations" button for speech is removed as it's now automatic */}

          <label>Text Input</label>
          <textarea rows={3} ref={textFromInput} className='w-100' />

          <button onClick={() => sign(textFromInput, false)} className='btn btn-primary w-100'>
            Start Animations
          </button>

        </div>

        <div className='col-md-7'>
          <div id='canvas' />
        </div>

        <div className='col-md-2'>
<div
  style={{
    position: 'fixed',
    top: '15px',
    right: '15px',
    width: '160px',
    zIndex: 1000
  }}
>
  <div className="card shadow-sm p-2">

    <p className="fw-bold small mb-2 text-center">Avatar</p>

    <img
      src={xbotPic}
      style={{ width: '70px', cursor: "pointer" }}
      className="d-block mx-auto mb-2"
      onClick={() => setBot(xbot)}
    />

    <img
      src={ybotPic}
      style={{ width: '70px', cursor: "pointer" }}
      className="d-block mx-auto mb-2"
      onClick={() => setBot(ybot)}
    />

    <p className="small mb-1 text-center">
      Speed: {speed.toFixed(2)}
    </p>

    <input
      type="range"
      min="0.05"
      max="0.5"
      step="0.01"
      value={speed}
      onChange={(e) => setSpeed(parseFloat(e.target.value))}
      className="form-range mb-2"
      style={{ height: "4px" }}
    />

    <p className="small mb-1 text-center">
      Pause: {pause}
    </p>

    <input
      type="range"
      min="0"
      max="2000"
      step="100"
      value={pause}
      onChange={(e) => setPause(parseInt(e.target.value))}
      className="form-range"
      style={{ height: "4px" }}
    />

  </div>
</div></div>
      </div>
    </div>
  );
}

export default Convert;

//brght tc