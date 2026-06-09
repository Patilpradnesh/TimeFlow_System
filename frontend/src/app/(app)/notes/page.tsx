"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Plus, Search, Pin, Trash2, 
  Tag, Loader2, StickyNote, X, 
  ChevronRight, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  title: string;
  content: any;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [currentNote, setCurrentNote] = useState({
    title: "",
    text: "",
    tags: [] as string[],
    isPinned: false
  });

  const fetchNotes = async () => {
    try {
      const response = await api.get("/notes");
      setNotes(response.data);
    } catch (error) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSaveNote = async () => {
    if (!currentNote.title) return;
    
    try {
      const payload = {
        title: currentNote.title,
        content: { text: currentNote.text },
        tags: currentNote.tags,
        isPinned: currentNote.isPinned
      };
      
      const response = await api.post("/notes", payload);
      setNotes([response.data, ...notes]);
      setOpen(false);
      setCurrentNote({ title: "", text: "", tags: [], isPinned: false });
      toast.success("Note captured");
    } catch (error) {
      toast.error("Failed to save note");
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
      toast.success("Note removed");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const togglePin = async (note: Note) => {
    try {
      const response = await api.put(`/notes/${note.id}`, { isPinned: !note.isPinned });
      setNotes(notes.map(n => n.id === note.id ? response.data : n).sort((a, b) => 
        (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1
      ));
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Knowledge Base</h1>
          <p className="text-slate-500">Your thoughts, organized by intelligence.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <Input 
              placeholder="Search notes or tags..." 
              className="pl-10 bg-slate-900 border-slate-800 w-[200px] md:w-[300px] focus:w-[350px] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11">
                <Plus size={20} className="mr-2" /> New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Capture Thought</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Store anything from quick ideas to deep project documentation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input 
                  placeholder="Note Title" 
                  className="bg-slate-950 border-slate-800 text-lg font-bold"
                  value={currentNote.title}
                  onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                />
                <Textarea 
                  placeholder="Write your thoughts here..." 
                  className="bg-slate-950 border-slate-800 min-h-[200px] resize-none"
                  value={currentNote.text}
                  onChange={(e) => setCurrentNote({ ...currentNote, text: e.target.value })}
                />
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Pin size={18} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">Pin to top</span>
                  </div>
                  <Switch 
                    checked={currentNote.isPinned}
                    onCheckedChange={(v) => setCurrentNote({ ...currentNote, isPinned: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSaveNote}>
                  Save Knowledge
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredNotes.map((note) => (
            <Card 
              key={note.id} 
              className={cn(
                "break-inside-avoid bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group relative",
                note.isPinned && "ring-1 ring-blue-500/50 bg-blue-500/[0.02]"
              )}
            >
              <CardHeader className="p-6 pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {note.title}
                  </CardTitle>
                  <button 
                    onClick={() => togglePin(note)}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      note.isPinned ? "text-blue-500 bg-blue-500/10" : "text-slate-600 hover:text-slate-300"
                    )}
                  >
                    <Pin size={16} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {note.content?.text || ""}
                </p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {note.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-slate-950 text-[10px] text-slate-500">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-slate-600 font-mono uppercase">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-600 hover:text-red-500 hover:bg-red-500/10"
                  onClick={() => deleteNote(note.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
