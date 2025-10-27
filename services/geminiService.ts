import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedFile, BotStructure, FixedFile, RequiredSecret } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = "gemini-2.5-pro";

const callGemini = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                temperature: 0.2,
            }
        });
        const text = response.text.trim();
        // Clean the response to ensure it's valid JSON when expected
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*])/);
        if (jsonMatch) {
            // Prioritize the first non-null match group
            return jsonMatch[1] || jsonMatch[2] || jsonMatch[3];
        }
        return text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a valid response from AI. Please check your API key and prompt.");
    }
};

const callGeminiForJson = async <T>(prompt: string, retries = 1): Promise<T> => {
    let lastError: any = null;
    for (let i = 0; i <= retries; i++) {
        try {
            const text = await callGemini(prompt);
            // A simple regex to remove trailing commas which are a common cause of JSON parsing errors.
            const sanitizedText = text.replace(/,(?=\s*[}\]])/g, '');
            return JSON.parse(sanitizedText) as T;
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} to get valid JSON failed. Error: ${error}. Retrying...`);
            if (i < retries) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    throw new Error(`Failed to get a valid JSON response from the AI after ${retries + 1} attempts. Last error: ${lastError.message}`);
};

interface SecretsResponse {
    secrets: RequiredSecret[];
}

export const extractRequiredSecrets = (userPrompt: string): Promise<SecretsResponse> => {
    const prompt = `You are a bot configuration analyst. Analyze the user's prompt: "${userPrompt}". Identify any additional secret keys or configuration values needed beyond the Telegram Bot Token. For example, a 'weather bot' needs a weather API key, an 'admin bot' might need an admin user ID. Output ONLY a valid JSON object in this exact schema: {"secrets": [{"key": "SECRET_NAME", "description": "What this secret is for and where to get it."}]}. If no extra secrets are needed, return an empty array {"secrets": []}. Examples: {"key": "OPENWEATHER_API_KEY", "description": "Your API key from OpenWeatherMap for fetching weather data."}, {"key": "ADMIN_TELEGRAM_ID", "description": "The numeric Telegram User ID of the bot administrator."}.`;
    return callGeminiForJson<SecretsResponse>(prompt);
};


export const generateStructure = (userPrompt: string, library: string): Promise<BotStructure> => {
    const prompt = `You are an expert Telegram bot architect using Python. The user has selected the '${library}' library from a list including 'python-telegram-bot', 'aiogram', 'pyTelegramBotAPI', 'telethon', and 'pyrogram'. If the library is 'python-telegram-bot', assume v20+. The user wants to build a Telegram bot described as: ${userPrompt}. For example, if the prompt is 'a bot that echoes messages with emojis', keep it simple; for 'a weather notifier with database storage', include DB setup. First, analyze the prompt to identify core features: handlers (e.g., custom commands like /settings, /help, as well as /start, message, callback), external APIs (e.g., weather via OpenWeather), storage (SQLite if needed), and error handling. Always include a /help command that lists all available commands. Then, design a modular file structure: always include 'main.py' for entrypoint, 'config.py' for token/env vars, 'handlers.py' for message/command logic, 'utils.py' for helpers (e.g., API calls), and optional files like 'database.py' only if required—do not add unnecessary files to keep it lightweight. Also, specify a 'requirements.txt' list (e.g., ${library}, requests, aiosqlite) and a run command like 'python main.py'. Output ONLY a valid JSON object in this exact schema: {'files': [{'name': 'filename.py', 'purpose': 'brief description', 'is_required': true/false}], 'requirements': ['package1==version', ...], 'run_cmd': 'string command to start', 'docker_entry': ['python', 'main.py'], 'estimated_complexity': 'low/medium/high'}. Ensure all code will use async/await where needed, handle exceptions gracefully, and placeholder for BOT_TOKEN as 'YOUR_BOT_TOKEN' to be replaced later. No code yet—just the plan.`;
    return callGeminiForJson<BotStructure>(prompt);
};

interface FileCodeResponse {
  file_name: string;
  code: string;
  notes: string;
}

