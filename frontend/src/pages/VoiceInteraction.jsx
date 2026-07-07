import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, X, Loader2, Volume2 } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { transcribeAudio, generateSpeech } from '../api';
import { AlertBanner } from '../components/ui/AlertBanner';

export const VoiceInteraction = () => {
  const navigate = useNavigate();
  const { profile, sendMessage, latestFraudAlert, dismissFraudAlert } = useSession();
  
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    // Start recording automatically on mount if on mobile, 
    // or just show the prominent button on desktop
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // release mic
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('listening');
      setTranscript('');
      setAiResponse('');
      dismissFraudAlert();
    } catch (error) {
      console.error("Microphone access denied or error:", error);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('processing');
    }
  };

  const processAudio = async (audioBlob) => {
    try {
      setStatus('processing');
      
      // 1. STT
      const sttResult = await transcribeAudio(audioBlob, profile?.language || 'hi');
      const text = sttResult.text;
      setTranscript(text);
      
      if (!text.trim()) {
        setStatus('idle');
        setAiResponse("I couldn't hear anything clearly. Please try again.");
        return;
      }

      // 2. Chat / Orchestration
      const chatResult = await sendMessage(text);
      if (chatResult) {
        setAiResponse(chatResult.response);
        
        // 3. TTS (Only if it wasn't a fraud alert blocking TTS, or we want TTS for everything)
        try {
          const ttsBlob = await generateSpeech(chatResult.response, chatResult.language_detected || 'hi');
          const audioUrl = URL.createObjectURL(ttsBlob);
          
          if (audioPlayerRef.current) {
            audioPlayerRef.current.src = audioUrl;
            audioPlayerRef.current.play();
            setStatus('speaking');
            
            audioPlayerRef.current.onended = () => {
              setStatus('idle');
            };
          }
        } catch (ttsErr) {
          console.error("TTS failed, showing text only", ttsErr);
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error("Audio processing pipeline failed", error);
      let errorText = "Sorry, there was an error processing your request.";
      if (profile && profile.language === 'hi') {
        errorText = "माफ़ करें, आपकी आवाज़ समझने में समस्या हुई। कृपया फिर से बोलें।";
      } else if (profile && profile.language === 'kn') {
        errorText = "ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಮಾತನಾಡಿ.";
      }
      setAiResponse(errorText);
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 bg-surface z-[100] flex flex-col md:relative md:bg-transparent md:h-[calc(100vh-120px)]">
      {/* Mobile Top Bar */}
      <div className="p-6 flex justify-end md:hidden">
        <button onClick={() => navigate('/')} className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        
        {latestFraudAlert && (
          <div className="w-full mb-8">
            <AlertBanner 
              type="fraud" 
              title="⚠️ Security Warning" 
              message={latestFraudAlert.warning}
            />
          </div>
        )}

        <div className="text-center mb-12 min-h-[120px] flex flex-col items-center justify-center w-full">
          {status === 'idle' && !transcript && !aiResponse && (
            <h2 className="h2 text-secondary">Tap to speak</h2>
          )}
          
          {status === 'listening' && (
            <h2 className="h2 text-primary animate-pulse">Listening...</h2>
          )}
          
          {status === 'processing' && (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-primary mb-4" size={32} />
              <h2 className="h3 text-secondary">Processing...</h2>
              {transcript && <p className="body-md mt-4 text-on-surface">"{transcript}"</p>}
            </div>
          )}
          
          {(status === 'speaking' || (status === 'idle' && aiResponse)) && (
            <div className="w-full">
              {transcript && <p className="body-sm text-secondary mb-4 italic">"{transcript}"</p>}
              <div className="bg-primary-container text-on-primary-container p-6 rounded-xl rounded-tl-sm w-full shadow-sm">
                <p className="body-lg">{aiResponse}</p>
                {status === 'speaking' && (
                  <div className="mt-4 flex items-center gap-2 text-primary">
                    <Volume2 size={16} className="animate-pulse" />
                    <span className="text-xs uppercase font-bold tracking-wider">Speaking</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audio Player (Hidden) */}
        <audio ref={audioPlayerRef} className="hidden" />

        {/* Central Record Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={status === 'processing'}
          className={`
            w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all
            ${isRecording 
              ? 'bg-error text-on-error scale-110 animate-pulse' 
              : status === 'processing' 
                ? 'bg-surface-variant text-secondary opacity-50 cursor-not-allowed'
                : 'bg-primary text-on-primary hover:scale-105'}
          `}
        >
          {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={40} />}
        </button>
        
        <p className="mt-6 label text-secondary uppercase tracking-widest">
          {isRecording ? 'Tap to Stop' : 'Tap to Start'}
        </p>

      </div>
    </div>
  );
};
