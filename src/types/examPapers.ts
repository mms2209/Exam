import { Database } from './database'

export type ExamSubject = Database['public']['Tables']['exam_subjects']['Row']
export type ExamPaper = Database['public']['Tables']['exam_papers']['Row']
export type StudentPaperInteraction = Database['public']['Tables']['student_paper_interactions']['Row']
export type ChatSession = Database['public']['Tables']['chat_sessions']['Row']

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ExamPaperWithSubject extends ExamPaper {
  subject: ExamSubject
}

export type GradeLevel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'AS' | 'A2'

export interface ExamPapersByGrade {
  [grade: string]: {
    [subjectName: string]: ExamPaperWithSubject[]
  }
}

export interface AIResponse {
  explanation: string
  examples: string[]
  howToGetFullMarks: string[]
  solution: string
}

export interface ChatRequest {
  paperId: string
  question: string
  sessionId?: string
  paperContent?: string
  markingSchemeContent?: string
}

export interface ChatResponse {
  message: ChatMessage
  sessionId?: string
}
