
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Play, Users, MessageCircle, Video, Plus, UserPlus, Tv, Phone } from 'lucide-react';

const LandingPage = () => {
  const [roomCode, setRoomCode] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async () => {
    if (!createRoomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for your room",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create room via backend API
      const response = await fetch('http://localhost:3001/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: createRoomName,
          isPrivate: false,
          maxParticipants: 10
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      
      toast({
        title: "Room created successfully!",
        description: `Room ID: ${data.room.id}`,
      });
      
      setIsCreateDialogOpen(false);
      setCreateRoomName('');
      navigate(`/room/${data.room.id}`);
    } catch (error) {
      toast({
        title: "Failed to create room",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      toast({
        title: "Room code required",
        description: "Please enter a valid room code",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if room exists via backend API
      const response = await fetch(`http://localhost:3001/api/rooms/${roomCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Room not found",
            description: "Please check your room code and try again",
            variant: "destructive"
          });
          return;
        }
        throw new Error('Failed to check room');
      }

      const data = await response.json();

      toast({
        title: "Joining room...",
        description: `Welcome to ${data.room.name}!`,
      });
      
      setIsJoinDialogOpen(false);
      setRoomCode('');
      navigate(`/room/${roomCode}`);
    } catch (error) {
      toast({
        title: "Failed to join room",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const features = [
    {
      icon: Phone,
      title: "Real-time Voice Chat",
      description: "High-quality WebRTC voice communication with echo cancellation and voice activity detection"
    },
    {
      icon: Play,
      title: "Synchronized Playback",
      description: "Everyone stays in sync automatically"
    },
    {
      icon: MessageCircle,
      title: "Real-time Chat",
      description: "React and discuss during the movie"
    }
  ];

  return (
    <>
      <Helmet>
        <title>StreamTogether - Watch Movies with Friends</title>
        <meta name="description" content="Watch movies with friends, no matter where you are. Create rooms, share codes, and enjoy synchronized streaming with real-time chat." />
      </Helmet>
      
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-indigo-900/20" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="text-center space-y-8 relative z-10 max-w-4xl mx-auto">
          {/* Logo and Title */}
          <div className="space-y-6 py-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Tv className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <div className="py-2 mb-6">
              <h1 className="text-5xl md:text-7xl font-bold gradient-text px-4">
                StreamTogether
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Watch movies with friends, no matter where you are
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl">Create a New Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="roomName" className="text-white">Room Name</Label>
                    <Input
                      id="roomName"
                      placeholder="Enter room name..."
                      value={createRoomName}
                      onChange={(e) => setCreateRoomName(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 mt-2"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateRoom}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Join Room
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl">Join a Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="roomCode" className="text-white">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="Enter room code..."
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 mt-2"
                      onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                    />
                  </div>
                  <Button 
                    onClick={handleJoinRoom}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Join Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass-effect rounded-2xl p-6 text-center hover:bg-white/20 transition-all duration-300 relative"
              >
                {feature.comingSoon && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full">
                    Coming Soon
                  </div>
                )}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingPage;
