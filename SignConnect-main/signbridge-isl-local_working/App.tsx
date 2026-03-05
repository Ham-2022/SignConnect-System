
import React, { useCallback, useState } from 'react';
import DeafStudentHub from './src/components/DeafStudentHub';
import Header from './src/components/Header';
import LessonTranscript from './src/components/LessonTranscript';
import TeacherControls from './src/components/TeacherControls';
import { AppMode, TranscriptionItem } from './types';

// Import animation functions for text-to-sign conversion

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.STUDENT);
  const [isTeacherMicOn, setIsTeacherMicOn] = useState(false);
  const [isStudentCameraOn, setIsStudentCameraOn] = useState(false);
  const [currentFocus, setCurrentFocus] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptionItem[]>([]);
  const [teacherAvatarText, setTeacherAvatarText] = useState('');
  const [triggerTeacherSign, setTriggerTeacherSign] = useState(false);

  const ISL_LOCAL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const ISL_CORE_WORDS = ['HELLO', 'NAMASTE', 'YOU', 'THANKS', 'YES', 'NO', 'GOOD', 'BAD', 'SCHOOL', 'TEACHER', 'STUDENT'];

  const addTranscript = useCallback((role: 'teacher' | 'student', text: string) => {
    setTranscripts(prev => [
      {
        id: Math.random().toString(36).substr(2, 9),
        role,
        text,
        timestamp: Date.now(),
      },
      ...prev
    ].slice(0, 50));

      if (role === 'teacher') {
        const words = text.toUpperCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").split(' ');
        const focusWord = words.find(w => [...ISL_LOCAL_ALPHABET, ...ISL_CORE_WORDS].includes(w)) || words[words.length-1];
        setCurrentFocus(focusWord);
        
        // Trigger avatar animation for teacher speech
        setTeacherAvatarText(focusWord);
        setTriggerTeacherSign(true);
        setTimeout(() => setTriggerTeacherSign(false), 100);
      } else {
        const cleanText = text.replace('ISL: ', '').trim();
        setCurrentFocus(cleanText);
      }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Header 
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        isTeacherMicOn={isTeacherMicOn} 
        setIsTeacherMicOn={setIsTeacherMicOn}
        isStudentCameraOn={isStudentCameraOn}
        setIsStudentCameraOn={setIsStudentCameraOn}
      />
      
      <main className="flex-1 container mx-auto px-4 md:px-8 py-6 grid grid-cols-12 gap-6 lg:gap-10 max-w-[1800px]">
        {/* Main Workspace */}
        <div className="col-span-12 lg:col-span-8 space-y-8 flex flex-col">
          
          {activeMode === AppMode.STUDENT ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                  <span className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mr-4 shadow-lg shadow-orange-200">
                    <i className="fa-solid fa-ear-deaf text-white text-xl"></i>
                  </span>
                  DHH Student Station
                </h2>
                <p className="text-slate-500 font-medium mt-2 ml-16">Interpret teacher's speech and communicate via sign or text.</p>
              </div>
              <DeafStudentHub 
                isCameraOn={isStudentCameraOn} 
                currentFocus={currentFocus}
                onGestureDetected={(gesture) => addTranscript('student', gesture)}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                  <span className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mr-4 shadow-lg shadow-blue-200">
                    <i className="fa-solid fa-chalkboard-user text-white text-xl"></i>
                  </span>
                  Teacher Station
                </h2>
                <p className="text-slate-500 font-medium mt-2 ml-16">Speak to generate signs and monitor student communication.</p>
              </div>
              
              <div className="space-y-8">
                <TeacherControls 
                  isListening={isTeacherMicOn} 
                  onSpeechDetected={(text) => addTranscript('teacher', text)}
                />
              </div>
            </div>
          )}
          
          {/* Shared Info Footer */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mt-auto">
             <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full"></div>
             <div className="relative z-10">
               <div className="flex items-center space-x-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-slate-700 flex items-center justify-center">
                    <i className="fa-solid fa-shield-halved text-white text-sm"></i>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Academic Privacy Shield</h3>
               </div>
               <p className="text-base font-medium opacity-60 leading-relaxed max-w-2xl">
                 This session is 100% localized. No voice, video, or data data is stored or transmitted outside your browser. Using native Speech-to-Text and MediaPipe Hand Tracking.
               </p>
             </div>
          </div>
        </div>

        {/* ISL Session Log */}
        <div className="col-span-12 lg:col-span-4">
          <LessonTranscript items={transcripts} />
        </div>

        
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
           SignBridge Local Protocol • Secure Multi-Role Interface
         </span>
      </footer>
    </div>
  );
};

export default App;
