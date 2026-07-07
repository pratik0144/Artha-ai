import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, X, Loader2, Volume2, VolumeX, Keyboard, Send } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { transcribeAudio } from '../api';
import { AlertBanner } from '../components/ui/AlertBanner';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export const VoiceInteraction = () => {
  const navigate = useNavigate();
  const { profile, sendMessage, latestFraudAlert, dismissFraudAlert } = useSession();
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();
  
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState(profile?.language || 'hi');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const textInputRef = useRef(null);

  useEffect(() => {
    if (profile?.language) {
      setSelectedLang(profile.language);
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (showTextInput && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [showTextInput]);

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
        
        let processedBlob = audioBlob;
        try {
          processedBlob = await downsampleAudio(audioBlob);
        } catch (e) {
          console.warn("[VoiceInteraction] Audio downsampling failed, using raw audio", e);
        }

        await processAudio(processedBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('listening');
      setTranscript('');
      setAiResponse('');
      dismissFraudAlert();
    } catch (error) {
      console.error("Microphone access denied or error:", error);
      setShowTextInput(true);
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
      
      const sttResult = await transcribeAudio(audioBlob, selectedLang);
      const text = sttResult.text;
      setTranscript(text);
      
      if (!text.trim()) {
        setStatus('idle');
        const emptyNotice = 
          selectedLang === 'hi' ? "मुझे कुछ भी सुनाई नहीं दिया। कृपया फिर से कोशिश करें या नीचे लिखें।" :
          selectedLang === 'kn' ? "ನನಗೆ ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ಕೆಳಗೆ ಬರೆಯಿರಿ." :
          "I couldn't hear anything clearly. Please try again or type below.";
        setAiResponse(emptyNotice);
        setShowTextInput(true);
        return;
      }

      await processMessage(text);
    } catch (error) {
      console.error("Audio processing pipeline failed", error);
      let errorText = "Sorry, there was an error. Please try typing your message instead.";
      if (selectedLang === 'hi') {
        errorText = "माफ़ करें, आवाज़ समझने में समस्या हुई। कृपया नीचे टाइप करें।";
      } else if (selectedLang === 'kn') {
        errorText = "ಕ್ಷಮಿಸಿ, ಧ್ವನಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.";
      }
      setAiResponse(errorText);
      setShowTextInput(true);
      setStatus('idle');
    }
  };

  const processMessage = async (text) => {
    setStatus('processing');
    try {
      const chatResult = await sendMessage(text, selectedLang);
      if (chatResult) {
        setAiResponse(chatResult.response);
        
        // Use browser-native TTS (free, offline)
        if (ttsSupported && voiceEnabled) {
          setStatus('speaking');
          speak(chatResult.response, selectedLang, {
            rate: selectedLang === 'en' ? 1.0 : 0.9,
            onEnd: () => setStatus('idle'),
          });
        } else {
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    } catch (error) {
      console.error("Message processing failed", error);
      setAiResponse("Something went wrong. Please try again.");
      setStatus('idle');
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    const msg = textMessage.trim();
    if (!msg || status === 'processing') return;
    
    setTranscript(msg);
    setTextMessage('');
    setAiResponse('');
    dismissFraudAlert();
    await processMessage(msg);
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
        
        {/* Beautiful Segmented Language Selector */}
        <div className="w-full max-w-sm mb-6 bg-surface-container-high p-1 rounded-full flex shadow-sm border border-outline-variant">
          {[
            { code: 'hi', label: '🇮🇳 हिन्दी' },
            { code: 'kn', label: '🌾 ಕನ್ನಡ' },
            { code: 'en', label: '🇬🇧 English' }
          ].map(langOption => (
            <button
              key={langOption.code}
              type="button"
              onClick={() => {
                setSelectedLang(langOption.code);
                if (isSpeaking) stop();
                setStatus('idle');
                setTranscript('');
                setAiResponse('');
              }}
              className={`
                flex-1 py-2 text-xs font-semibold rounded-full transition-all duration-300
                ${selectedLang === langOption.code 
                  ? 'bg-primary text-on-primary shadow' 
                  : 'text-secondary hover:text-on-surface hover:bg-surface-variant/30'}
              `}
            >
              {langOption.label}
            </button>
          ))}
        </div>

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
            <h2 className="h2 text-secondary">Tap to speak or type below</h2>
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
                <div className="mt-4 flex items-center gap-3">
                  {status === 'speaking' ? (
                    <button
                      onClick={() => { stop(); setStatus('idle'); }}
                      className="flex items-center gap-2 text-error hover:text-error/80 transition-colors"
                    >
                      <VolumeX size={16} className="animate-pulse" />
                      <span className="text-xs uppercase font-bold tracking-wider">Stop</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const lang = selectedLang;
                        setStatus('speaking');
                        speak(aiResponse, lang, {
                          rate: lang === 'en' ? 1.0 : 0.9,
                          onEnd: () => setStatus('idle'),
                        });
                      }}
                      className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                      title="Replay voice"
                    >
                      <Volume2 size={16} />
                      <span className="text-xs uppercase font-bold tracking-wider">Replay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>



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

        {/* Voice Controls */}
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
          >
            <Keyboard size={18} />
            <span className="text-xs uppercase font-medium tracking-wider">
              {showTextInput ? 'Hide keyboard' : 'Type instead'}
            </span>
          </button>
          
          {ttsSupported && (
            <button
              onClick={() => { setVoiceEnabled(!voiceEnabled); if (isSpeaking) stop(); }}
              className={`flex items-center gap-2 transition-colors ${
                voiceEnabled ? 'text-primary hover:text-primary/80' : 'text-secondary hover:text-secondary/80'
              }`}
              title={voiceEnabled ? 'Mute voice replies' : 'Unmute voice replies'}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span className="text-xs uppercase font-medium tracking-wider">
                {voiceEnabled ? 'Voice On' : 'Voice Off'}
              </span>
            </button>
          )}
        </div>

        {/* Text Input Fallback */}
        {showTextInput && (
          <form onSubmit={handleTextSubmit} className="mt-4 w-full max-w-md flex gap-2">
            <input
              ref={textInputRef}
              type="text"
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={status === 'processing'}
              className="flex-1 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-full focus:outline-none focus:border-primary text-on-surface placeholder:text-secondary text-sm"
            />
            <button
              type="submit"
              disabled={!textMessage.trim() || status === 'processing'}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${textMessage.trim() && status !== 'processing'
                  ? 'bg-primary text-on-primary hover:scale-105'
                  : 'bg-surface-variant text-secondary opacity-50 cursor-not-allowed'}
              `}
            >
              <Send size={20} />
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

// ── Client-Side Audio Downsampling Helpers ───────────────────────

async function downsampleAudio(audioBlob, targetSampleRate = 16000) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const offlineContext = new OfflineAudioContext(
    1, // mono channel
    audioBuffer.duration * targetSampleRate,
    targetSampleRate
  );
  
  const bufferSource = offlineContext.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineContext.destination);
  bufferSource.start();
  
  const renderedBuffer = await offlineContext.startRendering();
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result = buffer.getChannelData(0);
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  }
  
  const bufferLength = result.length * 2;
  const wavBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(wavBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function interleave(inputL, inputR) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

