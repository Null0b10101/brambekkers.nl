#!/usr/bin/env bash
# Deploy brambekkers.nl naar deze server. Idempotent; data/ blijft staan.
# Gebruik: sudo bash deploy.sh
set -euo pipefail

APP=/opt/brambekkers
REPO="$(cd "$(dirname "$0")" && pwd)"
DOMAIN=brambekkers.nl
PORT=3002

echo "== gebruiker en mappen =="
id -u brambekkers &>/dev/null || useradd --system --shell /usr/sbin/nologin --home-dir "$APP" brambekkers
mkdir -p "$APP/data"

echo "== code kopiëren =="
rsync -a --delete --exclude data/ --exclude node_modules/ --exclude .git/ "$REPO/" "$APP/"
cd "$APP"
npm ci --omit=dev --no-audit --no-fund 2>&1 | tail -1
chown -R brambekkers:brambekkers "$APP/data"
chown -R root:root "$APP/server" "$APP/public" "$APP/node_modules" "$APP/package.json" "$APP/package-lock.json" 2>/dev/null || true

echo "== admin-wachtwoord (alleen bij eerste deploy) =="
if ! sudo -u brambekkers env DATA_DIR="$APP/data" node -e "
const {db}=require('$APP/server/db');
process.exit(db.prepare(\"SELECT 1 FROM settings WHERE key='password_hash'\").get()?0:1)"; then
  PW=$(sudo -u brambekkers env DATA_DIR="$APP/data" node "$APP/server/set-password.js" --generate)
  install -m 600 -o root -g root /dev/null "$APP/data/ADMIN-WACHTWOORD.txt"
  echo "$PW" > "$APP/data/ADMIN-WACHTWOORD.txt"
  echo "Wachtwoord gegenereerd → $APP/data/ADMIN-WACHTWOORD.txt (na eerste login + passkey: verwijderen)"
fi

echo "== systemd =="
cat > /etc/systemd/system/brambekkers.service <<EOF
[Unit]
Description=brambekkers.nl receptensite
After=network.target

[Service]
Type=simple
User=brambekkers
WorkingDirectory=$APP
ExecStart=/usr/bin/node $APP/server/index.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=DATA_DIR=$APP/data
Environment=RP_ID=$DOMAIN
Environment=ORIGIN=https://$DOMAIN
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$APP/data
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now brambekkers
systemctl restart brambekkers

echo "== nginx =="
if [ ! -f /etc/nginx/snippets/brambekkers-security.conf ]; then
cat > /etc/nginx/snippets/brambekkers-security.conf <<'EOF'
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
EOF
fi
if [ ! -f /etc/nginx/sites-available/brambekkers ]; then
cat > /etc/nginx/sites-available/brambekkers <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name www.$DOMAIN;
    return 301 http://$DOMAIN\$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    include snippets/brambekkers-security.conf;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi
ln -sf /etc/nginx/sites-available/brambekkers /etc/nginx/sites-enabled/brambekkers
nginx -t && systemctl reload nginx

echo "== fail2ban =="
cat > /etc/fail2ban/filter.d/brambekkers-auth.conf <<'EOF'
[Definition]
failregex = brambekkers-auth FAIL \S+ ip=<HOST>
journalmatch = _SYSTEMD_UNIT=brambekkers.service
EOF
cat > /etc/fail2ban/jail.d/brambekkers.conf <<'EOF'
[brambekkers-auth]
enabled = true
backend = systemd
filter = brambekkers-auth
maxretry = 10
findtime = 15m
bantime = 1h
EOF
systemctl reload fail2ban || systemctl restart fail2ban

echo "== dagelijkse database-backup =="
# via better-sqlite3's online-backup-API: consistent terwijl de site draait,
# en de sqlite3-CLI is niet op de server geïnstalleerd
cat > /etc/cron.d/brambekkers-backup <<EOF
15 4 * * * root cd $APP && node -e "require('better-sqlite3')('$APP/data/brambekkers.db').backup('/root/backup-brambekkers-'+new Date().getDay()+'.db')" 2>&1 | logger -t brambekkers-backup
EOF

echo
echo "Klaar. Certificaat (pas als DNS naar deze server wijst):"
echo "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect -m brambekkers.cs@gmail.com --agree-tos"
