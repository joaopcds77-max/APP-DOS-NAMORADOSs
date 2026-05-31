import { useState, useEffect, useRef, MouseEvent } from "react";
import { Play, Pause, Music, Volume2, VolumeX } from "lucide-react";

interface YouTubeWidgetProps {
  title: string;
  artist: string;
  previewUrl?: string; // YouTube Video ID
  coverUrl?: string;
  autoPlay?: boolean;
}

const DEFAULT_FALLBACK_AUDIO = "9E6b3swg0Hs"; // Chopin Nocturne Op 9 No 2 YouTube Video ID

export default function YouTubeWidget({ title, artist, previewUrl, coverUrl, autoPlay = false }: YouTubeWidgetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationSec, setDurationSec] = useState(180);
  const [currentTimeVal, setCurrentTimeVal] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isYouTubeSource = (src?: string) => {
    if (!src) return false;
    if (src.includes("youtube.com") || src.includes("youtu.be")) return true;
    if (!src.includes("://") && src.length === 11) return true; // typical 11-char ID
    return false;
  };

  const extractVideoId = (src?: string) => {
    if (!src) return "";
    if (src.includes("youtube.com")) {
      try {
        const urlObj = new URL(src);
        return urlObj.searchParams.get("v") || "";
      } catch (e) {
        return "";
      }
    }
    if (src.includes("youtu.be")) {
      return src.split("/").pop() || "";
    }
    return src;
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const trackSrc = previewUrl || DEFAULT_FALLBACK_AUDIO;
  const isYt = isYouTubeSource(trackSrc);
  const videoId = extractVideoId(trackSrc);

  // Helper to send frame control messages
  const sendCommand = (func: string, args: any = "") => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (e) {
        console.warn("Could not postMessage to YT frame:", e);
      }
    }
  };

  // Sync state changes with player
  useEffect(() => {
    if (isPlaying) {
      sendCommand("playVideo");
    } else {
      sendCommand("pauseVideo");
    }
  }, [isPlaying, videoId]);

  // Handle Mute
  useEffect(() => {
    if (isMuted) {
      sendCommand("mute");
    } else {
      sendCommand("unMute");
    }
  }, [isMuted, videoId]);

  // Local clock fallback for pristine interface ticking
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeVal((prev) => {
          if (prev >= durationSec) {
            // Loop back to start
            sendCommand("seekTo", [0, true]);
            sendCommand("playVideo");
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, durationSec]);

  // Parse window messages sent from YouTube Player API (infoDelivery)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        if (!event.origin.includes("youtube.com") && !event.origin.includes("youtube-nocookie.com")) {
          return;
        }
        
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        
        if (data.event === "infoDelivery" && data.info) {
          const info = data.info;
          if (info.currentTime !== undefined) {
            setCurrentTimeVal(Math.floor(info.currentTime));
          }
          if (info.duration !== undefined) {
            setDurationSec(Math.floor(info.duration));
          }
          if (info.playerState !== undefined) {
            if (info.playerState === 1) { // PLAYING
              setIsPlaying(true);
            } else if (info.playerState === 2) { // PAUSED
              setIsPlaying(false);
            }
          }
        }
      } catch (e) {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Reset progress on track change
  useEffect(() => {
    setCurrentTimeVal(0);
    setDurationSec(180);
    // AutoPlay might fail initially due to browser restrictions, 
    // but if we are permitted, we play. Otherwise, let user hit play.
    if (autoPlay) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [videoId, autoPlay]);

  const handlePlayPause = () => {
    setHasInteracted(true);
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleProgressBarClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const seekToTime = Math.floor(percentage * durationSec);
    
    setCurrentTimeVal(seekToTime);
    sendCommand("seekTo", [seekToTime, true]);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const progress = (currentTimeVal / durationSec) * 100;

  return (
    <div
      id="youtube-widget-container"
      className="w-full max-w-md mx-auto bg-black/85 border border-purple-500/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(157,78,237,0.15)] flex flex-col gap-3 relative overflow-hidden backdrop-blur-md"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Embedded YouTube Invisible IFrame Control Layer */}
      {videoId && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&rel=0&showinfo=0&iv_load_policy=3&loop=1&playlist=${videoId}&autoplay=${autoPlay ? 1 : 0}&mute=${isMuted ? 1 : 0}&origin=${window.location.origin}`}
          allow="autoplay"
          title="YouTube Audio Player"
          style={{ 
            position: "absolute", 
            width: "12px", 
            height: "12px", 
            opacity: 0.001, 
            pointerEvents: "none", 
            left: "-100px", 
            top: "-100px",
            overflow: "hidden" 
          }}
        />
      )}

      {/* Badge header */}
      <div className="flex items-center justify-between text-xs text-gray-500 font-mono tracking-widest uppercase">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-cyan-400' : 'bg-gray-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-cyan-500' : 'bg-gray-500'}`}></span>
          </span>
          {isYt ? "TEMA EM ÁUDIO DO YOUTUBE" : "TRILHA ROMÂNTICA"}
        </span>
        <Music size={12} className="text-purple-400 animate-pulse" />
      </div>

      <div className="flex items-center gap-4">
        {/* Cover Art Box */}
        <div className="relative flex-shrink-0 w-16 h-16 bg-gradient-to-tr from-purple-900 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg border border-purple-400/20 group overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Album Cover"
              className={`w-full h-full object-cover transition-transform duration-[8s] linear ${isPlaying ? 'scale-110' : 'scale-100'}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />
              <Music size={26} className={`text-white transition-transform duration-700 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
            </>
          )}
          {isPlaying && (
            <div className="absolute bottom-1 w-full flex justify-center gap-[3px] px-2 h-4 items-end bg-black/40 py-0.5 rounded-b-lg">
              <span className="w-1 h-3 bg-cyan-400 animate-[bounce_0.8s_infinite]" style={{ animationDelay: "0.1s" }} />
              <span className="w-1 h-4 bg-purple-400 animate-[bounce_0.8s_infinite]" style={{ animationDelay: "0.3s" }} />
              <span className="w-1 h-2 bg-cyan-400 animate-[bounce_0.8s_infinite]" style={{ animationDelay: "0.2s" }} />
            </div>
          )}
        </div>

        {/* Track Metadata */}
        <div className="flex-grow min-w-0">
          <h4 className="text-sm font-semibold text-gray-100 truncate tracking-wide font-sans">
            {title || "Nossa Canção Romântica"}
          </h4>
          <p className="text-xs text-purple-300 font-medium truncate mt-0.5 max-w-[200px]">
            {artist || "YouTube Audio"}
          </p>
          {!previewUrl && (
            <span className="text-[9px] text-cyan-400 font-mono tracking-wider animate-pulse flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
              Chopin - Noturno Op. 9 Nº 2
            </span>
          )}
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className="w-8 h-8 rounded-full bg-gray-900 border border-purple-500/20 flex items-center justify-center hover:bg-gray-800 text-gray-300 hover:text-white transition-all cursor-pointer"
            title={isMuted ? "Ativar som" : "Desativar som"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <button
            id="yt-play-pause-btn"
            onClick={handlePlayPause}
            className="flex-shrink-0 w-11 h-11 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,210,255,0.4)] hover:scale-105 active:scale-95 transition-all text-black border border-white/20 cursor-pointer"
            title={isPlaying ? "Pausar" : "Tocar Canção"}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" stroke="none" className="text-black" />
            ) : (
              <Play size={18} fill="currentColor" stroke="none" className="ml-1 text-black" />
            )}
          </button>
        </div>
      </div>

      {/* Progress timeline */}
      <div className="flex flex-col gap-1.5 mt-1 font-mono">
        <div
          id="yt-progress-track"
          onClick={handleProgressBarClick}
          className="w-full h-1.5 bg-gray-800 rounded-full cursor-pointer relative group"
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full relative shadow-[0_0_6px_rgba(0,210,255,0.6)]"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>{formatTime(currentTimeVal)}</span>
          <span>{formatTime(durationSec)}</span>
        </div>
      </div>

      {/* Play Helper Tooltip */}
      {!hasInteracted && !isPlaying && (
        <div className="text-[10px] text-center text-cyan-400/90 font-sans tracking-wide bg-cyan-950/20 border border-cyan-500/20 rounded-lg py-1 px-2 animate-pulse mt-0.5 select-none">
          ✨ Clique no botão <strong>Play</strong> para liberar e tocar a canção!
        </div>
      )}
    </div>
  );
}
