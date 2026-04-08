'use client'

import { useState } from 'react'
import { login } from '@/actions/auth'
import { Mail, Lock, ArrowRight } from 'lucide-react'

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
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200 animate-scale-in">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
        <div className="relative">
          <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="email" type="email" required className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 transition-all" placeholder="vas@email.sk" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Heslo</label>
        <div className="relative">
          <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input name="password" type="password" required className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 transition-all" placeholder="Zadajte heslo" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none">
        {loading ? (
          <span className="animate-pulse">Prihlasujem...</span>
        ) : (
          <>Prihlásiť sa <ArrowRight size={16} /></>
        )}
      </button>
    </form>
  )
}
