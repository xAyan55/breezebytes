import { Client } from 'ssh2';
import * as tar from 'tar';
import fs from 'fs';
import path from 'path';

const VPS_HOST = '100.124.124.126';
const VPS_USER = 'root';
const VPS_PASS = 'root';
const TARGET_DIR = '/var/www/breezebytes';
const ARCHIVE_PATH = path.resolve('breezebytes-deploy.tar.gz');

async function createTarArchive() {
  console.log('📦 Creating deploy archive: breezebytes-deploy.tar.gz...');
  await tar.c(
    {
      gzip: true,
      file: ARCHIVE_PATH,
      filter: (filePath) => {
        if (
          filePath.includes('node_modules') ||
          filePath.includes('.git') ||
          filePath.includes('breezebytes-deploy.tar.gz') ||
          filePath.includes('.gemini')
        ) {
          return false;
        }
        return true;
      },
    },
    ['./src', './server', './public', './dist', './index.html', './package.json', './package-lock.json', './vite.config.js', './tailwind.config.js', './postcss.config.js', './Rules.md']
  );
  console.log('✅ Archive created successfully!');
}

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

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`\n📤 Uploading ${localPath} to ${remotePath} via fastPut...`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (uploadErr) => {
        if (uploadErr) return reject(uploadErr);
        console.log(`✅ Upload complete: ${remotePath}`);
        resolve();
      });
    });
  });
}

async function deploy() {
  await createTarArchive();

  const conn = new Client();

  conn.on('ready', async () => {
    console.log(`\n🔗 Connected via SSH to ${VPS_HOST}!`);

    try {
      // 1. Upload archive to /tmp
      await uploadFile(conn, ARCHIVE_PATH, '/tmp/breezebytes-deploy.tar.gz');

      // 2. Extract into /var/www/breezebytes
      await runRemoteCommand(
        conn,
        `mkdir -p ${TARGET_DIR} && tar -xzf /tmp/breezebytes-deploy.tar.gz -C ${TARGET_DIR} && rm -f /tmp/breezebytes-deploy.tar.gz`
      );

      // 3. Install packages and build on VPS
      await runRemoteCommand(
        conn,
        `cd ${TARGET_DIR} && npm install && npm run build`
      );

      // 4. Restart backend service & reload nginx
      await runRemoteCommand(
        conn,
        `systemctl restart breezebytes-api.service && systemctl reload nginx`
      );

      // 5. Check health & service status
      await runRemoteCommand(
        conn,
        `systemctl status breezebytes-api.service --no-pager`
      );

      await runRemoteCommand(
        conn,
        `curl -s http://127.0.0.1:3001/api/v1/health`
      );

      console.log('\n========================================');
      console.log('🎉 DEPLOYMENT TO VPS COMPLETED SUCCESSFULLY!');
      console.log('========================================');
    } catch (err) {
      console.error('❌ Deployment error:', err);
    } finally {
      conn.end();
      if (fs.existsSync(ARCHIVE_PATH)) {
        fs.unlinkSync(ARCHIVE_PATH);
      }
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
