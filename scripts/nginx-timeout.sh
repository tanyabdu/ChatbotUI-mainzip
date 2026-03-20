#!/bin/bash
set -e

CONF=$(sudo nginx -T 2>/dev/null | grep "# configuration file" | grep -v "mime" | head -1 | awk '{print $NF}' | tr -d ':')

if [ -z "$CONF" ]; then
  CONF=$(sudo find /etc/nginx -name "*.conf" -o -name "magic-content*" -o -name "default" 2>/dev/null | grep -v "mime\|fastcgi\|proxy_params\|uwsgi\|scgi\|snippets" | head -1)
fi

if [ -z "$CONF" ] || [ ! -f "$CONF" ]; then
  echo "Ищем конфиг..."
  sudo find /etc/nginx -type f | grep -v ".dpkg\|mime" | sort
  echo ""
  echo "Запустите скрипт с явным путём:"
  echo "  CONF=/путь/к/файлу bash /var/www/magic-content/scripts/nginx-timeout.sh"
  exit 1
fi

echo "Найден конфиг: $CONF"

if grep -q "proxy_read_timeout 120s" "$CONF"; then
  echo "Таймауты уже настроены"
  sudo nginx -t && sudo systemctl reload nginx
  echo "nginx перезагружен"
  exit 0
fi

sudo cp "$CONF" "$CONF.bak"
echo "Бэкап: $CONF.bak"

sudo python3 - <<PYEOF
import re

conf_path = "$CONF"

with open(conf_path, "r") as f:
    content = f.read()

timeouts = "\n    proxy_read_timeout 120s;\n    proxy_connect_timeout 120s;\n    proxy_send_timeout 120s;"

content = re.sub(r'(location\s+[^\{]*\{)', r'\1' + timeouts, content, count=1)

with open(conf_path, "w") as f:
    f.write(content)

print("Таймауты добавлены")
PYEOF

sudo nginx -t && sudo systemctl reload nginx
echo "nginx успешно перезагружен"
