'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  getMoonInfo,
  type LimaWeather,
  type MoonInfo,
  type WeatherKind,
} from '@/lib/lima-weather'

type TimeScene = {
  key: string
  label: string
  sky: string
}

const scenes: TimeScene[] = [
  { key: 'dawn', label: 'Amanecer', sky: 'dawn' },
  { key: 'morning', label: 'Mañana', sky: 'morning' },
  { key: 'noon', label: 'Mediodía', sky: 'noon' },
  { key: 'sunset', label: 'Atardecer', sky: 'sunset' },
  { key: 'night', label: 'Noche', sky: 'night' },
  { key: 'midnight', label: 'Madrugada', sky: 'midnight' },
]

function getScene(hour: number) {
  if (hour < 6) return scenes[5]
  if (hour < 10) return scenes[0]
  if (hour < 12) return scenes[1]
  if (hour < 17) return scenes[2]
  if (hour < 20) return scenes[3]
  return scenes[4]
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatDate(date: Date) {
  const label = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function mixHex(a: string, b: string, t: number) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  const r = Math.round(lerp(A.r, B.r, t))
  const g = Math.round(lerp(A.g, B.g, t))
  const bl = Math.round(lerp(A.b, B.b, t))
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

type AtmosphereStop = {
  minute: number
  skyTop: string
  skyBottom: string
  horizon: string
  glow: number
  stars: number
  body: 'sun' | 'moon'
}

const atmosphereStops: AtmosphereStop[] = [
  { minute: 0, skyTop: '#030817', skyBottom: '#112442', horizon: '#1a2a3a', glow: 0.08, stars: 0.85, body: 'moon' },
  { minute: 300, skyTop: '#0a1428', skyBottom: '#2a3a55', horizon: '#3d4a5c', glow: 0.12, stars: 0.55, body: 'moon' },
  { minute: 360, skyTop: '#493e62', skyBottom: '#bf8175', horizon: '#e8a878', glow: 0.5, stars: 0.08, body: 'sun' },
  { minute: 480, skyTop: '#5a7fad', skyBottom: '#c9a878', horizon: '#e8c98a', glow: 0.7, stars: 0, body: 'sun' },
  { minute: 600, skyTop: '#5a9fbd', skyBottom: '#d8c17e', horizon: '#e8d6a0', glow: 0.82, stars: 0, body: 'sun' },
  { minute: 750, skyTop: '#3190bd', skyBottom: '#a9d4d3', horizon: '#c8e4e0', glow: 1, stars: 0, body: 'sun' },
  { minute: 960, skyTop: '#3a88b0', skyBottom: '#b8c9a8', horizon: '#d4c090', glow: 0.88, stars: 0, body: 'sun' },
  { minute: 1020, skyTop: '#4c416a', skyBottom: '#e28c65', horizon: '#f0a060', glow: 0.72, stars: 0.05, body: 'sun' },
  { minute: 1140, skyTop: '#2a2848', skyBottom: '#8a5a58', horizon: '#c07850', glow: 0.35, stars: 0.25, body: 'sun' },
  { minute: 1200, skyTop: '#071a3a', skyBottom: '#274c77', horizon: '#3a5a78', glow: 0.22, stars: 0.7, body: 'moon' },
  { minute: 1320, skyTop: '#040c20', skyBottom: '#1a3558', horizon: '#243848', glow: 0.12, stars: 0.8, body: 'moon' },
  { minute: 1440, skyTop: '#030817', skyBottom: '#112442', horizon: '#1a2a3a', glow: 0.08, stars: 0.85, body: 'moon' },
]

function getAtmosphere(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60

  let i = 0
  while (i < atmosphereStops.length - 1 && atmosphereStops[i + 1].minute <= minutes) i += 1
  const a = atmosphereStops[i]
  const b = atmosphereStops[Math.min(i + 1, atmosphereStops.length - 1)]
  const span = Math.max(b.minute - a.minute, 1)
  const t = Math.min(1, Math.max(0, (minutes - a.minute) / span))

  const isDay = minutes >= 360 && minutes < 1200
  let sunLeft = 12
  let sunTop = 16

  if (isDay) {
    const dayT = (minutes - 360) / (1200 - 360)
    sunLeft = lerp(6, 88, dayT)
    sunTop = lerp(42, 42, dayT) - Math.sin(dayT * Math.PI) * 30
  } else {
    const nightMinutes = minutes >= 1200 ? minutes - 1200 : minutes + 240
    const nightT = nightMinutes / 480
    sunLeft = lerp(82, 10, nightT)
    sunTop = lerp(28, 28, nightT) - Math.sin(nightT * Math.PI) * 14
  }

  return {
    skyTop: mixHex(a.skyTop, b.skyTop, t),
    skyBottom: mixHex(a.skyBottom, b.skyBottom, t),
    horizon: mixHex(a.horizon, b.horizon, t),
    glow: lerp(a.glow, b.glow, t),
    stars: lerp(a.stars, b.stars, t),
    body: t < 0.5 ? a.body : b.body,
    sunLeft,
    sunTop,
    isDay,
  }
}

function cloudFactorFor(weather: LimaWeather | null): number {
  if (!weather) return 0.12
  if (weather.kind === 'clear') return Math.max(0.06, weather.cloudCover / 100)
  if (weather.kind === 'partly-cloudy') return Math.max(0.35, weather.cloudCover / 100)
  if (weather.kind === 'fog') return 0.85
  if (weather.kind === 'drizzle') return Math.max(0.55, weather.cloudCover / 100)
  if (weather.kind === 'rain') return Math.max(0.7, weather.cloudCover / 100)
  if (weather.kind === 'storm') return 0.95
  return Math.max(0.65, weather.cloudCover / 100)
}

function applyWeatherToAtmosphere(
  atmosphere: ReturnType<typeof getAtmosphere>,
  weather: LimaWeather | null,
  moon: MoonInfo,
) {
  const kind: WeatherKind = weather?.kind ?? 'clear'
  const cloudFactor = cloudFactorFor(weather)
  const wet = kind === 'rain' || kind === 'drizzle' || kind === 'storm'
  const heavySky = kind === 'cloudy' || kind === 'fog' || wet

  let { skyTop, skyBottom, horizon, glow, stars } = atmosphere

  if (heavySky || cloudFactor > 0.3) {
    skyTop = mixHex(skyTop, '#4a5564', 0.28 + cloudFactor * 0.3)
    skyBottom = mixHex(skyBottom, '#6b7380', 0.22 + cloudFactor * 0.25)
    horizon = mixHex(horizon, '#7a8088', 0.18 + cloudFactor * 0.15)
    glow *= 1 - cloudFactor * 0.5
    stars *= 1 - cloudFactor * 0.75
  }
  if (kind === 'fog') {
    skyTop = mixHex(skyTop, '#8a9199', 0.45)
    skyBottom = mixHex(skyBottom, '#a8afb6', 0.5)
    horizon = mixHex(horizon, '#b4bac0', 0.4)
    glow *= 0.55
    stars *= 0.15
  }
  if (kind === 'storm') {
    skyTop = mixHex(skyTop, '#2a3038', 0.55)
    skyBottom = mixHex(skyBottom, '#3d4550', 0.45)
    glow *= 0.35
    stars *= 0.05
  }

  const showBody =
    atmosphere.isDay
      ? cloudFactor < 0.82
      : moon.visible && kind !== 'storm' && kind !== 'fog' && cloudFactor < 0.9

  return {
    ...atmosphere,
    skyTop,
    skyBottom,
    horizon,
    glow,
    stars,
    showBody,
    showMoon: !atmosphere.isDay && showBody,
    moonPhase: moon.name,
    moonIllumination: moon.illumination,
    weatherKind: kind,
    cloudOpacity: Math.min(0.98, 0.08 + cloudFactor * 0.85 + (wet ? 0.08 : 0)),
    rainOpacity: kind === 'drizzle' ? 0.35 : kind === 'rain' ? 0.65 : kind === 'storm' ? 0.85 : 0,
    fogOpacity: kind === 'fog' ? 0.72 : wet ? 0.18 : 0,
  }
}

type WindowStyle = 'office' | 'sparse' | 'busy' | 'dense' | 'ribbon'
type RoofStyle = 'antenna' | 'sign' | 'tank' | 'dish' | 'hvac' | 'spire' | 'neon' | 'acme'

/** Ventana con luz + humo: 22:00 → 03:45 */
function isSmokerWindowActive(date: Date) {
  const m = date.getHours() * 60 + date.getMinutes()
  return m >= 22 * 60 || m <= 3 * 60 + 45
}

/** Pico de humo: 03:33 → 03:33:59 */
function isSmokeBurst(date: Date) {
  return date.getHours() === 3 && date.getMinutes() === 33
}

type LightPhase = 'day' | 'dusk-on' | 'evening' | 'late' | 'deep' | 'quiet'

function getLightPhase(date: Date): LightPhase {
  const m = date.getHours() * 60 + date.getMinutes()
  if (m >= 18 * 60 && m < 19 * 60) return 'dusk-on'
  if (m >= 19 * 60 && m < 22 * 60) return 'evening'
  if (m >= 22 * 60 && m < 23 * 60 + 30) return 'late'
  if (m >= 23 * 60 + 30 || m < 2 * 60) return 'deep'
  if (m >= 2 * 60 && m < 6 * 60) return 'quiet'
  return 'day'
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function formatLit(n: number) {
  return String(Math.round(clamp01(n) * 100) / 100)
}

function resolveBuildingLit(base: number, phase: LightPhase, flicker: number) {
  const f = clamp01(flicker)
  switch (phase) {
    case 'dusk-on':
      return base * (0.45 + 0.25 * f)
    case 'evening':
      return base * (0.82 + 0.18 * f)
    case 'late':
      return base * (0.42 + 0.5 * f)
    case 'deep':
      return base * (0.14 + 0.38 * f)
    case 'quiet':
      return base * (0.08 + 0.2 * f)
    default:
      return base * 0.12
  }
}

type BuildingSpec = {
  height: string
  width: string
  base: number
  variant: WindowStyle
  roof: RoofStyle
  smokerSlot?: boolean
}

const BACK_BUILDINGS: BuildingSpec[] = [
  { height: '26%', width: '8%', base: 0.42, variant: 'sparse', roof: 'hvac' },
  { height: '37%', width: '10%', base: 0.78, variant: 'dense', roof: 'antenna' },
  { height: '20%', width: '12%', base: 0.28, variant: 'ribbon', roof: 'tank' },
  { height: '42%', width: '9%', base: 0.62, variant: 'office', roof: 'dish' },
  { height: '31%', width: '11%', base: 0.9, variant: 'busy', roof: 'sign' },
  { height: '23%', width: '8%', base: 0.34, variant: 'sparse', roof: 'hvac' },
  { height: '39%', width: '12%', base: 0.72, variant: 'dense', roof: 'spire' },
  { height: '28%', width: '10%', base: 0.5, variant: 'office', roof: 'antenna' },
]

const FRONT_BUILDINGS: BuildingSpec[] = [
  { height: '43%', width: '13%', base: 0.7, variant: 'office', roof: 'antenna' },
  { height: '31%', width: '10%', base: 0.38, variant: 'sparse', roof: 'hvac' },
  { height: '56%', width: '14%', base: 0.92, variant: 'dense', roof: 'acme' },
  { height: '36%', width: '9%', base: 0.48, variant: 'ribbon', roof: 'tank' },
  { height: '65%', width: '13%', base: 0.96, variant: 'dense', roof: 'spire' },
  { height: '46%', width: '10%', base: 0.4, variant: 'sparse', roof: 'dish' },
  { height: '33%', width: '15%', base: 0.74, variant: 'ribbon', roof: 'neon' },
  { height: '52%', width: '11%', base: 0.66, variant: 'busy', roof: 'antenna', smokerSlot: true },
  { height: '38%', width: '14%', base: 0.84, variant: 'office', roof: 'tank' },
]

const BUILDING_COUNT = BACK_BUILDINGS.length + FRONT_BUILDINGS.length

function nextFlickerValues(prev: number[], phase: LightPhase) {
  return prev.map((value) => {
    if (phase === 'evening' || phase === 'dusk-on') {
      if (Math.random() > 0.18) return value
      return clamp01(value + (Math.random() - 0.45) * 0.12)
    }
    if (phase === 'late') {
      // Varias se prenden/apagan de forma sutil
      if (Math.random() > 0.28) return value
      const nudge = (Math.random() - 0.5) * 0.55
      return clamp01(value + nudge)
    }
    if (phase === 'deep') {
      // Menos luces; alguna se enciende de vez en cuando
      if (Math.random() < 0.12) return clamp01(0.55 + Math.random() * 0.45)
      if (Math.random() < 0.2) return clamp01(value * 0.55)
      return clamp01(value * 0.92 + 0.04)
    }
    if (phase === 'quiet') {
      if (Math.random() < 0.08) return clamp01(0.35 + Math.random() * 0.4)
      return clamp01(value * 0.88 + 0.02)
    }
    return 0.15
  })
}

function Building({
  height,
  width,
  lit,
  variant = 'office',
  roof = 'hvac',
  smoker = false,
  smokeBurst = false,
}: {
  height: string
  width: string
  lit: string
  variant?: WindowStyle
  roof?: RoofStyle
  smoker?: boolean
  smokeBurst?: boolean
}) {
  return (
    <i
      className={`win-${variant} roof-${roof}${smoker ? ' has-smoker' : ''}${smokeBurst ? ' is-smoke-burst' : ''}`}
      style={{ '--height': height, '--width': width, '--lit': lit } as CSSProperties}
    >
      <span className="roof">
        <span className="beacon" />
        {roof === 'neon' && <span className="neon-sign">HOTEL</span>}
        {roof === 'acme' && (
          <span className="acme-sign">
            <span>A</span>
            <span>C</span>
            <span>M</span>
            <span>E</span>
          </span>
        )}
      </span>
      <span className="windows" />
      {smoker && (
        <span className="smoker">
          <span className="smoker-pane" />
          <span className="smoke s1" />
          <span className="smoke s2" />
          <span className="smoke s3" />
          <span className="smoke s4" />
          <span className="smoke s5" />
          {smokeBurst && (
            <>
              <span className="smoke s6" />
              <span className="smoke s7" />
              <span className="smoke s8" />
              <span className="smoke s9" />
              <span className="smoke s10" />
              <span className="smoke s11" />
            </>
          )}
        </span>
      )}
    </i>
  )
}

export default function Page() {
  const [now, setNow] = useState<Date | null>(null)
  const [manualMinutes, setManualMinutes] = useState<number | null>(null)
  const [weather, setWeather] = useState<LimaWeather | null>(null)
  const [flicker, setFlicker] = useState<number[]>(() =>
    Array.from({ length: BUILDING_COUNT }, () => 0.75 + Math.random() * 0.25),
  )

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/lima-weather', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as LimaWeather
        if (!cancelled) setWeather(data)
      } catch {
        /* keep previous / null */
      }
    }
    load()
    const timer = window.setInterval(load, 10 * 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const activeTime = useMemo(() => {
    if (!now) return null
    if (manualMinutes === null) return now
    const d = new Date(now)
    d.setHours(Math.floor(manualMinutes / 60), manualMinutes % 60, 0, 0)
    return d
  }, [now, manualMinutes])

  const lightPhase = useMemo(
    () => (activeTime ? getLightPhase(activeTime) : 'day'),
    [activeTime],
  )

  useEffect(() => {
    if (lightPhase === 'day') return
    const ms =
      lightPhase === 'late' || lightPhase === 'deep'
        ? 3200
        : lightPhase === 'quiet'
          ? 5000
          : 4500
    const timer = window.setInterval(() => {
      setFlicker((prev) => nextFlickerValues(prev, lightPhase))
    }, ms)
    return () => window.clearInterval(timer)
  }, [lightPhase])

  useEffect(() => {
    if (!activeTime || lightPhase === 'day') return
    // Al cambiar de franja, reacomoda el nivel base de luces
    setFlicker(
      Array.from({ length: BUILDING_COUNT }, () => {
        if (lightPhase === 'evening' || lightPhase === 'dusk-on') return 0.85 + Math.random() * 0.15
        if (lightPhase === 'late') return 0.45 + Math.random() * 0.5
        if (lightPhase === 'deep') return Math.random() < 0.35 ? 0.55 + Math.random() * 0.35 : 0.12 + Math.random() * 0.2
        return Math.random() < 0.25 ? 0.4 + Math.random() * 0.3 : 0.08 + Math.random() * 0.12
      }),
    )
  }, [lightPhase]) // eslint-disable-line react-hooks/exhaustive-deps -- solo al cambiar franja

  const moon = useMemo(() => getMoonInfo(activeTime ?? now ?? new Date()), [activeTime, now])
  const scene = useMemo(() => getScene(activeTime?.getHours() ?? 0), [activeTime])
  const atmosphere = useMemo(() => {
    const base = activeTime ? getAtmosphere(activeTime) : getAtmosphere(new Date(0))
    return applyWeatherToAtmosphere(base, weather, moon)
  }, [activeTime, weather, moon])
  const dateLabel = activeTime ? formatDate(activeTime) : ''
  const timeLabel = activeTime ? formatTime(activeTime) : '--:--'
  const sliderValue = manualMinutes ?? (now ? now.getHours() * 60 + now.getMinutes() : 0)
  const isManual = manualMinutes !== null
  const weatherLine = weather
    ? `Lima · ${weather.label}${Number.isFinite(weather.temperature) ? ` · ${Math.round(weather.temperature)}°` : ''}`
    : 'Lima · clima…'
  const moonLine = atmosphere.isDay ? null : moon.label
  const smokerActive = activeTime ? isSmokerWindowActive(activeTime) : false
  const smokeBurst = activeTime ? isSmokeBurst(activeTime) : false

  const buildingLits = useMemo(() => {
    return Array.from({ length: BUILDING_COUNT }, (_, i) => {
      const spec = i < BACK_BUILDINGS.length ? BACK_BUILDINGS[i] : FRONT_BUILDINGS[i - BACK_BUILDINGS.length]
      const f = flicker[i] ?? 0.5
      return formatLit(resolveBuildingLit(spec.base, lightPhase, f))
    })
  }, [flicker, lightPhase])

  const sceneStyle = {
    '--day-glow': atmosphere.glow,
    '--sky-top': atmosphere.skyTop,
    '--sky-bottom': atmosphere.skyBottom,
    '--horizon': atmosphere.horizon,
    '--sun-left': `${atmosphere.sunLeft}%`,
    '--sun-top': `${atmosphere.sunTop}%`,
    '--stars-opacity': atmosphere.stars,
    '--cloud-opacity': atmosphere.cloudOpacity,
    '--rain-opacity': atmosphere.rainOpacity,
    '--fog-opacity': atmosphere.fogOpacity,
    '--moon-illumination': atmosphere.moonIllumination,
  } as CSSProperties

  const presets = [
    { label: '6:00', minutes: 6 * 60 },
    { label: '12:00', minutes: 12 * 60 },
    { label: '18:00', minutes: 18 * 60 },
    { label: '22:00', minutes: 22 * 60 },
    { label: '3:33', minutes: 3 * 60 + 33 },
  ]

  const weatherClass = `weather-${atmosphere.weatherKind}`
  const bodyClass = atmosphere.isDay ? 'body-sun' : 'body-moon'
  const moonPhaseClass = !atmosphere.isDay ? `moon-${atmosphere.moonPhase}` : ''

  return (
    <main
      className={`city-scene ${scene.sky} ${bodyClass} ${weatherClass} ${moonPhaseClass} lights-${lightPhase}${atmosphere.isDay ? ' is-day' : ' is-night'}${atmosphere.showBody ? '' : ' hide-body'}`}
      style={sceneStyle}
    >
      <div className="sky-noise" aria-hidden="true" />
      <div className="sun-or-moon" aria-hidden="true" />
      <div className="weather-clouds" aria-hidden="true">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
        <span className="cloud c4" />
        <span className="cloud c5" />
      </div>
      <div className="weather-rain" aria-hidden="true" />
      <div className="weather-fog" aria-hidden="true" />
      <div className="weather-lightning" aria-hidden="true" />
      <div className="mist mist-a" aria-hidden="true" />
      <div className="mist mist-b" aria-hidden="true" />
      <div className="mist mist-c" aria-hidden="true" />
      <div className="plane" aria-hidden="true">
        <span className="plane-fuselage" />
        <span className="plane-wing" />
        <span className="plane-tail" />
        <span className="plane-light wingtip-front" />
        <span className="plane-light wingtip-back" />
        <span className="plane-light nose" />
      </div>
      <div className="stars" aria-hidden="true" />
      <div className="stars stars-bright" aria-hidden="true" />
      <div className="stars stars-twinkle a" aria-hidden="true" />
      <div className="stars stars-twinkle b" aria-hidden="true" />
      <div className="stars stars-twinkle c" aria-hidden="true" />

      <header className="scene-header">
        <h1 className="brand-mark"></h1>
        <p className="local-clock" aria-live="polite" suppressHydrationWarning>
          <span className="local-clock-date">{dateLabel}</span>
          <strong>{timeLabel}</strong>
          <span className="local-clock-zone">
            {isManual ? 'Prueba manual' : 'Hora local'} · {scene.label}
          </span>
          <span className="local-clock-weather">
            {weatherLine}
            {moonLine ? ` · ${moonLine}` : ''}
          </span>
        </p>
      </header>

      <div className="city" aria-label={`Paisaje urbano de ${scene.label}`}>
        <div className="distant-hills cerro-san-cristobal" aria-hidden="true">
          <svg viewBox="0 0 1200 420" preserveAspectRatio="xMaxYMax meet">
            <path
              fill="currentColor"
              d="M180 420 V300 C260 270 320 250 390 248 C470 246 520 210 580 170 C640 128 700 95 780 78 C850 64 910 78 960 118 C1005 154 1045 188 1090 210 C1135 232 1170 248 1200 258 V420 Z"
            />
            <path
              fill="currentColor"
              opacity=".35"
              d="M520 420 V260 C590 210 670 140 780 92 C860 70 930 100 990 150 C1035 186 1075 220 1120 250 V420 Z"
            />
            <path
              className="cerro-road"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".18"
              fill="none"
              d="M680 380 C720 330 750 280 780 240 C810 200 840 165 870 140"
            />
            <g className="cerro-lights">
              <circle className="cerro-light l1" cx="705" cy="355" r="3.2" />
              <circle className="cerro-light l2" cx="742" cy="295" r="2.8" />
              <circle className="cerro-light l3" cx="788" cy="248" r="3" />
              <circle className="cerro-light l4" cx="835" cy="198" r="2.6" />
              <circle className="cerro-light l5" cx="868" cy="158" r="2.4" />
              <circle className="cerro-light l6" cx="920" cy="220" r="2.5" />
              <circle className="cerro-light l7" cx="990" cy="255" r="2.7" />
            </g>
            <g className="cerro-cross" transform="translate(780 28)">
              <rect className="cerro-cross-glow" x="-10" y="4" width="20" height="44" rx="8" />
              <rect className="cerro-cross-beam" x="-3.5" y="0" width="7" height="52" rx="1.5" />
              <rect className="cerro-cross-beam" x="-15" y="11" width="30" height="6" rx="1.5" />
            </g>
          </svg>
        </div>
        <div className="buildings back-buildings" aria-hidden="true">
          {BACK_BUILDINGS.map((b, i) => (
            <Building
              key={`back-${i}`}
              height={b.height}
              width={b.width}
              lit={buildingLits[i]}
              variant={b.variant}
              roof={b.roof}
            />
          ))}
        </div>
        <div className="buildings front-buildings" aria-hidden="true">
          {FRONT_BUILDINGS.map((b, i) => {
            const litIndex = BACK_BUILDINGS.length + i
            return (
              <Building
                key={`front-${i}`}
                height={b.height}
                width={b.width}
                lit={buildingLits[litIndex]}
                variant={b.variant}
                roof={b.roof}
                smoker={Boolean(b.smokerSlot && smokerActive)}
                smokeBurst={Boolean(b.smokerSlot && smokeBurst)}
              />
            )
          })}
        </div>
        <div className="street-glow" aria-hidden="true" />
      </div>

      <aside className="time-lab" aria-label="Control de hora">
        <div className="time-lab-row">
          <button
            type="button"
            className={!isManual ? 'is-active' : undefined}
            onClick={() => setManualMinutes(null)}
          >
            En vivo
          </button>
          {presets.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              className={manualMinutes === preset.minutes ? 'is-active' : undefined}
              onClick={() => setManualMinutes(preset.minutes)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label className="time-lab-slider">
          <span>Probar hora</span>
          <input
            type="range"
            min={0}
            max={1439}
            step={1}
            value={sliderValue}
            onChange={(event) => setManualMinutes(Number(event.target.value))}
            aria-valuetext={timeLabel}
          />
        </label>
      </aside>
    </main>
  )
}
