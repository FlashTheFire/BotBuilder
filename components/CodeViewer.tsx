import React, { useState, useEffect, useMemo } from 'react';

const highlightPythonCode = (code: string): string[] => {
    if (typeof code !== 'string') {
        return [''];
    }
    const pythonKeywords = 'def|class|import|from|return|if|elif|else|for|while|in|try|except|finally|with|as|pass|break|continue|True|False|None|async|await|lambda|is|not|and|or|global|nonlocal|yield|assert|del|raise';
    const pattern = new RegExp(
        `(?<comment>#.*)|` +
        `(?<string>".*?"|'.*?')|` +
        `(?<keyword>\\b(${pythonKeywords})\\b)|` +
        `(?<functionName>(?<=\\b(def|class)\\s+)\\w+)|` +
        `(?<decorator>@\\w+)|` +
        `(?<number>\\b\\d+\\b)`,
    'g');
    const lines = code.split('\n');
    return lines.map(line => {
        const escapedLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escapedLine.replace(pattern, (match, ...args) => {
            const groups = args[args.length - 1];
            if (groups.comment) return `<span class="text-gray-600">${groups.comment}</span>`;
            if (groups.string) return `<span class="text-green-400">${groups.string}</span>`;
            if (groups.keyword) return `<span class="text-purple-500">${groups.keyword}</span>`;
            if (groups.functionName) return `<span class="text-blue-400">${groups.functionName}</span>`;
            if (groups.decorator) return `<span class="text-yellow-500">${groups.decorator}</span>`;
            if (groups.number) return `<span class="text-blue-400">${groups.number}</span>`;
            return match;
        });
    });
};

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);
const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3H5.25A2.25 2.25 0 003 5.25v11.25z" />
  </svg>
);

interface CodeViewerProps {
  code: string;
  // FIX: Made onSave optional to allow the component to be used in a read-only mode.
  onSave?: (newCode: string) => void;
  fileName: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ code, onSave, fileName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedCode, setEditedCode] = useState(code);

    useEffect(() => {
        setEditedCode(code);
        setIsEditing(false);
    }, [code, fileName]);

    const handleSave = () => {
        // FIX: Guard the onSave call since it's now optional.
        if (onSave) {
            onSave(editedCode);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedCode(code);
        setIsEditing(false);
    };
    
    // We only re-calculate highlighting when not editing for performance.
    const highlightedLines = useMemo(() => highlightPythonCode(code), [code]);

    return (
        <div className="flex flex-col h-full bg-gray-950">
            <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <span className="font-mono text-sm text-gray-300">{fileName}</span>
                {/* FIX: Conditionally render the edit/save controls only if an onSave handler is provided. */}
                {onSave && (
                    <div className="flex items-center space-x-2">
                        {isEditing ? (
                            <>
                                <button onClick={handleSave} className="flex items-center space-x-1 text-sm px-2 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white">
                                    <SaveIcon className="w-4 h-4" />
                                    <span>Save</span>
                                </button>
                                <button onClick={handleCancel} className="text-sm px-2 py-1 rounded-md bg-gray-600 hover:bg-gray-700 text-white">
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="flex items-center space-x-1 text-sm px-2 py-1 rounded-md bg-gray-600 hover:bg-gray-700 text-white">
                                <EditIcon className="w-4 h-4" />
                                <span>Edit</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-auto">
                {isEditing ? (
                    <textarea
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value)}
                        className="w-full h-full p-4 bg-gray-950 text-gray-200 font-mono text-sm border-0 focus:ring-0 resize-none"
                        spellCheck="false"
                    />
                ) : (
                    <div className="text-sm font-mono flex h-full w-full">
                        <div className="pr-4 text-right text-gray-700 select-none sticky left-0 bg-gray-950 z-10 p-4">
                            {highlightedLines.map((_, index) => (
                                <div key={index}>{index + 1}</div>
                            ))}
                        </div>
                        <div className="flex-1 p-4">
                            {highlightedLines.map((line, index) => (
                                <div key={index} className="whitespace-pre" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};