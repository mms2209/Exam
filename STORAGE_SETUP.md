# Storage Bucket Setup Instructions

The exam papers system requires two storage buckets to be created in your Supabase project. Follow these steps to set them up:

## 1. Create Storage Buckets

Go to your Supabase Dashboard → Storage → Create a new bucket for each:

### Bucket 1: `exam-papers`
- **Name**: `exam-papers`
- **Public**: No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `application/pdf`

### Bucket 2: `marking-schemes`
- **Name**: `marking-schemes`
- **Public**: No (Private)
- **File size limit**: 10 MB
- **Allowed MIME types**: `application/pdf`

## 2. Configure Bucket Policies

For each bucket, you need to add policies to control access:

### For `exam-papers` bucket:

**Policy 1: Allow authenticated users to read files**
```sql
CREATE POLICY "Authenticated users can read exam papers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exam-papers');
```

**Policy 2: Allow admins to upload files**
```sql
CREATE POLICY "Admins can upload exam papers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-papers' AND
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  )
);
```

**Policy 3: Allow admins to delete files**
```sql
CREATE POLICY "Admins can delete exam papers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-papers' AND
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  )
);
```

### For `marking-schemes` bucket:

**Policy 1: Allow authenticated users to read files**
```sql
CREATE POLICY "Authenticated users can read marking schemes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marking-schemes');
```

**Policy 2: Allow admins to upload files**
```sql
CREATE POLICY "Admins can upload marking schemes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marking-schemes' AND
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  )
);
```

**Policy 3: Allow admins to delete files**
```sql
CREATE POLICY "Admins can delete marking schemes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marking-schemes' AND
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  )
);
```

## 3. Apply the Database Migration

Apply the migration file to create the required tables:

```bash
# In your Supabase Dashboard → SQL Editor
# Copy and paste the contents of:
# supabase/migrations/20251001130000_create_exam_papers_system.sql
```

Or use the Supabase CLI (if you have it installed):

```bash
supabase db push
```

## 4. Verify Setup

After completing the above steps, verify that:

1. ✅ Both storage buckets (`exam-papers` and `marking-schemes`) exist
2. ✅ Storage policies are applied to both buckets
3. ✅ Database tables are created (exam_subjects, exam_papers, student_paper_interactions, chat_sessions)
4. ✅ Row Level Security policies are active on all tables

## 5. Test the System

1. Log in as an admin user
2. Navigate to Admin → Exam Papers
3. Try uploading an exam paper with its marking scheme
4. Verify the upload succeeds and PDF extraction starts
5. As a student user, navigate to Exam Papers and open a paper
6. Test the AI tutor by asking questions about the exam paper

## Troubleshooting

### Issue: Upload fails with "Storage bucket not found"
- **Solution**: Make sure you created both buckets with the exact names: `exam-papers` and `marking-schemes`

### Issue: Upload fails with "Permission denied"
- **Solution**: Check that storage policies are applied and your user has admin role with exam_papers manage permission

### Issue: PDF extraction fails
- **Solution**: Check the Edge Function logs in Supabase Dashboard → Edge Functions → extract-pdf-text

### Issue: AI doesn't reference the exam paper content
- **Solution**: Wait for PDF extraction to complete (check extraction status in admin panel), then try asking again
