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

      const paperContext = paper ? `
Exam Paper: ${paper.title || 'Untitled'}
Year: ${paper.year}
Paper Number: ${paper.paper_number}
Subject ID: ${paper.subject_id}

This is an exam paper that students are studying. The student is asking about a specific question from this paper.
` : 'No paper context available'

      const markingSchemeContext = `
The marking scheme for this exam paper is available but PDF text extraction is not yet implemented.
Please provide your best educational guidance based on the question asked and general exam principles.
`

      const response = await examPapersApi.sendChatMessage({
        paperId: paperId!,
        question,
        paperContent: paperContext,
        markingSchemeContent: markingSchemeContext
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
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
            <MessageSquare className="h-5 w-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-900">AI Tutor</span>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
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
