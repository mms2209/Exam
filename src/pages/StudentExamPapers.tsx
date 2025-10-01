import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { examPapersApi } from '../lib/dataFetching'
import { FileText, Search, Calendar, BookOpen } from 'lucide-react'
import type { ExamPaperWithSubject } from '../types/examPapers'

export function StudentExamPapers() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  const { data: subjects = [] } = useQuery({
    queryKey: ['exam-subjects'],
    queryFn: examPapersApi.getSubjects
  })

  const { data: examPapers = [] } = useQuery({
    queryKey: ['exam-papers'],
    queryFn: examPapersApi.getExamPapers
  })

  const filteredPapers = examPapers.filter((paper: ExamPaperWithSubject) => {
    const matchesSearch = searchTerm === '' ||
      paper.subject?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.paper_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.title?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSubject = selectedSubject === '' || paper.subject_id === selectedSubject
    const matchesYear = selectedYear === '' || paper.year.toString() === selectedYear

    return matchesSearch && matchesSubject && matchesYear
  })

  const availableYears = Array.from(new Set(examPapers.map((p: ExamPaperWithSubject) => p.year)))
    .sort((a, b) => b - a)

  const handlePaperClick = (paperId: string) => {
    navigate(`/app/exam-papers/${paperId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Past Exam Papers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Browse and practice with past exam papers. Use the AI tutor to get help with specific questions.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search papers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredPapers.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No exam papers found</h3>
          <p className="text-sm text-gray-600">
            {searchTerm || selectedSubject || selectedYear
              ? 'Try adjusting your filters'
              : 'Exam papers will appear here once they are uploaded'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper: ExamPaperWithSubject) => (
            <div
              key={paper.id}
              onClick={() => handlePaperClick(paper.id)}
              className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  {paper.year}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {paper.subject?.name}
              </h3>

              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Paper {paper.paper_number}
                </p>
                {paper.title && (
                  <p className="text-sm text-gray-500 italic">{paper.title}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  View Paper & Get AI Help →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
