const API_BASE = 'http://localhost:8080/api/servers';

async function fetchServers() {
    try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error('Daemon unreachable');
        const data = await res.json();
        render(data);
        document.getElementById('errorMsg').innerText = '';
    } catch (err) {
        document.getElementById('errorMsg').innerText = 'ERR: Daemon offline. Ensure localhost:8080 is bound.';
    }
}

async function exec(id, action) {
    try {
        await fetch(`${API_BASE}/${id}/${action}`, { method: 'POST' });
        fetchServers();
    } catch (err) {
        console.error('Execution failure:', err);
    }
}

function render(servers) {
    const list = document.getElementById('serverList');
    if (servers.length === 0) {
        list.innerHTML = 'No processes registered in configuration.';
        return;
    }
    
    list.innerHTML = servers.map(s => {
        const isRunning = s.status === 'running';
        const actionBtn = isRunning 
            ? `<button data-id="${s.id}" data-action="stop">Halt</button>`
            : `<button data-id="${s.id}" data-action="start">Execute</button>`;

        return `
            <div class="server-item">
                <div class="details">
                    <span class="name">${s.name}</span>
                    <span class="port">Bind Port: ${s.port}</span>
                    <span class="status ${s.status}">${s.status.toUpperCase()}</span>
                </div>
                <div class="actions">
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const action = e.target.getAttribute('data-action');
            exec(id, action);
        });
    });
}

// Initialize loop
fetchServers();
setInterval(fetchServers, 3000);