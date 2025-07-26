import React, { useRef, useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Volume2, Signal, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';
import { cn } from '@/lib/utils';

const VoiceParticipant = ({ participant, stream, isSelf = false, isRemoteSpeaking = false }) => {
  const audioRef = useRef(null);
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, medium, poor

  useEffect(() => {
    if (audioRef.current && stream && !isSelf) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = 1.0;
    }
  }, [stream, isSelf]);

  const getSignalIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return <SignalHigh className="w-3 h-3 text-green-400" />;
      case 'medium':
        return <SignalMedium className="w-3 h-3 text-yellow-400" />;
      case 'poor':
        return <SignalLow className="w-3 h-3 text-red-400" />;
      default:
        return <Signal className="w-3 h-3 text-gray-400" />;
    }
  };

  const isSpeaking = isSelf ? participant.isSpeaking : isRemoteSpeaking;

  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 rounded-lg transition-all duration-300",
      isSpeaking 
        ? "bg-green-500/10 border border-green-500/20 shadow-lg" 
        : "bg-slate-700/30 hover:bg-slate-700/50"
    )}>
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarFallback className={cn(
            participant.color, 
            "text-white text-sm font-medium",
            isSpeaking && "ring-2 ring-green-400 ring-offset-2 ring-offset-slate-800"
          )}>
            {participant.avatar}
          </AvatarFallback>
        </Avatar>
        
        {/* Speaking indicator with animated pulse */}
        {isSpeaking && !participant.isMuted && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
        
        {/* Muted indicator */}
        {participant.isMuted && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <MicOff className="w-2 h-2 text-white" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={cn(
              "text-sm font-medium truncate",
              isSpeaking ? "text-green-300" : "text-white"
            )}>
              {participant.name}
              {isSelf && ' (You)'}
            </span>
            
            {/* Connection quality indicator for remote participants */}
            {!isSelf && getSignalIcon()}
          </div>
          
          {/* Microphone status */}
          <div className="flex items-center space-x-1">
            {participant.isMuted ? (
              <MicOff className="w-4 h-4 text-red-400" />
            ) : (
              <Mic className={cn(
                "w-4 h-4",
                isSpeaking ? "text-green-400" : "text-gray-400"
              )} />
            )}
          </div>
        </div>
        
        {/* Voice activity visualizer */}
        {isSpeaking && !participant.isMuted && (
          <div className="flex items-center space-x-1 mt-2">
            <Volume2 className="w-3 h-3 text-green-400" />
            <div className="flex space-x-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-green-400 rounded-full animate-pulse",
                    `h-${2 + (i % 2)}`
                  )}
                  style={{ 
                    animationDelay: `${i * 150}ms`,
                    height: `${8 + (i % 3) * 4}px`
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Connection status text for remote participants */}
        {!isSelf && (
          <div className={cn(
            "text-xs mt-1",
            connectionQuality === 'good' ? "text-green-400" :
            connectionQuality === 'medium' ? "text-yellow-400" : "text-red-400"
          )}>
            {connectionQuality === 'good' ? 'Good connection' :
             connectionQuality === 'medium' ? 'Fair connection' : 'Poor connection'}
          </div>
        )}
      </div>
      
      {/* Hidden audio element for remote streams */}
      {!isSelf && <audio ref={audioRef} autoPlay playsInline />}
    </div>
  );
};

const VoiceParticipants = () => {
  const {
    isVoiceEnabled,
    isMuted,
    isSpeaking,
    peerStreams,
    peerSpeakingStatus,
    localStream,
    connectionStatus
  } = useVoiceChat();

  if (!isVoiceEnabled) {
    return (
      <div className="space-y-2">
        <h4 className="text-gray-400 text-sm font-medium flex items-center space-x-2">
          <Volume2 className="w-4 h-4" />
          <span>Voice Chat</span>
        </h4>
        <div className="text-center py-6 bg-slate-700/20 rounded-lg border border-slate-600/20">
          <Volume2 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            Voice chat is disabled
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Click the voice button to join
          </p>
        </div>
      </div>
    );
  }

  // Real participant data from voice chat context
  const localParticipant = {
    name: 'You',
    avatar: 'Y', 
    color: 'bg-green-500',
    isMuted,
    isSpeaking
  };

  // Convert peer streams to participant objects with real data from signaling
  const remoteParticipants = Object.keys(peerStreams).map((peerId) => {
    // Get real participant info from voice chat context if available
    const peerInfo = peerStreams[peerId]?.peerInfo || {};
    return {
      id: peerId,
      name: peerInfo.username || `User ${peerId.slice(-4)}`,
      avatar: (peerInfo.username || `U${peerId.slice(-1)}`).charAt(0).toUpperCase(),
      color: ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'][Math.abs(peerId.charCodeAt(0)) % 4],
      isMuted: peerInfo.isMuted || false,
      isSpeaking: peerSpeakingStatus[peerId] || false
    };
  });

  const totalParticipants = remoteParticipants.length + 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-gray-400 text-sm font-medium flex items-center space-x-2">
          <Volume2 className="w-4 h-4" />
          <span>Voice Chat</span>
        </h4>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            connectionStatus === 'connected' ? "bg-green-400" : 
            connectionStatus === 'connecting' ? "bg-yellow-400 animate-pulse" : "bg-red-400"
          )} />
          <span className="text-xs text-gray-400">
            {totalParticipants} connected
          </span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {/* Local participant */}
        <VoiceParticipant
          participant={localParticipant}
          stream={localStream}
          isSelf={true}
        />
        
        {/* Remote participants */}
        {remoteParticipants.map((participant) => (
          <VoiceParticipant
            key={participant.id}
            participant={participant}
            stream={peerStreams[participant.id]}
            isRemoteSpeaking={participant.isSpeaking}
          />
        ))}
      </div>
      
      {remoteParticipants.length === 0 && (
        <div className="text-center py-4 bg-slate-700/20 rounded-lg border border-slate-600/20">
          <div className="text-gray-400 text-sm">
            Waiting for others to join voice chat...
          </div>
          <div className="text-gray-500 text-xs mt-1">
            Share the room link to invite friends
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceParticipants;
