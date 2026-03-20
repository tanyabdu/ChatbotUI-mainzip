#!/bin/bash
set -e

CONF="/etc/nginx/sites-available/magic-content1.ru"

if [ ! -f "$CONF" ]; then
  echo "Файл $CONF не найден"
  exit 1
fi

if grep -q "proxy_read_timeout 120s" "$CONF"; then
  echo "Таймауты уже настроены, ничего не меняем"
  sudo nginx -t && sudo systemctl reload nginx
  echo "nginx перезагружен"
  exit 0
fi

sudo cp "$CONF" "$CONF.bak"
echo "Бэкап сохранён: $CONF.bak"

sudo python3 - <<'PYEOF'
import re

conf_path = "/etc/nginx/sites-available/magic-content1.ru"

with open(conf_path, "r") as f:
    content = f.read()

timeouts = """
    proxy_read_timeout 120s;
    proxy_connect_timeout 120s;
    proxy_send_timeout 120s;
"""

content = re.sub(r'(location\s+[/~][^{]*\{)', r'\1' + timeouts, content, count=1)

with open(conf_path, "w") as f:
    f.write(content)

print("Таймауты добавлены")
PYEOF

sudo nginx -t && sudo systemctl reload nginx
echo "nginx успешно перезагружен"
