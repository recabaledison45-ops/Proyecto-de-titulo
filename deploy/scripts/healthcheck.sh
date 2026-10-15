#!/usr/bin/env bash
# Chequeo de salud para cron (cada 5 min): API responde, contenedores arriba, certificado vigente.
# Publica la métrica AppHealthy (1/0) en CloudWatch; la alarma "AppHealthy" avisa por correo (SNS).
source "$(dirname "$0")/_common.sh"

problems=()

code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "https://${DOMAIN}/api/v1/health/" 2>/dev/null || echo 000)"
[ "$code" = "200" ] || problems+=("API: HTTP $code en https://${DOMAIN}/api/v1/health/")

for svc in db web nginx certbot; do
  compose ps --status running --services 2>/dev/null | grep -qx "$svc" || problems+=("contenedor '$svc' no está en ejecución")
done

# Certificado: avisar si vence en menos de 14 días
end_date="$(echo | openssl s_client -servername "$DOMAIN" -connect "${DOMAIN}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || true)"
if [ -n "$end_date" ]; then
  days_left=$(( ( $(date -d "$end_date" +%s) - $(date +%s) ) / 86400 ))
  [ "$days_left" -ge 14 ] || problems+=("el certificado TLS vence en $days_left días")
else
  problems+=("no se pudo leer el certificado TLS")
fi

if [ "${#problems[@]}" -eq 0 ]; then
  put_metric AppHealthy 1
  exit 0
fi
log "PROBLEMAS: ${problems[*]}"
put_metric AppHealthy 0
exit 1
