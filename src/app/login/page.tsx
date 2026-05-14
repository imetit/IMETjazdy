import LoginForm from '@/components/LoginForm'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="bg-white rounded-2xl p-4 w-fit mb-8 shadow-lg">
            <Image src="/imet-logo.png" alt="IMET" width={48} height={48} />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">IMET</h2>
          <h3 className="text-xl font-medium text-slate-400 mb-6">Interný systém</h3>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md">
            Kniha jázd a správa vozového parku. Evidencia služobných ciest, vyúčtovanie cestovných náhrad, sledovanie servisov a kontrol.
          </p>
          <div className="mt-12 flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-xs text-slate-500 mt-1">Prístup</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-xs text-slate-500 mt-1">Online</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">SSL</p>
              <p className="text-xs text-slate-500 mt-1">Zabezpečené</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-page-bg">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="bg-white rounded-2xl p-3 mb-4 shadow-lg border border-gray-200">
              <Image src="/imet-logo.png" alt="IMET" width={40} height={40} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Vitajte</h1>
          <p className="text-sm text-gray-500 mb-8">Prihláste sa do systému</p>
          <LoginForm />
          <div className="text-xs text-gray-400 text-center mt-8 space-y-2">
            <p>IMET &copy; {new Date().getFullYear()}</p>
            <p className="space-x-3">
              <a href="/privacy" className="hover:underline">Ochrana údajov</a>
              <span aria-hidden>·</span>
              <a href="/terms" className="hover:underline">Podmienky</a>
              <span aria-hidden>·</span>
              <a href="/security" className="hover:underline">Bezpečnosť</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
