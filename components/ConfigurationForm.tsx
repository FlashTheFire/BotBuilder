import React, { useState, FormEvent } from 'react';
import type { RequiredSecret } from '../types';
import { Tooltip } from './Tooltip';
import { InfoIcon } from './icons/InfoIcon';

interface ConfigurationFormProps {
  secrets: RequiredSecret[];
  onSubmit: (filledSecrets: Record<string, string>) => void;
  isBuilding: boolean;
}

export const ConfigurationForm: React.FC<ConfigurationFormProps> = ({ secrets, onSubmit, isBuilding }) => {
  const [formState, setFormState] = useState<Record<string, string>>(
    secrets.reduce((acc, secret) => ({ ...acc, [secret.key]: '' }), {})
  );

  const handleChange = (key: string, value: string) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formState);
  };

  const allFieldsFilled = secrets.every(secret => formState[secret.key]?.trim() !== '');

  return (
    <div className="mt-6 border-t border-gray-800 pt-6">
      <h3 className="text-lg font-semibold text-white mb-2">Additional Configuration Required</h3>
      <p className="text-sm text-gray-400 mb-4">Your bot needs the following secrets to function correctly. Please provide them below.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {secrets.map(secret => (
          <div key={secret.key}>
            <div className="flex items-center space-x-2 mb-2">
                <label htmlFor={secret.key} className="block text-sm font-medium text-gray-300 font-mono">
                    {secret.key}
                </label>
                <Tooltip content={secret.description}>
                    <InfoIcon className="w-4 h-4 text-gray-400" />
                </Tooltip>
            </div>
            <input
              type="text"
              id={secret.key}
              name={secret.key}
              value={formState[secret.key]}
              onChange={(e) => handleChange(secret.key, e.target.value)}
              className="block w-full bg-gray-900 border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white placeholder-gray-500 p-3 font-mono"
              placeholder={`Enter value for ${secret.key}`}
              disabled={isBuilding}
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={isBuilding || !allFieldsFilled}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          Continue Build
        </button>
      </form>
    </div>
  );
};