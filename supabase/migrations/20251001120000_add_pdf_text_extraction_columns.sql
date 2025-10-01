/*
  # Add PDF Text Extraction Columns to Exam Papers

  1. Schema Changes
    - Add `paper_extracted_text` column to store extracted text from exam paper PDF
    - Add `marking_scheme_extracted_text` column to store extracted text from marking scheme PDF
    - Add `text_extraction_status` column to track extraction progress (pending, processing, completed, failed)
    - Add `text_extracted_at` timestamp to track when extraction was completed
    - Add `extraction_error` column to store error messages if extraction fails

  2. Performance
    - Add index on text_extraction_status for filtering papers by extraction state
    - Text columns are nullable to support backward compatibility with existing records

  3. Notes
    - Existing records will have NULL values for extracted text columns
    - Status defaults to 'pending' for new uploads
    - Extraction will be triggered after upload and updated asynchronously
*/

-- Add text extraction status type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_status') THEN
    CREATE TYPE extraction_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

-- Add columns for storing extracted PDF text
DO $$
BEGIN
  -- Add paper_extracted_text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_papers' AND column_name = 'paper_extracted_text'
  ) THEN
    ALTER TABLE exam_papers ADD COLUMN paper_extracted_text TEXT;
  END IF;

  -- Add marking_scheme_extracted_text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_papers' AND column_name = 'marking_scheme_extracted_text'
  ) THEN
    ALTER TABLE exam_papers ADD COLUMN marking_scheme_extracted_text TEXT;
  END IF;

  -- Add text_extraction_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_papers' AND column_name = 'text_extraction_status'
  ) THEN
    ALTER TABLE exam_papers ADD COLUMN text_extraction_status extraction_status DEFAULT 'pending';
  END IF;

  -- Add text_extracted_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_papers' AND column_name = 'text_extracted_at'
  ) THEN
    ALTER TABLE exam_papers ADD COLUMN text_extracted_at TIMESTAMPTZ;
  END IF;

  -- Add extraction_error column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_papers' AND column_name = 'extraction_error'
  ) THEN
    ALTER TABLE exam_papers ADD COLUMN extraction_error TEXT;
  END IF;
END $$;

-- Create index on text_extraction_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_exam_papers_text_extraction_status
ON exam_papers (text_extraction_status);

-- Update existing records to have 'pending' status
UPDATE exam_papers
SET text_extraction_status = 'pending'
WHERE text_extraction_status IS NULL;
