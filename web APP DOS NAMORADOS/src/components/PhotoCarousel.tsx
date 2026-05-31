import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";

interface PhotoCarouselProps {
  photos: string[];
}

// Gorgeous curated fallback default illustrations for love stories
const FALLBACK_カップル_IMAGES = [
  "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=700&auto=format&fit=crop", // candle light romantic sunset
  "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=700&auto=format&fit=crop", // holding hands heart silhouette
  "https://images.unsplash.com/photo-1494972308805-463bc619b34e?q=80&w=700&auto=format&fit=crop", // walk together romantic street light
];

export default function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const finalPhotos = photos && photos.length > 0 ? photos : FALLBACK_カップル_IMAGES;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Autoslide interval matching the vertical phone vibe
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % finalPhotos.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [finalPhotos.length]);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + finalPhotos.length) % finalPhotos.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % finalPhotos.length);
  };

  return (
    <div
      id="photo-carousel-outer-wrapper"
      className="w-full max-w-[280px] xs:max-w-[320px] aspect-[9/16] mx-auto bg-black border-[3px] border-gradient-to-b border-purple-500/50 rounded-[35px] p-2 shadow-[0_0_25px_rgba(157,78,237,0.25)] relative overflow-hidden flex items-center justify-center group"
    >
      {/* Decorative Cellphone Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-xl z-20 flex items-center justify-center border-b border-purple-500/20">
        <span className="w-2 h-2 rounded-full bg-slate-800 ml-4 inline-block" />
        <span className="w-10 h-1 bg-slate-900 rounded-sm ml-2 inline-block" />
      </div>

      {/* Decorative Neon Glimmer Frames */}
      <div className="absolute -inset-0.5 rounded-[35px] bg-gradient-to-tr from-cyan-500 via-transparent to-purple-600 opacity-30 blur-sm pointer-events-none z-0" />

      {/* Inner Screen */}
      <div className="w-full h-full bg-slate-950 rounded-[28px] overflow-hidden relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10 pointer-events-none" />

        {/* Slidor Canvas */}
        <div className="w-full h-full relative">
          {finalPhotos.map((url, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
                i === currentIndex
                  ? "opacity-100 scale-100 translate-x-0"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
              style={{ transitionProperty: "opacity, transform" }}
            >
              <img
                src={url}
                alt={`Memória ${i + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>

        {/* Custom Navigation Chevrons */}
        <button
          onClick={handlePrev}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
        >
          <ChevronRight size={18} />
        </button>

        {/* Small floating love watermark */}
        <div className="absolute top-10 right-4 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full border border-pink-500/30 text-[10px] text-pink-300 font-mono font-medium">
          <Heart size={10} fill="currentColor" stroke="none" className="animate-pulse" />
          Memórias
        </div>

        {/* Pagination Dots at Bottom */}
        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-1.5 z-20 pointer-events-none">
          {finalPhotos.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-4 bg-cyan-400" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
