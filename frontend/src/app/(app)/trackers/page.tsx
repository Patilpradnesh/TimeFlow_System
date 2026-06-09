"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Database, Plus, FileSpreadsheet, Upload, Download, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Tracker {
  id: string;
  name: string;
  columns: any[];
  rows: any[];
}

export default function TrackersPage() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [activeTracker, setActiveTracker] = useState<Tracker | null>(null);
  const [newTrackerName, setNewTrackerName] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'tracker' | 'column' | 'row', id?: string, name?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTrackers = async () => {
    try {
      const res = await api.get("/trackers");
      setTrackers(res.data);
      if (res.data.length > 0 && !activeTracker) setActiveTracker(res.data[0]);
    } catch (e) {
      toast.error("Failed to fetch trackers");
    }
  };

  useEffect(() => { fetchTrackers(); }, []);

  const createTracker = async () => {
    if (!newTrackerName.trim()) return;
    try {
      const res = await api.post("/trackers", { name: newTrackerName, columns: [{ id: 'col_1', name: 'Name', type: 'TEXT' }], rows: [] });
      setTrackers([res.data, ...trackers]);
      setActiveTracker(res.data);
      setNewTrackerName("");
      toast.success("Tracker created");
    } catch (e) {
      toast.error("Failed to create tracker");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const arr: string[][] = [];
      let quote = false;
      let col = 0, row = 0;
      for (let c = 0; c < text.length; c++) {
          let cc = text[c], nc = text[c+1];
          arr[row] = arr[row] || [];
          arr[row][col] = arr[row][col] || '';
          if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
          if (cc == '"') { quote = !quote; continue; }
          if (cc == ',' && !quote) { ++col; continue; }
          if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
          if (cc == '\n' && !quote) { ++row; col = 0; continue; }
          if (cc == '\r' && !quote) { ++row; col = 0; continue; }
          arr[row][col] += cc;
      }

      if (arr.length < 2) {
        toast.error("CSV must contain headers and at least one row");
        return;
      }

      const headers = arr[0];
      const dataRows = arr.slice(1).filter(r => r.some(cell => cell && cell.trim() !== ''));

      const newColumns = headers.map((h, i) => ({
        id: `col_${Date.now()}_${i}`,
        name: h ? h.trim() : `Column ${i+1}`,
        type: 'TEXT'
      }));

      const newRows = dataRows.map((r, i) => {
        const cells: any = {};
        newColumns.forEach((colObj, idx) => {
          cells[colObj.id] = r[idx] ? r[idx].trim() : '';
        });
        return { id: `row_${Date.now()}_${i}`, cells };
      });

      const trackerName = file.name.replace('.csv', '');

      try {
        const res = await api.post("/trackers", { 
          name: trackerName, 
          columns: newColumns, 
          rows: newRows 
        });
        setTrackers([res.data, ...trackers]);
        setActiveTracker(res.data);
        toast.success("CSV Imported Successfully!");
      } catch (err) {
        toast.error("Failed to import CSV");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateActiveTracker = async (updated: Tracker) => {
    setActiveTracker(updated);
    setTrackers(trackers.map(t => t.id === updated.id ? updated : t));
    try {
      await api.put(`/trackers/${updated.id}`, { name: updated.name, columns: updated.columns, rows: updated.rows });
    } catch (e) {
      toast.error("Failed to save tracker");
    }
  };

  const addColumn = () => {
    if (!activeTracker || !newColumnName.trim()) return;
    const newCol = { id: `col_${Date.now()}`, name: newColumnName, type: 'TEXT' };
    updateActiveTracker({ ...activeTracker, columns: [...activeTracker.columns, newCol] });
    setNewColumnName("");
  };

  const handleOpenAddRow = () => {
    if (!activeTracker) return;
    const initialData: Record<string, string> = {};
    activeTracker.columns.forEach(col => initialData[col.id] = "");
    setNewRowData(initialData);
    setIsAddRowModalOpen(true);
  };

  const confirmAddRow = () => {
    if (!activeTracker) return;
    const newRow = { id: `row_${Date.now()}`, cells: newRowData };
    const updatedTracker = { ...activeTracker, rows: [newRow, ...activeTracker.rows] };
    updateActiveTracker(updatedTracker);
    setIsAddRowModalOpen(false);
  };

  const executeDelete = async () => {
    if (!deleteTarget || !activeTracker) return;
    
    if (deleteTarget.type === 'tracker') {
      try {
        await api.delete(`/trackers/${activeTracker.id}`);
        const remaining = trackers.filter(t => t.id !== activeTracker.id);
        setTrackers(remaining);
        setActiveTracker(remaining.length > 0 ? remaining[0] : null);
        toast.success("Tracker deleted");
      } catch (e) {
        toast.error("Failed to delete tracker");
      }
    } 
    else if (deleteTarget.type === 'column') {
      const updatedColumns = activeTracker.columns.filter(c => c.id !== deleteTarget.id);
      updateActiveTracker({ ...activeTracker, columns: updatedColumns });
    }
    else if (deleteTarget.type === 'row') {
      const updatedRows = activeTracker.rows.filter(r => r.id !== deleteTarget.id);
      updateActiveTracker({ ...activeTracker, rows: updatedRows });
    }
    
    setDeleteTarget(null);
  };

  const updateCellAndSave = async (rowId: string, colId: string, value: string) => {
    if (!activeTracker) return;
    
    // Prevent unnecessary saves if value hasn't changed
    const oldVal = activeTracker.rows.find(r => r.id === rowId)?.cells[colId] || "";
    if (oldVal === value) return;

    const updatedRows = activeTracker.rows.map(r => {
      if (r.id === rowId) return { ...r, cells: { ...r.cells, [colId]: value } };
      return r;
    });
    
    const updatedTracker = { ...activeTracker, rows: updatedRows };
    setActiveTracker(updatedTracker);
    setTrackers(trackers.map(t => t.id === activeTracker.id ? updatedTracker : t));
    
    try {
      await api.put(`/trackers/${updatedTracker.id}`, { name: updatedTracker.name, columns: updatedTracker.columns, rows: updatedTracker.rows });
    } catch (e) {
      toast.error("Failed to save cell");
    }
  };

  const exportCSV = () => {
    if (!activeTracker) return;
    
    // Create headers
    const headerRow = activeTracker.columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
    
    // Create data rows
    const dataRows = activeTracker.rows.map(row => {
      return activeTracker.columns.map(col => {
        const cellValue = row.cells[col.id] || "";
        return `"${String(cellValue).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTracker.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = activeTracker?.rows.filter(row => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row.cells).some((val: any) => 
      String(val).toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="h-[calc(100vh-80px)] flex space-x-6 animate-in fade-in duration-700">
      
      {/* Sidebar / List */}
      <div className="w-64 flex flex-col border-r border-slate-900 pr-4">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Database size={20} className="text-emerald-500"/> Trackers</h2>
        
        <div className="flex gap-2 mb-4">
          <Input 
            value={newTrackerName} 
            onChange={(e) => setNewTrackerName(e.target.value)} 
            placeholder="e.g. Job Hunt" 
            className="bg-slate-900/50 border-slate-800 text-xs h-8"
            onKeyDown={(e) => e.key === 'Enter' && createTracker()}
          />
          <Button size="sm" onClick={createTracker} className="h-8 bg-emerald-600 hover:bg-emerald-500"><Plus size={14}/></Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2" title="Import CSV">
            <Upload size={14}/>
          </Button>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        </div>

        <div className="space-y-2 overflow-y-auto">
          {trackers.map(t => (
            <div 
              key={t.id} 
              onClick={() => setActiveTracker(t)}
              className={cn(
                "p-3 rounded-xl cursor-pointer transition-colors border group flex items-center justify-between",
                activeTracker?.id === t.id ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-slate-950 border-slate-900 text-slate-400 hover:bg-slate-900"
              )}
            >
              <p className="text-sm font-semibold truncate pr-2">{t.name}</p>
              {activeTracker?.id === t.id && (
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'tracker', name: t.name }); }} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Tracker">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTracker ? (
          <>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <h1 className="text-3xl font-black text-white flex items-center gap-3 shrink-0">
                <FileSpreadsheet className="text-emerald-500" size={28}/>
                {activeTracker.name}
              </h1>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search in sheet..."
                    className="pl-9 bg-slate-900/50 border-slate-800 text-sm w-48 lg:w-64"
                  />
                </div>
                
                {/* Export Button */}
                <Button onClick={exportCSV} variant="outline" className="border-slate-800 text-slate-300 hover:text-white bg-slate-900/50">
                  <Download size={16} className="mr-2"/> Export
                </Button>
                
                {/* Add Column Group */}
                <div className="flex gap-2 bg-slate-900/30 p-1 rounded-lg border border-slate-800">
                  <Input 
                    value={newColumnName}
                    onChange={e => setNewColumnName(e.target.value)}
                    placeholder="New Column..."
                    className="bg-slate-900/80 border-slate-800 text-sm w-32 h-9"
                    onKeyDown={e => e.key === 'Enter' && addColumn()}
                  />
                  <Button onClick={addColumn} variant="ghost" className="h-9 px-2 text-slate-300 hover:text-white hover:bg-slate-800" title="Add Column"><Plus size={16}/></Button>
                </div>

                <Button onClick={handleOpenAddRow} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"><Plus size={16} className="mr-2"/> Add Row</Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr>
                    {activeTracker.columns.map(col => (
                      <th key={col.id} className="group relative sticky top-0 z-10 bg-slate-900 border-b border-r border-slate-800 p-3 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[200px]">
                        {col.name}
                        <button onClick={() => setDeleteTarget({ type: 'column', id: col.id, name: col.name })} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 hover:bg-red-500/20 p-1 rounded transition-all">
                          <Trash2 size={12} />
                        </button>
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={activeTracker.columns.length + 1} className="p-8 text-center text-slate-500 text-sm">{searchQuery ? "No results found." : "No data yet. Add a row to start tracking."}</td></tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="group hover:bg-slate-900/50 transition-colors">
                        {activeTracker.columns.map(col => (
                          <td key={col.id} className="border-b border-r border-slate-800/50 p-0 relative">
                            <input 
                              key={`${activeTracker.id}-${row.id}-${col.id}`}
                              type="text"
                              defaultValue={row.cells[col.id] || ""}
                              onBlur={(e) => updateCellAndSave(row.id, col.id, e.target.value)}
                              className="w-full h-full p-3 bg-transparent border-none outline-none text-sm text-slate-300 focus:bg-slate-900 focus:text-white"
                              placeholder="..."
                            />
                          </td>
                        ))}
                        <td className="border-b border-slate-800/50 p-0 text-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80">
                          <button onClick={() => setDeleteTarget({ type: 'row', id: row.id })} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Delete Row">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Database size={48} className="mb-4 opacity-20" />
            <p>Select or create a tracker to view data.</p>
          </div>
        )}
      </div>

      <Dialog open={isAddRowModalOpen} onOpenChange={setIsAddRowModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {activeTracker?.columns.map(col => (
              <div key={col.id} className="space-y-2">
                <Label>{col.name}</Label>
                <Input 
                  value={newRowData[col.id] || ""}
                  onChange={e => setNewRowData({ ...newRowData, [col.id]: e.target.value })}
                  className="bg-slate-900 border-slate-800"
                  placeholder={`Enter ${col.name}...`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRowModalOpen(false)} className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
            <Button onClick={confirmAddRow} className="bg-emerald-600 hover:bg-emerald-500 text-white">Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-500">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-slate-300 text-sm">
            Are you sure you want to delete this {deleteTarget?.type}? 
            {deleteTarget?.name && <span className="block mt-2 font-bold text-white">"{deleteTarget?.name}"</span>}
            <br/><br/>
            This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
            <Button onClick={executeDelete} className="bg-red-600 hover:bg-red-500 text-white">Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
