'use client'

import { useEffect, useMemo, useState } from 'react'

type TimeScene = {
  key: string
  label: string
  greeting: string
  sky: string
  horizon: string
  glow: number
}

const scenes: TimeScene[] = [
  { key: 'dawn', label: 'Mañana', greeting: 'Buenos días', sky: 'dawn', horizon: '06:00 — 09:59', glow: 0.45 },
  { key: 'morning', label: 'Media mañana', greeting: 'Una mañana tranquila', sky: 'morning', horizon: '10:00 — 11:59', glow: 0.72 },
  { key: 'noon', label: 'Mediodía', greeting: 'El día está en su punto', sky: 'noon', horizon: '12:00 — 16:59', glow: 1 },
  { key: 'sunset', label: 'Atardecer', greeting: 'La ciudad se tiñe de oro', sky: 'sunset', horizon: '17:00 — 19:59', glow: 0.7 },
  { key: 'night', label: 'Noche', greeting: 'La ciudad despierta', sky: 'night', horizon: '20:00 — 23:59', glow: 0.2 },
  { key: 'midnight', label: 'Madrugada', greeting: 'Todo está en calma', sky: 'midnight', horizon: '00:00 — 05:59', glow: 0.08 },
]

function getScene(hour: number) {
  if (hour < 6) return scenes[5]
  if (hour < 10) return scenes[0]
  if (hour < 12) return scenes[1]
  if (hour < 17) return scenes[2]
  if (hour < 20) return scenes[3]
  if (hour < 24) return scenes[4]
  return scenes[5]
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatDate(date: Date) {
  const label = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

type WindowStyle = 'office' | 'sparse' | 'busy' | 'dense' | 'ribbon'
type RoofStyle = 'antenna' | 'sign' | 'tank' | 'dish' | 'hvac' | 'spire' | 'neon' | 'acme'

function Building({
  height,
  width,
  lit,
  variant = 'office',
  roof = 'hvac',
  smoker = false,
}: {
  height: string
  width: string
  lit: string
  variant?: WindowStyle
  roof?: RoofStyle
  smoker?: boolean
}) {
  return (
    <i
      className={`win-${variant} roof-${roof}${smoker ? ' has-smoker' : ''}`}
      style={{ '--height': height, '--width': width, '--lit': lit } as React.CSSProperties}
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
        </span>
      )}
    </i>
  )
}

export default function Page() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const scene = useMemo(() => getScene(now?.getHours() ?? 0), [now])
  const dateLabel = now ? formatDate(now) : ''
  const timeLabel = now ? formatTime(now) : '--:--'

  return (
    <main className={`city-scene ${scene.sky}`} style={{ '--day-glow': scene.glow } as React.CSSProperties}>
      <div className="sky-noise" aria-hidden="true" />
      <div className="sun-or-moon" aria-hidden="true" />
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
          <span className="local-clock-zone">Hora local</span>
        </p>
      </header>

      <div className="city" aria-label={`Paisaje urbano de ${scene.label}`}>
        <div className="distant-hills" />
        <div className="buildings back-buildings" aria-hidden="true">
          <Building height="26%" width="8%" lit=".18" variant="sparse" roof="hvac" />
          <Building height="37%" width="10%" lit=".52" variant="dense" roof="antenna" />
          <Building height="20%" width="12%" lit=".08" variant="ribbon" roof="tank" />
          <Building height="42%" width="9%" lit=".34" variant="office" roof="dish" />
          <Building height="31%" width="11%" lit=".68" variant="busy" roof="sign" />
          <Building height="23%" width="8%" lit=".12" variant="sparse" roof="hvac" />
          <Building height="39%" width="12%" lit=".43" variant="dense" roof="spire" />
          <Building height="28%" width="10%" lit=".22" variant="office" roof="antenna" />
        </div>
        <div className="buildings front-buildings" aria-hidden="true">
          <Building height="43%" width="13%" lit=".42" variant="office" roof="antenna" />
          <Building height="31%" width="10%" lit=".16" variant="sparse" roof="hvac" />
          <Building height="56%" width="14%" lit=".72" variant="dense" roof="acme" />
          <Building height="36%" width="9%" lit=".28" variant="ribbon" roof="tank" />
          <Building height="65%" width="13%" lit=".82" variant="dense" roof="spire" />
          <Building height="46%" width="10%" lit=".2" variant="sparse" roof="dish" />
          <Building height="33%" width="15%" lit=".55" variant="ribbon" roof="neon" />
          <Building height="52%" width="11%" lit=".38" variant="busy" roof="antenna" smoker />
          <Building height="38%" width="14%" lit=".64" variant="office" roof="tank" />
        </div>
        <div className="street-glow" aria-hidden="true" />
      </div>
    </main>
  )
}
