
import React, { useState, useEffect } from 'react';
import { getSpeechRecognition } from '../lib/voice';

interface VoiceControlsProps {
  onCommand: (command: string) => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const rec = getSpeechRecognition(
      (result) => {
        if (result.isFinal) {
          onCommand(result.text);
        }
      },
      () => setIsListening(false)
    );

    if (!rec) {
      setHasSupport(false);
    } else {
      setRecognition(rec);
    }
  }, [onCommand]);

  const toggleListen = () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  if (!hasSupport) return null;

  return (
    <div className="relative group">
      <button
        onClick={toggleListen}
        aria-label="Toggle Voice Commands"
        className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center ${
          isListening ? 'bg-rose-500 animate-pulse text-white' : 'bg-blue-600 dark:bg-blue-500 text-white'
        }`}
      >
        {isListening ? (
          <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 10a3 3 0 116 0v4a3 3 0 11-6 0v-4z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      {isListening && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md text-white px-5 py-2 rounded-2xl text-[10px] font-black whitespace-nowrap shadow-2xl tracking-widest uppercase">
          Listening...
        </div>
      )}
    </div>
  );
};

export default VoiceControls;
