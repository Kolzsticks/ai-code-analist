
import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { 
  FolderIcon, 
  FileCodeIcon, 
  UploadIcon, 
  PlayIcon, 
  Loader2Icon, 
  ChevronRightIcon, 
  AlertCircleIcon,
  TerminalIcon,
  CodeIcon,
  SearchIcon
} from 'lucide-react';
import { ZipFile, AnalysisResult } from './types';
import { analyzeCodebase } from './services/geminiService';

const App: React.FC = () => {
  const [files, setFiles] = useState<ZipFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ZipFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Please upload a valid ZIP file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setAnalysis(null);
    setFiles([]);
    setSelectedFile(null);

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      const extractedFiles: ZipFile[] = [];

      const promises = Object.keys(content.files).map(async (path) => {
        const zipEntry = content.files[path];
        if (zipEntry.dir) {
          extractedFiles.push({ name: zipEntry.name, path, content: '', isDirectory: true });
        } else {
          const fileContent = await zipEntry.async('string');
          extractedFiles.push({ name: zipEntry.name, path, content: fileContent, isDirectory: false });
        }
      });

      await Promise.all(promises);
      setFiles(extractedFiles.sort((a, b) => a.path.localeCompare(b.path)));
    } catch (err) {
      setError('Failed to extract ZIP file. It might be corrupted.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const runAnalysis = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeCodebase(files);
      setAnalysis(result);
    } catch (err) {
      setError('Gemini analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <FolderIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">CodeZip <span className="text-indigo-400">Analyst</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-lg cursor-pointer border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200">
            <UploadIcon className="w-4 h-4" />
            Upload ZIP
            <input type="file" className="hidden" accept=".zip" onChange={handleFileUpload} />
          </label>
          
          <button 
            onClick={runAnalysis}
            disabled={files.length === 0 || isAnalyzing}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg shadow-lg ${
              files.length === 0 || isAnalyzing 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {isAnalyzing ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4 fill-current" />}
            Run Analysis
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-72 flex flex-col border-r border-slate-800 bg-slate-900/30">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Files</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{files.filter(f => !f.isDirectory).length} files</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isUploading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                <Loader2Icon className="w-8 h-8 animate-spin" />
                <span className="text-sm">Extracting ZIP...</span>
              </div>
            ) : files.length > 0 ? (
              <ul className="space-y-1">
                {files.map((file, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => !file.isDirectory && setSelectedFile(file)}
                      disabled={file.isDirectory}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left ${
                        selectedFile?.path === file.path 
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                          : file.isDirectory 
                            ? 'text-slate-500 cursor-default' 
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      {file.isDirectory ? (
                        <FolderIcon className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <FileCodeIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{file.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center text-slate-600">
                <SearchIcon className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">No files to show. Upload a ZIP to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right Content Panels */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircleIcon className="w-5 h-5 shrink-0" />
              <div className="flex-1 text-sm">{error}</div>
            </div>
          )}

          <div className="flex-1 flex gap-0 overflow-hidden">
            {/* Code Viewer */}
            <div className={`flex-1 flex flex-col ${analysis ? 'w-1/2' : 'w-full'} border-r border-slate-800 transition-all duration-300`}>
              <div className="h-10 border-b border-slate-800 flex items-center px-4 bg-slate-900/20">
                <span className="text-xs font-medium text-slate-500">
                  {selectedFile ? selectedFile.path : 'Source Code Preview'}
                </span>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 p-6">
                {selectedFile ? (
                  <pre className="code-font text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    <code>{selectedFile.content || '// Empty file'}</code>
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700">
                    <CodeIcon className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-sm">Select a file from the sidebar to view its content.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Result (Right Panel) */}
            {analysis && (
              <div className="w-1/2 flex flex-col bg-slate-900/10 animate-in slide-in-from-right-4 duration-500">
                <div className="h-10 border-b border-slate-800 flex items-center px-4 bg-slate-900/40">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                    <SearchIcon className="w-3 h-3" />
                    AI ANALYSIS REPORT
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Summary */}
                  <section>
                    <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <ChevronRightIcon className="w-4 h-4 text-indigo-500" />
                      Project Summary
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                      {analysis.summary}
                    </p>
                  </section>

                  {/* Run Simulation */}
                  <section>
                    <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <TerminalIcon className="w-4 h-4 text-emerald-500" />
                      Execution Simulation
                    </h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-inner overflow-hidden">
                      <div className="flex gap-1.5 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                      </div>
                      <pre className="code-font text-xs text-emerald-400 leading-relaxed">
                        {analysis.executionSimulation}
                      </pre>
                    </div>
                  </section>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Main Entry Point</span>
                      <span className="text-sm text-indigo-300 font-mono break-all">{analysis.entryPoint}</span>
                    </div>
                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Dependencies</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {analysis.dependencies.map((dep, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">{dep}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <section className="pb-8">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">Engineering Suggestions</h3>
                    <ul className="space-y-3">
                      {analysis.suggestions.map((sug, i) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-400 items-start">
                          <span className="w-5 h-5 shrink-0 bg-amber-500/10 text-amber-500 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          {sug}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Persistent Call-to-Action / Welcome State */}
      {!files.length && !isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
          <div className="max-w-md w-full p-8 text-center bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-slate-800/50 pointer-events-auto">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-600/20 rotate-3">
               <UploadIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Upload your Codebase</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Drop a ZIP file here to instantly unzip, browse, and have Gemini analyze your architecture, find bugs, and simulate execution.
            </p>
            <label className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl cursor-pointer transition-all hover:-translate-y-1 shadow-xl shadow-indigo-600/20">
              <UploadIcon className="w-5 h-5" />
              Select ZIP File
              <input type="file" className="hidden" accept=".zip" onChange={handleFileUpload} />
            </label>
            <p className="mt-4 text-[10px] text-slate-600 uppercase tracking-widest font-bold">Privacy: Processing happens in-browser and via Gemini API</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
