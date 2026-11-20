# Levanta los servicios de la demo (se usan dentro de un mismo comando: no sobreviven entre comandos).
export DJANGO_SETTINGS_MODULE=config.settings.local SECRET_KEY=demo-secret-key-only-for-video-0123456789abcdef DATABASE_URL=sqlite:////tmp/claude-0/demo/demo.sqlite3 WEBPAY_BASE_URL=http://127.0.0.1:8799 FRONTEND_URL=http://127.0.0.1:5199 THROTTLE_RATE_LOGIN=500/min THROTTLE_RATE_ANON=100000/min THROTTLE_RATE_USER=100000/min THROTTLE_RATE_REGISTER=500/min
D=/tmp/claude-0/demo
(cd $D && python3 tileserver.py > tiles.log 2>&1 &)
(cd $D && node mock-pay.mjs > pay.log 2>&1 &)
(cd /home/claude/proyecto-de-titulo/backend && /tmp/claude-0/venv/bin/python manage.py runserver 127.0.0.1:8765 --noreload > $D/api.log 2>&1 &)
(cd /home/claude/proyecto-de-titulo/frontend && npx vite preview --config demo.vite.config.js > $D/web.log 2>&1 &)
for i in $(seq 1 40); do
  ok=1; for u in http://127.0.0.1:8765/api/v1/health/ http://127.0.0.1:5199/ http://127.0.0.1:8799/health http://127.0.0.1:8811/9/153/309.png; do curl -s -m 5 -o /dev/null -f $u || ok=0; done
  [ $ok = 1 ] && break; sleep 1
done
echo "servicios listos=$ok"
