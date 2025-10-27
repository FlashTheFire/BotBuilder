
import React, { useState, useRef, useEffect } from 'react';
import type { GeneratedFile, BotRuntimeState, LogEntry, BotMetadata } from '../types';
import { CodeViewer } from './CodeViewer';
import { DownloadIcon } from './icons/DownloadIcon';
// These are loaded via script tags in index.html
declare const JSZip: any;
declare const saveAs: any;

interface BotRunnerProps {
  isErrorState: boolean;
  botMetadata: BotMetadata | null;
  files: GeneratedFile[];
  runtimeState: BotRuntimeState;
  terminalLogs: LogEntry[];
  countdown: number;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onReset: () => void;
  onClearLogs: () => void;
  onFileUpdate: (fileName: string, newCode: string) => void;
  onRebuild: () => void;
  hasUnrebuiltChanges: boolean;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const BotRunner: React.FC<BotRunnerProps> = ({ isErrorState, botMetadata, files, runtimeState, terminalLogs, countdown, onStart, onStop, onRestart, onReset, onClearLogs, onFileUpdate, onRebuild, hasUnrebuiltChanges }) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'files'>(isErrorState ? 'files' : 'terminal');
  const [activeFile, setActiveFile] = useState(files.length > 0 ? files[0].name : '');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [logFilter, setLogFilter] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isErrorState) {
        setActiveTab('files');
    }
  }, [isErrorState]);

  useEffect(() => {
    if (files.length > 0 && !files.some(f => f.name === activeFile)) {
      setActiveFile(files[0].name);
    }
  }, [files, activeFile]);

  useEffect(() => {
    if (logContainerRef.current && !isAutoScrollPaused) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs, isAutoScrollPaused]);

  const handleDownloadLogs = () => {
    const formattedLogs = terminalLogs
        .map(log => `${log.timestamp.toISOString()} [${log.type.toUpperCase()}] ${log.message}`)
        .join('\n');
    const blob = new Blob([formattedLogs], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `bot-logs-${new Date().toISOString()}.txt`);
  };
  
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
        const zip = new JSZip();
        files.forEach(file => { zip.file(file.name, file.code); });
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'telegram-bot.zip');
    } catch (e) {
        console.error("Failed to create zip file", e);
    } finally {
        setIsDownloading(false);
    }
  };

  const selectedFile = files.find(f => f.name === activeFile);
  const isRunning = runtimeState === 'RUNNING';
  const filteredLogs = terminalLogs.filter(log => log.message.toLowerCase().includes(logFilter.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
        {isErrorState ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div>
                    <h3 className="font-semibold text-white text-lg">Build Failed</h3>
                    <p className="text-red-300 text-sm mt-1">Review the logs in the Terminal, edit the files, and click Rebuild to try again.</p>
                </div>
                 <button
                    onClick={onRebuild}
                    disabled={!hasUnrebuiltChanges}
                    className="relative px-4 py-2 text-sm font-bold rounded-md transition-colors bg-purple-500 hover:bg-purple-600 text-white flex-shrink-0 disabled:bg-gray-700 disabled:cursor-not-allowed"
                 >
                    {hasUnrebuiltChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span></span>}
                    Rebuild
                 </button>
            </div>
        ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                <div className="flex items-start space-x-3">
                    <span className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
                    <div>
                        <div className="font-semibold text-white">
                            {botMetadata ? (
                                <span>@{botMetadata.username}</span>
                            ) : (
                                <span>{isRunning ? 'Connecting...' : 'Bot'}</span>
                            )}
                            <span className="text-gray-400 font-normal"> ({isRunning ? 'Running' : 'Stopped'})</span>
                        </div>
                        {botMetadata && (
                            <div className="text-xs text-gray-500 font-mono">ID: {botMetadata.id}</div>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                     <div className="text-sm text-gray-400">
                        Time: <span className="font-mono text-white">{formatTime(countdown)}</span>
                     </div>
                     <button
                        onClick={isRunning ? onStop : onStart}
                        disabled={!isRunning && countdown === 0}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white disabled:bg-gray-600 disabled:cursor-not-allowed`}
                     >
                        {isRunning ? 'Stop' : 'Start'}
                     </button>
                     <button
                        onClick={onRestart}
                        className="px-3 py-1.5 text-xs font-bold rounded-md transition-colors bg-gray-600 hover:bg-gray-700 text-white"
                     >
                        Restart
                     </button>
                     <button
                        onClick={onRebuild}
                        disabled={!hasUnrebuiltChanges}
                        className="relative px-3 py-1.5 text-xs font-bold rounded-md transition-colors bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-700 disabled:cursor-not-allowed"
                     >
                        {hasUnrebuiltChanges && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span></span>}
                        Rebuild
                     </button>
                </div>
            </div>
        )}

        <div className="mb-4 border-b border-gray-700">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                <button onClick={() => setActiveTab('terminal')} className={`${activeTab === 'terminal' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                    {isErrorState ? 'Build Terminal' : 'Live Terminal'}
                </button>
                <button onClick={() => setActiveTab('files')} className={`${activeTab === 'files' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
                    View & Edit Files
                </button>
            </nav>
        </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'terminal' && (
           <>
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gray-800 rounded-t-md border-b border-gray-700">
                <input type="text" placeholder="Filter logs..." value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="bg-gray-900 text-xs px-2 py-1 rounded-md border border-gray-700 focus:ring-blue-500 focus:border-blue-500" />
                <div className="flex items-center space-x-2">
                    <label className="flex items-center text-xs text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={isAutoScrollPaused} onChange={() => setIsAutoScrollPaused(p => !p)} className="mr-1.5 h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500" />
                        Pause Scroll
                    </label>
                    <button onClick={onClearLogs} className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600">Clear</button>
                    <button onClick={handleDownloadLogs} className="text-xs px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center space-x-1"><DownloadIcon className="w-4 h-4" /> <span>Logs</span></button>
                </div>
            </div>
            <div className="flex-1 bg-gray-950 p-4 rounded-b-md overflow-y-auto font-mono text-xs" ref={logContainerRef}>
              <div className="space-y-2">
                {filteredLogs.map((log, index) => {
                  if (log.type === 'raw') {
                      return (
                          <div key={index} className="flex">
                              <span className="mr-2 text-gray-600 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                              <pre className="whitespace-pre-wrap bg-gray-800 p-3 rounded-md text-red-400 text-xs w-full overflow-x-auto flex-1">{log.message}</pre>
                          </div>
                      );
                  }
                  return (
                    <div key={index} className={`flex ${log.type === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                        <span className="mr-2 text-gray-600 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                        <p className="whitespace-pre-wrap break-all">{log.message}</p>
                    </div>
                  )
                })}
                {filteredLogs.length === 0 && <div className="text-gray-500">No logs to display.</div>}
              </div>
            </div>
           </>
        )}
        {activeTab === 'files' && (
            <div className="flex flex-col h-full">
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Files">
                        {files.map(file => (
                            <button key={file.name} onClick={() => setActiveFile(file.name)} className={`${activeFile === file.name ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50'} whitespace-nowrap py-2 px-3 font-mono text-xs rounded-t-md`}>
                                {file.name}
                            </button>
                        ))}
                    </nav>
                </div>
                 <div className="flex-1 bg-gray-950 rounded-b-md overflow-hidden text-sm">
                    {selectedFile ? (
                        <CodeViewer 
                            key={selectedFile.name} // Force re-mount on file change to reset editor state
                            code={selectedFile.code}
                            fileName={selectedFile.name}
                            onSave={(newCode) => onFileUpdate(selectedFile.name, newCode)}
                        />
                    ) : (
                        <div className="p-4 text-gray-500">Select a file to view its content.</div>
                    )}
                </div>
            </div>
        )}
      </div>
       <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <button
            onClick={handleDownloadZip} disabled={isDownloading}
            className="flex-1 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600"
        >
            {isDownloading ? 'Zipping...' : 'Download .zip'}
        </button>
        <button
            onClick={onReset}
            className="flex-1 w-full flex justify-center items-center py-3 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700"
        >
            Build Another Bot
        </button>
      </div>
    </div>
  );
};
