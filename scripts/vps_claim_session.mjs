import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const remoteCmd = `
    CODE=$(/usr/local/bin/playit-cli claim generate)
    echo "CLAIM_CODE: $CODE"
    echo "CLAIM_URL: https://playit.gg/claim/$CODE"
    /usr/local/bin/playit-cli claim exchange "$CODE"
  `;

  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\nProcess exited with code ${code}`);
      conn.end();
    });
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '100.124.124.126',
  port: 22,
  username: 'root',
  password: 'root',
});
