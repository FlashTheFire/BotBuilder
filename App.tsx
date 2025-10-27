
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PromptForm } from './components/PromptForm';
import { ProgressTracker } from './components/ProgressTracker';
import { BotRunner } from './components/BotRunner';
import { CodeModal } from './components/CodeModal';
import { WorkflowGuide } from './components/WorkflowGuide';
import { ConfigurationForm } from './components/ConfigurationForm';
import * as geminiService from './services/geminiService';
import * as backend from './services/backendService';
import type { BuildState, LogEntry, LogType, GeneratedFile, BotRuntimeState, BotMetadata, FixedFile, RequiredSecret } from './types';

const RUNTIME_DURATION_SECONDS = 600; // 10 minutes
const MAX_FIX_ATTEMPTS = 3; // Increased to allow more complex fixes

function App() {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [library, setLibrary] = useState('python-telegram-bot');
  const [requiredSecrets, setRequiredSecrets] = useState<RequiredSecret[]>([]);
  
  // Build state
  const [buildState, setBuildState] = useState<BuildState>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [hasUnrebuiltChanges, setHasUnrebuiltChanges] = useState(false);
  
  // State for managing the build/debug loop
  const buildLoopAttempt = useRef(0);
  const currentBuildFiles = useRef<GeneratedFile[]>([]);
  const lastBuildError = useRef('');

  // Runtime state
  const [runtimeState, setRuntimeState] = useState<BotRuntimeState>('STOPPED');
  const [runtimeLogs, setRuntimeLogs] = useState<LogEntry[]>([]);
  const [countdown, setCountdown] = useState(RUNTIME_DURATION_SECONDS);
  const [botMetadata, setBotMetadata] = useState<BotMetadata | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runtimeLogStreamRef = useRef<EventSource | null>(null);

  // UI state
  const [modalFile, setModalFile] = useState<GeneratedFile | null>(null);

  const addLog = useCallback((message: string, type: LogType = 'log') => {
    setLogs(prev => [...prev, { message, timestamp: new Date(), type }]);
  }, []);

  const addRuntimeLog = useCallback((message: string, type: LogType = 'log') => {
    setRuntimeLogs(prev => [...prev, { message, timestamp: new Date(), type }]);
  }, []);
  
  const resetBuild = () => {
    setBuildState('IDLE');
    setLogs([]);
    setGeneratedFiles([]);
    setTokenError(null);
    buildLoopAttempt.current = 0;
    currentBuildFiles.current = [];
    lastBuildError.current = '';
    setRequiredSecrets([]);
    setHasUnrebuiltChanges(false);
  };

  const resetRuntime = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (runtimeLogStreamRef.current) {
        runtimeLogStreamRef.current.close();
        runtimeLogStreamRef.current = null;
    }
    setRuntimeState('STOPPED');
    setRuntimeLogs([]);
    setCountdown(RUNTIME_DURATION_SECONDS);
    setBotMetadata(null);
  };

  const stopBot = useCallback(async () => {
    if (runtimeState === 'STOPPED') return;
    addRuntimeLog('Stopping bot...');
    if (runtimeLogStreamRef.current) {
        runtimeLogStreamRef.current.close();
        runtimeLogStreamRef.current = null;
    }
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    await backend.stopBot();
    setRuntimeState('STOPPED');
    addRuntimeLog('Bot stopped successfully.');
  }, [runtimeState, addRuntimeLog]);

  const startBot = useCallback(async () => {
      if (runtimeState === 'RUNNING') return;
      
      setRuntimeState('RUNNING');
      setRuntimeLogs([]);
      addRuntimeLog('Starting bot session...');
      
      try {
        await backend.runBot();
        addRuntimeLog('Bot container started successfully.');
        
        runtimeLogStreamRef.current = backend.streamRuntimeLogs(
            (log) => addRuntimeLog(log.message, log.type),
            (error) => {
                addRuntimeLog('Log stream disconnected.', 'error');
                stopBot();
            }
        );
        
        setCountdown(RUNTIME_DURATION_SECONDS);
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    stopBot();
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

      } catch (e: any) {
        addRuntimeLog(`Failed to start bot: ${e.message}`, 'error');
        setRuntimeState('STOPPED');
      }
  }, [runtimeState, addRuntimeLog, stopBot]);
  
  const restartBot = useCallback(async () => {
    addRuntimeLog('Restarting bot...');
    if (runtimeState === 'RUNNING') {
        await stopBot();
    }
    setTimeout(() => {
      startBot();
    }, 1000);
  }, [stopBot, startBot, runtimeState, addRuntimeLog]);

  const handleReset = async () => {
    await stopBot();
    resetBuild();
    resetRuntime();
  };

  const handleBuildError = (errorLog: string) => {
      addLog(`Build failed (Attempt ${buildLoopAttempt.current + 1}).`, 'error');
      addLog(errorLog, 'raw');
      lastBuildError.current = errorLog;
      buildLoopAttempt.current += 1;

      if (buildLoopAttempt.current >= MAX_FIX_ATTEMPTS) {
        addLog(`Unable to fix the build after ${MAX_FIX_ATTEMPTS - 1} attempts.`, 'error');
        addLog(`Final build error details:`, 'error');
        addLog(lastBuildError.current, 'raw');
        setBuildState('ERROR');
      } else {
        runDebugStep();
      }
  };

  const runBuildStep = (filesToBuild: GeneratedFile[]) => {
      setBuildState('BUILDING');
      currentBuildFiles.current = filesToBuild;
      backend.buildBot(filesToBuild, token, {
          onProgress: (log) => addLog(log, 'log'),
          onComplete: () => {
            setBuildState('SUCCESS');
            setHasUnrebuiltChanges(false);
          },
          onError: handleBuildError,
      });
  };

  const runDebugStep = async () => {
      setBuildState('DEBUGGING');
      addLog(`AI Debugger (Attempt ${buildLoopAttempt.current}/${MAX_FIX_ATTEMPTS-1}): Analyzing build error...`);

      try {
          const fixData = await geminiService.debugCode(prompt, currentBuildFiles.current, lastBuildError.current, library);
          
          if (!fixData.fixed_files || fixData.fixed_files.length === 0) {
              throw new Error("AI could not determine a fix. Please review the build logs above for details.");
          }
          
          addLog(`AI has proposed fixes with ${Math.round(fixData.confidence * 100)}% confidence. Applying changes...`);
          let updatedFiles = [...currentBuildFiles.current];

          fixData.fixed_files.forEach((fixedFile: FixedFile) => {
              const fileIndex = updatedFiles.findIndex(f => f.name === fixedFile.name);
              if (fileIndex !== -1) {
                  addLog(`- Applying fix to ${fixedFile.name}: ${fixedFile.changes_summary}`);
                  updatedFiles[fileIndex] = { name: fixedFile.name, code: fixedFile.code };
              } else {
                  addLog(`- AI added new file ${fixedFile.name}: ${fixedFile.changes_summary}`);
                  updatedFiles.push({ name: fixedFile.name, code: fixedFile.code });
              }
          });

          if (fixData.updated_requirements && fixData.updated_requirements.length > 0) {
              const reqsFile = updatedFiles.find(f => f.name === 'requirements.txt');
              if (reqsFile) {
                  addLog(`- Updating requirements.txt with: ${fixData.updated_requirements.join(', ')}`);
                  const existingReqs = new Set(reqsFile.code.split('\n').map(r => r.trim()).filter(Boolean));
                  fixData.updated_requirements.forEach((req: string) => existingReqs.add(req));
                  reqsFile.code = Array.from(existingReqs).join('\n');
              }
          }
          
          setGeneratedFiles(updatedFiles);
          addLog('Fixes applied. Retrying build...');
          runBuildStep(updatedFiles); // Retry build with fixed files
      } catch (e: any) {
          addLog(`AI Debugger failed: ${e.message}`, 'error');
          setBuildState('ERROR'); // End the process if debugging fails
      }
  };

  const startCodeGeneration = useCallback(async (userSecrets: Record<string, string>) => {
      try {
        setBuildState('PLANNING');
        buildLoopAttempt.current = 0;
        lastBuildError.current = '';
        addLog('Analyzing requirements and planning bot structure...');
        const structure = await geminiService.generateStructure(prompt, library);
        addLog('Bot structure planned successfully.');

        setBuildState('CODING');
        const filesToBuild: GeneratedFile[] = [];
        addLog(`Found ${structure.files.length} files to generate.`);
        for (const file of structure.files) {
            const fileCode = await geminiService.generateFileCode(prompt, JSON.stringify(structure), file, library, userSecrets);
            const newFile = { name: fileCode.file_name, code: fileCode.code };
            filesToBuild.push(newFile);
            setGeneratedFiles(prev => [...prev, newFile]);
            addLog(`- Generating code for ${newFile.name}`);
        }
        
        addLog('Generating setup files...');
        const setupFiles = await geminiService.generateSetupFiles(prompt, JSON.stringify(structure), library, userSecrets);
        const setupFilesData = [
          { name: 'requirements.txt', code: setupFiles.requirements_txt },
          { name: 'Dockerfile', code: setupFiles.dockerfile },
          { name: 'docker-compose.yml', code: setupFiles.docker_compose_yml },
          { name: 'README.md', code: setupFiles.readme_md }
        ];
        filesToBuild.push(...setupFilesData);
        setGeneratedFiles(prev => [...prev, ...setupFilesData]);

        addLog('All files generated.');
        runBuildStep(filesToBuild); // Start the first build attempt
      } catch (e: any) {
          addLog(`Failed during code generation: ${e.message}`, 'error');
          setBuildState('ERROR');
          return;
      }
  }, [prompt, library, addLog, token]);

  const handleStartConfiguration = useCallback(async () => {
    if (!prompt || !token) {
      addLog('Prompt and token are required.', 'error');
      return;
    }
    resetBuild();
    resetRuntime();
    addLog('Starting build process...');
    setBuildState('VALIDATING');
    addLog('Validating Telegram token...');

    try {
        const meta = await backend.getBotMetadata(token);
        setBotMetadata(meta);
        addLog('Token validated successfully.');
    } catch (e: any) {
        const errorMessage = e.message || 'An unknown error occurred during token validation.';
        addLog(`Token validation failed: ${errorMessage}`, 'error');
        setTokenError(errorMessage);
        setBuildState('IDLE');
        return;
    }
    
    try {
        addLog('Analyzing prompt for additional configuration...');
        const { secrets } = await geminiService.extractRequiredSecrets(prompt);
        
        if (secrets && secrets.length > 0) {
            addLog(`Found ${secrets.length} additional configuration(s) required.`);
            setRequiredSecrets(secrets);
            setBuildState('GATHERING_CONFIG');
        } else {
            addLog('No additional configuration required. Starting code generation...');
            startCodeGeneration({});
        }
    } catch (e: any) {
        addLog(`Failed during configuration analysis: ${e.message}`, 'error');
        setBuildState('ERROR');
    }
  }, [prompt, token, addLog, startCodeGeneration]);
  
  const handleSecretsSubmitted = useCallback((secrets: Record<string, string>) => {
      addLog('Configuration received. Starting code generation...');
      startCodeGeneration(secrets);
  }, [startCodeGeneration]);

  const handleFileUpdate = (fileName: string, newCode: string) => {
    setGeneratedFiles(files => files.map(f =>
        f.name === fileName ? { ...f, code: newCode } : f
    ));
    setHasUnrebuiltChanges(true);
    addLog(`Saved changes to ${fileName}. Click 'Rebuild' to apply them.`, 'log');
  };

  const handleRebuild = async () => {
      addLog('Rebuilding bot with your changes...', 'log');
      if (runtimeState !== 'STOPPED') {
          await stopBot();
      }
      resetRuntime();
      // Clear old build logs but keep generation logs
      const firstBuildLogIndex = logs.findIndex(l => l.message.includes('Connecting to build server'));
      setLogs(logs => logs.slice(0, firstBuildLogIndex > -1 ? firstBuildLogIndex : logs.length));
      
      buildLoopAttempt.current = 0;
      lastBuildError.current = '';
      runBuildStep(generatedFiles);
  };

  useEffect(() => {
    return () => {
      backend.stopBot();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (runtimeLogStreamRef.current) runtimeLogStreamRef.current.close();
    };
  }, []);
  
  useEffect(() => {
    if (buildState === 'SUCCESS' && runtimeState !== 'RUNNING') {
        startBot();
    }
  }, [buildState, runtimeState, startBot]);
  
  const isBuilding = ['VALIDATING', 'PLANNING', 'CODING', 'BUILDING', 'DEBUGGING', 'GATHERING_CONFIG'].includes(buildState);
  const isBuildInProgress = buildState !== 'IDLE' && buildState !== 'SUCCESS' && buildState !== 'ERROR';

  return (
    <div className="bg-gray-950 text-gray-200 min-h-screen font-sans flex flex-col">
      <Header />
      <main className="container mx-auto p-4 md:p-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {buildState === 'IDLE' && (
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 self-start">
              <h2 className="text-xl font-semibold mb-4 text-white">Create a Telegram Bot</h2>
              <p className="text-gray-400 mb-6">Describe your bot, provide your token from @BotFather, choose a library, and let AI do the rest.</p>
              <PromptForm 
                prompt={prompt}
                setPrompt={setPrompt}
                token={token}
                setToken={setToken}
                library={library}
                setLibrary={setLibrary}
                onBuild={handleStartConfiguration}
                isBuilding={isBuilding}
                tokenError={tokenError}
              />
            </div>
          )}

          {isBuildInProgress && (
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 self-start">
              <ProgressTracker 
                state={buildState}
                logs={logs}
                files={generatedFiles}
                onOpenFile={(fileName) => {
                  const file = generatedFiles.find(f => f.name === fileName);
                  if (file) setModalFile(file);
                }}
              />
               {buildState === 'GATHERING_CONFIG' && (
                <ConfigurationForm
                  secrets={requiredSecrets}
                  onSubmit={handleSecretsSubmitted}
                  isBuilding={isBuilding}
                />
              )}
            </div>
          )}

          {(buildState === 'SUCCESS' || buildState === 'ERROR') && (
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 lg:col-span-2">
              <BotRunner
                isErrorState={buildState === 'ERROR'}
                botMetadata={botMetadata}
                files={generatedFiles}
                runtimeState={runtimeState}
                terminalLogs={buildState === 'ERROR' ? logs : runtimeLogs}
                countdown={countdown}
                onStart={startBot}
                onStop={stopBot}
                onRestart={restartBot}
                onReset={handleReset}
                onClearLogs={() => {
                  if (buildState === 'ERROR') {
                    const firstBuildLogIndex = logs.findIndex(l => l.message.includes('Connecting to build server'));
                    if (firstBuildLogIndex > -1) {
                        setLogs(logs.slice(0, firstBuildLogIndex));
                    } else {
                        setLogs([]);
                    }
                  } else {
                      setRuntimeLogs([]);
                  }
                }}
                onFileUpdate={handleFileUpdate}
                onRebuild={handleRebuild}
                hasUnrebuiltChanges={hasUnrebuiltChanges}
              />
            </div>
          )}
          
          <div className="hidden lg:block self-start">
             <WorkflowGuide buildState={buildState} runtimeState={runtimeState} />
          </div>
        </div>
      </main>
      {modalFile && <CodeModal file={modalFile} onClose={() => setModalFile(null)} />}
    </div>
  );
}

export default App;
