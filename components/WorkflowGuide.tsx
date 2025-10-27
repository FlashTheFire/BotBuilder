import React from 'react';
import type { BuildState, BotRuntimeState } from '../types';
import { PlanIcon } from './icons/PlanIcon';
import { CodeIcon } from './icons/CodeIcon';
import { RocketIcon } from './icons/RocketIcon';
import { PlayIcon } from './icons/PlayIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { Spinner } from './icons/Spinner';
import { CheckIcon } from './icons/CheckIcon';
import { DebugIcon } from './icons/DebugIcon';

interface WorkflowGuideProps {
  buildState: BuildState;
  runtimeState: BotRuntimeState;
}

const steps = [
  { id: 'PLANNING', name: 'Plan', description: "You describe your bot, and the AI architect designs a file structure and dependency list.", icon: PlanIcon },
  { id: 'CODING', name: 'Code', description: "The AI developer writes the Python code for each file, following best practices for the library you chose.", icon: CodeIcon },
  { id: 'BUILDING', name: 'Build', description: "We package your bot into a secure, isolated Docker container.", icon: RocketIcon },
  { id: 'DEBUGGING', name: 'Debug', description: "The AI is attempting to fix a build error automatically.", icon: DebugIcon },
  { id: 'RUNNING', name: 'Run', description: "You can start, stop, and view live logs from your bot in a sandboxed environment for 10 minutes.", icon: PlayIcon },
  { id: 'DOWNLOAD', name: 'Download', description: "Once you're happy, download a .zip of all the source code to run it anywhere.", icon: DownloadIcon },
];

const stateToStepIndex = (buildState: BuildState, runtimeState: BotRuntimeState): number => {
    if (buildState === 'SUCCESS' && runtimeState === 'RUNNING') return 4;
    if (buildState === 'SUCCESS' && runtimeState === 'STOPPED') return 5;
    if (buildState === 'DEBUGGING') return 3;
    if (buildState === 'BUILDING') return 2;
    if (buildState === 'CODING') return 1;
    if (buildState === 'PLANNING') return 0;
    return -1; // IDLE
};

export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ buildState, runtimeState }) => {
    const activeIndex = stateToStepIndex(buildState, runtimeState);

    return (
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 self-start">
            <h2 className="text-xl font-semibold mb-4 text-white">How it Works</h2>
            <div className="space-y-4">
                {steps.map((step, index) => {
                    // Hide debug step unless we are debugging
                    if (buildState !== 'DEBUGGING' && step.id === 'DEBUGGING') return null;
                    // Hide build step if we are debugging
                    if (buildState === 'DEBUGGING' && step.id === 'BUILDING') return null;

                    const isActive = Math.floor(activeIndex) === index;
                    const isCompleted = activeIndex > index;

                    let statusIcon;
                    if (isActive) {
                        statusIcon = <Spinner className="w-5 h-5 text-blue-400" />;
                    } else if (isCompleted) {
                        statusIcon = <CheckIcon className="w-5 h-5 text-green-400" />;
                    } else {
                        statusIcon = <step.icon className="w-5 h-5 text-gray-500" />;
                    }
                    
                    const isAvailable = (buildState === 'SUCCESS' && runtimeState === 'STOPPED' && step.id === 'DOWNLOAD');

                    return (
                        <div key={step.id} className="flex items-start space-x-4">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-500/20' : isCompleted ? 'bg-green-500/20' : isAvailable ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                                {isAvailable ? <DownloadIcon className="w-5 h-5 text-blue-400" /> : statusIcon}
                            </div>
                            <div>
                                <h3 className={`font-bold ${isActive || isCompleted || isAvailable ? 'text-white' : 'text-gray-400'}`}>{step.name}</h3>
                                <p className="text-sm text-gray-500">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};