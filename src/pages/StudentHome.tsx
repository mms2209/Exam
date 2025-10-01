import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, BookOpen, GraduationCap } from 'lucide-react'
import ModernNavbar from '../components/ModernNavbar'
import type { ExamPaperWithSubject, ExamPapersByGrade } from '../types/examPapers'

export default function StudentHome() {
  const navigate = useNavigate()
  const [examPapersByGrade, setExamPapersByGrade] = useState<ExamPapersByGrade>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchExamPapers()
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
    navigate(`/exam-papers/${paperId}`)
  }

  const gradeOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'AS', 'A2']
  const sortedGrades = Object.keys(examPapersByGrade).sort((a, b) => {
    return gradeOrder.indexOf(a) - gradeOrder.indexOf(b)
  })

  if (isLoading) {
    return (
      <>
        <ModernNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </>
    )
  }

  return (
    <>
      <ModernNavbar />
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-16 w-16 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to AI Exam Tutor
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select an exam paper to get started. Our AI tutor will help you understand questions and improve your exam performance.
          </p>
        </div>

        {sortedGrades.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Papers Available</h3>
            <p className="text-gray-600">Check back later for available exam papers.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGrades.map(grade => (
              <div key={grade} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4">
                  <h2 className="text-xl font-semibold text-emerald-900">
                    Grade {grade}
                  </h2>
                </div>

                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(examPapersByGrade[grade]).map(([subjectName, papers]) => (
                      <div key={subjectName} className="space-y-3">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-emerald-600" />
                          {subjectName}
                        </h3>
                        <div className="space-y-2">
                          {papers.map(paper => (
                            <button
                              key={paper.id}
                              onClick={() => handlePaperClick(paper.id)}
                              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-emerald-50 rounded-lg border border-gray-200 hover:border-emerald-200 transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">
                                    {paper.year} - Paper {paper.paper_number}
                                  </div>
                                  {paper.title && (
                                    <div className="text-sm text-gray-600 mt-0.5">
                                      {paper.title}
                                    </div>
                                  )}
                                </div>
                                <svg
                                  className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
