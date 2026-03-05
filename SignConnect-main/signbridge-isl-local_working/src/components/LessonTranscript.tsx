import React from 'react';
import { TranscriptionItem } from '../../types';

interface LessonTranscriptProps {
  items: TranscriptionItem[];
}

const LessonTranscript: React.FC<LessonTranscriptProps> = ({ items }) => {
  return (
    <section className="bg-white rounded-[2.5rem] h-full flex flex-col shadow-sm border border-slate-100 overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <i className="fa-regular fa-comments text-orange-500 text-sm"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">ISL Session Log</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-200"></div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</span>
        </div>
      </div>

      {/* Transcript Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={`flex items-center space-x-2 mb-2 ${item.role === 'student' ? 'justify-end' : ''}`}>
              <span className={`text-[9px] font-black uppercase tracking-widest ${item.role === 'student' ? 'text-orange-500' : 'text-red-500'}`}>
                {item.role === 'teacher' ? 'Teacher (Audio)' : 'Student (Gesture)'}
              </span>
              <span className="text-[9px] font-bold text-slate-300">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className={`flex flex-col space-y-3 ${item.role === 'student' ? 'items-end' : ''}`}>
              {/* Message Bubble */}
              <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-sm font-bold shadow-sm ${
                item.role === 'teacher' 
                  ? 'bg-white text-slate-800 border border-slate-100 self-start rounded-tl-none' 
                  : 'bg-orange-500 text-white self-end rounded-tr-none'
              }`}>
                {item.text}
              </div>
            </div>
          </div>
        )) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 space-y-4 py-20 px-10">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner">
              <i className="fa-solid fa-hands-bubbles text-3xl opacity-20"></i>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest">No Activity Yet</p>
              <p className="text-xs font-medium opacity-60">Speech or signs detected in the hub will appear here automatically.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LessonTranscript;