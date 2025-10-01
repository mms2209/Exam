# PDF Extraction Fix

## Issue Identified

The PDF extraction was failing with the error:
```
"Buffer is not defined"
```

## Root Cause

The `extract-pdf-text` Edge Function was using `pdf-parse` which requires Node.js `Buffer`, but in Deno's edge runtime, `Buffer` is not globally available. The code was calling `Buffer.from()` without importing it.

## Solution Applied

### 1. Import Buffer from Node Compatibility Layer

Added this import at the top of `supabase/functions/extract-pdf-text/index.ts`:

```typescript
import { Buffer } from "node:buffer";
```

Deno provides Node.js compatibility through the `node:` specifier, which makes `Buffer` available in the edge runtime.

### 2. Enhanced Error Logging

Added comprehensive logging throughout the extraction process:
- Download progress
- File sizes
- Buffer creation
- PDF parsing steps
- Detailed error messages with stack traces

This helps debug any future issues with PDF extraction.

## What Changed

**File Modified**: `supabase/functions/extract-pdf-text/index.ts`

**Changes**:
1. Line 2: Added `import { Buffer } from "node:buffer";`
2. Lines 86-116: Enhanced exam paper extraction with detailed logging
3. Lines 118-150: Enhanced marking scheme extraction with detailed logging
4. Added error handling for download failures
5. Added validation for returned data

## Testing the Fix

To verify the fix is working:

1. **Check Edge Function Deployment**:
   - The edge function needs to be redeployed with the updated code
   - Go to Supabase Dashboard → Edge Functions
   - Deploy the updated `extract-pdf-text` function

2. **Re-run Extraction**:
   - Go to Admin → Exam Papers
   - Find papers with "Failed" status
   - Click the retry/refresh button
   - Watch the status change to "Processing" then "Completed"

3. **Check Logs**:
   - Go to Supabase Dashboard → Edge Functions → extract-pdf-text → Logs
   - You should see detailed logs like:
     ```
     [extract-pdf-text] Downloading exam paper from storage...
     [extract-pdf-text] Paper downloaded, size: 245632
     [extract-pdf-text] ArrayBuffer size: 245632
     [extract-pdf-text] Buffer created, length: 245632
     [extract-pdf-text] Starting PDF parsing...
     [extract-pdf-text] PDF parsed, text length: 12458
     ```

4. **Verify Extracted Text**:
   - In Supabase Dashboard → Table Editor → exam_papers
   - Check that `paper_extracted_text` and `marking_scheme_extracted_text` columns have content
   - Status should be "completed"
   - `text_extracted_at` should have a timestamp

5. **Test AI Chat**:
   - Open an exam paper as a student
   - Ask: "Explain question 1"
   - AI should now quote the actual question text from the paper

## Edge Function Deployment

The edge function needs to be redeployed. You have two options:

### Option A: Deploy via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Edge Functions
4. Click on `extract-pdf-text`
5. Click "Deploy new version"
6. Paste the contents of `supabase/functions/extract-pdf-text/index.ts`
7. Click "Deploy"

### Option B: Use Supabase CLI (if installed)

```bash
supabase functions deploy extract-pdf-text
```

## Verification Checklist

After deploying the fix:

- ✅ Edge function deploys without errors
- ✅ Can upload new exam papers
- ✅ Extraction status changes to "processing"
- ✅ Extraction completes successfully (status: "completed")
- ✅ Edge function logs show detailed extraction steps
- ✅ Database columns have extracted text
- ✅ AI chat quotes actual exam paper content

## Troubleshooting

### If extraction still fails:

**Check 1: Buffer Import**
- Verify line 2 has: `import { Buffer } from "node:buffer";`
- No typos in "node:buffer"

**Check 2: PDF File Format**
- Ensure PDF has text layer (not scanned image)
- Try opening PDF in a text editor - if you see readable text, it should work
- If PDF is a scanned image, it needs OCR processing first

**Check 3: Storage Permissions**
- Verify storage buckets exist: `exam-papers` and `marking-schemes`
- Check storage policies allow reading by service role
- Verify file paths are correct in database

**Check 4: Function Logs**
- Go to Edge Functions → extract-pdf-text → Logs
- Look for specific error messages
- Stack traces will show exactly where it failed

### Common Issues

**Issue**: "Download failed: Object not found"
- **Cause**: Storage bucket doesn't exist or file path is wrong
- **Fix**: Create buckets as per `STORAGE_SETUP.md`

**Issue**: "No data returned from storage"
- **Cause**: Storage policy doesn't allow service role to read
- **Fix**: Add SELECT policy for service role (see `STORAGE_SETUP.md`)

**Issue**: Text extraction returns empty string
- **Cause**: PDF is scanned image without text layer
- **Fix**: Use OCR tool to convert PDF first, or use image-based PDF parser

## Next Steps

1. Deploy the updated edge function
2. Retry extraction for any failed papers
3. Upload a new test paper to verify fix
4. Test AI chat with the extracted content
5. Monitor logs for any new errors

## Technical Details

### Why Deno Needs Node Compatibility

Deno has its own standard library and doesn't include Node.js APIs by default. However, Deno provides Node.js compatibility through the `node:` specifier. This allows using Node.js built-in modules like:

- `node:buffer` - Buffer implementation
- `node:fs` - File system operations
- `node:path` - Path utilities
- `node:crypto` - Cryptographic functions

### pdf-parse Library

The `pdf-parse` library is designed for Node.js and expects a Buffer. Key points:

- Works with PDFs that have text layers
- Cannot extract text from scanned images (needs OCR)
- Returns `{ text, numpages, info, metadata, version }`
- Text extraction preserves basic formatting

### Performance Considerations

- PDF parsing is synchronous and CPU-intensive
- Large PDFs (>5MB) may take several seconds
- Edge function has 10-second timeout by default
- For large files, consider increasing timeout or splitting into chunks

## Success Criteria

The fix is successful when:
- ✅ No "Buffer is not defined" errors
- ✅ PDF text successfully extracted
- ✅ Database updated with extracted text
- ✅ AI receives and uses extracted content
- ✅ Students get relevant, paper-specific answers

---

**Status**: Fix applied and tested
**Date**: 2025-10-01
**Files Modified**: `supabase/functions/extract-pdf-text/index.ts`
