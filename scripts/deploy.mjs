import { Client } from 'ssh2';

const conn = new Client();

console.log('Connecting to 100.124.124.126...');

conn.on('ready', () => {
  console.log('SSH Connection successful!');
  conn.exec('uname -a ; which node || echo "no node" ; which npm || echo "no npm" ; which java || echo "no java" ; which nginx || echo "no nginx" ; which pm2 || echo "no pm2" ; cat /etc/os-release', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log(`Stream closed with code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect({
  host: '100.124.124.126',
  port: 22,
  username: 'root',
  password: 'root',
  readyTimeout: 30000,
});
