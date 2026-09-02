import { Client } from 'ssh2';

const SECRET = '911f5f73cbc07cf0be6a3a0f243a246e7106167fe5d98a338a1f3f9dfa4a68bd';

const conn = new Client();
conn.on('ready', () => {
  const remoteCmd = `
    # 1. Update systemd service without --stdout
    cat << 'EOF' > /etc/systemd/system/playit-agent.service
[Unit]
Description=Playit.gg Zero-Config Tunnel Agent (BreezeBytes Node)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/playit --secret-path /etc/playit/playit.toml
Restart=always
RestartSec=5s
LimitNOFILE=65536
KillMode=process
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # 2. Write secret file
    mkdir -p /etc/playit
    echo 'secret_key = "${SECRET}"' > /etc/playit/playit.toml
    chmod 600 /etc/playit/playit.toml

    # 3. Reload and start systemd service
    systemctl daemon-reload
    systemctl restart playit-agent.service
    sleep 3
    systemctl status playit-agent.service --no-pager

    # 4. Save into BreezeBytes database with proper encryption
    cd /var/www/breezebytes
    node -e '
      import("./server/db/database.js").then(async ({ playit_nodes, default: dbStore }) => {
        const { encryptPlayitSecret } = await import("./server/utils/cryptoUtils.js");
        const { playitService } = await import("./server/services/playit/playitService.js");
        
        let pNode = playit_nodes.findOne({ node_id: 1 });
        const encrypted = encryptPlayitSecret("${SECRET}");
        if (pNode) {
          playit_nodes.update(pNode.id, {
            encrypted_secret: encrypted,
            secret_configured: true,
            playit_status: "running",
            agent_version: "1.0.10"
          });
        }
        dbStore.save();
        console.log("[DB SUCCESS] Node 1 playit configuration successfully saved to disk.");
        
        try {
          const runRes = await playitService.ensureAgent(1);
          console.log("[PLAYIT API SUCCESS]", JSON.stringify(runRes));
        } catch (e) {
          console.error("[PLAYIT API ERROR]", e.message);
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
