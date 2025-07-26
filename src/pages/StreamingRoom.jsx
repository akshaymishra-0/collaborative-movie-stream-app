import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { VoiceChatProvider } from '@/contexts/VoiceChatContext';
import signalingService from '@/services/signalingService';
import RoomHeader from '@/components/streaming-room/RoomHeader';
import VideoPlayer from '@/components/streaming-room/VideoPlayer';
import VideoControls from '@/components/streaming-room/VideoControls';
import ChatSidebar from '@/components/streaming-room/ChatSidebar';
import InviteDialog from '@/components/streaming-room/InviteDialog';

const StreamingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);

  const [roomData, setRoomData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState({ played: 0, playedSeconds: 0, loaded: 0, loadedSeconds: 0 });
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [isChatSidebarVisible, setIsChatSidebarVisible] = useState(true);

  useEffect(() => {
    console.log('StreamingRoom useEffect triggered with roomId:', roomId);
    
    let isComponentMounted = true;
    
    const initializeRoom = async () => {
      try {
        if (!isComponentMounted) return;
        
        console.log('Fetching room data for roomId:', roomId);
        // Fetch room data from backend
        const response = await fetch(`http://localhost:3001/api/rooms/${roomId}`);
        
        console.log('Room fetch response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.error('Room not found');
            if (isComponentMounted) {
              toast({ title: "Room not found", description: "Redirecting to home page...", variant: "destructive" });
              navigate('/');
            }
            return;
          }
          throw new Error('Failed to fetch room data');
        }

        const data = await response.json();
        console.log('Room data received:', data);
        
        if (!isComponentMounted) return;
        
        setRoomData(data.room);
        setOnlineUsers(data.room.participants);
        setIsLoading(false);
        
        if (data.room.currentVideo) {
          setVideoUrl(data.room.currentVideo.url);
        }
        
        if (data.room.videoState) {
          setIsPlaying(data.room.videoState.isPlaying);
        }

        console.log('Initializing signaling service...');
        // Initialize signaling service and join room (only if not already connected to this room)
        if (!signalingService.isConnected || signalingService.currentRoom !== roomId) {
          if (signalingService.isConnected && signalingService.currentRoom) {
            // Leave current room first
            signalingService.leaveRoom();
          }
          
          if (!signalingService.isConnected) {
            await signalingService.init(`user_${Date.now()}`);
            console.log('Signaling service initialized');
          }
          
          if (isComponentMounted) {
            await signalingService.joinRoom(roomId, `User_${Math.floor(Math.random() * 1000)}`);
            console.log('Successfully joined room via signaling service');
          }
        } else {
          console.log('Already connected to this room, skipping initialization');
        }
        
        if (!isComponentMounted) return;
        
        // Set up event listeners (only if not already set for this room)
        signalingService.removeAllListeners('chat-message');
        signalingService.removeAllListeners('video-sync');
        signalingService.removeAllListeners('user-joined');
        signalingService.removeAllListeners('user-left');
        
        // Listen for real-time updates
        signalingService.on('chat-message', (message) => {
          setChatMessages(prev => [...prev, {
            id: message.id,
            user: message.username,
            message: message.content,
            time: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: message.username.charAt(0).toUpperCase(),
            color: 'bg-blue-500'
          }]);
        });

        signalingService.on('video-sync', (syncData) => {
          if (syncData.currentVideo) {
            setVideoUrl(syncData.currentVideo.url);
          }
          if (syncData.videoState) {
            setIsPlaying(syncData.videoState.isPlaying);
          }
        });

        signalingService.on('user-joined', (data) => {
          setOnlineUsers(data.participants);
          addSystemMessage(`${data.username} joined the room`);
        });

        signalingService.on('user-left', (data) => {
          setOnlineUsers(data.participants);
          addSystemMessage(`${data.username} left the room`);
        });

      } catch (error) {
        console.error('Failed to initialize room:', error);
        if (isComponentMounted) {
          setIsLoading(false);
          toast({ title: "Failed to connect", description: "Please try again", variant: "destructive" });
        }
      }
    };

    initializeRoom();

    return () => {
      console.log('StreamingRoom cleanup for roomId:', roomId);
      isComponentMounted = false;
      
      // Only disconnect if we're actually leaving the app, not just switching rooms
      if (signalingService && signalingService.socket && signalingService.isConnected) {
        // Don't disconnect completely, just leave the current room
        if (signalingService.currentRoom === roomId) {
          console.log('Leaving room on cleanup');
          signalingService.leaveRoom();
        }
      }
    };
  }, [roomId]);

  const addSystemMessage = (message) => {
    const systemMessage = {
      id: Date.now(), 
      user: 'System', 
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: '🎬', 
      color: 'bg-gray-500', 
      isSystem: true
    };
    setChatMessages(prev => [...prev, systemMessage]);
  };

  const handlePlayPause = () => {
    if (!videoUrl) {
      toast({ title: "No movie loaded", description: "Please upload a movie or load a URL", variant: "destructive" });
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (value) => {
    setVolume(parseFloat(value[0]));
    setIsMuted(value[0] === 0);
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? 0.8 : 0);
  };

  const handleProgress = (state) => {
    if (!seeking) {
      setProgress(state);
    }
  };

  const handleDuration = (duration) => {
    setDuration(duration);
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekChange = (value) => {
    setProgress({ ...progress, played: parseFloat(value) });
  };
  
  const handleSeekMouseUp = (value) => {
    setSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(parseFloat(value));
    }
  };

  const handleFullscreen = () => {
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      addSystemMessage(`🎬 Movie "${file.name}" uploaded successfully`);
      toast({ title: "Movie uploaded successfully!", description: "Ready to start streaming" });
    } else {
      toast({ title: "Invalid file type", description: "Please upload a video file", variant: "destructive" });
    }
  };

  const handleLoadFromUrl = (url) => {
    if (url && url.trim() !== '') {
      setVideoUrl(url);
      addSystemMessage(`🎬 Movie loaded from URL`);
      toast({ title: "Movie loaded successfully!", description: "Ready to start streaming" });
    } else {
      toast({ title: "Invalid URL", description: "Please enter a valid video URL", variant: "destructive" });
    }
  };
  
  const handleSendMessage = (message) => {
    if (!message.trim()) return;
    
    // Send message via signaling service
    signalingService.sendChatMessage(message);
    
    // Add to local state immediately for better UX
    const newMessage = {
      id: Date.now(), 
      user: 'You', 
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: 'Y', 
      color: 'bg-green-500'
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const toggleChatSidebar = () => {
    setIsChatSidebarVisible(!isChatSidebarVisible);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }
  
  if (!roomData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <p>Room not found or failed to load.</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <VoiceChatProvider roomId={roomId}>
      <Helmet>
        <title>{`StreamTogether - Room ${roomId}`}</title>
        <meta name="description" content={`Streaming room ${roomId} - Watch movies together with friends`} />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col">
        <RoomHeader
          roomId={roomId}
          onlineUsers={Array.isArray(onlineUsers) ? onlineUsers.length : 0}
          isChatVisible={isChatSidebarVisible}
          onBack={() => navigate('/')}
          onCopy={() => {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Room link copied!", description: "Share it with your friends" });
          }}
          onInvite={() => setInviteDialogOpen(true)}
          onToggleChat={toggleChatSidebar}
        />
        <InviteDialog
          isOpen={isInviteDialogOpen}
          onClose={() => setInviteDialogOpen(false)}
          roomUrl={window.location.href}
        />

        <div className="flex flex-1 h-[calc(100vh-70px)]">
          <div className="flex-1 flex flex-col">
            <VideoPlayer
              playerRef={playerRef}
              containerRef={playerContainerRef}
              url={videoUrl}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              playbackRate={playbackRate}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onPlayPause={handlePlayPause}
              onFileUpload={handleFileUpload}
              onLoadFromUrl={handleLoadFromUrl}
            />
            <VideoControls
              isPlaying={isPlaying}
              progress={progress}
              duration={duration}
              volume={volume}
              isMuted={isMuted}
              playbackRate={playbackRate}
              onPlayPause={handlePlayPause}
              onVolumeChange={handleVolumeChange}
              onMute={handleMute}
              onSeekMouseDown={handleSeekMouseDown}
              onSeekChange={handleSeekChange}
              onSeekMouseUp={handleSeekMouseUp}
              onFullscreen={handleFullscreen}
              onFileUpload={handleFileUpload}
              onLoadFromUrl={handleLoadFromUrl}
              onPlaybackRateChange={setPlaybackRate}
              onQualityChange={(q) => toast({ title: `Quality changed to ${q}`, description: "This is a mock feature for now!" })}
            />
          </div>
          {isChatSidebarVisible && (
            <ChatSidebar
              onlineUsers={onlineUsers}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </div>
    </VoiceChatProvider>
  );
};

export default StreamingRoom;