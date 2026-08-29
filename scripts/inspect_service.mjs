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
  console.log('Connected! Checking deployment details...');
  try {
    const services = await runCommand('systemctl list-units --type=service | grep -i breeze || systemctl list-unit-files | grep -i breeze || true');
    console.log('--- SYSTEMD SERVICES ---');
    console.log(services.stdout);

    const proc = await runCommand('ps aux | grep 18809 || ps aux | grep node');
    console.log('--- NODE PROCESS ---');
    console.log(proc.stdout);

    const nginxSites = await runCommand('cat /etc/nginx/sites-enabled/* || true');
    console.log('--- NGINX CONFIG ---');
    console.log(nginxSites.stdout);

    const dirContents = await runCommand('ls -la /var/www/breezebytes');
    console.log('--- BREEZEBYTES DIR ---');
    console.log(dirContents.stdout);
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
