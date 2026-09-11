export const LIMA = {
  latitude: -12.0464,
  longitude: -77.0428,
  label: 'Lima',
}

export type WeatherKind =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'storm'

export type MoonPhaseName =
  | 'nueva'
  | 'creciente'
  | 'cuarto-creciente'
  | 'gibosa-creciente'
  | 'llena'
  | 'gibosa-menguante'
  | 'cuarto-menguante'
  | 'menguante'

export type LimaWeather = {
  temperature: number
  weatherCode: number
  cloudCover: number
  precipitation: number
  kind: WeatherKind
  label: string
  updatedAt: string
}

export type MoonInfo = {
  phase: number
  illumination: number
  name: MoonPhaseName
  label: string
  visible: boolean
}

const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: 'Despejado',
  'partly-cloudy': 'Parcialmente nublado',
  cloudy: 'Nublado',
  fog: 'Neblina',
  drizzle: 'Llovizna',
  rain: 'Lluvia',
  storm: 'Tormenta',
}

export function weatherKindFromCode(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code >= 95 && code <= 99) return 'storm'
  if (code >= 71 && code <= 77) return 'rain'
  return 'partly-cloudy'
}

/** Phase 0 = new moon, 0.5 = full moon */
export function getMoonInfo(date: Date): MoonInfo {
  const synodic = 29.53058867
  const knownNew = Date.UTC(2000, 0, 6, 18, 14, 0)
  const days = (date.getTime() - knownNew) / 86_400_000
  const phase = ((days % synodic) + synodic) % synodic / synodic
  const illumination = Math.max(0, Math.min(1, (1 - Math.cos(phase * Math.PI * 2)) / 2))

  let name: MoonPhaseName = 'nueva'
  if (phase < 0.03 || phase > 0.97) name = 'nueva'
  else if (phase < 0.22) name = 'creciente'
  else if (phase < 0.28) name = 'cuarto-creciente'
  else if (phase < 0.47) name = 'gibosa-creciente'
  else if (phase < 0.53) name = 'llena'
  else if (phase < 0.72) name = 'gibosa-menguante'
  else if (phase < 0.78) name = 'cuarto-menguante'
  else name = 'menguante'

  const labels: Record<MoonPhaseName, string> = {
    nueva: 'Luna nueva',
    creciente: 'Luna creciente',
    'cuarto-creciente': 'Cuarto creciente',
    'gibosa-creciente': 'Gibosa creciente',
    llena: 'Luna llena',
    'gibosa-menguante': 'Gibosa menguante',
    'cuarto-menguante': 'Cuarto menguante',
    menguante: 'Luna menguante',
  }

  return {
    phase,
    illumination,
    name,
    label: labels[name],
    visible: illumination > 0.06,
  }
}

export async function fetchLimaWeather(): Promise<LimaWeather> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(LIMA.latitude))
  url.searchParams.set('longitude', String(LIMA.longitude))
  url.searchParams.set('current', 'temperature_2m,weather_code,cloud_cover,precipitation')
  url.searchParams.set('timezone', 'America/Lima')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 600 },
  })
  if (!res.ok) throw new Error(`Clima Lima: ${res.status}`)

  const data = await res.json()
  const current = data.current ?? {}
  const code = Number(current.weather_code ?? current.weathercode ?? 0)
  const kind = weatherKindFromCode(code)

  return {
    temperature: Number(current.temperature_2m ?? 0),
    weatherCode: code,
    cloudCover: Number(current.cloud_cover ?? (kind === 'clear' ? 10 : kind === 'partly-cloudy' ? 45 : 80)),
    precipitation: Number(current.precipitation ?? 0),
    kind,
    label: WEATHER_LABELS[kind],
    updatedAt: String(current.time ?? new Date().toISOString()),
  }
}
