'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved === 'dark'
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  return (
    <button onClick={toggle} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200" title={dark ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}>
      {dark ? <Sun size={15} /> : <Moon size={15} />}
      {dark ? 'Svetlý režim' : 'Tmavý režim'}
    </button>
  )
}
