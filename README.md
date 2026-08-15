# Node.js Process Orchestrator

A lightweight, localized process manager daemon and web-based dashboard designed to orchestrate multiple Node.js applications concurrently. This tool was built to bypass the overhead of enterprise process managers while maintaining direct control over execution state, port binding, and dynamic routing.

## Architecture

The system operates on a decoupled client-server model:
1. **Manager Daemon (`manager.js`):** An Express-driven REST API that utilizes the native Node.js `child_process.spawn` to instantiate and manage target scripts. It maintains execution state in memory and persists configuration metadata to the filesystem.
2. **Web Dashboard (`public/index.html`):** A vanilla HTML/JS frontend utilizing Fetch API polling for real-time state synchronization, featuring dynamic endpoint generation and a zero-dependency dark-themed UI.
3. **Configuration Store (`servers.json`):** A flat-file JSON registry ensuring process configurations survive daemon restarts.

## Prerequisites

- **Environment:** Windows, Linux, or macOS.
- **Runtime:** Node.js (v14.x or higher recommended).
- **Permissions:** PowerShell/Terminal execution policies must permit local script execution if using `npm` wrappers on Windows.

## Installation

1. Clone or download the repository.
2. Navigate to the project root.
3. Initialize the package structure and install the daemon dependencies:
   ```powershell
   npm init -y
   npm install express
   ```

## Execution

Launch the primary orchestrator daemon:

```powershell
node manager.js
```

The daemon binds to `http://localhost:8080` by default. Access the web dashboard via a browser to begin provisioning subprocesses.

## Subprocess Implementation Requirements

For the orchestrator to dynamically manage execution ports, target Node.js scripts **must** consume the injected environment variable `process.env.PORT` instead of hardcoding their listener binding. 

**Compliant Target Script Example:**
```javascript
const express = require('express');
const app = express();

// CRITICAL: Consume the port injected by the parent orchestrator
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`Service operational on port ${port}`);
});

app.listen(port, () => {
    console.log(`Subprocess bound to port ${port}`);
});
```

## REST API Specification

The daemon exposes the following endpoints for programmatic control:

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/servers` | Retrieve all registered processes and their active state. | - |
| `POST` | `/api/servers` | Register a new target script to the configuration store. | `{ name, scriptPath, port }` |
| `PUT` | `/api/servers/:id` | Update configuration parameters (e.g., port binding). | `{ port }` |
| `DELETE`| `/api/servers/:id` | Terminate the process (if running) and remove it from the registry. | - |
| `POST` | `/api/servers/:id/start` | Spawn the child process and inject environment variables. | - |
| `POST` | `/api/servers/:id/stop` | Transmit a SIGTERM signal to halt the active child process. | - |

## State Management

- **Polling:** The frontend implements a 3000ms polling interval against `/api/servers` to ensure the dashboard reflects terminal crashes or external state changes.
- **Orphan Prevention:** Stopping a server via the dashboard transmits `SIGTERM` explicitly to the spawned PID, releasing the bound port.
