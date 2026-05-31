import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { 
  Heart, 
  Sparkles, 
  Calendar, 
  Music, 
  User, 
  Upload, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Trash2,
  Check,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FloatingHearts from "./components/FloatingHearts";
import YouTubeWidget from "./components/YouTubeWidget";
import PhotoCarousel from "./components/PhotoCarousel";
import Chronometer from "./components/Chronometer";
import { saveSurpresa, getSurpresa, uploadPhoto, isFirebaseEnabled } from "./lib/firebase";
import { SurpresaData } from "./types";

export default function App() {
  // Navigation / Routing state
  const [view, setView] = useState<"create" | "partner" | "loading">("loading");
  const [surpriseId, setSurpriseId] = useState<string | null>(null);
  const [currentSurprise, setCurrentSurprise] = useState<SurpresaData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isOpened, setIsOpened] = useState(false);

  // Form input states
  const [partner1, setPartner1] = useState("");
  const [partner2, setPartner2] = useState("");
  const [startDate, setStartDate] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [history, setHistory] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // URLs/base64

  // Interactive submission UI states
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // YouTube Music Search States
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [musicSearchResults, setMusicSearchResults] = useState<Array<{
    id: string;
    title: string;
    artist: string;
    previewUrl?: string;
    coverUrl?: string;
  }>>([]);
  const [musicPreviewUrl, setMusicPreviewUrl] = useState<string | undefined>(undefined);
  const [musicCoverUrl, setMusicCoverUrl] = useState<string | undefined>(undefined);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isYouTubeDemo, setIsYouTubeDemo] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);

  const searchMusic = async (query: string) => {
    if (!query.trim()) {
      setMusicSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearchingMusic(true);
    setShowSearchDropdown(true);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const result = await res.json();
        setMusicSearchResults(result.tracks || []);
        setIsYouTubeDemo(!!result.isDemo);
      }
    } catch (err) {
      console.error("Erro ao realizar busca de músicas:", err);
    } finally {
      setIsSearchingMusic(false);
    }
  };

  const handleMusicSearchChange = (val: string) => {
    setMusicSearchQuery(val);
    setMusicTitle(val); // fallback search name

    if (searchTimer) clearTimeout(searchTimer);

    const newTimer = setTimeout(() => {
      searchMusic(val);
    }, 500); // 500ms debounce

    setSearchTimer(newTimer);
  };

  const handleSelectTrack = (track: { title: string; artist: string; previewUrl?: string; coverUrl?: string }) => {
    setMusicTitle(track.title);
    setMusicArtist(track.artist);
    setMusicPreviewUrl(track.previewUrl);
    setMusicCoverUrl(track.coverUrl);
    setMusicSearchQuery(`${track.title} - ${track.artist}`);
    setShowSearchDropdown(false);
  };

  useEffect(() => {
    // Check if '?id=xyz' exists in the search query parameters
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (id) {
      setSurpriseId(id);
      loadSurprise(id);
    } else {
      setView("create");
    }
  }, []);

  const loadSurprise = async (id: string) => {
    setView("loading");
    setIsOpened(false);
    try {
      const data = await getSurpresa(id);
      if (data) {
        setCurrentSurprise(data);
        setView("partner");
      } else {
        setFetchError("Essa linda homenagem de amor não foi localizada ou expirou.");
        setView("create");
      }
    } catch (err: any) {
      console.error(err);
      setFetchError("Não foi possível carregar os dados do casamento/casal.");
      setView("create");
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress("Preparando imagens...");
    
    const uploadedUrls: string[] = [...photos];
    const totalFiles = Math.min(files.length, 10 - photos.length); // limit to 10 photos

    for (let i = 0; i < totalFiles; i++) {
      setUploadProgress(`Processando foto ${i + 1} de ${totalFiles}...`);
      try {
        const url = await uploadPhoto(files[i]);
        uploadedUrls.push(url);
      } catch (err) {
        console.error("Erro ao subir imagem:", err);
      }
    }

    setPhotos(uploadedUrls);
    setIsUploading(false);
    setUploadProgress("");
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!partner1.trim() || !partner2.trim() || !startDate || !history.trim()) {
      alert("Por favor, preencha todos os campos fundamentais!");
      return;
    }

    setIsSubmitting(true);

    let finalTitle = musicTitle || "Nossa Canção";
    let finalArtist = musicArtist || "Artista";
    let finalPreviewUrl = musicPreviewUrl;
    let finalCoverUrl = musicCoverUrl;

    // Self-healing: if they typed a music search name but forgot to click / select a specific item
    if (!finalPreviewUrl && musicSearchQuery.trim() && musicSearchResults.length > 0) {
      const topMatch = musicSearchResults[0];
      finalTitle = topMatch.title;
      finalArtist = topMatch.artist;
      finalPreviewUrl = topMatch.previewUrl;
      finalCoverUrl = topMatch.coverUrl;
    } else if (!finalPreviewUrl && musicSearchQuery.trim()) {
      // Freeform custom text that didn't select an autocomplete suggestion
      const parts = musicSearchQuery.split("-");
      if (parts.length > 1) {
        finalTitle = parts[0].trim();
        finalArtist = parts.slice(1).join("-").trim();
      } else {
        finalTitle = musicSearchQuery.trim();
        finalArtist = "Artista Tema";
      }
    }

    try {
      const resultId = await saveSurpresa({
        partner1,
        partner2,
        startDate,
        musicTitle: finalTitle,
        musicArtist: finalArtist,
        musicPreviewUrl: finalPreviewUrl,
        musicCoverUrl: finalCoverUrl,
        history,
        photos,
        createdAt: new Date().toISOString(),
      });

      // Assemble share link matching client requirements
      const liveUrl = `${window.location.origin}${window.location.pathname}?id=${resultId}`;
      setShareLink(liveUrl);
      setSurpriseId(resultId);
      
      // Load generated surprise to show instant preview
      const freshData = await getSurpresa(resultId);
      if (freshData) {
        setCurrentSurprise(freshData);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao fabricar homenagem romântica.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Helper to format relationship title names
  const getCoupleHeading = (p1: string, p2: string) => {
    return `${p1} & ${p2}`;
  };

  const resetForm = () => {
    setPartner1("");
    setPartner2("");
    setStartDate("");
    setMusicTitle("");
    setMusicArtist("");
    setMusicPreviewUrl(undefined);
    setMusicCoverUrl(undefined);
    setMusicSearchQuery("");
    setMusicSearchResults([]);
    setHistory("");
    setPhotos([]);
    setShareLink("");
    setSurpriseId(null);
    setCurrentSurprise(null);
    setIsOpened(false);
  };

  // RENDER LOADING SCREEN
  if (view === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <FloatingHearts />
        <div className="z-10 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <Heart size={48} className="text-purple-500 animate-[pulse_1.5s_infinite] fill-purple-500/20" />
            <Sparkles size={24} className="text-cyan-400 absolute -top-1 -right-1 animate-bounce" />
          </div>
          <h1 className="text-lg font-mono font-medium tracking-widest text-cyan-400 uppercase">
            Buscando romance nas estrelas...
          </h1>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed font-mono">
            Carregando sua carta cósmica de amor e memórias afetivas
          </p>
          <Loader2 size={24} className="text-purple-400 animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // RENDER PARTNER DELIVERABLE (THE GIFT SITE CODES)
  if (view === "partner" && currentSurprise) {
    if (!isOpened) {
      return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center overflow-hidden relative select-none">
          <FloatingHearts />
          
          {/* Ambient background glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-purple-900/15 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/3 w-[280px] h-[280px] bg-cyan-800/10 rounded-full blur-[80px] pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="z-10 max-w-sm w-full flex flex-col items-center gap-6 bg-slate-950/40 border border-slate-900/50 rounded-3xl p-8 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            {/* Elegant Header Tag */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-mono tracking-[0.3em] text-cyan-400 uppercase font-black px-3 py-1 bg-cyan-950/20 border border-cyan-500/20 rounded-full w-fit mx-auto">
                Surpresa Especial
              </span>
              <h2 className="text-xl font-bold tracking-tight text-gray-200 mt-2">
                Um presente de amor foi preparado para você...
              </h2>
            </div>

            {/* PULSING INTERACTIVE ENVELOPE / BEATING HEART CONTAINER */}
            <div className="relative my-6 flex items-center justify-center">
              {/* Expanding circular ripple ripples */}
              <div className="absolute w-36 h-36 border border-cyan-500/20 rounded-full animate-[ping_2s_infinite] pointer-events-none" />
              <div className="absolute w-44 h-44 border border-purple-500/10 rounded-full animate-[ping_3.5s_infinite] pointer-events-none" style={{ animationDelay: "1s" }} />

              <motion.button
                id="open-gift-wrapping-btn"
                onClick={() => setIsOpened(true)}
                className="relative w-32 h-32 flex flex-col items-center justify-center rounded-full bg-gradient-to-tr from-cyan-950/60 to-purple-950/60 border border-purple-500/40 hover:border-cyan-400 transition-colors shadow-[0_0_35px_rgba(147,51,234,0.2)] hover:shadow-[0_0_45px_rgba(6,182,212,0.4)] group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: [1, 1.06, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Visual heart glow layer inside */}
                <span className="absolute inset-2 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 rounded-full blur-sm pointer-events-none group-hover:from-cyan-500/20 group-hover:to-purple-500/20 transition-all" />

                <Heart 
                  size={48} 
                  className="text-cyan-400 group-hover:text-pink-500 stroke-[1.5] drop-shadow-[0_0_12px_rgba(0,210,255,0.7)] group-hover:drop-shadow-[0_0_20px_rgba(244,63,94,0.9)] transition-all duration-500 transform group-hover:scale-105" 
                  fill="rgba(6,182,212,0.15)"
                />
                
                {/* Pulsing caption in the heart */}
                <span className="absolute bottom-6 text-[10px] font-mono font-black uppercase tracking-[0.4em] text-white/90 group-hover:text-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-colors">
                  Abre
                </span>
              </motion.button>
            </div>

            {/* Brief personalized labels */}
            <div className="flex flex-col gap-1 select-text">
              <span className="text-[10px] font-mono tracking-widest text-purple-300 uppercase font-bold">
                Para: {currentSurprise.partner2}
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                De: {currentSurprise.partner1}
              </span>
            </div>

            {/* Interactive hint */}
            <p className="text-[10px] text-gray-500 font-mono tracking-wider leading-relaxed px-1 animate-pulse">
              Clique no coração para abrir a embalagem e descobrir o seu presente... 
            </p>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white pb-20 px-4 relative overflow-hidden font-sans flex flex-col items-center justify-start select-none">
        <FloatingHearts />

        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-10 left-1/4 w-[350px] h-[350px] bg-cyan-700/10 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Floating Quick Action to create a custom new one if the view is a shared page */}
        <div className="absolute top-4 left-4 z-40">
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/80 text-gray-400 hover:text-white border border-slate-800 text-xs rounded-full font-mono transition-colors"
          >
            <Sparkles size={11} className="text-cyan-400 animate-pulse" />
            Criar Surpresa
          </button>
        </div>

        {/* MAIN GIFT ENGINE SCROLL CONTAINER */}
        <div className="w-full max-w-lg mx-auto flex flex-col gap-10 mt-16 z-20">

          {/* Heading Cover Frame */}
          <div className="text-center flex flex-col items-center gap-2">
            <div className="relative inline-flex items-center justify-center mb-1">
              <span className="absolute w-24 h-24 bg-cyan-500/30 rounded-full blur-2xl animate-pulse" />
              <Heart size={44} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,210,255,0.7)]" fill="rgba(6,182,212,0.1)" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-white to-purple-500 bg-clip-text text-transparent transform hover:scale-102 transition-transform duration-500">
              {getCoupleHeading(currentSurprise.partner1, currentSurprise.partner2)}
            </h1>
            <p className="text-xs uppercase tracking-widest font-mono text-purple-300 font-bold mt-1 shadow-sm">
              Nossa História Infinita
            </p>
          </div>

          {/* YOUTUBE THEME MUSIC AUDIO WIDGET */}
          <YouTubeWidget 
            title={currentSurprise.musicTitle} 
            artist={currentSurprise.musicArtist}
            previewUrl={currentSurprise.musicPreviewUrl}
            coverUrl={currentSurprise.musicCoverUrl}
            autoPlay={true}
          />

          {/* VERTICAL PHONE PHOTO SLIDER */}
          <div className="flex flex-col gap-2">
            <PhotoCarousel photos={currentSurprise.photos} />
          </div>

          {/* RELATIONSHIP CHRONOMETER CLOCK */}
          <Chronometer startDateStr={currentSurprise.startDate} />

          {/* OUR ROMANTIC NARRATIVE BLOCK */}
          <div className="w-full max-w-md mx-auto bg-slate-950/70 border border-purple-500/20 rounded-2xl p-6 sm:p-8 relative shadow-[0_0_30px_rgba(157,78,237,0.1)] backdrop-blur-md">
            {/* Elegant laser quote line decoration */}
            <div className="absolute top-0 left-8 right-8 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_8px_rgba(157,78,237,0.8)]" />
            
            <div className="w-full flex justify-center mb-4 pb-1">
              <Heart size={20} className="text-cyan-400 animate-[bounce_1.5s_infinite]" fill="rgba(6,182,212,0.1)" />
            </div>

            {/* Romance declaration body text rendering */}
            <h6 className="text-center font-serif text-[15px] sm:text-base text-gray-200 italic leading-relaxed whitespace-pre-line px-1 select-text selection:bg-cyan-500/30">
              {currentSurprise.declaracao_ia || currentSurprise.history || "Nossa história de amor..."}
            </h6>

            {/* Forever signoff tag */}
            <div className="mt-8 pt-4 border-t border-slate-900 flex flex-col items-center gap-1">
              <span className="text-gray-500 text-[10px] font-mono tracking-wider uppercase">Juntos para Sempre</span>
              <p className="text-base sm:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-sans mt-0.5">
                Te amo para sempre ❤️
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // RENDER CUSTOMER INITIAL CREATION DESIGN (FORMULÁRIO DO CLIENTE)
  return (
    <div className="min-h-screen bg-black text-white pb-24 px-4 relative overflow-hidden font-sans flex flex-col items-center justify-start select-none">
      <FloatingHearts />

      {/* Dynamic Laser background nodes */}
      <div className="absolute top-[-100px] left-[10%] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-20 right-[5%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Main Form Center Shell Container */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-6 mt-12 z-20">

        {/* Central visual header banner */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="relative inline-flex items-center justify-center mb-1">
            <span className="absolute w-20 h-20 bg-purple-500/25 rounded-full blur-2xl animate-pulse" />
            <Heart size={40} className="text-purple-500 drop-shadow-[0_0_12px_rgba(157,78,237,0.7)]" fill="rgba(157,78,237,0.1)" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white via-gray-200 to-cyan-400 bg-clip-text text-transparent">
            Web App do Dia dos Namorados
          </h1>
          <p className="text-xs text-gray-400 font-mono tracking-wider leading-relaxed max-w-sm px-6">
            Configure um presente virtual sob medida para o seu amor, com cronômetro de relacionamento, fotos marcantes, música de tema especial e a sua carta de declaração!
          </p>
        </div>

        {/* Notification warnings */}
        {fetchError && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-200 text-xs px-4 py-3 rounded-xl flex items-center justify-between font-mono gap-2 shadow-md">
            <span>{fetchError}</span>
            <button onClick={() => setFetchError(null)} className="text-red-400 hover:text-white font-bold ml-2">ok</button>
          </div>
        )}

        {/* MAIN CREATION / GENERATION PANEL */}
        {!shareLink ? (
          <form
            id="creation-form"
            onSubmit={handleFormSubmit}
            className="w-full bg-slate-950/80 border border-purple-500/20 rounded-3xl p-6 sm:p-8 flex flex-col gap-5 shadow-[0_0_30px_rgba(157,78,237,0.1)] relative backdrop-blur-lg"
          >
            {/* Top Cyan glowing boundary lines */}
            <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_6px_rgba(0,210,255,0.7)]" />

            {/* Inputs: Couples Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                  <User size={12} /> Seu Nome
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome de quem presenteia"
                  value={partner1}
                  onChange={(e) => setPartner1(e.target.value)}
                  className="bg-black/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase flex items-center gap-1.5">
                  <User size={12} /> Nome do Parceiro(a)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do seu amor"
                  value={partner2}
                  onChange={(e) => setPartner2(e.target.value)}
                  className="bg-black/80 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 font-medium transition-all"
                />
              </div>
            </div>

            {/* Input: Relationship Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                <Calendar size={12} /> Data de Início do Relacionamento
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-mono transition-all cursor-pointer"
              />
            </div>

            {/* Inputs: Theme Music Information with Live YouTube Autocomplete */}
            <div className="flex flex-col gap-1.5 bg-black/40 border border-slate-900 p-4 rounded-2xl relative">
              <label className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <Music size={12} /> Canção Tema do Casal
                </span>
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Busca Integrada YouTube</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquise por música ou artista... (ex: Perfect, All of Me)"
                  value={musicSearchQuery}
                  onChange={(e) => handleMusicSearchChange(e.target.value)}
                  onFocus={() => {
                    if (musicSearchQuery.trim()) setShowSearchDropdown(true);
                  }}
                  className="w-full bg-black border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-all font-sans"
                />
                
                {isSearchingMusic && (
                  <div className="absolute right-3.5 top-3.5 flex items-center">
                    <Loader2 size={16} className="text-purple-400 animate-spin" />
                  </div>
                )}

                {/* Autocomplete Search Dropdown */}
                {showSearchDropdown && musicSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-[105%] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.8)] z-50 max-h-56 overflow-y-auto divide-y divide-slate-900">
                    {isYouTubeDemo && (
                      <div className="p-3 bg-purple-950/40 text-[10px] text-purple-200 font-sans leading-relaxed border-b border-slate-900 flex items-start gap-2 select-none">
                        <span className="flex-shrink-0 text-cyan-400 mt-0.5">✨</span>
                        <span>
                          <strong>Modo de Busca Assistida:</strong> Exibindo presets românticos sugeridos pelo YouTube Engine para uma ótima experiência inicial.
                        </span>
                      </div>
                    )}
                    {musicSearchResults.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handleSelectTrack(track)}
                        className="flex items-center gap-3 p-3 hover:bg-purple-900/20 transition-all cursor-pointer text-left select-none"
                      >
                        <img
                          src={track.coverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=100&auto=format&fit=crop"}
                          alt={track.title}
                          className="w-9 h-9 object-cover rounded shadow-md flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-bold text-gray-100 truncate">{track.title}</p>
                          <p className="text-[10px] text-purple-300 truncate mt-0.5">{track.artist}</p>
                        </div>
                        {track.previewUrl && (
                          <span className="text-[9px] font-mono font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                            Áudio
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Show Active Selected Music Plate */}
              {musicTitle && musicArtist && (
                <div className="mt-3 bg-slate-950/70 border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3 shadow-[0_0_15px_rgba(0,210,255,0.05)] relative overflow-hidden animate-fade-in">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                  <img
                    src={musicCoverUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=100&auto=format&fit=crop"}
                    alt={musicTitle}
                    className="w-10 h-10 object-cover rounded-lg shadow border border-white/10 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-grow min-w-0">
                    <span className="text-[9px] font-mono uppercase text-cyan-400 tracking-wider font-semibold block">Trilha Ativa:</span>
                    <h5 className="text-xs font-bold text-white truncate mt-0.5">{musicTitle}</h5>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{musicArtist}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input: Couple's Narrative History Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                  <Heart size={12} className="text-cyan-400 animate-[bounce_1.5s_infinite]" fill="rgba(6,182,212,0.1)" /> História do Casal e Declaração
                </label>
              </div>
              <textarea
                required
                rows={4}
                maxLength={4500}
                placeholder="Conte com suas próprias palavras como se conheceram, descreva momentos marcantes da história de vocês ou escreva uma declaração apaixonada para o seu amor!"
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                className="bg-black/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 font-sans transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Input: Photos Upload container box */}
            <div className="flex flex-col gap-1.5 select-none hover:border-slate-800 transition-colors">
              <label className="text-xs font-mono font-bold tracking-wider text-purple-400 uppercase flex items-center gap-1.5">
                <Upload size={12} /> Upload de Fotos ({photos.length}/10)
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-black/60 hover:bg-black/90 border border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={photos.length >= 10 || isUploading}
                />
                <Upload size={24} className="text-purple-400/80 animate-pulse" />
                <span className="text-xs text-gray-400 font-medium text-center">
                  Arraste ou clique para adicionar fotos de vocês
                </span>
                <span className="text-[9px] text-gray-600 font-mono">
                  Formatos aceitos: JPG, PNG, WEBP (Máx. 10 arquivos)
                </span>
              </div>

              {/* Upload dynamic spinner indicator */}
              {isUploading && (
                <div className="flex items-center gap-2 py-1 px-2 border border-slate-900 bg-black/50 rounded-lg text-[11px] font-mono text-cyan-400 w-fit">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Multi-Photo Grid Previews */}
              {photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-2 p-1 bg-black/40 rounded-xl border border-slate-900">
                  {photos.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 group bg-slate-950">
                      <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute inset-0 bg-red-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-100 cursor-pointer"
                        title="Remover foto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <button
              id="submit-generate-web-app-btn"
              type="submit"
              disabled={isSubmitting || isUploading}
              className="w-full mt-2 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:scale-[1.01] active:scale-[0.99] text-white py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(0,d2,ff,0.35)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Fabricando sua surpresa especial...</span>
                </>
              ) : (
                <>
                  <Heart size={16} fill="currentColor" className="text-white" />
                  <span>Gerar Web App Romântico</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* RESULT SCREEN - DELIVER CREATED APPS & SHARE CONTROLS */
          <div className="w-full bg-slate-950/80 border border-cyan-400/30 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-[0_0_25px_rgba(0,210,255,0.15)] relative backdrop-blur-lg">
            
            <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_6px_rgba(157,78,237,0.7)]" />

            {/* Glowing check circle inside simple cards layout constraint */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center text-cyan-400 mb-1">
                <Check size={24} className="animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-gray-100">Homenagem Criada!</h3>
              <p className="text-xs text-gray-400 font-mono tracking-wide px-4">
                O site romântico personalizado para o seu amor já está pronto para ser enviado!
              </p>
            </div>

            {/* The constructed dynamic linkage block */}
            <div className="flex flex-col gap-2 bg-black/80 border border-slate-900 rounded-2xl p-4">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-black">
                Link Único do Presente:
              </span>
              
              <div className="flex items-center gap-2 mt-1 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 overflow-hidden">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="bg-transparent text-xs text-gray-300 font-mono outline-none flex-grow truncate select-all"
                />
                
                <button
                  id="copy-to-clipboard-btn"
                  onClick={copyToClipboard}
                  className="flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-gray-300 hover:text-white p-2 rounded-lg border border-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                  title="Copiar Link"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>

              {copied && (
                <span className="text-[10px] font-mono font-medium text-emerald-400 mt-0.5 animate-pulse flex items-center gap-1">
                  ✓ Link copiado para a área de transferência!
                </span>
              )}
            </div>

            {/* Share action instructions */}
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-400 font-sans border-t border-slate-900 pt-4">
              <p>
                💝 <strong className="text-purple-300">Como entregar o presente?</strong> Copie o link acima e envie para o seu parceiro(a). Ao abrir, ele(a) carregará o cronômetro com sua canção favorita, as memórias e a sua bela declaração de amor!
              </p>
              <p>
                ⚡ <strong className="text-cyan-300">Banco de Dados Ativo:</strong> {isFirebaseEnabled ? "Hospedado com sucesso em seu Cloud Firestore sob demanda." : "Sincronizado via motor simulado local."}
              </p>
            </div>

            {/* Inline Preview Control and Reset Action Trigger */}
            <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-900">
              <button
                id="view-created-surprise-btn"
                onClick={() => setView("partner")}
                className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-black font-extrabold py-3 rounded-xl text-xs tracking-wider uppercase transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                Visualizar Site <ChevronRight size={13} />
              </button>

              <button
                onClick={resetForm}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white py-3 rounded-xl text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} /> Criar Outro
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
