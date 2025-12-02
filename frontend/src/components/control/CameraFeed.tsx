import { useState, useRef } from 'react';
import { api } from '../../api/client';
import { Camera, CameraOff, Maximize2, RefreshCw, Loader2 } from 'lucide-react';

interface CameraFeedProps {
  printerId: number;
  isConnected: boolean;
}

export function CameraFeed({ printerId, isConnected }: CameraFeedProps) {
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const streamUrl = api.getCameraStreamUrl(printerId, 10);

  const handleToggleStream = () => {
    if (streamEnabled) {
      setStreamEnabled(false);
      setError(null);
    } else {
      setIsLoading(true);
      setError(null);
      setStreamEnabled(true);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load camera stream');
  };

  const handleFullscreen = () => {
    if (imgRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        imgRef.current.requestFullscreen();
      }
    }
  };

  const handleRefresh = () => {
    setStreamEnabled(false);
    setTimeout(() => {
      setIsLoading(true);
      setStreamEnabled(true);
    }, 100);
  };

  return (
    <div className="relative w-full h-full bg-black">
      {!streamEnabled ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-bambu-gray">
          <div className="bg-bambu-dark-secondary rounded-lg p-6 flex flex-col items-center">
            <Camera className="w-8 h-8 mb-2" />
            <span className="text-sm mb-3">
              {isConnected ? 'Click Start to view camera' : 'Printer not connected'}
            </span>
            <button
              onClick={handleToggleStream}
              disabled={!isConnected}
              className="px-4 py-1.5 rounded text-sm bg-bambu-green text-white hover:bg-bambu-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start
            </button>
          </div>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-bambu-green" />
            </div>
          )}
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
              <CameraOff className="w-12 h-12 mb-2" />
              <span className="text-sm">{error}</span>
              <button
                onClick={handleRefresh}
                className="mt-2 text-xs text-bambu-green hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={streamUrl}
              alt="Camera stream"
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          {/* Overlay controls */}
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded bg-black/50 hover:bg-black/70 text-white transition-colors"
              title="Refresh stream"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2 rounded bg-black/50 hover:bg-black/70 text-white transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleStream}
              className="px-3 py-1.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-sm transition-colors"
            >
              Stop
            </button>
          </div>
        </>
      )}
    </div>
  );
}
