import React, { useState } from 'react';
import type { GeneratedFile } from '../types';
import { CodeViewer } from './CodeViewer';
import { CopyIcon } from './icons/CopyIcon';

interface CodeModalProps {
  file: GeneratedFile;
  onClose: () => void;
}

export const CodeModal: React.FC<CodeModalProps> = ({ file, onClose }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    navigator.clipboard.writeText(file.code).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-950 bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-900 rounded-lg shadow-xl w-11/12 max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-gray-700"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white font-mono">{file.name}</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white focus:outline-none transition-colors"
              aria-label="Copy code"
            >
              <CopyIcon className="w-5 h-5" />
              <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white focus:outline-none"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {/* FIX: Pass fileName prop to CodeViewer to satisfy its required props. onSave is now optional in CodeViewer. */}
          <CodeViewer code={file.code} fileName={file.name} />
        </div>
      </div>
    </div>
  );
};