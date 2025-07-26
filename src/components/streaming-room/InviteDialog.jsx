import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const InviteDialog = ({ isOpen, onClose, roomUrl }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl);
    toast({
      title: "Room link copied!",
      description: "Share it with your friends to invite them.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-effect border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription className="text-gray-400">
            Share this link with your friends to join the room.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 pt-4">
          <Input 
            readOnly 
            value={roomUrl}
            className="bg-white/10 border-white/20"
          />
          <Button onClick={handleCopy} size="icon" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteDialog;