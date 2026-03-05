
import React from 'react';
import { AppMode } from '../../types';

interface HeaderProps {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
  isTeacherMicOn: boolean;
  setIsTeacherMicOn: (val: boolean) => void;
  isStudentCameraOn: boolean;
  setIsStudentCameraOn: (val: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  activeMode,
  setActiveMode,
  isTeacherMicOn, 
  setIsTeacherMicOn,
  isStudentCameraOn,
  setIsStudentCameraOn
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-[1600px]">
        {/* Logo & Branding */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
            <i className="fa-solid fa-bridge text-white text-xl"></i>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight uppercase">SignBridge</h1>
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">DHH Local Assist</p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          <button 
            onClick={() => setActiveMode(AppMode.STUDENT)}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
              activeMode === AppMode.STUDENT 
                ? 'bg-white text-orange-600 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-user-graduate"></i>
            <span>DHH Student</span>
          </button>
          <button 
            onClick={() => setActiveMode(AppMode.TEACHER)}
            className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
              activeMode === AppMode.TEACHER 
                ? 'bg-white text-blue-600 shadow-md' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-chalkboard-user"></i>
            <span>Teacher</span>
          </button>
        </div>

        {/* Status Toggles */}
        <div className="flex items-center space-x-3">
          {activeMode === AppMode.TEACHER ? (
            <button 
              onClick={() => setIsTeacherMicOn(!isTeacherMicOn)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-widest ${
                isTeacherMicOn 
                  ? 'bg-red-50 border-red-500 text-red-600 animate-pulse' 
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <i className="fa-solid fa-microphone"></i>
              <span>{isTeacherMicOn ? 'Listening' : 'Mic Off'}</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsStudentCameraOn(!isStudentCameraOn)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all uppercase tracking-widest ${
                isStudentCameraOn 
                  ? 'bg-orange-50 border-orange-500 text-orange-600' 
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <i className="fa-solid fa-camera"></i>
              <span>{isStudentCameraOn ? 'Tracking' : 'Cam Off'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
