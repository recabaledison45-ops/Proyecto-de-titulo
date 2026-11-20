import wave, json
from piper import PiperVoice, SynthesisConfig
m, name = 'vits-piper-es_AR-daniela-high', 'es_AR-daniela-high'
v = PiperVoice.load(f'{m}/{name}.onnx', config_path=f'{m}/{name}.onnx.json')
LINES = {
 's1': "¿Y si planificar tu próxima escapada al Maule tomara solo un par de minutos?",
 's2': "Te presentamos Doble ve Experiencias: alojamientos, paquetes, guías locales y actividades de bienestar. Todo, en un solo lugar.",
 's3': "Busca por destino, fechas y personas, y descubre cada experiencia en un mapa interactivo.",
 's4': "Revisa fotos y reseñas reales, elige tus fechas, y mira el total al instante.",
 's5': "Paga con tarjeta, de forma segura, con Uébpei. Y tu reserva queda confirmada en segundos.",
 's6': "Y si eres emprendedor local, publica tus experiencias y controla tus reservas e ingresos desde un solo panel.",
 's7': "Doble ve Experiencias. Turismo regenerativo, hecho en el Maule.",
}
cfg = SynthesisConfig(length_scale=0.95, noise_scale=0.667, noise_w_scale=0.8)
out = {}
for k, t in LINES.items():
    with wave.open(f'vo/{k}.wav', 'wb') as w:
        v.synthesize_wav(t, w, syn_config=cfg)
    with wave.open(f'vo/{k}.wav') as w:
        out[k] = round(w.getnframes() / w.getframerate(), 3)
json.dump(out, open('vo/durations.json', 'w'), indent=1); print(out, round(sum(out.values()), 1))
