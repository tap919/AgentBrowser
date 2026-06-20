# Integration Configuration

This document outlines the standardized port assignments and environment variables for the interconnected projects within the AgentBrowser ecosystem.

## Service Port Assignments

To ensure all services can run concurrently without port conflicts, the following assignments are enforced:

| Service               | Role                   | Port  | Notes                                             |
| :-------------------- | :--------------------- | :---- | :------------------------------------------------ |
| **AgentBrowser**      | Main UI                | `3000`| Next.js frontend.                                 |
| **Big-Homie**         | Python Agent (Backend) | `8888`| WebSocket server, as configured in AgentBrowser.  |
| **Claw-Protect**      | Security Service       | `3333`| TypeScript service, as configured in AgentBrowser.|
| **Mutly-Daemon-Agent**| TypeScript Daemon      | `4000`| Daemon API, resolves conflict with AgentBrowser.   |
| **VibeServe IDE**     | Frontend UI            | `3005`| React/Vite dev server, resolves conflict.         |
| **VibeServe Orchestrator**| Node.js Backend      | `3002`| Hono API, typically used by VibeServe IDE.      |
| **VibeServe MCP**     | Python MCP Server      | `8000`| Backend for VibeServe, used by Mutly.             |
| **RepoRank API**      | Repo Analysis API      | `3001`| Backend API, used by Mutly.                       |
| **RepoRank Web**      | RepoRank UI            | `5173`| Frontend for RepoRank.                            |

## Shared Environment Variables

The following environment variables should be consistently configured across projects as needed for inter-service communication:

*   **`AGENT_API_KEY` / `NEXT_PUBLIC_AGENT_API_KEY`**: A unified API key for Mutly and AgentBrowser interactions. Should match `MUTLY_API_KEY` in `Mutly-Daemon-Agent/.env`.
*   **`CLAW_PROTECT_API_KEY`**: API key for authenticating with Claw-Protect.
*   **`GEMINI_API_KEY`**: Required for LLM calls (e.g., in Claw-Protect, RepoRank).
*   **`VIBESERVE_MCP_URL`**: URL for Mutly to connect to the VibeServe MCP server.

## Next Steps

1.  Update the `.env.example` files and startup scripts for each project to reflect these port assignments.
2.  Start each service individually to confirm it launches on its assigned port.
3.  Perform basic API calls and UI interactions to verify interconnectivity.
