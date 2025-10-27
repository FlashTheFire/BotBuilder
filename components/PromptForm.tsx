import React from 'react';
import { Tooltip } from './Tooltip';
import { InfoIcon } from './icons/InfoIcon';

interface PromptFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  token: string;
  setToken: (token: string) => void;
  library: string;
  setLibrary: (library: string) => void;
  onBuild: () => void;
  isBuilding: boolean;
  tokenError: string | null;
}

const libraries = [
    { id: 'python-telegram-bot', name: 'python-telegram-bot (Recommended)' },
    { id: 'aiogram', name: 'aiogram' },
    { id: 'pyTelegramBotAPI', name: 'pyTelegramBotAPI (Telebot)' },
    { id: 'telethon', name: 'Telethon' },
    { id: 'pyrogram', name: 'Pyrogram' },
];

export const PromptForm: React.FC<PromptFormProps> = ({ prompt, setPrompt, token, setToken, library, setLibrary, onBuild, isBuilding, tokenError }) => {
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onBuild(); }} className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 mb-2">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">
                1. Describe your bot
            </label>
            <Tooltip content={<><strong>What it's for:</strong> Describe your bot's main functions in plain English.<br/><strong>Example:</strong> 'A bot that sends a daily joke at 8 AM' or 'A quiz bot with a leaderboard'.</>}>
                <InfoIcon className="w-4 h-4 text-gray-400" />
            </Tooltip>
        </div>
        <textarea
          id="prompt"
          name="prompt"
          rows={6}
          className="block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white placeholder-gray-500 p-3"
          placeholder="e.g., 'An inline button calculator bot'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isBuilding}
        />
      </div>
      <div>
        <div className="flex items-center space-x-2 mb-2">
            <label htmlFor="token" className="block text-sm font-medium text-gray-300">
              2. Enter your Telegram Bot Token
            </label>
            <Tooltip content={<><strong>Where to get it:</strong> Talk to @BotFather on Telegram, use the /newbot command, and it will give you a token.<br/><strong>Example Format:</strong> '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'</>}>
                <InfoIcon className="w-4 h-4 text-gray-400" />
            </Tooltip>
        </div>
        <input
          type="password"
          id="token"
          name="token"
          className={`block w-full bg-gray-900 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white p-3 ${tokenError ? 'border-red-500' : 'border-gray-700'}`}
          placeholder="Paste your token from @BotFather"
          value={token}
          onChange={handleTokenChange}
          disabled={isBuilding}
          aria-invalid={!!tokenError}
          aria-describedby="token-error"
        />
        {tokenError && <p id="token-error" className="mt-2 text-sm text-red-400">{tokenError}</p>}
      </div>
      <div>
        <div className="flex items-center space-x-2 mb-2">
            <label htmlFor="library" className="block text-sm font-medium text-gray-300">
              3. Choose a Python Library
            </label>
            <Tooltip content="This determines the underlying code framework for your bot. If you're unsure, the recommended option is a great starting point for most bots.">
                <InfoIcon className="w-4 h-4 text-gray-400" />
            </Tooltip>
        </div>
        <select
          id="library"
          name="library"
          className="block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white p-3"
          value={library}
          onChange={(e) => setLibrary(e.target.value)}
          disabled={isBuilding}
        >
            {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>{lib.name}</option>
            ))}
        </select>
      </div>
      <div>
        <button
          type="submit"
          disabled={isBuilding || !prompt || !token}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          {isBuilding ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Building...
            </>
          ) : 'Build My Bot'}
        </button>
      </div>
    </form>
  );
};