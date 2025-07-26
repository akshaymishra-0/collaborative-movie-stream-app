import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Volume2, Wifi, WifiOff } from 'lucide-react';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { cn } from '@/lib/utils';

const VoiceControls = ({ className }) => {
  const {
    isVoiceEnabled,
    isMuted,
    isSpeaking,
    isConnecting,
    connectionStatus,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    participantCount,
    isConnected
  } = useVoiceChat();

  const handleVoiceToggle = () => {
    if (isVoiceEnabled) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Volume2 className="w-4 h-4 animate-pulse" />;
      case 'connected':
        return isVoiceEnabled ? <Phone className="w-4 h-4" /> : <PhoneOff className="w-4 h-4" />;
      case 'error':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <PhoneOff className="w-4 h-4" />;
    }
  };

  const getConnectionText = () => {
    if (isConnecting) return "Connecting...";
    if (connectionStatus === 'error') return "Error";
    if (isVoiceEnabled) return "Voice";
    return "Voice";
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      case 'connected':
        return isVoiceEnabled 
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-slate-600 hover:bg-slate-700 text-white";
      case 'error':
        return "bg-red-600 hover:bg-red-700 text-white";
      default:
        return "bg-slate-600 hover:bg-slate-700 text-white";
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Voice Chat Toggle Button */}
      <Button
        onClick={handleVoiceToggle}
        disabled={isConnecting}
        size="sm"
        className={cn(
          "relative transition-all duration-200",
          getConnectionColor()
        )}
        title={isVoiceEnabled ? "Leave voice chat" : "Join voice chat"}
      >
        {getConnectionIcon()}
        <span className="ml-2 hidden sm:inline">
          {getConnectionText()}
        </span>
        
        {/* Speaking indicator */}
        {isVoiceEnabled && isSpeaking && !isMuted && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        )}
        
        {/* Connection status indicator */}
        {isVoiceEnabled && (
          <div className={cn(
            "absolute -bottom-1 -right-1 w-2 h-2 rounded-full",
            isConnected ? "bg-green-400" : "bg-red-400"
          )} />
        )}
      </Button>

      {/* Mute Toggle Button (only show when voice is enabled) */}
      {isVoiceEnabled && (
        <Button
          onClick={toggleMute}
          size="sm"
          variant="ghost"
          className={cn(
            "text-white transition-all duration-200",
            isMuted 
              ? "bg-red-600/20 hover:bg-red-600/30 border border-red-600/50" 
              : "hover:bg-white/10"
          )}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? (
            <MicOff className="w-4 h-4 text-red-400" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </Button>
      )}

      {/* Participant Count in Voice Chat */}
      {isVoiceEnabled && participantCount >= 0 && (
        <div className="flex items-center space-x-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>{participantCount + 1} in voice</span>
        </div>
      )}

      {/* Voice Quality Indicator */}
      {isVoiceEnabled && isConnected && (
        <div className="flex items-center space-x-1 text-xs text-blue-400">
          <Wifi className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

export default VoiceControls;
