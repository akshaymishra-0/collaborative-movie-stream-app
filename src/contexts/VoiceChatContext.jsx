import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

const VoiceChatContext = createContext();

// Simplified voice chat state management without external dependencies
const voiceChatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOCAL_STREAM':
      return { ...state, localStream: action.payload };
    case 'SET_IS_MUTED':
      return { ...state, isMuted: action.payload };
    case 'SET_IS_SPEAKING':
      return { ...state, isSpeaking: action.payload };
    case 'SET_VOICE_ENABLED':
      return { ...state, isVoiceEnabled: action.payload };
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    default:
      return state;
  }
};

const initialState = {
  localStream: null,
  peers: {},
  peerStreams: {},
  peerSpeakingStatus: {},
  isMuted: false,
  isSpeaking: false,
  isVoiceEnabled: false,
  isConnecting: false,
  connectionStatus: 'disconnected'
};

export const VoiceChatProvider = ({ children, roomId }) => {
  const [state, dispatch] = useReducer(voiceChatReducer, initialState);
  const { toast } = useToast();
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const voiceDetectionRef = useRef(null);

  // Initialize audio context for voice activity detection
  const initializeAudioContext = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 512;
      analyserRef.current.minDecibels = -100;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.85;
      
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      startVoiceActivityDetection();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  };

  // Voice activity detection
  const startVoiceActivityDetection = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    const detectVoice = () => {
      if (!state.isVoiceEnabled || state.isMuted) {
        dispatch({ type: 'SET_IS_SPEAKING', payload: false });
        if (state.isVoiceEnabled) {
          voiceDetectionRef.current = requestAnimationFrame(detectVoice);
        }
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i] * dataArrayRef.current[i];
      }
      const volume = Math.sqrt(sum / dataArrayRef.current.length);
      const isSpeaking = volume > 15;
      
      dispatch({ type: 'SET_IS_SPEAKING', payload: isSpeaking });
      
      if (state.isVoiceEnabled) {
        voiceDetectionRef.current = requestAnimationFrame(detectVoice);
      }
    };
    
    voiceDetectionRef.current = requestAnimationFrame(detectVoice);
  };

  // Get user media
  const getUserMedia = async () => {
    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        },
        video: false
      });
      
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
      initializeAudioContext(stream);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      
      toast({
        title: "Voice chat ready",
        description: "Microphone access granted successfully"
      });
      
      return stream;
    } catch (error) {
      console.error('Failed to access microphone:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      
      let errorMessage = "Please allow microphone access to use voice chat";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Microphone access denied. Please check your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found. Please connect a microphone.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Microphone is being used by another application.";
      }
      
      toast({
        title: "Microphone access failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_CONNECTING', payload: false });
    }
  };

  // Start voice chat (simplified version)
  const startVoiceChat = async () => {
    try {
      const stream = await getUserMedia();
      dispatch({ type: 'SET_VOICE_ENABLED', payload: true });
      
      toast({
        title: "Voice chat enabled",
        description: "Voice detection is active. Full P2P connections will be available soon!"
      });
      
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      dispatch({ type: 'SET_VOICE_ENABLED', payload: false });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
    }
  };

  // Stop voice chat
  const stopVoiceChat = () => {
    if (voiceDetectionRef.current) {
      cancelAnimationFrame(voiceDetectionRef.current);
      voiceDetectionRef.current = null;
    }
    
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    dispatch({ type: 'SET_LOCAL_STREAM', payload: null });
    dispatch({ type: 'SET_VOICE_ENABLED', payload: false });
    dispatch({ type: 'SET_IS_SPEAKING', payload: false });
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    
    toast({
      title: "Voice chat disabled",
      description: "Disconnected from voice chat"
    });
  };

  // Toggle mute
  const toggleMute = () => {
    if (state.localStream) {
      const audioTracks = state.localStream.getAudioTracks();
      const newMutedState = !state.isMuted;
      
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
      
      dispatch({ type: 'SET_IS_MUTED', payload: newMutedState });
      
      toast({
        title: newMutedState ? "Microphone muted" : "Microphone unmuted",
        description: newMutedState ? "You are now muted" : "You can now speak"
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  const value = {
    ...state,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    participantCount: Object.keys(state.peerStreams).length + 1,
    isConnected: state.connectionStatus === 'connected'
  };

  return (
    <VoiceChatContext.Provider value={value}>
      {children}
    </VoiceChatContext.Provider>
  );
};

export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
};
