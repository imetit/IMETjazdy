import { ImageResponse } from 'next/og'
import { brand } from '@/lib/brand'

export const runtime = 'edge'
export const alt = `${brand.name} — ${brand.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: 80,
          backgroundColor: '#020617',
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(20,184,166,0.35), transparent 50%), radial-gradient(circle at 80% 70%, rgba(139,92,246,0.30), transparent 55%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: 4, color: '#5eead4', marginBottom: 28, fontWeight: 600 }}>
          HR · MZDY · FLEET · ARCHÍV
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.9, letterSpacing: -3 }}>
          <div style={{ fontSize: 130, fontWeight: 800, color: '#fff' }}>Jedna aplikácia.</div>
          <div style={{
            fontSize: 130,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #99f6e4, #fff, #ddd6fe)',
            backgroundClip: 'text',
            color: 'transparent',
            marginTop: -8,
          }}>
            Celá firma.
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginTop: 56,
          color: '#94a3b8', fontSize: 22,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#0f766e', fontSize: 18,
          }}>i</div>
          <span style={{ color: '#fff', fontWeight: 600 }}>{brand.name}</span>
          <span style={{ color: '#475569' }}>·</span>
          <span>{brand.domain}</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
