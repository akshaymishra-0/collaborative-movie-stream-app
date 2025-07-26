import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Play, Pause, Volume2, VolumeX, Maximize, Upload, Link, Settings, Minimize } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const SettingsMenu = ({ playbackRate, onPlaybackRateChange, onQualityChange }) => {
  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const qualities = ["Auto", "1080p", "720p", "480p"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
          <Settings className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 bg-slate-800/80 backdrop-blur-sm border-white/20 text-white">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Playback Speed</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {playbackRates.map((rate) => (
                <Button key={rate} variant={playbackRate === rate ? 'secondary' : 'ghost'} size="sm" onClick={() => onPlaybackRateChange(rate)}>
                  {rate}x
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Quality</Label>
            <div className="flex flex-col space-y-1 mt-2">
              {qualities.map((quality) => (
                <Button key={quality} variant="ghost" size="sm" className="justify-start" onClick={() => onQualityChange(quality)}>
                  {quality}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const LoadFromUrlPopover = ({ onLoad }) => {
  const [url, setUrl] = useState('');

  const handleLoad = () => {
    onLoad(url);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
          <Link className="w-4 h-4 mr-2" />
          Load URL
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-slate-800/80 backdrop-blur-sm border-white/20 text-white">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Load from URL</h4>
            <p className="text-sm text-muted-foreground">
              Enter a video URL (e.g., YouTube, Vimeo).
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="video-url">URL</Label>
            <Input
              id="video-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="bg-white/10 border-white/20"
            />
          </div>
          <Button onClick={handleLoad} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">Load Video</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};


const VideoControls = ({
  isPlaying,
  progress,
  duration,
  volume,
  isMuted,
  playbackRate,
  onPlayPause,
  onVolumeChange,
  onMute,
  onSeekMouseDown,
  onSeekChange,
  onSeekMouseUp,
  onFullscreen,
  onFileUpload,
  onLoadFromUrl,
  onPlaybackRateChange,
  onQualityChange,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm p-4 space-y-2">
      <div className="flex items-center space-x-3">
        <span className="text-white text-sm font-mono w-12 text-center">{formatTime(progress.playedSeconds)}</span>
        <Slider
          value={[progress.played]}
          max={1}
          step={0.0001}
          onValueChange={(value) => onSeekChange(value[0])}
          onPointerDown={onSeekMouseDown}
          onPointerUp={() => onSeekMouseUp(progress.played)}
          className="w-full"
        />
        <span className="text-white text-sm font-mono w-12 text-center">{formatTime(duration)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <input type="file" accept="video/*,audio/*" onChange={onFileUpload} className="hidden" id="movie-upload" />
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
            <label htmlFor="movie-upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </label>
          </Button>
          <LoadFromUrlPopover onLoad={onLoadFromUrl} />
        </div>
        
        <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={onPlayPause} className="text-white hover:bg-white/10">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
        </div>

        <div className="flex items-center space-x-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onMute} className="text-white hover:bg-white/10">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <div className="w-24">
              <Slider value={[isMuted ? 0 : volume]} onValueChange={onVolumeChange} max={1} step={0.01} />
            </div>
          </div>
          <SettingsMenu playbackRate={playbackRate} onPlaybackRateChange={onPlaybackRateChange} onQualityChange={onQualityChange} />
          <Button variant="ghost" size="sm" onClick={onFullscreen} className="text-white hover:bg-white/10">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;