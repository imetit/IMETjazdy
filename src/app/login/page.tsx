import LoginForm from '@/components/LoginForm'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-card shadow-lg border border-gray-100 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-sidebar-bg rounded-xl p-3 mb-4">
            <Image src="/imet-logo.png" alt="IMET" width={40} height={40} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">IMET Kniha Jázd</h1>
          <p className="text-sm text-gray-500 mt-1">Prihlásenie do systému</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
