// Simple script to run Electron in development
process.env.ELECTRON = 'true';
process.env.NODE_ENV = 'development';

const { build } = require('vite');
const electron = require('electron');
const { spawn } = require('child_process');

let electronProcess = null;

async function startElectron() {
  // Kill existing process
  if (electronProcess) {
    electronProcess.kill();
  }

  // Start Electron
  electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RENDERER_URL: 'http://localhost:8080'
    }
  });

  electronProcess.on('exit', () => {
    process.exit();
  });
}

// Build and start
async function dev() {
  try {
    await build({
      configFile: 'vite.config.ts',
      mode: 'development',
      build: {
        watch: {}
      }
    });
    
    await startElectron();
  } catch (error) {
    console.error('Error starting Electron:', error);
    process.exit(1);
  }
}

dev();
