import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, BookOpen, LogOut, User, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { ExamPaperWithSubject, ExamPapersByGrade } from '../types/examPapers'

export default function ModernNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isGradesDropdownOpen, setIsGradesDropdownOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [examPapersByGrade, setExamPapersByGrade] = useState<ExamPapersByGrade>({})
  const [isLoading, setIsLoading] = useState(true)

  const gradesDropdownRef = useRef<HTMLDivElement>(null)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchExamPapers()
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (gradesDropdownRef.current && !gradesDropdownRef.current.contains(event.target as Node)) {
        setIsGradesDropdownOpen(false)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchExamPapers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('exam_papers')
        .select(`
          *,
          subject:exam_subjects(*)
        `)
        .eq('text_extraction_status', 'completed')
        .order('grade_level', { ascending: true })
        .order('year', { ascending: false })

      if (error) throw error

      const papersByGrade: ExamPapersByGrade = {}

      if (data) {
        data.forEach((paper: any) => {
          const grade = paper.grade_level || '12'
          const subjectName = paper.subject?.name || 'Unknown'

          if (!papersByGrade[grade]) {
            papersByGrade[grade] = {}
          }

          if (!papersByGrade[grade][subjectName]) {
            papersByGrade[grade][subjectName] = []
          }

          papersByGrade[grade][subjectName].push({
            ...paper,
            subject: paper.subject
          })
        })
      }

      setExamPapersByGrade(papersByGrade)
    } catch (error) {
      console.error('Error fetching exam papers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaperClick = (paperId: string) => {
    navigate(`/exam-paper/${paperId}`)
    setIsGradesDropdownOpen(false)
    setIsMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const gradeOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'AS', 'A2']
  const sortedGrades = Object.keys(examPapersByGrade).sort((a, b) => {
    return gradeOrder.indexOf(a) - gradeOrder.indexOf(b)
  })

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to={user ? "/home" : "/"} className="flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-emerald-600" />
              <span className="text-xl font-semibold text-gray-900">AI Exam Tutor</span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center gap-6">
                <div className="relative" ref={gradesDropdownRef}>
                  <button
                    onClick={() => setIsGradesDropdownOpen(!isGradesDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Grades
                    <ChevronDown className={`h-4 w-4 transition-transform ${isGradesDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isGradesDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[32rem] overflow-y-auto">
                      {isLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                      ) : sortedGrades.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No exam papers available</div>
                      ) : (
                        <div className="py-2">
                          {sortedGrades.map(grade => (
                            <div key={grade} className="px-2 py-1">
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Grade {grade}
                              </div>
                              {Object.entries(examPapersByGrade[grade]).map(([subjectName, papers]) => (
                                <div key={subjectName} className="ml-2">
                                  <div className="px-3 py-1.5 text-sm font-medium text-gray-700">
                                    {subjectName}
                                  </div>
                                  <div className="ml-2">
                                    {papers.map(paper => (
                                      <button
                                        key={paper.id}
                                        onClick={() => handlePaperClick(paper.id)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors"
                                      >
                                        {paper.year} - Paper {paper.paper_number}
                                        {paper.title && <span className="text-xs text-gray-500 ml-1">({paper.title})</span>}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:block relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="max-w-[150px] truncate">{user.email}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200">
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Profile Settings
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && user && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Grades
              </div>
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : sortedGrades.length === 0 ? (
                <div className="text-sm text-gray-500">No exam papers available</div>
              ) : (
                <div className="space-y-2">
                  {sortedGrades.map(grade => (
                    <div key={grade}>
                      <div className="text-sm font-semibold text-gray-700 mb-1">Grade {grade}</div>
                      {Object.entries(examPapersByGrade[grade]).map(([subjectName, papers]) => (
                        <div key={subjectName} className="ml-3 mb-2">
                          <div className="text-sm font-medium text-gray-600 mb-1">{subjectName}</div>
                          <div className="ml-3 space-y-1">
                            {papers.map(paper => (
                              <button
                                key={paper.id}
                                onClick={() => handlePaperClick(paper.id)}
                                className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors"
                              >
                                {paper.year} - Paper {paper.paper_number}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2">
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4" />
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
