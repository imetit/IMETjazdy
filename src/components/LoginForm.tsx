'use client'

import { useState } from 'react'
import { login } from '@/actions/auth'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-200 text-sm px-4 py-3 rounded-xl animate-scale-in">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase">Email</label>
        <div className="relative group">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-teal-300" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-500
                       focus:outline-none focus:bg-white/[0.05] focus:border-teal-400/40 focus:ring-4 focus:ring-teal-500/10
                       transition-all"
            placeholder="vas@email.sk"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-2 tracking-wide uppercase">Heslo</label>
        <div className="relative group">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-teal-300" />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-500
                       focus:outline-none focus:bg-white/[0.05] focus:border-teal-400/40 focus:ring-4 focus:ring-teal-500/10
                       transition-all"
            placeholder="••••••••"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group btn-shine relative w-full bg-white text-slate-950 py-3.5 rounded-xl text-sm font-semibold
                   flex items-center justify-center gap-2 transition-all
                   hover:shadow-2xl hover:shadow-white/20 hover:scale-[1.01]
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
        {loading ? (
          <span className="animate-pulse">Prihlasujem…</span>
        ) : (
          <span className="relative z-10 flex items-center gap-2">
            Prihlásiť sa
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </button>
    </form>
  )
}
