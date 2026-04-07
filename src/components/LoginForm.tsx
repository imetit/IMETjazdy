'use client'

import { useState } from 'react'
import { login } from '@/actions/auth'

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
    <form action={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input name="email" type="email" required className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="vas@email.sk" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
        <input name="password" type="password" required className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Zadajte heslo" />
      </div>
      <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
        {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
      </button>
    </form>
  )
}
