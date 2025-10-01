import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Send, Loader2, FileText, MessageSquare, ChevronLeft, Menu, X } from 'lucide-react'
import ModernNavbar from '../components/ModernNavbar'
import { PDFViewer } from '../components/PDFViewer'
import type { ExamPaperWithSubject, ChatMessage, AIResponse } from '../types/examPapers'

type ViewMode = 'paper' | 'chat' | 'both'

export default function ModernExamPaperViewer() {
  const { paperId } = useParams<{ paperId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [paper, setPaper] = useState<ExamPaperWithSubject | null>(null)
  const [paperUrl, setPaperUrl] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [isChatHistorySidebarOpen, setIsChatHistorySidebarOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pdfViewerRef = useRef<HTMLIFrameElement>(null)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (paperId && user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchPaper()
      fetchChatHistory()
      fetchAllChatSessions()
    }
  }, [paperId, user?.id])

  useEffect(() => {
    return () => {
      hasFetchedRef.current = false
    }
  }, [paperId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchPaper = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('exam_papers')
        .select(`
          *,
          subject:exam_subjects(*)
        `)
        .eq('id', paperId)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!data) {
        throw new Error('Paper not found')
      }

      if (data) {
        setPaper({
          ...data,
          subject: data.subject
        })

        // Get signed URL for the PDF
        console.log('📄 Paper file URL:', data.paper_file_url)
        const url = await getPaperUrl(data.paper_file_url)
        console.log('🔗 Generated signed URL:', url)
        if (url) {
          setPaperUrl(url)
        } else {
          console.error('❌ Failed to generate signed URL')
          setError('Failed to load PDF file')
        }
      }
    } catch (err: any) {
      console.error('Error fetching paper:', err)
      setError(err.message || 'Failed to load exam paper')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchChatHistory = async () => {
    if (!paperId || !user) return

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('paper_id', paperId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data && data.messages) {
        setMessages(data.messages as ChatMessage[])
      }
    } catch (err) {
      console.error('Error fetching chat history:', err)
    }
  }

  const fetchAllChatSessions = async () => {
    if (!user) return

    try {
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (!sessions) {
        setChatSessions([])
        return
      }

      // Fetch paper details for each session
      const sessionsWithPapers = await Promise.all(
        sessions.map(async (session) => {
          const { data: paper, error: paperError } = await supabase
            .from('exam_papers')
            .select(`
              *,
              subject:exam_subjects(*)
            `)
            .eq('id', session.paper_id)
            .maybeSingle()

          if (paperError) {
            console.error('Error fetching paper:', paperError)
            return { ...session, paper: null }
          }

          return { ...session, paper }
        })
      )

      setChatSessions(sessionsWithPapers)
    } catch (err) {
      console.error('Error fetching chat sessions:', err)
      setChatSessions([])
    }
  }

  const saveChatHistory = async (updatedMessages: ChatMessage[]) => {
    if (!paperId || !user) return

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .upsert({
          user_id: user.id,
          paper_id: paperId,
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,paper_id'
        })

      if (error) throw error
    } catch (err) {
      console.error('Error saving chat history:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputMessage.trim() || isSending || !paper) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputMessage('')
    setIsSending(true)

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/exam-chat-ai`

      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paperId: paper.id,
          question: inputMessage,
          paperContent: paper.paper_extracted_text,
          markingSchemeContent: paper.marking_scheme_extracted_text
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()
      const aiMessage: ChatMessage = data.message

      const finalMessages = [...updatedMessages, aiMessage]
      setMessages(finalMessages)
      await saveChatHistory(finalMessages)
      await fetchAllChatSessions()
    } catch (err: any) {
      console.error('Error sending message:', err)
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: JSON.stringify({
          explanation: `Error: ${err.message || 'Failed to get AI response. Please try again.'}`,
          examples: [],
          howToGetFullMarks: [],
          solution: ''
        }),
        timestamp: new Date().toISOString()
      }
      const finalMessages = [...updatedMessages, errorMessage]
      setMessages(finalMessages)
    } finally {
      setIsSending(false)
    }
  }

  const getPaperUrl = async (fileUrl: string) => {
    try {
      const bucketName = 'exam-papers'
      console.log('🔍 Attempting to create signed URL for:', fileUrl, 'in bucket:', bucketName)

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileUrl, 3600)

      if (error) {
        console.error('❌ Error creating signed URL:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))

        // Try to check if file exists
        const { data: fileList, error: listError } = await supabase.storage
          .from(bucketName)
          .list()

        if (listError) {
          console.error('❌ Cannot list files in bucket:', listError)
        } else {
          console.log('📁 Files in bucket:', fileList)
        }

        return ''
      }

      if (!data?.signedUrl) {
        console.error('❌ No signed URL returned')
        return ''
      }

      console.log('✅ Successfully created signed URL')
      return data.signedUrl
    } catch (err) {
      console.error('❌ Exception in getPaperUrl:', err)
      return ''
    }
  }

  const groupChatSessionsBySubject = () => {
    const grouped: { [key: string]: any[] } = {}

    chatSessions.forEach(session => {
      const subjectName = session.paper?.subject?.name || 'Unknown'

      if (!grouped[subjectName]) {
        grouped[subjectName] = []
      }

      grouped[subjectName].push(session)
    })

    return grouped
  }

  if (isLoading) {
    return (
      <>
        <ModernNavbar />
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </>
    )
  }

  if (error || !paper) {
    return (
      <>
        <ModernNavbar />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Paper</h2>
            <p className="text-gray-600 mb-4">{error || 'Paper not found'}</p>
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </>
    )
  }

  const groupedSessions = groupChatSessionsBySubject()

  let aiResponse: AIResponse | null = null
  const lastMessage = messages[messages.length - 1]
  if (lastMessage && lastMessage.role === 'assistant') {
    try {
      aiResponse = JSON.parse(lastMessage.content)
    } catch {
      aiResponse = null
    }
  }

  return (
    <>
      <ModernNavbar />
      <div className="flex bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Chat History Sidebar - Desktop */}
      <div className={`hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 ${isChatHistorySidebarOpen ? 'flex' : 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Home
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Chat History
          </h3>

          <div className="space-y-4">
            {Object.entries(groupedSessions).map(([subjectName, sessions]) => (
              <div key={subjectName}>
                <div className="text-sm font-medium text-gray-700 mb-2">{subjectName}</div>
                <div className="space-y-1">
                  {sessions.map(session => {
                    const isActive = session.paper_id === paperId
                    return (
                      <button
                        key={session.id}
                        onClick={() => navigate(`/exam-paper/${session.paper_id}`)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="truncate">
                          {session.paper?.year} - Paper {session.paper?.paper_number}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          Grade {session.paper?.grade_level || '12'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {Object.keys(groupedSessions).length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">
                No chat history yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatHistorySidebarOpen(!isChatHistorySidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {paper.subject.name} - Grade {paper.grade_level || '12'}
              </h1>
              <p className="text-sm text-gray-600">
                {paper.year} Paper {paper.paper_number}
                {paper.title && ` - ${paper.title}`}
              </p>
            </div>
          </div>

          {/* Mobile View Toggle */}
          <div className="flex lg:hidden gap-2">
            <button
              onClick={() => setViewMode('paper')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'paper' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('chat')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'chat' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer */}
          <div className={`flex-1 bg-gray-100 ${
            viewMode === 'chat' ? 'hidden lg:flex' : 'flex'
          } ${viewMode === 'both' ? 'lg:flex' : ''}`}>
            {paperUrl ? (
              <PDFViewer url={paperUrl} />
            ) : isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="h-16 w-16 text-red-400 mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                {paper?.paper_file_url && (
                  <button
                    onClick={async () => {
                      const url = await getPaperUrl(paper.paper_file_url)
                      if (url) window.open(url, '_blank')
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Open PDF in New Tab
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-600">No PDF available</p>
              </div>
            )}
          </div>

          {/* AI Chat */}
          <div className={`w-full lg:w-[500px] flex flex-col bg-white border-l border-gray-200 ${
            viewMode === 'paper' ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Ask a question about this exam paper</p>
                  <p className="text-xs mt-1">Example: "Explain question 1"</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.role === 'user'
                  let messageAiResponse: AIResponse | null = null

                  if (!isUser) {
                    try {
                      messageAiResponse = JSON.parse(message.content)
                    } catch {
                      messageAiResponse = null
                    }
                  }

                  return (
                    <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        isUser
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {isUser ? (
                          <p className="text-sm">{message.content}</p>
                        ) : messageAiResponse ? (
                          <div className="space-y-3 text-sm">
                            {messageAiResponse.explanation && (
                              <div>
                                <h4 className="font-semibold mb-1.5 text-gray-900">Explanation</h4>
                                <div className="text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                  {messageAiResponse.explanation}
                                </div>
                              </div>
                            )}

                            {messageAiResponse.examples && messageAiResponse.examples.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-1.5 text-gray-900">Examples</h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                  {messageAiResponse.examples.map((example, idx) => (
                                    <li key={idx} className="text-xs">{example}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {messageAiResponse.howToGetFullMarks && messageAiResponse.howToGetFullMarks.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-1.5 text-gray-900">How to Get Full Marks</h4>
                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                  {messageAiResponse.howToGetFullMarks.map((point, idx) => (
                                    <li key={idx} className="text-xs">{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {messageAiResponse.solution && (
                              <div>
                                <h4 className="font-semibold mb-1.5 text-gray-900">Solution</h4>
                                <div className="text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                  {messageAiResponse.solution}
                                </div>
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

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about a question..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Chat History Sidebar Overlay */}
      {isChatHistorySidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsChatHistorySidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={() => navigate('/home')}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Home
              </button>
              <button
                onClick={() => setIsChatHistorySidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 73px)' }}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Chat History
              </h3>

              <div className="space-y-4">
                {Object.entries(groupedSessions).map(([subjectName, sessions]) => (
                  <div key={subjectName}>
                    <div className="text-sm font-medium text-gray-700 mb-2">{subjectName}</div>
                    <div className="space-y-1">
                      {sessions.map(session => {
                        const isActive = session.paper_id === paperId
                        return (
                          <button
                            key={session.id}
                            onClick={() => {
                              navigate(`/exam-papers/${session.paper_id}`)
                              setIsChatHistorySidebarOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <div className="truncate">
                              {session.paper?.year} - Paper {session.paper?.paper_number}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              Grade {session.paper?.grade_level || '12'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
