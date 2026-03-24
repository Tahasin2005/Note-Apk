/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback, useRef, type MouseEvent } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Pin, 
  PinOff, 
  Moon, 
  Sun, 
  Mic, 
  MicOff, 
  Volume2, 
  Download, 
  Tag, 
  Clock, 
  ChevronRight,
  X,
  Edit3,
  Save,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

const CATEGORIES = ['General', 'Work', 'Personal', 'Ideas', 'Tasks'];

export default function App() {
  // State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('smart-notebook-notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('smart-notebook-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derived State
  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId) || null
  , [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, searchQuery, selectedCategory]);

  // Effects
  useEffect(() => {
    localStorage.setItem('smart-notebook-notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('smart-notebook-dark-mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (activeNoteId) {
          updateNote(activeNoteId, { content: activeNote?.content + ' ' + transcript });
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [activeNoteId, activeNote?.content]);

  // Actions
  const createNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'New Note',
      content: '',
      category: 'General',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
  };

  const deleteNote = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (activeNoteId === id) setActiveNoteId(null);
    }
  };

  const togglePin = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === id);
    if (note) updateNote(id, { pinned: !note.pinned });
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakNote = () => {
    if (!activeNote) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(activeNote.content);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const exportNote = () => {
    if (!activeNote) return;
    const blob = new Blob([`${activeNote.title}\n\n${activeNote.content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 font-sans`}>
      
      {/* Sidebar */}
      <aside className="w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight italic serif">Notebook</h1>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['All', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' 
                  : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map(note => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`group p-4 rounded-2xl cursor-pointer transition-all border ${
                  activeNoteId === note.id 
                  ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold truncate pr-6">{note.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => togglePin(note.id, e)}
                      className={`p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 ${note.pinned ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}
                    >
                      {note.pinned ? <Pin size={14} fill="currentColor" /> : <Pin size={14} />}
                    </button>
                    <button 
                      onClick={(e) => deleteNote(note.id, e)}
                      className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
                  {note.content || 'No content...'}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Tag size={10} /> {note.category}
                  </span>
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredNotes.length === 0 && (
            <div className="text-center py-12 text-zinc-400">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>No notes found</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-stone-50/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <button 
            onClick={createNote}
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
          >
            <Plus size={20} /> New Note
          </button>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white dark:bg-zinc-900">
        <AnimatePresence mode="wait">
          {activeNote ? (
            <motion.div 
              key={activeNote.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              {/* Toolbar */}
              <header className="p-4 md:p-6 border-bottom border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <select 
                    value={activeNote.category}
                    onChange={(e) => updateNote(activeNote.id, { category: e.target.value })}
                    className="bg-zinc-100 dark:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded-full border-none focus:ring-0 cursor-pointer uppercase tracking-widest"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-mono">
                    <Clock size={12} />
                    Last edited {new Date(activeNote.updatedAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                  <button 
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}
                    title="Voice Input"
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button 
                    onClick={speakNote}
                    className={`p-2 rounded-xl transition-all ${isSpeaking ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'}`}
                    title="Read Aloud"
                  >
                    <Volume2 size={20} />
                  </button>
                  <button 
                    onClick={exportNote}
                    className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-all"
                    title="Export as TXT"
                  >
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={() => setActiveNoteId(null)}
                    className="md:hidden p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              </header>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 max-w-4xl mx-auto w-full">
                <input 
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  placeholder="Note Title"
                  className="w-full text-4xl md:text-6xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-zinc-200 dark:placeholder:text-zinc-800 tracking-tight"
                />
                <textarea 
                  value={activeNote.content}
                  onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                  placeholder="Start writing..."
                  className="w-full h-[calc(100vh-350px)] text-lg md:text-xl bg-transparent border-none focus:ring-0 resize-none placeholder:text-zinc-200 dark:placeholder:text-zinc-800 leading-relaxed"
                />
              </div>

              {/* Status Bar */}
              <footer className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px] uppercase tracking-widest text-zinc-400 font-mono">
                <div>{activeNote.content.split(/\s+/).filter(Boolean).length} words</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Auto-saved
                </div>
              </footer>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div className="max-w-sm space-y-6">
                <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-zinc-300 dark:text-zinc-700">
                  <Edit3 size={48} />
                </div>
                <h2 className="text-2xl font-bold">Select a note to view</h2>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Choose a note from the sidebar or create a new one to start capturing your thoughts.
                </p>
                <button 
                  onClick={createNote}
                  className="px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-bold hover:scale-105 transition-all"
                >
                  Create Your First Note
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Floating Action Button */}
      {!activeNoteId && (
        <button 
          onClick={createNote}
          className="md:hidden fixed bottom-8 right-8 w-16 h-16 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50"
        >
          <Plus size={32} />
        </button>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @font-face {
          font-family: 'Playfair Display';
          src: url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        }
        .serif {
          font-family: 'Playfair Display', serif;
        }
      `}</style>
    </div>
  );
}
