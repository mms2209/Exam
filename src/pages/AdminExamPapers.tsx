import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { examPapersApi } from '../lib/dataFetching'
import { Upload, Trash2, FileText, BookOpen, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import type { ExamPaperWithSubject } from '../types/examPapers'

export function AdminExamPapers() {
  const queryClient = useQueryClient()
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [paperFile, setPaperFile] = useState<File | null>(null)
  const [markingSchemeFile, setMarkingSchemeFile] = useState<File | null>(null)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [paperNumber, setPaperNumber] = useState('')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: subjects = [] } = useQuery({
    queryKey: ['exam-subjects'],
    queryFn: examPapersApi.getSubjects
  })

  const { data: examPapers = [] } = useQuery({
    queryKey: ['exam-papers'],
    queryFn: examPapersApi.getExamPapers
  })

  const deleteMutation = useMutation({
    mutationFn: examPapersApi.deleteExamPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-papers'] })
    }
  })

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paperFile || !markingSchemeFile || !selectedSubject || !paperNumber) {
      setUploadError('Please fill all required fields')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const uploadedPaper = await examPapersApi.uploadExamPaper(paperFile, markingSchemeFile, {
        subjectId: selectedSubject,
        year,
        paperNumber,
        title: title || undefined
      })

      queryClient.invalidateQueries({ queryKey: ['exam-papers'] })

      examPapersApi.extractPDFText(uploadedPaper.id)
        .then(() => {
          console.log('PDF extraction started successfully for paper:', uploadedPaper.id)
          queryClient.invalidateQueries({ queryKey: ['exam-papers'] })
        })
        .catch(error => {
          console.error('PDF extraction failed:', error)
          alert(`Warning: Paper uploaded successfully, but PDF text extraction failed: ${error.message}. You can retry extraction later.`)
        })

      setPaperFile(null)
      setMarkingSchemeFile(null)
      setSelectedSubject('')
      setPaperNumber('')
      setTitle('')
      setShowUploadForm(false)
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload exam paper')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this exam paper?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleRetryExtraction = async (paperId: string) => {
    try {
      await examPapersApi.extractPDFText(paperId)
      queryClient.invalidateQueries({ queryKey: ['exam-papers'] })
      alert('PDF extraction started. This may take a few moments.')
    } catch (error: any) {
      alert(`Failed to start extraction: ${error.message}`)
    }
  }

  const getExtractionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Extracted
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Exam Papers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload and manage past exam papers and marking schemes
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Paper
        </button>
      </div>

      {showUploadForm && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Exam Paper</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paper Number *
                </label>
                <input
                  type="text"
                  value={paperNumber}
                  onChange={(e) => setPaperNumber(e.target.value)}
                  placeholder="e.g., 1, 2, 1A"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Midterm Exam"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Paper PDF *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marking Scheme PDF *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setMarkingSchemeFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Paper'}
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paper
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Extraction Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {examPapers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No exam papers uploaded yet</p>
                  </td>
                </tr>
              ) : (
                examPapers.map((paper: ExamPaperWithSubject) => (
                  <tr key={paper.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-emerald-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {paper.subject?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {paper.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Paper {paper.paper_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {paper.title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getExtractionStatusBadge(paper.text_extraction_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(paper.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {(paper.text_extraction_status === 'failed' || paper.text_extraction_status === 'pending') && (
                          <button
                            onClick={() => handleRetryExtraction(paper.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Retry extraction"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(paper.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete paper"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
