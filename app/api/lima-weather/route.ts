import { NextResponse } from 'next/server'
import { fetchLimaWeather } from '@/lib/lima-weather'

export const revalidate = 600

export async function GET() {
  try {
    const weather = await fetchLimaWeather()
    return NextResponse.json(weather)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo obtener el clima' },
      { status: 502 },
    )
  }
}
