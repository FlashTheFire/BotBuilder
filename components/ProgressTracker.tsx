import React, { useEffect, useRef } from 'react';
import type { BuildState, LogEntry, GeneratedFile } from '../types';
import { PlanIcon } from './icons/PlanIcon';
import { CodeIcon } from './icons/CodeIcon';
import { RocketIcon } from './icons/RocketIcon';
import { PlayIcon } from './icons/PlayIcon';
import { DebugIcon } from './icons/DebugIcon';
import { Spinner } from './icons/Spinner';
import { KeyIcon } from './icons/KeyIcon';

interface ProgressTrackerProps {
  state: BuildState;
  logs: LogEntry[];
  files: GeneratedFile[];
  onOpenFile: (fileName: string) => void;
}

const steps = [
  { id: 'GATHERING_CONFIG', name: 'Configuration', icon: KeyIcon },
  { id: 'PLANNING', name: 'Planning', icon: PlanIcon },
  { id: 'CODING', name: 'Coding', icon: CodeIcon },
  { id: 'BUILDING', name: 'Building', icon: RocketIcon },
  { id: 'RUNNING', name: 'Running', icon: PlayIcon },
  { id: 'DEBUGGING', name: 'Debugging', icon: DebugIcon },
];

const stateToIndex = (state: BuildState): number => {
    switch (state) {
        case 'VALIDATING': return 0; // Activates the first step (Configuration)
        case 'GATHERING_CONFIG': return 0;
        case 'PLANNING': return 1;
        case 'CODING': return 2;
        case 'BUILDING': return 3;
        case 'RUNNING': return 4;
        case 'DEBUGGING': return 5;
        case 'SUCCESS': return 6;
        case 'ERROR': return -1;
        default: return -1;
    }
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ state, logs, files, onOpenFile }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const currentIndex = stateToIndex(state);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Filter out the 'Debugging' step unless the state is actually 'DEBUGGING'
  // Also filter out 'Configuration' if it was skipped
  const wasConfigSkipped = !logs.some(log => log.message.includes('configuration(s) required'));
  const visibleSteps = steps.filter(step => {
    if (state === 'DEBUGGING') return step.id !== 'GATHERING_CONFIG'; // Hide config during debug
    if (step.id === 'DEBUGGING') return false;
    if (step.id === 'GATHERING_CONFIG' && currentIndex > 0 && wasConfigSkipped) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-semibold mb-4 text-white">Build Progress</h3>
      <div className="flex items-center space-x-2 md:space-x-4 mb-6">
        {visibleSteps.map((step, index) => {
          const stepIndex = stateToIndex(step.id as BuildState);
          const isActive = currentIndex === stepIndex;
          const isCompleted = currentIndex > stepIndex;
          const isDebugging = state === 'DEBUGGING' && step.id === 'DEBUGGING';

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-700'} ${isDebugging ? 'bg-yellow-500' : ''}`}>
                    {isActive ? <Spinner /> : <step.icon className="w-6 h-6 text-white" />}
                </div>
                <p className={`mt-2 text-xs text-center ${isActive || isCompleted ? 'text-white' : 'text-gray-400'}`}>{step.name}</p>
              </div>
              {index < visibleSteps.length - 1 && <div className={`flex-1 h-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}`}></div>}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex-1 bg-gray-950 p-4 rounded-md overflow-y-auto h-64" ref={logContainerRef}>
        <div className="font-mono text-xs text-gray-400 space-y-2">
            {logs.map((log, index) => {
                const fileMentionRegex = /- (?:Generating code for|Applying fix to|AI added new file) ([\w.-]+)/;
                const match = log.message.match(fileMentionRegex);

                if (log.type === 'raw') {
                    return (
                        <div key={index} className="flex">
                            <span className="mr-2 text-gray-600 flex-shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                            <pre className="whitespace-pre-wrap bg-gray-800 p-3 rounded-md text-red-400 text-xs w-full overflow-x-auto flex-1">{log.message}</pre>
                        </div>
                    );
                }

                if (match) {
                    const fileName = match[1];
                    const fileExists = files.some(f => f.name === fileName);
                    const parts = log.message.split(fileName);

                    return (
                         <div key={index} className="flex text-gray-400">
                            <span className="mr-2 text-gray-600">{log.timestamp.toLocaleTimeString()}</span>
                            <p className="whitespace-pre-wrap">
                                {parts[0]}
                                {fileExists ? (
                                    <button 
                                        onClick={() => onOpenFile(fileName)}
                                        className="text-yellow-500 hover:underline focus:outline-none font-semibold"
                                    >
                                        {fileName}
                                    </button>
                                ) : (
                                    <span className="font-semibold">{fileName}</span>
                                )}
                                {parts[1]}
                            </p>
                        </div>
                    );
                }
                
                return (
                    <div key={index} className={`flex ${log.type === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                        <span className="mr-2 text-gray-600">{log.timestamp.toLocaleTimeString()}</span>
                        <p className="whitespace-pre-wrap">{log.message}</p>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};