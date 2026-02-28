const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 5173, subdomain: 'ezhil-fast-camera' });
    console.log(`\n\n=== SUCCESS ===\nTUNNEL URL: ${tunnel.url}\n================\n`);
    
    tunnel.on('close', () => {
      console.log('Tunnel closed.');
    });
  } catch (error) {
    console.error("Tunnel failed:", error);
  }
})();
