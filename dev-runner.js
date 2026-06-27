const { spawn } = require('child_process');
const http = require('http');

console.log('Starting dev environment...');

// Start Vite dev server
const viteProc = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

// Start TS compiler in watch mode for the main process
const tscProc = spawn('npx', ['tsc', '-w', '-p', 'electron/tsconfig.json'], { stdio: 'inherit', shell: true });

let electronProc = null;

function startElectron() {
    if (electronProc) return;
    console.log('Vite is ready, starting Electron...');
    electronProc = spawn('npx', ['electron', '.'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, VITE_DEV_SERVER_URL: 'http://localhost:5173' }
    });

    electronProc.on('close', () => {
        viteProc.kill();
        tscProc.kill();
        process.exit();
    });
}

// Wait for Vite to be ready
const checkInterval = setInterval(() => {
    http.get('http://localhost:5173', (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
            clearInterval(checkInterval);
            startElectron();
        }
    }).on('error', () => {
        // Dev server not ready yet
    });
}, 1000);

process.on('SIGINT', () => {
    viteProc.kill();
    tscProc.kill();
    if (electronProc) electronProc.kill();
    process.exit();
});
