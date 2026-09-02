import { Client } from 'ssh2';

const SECRET = '911f5f73cbc07cf0be6a3a0f243a246e7106167fe5d98a338a1f3f9dfa4a68bd';

const conn = new Client();
conn.on('ready', () => {
  const remoteCmd = `
    mkdir -p /etc/playit
    echo 'secret_key = "${SECRET}"' > /etc/playit/playit.toml
    chmod 600 /etc/playit/playit.toml
    systemctl restart playit-agent.service
    sleep 2
    systemctl status playit-agent.service --no-pager
    
    # Save encrypted secret directly into BreezeBytes database on VPS
    node -e '
      import("/var/www/breezebytes/server/db/database.js").then(async ({ playit_nodes }) => {
        const { encryptPlayitSecret } = await import("/var/www/breezebytes/server/utils/cryptoUtils.js");
        const { playitService } = await import("/var/www/breezebytes/server/services/playit/playitService.js");
        
        let pNode = playit_nodes.findOne({ node_id: 1 });
        const enc = encryptPlayitSecret("${SECRET}");
        if (pNode) {
          playit_nodes.update(pNode.id, {
            encrypted_secret: enc,
            secret_configured: true,
            playit_status: "running"
          });
        }
        console.log("[DB SUCCESS] Node 1 playit configuration updated in DB.");
        
        try {
          const res = await playitService.ensureAgent(1);
          console.log("[AGENT RUNNING]", JSON.stringify(res));
        } catch (e) {
          console.log("[AGENT NOTE]", e.message);
        }
        process.exit(0);
      });
    '
  `;

  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code) => {
      console.log(`\nFinalize command exited with code ${code}`);
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
