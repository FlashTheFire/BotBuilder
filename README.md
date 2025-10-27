# BotBuilder

## Project Title & Description

BotBuilder is a web application built with React and TypeScript that allows users to easily generate AI-powered Telegram bots. It leverages Node.js, Docker, and WebSocket communication to provide a streamlined bot creation and deployment experience.

## Key Features & Benefits

*   **AI-Powered Bot Generation:** Generate Telegram bots with AI capabilities.
*   **User-Friendly Interface:** Intuitive React-based UI for easy bot configuration.
*   **Code Generation:** Produces bot code ready for deployment.
*   **Real-time Progress Tracking:** Tracks bot building progress via WebSocket.
*   **Configuration Form:** Customizable bot settings through an interactive form.
*   **Code Viewer:** Allows previewing the generated bot code.
*   **Docker Integration:** Uses Docker for building and containerizing the bot.

## Prerequisites & Dependencies

Before you begin, ensure you have the following installed:

*   **Node.js:**  Version 18 or higher
*   **npm:** Node Package Manager (usually included with Node.js)
*   **Docker:** Docker installed and running
*   **A Telegram account:** Required to create and run the bot.
*   **A Google Generative AI API key:** For AI functionalities within the bot. This needs to be properly configured to access the Google AI service.

## Installation & Setup Instructions

Follow these steps to install and set up BotBuilder:

1.  **Clone the Repository:**

    ```bash
    git clone <repository_url>
    cd BotBuilder
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    * Create a `.env` file in the root directory
    * Add necessary environment variables, such as:
      ```
      GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
      ```

4.  **Running the Application:**

    ```bash
    npm run dev
    ```

    This will start the development server, and the application should be accessible in your browser at `http://localhost:<port>`, where `<port>` is the configured port for the development server (usually 3000 or 5173).

## Usage Examples & API Documentation

### Creating a Bot

1.  **Access the Application:** Open your web browser and navigate to the application's URL.
2.  **Configuration:**  Fill in the `ConfigurationForm` with the desired bot settings, including API keys, bot name, and functionalities.
3.  **Prompt:** Provide a prompt in the `PromptForm` to guide the bot's behavior.
4.  **Build:** Click the "Build Bot" button to start the bot generation process.
5.  **Progress Tracking:** Monitor the build progress using the `ProgressTracker` component.
6.  **Code Viewing:** Once the build is complete, view the generated code in the `CodeViewer` component.
7.  **Download:** Download the generated code for deployment.

### API Documentation (Backend - `services/backendService.ts`)

The `backendService.ts` file acts as a client for the backend API, simulating network requests.
For a production environment, these requests would be proxied to a dedicated backend server.

*   **`buildBot(botMetadata: BotMetadata, onLog: (log: LogEntry) => void, onFile: (file: GeneratedFile) => void, onComplete: () => void, onError: (error: string) => void)`:**

    *   Initiates the bot building process.
    *   **`botMetadata`**:  Contains the configuration data from the form, necessary prompts etc.
    *   **`onLog`**: Callback function to receive log entries from the backend.
    *   **`onFile`**: Callback function to receive generated files from the backend.
    *   **`onComplete`**: Callback function executed upon successful bot build.
    *   **`onError`**: Callback function executed if an error occurs during the build process.

## Configuration Options

The application supports several configuration options, primarily managed through the UI components and environment variables:

*   **`GOOGLE_API_KEY`**:  Required for accessing Google's AI services. Stored as an environment variable.
*   **Bot Name**: The desired name for your telegram bot, defined via the `ConfigurationForm`.
*   **Bot Description**: A description of the Telegram bot's purpose and functionality. Provided through the `ConfigurationForm`.
*   **Prompt**: The core prompt passed to the language model, determining how the bot will behave. Input via the `PromptForm`.

## Contributing Guidelines

We welcome contributions to BotBuilder! To contribute:

1.  **Fork the Repository:** Fork the repository to your GitHub account.
2.  **Create a Branch:** Create a new branch for your feature or bug fix.
3.  **Make Changes:** Implement your changes and ensure they are well-tested.
4.  **Submit a Pull Request:** Submit a pull request to the main branch with a clear description of your changes.

## License Information

This project is licensed under [License Type]. Please refer to the `LICENSE` file for more information.
**(Note: The original data did not specify a license, so please add the appropriate license details here)**

## Acknowledgments

*   React: For providing the foundation for the user interface.
*   TypeScript: For adding type safety and structure to the project.
*   Node.js: For the server-side environment and tooling.
*   Docker: For containerization and deployment.
*   Google Generative AI: For powering the bot's AI capabilities.
*   Tailwind CSS: For providing utility-first CSS styling.
