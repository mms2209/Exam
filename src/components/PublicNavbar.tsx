import React, { useState } from 'react'
import { BookOpen, Menu, X } from 'lucide-react'

interface PublicNavbarProps {
  onLoginClick: () => void
}

export function PublicNavbar({ onLoginClick }: PublicNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 fixed w-full z-50 top-0 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                ExamAI
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={onLoginClick}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Log In
            </button>
            <button
              onClick={onLoginClick}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full hover:from-blue-600 hover:to-cyan-500 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <button
              onClick={() => {
                onLoginClick()
                setIsMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => {
                onLoginClick()
                setIsMenuOpen(false)
              }}
              className="block w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg hover:from-blue-600 hover:to-cyan-500 transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
