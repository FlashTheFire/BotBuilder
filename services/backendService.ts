import type { GeneratedFile, LogEntry, BotMetadata } from '../types';

// This service acts as the client for a real backend API.
// For development, you would typically proxy these requests to your backend server.
const API_PREFIX = '/api';
const BUILD_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Builds the bot via a WebSocket connection. Does not return a promise, but uses callbacks for an event-driven flow.
 * Returns the WebSocket instance for potential cleanup.
 */
export const buildBot = (
    files: GeneratedFile[],
    token: string,
    callbacks: {
        onProgress: (log: string) => void;
        onComplete: () => void;
        onError: (errorLog: string) => void;
    }
): WebSocket => {
    const { onProgress, onComplete, onError } = callbacks;
    
    // Manually construct the WebSocket URL to avoid issues with the URL constructor in some environments.
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}${API_PREFIX}/build`;

    onProgress('Connecting to build server...');
    const ws = new WebSocket(wsUrl);
    let accumulatedErrorLogs = '';
    let completed = false;

    const timeoutId = setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(4008, 'Client-side timeout');
            if (!completed) {
                completed = true;
                onError(`Build request timed out after ${BUILD_TIMEOUT_MS / 1000} seconds.`);
            }
        }
    }, BUILD_TIMEOUT_MS);

    const cleanup = () => {
        clearTimeout(timeoutId);
    };

    ws.onopen = () => {
        // Send the necessary data to start the build on the backend
        ws.send(JSON.stringify({ files, token }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'BUILD_LOG':
                    // Only pass string logs to onProgress
                    if (typeof data.line === 'string') {
                        onProgress(data.line);
                        // Accumulate logs only if they might become part of an error message
                        if (data.line.toLowerCase().includes('error')) {
                            accumulatedErrorLogs += data.line + '\n';
                        }
                    }
                    break;
                case 'BUILD_DONE':
                    cleanup();
                    if (!completed) {
                        completed = true;
                        onProgress('✅ Build complete');
                        onComplete();
                    }
                    ws.close(1000, 'Build finished successfully.');
                    break;
                case 'BUILD_ERROR':
                    cleanup();
                    if (!completed) {
                        completed = true;
                        onError(data.message || accumulatedErrorLogs || 'Unknown build error.');
                    }
                    ws.close(4001, 'Build failed.');
                    break;
            }
        } catch (e) {
            console.error("Failed to parse WebSocket message:", event.data);
            onProgress(`Error processing message from server: ${event.data}`);
        }
    };

    ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        cleanup();
        if (!completed) {
            completed = true;
            onError('WebSocket connection failed. Could not connect to the build server.');
        }
    };

    ws.onclose = (event) => {
        cleanup();
        if (!completed && event.code !== 1000) { // 1000 is normal closure
            completed = true;
            onError(`Build connection closed unexpectedly. Code: ${event.code}. Reason: ${event.reason || 'Check server logs.'}`);
        }
    };
    return ws;
};


/**
 * Sends a request to the backend to start the bot container.
 */
export const runBot = async (): Promise<void> => {
    const response = await fetch(`${API_PREFIX}/run`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to start bot on server: ${await response.text()}`);
    }
};

/**
 * Sends a request to the backend to stop the bot container.
 */
export const stopBot = async (): Promise<void> => {
    const response = await fetch(`${API_PREFIX}/stop`, { method: 'POST' });
     if (!response.ok) {
        console.warn(`Could not stop bot on server: ${await response.text()}`);
    }
};

/**
 * Sends a request to the backend to restart the bot container.
 */
export const restartBot = async (): Promise<void> => {
    const response = await fetch(`${API_PREFIX}/restart`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to restart bot on server: ${await response.text()}`);
    }
};

/**
 * Fetches the bot's metadata by calling the Telegram API directly.
 */
export const getBotMetadata = async (token: string): Promise<BotMetadata> => {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        const errorMessage = data.description || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    
    // The `getMe` method returns the bot object inside the `result` key
    const { id, username } = data.result;
    return { id, username };
};

/**
 * Creates a persistent Server-Sent Events (SSE) connection to stream runtime logs.
 * Returns the EventSource instance so it can be closed by the client.
 */
export const streamRuntimeLogs = (
    onLog: (log: LogEntry) => void,
    onError: (event: Event) => void
): EventSource => {
    const eventSource = new EventSource(`${API_PREFIX}/logs`);

    eventSource.onmessage = (event) => {
        try {
            // Assume the backend sends the full LogEntry object as a JSON string
            const logEntry: LogEntry = JSON.parse(event.data);
            // Convert timestamp string back to Date object
            logEntry.timestamp = new Date(logEntry.timestamp);
            onLog(logEntry);
        } catch (e) {
            console.error("Failed to parse log event from server:", event.data, e);
        }
    };

    eventSource.onerror = (event) => {
        console.error("Log stream connection error:", event);
        onError(event);
        eventSource.close();
    };

    return eventSource;
};