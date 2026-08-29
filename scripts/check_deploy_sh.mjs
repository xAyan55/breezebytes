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
  try {
    const deploySh = await runCommand('cat /var/www/breezebytes/deploy.sh ; cd /var/www/breezebytes && git status && git remote -v');
    console.log('--- DEPLOY SH & GIT ---');
    console.log(deploySh.stdout);

    const serviceUnit = await runCommand('cat /etc/systemd/system/breezebytes-api.service || cat /usr/lib/systemd/system/breezebytes-api.service || true');
    console.log('--- SERVICE UNIT ---');
    console.log(serviceUnit.stdout);
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
