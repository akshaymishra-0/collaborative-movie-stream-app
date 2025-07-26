import React, { useState, useRef, useEffect } from 'react';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Volume2, Users, Phone, PhoneOff, Wifi, WifiOff, AlertTriangle, Move, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const VoiceChatStatus = ({ isChatSidebarVisible = false }) => {
  const {
    isVoiceEnabled,
    isMuted,
    isSpeaking,
    isConnecting,
    connectionStatus,
    participantCount,
    toggleMute,
    stopVoiceChat,
    isConnected
  } = useVoiceChat();

  // State for dragging and positioning
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dialogRef = useRef(null);

  // Initialize position based on chat sidebar visibility
  useEffect(() => {
    if (isChatSidebarVisible) {
      // Position on the left side when chat is open, avoiding overlap
      setPosition({ x: -400, y: 0 });
    } else {
      // Default position (bottom-right)
      setPosition({ x: 0, y: 0 });
    }
  }, [isChatSidebarVisible]);

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const rect = dialogRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && dialogRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dialogRect = dialogRef.current.getBoundingClientRect();
      
      // Constrain to viewport bounds
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - dialogRect.width));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - dialogRect.height));
      
      setPosition({ x: constrainedX, y: constrainedY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isVoiceEnabled) {
    return null;
  }

  const totalParticipants = participantCount + 1; // +1 for local user

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'border-green-500/30 bg-green-500/10';
      case 'connecting':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-slate-500/30 bg-slate-500/10';
    }
  };

  const getStatusIcon = () => {
    if (isConnecting) {
      return <Phone className="w-5 h-5 text-yellow-400 animate-pulse" />;
    }
    
    switch (connectionStatus) {
      case 'connected':
        return <Phone className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <PhoneOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    
    switch (connectionStatus) {
      case 'connected':
        return 'Voice Chat Active';
      case 'error':
        return 'Connection Error';
      default:
        return 'Voice Chat';
    }
  };

  const getDialogPosition = () => {
    if (position.x !== 0 || position.y !== 0) {
      // Use custom position if dragged
      return {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto'
      };
    } else if (isChatSidebarVisible) {
      // Position on the left when chat sidebar is visible
      return {
        position: 'fixed',
        bottom: '1rem',
        left: '1rem',
        right: 'auto',
        top: 'auto'
      };
    } else {
      // Default bottom-right position
      return {
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        left: 'auto',
        top: 'auto'
      };
    }
  };

  return (
    <div 
      ref={dialogRef}
      className={cn(
        "z-50 select-none",
        isDragging && "cursor-grabbing"
      )}
      style={getDialogPosition()}
      onMouseDown={handleMouseDown}
    >
      <div className={cn(
        "rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200",
        isMinimized ? "w-16 h-16" : "min-w-[280px]",
        getStatusColor(),
        isDragging && "shadow-2xl scale-105"
      )}>
        {/* Drag Handle and Header */}
        <div className={cn(
          "drag-handle flex items-center justify-between p-3 cursor-grab active:cursor-grabbing",
          isMinimized && "p-2"
        )}>
          <div className="flex items-center space-x-2">
            <Move className="w-4 h-4 text-gray-400" />
            {!isMinimized && (
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-sm font-medium text-white">
                  {getStatusText()}
                </span>
              </div>
            )}
            {isMinimized && getStatusIcon()}
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              onClick={() => setIsMinimized(!isMinimized)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 rounded-full hover:bg-white/10"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <Maximize2 className="w-3 h-3 text-gray-400" />
              ) : (
                <Minimize2 className="w-3 h-3 text-gray-400" />
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {!isMinimized && (
          <>
            <div className="px-4 pb-3">
              {/* Participant Info */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-400 text-xs flex items-center space-x-2">
                  <Users className="w-3 h-3" />
                  <span>{totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</span>
                  {isConnected && (
                    <>
                      <Wifi className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Connected</span>
                    </>
                  )}
                  {connectionStatus === 'error' && (
                    <>
                      <WifiOff className="w-3 h-3 text-red-400" />
                      <span className="text-red-400">Disconnected</span>
                    </>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  {/* Mute Toggle */}
                  <Button
                    onClick={toggleMute}
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 p-0 rounded-full transition-all duration-200",
                      isMuted 
                        ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" 
                        : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                    )}
                    title={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Leave Voice Chat */}
                  <Button
                    onClick={stopVoiceChat}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    title="Leave voice chat"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Speaking Indicator */}
              {isSpeaking && !isMuted && isConnected && (
                <div className="flex items-center space-x-2 mb-2">
                  <Volume2 className="w-4 h-4 text-green-400" />
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-green-400 rounded-full animate-pulse"
                        style={{ 
                          animationDelay: `${i * 100}ms`,
                          height: `${8 + (i % 3) * 4}px`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-green-400 text-xs font-medium">Speaking</span>
                </div>
              )}

              {/* Connection Quality */}
              {isConnected && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-gray-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span>Good quality</span>
                  </div>
                  {isMuted && (
                    <div className="flex items-center space-x-1 text-red-400">
                      <MicOff className="w-3 h-3" />
                      <span>Microphone muted</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {connectionStatus === 'error' && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Connection lost. Please try rejoining voice chat.</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceChatStatus;
