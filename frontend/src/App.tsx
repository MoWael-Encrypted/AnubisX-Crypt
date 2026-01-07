import React, { useState } from 'react';
import axios from 'axios';
import Hero from './components/Hero';
import PerformanceChart from './components/PerformanceChart';
import FileList from './components/FileList';
import type { FileResult } from './components/FileList';
import {
  Upload, Zap, Play, Settings,
  Activity, Table as TableIcon, ShieldCheck, Key, FileDigit, Hash
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BenchmarkResult {
  label: string;
  time: number;
  throughput: number;
}

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  // Results
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [benchData, setBenchData] = useState<BenchmarkResult[]>([]);

  const [logs, setLogs] = useState<string[]>([]);

  // Config State
  const [mode, setMode] = useState("enc");
  const [engine, setEngine] = useState("auto"); // used in form data
  const [key, setKey] = useState("3");
  const [chunk, setChunk] = useState("1048576");
  const [threads, setThreads] = useState("");
  const [procs, setProcs] = useState("");

  const API_BASE = "http://localhost:5000";

  const addLog = (msg: string, isError = false) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${isError ? "ERR: " : ""}${msg}`, ...prev]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(newFiles);
      setFileResults([]); // Clear previous results
      setBenchData([]);
      addLog(`Selected ${newFiles.length} file(s).`);
    }
  };

  const generateKey = async () => {
    try {
      addLog("Generating secure key...");
      const res = await axios.get(`${API_BASE}/keygen`);
      setKey(res.data.key);
      addLog(`Key updated: ${res.data.key}`);
    } catch (e: any) {
      addLog(`KeyGen Failed: ${e.message}`, true);
    }
  };

  const calculateHash = async () => {
    if (files.length === 0) { alert("Select a file first"); return; }
    // Only hash the first file for simplicity in this tool
    const f = files[0];
    addLog(`Calculating SHA256 for ${f.name}...`);

    const formData = new FormData();
    formData.append('file', f);

    try {
      const res = await axios.post(`${API_BASE}/hash`, formData);
      addLog(`SHA256: ${res.data.sha256}`);
      alert(`SHA256 (${f.name}):\n${res.data.sha256}`);
    } catch (e: any) {
      addLog(`Hash Failed: ${e.message}`, true);
    }
  };

  const executeTask = async (endpoint: 'run' | 'benchmark') => {
    if (files.length === 0) { alert("Please select files first"); return; }

    setLoading(true);
    setBenchData([]);

    addLog(endpoint === 'benchmark' ? "Starting benchmark..." : `Starting batch process for ${files.length} file(s)...`);

    const formData = new FormData();
    if (endpoint === 'benchmark') {
      formData.append('file', files[0]);
    } else {
      files.forEach(f => formData.append('files', f));
    }

    formData.append('mode', mode);
    // Map 'hybrid' UI selection to 'mpi' backend engine
    formData.append('engine', engine === 'hybrid' ? 'mpi' : engine);
    formData.append('key', key);
    formData.append('chunk', chunk);
    formData.append('threads', threads);
    formData.append('procs', procs);

    try {
      const res = await axios.post(`${API_BASE}/${endpoint}`, formData);

      // Add Server Logs
      if (res.data.logs && Array.isArray(res.data.logs)) {
        res.data.logs.forEach((msg: string) => addLog(`SERVER: ${msg}`));
      }

      if (endpoint === 'run') {
        const { results } = res.data;
        setFileResults(results);
        addLog(`Batch complete. Processed ${results.length} files.`);
      } else {
        setBenchData(res.data.results);
        addLog("Benchmark complete.");
      }

      setTimeout(() => {
        const dashboard = document.getElementById('dashboard');
        dashboard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || error.message;
      const details = error.response?.data?.details;
      addLog(msg, true);
      if (details) addLog(`Details: ${details.substring(0, 50)}...`, true);
    } finally {
      setLoading(false);
    }
  };

  const getSpeedup = (current: number) => {
    const serial = benchData.find(b => b.label === "Serial")?.time;
    if (!serial || serial === 0 || current === 0) return "-";
    if (serial === current) return "-";
    return `${(serial / current).toFixed(2)}x`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-green-500/30 selection:text-green-900">
      <Hero />

      <main id="dashboard" className="max-w-7xl mx-auto py-12 px-6">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Config + Logs */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Configuration Card */}
            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-md shadow-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/50">
                <CardTitle className="text-green-500 text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4" /> System Config
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-zinc-400 uppercase">Operation Mode</Label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="bg-black/40 border-zinc-700 text-white font-mono text-sm h-10 focus:ring-green-500/50 hover:border-zinc-500 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="enc">ENCRYPT DATA</SelectItem>
                      <SelectItem value="dec">DECRYPT DATA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-mono text-zinc-400 uppercase">Engine Preference</Label>
                  <Select value={engine} onValueChange={setEngine}>
                    <SelectTrigger className="bg-black/40 border-zinc-700 text-white font-mono text-sm h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectItem value="auto">AUTO (Smart Select)</SelectItem>
                      <SelectItem value="serial">CPU Serial (1 Core)</SelectItem>
                      <SelectItem value="openmp">OpenMP (Multi-Core)</SelectItem>
                      <SelectItem value="mpi">MPI (Distributed)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (MPI + OpenMP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono text-zinc-500 uppercase">Shift Key</Label>
                    <div className="flex gap-1">
                      <Input type="number" value={key} onChange={e => setKey(e.target.value)} className="bg-black/40 border-zinc-700 h-9 font-mono" />
                      <Button size="icon" variant="outline" onClick={generateKey} className="h-9 w-9 border-zinc-700 bg-zinc-800 hover:bg-green-600 hover:text-white" title="Generate Random Key">
                        <Key className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono text-zinc-500 uppercase">OMP Threads</Label>
                    <Input type="number" value={threads} onChange={e => setThreads(e.target.value)} placeholder="Auto (Max)" className="bg-black/40 border-zinc-700 h-9 font-mono placeholder:text-zinc-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono text-zinc-500 uppercase">MPI Procs</Label>
                    <Input type="number" value={procs} onChange={e => setProcs(e.target.value)} placeholder="Auto (Max)" className="bg-black/40 border-zinc-700 h-9 font-mono placeholder:text-zinc-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-mono text-zinc-500 uppercase">Chunk Size</Label>
                    <Input type="number" value={chunk} onChange={e => setChunk(e.target.value)} className="bg-black/40 border-zinc-700 h-9 font-mono" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Tools Card */}
            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-md shadow-lg">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-zinc-400 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                  <FileDigit className="w-3 h-3" /> Utilities
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Button variant="outline" size="sm" onClick={calculateHash} disabled={files.length === 0} className="w-full border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs">
                  <Hash className="w-3 h-3 mr-2" /> Verify Integrity (SHA256)
                </Button>
              </CardContent>
            </Card>

            {/* 3. Logs Console */}
            <Card className="bg-black border-zinc-800 h-[250px] flex flex-col shadow-xl overflow-hidden">
              <div className="p-2 border-b border-zinc-900 bg-zinc-900/50 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 ml-2 uppercase tracking-widest">System Log</span>
                <div className="flex gap-1.5 mr-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/20" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1 text-green-500/80 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {logs.length === 0 && <span className="opacity-30 blink">_WAITING FOR INPUT...</span>}
                {logs.map((log, i) => (
                  <div key={i} className={`${log.includes("ERR") ? "text-red-400" : ""} border-l-2 border-transparent pl-2 hover:border-zinc-700 hover:bg-zinc-900/30`}>
                    <span className="opacity-50 mr-2">{log.split(']')[0]}]</span>
                    {log.split(']')[1]}
                  </div>
                ))}
              </div>
            </Card>

            {/* Comparison Table (Benchmark) */}
            {benchData.length > 0 && (
              <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-md animate-in slide-in-from-left-2">
                <CardHeader className="pb-2 border-b border-zinc-800/50">
                  <CardTitle className="text-zinc-400 text-sm font-mono uppercase flex gap-2">
                    <TableIcon className="w-4 h-4" /> Benchmark Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-zinc-950/50">
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-500 text-[10px] h-8 font-mono uppercase">Engine</TableHead>
                        <TableHead className="text-zinc-500 text-[10px] h-8 text-right font-mono uppercase">Time</TableHead>
                        <TableHead className="text-green-500 text-[10px] h-8 text-right font-mono uppercase">Boost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {benchData.map((item) => (
                        <TableRow key={item.label} className="border-zinc-800 hover:bg-zinc-800/30">
                          <TableCell className="text-white font-medium text-xs py-2">{item.label}</TableCell>
                          <TableCell className="text-zinc-300 font-mono text-xs text-right py-2">{item.time.toFixed(3)}s</TableCell>
                          <TableCell className="text-green-400 font-mono text-xs font-bold text-right py-2 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                            {item.label === "Serial" ? "-" : getSpeedup(item.time)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN: Action + Graph */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
              {/* Decorative background gradient */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -z-10" />

              <CardContent className="p-8 space-y-8">
                {/* Upload Area */}
                <div className="relative border border-dashed border-zinc-700 bg-black/40 rounded-xl p-10 text-center hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-300 group">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="relative z-10 pointer-events-none space-y-3">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:border-green-500/50 transition-all duration-300 shadow-lg">
                      <Upload className="w-7 h-7 text-zinc-400 group-hover:text-green-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xl tracking-tight">
                        {files.length > 0 ? `${files.length} File(s) Selected` : "Drop Files Here"}
                      </h3>
                      <p className="text-zinc-500 text-sm mt-1 font-mono">
                        Support: .txt, .log, .csv, .enc (Max 300MB)
                      </p>
                    </div>
                  </div>
                </div>

                {/* File List Component */}
                <FileList files={files} results={fileResults} loading={loading} />

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => executeTask('run')}
                    disabled={loading || files.length === 0}
                    className="h-14 bg-green-600 hover:bg-green-500 text-white font-bold text-lg tracking-wide shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all"
                  >
                    {loading ? <span className="animate-pulse">PROCESSING...</span> : <><Play className="w-5 h-5 mr-2 fill-current" /> INITIALIZE BATCH</>}
                  </Button>

                  <Button
                    onClick={() => executeTask('benchmark')}
                    disabled={loading || files.length === 0}
                    variant="outline"
                    className="h-14 border-zinc-600 hover:bg-white/5 text-zinc-300 text-lg hover:border-zinc-400 transition-all font-mono"
                  >
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" /> RUN BENCHMARK <span className="text-xs text-zinc-600 ml-2">(1st File)</span>
                  </Button>
                </div>

              </CardContent>
            </Card>

            {/* VISUALIZATION CHART - Only show if we have benchmark data */}
            {benchData.length > 0 ? (
              <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-md h-[500px] shadow-2xl">
                <CardHeader className="border-b border-zinc-800/50 pb-4">
                  <CardTitle className="text-zinc-400 text-sm font-mono uppercase flex gap-2">
                    <Activity className="w-4 h-4" /> Performance Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[420px] pt-6">
                  <PerformanceChart data={benchData} />
                </CardContent>
              </Card>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-zinc-800 border-2 border-dashed border-zinc-900 rounded-xl">
                <ShieldCheck className="w-12 h-12 mb-2 opacity-20" />
                <span className="font-mono text-sm opacity-30">AWAITING BENCHMARK DATA</span>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-zinc-600 text-xs font-mono">
        <p>SECURE FILE TRANSFER PROTOCOL // ANUBISX V3.0</p>
      </footer>
    </div>
  );
}

export default App;