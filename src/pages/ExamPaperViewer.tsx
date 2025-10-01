import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { examPapersApi } from '../lib/dataFetching'
import { ArrowLeft, Send, Loader2, FileText, MessageSquare, AlertCircle } from 'lucide-react'
import type { ChatMessage, AIResponse } from '../types/examPapers'

export function ExamPaperViewer() {
  const { paperId } = useParams<{ paperId: string }>()
  const navigate = useNavigate()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: paper, isLoading: paperLoading } = useQuery({
    queryKey: ['exam-paper', paperId],
    queryFn: () => examPapersApi.getExamPaperById(paperId!),
    enabled: !!paperId
  })

  const { data: session } = useQuery({
    queryKey: ['chat-session', paperId],
    queryFn: () => examPapersApi.getChatSession(paperId!),
    enabled: !!paperId
  })

  useEffect(() => {
    if (session) {
      setSessionId(session.id)
      setMessages(session.messages || [])
    }
  }, [session])

  useEffect(() => {
    if (paper) {
      examPapersApi.trackPaperAccess(paper.id)
      examPapersApi.getPaperFileUrl(paper.paper_file_url).then(url => {
        if (url) setPdfUrl(url)
      })
    }
  }, [paper])

  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: new Date().toISOString()
      }

      setErrorMessage(null)

      const paperWithText = await examPapersApi.getExamPaperWithText(paperId!)

      console.log('[ExamPaperViewer] Paper text extraction status:', paperWithText.text_extraction_status)
      console.log('[ExamPaperViewer] Paper extracted text length:', paperWithText.paper_extracted_text?.length || 0)
      console.log('[ExamPaperViewer] Marking scheme extracted text length:', paperWithText.marking_scheme_extracted_text?.length || 0)

      let paperContent = ''
      let markingSchemeContent = ''

      if (paperWithText.text_extraction_status === 'completed') {
        if (paperWithText.paper_extracted_text) {
          paperContent = `
Exam Paper: ${paperWithText.title || 'Untitled'}
Subject: ${paperWithText.subject?.name}
Year: ${paperWithText.year}
Paper Number: ${paperWithText.paper_number}

=== EXAM PAPER CONTENT ===
${paperWithText.paper_extracted_text}
=== END OF EXAM PAPER ===

The student is asking about a specific question from this exam paper.
`
        }

        if (paperWithText.marking_scheme_extracted_text) {
          markingSchemeContent = `
=== MARKING SCHEME ===
${paperWithText.marking_scheme_extracted_text}
=== END OF MARKING SCHEME ===

Use this marking scheme to provide accurate guidance on how to get full marks.
`
        }
      } else if (paperWithText.text_extraction_status === 'processing') {
        paperContent = `
Exam Paper: ${paperWithText.title || 'Untitled'}
Subject: ${paperWithText.subject?.name}
Year: ${paperWithText.year}
Paper Number: ${paperWithText.paper_number}

Note: PDF text is currently being extracted. Please try again in a few moments for more detailed assistance.
`
        markingSchemeContent = 'PDF text extraction is in progress. Please wait and try again shortly.'
      } else if (paperWithText.text_extraction_status === 'pending') {
        paperContent = `
Exam Paper: ${paperWithText.title || 'Untitled'}
Subject: ${paperWithText.subject?.name}
Year: ${paperWithText.year}
Paper Number: ${paperWithText.paper_number}

Note: PDF text extraction has not started yet. The AI will provide general guidance based on your question.
`
        markingSchemeContent = 'PDF text extraction is pending. General guidance will be provided.'
      } else {
        paperContent = `
Exam Paper: ${paperWithText.title || 'Untitled'}
Subject: ${paperWithText.subject?.name}
Year: ${paperWithText.year}
Paper Number: ${paperWithText.paper_number}

Note: PDF text extraction failed. The AI will provide general educational guidance.
Error: ${paperWithText.extraction_error || 'Unknown error'}
`
        markingSchemeContent = 'PDF text could not be extracted. Providing general educational guidance.'
      }

      console.log('[ExamPaperViewer] Sending to AI - Paper content length:', paperContent.length)
      console.log('[ExamPaperViewer] Sending to AI - Marking scheme content length:', markingSchemeContent.length)

      if (!paperContent || paperContent.length < 100) {
        console.warn('[ExamPaperViewer] WARNING: Paper content is empty or very short!')
      }
      if (!markingSchemeContent || markingSchemeContent.length < 100) {
        console.warn('[ExamPaperViewer] WARNING: Marking scheme content is empty or very short!')
      }

      const response = await examPapersApi.sendChatMessage({
        paperId: paperId!,
        question,
        paperContent,
        markingSchemeContent
      })

      return { userMessage, response }
    },
    onSuccess: async (data) => {
      const { userMessage, response } = data
      const assistantMessage = response.message

      setMessages(prev => {
        const messageIds = new Set(prev.map(m => m.id))
        const newMessages = []

        if (!messageIds.has(userMessage.id)) {
          newMessages.push(userMessage)
        }
        if (!messageIds.has(assistantMessage.id)) {
          newMessages.push(assistantMessage)
        }

        return [...prev, ...newMessages]
      })

      let currentSessionId = sessionId
      if (!currentSessionId && paperId) {
        const session = await examPapersApi.createChatSession(paperId)
        currentSessionId = session.id
        setSessionId(currentSessionId)
      }

      if (currentSessionId) {
        const updatedMessages = [...messages, userMessage, assistantMessage]
        await examPapersApi.updateChatSession(currentSessionId, updatedMessages)
      }
    },
    onError: (error: any) => {
      let displayError = 'Unable to get a response from the AI tutor. Please try again.'

      if (error.status === 503) {
        displayError = 'AI service is currently unavailable. Please contact your administrator to configure the service.'
      } else if (error.status === 429) {
        displayError = 'AI service quota exceeded. Please try again later.'
      } else if (error.message) {
        displayError = error.message
      }

      setErrorMessage(displayError)
    }
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(inputMessage)
      setInputMessage('')
    }
  }

  const parseAIResponse = (content: string): AIResponse | null => {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  if (paperLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Exam paper not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/exam-papers')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Papers
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {paper.subject?.name} - Paper {paper.paper_number} ({paper.year})
          </h1>
          {paper.title && (
            <p className="text-sm text-gray-600 mt-1">{paper.title}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)]">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
            <FileText className="h-5 w-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-900">Exam Paper</span>
          </div>
          <div className="h-full overflow-auto p-4">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Exam Paper"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 text-gray-600 mr-2" />
              <span className="font-medium text-gray-900">AI Tutor</span>
            </div>
            {paper && (
              <div className="flex items-center gap-2 text-xs">
                {paper.text_extraction_status === 'completed' && (
                  <span className="flex items-center text-green-700">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Content ready
                  </span>
                )}
                {paper.text_extraction_status === 'processing' && (
                  <span className="flex items-center text-blue-700">
                    <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Extracting content...
                  </span>
                )}
                {(paper.text_extraction_status === 'pending' || paper.text_extraction_status === 'failed') && (
                  <span className="flex items-center text-amber-700">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Limited content
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {paper && (paper.text_extraction_status === 'pending' || paper.text_extraction_status === 'processing') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 font-medium">
                      {paper.text_extraction_status === 'processing' ? 'PDF Content Extraction in Progress' : 'PDF Content Not Yet Extracted'}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {paper.text_extraction_status === 'processing'
                        ? 'The exam paper and marking scheme are being processed. The AI can still help, but responses will be more accurate once extraction completes.'
                        : 'The exam paper content has not been extracted yet. The AI will provide general guidance until the content is available.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paper && paper.text_extraction_status === 'failed' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 font-medium">Content Extraction Failed</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Unable to extract text from the PDF files. The AI will provide general educational guidance, but won't have access to the specific paper content.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">Error</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm mb-2">Ask the AI tutor about any question!</p>
                <p className="text-xs text-gray-400">
                  Example: "Explain question 5" or "How do I solve question 3?"
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const aiResponse = message.role === 'assistant' ? parseAIResponse(message.content) : null

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : aiResponse ? (
                        <div className="space-y-3 text-sm">
                          {aiResponse.explanation && (
                            <div>
                              <h4 className="font-semibold mb-1">Explanation</h4>
                              <p className="text-gray-700">{aiResponse.explanation}</p>
                            </div>
                          )}

                          {aiResponse.examples && aiResponse.examples.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-1">Examples</h4>
                              <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {aiResponse.examples.map((example, idx) => (
                                  <li key={idx}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiResponse.howToGetFullMarks && aiResponse.howToGetFullMarks.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-1">How to Get Full Marks</h4>
                              <ul className="list-disc list-inside space-y-1 text-gray-700">
                                {aiResponse.howToGetFullMarks.map((point, idx) => (
                                  <li key={idx}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiResponse.solution && (
                            <div>
                              <h4 className="font-semibold mb-1">Solution</h4>
                              <p className="text-gray-700 whitespace-pre-wrap">{aiResponse.solution}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about a specific question..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={sendMessageMutation.isPending}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
