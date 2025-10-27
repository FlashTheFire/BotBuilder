/**
 * NOTE: This file contains server-side logic intended to be run in a Node.js environment.
 * It uses the 'dockerode' library to interact with the Docker daemon to build container images.
 * This code would be part of the backend service that the frontend's `backendService.ts` connects to.
 */

import Docker from 'dockerode';
import type { WebSocket } from 'ws'; // Assuming 'ws' library on the backend
import type { GeneratedFile } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';

// Initialize Dockerode. It will use the default socket path based on the OS.
const docker = new Docker();
const BUILD_TIMEOUT_MS = 120000; // 2 minutes, should match frontend

/**
 * Sends a message over a WebSocket connection.
 */
const sendWsMessage = (ws: WebSocket, type: string, payload: object) => {
    ws.send(JSON.stringify({ type, ...payload }));
};

/**
 * Checks if the Docker daemon is running and accessible.
 */
export const checkDockerDaemon = async (): Promise<boolean> => {
    try {
        await docker.ping();
        return true;
    } catch (error) {
        console.error("Docker daemon is not running or accessible:", error);
        return false;
    }
};

/**
 * Main handler for a build request from a WebSocket client.
 * Creates a temporary directory, writes files, builds the Docker image, and streams progress.
 */
export const handleBuildRequest = async (ws: WebSocket, files: GeneratedFile[], token: string) => {
    if (!await checkDockerDaemon()) {
        sendWsMessage(ws, 'BUILD_ERROR', { message: "Docker daemon is not running. Please start Docker and try again." });
        ws.close();
        return;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'botbuilder-'));
    const imageName = `botbuilder-img-${Date.now()}`;

    try {
        // Write all generated files to the temporary directory
        for (const file of files) {
            await fs.writeFile(path.join(tempDir, file.name), file.code);
        }

        // The context for the Docker build is the temporary directory containing the files.
        // We list the files to be included in the build context tarball.
        const buildContext = {
            context: tempDir,
            src: files.map(f => f.name)
        };

        const stream = await docker.buildImage(buildContext, {
            t: imageName,
            buildargs: {
                BOT_TOKEN: token // Pass token as a build argument if needed by Dockerfile
            },
            // Signal to automatically use .dockerignore if present
            dockerfile: 'Dockerfile'
        });

        // Set up a timeout for the build process
        const timeout = setTimeout(() => {
            // Dockerode doesn't have a direct stream.abort(). This is a conceptual example.
            // In a real scenario, you might need more complex logic to kill the build process.
            sendWsMessage(ws, 'BUILD_ERROR', { message: "Build timed out after 2 minutes." });
            ws.close();
        }, BUILD_TIMEOUT_MS);

        docker.modem.followProgress(stream, (err, res) => {
            clearTimeout(timeout);
            if (err) {
                sendWsMessage(ws, 'BUILD_ERROR', { message: err.message || 'Build failed during finalization.' });
            } else {
                // Look for error details in the response body if build failed
                const errorDetail = (res as any[]).find(r => r.errorDetail);
                if (errorDetail) {
                     sendWsMessage(ws, 'BUILD_ERROR', { message: errorDetail.errorDetail.message });
                } else {
                    sendWsMessage(ws, 'BUILD_DONE', { image: imageName });
                }
            }
            // Cleanup after build finishes or fails
            fs.rm(tempDir, { recursive: true, force: true });
        }, (event) => {
            // Stream every line of progress back to the client
            const line = event.stream || event.status || (event.progress ? `${event.id}: ${event.status} ${event.progress}` : '');
            if (line) {
                sendWsMessage(ws, 'BUILD_LOG', { line: line.trim() });
            }
        });

    } catch (error: any) {
        sendWsMessage(ws, 'BUILD_ERROR', { message: error.message || "An unexpected error occurred during build setup." });
        await fs.rm(tempDir, { recursive: true, force: true });
    }
};
