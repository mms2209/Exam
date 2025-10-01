/*
  # Create Exam Papers System

  1. New Tables
    - `exam_subjects` - Stores subject information (e.g., Mathematics, Physics)
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Subject name
      - `description` (text) - Optional subject description
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `exam_papers` - Stores exam paper information and extracted text
      - `id` (uuid, primary key)
      - `subject_id` (uuid, foreign key to exam_subjects)
      - `year` (integer, not null) - Academic year of the exam
      - `paper_number` (text, not null) - Paper identifier (e.g., "1", "2", "1A")
      - `title` (text) - Optional title
      - `paper_file_url` (text, not null) - Storage path to exam paper PDF
      - `marking_scheme_file_url` (text, not null) - Storage path to marking scheme PDF
      - `paper_extracted_text` (text) - Extracted text from exam paper PDF
      - `marking_scheme_extracted_text` (text) - Extracted text from marking scheme PDF
      - `text_extraction_status` (enum: pending, processing, completed, failed)
      - `text_extracted_at` (timestamptz) - When extraction completed
      - `extraction_error` (text) - Error message if extraction failed
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `student_paper_interactions` - Tracks student access to exam papers
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `paper_id` (uuid, foreign key to exam_papers)
      - `access_count` (integer, default 0) - Number of times accessed
      - `last_accessed_at` (timestamptz) - Last access timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `chat_sessions` - Stores AI chat history per user per paper
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `paper_id` (uuid, foreign key to exam_papers)
      - `messages` (jsonb) - Array of chat messages
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage Buckets
    - `exam-papers` - Stores uploaded exam paper PDFs
    - `marking-schemes` - Stores uploaded marking scheme PDFs
    - Note: Storage buckets must be created manually in Supabase Dashboard

  3. Security (Row Level Security)
    - All tables have RLS enabled
    - exam_subjects: Readable by all authenticated users
    - exam_papers:
      - Readable by authenticated users with 'exam_papers' 'view' permission
      - Insertable/Updatable/Deletable by users with 'exam_papers' 'manage' permission
    - student_paper_interactions: Users can only access their own records
    - chat_sessions: Users can only access their own chat sessions

  4. Indexes
    - exam_papers: subject_id, year, paper_number, text_extraction_status
    - student_paper_interactions: user_id, paper_id
    - chat_sessions: user_id, paper_id
*/

-- Create extraction status enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
    CREATE TYPE extraction_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

-- Create exam_subjects table
CREATE TABLE IF NOT EXISTS exam_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exam_papers table
CREATE TABLE IF NOT EXISTS exam_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES exam_subjects(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year >= 1900 AND year <= 2100),
  paper_number text NOT NULL,
  title text,
  paper_file_url text NOT NULL,
  marking_scheme_file_url text NOT NULL,
  paper_extracted_text text,
  marking_scheme_extracted_text text,
  text_extraction_status extraction_status DEFAULT 'pending',
  text_extracted_at timestamptz,
  extraction_error text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, year, paper_number)
);

-- Create student_paper_interactions table
CREATE TABLE IF NOT EXISTS student_paper_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id uuid NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, paper_id)
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id uuid NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, paper_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject_id ON exam_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_papers_year ON exam_papers(year);
CREATE INDEX IF NOT EXISTS idx_exam_papers_text_extraction_status ON exam_papers(text_extraction_status);
CREATE INDEX IF NOT EXISTS idx_student_paper_interactions_user_id ON student_paper_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_student_paper_interactions_paper_id ON student_paper_interactions(paper_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_paper_id ON chat_sessions(paper_id);

-- Enable Row Level Security
ALTER TABLE exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_paper_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_subjects
CREATE POLICY "Authenticated users can read exam subjects"
  ON exam_subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage exam subjects"
  ON exam_subjects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for exam_papers
CREATE POLICY "Users with view permission can read exam papers"
  ON exam_papers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = auth.uid()
        AND p.resource = 'exam_papers'
        AND p.action = 'view'
    )
  );

CREATE POLICY "Users with manage permission can insert exam papers"
  ON exam_papers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = auth.uid()
        AND p.resource = 'exam_papers'
        AND p.action = 'manage'
    )
  );

CREATE POLICY "Users with manage permission can update exam papers"
  ON exam_papers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = auth.uid()
        AND p.resource = 'exam_papers'
        AND p.action = 'manage'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = auth.uid()
        AND p.resource = 'exam_papers'
        AND p.action = 'manage'
    )
  );

CREATE POLICY "Users with manage permission can delete exam papers"
  ON exam_papers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = auth.uid()
        AND p.resource = 'exam_papers'
        AND p.action = 'manage'
    )
  );

-- RLS Policies for student_paper_interactions
CREATE POLICY "Users can read their own paper interactions"
  ON student_paper_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paper interactions"
  ON student_paper_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paper interactions"
  ON student_paper_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chat_sessions
CREATE POLICY "Users can read their own chat sessions"
  ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
  ON chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON chat_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default exam subjects
INSERT INTO exam_subjects (name, description) VALUES
  ('Mathematics', 'Mathematics exam papers'),
  ('Physics', 'Physics exam papers'),
  ('Chemistry', 'Chemistry exam papers'),
  ('Biology', 'Biology exam papers'),
  ('Islamic Finance', 'Islamic Finance and Banking exam papers')
ON CONFLICT (name) DO NOTHING;
