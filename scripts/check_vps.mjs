import { Client } from 'ssh2';

const conn = new Client();

function runCommand(command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data;
      }).stderr.on('data', (data) => {
        stderr += data;
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('Connected! Checking system status...');
  try {
    const nodeV = await runCommand('node -v && npm -v && java -version 2>&1');
    console.log('--- RUNTIMES ---');
    console.log(nodeV.stdout);

    const ports = await runCommand('ss -tulpn || netstat -tulpn');
    console.log('--- LISTENING PORTS ---');
    console.log(ports.stdout);

    const nginxStatus = await runCommand('systemctl status nginx --no-pager || true');
    console.log('--- NGINX STATUS ---');
    console.log(nginxStatus.stdout);

    const dirCheck = await runCommand('ls -la /var/www /root');
    console.log('--- DIRECTORIES ---');
    console.log(dirCheck.stdout);
  } catch (err) {
    console.error(err);
  } finally {
    conn.end();
  }
}).connect({
  host: '100.124.124.126',
  port: 22,
  username: 'root',
  password: 'root',
  readyTimeout: 30000,
});
