import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import VoiceParticipants from './VoiceParticipants';

const ParticipantsList = ({ participants }) => (
  <div className="space-y-2">
    <h4 className="text-gray-400 text-sm font-medium">Participants</h4>
    <div className="space-y-2">
      {participants.map((participant, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback className={`${participant.color} text-white text-xs`}>
              {participant.avatar}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-sm">{participant.name}</span>
          <span className="text-gray-400 text-xs">{participant.role}</span>
          {participant.online && <div className="w-2 h-2 bg-green-400 rounded-full ml-auto" />}
        </div>
      ))}
    </div>
  </div>
);

const MessageList = ({ messages }) => {
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scrollbar">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex space-x-2 ${message.isSystem ? 'justify-center' : ''}`}
        >
          {!message.isSystem && (
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className={`${message.color} text-white text-sm`}>{message.avatar}</AvatarFallback>
            </Avatar>
          )}
          <div className={`flex-1 ${message.isSystem ? 'text-center' : ''}`}>
            {!message.isSystem && (
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-white text-sm font-medium">{message.user}</span>
                <span className="text-gray-400 text-xs">{message.time}</span>
              </div>
            )}
            <p className={`text-sm ${message.isSystem ? 'text-gray-400 italic' : 'text-gray-300'}`}>{message.message}</p>
          </div>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  );
};

const ChatInput = ({ onSendMessage }) => {
  const [chatMessage, setChatMessage] = useState('');

  const handleSend = () => {
    if (!chatMessage.trim()) return;
    onSendMessage(chatMessage);
    setChatMessage('');
  };

  return (
    <div className="p-4 border-t border-white/10">
      <div className="flex space-x-2">
        <Input
          placeholder="Type a message..."
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />
        <Button onClick={handleSend} size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const ChatSidebar = ({ onlineUsers, messages, onSendMessage }) => {
  return (
    <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-white/10 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Room Chat</h3>
          <div className="flex items-center space-x-1 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-sm">{Array.isArray(onlineUsers) ? onlineUsers.length : onlineUsers || 0} online</span>
          </div>
        </div>
        <div className="space-y-4">
          <VoiceParticipants />
          {Array.isArray(onlineUsers) && onlineUsers.length > 0 && (
            <ParticipantsList participants={onlineUsers} />
          )}
        </div>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
};

export default ChatSidebar;