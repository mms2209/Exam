/*
  # Add Grade Levels to Exam Papers

  1. Changes
    - Add `grade_level` column to exam_papers table
    - Add check constraint to validate grade levels (1-12, AS, A2)
    - Create index on grade_level for efficient filtering
    - Update existing papers to have default grade level

  2. Notes
    - Grade levels support: 1-12 for primary/secondary, AS and A2 for A-levels
    - Existing papers will default to grade level '12' (can be updated by admin)
*/

-- Add grade_level column to exam_papers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_papers' AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE exam_papers ADD COLUMN grade_level text NOT NULL DEFAULT '12';
  END IF;
END $$;

-- Add check constraint for valid grade levels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_papers_grade_level_check'
  ) THEN
    ALTER TABLE exam_papers ADD CONSTRAINT exam_papers_grade_level_check
    CHECK (grade_level IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'AS', 'A2'));
  END IF;
END $$;

-- Create index on grade_level for efficient filtering
CREATE INDEX IF NOT EXISTS idx_exam_papers_grade_level ON exam_papers(grade_level);

-- Create composite index for common query pattern (grade + subject + year)
CREATE INDEX IF NOT EXISTS idx_exam_papers_grade_subject_year
ON exam_papers(grade_level, subject_id, year DESC);
