import Link from 'next/link'
import Image from 'next/image'
import { Compass, Home, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Stránka nenájdená',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] text-white antialiased flex items-center justify-center p-6 overflow-hidden relative">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[15%] right-[10%] w-[500px] h-[500px] rounded-full
                        bg-[radial-gradient(circle,rgba(20,184,166,0.18),transparent_60%)] blur-[120px] aurora-1" />
        <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full
                        bg-[radial-gradient(circle,rgba(139,92,246,0.16),transparent_60%)] blur-[120px] aurora-2" />
      </div>

      <div className="relative w-full max-w-lg text-center">
        <p className="text-[10rem] sm:text-[14rem] font-bold tracking-[-0.05em] leading-none pb-4
                      bg-gradient-to-br from-teal-200 via-white to-violet-200 bg-clip-text text-transparent">
          404
        </p>

        <div className="-mt-4 mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4">
            <Compass size={18} className="text-teal-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Stránku sa nepodarilo nájsť</h1>
          <p className="text-slate-400 leading-relaxed">
            Možno bola presunutá, zmazaná, alebo URL je preklepom.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 bg-white text-slate-950 px-6 py-3 rounded-full text-sm font-semibold hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.02] transition-all">
            <Home size={15} /> Na úvod
            <ArrowLeft size={15} className="rotate-180 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-3 text-xs text-slate-500">
          <div className="bg-white rounded p-1"><Image src="/imet-logo.png" alt="IMET" width={16} height={16} /></div>
          <span>IMET Jazdy</span>
          <span aria-hidden>·</span>
          <a href="mailto:it@imet.sk" className="hover:text-white transition-colors">it@imet.sk</a>
        </div>
      </div>
    </div>
  )
}
