import os, signal
me = os.getpid()
for q in os.listdir('/proc'):
    if q.isdigit() and int(q) != me:
        try: c = open(f'/proc/{q}/cmdline', 'rb').read().decode(errors='ignore').replace('\0', ' ')
        except Exception: continue
        if any(k in c for k in ('record.mjs', 'tileserver.py', 'vite preview', 'manage.py runserver', 'mock-pay.mjs', 'chromium', './run.sh')) and 'killsvc' not in c:
            try: os.kill(int(q), signal.SIGKILL)
            except Exception: pass
