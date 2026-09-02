import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const remoteCmd = `
    node -e '
      import("/var/www/breezebytes/server/services/playit/playitService.js").then(async ({ playitService }) => {
        import("/var/www/breezebytes/server/db/database.js").then(async ({ playit_tunnels, servers }) => {
          const client = playitService.getApiClientForNode(1);
          const list = await client.listTunnels();
          console.log("Found " + list.tunnels.length + " tunnels from Playit API");
          
          for (const pt of list.tunnels) {
            const connInfo = client.constructor.extractConnectionAddress(pt);
            console.log("Tunnel " + pt.id + " (" + pt.name + "):", connInfo);

            const existing = playit_tunnels.findOne({ playit_tunnel_id: pt.id });
            if (existing) {
              playit_tunnels.update(existing.id, {
                public_address: connInfo.publicAddress,
                public_ip: connInfo.publicIp,
                public_port: connInfo.publicPort,
                domain: connInfo.domain,
                status: "active",
                last_reconciled_at: new Date().toISOString()
              });
              console.log("Updated tunnel record #" + existing.id + " to " + connInfo.publicAddress);
            }
          }
          process.exit(0);
        });
      });
    '
  `;

  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end());
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stderr.write(d));
  });
}).connect({
  host: '100.124.124.126',
  port: 22,
  username: 'root',
  password: 'root',
});
