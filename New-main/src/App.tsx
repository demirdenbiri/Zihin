import React, { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NoteProvider, useNotes } from "./contexts/NoteContext";
import { Note, Mood, NoteCategory } from "./types";
import { analyzeNote, transformToLyrics, transcribeAudio } from "./services/geminiService";
import { cn, formatDate } from "./lib/utils";
import { 
  Plus, 
  Mic, 
  Trash2, 
  Music, 
  Clock, 
  MapPin, 
  Smile, 
  Sparkles, 
  LogOut, 
  Search, 
  Filter, 
  StickyNote as StickyIcon,
  X,
  Check,
  ChevronRight,
  Loader2,
  BrainCircuit,
  Bold,
  Highlighter,
  Underline,
  List,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

// --- Components ---

const MoodBadge = ({ mood }: { mood: Mood }) => {
  const colors: Record<Mood, string> = {
    happy: "bg-yellow-100 text-yellow-700",
    sad: "bg-blue-100 text-blue-700",
    inspired: "bg-purple-100 text-purple-700",
    thoughtful: "bg-indigo-100 text-indigo-700",
    energetic: "bg-orange-100 text-orange-700",
    calm: "bg-teal-100 text-teal-700",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", colors[mood])}>
      {mood}
    </span>
  );
};

const CategoryBadge = ({ category }: { category: NoteCategory }) => {
  const colors: Record<NoteCategory, string> = {
    idea: "bg-amber-100 text-amber-700",
    inspiration: "bg-pink-100 text-pink-700",
    memory: "bg-emerald-100 text-emerald-700",
    status: "bg-slate-100 text-slate-700",
    reminder: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", colors[category])}>
      {category}
    </span>
  );
};

const NoteCard = ({ note }: { note: Note }) => {
  const { deleteNote, updateNote } = useNotes();
  const [isTransforming, setIsTransforming] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const handleTransform = async () => {
    if (note.lyrics) {
      setShowLyrics(!showLyrics);
      return;
    }
    
    setIsTransforming(true);
    try {
      const lyrics = await transformToLyrics(note.content);
      await updateNote(note.id, { lyrics, isPoetic: true });
      setShowLyrics(true);
      toast.success("Şarkı sözlerine dönüştürüldü!");
    } catch (error) {
      toast.error("Dönüştürme başarısız oldu.");
    } finally {
      setIsTransforming(false);
    }
  };

  const isExpired = note.expiresAt && new Date(note.expiresAt) < new Date();

  if (isExpired) {
    // In a real app, we might have a background job or delete on render
    return null;
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group relative p-6 rounded-2xl border transition-all duration-300",
        note.type === 'sticky' 
          ? "bg-yellow-50 border-yellow-200 shadow-sm rotate-1 hover:rotate-0" 
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          {note.mood && <MoodBadge mood={note.mood} />}
          <CategoryBadge category={note.category} />
          {note.type === 'sticky' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              <Clock className="w-3 h-3" />
              Hızlı Not
            </span>
          )}
        </div>
        <button 
          onClick={() => deleteNote(note.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-opacity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {showLyrics && note.lyrics ? (
          <div className="prose prose-sm max-w-none text-slate-700 italic font-serif">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{note.lyrics}</ReactMarkdown>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{note.content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
        <div className="flex items-center gap-3">
          <span>{formatDate(note.createdAt)}</span>
          {note.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {note.location.address || "Konum"}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleTransform}
            disabled={isTransforming}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg transition-colors",
              note.isPoetic ? "text-purple-600 bg-purple-50" : "hover:bg-slate-50"
            )}
          >
            {isTransforming ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Music className="w-3 h-3" />
            )}
            {note.isPoetic ? "Sözleri Gör" : "Şarkı Yap"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const NoteCreator = () => {
  const { addNote } = useNotes();
  const [content, setContent] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      });
    }
  }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeNote(content);
      
      const expiresAt = isSticky 
        ? new Date(Date.now() + 1000 * 60 * 60).toISOString() // 1 hour for sticky
        : undefined;

      await addNote({
        content,
        mood: analysis.mood,
        category: analysis.category,
        type: isSticky ? 'sticky' : 'regular',
        location: location,
        expiresAt
      });

      setContent("");
      setIsSticky(false);
      toast.success("Not kaydedildi!");
    } catch (error) {
      toast.error("Not analiz edilemedi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    setContent(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const text = textarea.value;
      const lastLine = text.substring(0, start).split('\n').pop() || "";

      if (lastLine.startsWith('• ')) {
        e.preventDefault();
        const newText = text.substring(0, start) + '\n• ' + text.substring(start);
        setContent(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start + 3, start + 3);
        }, 0);
      } else if (lastLine.startsWith('- [ ] ')) {
        e.preventDefault();
        const newText = text.substring(0, start) + '\n- [ ] ' + text.substring(start);
        setContent(newText);
        setTimeout(() => {
          textarea.setSelectionRange(start + 7, start + 7);
        }, 0);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          toast.promise(transcribeAudio(base64Audio), {
            loading: 'Ses yazıya dökülüyor...',
            success: (text) => {
              setContent(prev => prev + (prev ? " " : "") + text);
              return 'Ses başarıyla aktarıldı!';
            },
            error: 'Ses aktarımı başarısız oldu.'
          });
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Mikrofon erişimi reddedildi.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-12">
      <div className="p-6">
        <div className="flex items-center gap-1 mb-4 pb-2 border-b border-slate-50">
          <button onClick={() => insertText("**", "**")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Kalın"><Bold className="w-4 h-4" /></button>
          <button onClick={() => insertText("<mark>", "</mark>")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Vurgu"><Highlighter className="w-4 h-4" /></button>
          <button onClick={() => insertText("<u>", "</u>")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Altı Çizili"><Underline className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <button onClick={() => insertText("• ")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Liste"><List className="w-4 h-4" /></button>
          <button onClick={() => insertText("- [ ] ")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Checklist"><Square className="w-4 h-4" /></button>
        </div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Neler düşünüyorsun? Bir anı, bir fikir, bir ilham..."
          className="w-full h-32 resize-none border-none focus:ring-0 text-lg text-slate-800 placeholder:text-slate-400"
        />
        
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "p-3 rounded-full transition-all duration-300",
                isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSticky(!isSticky)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                isSticky ? "bg-yellow-100 text-yellow-700 border border-yellow-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <StickyIcon className="w-4 h-4" />
              {isSticky ? "Hızlı Not (1 Saat)" : "Hızlı Not Yap"}
            </button>
          </div>

          <button 
            onClick={handleCreate}
            disabled={!content.trim() || isAnalyzing}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-slate-200"
          >
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ currentFilter, setFilter }: { currentFilter: string, setFilter: (f: string) => void }) => {
  const { logout, profile } = useAuth();
  
  const filters = [
    { id: 'all', label: 'Tüm Notlar', icon: Sparkles },
    { id: 'sticky', label: 'Hızlı Notlar', icon: StickyIcon },
    { id: 'idea', label: 'Fikirler', icon: BrainCircuit },
    { id: 'inspiration', label: 'İlhamlar', icon: Music },
    { id: 'memory', label: 'Anılar', icon: MapPin },
  ];

  return (
    <div className="w-72 flex-shrink-0 border-r border-slate-200 h-screen sticky top-0 bg-slate-50/50 flex flex-col p-8">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
          <Sparkles className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">MindFlow</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              currentFilter === f.id 
                ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full bg-slate-200"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{profile?.displayName || "Kullanıcı"}</p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { notes, loading } = useNotes();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState("");

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.content.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'sticky') return n.type === 'sticky' && matchesSearch;
    return n.category === filter && matchesSearch;
  });

  return (
    <div className="flex-1 min-h-screen bg-white flex">
      <Sidebar currentFilter={filter} setFilter={setFilter} />
      
      <main className="flex-1 p-12 max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-2">Merhaba!</h2>
            <p className="text-slate-500">Bugün aklında neler var?</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Notlarda ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
        </header>

        <NoteCreator />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredNotes.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-slate-300 w-8 h-8" />
            </div>
            <p className="text-slate-400 font-medium">Henüz bir not bulunmuyor.</p>
          </div>
        )}
      </main>
    </div>
  );
};

const Login = () => {
  const { signIn } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Sparkles className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">MindFlow AI</h1>
        <p className="text-slate-500 mb-12 leading-relaxed">
          Yapay zeka destekli akıllı not alma deneyimi. Fikirlerini, anılarını ve ilhamlarını dijital bir akışa dönüştür.
        </p>
        <button 
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Google ile Devam Et
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <NoteProvider>
        <AppContent />
        <Toaster position="bottom-right" richColors />
      </NoteProvider>
    </AuthProvider>
  );
}
