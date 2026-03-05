import React, { useEffect, useRef, useState } from 'react';

interface DeafStudentHubProps {
  isCameraOn: boolean;
  currentFocus: string;
  onGestureDetected?: (gesture: string) => void;
}

type Mode = 'alphabet' | 'phrase';

interface DictionaryItem {
  id: string;
  desc: string;
  icon: string;
}

const DeafStudentHub: React.FC<DeafStudentHubProps> = ({ 
  isCameraOn, 
  currentFocus, 
  onGestureDetected 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCounterRef = useRef<number>(0);
  const currentGestureRef = useRef<string | null>(null);
  const lastConfirmedTimeRef = useRef<number>(0);
  
  const [mode, setMode] = useState<Mode>('alphabet');
  const [detectedSign, setDetectedSign] = useState<string>('Ready');
  const [confidence, setConfidence] = useState<number>(0);
  const [sentence, setSentence] = useState<string>('');
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [isSigning, setIsSigning] = useState(false);
  const [manualText, setManualText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHandLandmarks, setShowHandLandmarks] = useState<boolean>(true);
  const [fingerStatus, setFingerStatus] = useState<string[]>(['', '', '', '', '']);

  // Configuration
  const config = {
    thresholds: {
      confidence: 6, // Reduced to 6 frames for faster response
    }
  };

  // Complete A-Z Alphabet Dictionary
  const dictionary: Record<Mode, DictionaryItem[]> = {
    alphabet: [
      { id: 'A', desc: "Fist with thumb on side", icon: "✊" },
      { id: 'B', desc: "Flat palm, fingers together", icon: "✋" },
      { id: 'C', desc: "Curved hand, C-shape", icon: "🫳" },
      { id: 'D', desc: "Index finger up", icon: "☝️" },
      { id: 'E', desc: "Fingers curled", icon: "✊" },
      { id: 'F', desc: "OK sign", icon: "👌" },
      { id: 'G', desc: "Index & thumb sideways", icon: "👈" },
      { id: 'H', desc: "Index & middle sideways", icon: "✌️" },
      { id: 'I', desc: "Pinky up only", icon: "🤙" },
      { id: 'J', desc: "Pinky up, draw J", icon: "🤙" },
      { id: 'K', desc: "Index up, middle out", icon: "✌️" },
      { id: 'L', desc: "L-shape", icon: "👆" },
      { id: 'M', desc: "Thumb under 3 fingers", icon: "✊" },
      { id: 'N', desc: "Thumb under 2 fingers", icon: "✊" },
      { id: 'O', desc: "Fingers form O", icon: "👌" },
      { id: 'P', desc: "K-shape down", icon: "👇" },
      { id: 'Q', desc: "G-shape down", icon: "👇" },
      { id: 'R', desc: "Index & middle crossed", icon: "🤞" },
      { id: 'S', desc: "Fist, thumb across", icon: "✊" },
      { id: 'T', desc: "Thumb between fingers", icon: "✊" },
      { id: 'U', desc: "Two fingers together", icon: "✌️" },
      { id: 'V', desc: "Victory sign", icon: "✌️" },
      { id: 'W', desc: "Three fingers up", icon: "🖐" },
      { id: 'X', desc: "Index bent hook", icon: "☝️" },
      { id: 'Y', desc: "Thumb + Pinky", icon: "🤙" },
      { id: 'Z', desc: "Draw Z in air", icon: "☝️" }
    ],
    phrase: [
      { id: 'Good Morning', desc: "Palm to forehead", icon: "🌅" },
      { id: 'Hello', desc: "Wave", icon: "👋" },
      { id: 'Thank You', desc: "Chin forward", icon: "🙏" },
      { id: 'Please', desc: "Circle on chest", icon: "🙏" },
      { id: 'Sorry', desc: "Fist on chest", icon: "😔" },
      { id: 'Yes', desc: "Thumbs up", icon: "👍" },
      { id: 'No', desc: "Thumbs down", icon: "👎" },
      { id: 'Okay', desc: "OK sign", icon: "👌" },
      { id: 'I Understand', desc: "Tap forehead", icon: "💡" },
      { id: 'I Don\'t Understand', desc: "Shake head", icon: "❓" },
      { id: 'May I Go Bathroom', desc: "T-sign shake", icon: "🚻" },
      { id: 'I Need Help', desc: "Hand up", icon: "🆘" },
      { id: 'Repeat Please', desc: "Rotate hands", icon: "🔄" },
      { id: 'I Have Question', desc: "Question mark", icon: "❓" },
      { id: 'I Finished', desc: "Hands flip up", icon: "✅" },
      { id: 'Wait', desc: "Wiggle fingers", icon: "✋" },
      { id: 'Stop', desc: "Palm out", icon: "🛑" },
      { id: 'Teacher', desc: "Touch forehead", icon: "👨‍🏫" },
      { id: 'Student', desc: "Flat on forehead", icon: "👨‍🎓" },
      { id: 'Book', desc: "Open palms", icon: "📖" }
    ]
  };

  // Speech synthesis
  const speak = (text: string) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Distance helper
  const dist = (p1: any, p2: any): number => {
    if (!p1 || !p2) return 100;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  };

  // Angle calculation
  const getAngle = (p1: any, p2: any, p3: any): number => {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  // Enhanced finger status detection
  const getFingerStatus = (landmarks: any[]): number[] => {
    const status: number[] = [];
    
    // Thumb: Check if extended using angle and distance
    const thumbAngle = getAngle(landmarks[1], landmarks[2], landmarks[4]);
    const thumbDist = dist(landmarks[4], landmarks[9]); // Tip to middle finger base
    status.push(thumbAngle > 50 && thumbDist > 0.1 ? 1 : 0);

    // Index, Middle, Ring, Pinky: Compare tip to PIP joint
    const fingers = [
      { tip: 8, pip: 6, mcp: 5 },   // Index
      { tip: 12, pip: 10, mcp: 9 }, // Middle
      { tip: 16, pip: 14, mcp: 13 },// Ring
      { tip: 20, pip: 18, mcp: 17 } // Pinky
    ];
    
    fingers.forEach(finger => {
      const tip = landmarks[finger.tip];
      const pip = landmarks[finger.pip];
      const mcp = landmarks[finger.mcp];
      const wrist = landmarks[0];
      
      // Calculate if finger is extended
      const tipToPip = dist(tip, pip);
      const pipToMcp = dist(pip, mcp);
      const tipToWrist = dist(tip, wrist);
      const pipToWrist = dist(pip, wrist);
      
      // Finger is extended if tip is farther from wrist than pip
      const isExtended = tipToWrist > pipToWrist * 1.05;
      status.push(isExtended ? 1 : 0);
    });
    
    return status;
  };

  // Enhanced sign detection with improved accuracy
  const detectSign = (status: number[], landmarks: any[]): string | null => {
    const s = status.join('');
    const [thumb, index, middle, ring, pinky] = status;
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const indexPip = landmarks[6];
    const middlePip = landmarks[10];
    const wrist = landmarks[0];

    // Update finger status display
    const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    setFingerStatus(status.map((s, i) => `${fingerNames[i]}: ${s ? 'Open' : 'Closed'}`));

    // Phrase Mode
    if (mode === 'phrase') {
      // Yes - Thumbs up
      if (thumb && !index && !middle && !ring && !pinky && thumbTip.y < indexTip.y) {
        return 'Yes';
      }
      
      // No - Thumbs down or fist
      if (thumb && !index && !middle && !ring && !pinky && thumbTip.y > indexTip.y) {
        return 'No';
      }
      
      // Hello - All fingers up
      if (thumb && index && middle && ring && pinky) {
        return 'Hello';
      }
      
      // OK - Thumb and index touching
      const thumbIndexDist = dist(thumbTip, indexTip);
      if (thumbIndexDist < 0.04 && middle && ring && pinky) {
        return 'Okay';
      }
      
      // Help - Flat hand up
      if (!thumb && index && middle && ring && pinky) {
        return 'I Need Help';
      }
      
      // Question - Index up only
      if (!thumb && index && !middle && !ring && !pinky) {
        return 'I Have Question';
      }
      
      // Wait - All fingers up, palm forward
      if (index && middle && ring && pinky) {
        return 'Wait';
      }
      
      // Stop - Palm facing forward
      if (!thumb && index && middle && ring && pinky && indexTip.y < 0.4) {
        return 'Stop';
      }
      
      return null;
    }

    // ===== ALPHABET MODE - Enhanced Detection =====
    
    // A - Closed fist with thumb on side
    if (!index && !middle && !ring && !pinky) {
      return 'A';
    }
    
    // B - Flat palm, all fingers together
    if (!thumb && index && middle && ring && pinky) {
      const fingersTogether = dist(indexTip, middleTip) < 0.03 && 
                             dist(middleTip, ringTip) < 0.03;
      if (fingersTogether) return 'B';
    }
    
    // C - Curved hand (all fingers slightly bent)
    if (thumb && index && middle && ring && pinky) {
      const curvature = Math.abs(indexTip.x - thumbTip.x);
      if (curvature > 0.08 && curvature < 0.15) return 'C';
    }
    
    // D - Index up, others closed forming O with thumb
    if (!thumb && index && !middle && !ring && !pinky) {
      const thumbIndexDist = dist(thumbTip, landmarks[6]); // thumb to index base
      if (thumbIndexDist < 0.06) return 'D';
    }
    
    // E - All fingers bent down, touching thumb
    if (!index && !middle && !ring && !pinky) {
      const touchingThumb = dist(thumbTip, indexTip) < 0.05;
      if (touchingThumb) return 'E';
    }
    
    // F - OK sign (thumb and index circle, others up)
    const thumbIndexCircle = dist(thumbTip, indexTip);
    if (thumbIndexCircle < 0.04 && middle && ring && pinky) {
      return 'F';
    }
    
    // G - Index and thumb extended horizontally
    if (thumb && index && !middle && !ring && !pinky) {
      const horizontal = Math.abs(thumbTip.y - indexTip.y) < 0.05;
      if (horizontal) return 'G';
    }
    
    // H - Index and middle extended together horizontally
    if (!thumb && index && middle && !ring && !pinky) {
      const together = dist(indexTip, middleTip) < 0.03;
      const horizontal = Math.abs(indexTip.y - middleTip.y) < 0.04;
      if (together && horizontal) return 'H';
    }
    
    // I - Pinky up only
    if (!thumb && !index && !middle && !ring && pinky) {
      return 'I';
    }
    
    // J - Same as I (motion-based in reality)
    if (!thumb && !index && !middle && !ring && pinky && pinkyTip.y < 0.4) {
      return 'J';
    }
    
    // K - Index up, middle out at angle, thumb touching
    if (thumb && index && middle && !ring && !pinky) {
      const spread = dist(indexTip, middleTip) > 0.06;
      if (spread) return 'K';
    }
    
    // L - Thumb and index forming L (90 degrees)
    if (thumb && index && !middle && !ring && !pinky) {
      const angle = getAngle(thumbTip, wrist, indexTip);
      if (angle > 70 && angle < 110) return 'L';
    }
    
    // M - Thumb under first 3 fingers
    if (!thumb && !index && !middle && !ring && pinky) {
      return 'M';
    }
    
    // N - Thumb under first 2 fingers
    if (!thumb && !index && !middle && ring && pinky) {
      return 'N';
    }
    
    // O - All fingers forming circle
    if (thumb && index && middle && ring && pinky) {
      const circleSize = dist(thumbTip, indexTip);
      if (circleSize < 0.06) return 'O';
    }
    
    // P - K pointing down
    if (thumb && index && middle && !ring && !pinky) {
      if (indexTip.y > indexPip.y) return 'P';
    }
    
    // Q - G pointing down
    if (thumb && index && !middle && !ring && !pinky) {
      if (indexTip.y > 0.6) return 'Q';
    }
    
    // R - Index and middle crossed
    if (!thumb && index && middle && !ring && !pinky) {
      const crossing = dist(indexTip, middlePip) < 0.04;
      if (crossing) return 'R';
    }
    
    // S - Fist with thumb across front
    if (thumb && !index && !middle && !ring && !pinky) {
      const thumbAcross = thumbTip.x > landmarks[5].x;
      if (thumbAcross) return 'S';
    }
    
    // T - Thumb between index and middle
    if (thumb && !index && middle && !ring && !pinky) {
      return 'T';
    }
    
    // U - Index and middle up together
    if (!thumb && index && middle && !ring && !pinky) {
      const together = dist(indexTip, middleTip) < 0.04;
      if (together) return 'U';
    }
    
    // V - Index and middle spread (victory)
    if (!thumb && index && middle && !ring && !pinky) {
      const spread = dist(indexTip, middleTip) > 0.06;
      if (spread) return 'V';
    }
    
    // W - Three fingers up spread
    if (!thumb && index && middle && ring && !pinky) {
      return 'W';
    }
    
    // X - Index bent in hook
    if (!thumb && index && !middle && !ring && !pinky) {
      const hooked = dist(indexTip, indexPip) < 0.06;
      if (hooked) return 'X';
    }
    
    // Y - Thumb and pinky extended
    if (thumb && !index && !middle && !ring && pinky) {
      return 'Y';
    }
    
    // Z - Index pointing (motion-based in reality)
    if (!thumb && index && !middle && !ring && !pinky && indexTip.y < 0.3) {
      return 'Z';
    }

    return null;
  };

  // Handle prediction logic
  const handlePrediction = (sign: string | null) => {
    if (!sign) {
      frameCounterRef.current = 0;
      setConfidence(0);
      setIsSigning(false);
      if (!isSigning) setDetectedSign('Ready');
      return;
    }

    setIsSigning(true);

    if (sign === currentGestureRef.current) {
      frameCounterRef.current++;
      const progress = Math.min((frameCounterRef.current / config.thresholds.confidence) * 100, 100);
      setConfidence(progress);

      if (frameCounterRef.current === config.thresholds.confidence) {
        confirmGesture(sign);
      }
    } else {
      currentGestureRef.current = sign;
      frameCounterRef.current = 0;
      setDetectedSign(sign);
    }
  };

  // Confirm gesture
  const confirmGesture = (sign: string) => {
    const now = Date.now();
    if (now - lastConfirmedTimeRef.current < 800) return; // Reduced cooldown
    
    lastConfirmedTimeRef.current = now;

    if (mode === 'alphabet') {
      setSentence(prev => prev + sign);
    } else {
      setSentence(prev => prev ? prev + " • " + sign : sign);
      speak(sign);
    }

    if (onGestureDetected) {
      onGestureDetected(sign);
    }

    // Flash effect
    setConfidence(100);
    setTimeout(() => setConfidence(0), 300);
  };

  // UI Actions
  const addSpace = () => setSentence(prev => prev + " ");
  const backspace = () => setSentence(prev => prev.slice(0, -1));
  const clearSentence = () => setSentence("");
  const speakFullSentence = () => {
    if (sentence) speak(sentence.replace(/•/g, ','));
  };

  const handleManualSpeak = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualText.trim()) {
      speak(manualText);
      if (onGestureDetected) onGestureDetected(manualText);
      setManualText('');
    }
  };

  // MediaPipe initialization
  useEffect(() => {
    let camera: any = null;
    
    if (isCameraOn && videoRef.current && canvasRef.current) {
      const hands = new (window as any).Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      hands.onResults((results: any) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          
          // Draw hand landmarks if enabled
          if (showHandLandmarks) {
            (window as any).drawConnectors(ctx, landmarks, (window as any).HAND_CONNECTIONS, 
              {color: '#f97316', lineWidth: 5});
            (window as any).drawLandmarks(ctx, landmarks, 
              {color: '#ffffff', lineWidth: 2, radius: 5, fillColor: '#f97316'});
          }

          // Process gesture
          const status = getFingerStatus(landmarks);
          const sign = detectSign(status, landmarks);
          handlePrediction(sign);
        } else {
          handlePrediction(null);
        }

        ctx.restore();
      });

      camera = new (window as any).Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) await hands.send({image: videoRef.current});
        },
        width: 640,
        height: 480
      });

      camera.start();
    }

    return () => {
      if (camera) camera.stop();
    };
  }, [isCameraOn, mode, showHandLandmarks]);

  // Filter dictionary based on search
  const filteredDictionary = dictionary[mode].filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Main ISL Section */}
      <section className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-3 h-8 bg-orange-500 rounded-full"></div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">ISL Local Hub</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHandLandmarks(!showHandLandmarks)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                showHandLandmarks
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
            </button>
            <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black border border-orange-200 tracking-widest uppercase">
              Privacy Mode
            </span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-gray-50 rounded-2xl p-1.5 gap-2 border border-gray-200">
            <button
              onClick={() => setMode('alphabet')}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                mode === 'alphabet'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 A-Z Alphabet
            </button>
            <button
              onClick={() => setMode('phrase')}
              className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
                mode === 'phrase'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💬 Phrases
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-4 border-gray-100">
              {isCameraOn ? (
                <>
                  <video ref={videoRef} className="hidden" />
                  <canvas 
                    ref={canvasRef} 
                    className="w-full h-full video-mirror object-cover" 
                    width={640} 
                    height={480} 
                  />
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center space-x-2 bg-black/70 backdrop-blur px-4 py-2 rounded-full border border-white/30">
                      <div className={`w-3 h-3 rounded-full ${isSigning ? 'bg-orange-500 animate-ping' : 'bg-gray-400'}`}></div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {isSigning ? 'Detecting' : 'Ready'}
                      </span>
                    </div>
                  </div>

                  {/* Finger Debug Info */}
                  {showHandLandmarks && (
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-black/70 backdrop-blur p-3 rounded-xl border border-white/30">
                        <div className="text-[9px] font-black text-orange-400 uppercase mb-1">Finger Status</div>
                        {fingerStatus.map((status, idx) => (
                          <div key={idx} className="text-[10px] text-white font-mono">{status}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                  <i className="fa-solid fa-camera-slash text-6xl opacity-20"></i>
                  <p className="text-sm font-black uppercase tracking-wider opacity-40">
                    Turn Camera On
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Detection Display */}
          <div className="space-y-4">
            {/* Detected Sign Card */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
              <div className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2">
                Detected Sign
              </div>
              <div className="text-6xl font-black text-gray-900 mb-3 text-center">
                {detectedSign}
              </div>
              <div className="text-xs font-bold text-gray-600 text-center mb-3">
                {mode === 'alphabet' ? 'Letter' : 'Phrase'}
              </div>
              <div className="h-3 bg-white rounded-full overflow-hidden border-2 border-orange-200">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-200 rounded-full"
                  style={{ width: `${confidence}%` }}
                ></div>
              </div>
              <div className="text-xs font-black text-orange-700 text-center mt-2">
                {confidence > 0 ? `${Math.round(confidence)}% Confirmed` : 'Hold steady...'}
              </div>
            </div>

            {/* Quick Guide */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
              <div className="text-xs font-black text-blue-900 uppercase tracking-wide mb-3">
                💡 Quick Tips
              </div>
              <ul className="space-y-2 text-xs text-blue-800">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Hold sign for 1 second</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Center hand in frame</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Good lighting needed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Check tracking overlay</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sentence Builder Section */}
        <div className="mt-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-black text-gray-600 uppercase tracking-widest">
              📝 Your Message
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={addSpace}
                className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-black px-4 py-2 rounded-xl transition-all uppercase border-2 border-gray-300 shadow-sm"
              >
                Space
              </button>
              <button
                onClick={backspace}
                className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-black px-4 py-2 rounded-xl transition-all uppercase border-2 border-gray-300 shadow-sm"
              >
                ⌫ Back
              </button>
              <button
                onClick={clearSentence}
                className="bg-white hover:bg-gray-100 text-gray-700 text-xs font-black px-4 py-2 rounded-xl transition-all uppercase border-2 border-gray-300 shadow-sm"
              >
                Clear
              </button>
              <button
                onClick={speakFullSentence}
                disabled={!sentence}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black px-6 py-2 rounded-xl transition-all uppercase shadow-lg flex items-center space-x-2"
              >
                <i className="fa-solid fa-volume-high"></i>
                <span>Speak All</span>
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 min-h-[80px] flex items-center border-2 border-gray-300 shadow-inner">
            <p className="text-3xl font-bold text-gray-900 break-all flex-1">
              {sentence || 'Start signing to build your message...'}
            </p>
            {sentence && <span className="animate-pulse w-1 h-8 bg-orange-500 ml-3 inline-block rounded"></span>}
          </div>
        </div>

        {/* Dictionary Guide */}
        <div className="mt-6 bg-white rounded-2xl p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wide">
              📚 {mode === 'alphabet' ? 'Alphabet Guide (A-Z)' : 'Phrase Guide'}
            </h4>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto">
            {filteredDictionary.map((item) => (
              <div 
                key={item.id} 
                className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all group cursor-pointer"
                onClick={() => {
                  if (mode === 'alphabet') {
                    setSentence(prev => prev + item.id);
                  } else {
                    speak(item.id);
                    setSentence(prev => prev ? prev + " • " + item.id : item.id);
                  }
                }}
              >
                <div className="text-2xl mb-1 text-center group-hover:scale-110 transition-transform">{item.icon}</div>
                <div className="text-xs font-black text-gray-900 text-center mb-1">{item.id}</div>
                <div className="text-[8px] text-gray-500 font-bold text-center leading-tight">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Type to Speak Section */}
      <section className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
            <i className="fa-solid fa-keyboard text-white text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Type to Speak</h3>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Alternative Method
            </p>
          </div>
        </div>

        <form onSubmit={handleManualSpeak} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={!manualText.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-black uppercase tracking-wider px-8 py-4 rounded-2xl transition-all shadow-lg flex items-center space-x-2"
            >
              <i className="fa-solid fa-volume-high"></i>
              <span>Speak</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['I need help', 'Repeat please', 'I understand', 'May I go bathroom', 'I have question', 'Thank you'].map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => {
                  speak(phrase);
                  if (onGestureDetected) onGestureDetected(phrase);
                }}
                className="bg-gray-50 hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300 rounded-xl px-4 py-3 text-xs font-black uppercase text-gray-600 hover:text-orange-600 transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>
        </form>
      </section>
    </div>
  );
};

export default DeafStudentHub;