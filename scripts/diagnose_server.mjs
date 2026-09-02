import { Client } from 'ssh2';

const VPS_HOST = '100.124.124.126';
const VPS_USER = 'root';
const VPS_PASS = 'root';

function runRemoteCommand(conn, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 [VPS EXEC] ${command}`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        process.stdout.write(data);
        stdout += data;
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
        stderr += data;
      });
    });
  });
}

async function diagnose() {
  const conn = new Client();

  conn.on('ready', async () => {
    console.log(`\n🔗 Connected via SSH to ${VPS_HOST}!`);

    try {
      await runRemoteCommand(conn, 'ps aux | grep -E "java|node"');
      await runRemoteCommand(conn, 'journalctl -u breezebytes-api.service -n 50 --no-pager');
      await runRemoteCommand(conn, 'ls -la /var/www/breezebytes/data/servers/ || ls -la /var/www/breezebytes/servers/');
    } catch (err) {
      console.error('Error during diagnosis:', err);
    } finally {
      conn.end();
    }
  });

  conn.on('error', (err) => {
    console.error('SSH Connection error:', err);
  });

  conn.connect({
    host: VPS_HOST,
    port: 22,
    username: VPS_USER,
    password: VPS_PASS,
  });
}

diagnose();
