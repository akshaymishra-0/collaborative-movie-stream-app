import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { Play, Upload, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const VideoPlayer = ({ 
  playerRef, 
  containerRef,
  url,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onProgress,
  onDuration,
  onPlay,
  onPause,
  onPlayPause,
  onFileUpload,
  onLoadFromUrl
}) => {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handlePlayerClick = () => {
    onPlayPause();
  };

  const handleFileUploadClick = (event) => {
    if (onFileUpload) {
      onFileUpload(event);
    }
  };

  const handleUrlLoad = () => {
    if (onLoadFromUrl && urlInput.trim()) {
      onLoadFromUrl(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleShowUrlInput = () => {
    setShowUrlInput(true);
  };

  return (
    <div ref={containerRef} className="flex-1 bg-black/50 relative flex items-center justify-center w-full h-full group">
      {url ? (
        <>
          <ReactPlayer
            ref={playerRef}
            url={url}
            width="100%"
            height="100%"
            playing={isPlaying}
            volume={volume}
            muted={isMuted}
            playbackRate={playbackRate}
            onProgress={onProgress}
            onDuration={onDuration}
            onPlay={onPlay}
            onPause={onPause}
            onClickPreview={onPlayPause}
            light={false}
            config={{
              youtube: {
                playerVars: { showinfo: 0, controls: 0 }
              },
              file: {
                attributes: {
                  style: { width: '100%', height: '100%', objectFit: 'contain' },
                  onClick: handlePlayerClick,
                  onDoubleClick: (e) => { e.preventDefault(); }
                }
              }
            }}
          />
          <div 
            className="absolute inset-0 w-full h-full"
            onClick={handlePlayerClick}
            onDoubleClick={(e) => { e.preventDefault(); }}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                <Play className="w-10 h-10 text-white fill-white" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Play className="w-12 h-12 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">Ready to start streaming</h3>
            <p className="text-gray-400 mb-6">Upload a movie or load from a URL to begin</p>
          </div>

          {/* Upload and URL Options */}
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <input 
                type="file" 
                accept="video/*,audio/*" 
                onChange={handleFileUploadClick} 
                className="hidden" 
                id="center-movie-upload" 
              />
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <label htmlFor="center-movie-upload" className="cursor-pointer">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Movie File
                </label>
              </Button>
            </div>

            {/* URL Input */}
            {!showUrlInput ? (
              <Button 
                onClick={handleShowUrlInput}
                variant="outline" 
                size="lg" 
                className="w-full border-white/30 text-white hover:bg-white/10"
              >
                <Link className="w-5 h-5 mr-2" />
                Load from URL
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="center-video-url" className="text-white text-sm">
                    Video URL
                  </Label>
                  <Input
                    id="center-video-url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 mt-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleUrlLoad()}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleUrlLoad}
                    disabled={!urlInput.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Load Video
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowUrlInput(false);
                      setUrlInput('');
                    }}
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;