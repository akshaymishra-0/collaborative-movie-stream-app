// Voice Chat Utility Functions

/**
 * Check if browser supports WebRTC and getUserMedia
 */
export const checkWebRTCSupport = () => {
  const isWebRTCSupported = !!(
    window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection
  );

  const isGetUserMediaSupported = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );

  return {
    webrtc: isWebRTCSupported,
    getUserMedia: isGetUserMediaSupported,
    supported: isWebRTCSupported && isGetUserMediaSupported
  };
};

/**
 * Get available audio input devices
 */
export const getAudioDevices = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('Device enumeration not supported');
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return [];
  }
};

/**
 * Test microphone access and quality
 */
export const testMicrophone = async (deviceId = null) => {
  try {
    const constraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Test audio levels
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    return new Promise((resolve) => {
      let maxLevel = 0;
      let testCount = 0;
      const maxTests = 50; // Test for ~1 second

      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const level = dataArray.reduce((a, b) => a + b) / dataArray.length;
        maxLevel = Math.max(maxLevel, level);
        testCount++;

        if (testCount < maxTests) {
          requestAnimationFrame(checkLevel);
        } else {
          // Cleanup
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          resolve({
            success: true,
            maxLevel,
            quality: maxLevel > 10 ? 'good' : maxLevel > 5 ? 'fair' : 'poor'
          });
        }
      };

      checkLevel();
    });
  } catch (error) {
    return {
      success: false,
      error: error.message,
      quality: 'none'
    };
  }
};

/**
 * Format voice chat error messages
 */
export const formatVoiceChatError = (error) => {
  const errorMessages = {
    'NotAllowedError': {
      title: 'Microphone Access Denied',
      description: 'Please allow microphone access in your browser settings and refresh the page.'
    },
    'NotFoundError': {
      title: 'No Microphone Found',
      description: 'Please connect a microphone and try again.'
    },
    'NotReadableError': {
      title: 'Microphone In Use',
      description: 'Your microphone is being used by another application. Please close other apps and try again.'
    },
    'OverconstrainedError': {
      title: 'Microphone Configuration Error',
      description: 'Your microphone does not support the required audio settings.'
    },
    'SecurityError': {
      title: 'Security Error',
      description: 'Microphone access blocked due to security restrictions.'
    },
    'AbortError': {
      title: 'Operation Aborted',
      description: 'Microphone access was cancelled.'
    }
  };

  return errorMessages[error.name] || {
    title: 'Voice Chat Error',
    description: error.message || 'An unknown error occurred while setting up voice chat.'
  };
};

/**
 * Generate unique voice chat room identifier
 */
export const generateVoiceRoomId = (baseRoomId) => {
  return `voice_${baseRoomId}_${Date.now()}`;
};

/**
 * Calculate voice activity level from frequency data
 */
export const calculateVoiceActivity = (dataArray, threshold = 20) => {
  if (!dataArray || dataArray.length === 0) return 0;
  
  // Calculate RMS (Root Mean Square) for better voice detection
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  
  return {
    level: rms,
    isSpeaking: rms > threshold,
    percentage: Math.min((rms / 100) * 100, 100)
  };
};

/**
 * Optimize audio constraints for voice chat
 */
export const getOptimizedAudioConstraints = (deviceId = null) => {
  const baseConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1,
    volume: 1.0
  };

  if (deviceId) {
    baseConstraints.deviceId = { exact: deviceId };
  }

  return { audio: baseConstraints, video: false };
};

/**
 * Monitor connection quality for WebRTC
 */
export const monitorConnectionQuality = async (peerConnection) => {
  try {
    const stats = await peerConnection.getStats();
    let inboundRTP = null;
    let outboundRTP = null;

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        inboundRTP = report;
      }
      if (report.type === 'outbound-rtp' && report.mediaType === 'audio') {
        outboundRTP = report;
      }
    });

    return {
      inbound: inboundRTP ? {
        packetsLost: inboundRTP.packetsLost || 0,
        packetsReceived: inboundRTP.packetsReceived || 0,
        jitter: inboundRTP.jitter || 0
      } : null,
      outbound: outboundRTP ? {
        packetsSent: outboundRTP.packetsSent || 0,
        bytesSent: outboundRTP.bytesSent || 0
      } : null
    };
  } catch (error) {
    console.error('Error monitoring connection quality:', error);
    return null;
  }
};

/**
 * Calculate connection quality score
 */
export const calculateConnectionQuality = (stats) => {
  if (!stats || !stats.inbound) return 'unknown';

  const { packetsLost, packetsReceived, jitter } = stats.inbound;
  
  if (packetsReceived === 0) return 'poor';
  
  const lossRate = packetsLost / (packetsLost + packetsReceived);
  
  if (lossRate < 0.02 && jitter < 0.03) return 'excellent';
  if (lossRate < 0.05 && jitter < 0.05) return 'good';
  if (lossRate < 0.1 && jitter < 0.1) return 'fair';
  return 'poor';
};

/**
 * Voice chat session storage helpers
 */
export const voiceChatStorage = {
  setUserPreferences: (preferences) => {
    localStorage.setItem('voiceChat_preferences', JSON.stringify(preferences));
  },
  
  getUserPreferences: () => {
    try {
      const stored = localStorage.getItem('voiceChat_preferences');
      return stored ? JSON.parse(stored) : {
        autoJoin: false,
        preferredDeviceId: null,
        volume: 0.8,
        muteByDefault: false
      };
    } catch {
      return {};
    }
  },
  
  setLastUsedDevice: (deviceId) => {
    localStorage.setItem('voiceChat_lastDevice', deviceId);
  },
  
  getLastUsedDevice: () => {
    return localStorage.getItem('voiceChat_lastDevice');
  }
};
