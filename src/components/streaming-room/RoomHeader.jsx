import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, UserPlus, MessageSquare } from 'lucide-react';
import VoiceControls from './VoiceControls';

const RoomHeader = ({ roomId, onlineUsers, isChatVisible, onBack, onCopy, onInvite, onToggleChat }) => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-white/10 px-4 py-3 min-h-[70px]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
            <span className="text-white font-semibold text-lg leading-tight whitespace-nowrap">StreamTogether</span>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-sm">{onlineUsers} watching</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
          <VoiceControls className="hidden sm:flex" />
          <Button 
            onClick={onToggleChat} 
            variant="ghost" 
            size="sm" 
            className={`text-white hover:bg-white/10 hidden sm:flex ${isChatVisible ? 'bg-white/20' : ''}`}
            title={isChatVisible ? 'Hide Chat' : 'Show Chat'}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            <span className="hidden lg:inline">Chat</span>
          </Button>
          <div className="hidden md:flex items-center space-x-2 bg-slate-700/50 rounded-lg p-2">
            <span className="text-xs lg:text-sm text-gray-300">Room:</span>
            <code className="text-white text-xs lg:text-sm font-mono">{roomId}</code>
            <Button variant="ghost" size="icon" onClick={onCopy} className="text-white hover:bg-white/10 h-6 w-6">
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <Button onClick={onInvite} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm">
            <UserPlus className="w-4 h-4 mr-1 lg:mr-2"/>
            <span className="hidden sm:inline">Invite</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default RoomHeader;