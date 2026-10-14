// Destinos de la Región del Maule: sirven para el buscador, el mapa (centro y zoom) y las tarjetas de portada.
// Las fotos son referenciales (picsum); si no cargan se muestra un degradado.
const photo = (seed) => `https://picsum.photos/seed/${seed}/800/1000`

export const DESTINATIONS = [
  { id: 'constitucion', name: 'Constitución', center: [-35.333, -72.415], zoom: 11, tagline: 'Mar, dunas y río', image: photo('constitucion-costa'), from: '#0ea5e9', to: '#0369a1' },
  { id: 'talca', name: 'Talca', center: [-35.4264, -71.6554], zoom: 12, tagline: 'Patrimonio y vino', image: photo('talca-ciudad'), from: '#f59e0b', to: '#b45309' },
  { id: 'molina', name: 'Molina', center: [-35.464, -71.11], zoom: 10, tagline: 'Siete Tazas y cordillera', image: photo('molina-sietetazas'), from: '#10b981', to: '#047857' },
  { id: 'san-javier', name: 'San Javier', center: [-35.597, -71.73], zoom: 11, tagline: 'Valle del vino', image: photo('sanjavier-vinas'), from: '#a855f7', to: '#6b21a8' },
  { id: 'vichuquen', name: 'Vichuquén', center: [-34.883, -72.016], zoom: 11, tagline: 'Laguna y atardeceres', image: photo('vichuquen-laguna'), from: '#06b6d4', to: '#0e7490' },
  { id: 'pelluhue', name: 'Pelluhue', center: [-35.833, -72.57], zoom: 11, tagline: 'Costa tranquila', image: photo('pelluhue-playa'), from: '#f43f5e', to: '#9f1239' },
]

export const ANY_DESTINATION = 'all'
export const MAULE_CENTER = [-35.45, -72.0]
export const MAULE_ZOOM = 8

export const findDestination = (id) => DESTINATIONS.find((d) => d.id === id)