export const generateFileCode = (userPrompt: string, structureJson: string, file: { name: string, purpose: string }, library: string, secrets: Record<string, string>): Promise<FileCodeResponse> => {
    const secretKeys = Object.keys(secrets);
    const prompt = `You are a senior Python developer specializing in Telegram bots. You will write code for the '${library}' library. If the library is 'python-telegram-bot', use v20+ conventions. Based on the user's bot description: ${userPrompt}, the overall structure: ${structureJson}, and these required secrets which will be available as environment variables: ${JSON.stringify(secretKeys)}, write the full, production-ready code for exactly one file: ${file.name} (purpose: ${file.purpose}). For config.py (if it exists), load BOT_TOKEN and all other secrets from os.environ. For main.py, include imports, load configs, set up the application/bot, register all command handlers (like /start, /help, and any custom ones), and start polling. For handlers.py, define async functions for each command. Implement a /help command that provides a user-friendly list of all available commands and their functions. Use the provided secrets for their intended purpose (e.g., use a weather API key for API calls). Add logging and handle errors with try/except. Keep code clean and well-commented. Output ONLY a valid JSON: {'file_name': '${file.name}', 'code': 'full indented Python code as string', 'notes': 'any setup instructions, e.g., env vars needed'}. Ensure it's bug-free, compatible with Python 3.10+, and uses only listed requirements.`;
    return callGeminiForJson<FileCodeResponse>(prompt);
};

interface SetupFilesResponse {
    requirements_txt: string;
    dockerfile: string;
    docker_compose_yml: string;
    readme_md: string;
}

export const generateSetupFiles = (userPrompt: string, structureJson: string, library: string, secrets: Record<string, string>): Promise<SetupFilesResponse> => {
    const secretKeys = Object.keys(secrets);
    const prompt = `You are a setup file generator for Python Telegram bots. The user has selected the '${library}' library. Given the bot structure: ${structureJson}, user prompt: ${userPrompt}, and these required secret keys: ${JSON.stringify(secretKeys)}, generate:
1.  A precise requirements.txt for pip install, including '${library}' and any other necessary packages.
2.  A minimal, secure, and cache-optimized Dockerfile. It MUST use this specific structure to maximize layer caching and speed up rebuilds: 1. Use 'python:3.12-slim' as the base. 2. Create a non-root user and switch to it for security. 3. Set a WORKDIR. 4. COPY only 'requirements.txt' first. 5. RUN 'pip install --no-cache-dir -r requirements.txt'. This ensures dependencies are only reinstalled when requirements.txt changes. 6. COPY the rest of the application code (e.g., 'COPY . .'). 7. Set the CMD to run the bot.
3.  A docker-compose.yml: version '3.8', service 'bot', build context '.', with environment variables for BOT_TOKEN and all other secrets (${secretKeys.join(', ')}) read from a .env file.
4.  A comprehensive README.md file in Markdown format with '## Overview', '## Getting Started' (with .env instructions for all secrets), '## How to Run', '## How to Stop', and '## Security Notes' sections.
Output ONLY a valid JSON object with keys: 'requirements_txt', 'dockerfile', 'docker_compose_yml', 'readme_md'.
Example docker-compose.yml environment section for secrets ['API_KEY1', 'API_KEY2']:
    environment:
      - BOT_TOKEN=\${BOT_TOKEN}
      - API_KEY1=\${API_KEY1}
      - API_KEY2=\${API_KEY2}
`;
    return callGeminiForJson<SetupFilesResponse>(prompt);
};

interface DebugResponse {
    fixed_files: FixedFile[];
    updated_requirements: string[];
    retry_cmd: string;
    confidence: number;
}

export const debugCode = (userPrompt: string, currentFiles: GeneratedFile[], errorLog: string, library: string): Promise<DebugResponse> => {
    const currentFilesJson = JSON.stringify(currentFiles.map(f => ({ name: f.name, code: f.code })));
    const prompt = `You are a debugging expert for Python Telegram bots. The bot is built with the '${library}' library. The original user prompt was: ${userPrompt}. Current code files: ${currentFilesJson}. The bot failed to run with this exact error log: ${errorLog}. Analyze: Identify root cause (e.g., missing import, async mismatch, token invalid— but assume token is valid). Propose fixes: Edit ONLY the minimal files needed (e.g., add import in main.py), or add new utils. Ensure fixes align with prompt features without breaking others. For example, if 'ModuleNotFoundError: aiohttp', add 'aiohttp' to requirements.txt and import it where used. Output ONLY JSON: {'fixed_files': [{'name': 'filename.py', 'code': 'full new code string', 'changes_summary': 'brief bullet points of diffs'}], 'updated_requirements': ['new packages if any'], 'retry_cmd': 'same as before', 'confidence': 0.9 (0-1 scale) }. If unfixable in one go, suggest human review. Keep changes surgical to avoid regressions.`;
    return callGeminiForJson<DebugResponse>(prompt);
};