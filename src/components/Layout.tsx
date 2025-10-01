import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle } from 'lucide-react'

interface LayoutProps {
  showSidebar?: boolean
}

export function Layout({ showSidebar = true }: LayoutProps) {
  const { error } = useAuth()
  const isUsingCachedData = error?.includes('cached') || error?.includes('offline')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {isUsingCachedData && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Using offline data. Some features may be limited.</span>
          </div>
        </div>
      )}
      <div className="flex">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 ${showSidebar ? 'ml-64' : ''} p-6`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}