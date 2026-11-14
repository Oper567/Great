const net = require("net");

const host = "das103.truehost.cloud";
const port = 5432;

console.log(`📡 [1/2] Testing TCP Socket Connection to ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(8000);

socket.connect(port, host, () => {
  console.log(`✅ [TCP] Successfully connected to ${host}:${port}! Port is open and reachable.`);
  socket.end();
});

socket.on("error", (err) => {
  console.error(`❌ [TCP Error] Could not connect to ${host}:${port}:`, err.message);
});

socket.on("timeout", () => {
  console.error(`⏰ [TCP Timeout] Connection to ${host}:${port} timed out after 8 seconds.`);
  socket.destroy();
});
