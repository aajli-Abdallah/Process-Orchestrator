const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const CONFIG_FILE = path.join(__dirname, 'servers.json');
let serversConfig = [];
const activeProcesses = new Map();

// Initialize config file if missing
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, '[]');
}
serversConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

const saveConfig = () => fs.writeFileSync(CONFIG_FILE, JSON.stringify(serversConfig, null, 2));

// Process Management
const startServer = (id) => {
    const config = serversConfig.find(s => s.id === id);
    if (!config || activeProcesses.has(id)) return false;

    // Inject the assigned port into the child environment
    const env = Object.assign({}, process.env, { PORT: config.port });
    
    // Spawn the node process
    const child = spawn('node', [config.scriptPath], { env });

    child.on('exit', (code) => {
        console.log(`Server ${id} exited (Code: ${code})`);
        activeProcesses.delete(id);
    });

    child.on('error', (err) => {
        console.error(`Failed to start ${id}:`, err);
        activeProcesses.delete(id);
    });

    activeProcesses.set(id, child);
    return true;
};

const stopServer = (id) => {
    const child = activeProcesses.get(id);
    if (child) {
        child.kill('SIGTERM');
        activeProcesses.delete(id);
        return true;
    }
    return false;
};

// API Endpoints
app.get('/api/servers', (req, res) => {
    const payload = serversConfig.map(s => ({
        ...s,
        status: activeProcesses.has(s.id) ? 'running' : 'stopped'
    }));
    res.json(payload);
});

app.post('/api/servers', (req, res) => {
    const { name, scriptPath, port } = req.body;
    const newServer = { id: Date.now().toString(), name, scriptPath, port: parseInt(port) };
    serversConfig.push(newServer);
    saveConfig();
    res.json(newServer);
});

app.put('/api/servers/:id', (req, res) => {
    const id = req.params.id;
    const config = serversConfig.find(s => s.id === id);
    if (!config) return res.status(404).send();
    
    const wasRunning = activeProcesses.has(id);
    if (wasRunning) stopServer(id);
    
    if (req.body.port) config.port = parseInt(req.body.port);
    saveConfig();
    
    // Automatically restart if it was running to bind the new port
    if (wasRunning) startServer(id); 
    res.json(config);
});

app.delete('/api/servers/:id', (req, res) => {
    const id = req.params.id;
    stopServer(id);
    serversConfig = serversConfig.filter(s => s.id !== id);
    saveConfig();
    res.json({ success: true });
});

app.post('/api/servers/:id/start', (req, res) => res.json({ success: startServer(req.params.id) }));
app.post('/api/servers/:id/stop', (req, res) => res.json({ success: stopServer(req.params.id) }));

app.listen(8080, () => console.log('Manager daemon running on http://localhost:8080'));