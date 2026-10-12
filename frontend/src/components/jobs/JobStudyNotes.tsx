"use client";

import { useState } from "react";
import { Eye, Loader2, Pencil, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

interface JobStudyNotesProps {
  /** Markdown text currently stored on the server. */
  value: string | null;
  /** Persists the notes; returns a promise so we can show a saving state. */
  onSave: (notes: string) => Promise<unknown>;
}

/**
 * Preparation / Study Notes editor.
 *
 * Students paste syllabus points, company research and past interview
 * experiences here, so the field is Markdown with a Write ⇄ Preview toggle.
 * The preview uses lib/markdown.ts (dependency-free and XSS-safe).
 */
export function JobStudyNotes({ value, onSave }: JobStudyNotesProps) {
  const stored = value ?? "";
  const [draft, setDraft] = useState(stored);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);

  const isDirty = draft !== stored;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Preparation & Study Notes
        </h4>

        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-0.5">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
              mode === "write" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Pencil size={11} />
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
              mode === "preview" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Eye size={11} />
            Preview
          </button>
        </div>
      </div>

      {/* Editor / preview */}
      {mode === "write" ? (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={10}
          placeholder={
            "## Syllabus\n- DSA: Graphs, DP\n- OS: Deadlocks\n\n## Company research\n> They asked 2 DSA + 1 SQL round last year.\n\n## Interview experience\n1. OA: 2 coding questions (45 min)\n\n```python\ndp = [[0]*n for _ in range(n)]\n```"
          }
          className="min-h-[14rem] bg-slate-950 font-mono text-xs leading-relaxed"
        />
      ) : (
        <div className="min-h-[14rem] overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
          {draft.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }} />
          ) : (
            <p className="text-slate-600">
              Nothing to preview yet. Switch to Write and add your notes.
            </p>
          )}
        </div>
      )}

      {/* Actions + cheat sheet */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-600">
          Markdown: <span className="text-slate-500">**bold**</span>,{" "}
          <span className="text-slate-500">*italic*</span>,{" "}
          <span className="text-slate-500">## heading</span>,{" "}
          <span className="text-slate-500">- bullet</span>,{" "}
          <span className="text-slate-500">`code`</span>,{" "}
          <span className="text-slate-500">&gt; quote</span>
        </p>

        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft(stored)}
              disabled={saving}
              className="text-slate-400"
            >
              <RotateCcw size={13} />
              Reset
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
