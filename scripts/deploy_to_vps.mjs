import { Client } from 'ssh2';

const VPS_HOST = '100.124.124.126';
const VPS_USER = 'root';
const VPS_PASS = 'root';
const TARGET_DIR = '/var/www/breezebytes';

function runRemoteCommand(conn, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 [VPS EXEC] ${command}`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          console.error(`⚠️ Command finished with code ${code}`);
        } else {
          console.log(`✅ Command finished successfully`);
        }
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

async function deploy() {
  const conn = new Client();

  conn.on('ready', async () => {
    console.log(`\n🔗 Connected via SSH to ${VPS_HOST}!`);

    try {
      // 1. Fetch and hard-reset to origin/main, cleaning any untracked files
      await runRemoteCommand(
        conn,
        `cd ${TARGET_DIR} && git fetch origin main && git reset --hard origin/main && git clean -fd`
      );

      // 2. Ensure official Playit stable binary and systemd service exist on Ubuntu host
      await runRemoteCommand(
        conn,
        `if [ ! -f /usr/local/bin/playit ]; then
          echo "📥 Installing official Playit v1.0.10 binary for Ubuntu amd64...";
          curl -SsL -o /usr/local/bin/playit https://github.com/playit-cloud/playit-agent/releases/download/v1.0.10/playit-linux-amd64 && chmod 755 /usr/local/bin/playit;
        fi;
        playit --version || true;
        mkdir -p /etc/playit && chmod 700 /etc/playit;
        if [ ! -f /etc/playit/playit.toml ]; then
          touch /etc/playit/playit.toml && chmod 600 /etc/playit/playit.toml;
        fi;
        if [ ! -f /etc/systemd/system/playit-agent.service ]; then
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
          systemctl daemon-reload;
          systemctl enable playit-agent.service || true;
        fi`
      );

      // 3. Install dependencies & build frontend bundle
      await runRemoteCommand(
        conn,
        `cd ${TARGET_DIR} && npm install && npm run build`
      );

      // 4. Restart backend service & reload nginx
      await runRemoteCommand(
        conn,
        `systemctl restart breezebytes-api.service && systemctl reload nginx`
      );

      // 4. Verify service status & health check
      await runRemoteCommand(
        conn,
        `systemctl status breezebytes-api.service --no-pager`
      );

      await runRemoteCommand(
        conn,
        `curl -s http://127.0.0.1:3001/api/v1/health`
      );

      console.log('\n========================================');
      console.log('🎉 VPS UPDATE & DEPLOYMENT COMPLETED SUCCESSFULLY!');
      console.log('========================================');
    } catch (err) {
      console.error('❌ Deployment error:', err);
    } finally {
      conn.end();
    }
  });

  conn.on('error', (err) => {
    console.error('❌ SSH Connection Error:', err);
  });

  conn.connect({
    host: VPS_HOST,
    port: 22,
    username: VPS_USER,
    password: VPS_PASS,
    readyTimeout: 60000,
  });
}

deploy();
