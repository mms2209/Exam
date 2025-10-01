# Student AI Management System

A comprehensive full-stack web application for Islamic finance operations with role-based access control, user management, and administrative features.

## Features

- **Authentication & Authorization**: Secure login with email/password using Supabase Auth
- **Role-Based Access Control**: Admin, Member, and Viewer roles with granular permissions
- **User Management**: Complete CRUD operations for user accounts via admin panel
- **Exam Papers Management**: Upload, view, and manage exam papers with marking schemes
- **AI-Powered Tutor**: Interactive AI chatbot for exam question assistance using Google Gemini
- **Dashboard Analytics**: Role-specific dashboards with relevant metrics and quick actions
- **Edge Functions**: Server-side API endpoints for secure admin operations
- **Responsive Design**: Modern, professional UI optimized for desktop and tablet use

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + PostgreSQL + Edge Functions)
- **State Management**: React Context API
- **Routing**: React Router DOM
- **Icons**: Lucide React

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. Supabase account and project

### Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your Supabase project details:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

3. **Set up Supabase Database**:

   a. **Apply Database Migrations**:
      - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
      - Select your project
      - Navigate to **SQL Editor**
      - Copy and paste the contents of each migration file from `supabase/migrations/` in order:
        1. `20250813174450_damp_paper.sql`
        2. `20250813175658_icy_smoke.sql`
        3. `20250814113503_raspy_mouse.sql`
        4. `20250826100303_Policies.sql`
        5. `20250828140302_misty_meadow.sql`
        6. `20250828162140_red_manor.sql`
        7. `20250901082033_teal_snowflake.sql`
        8. `20251001075316_fix_is_admin_function_for_user_roles.sql`
        9. `20251001075353_create_admin_user_account.sql`
        10. `20251001100000_add_exam_papers_permissions.sql`
        11. `20251001120000_add_pdf_text_extraction_columns.sql`
        12. `20251001130000_create_exam_papers_system.sql` (NEW - Creates exam tables)
      - Execute each migration in order

   b. **Create Storage Buckets**:
      - Navigate to **Storage** in your Supabase Dashboard
      - Create two buckets:
        - `exam-papers` (Private, 10MB limit, PDF only)
        - `marking-schemes` (Private, 10MB limit, PDF only)
      - Apply storage policies (see `STORAGE_SETUP.md` for detailed instructions)

   c. **Verify Setup**:
      - Confirm all tables exist in the Database → Tables view
      - Verify storage buckets are created
      - Check that RLS policies are enabled on all tables

4. **Configure AI Tutor (Required for Exam Chat Feature)**:

   To enable the AI-powered exam tutor, you need to configure the Google Gemini API key:

   a. **Get a Gemini API Key**:
      - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
      - Sign in with your Google account
      - Click "Create API Key" or "Get API Key"
      - Copy your API key

   b. **Add the API Key to Supabase**:
      - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
      - Select your project
      - Navigate to **Project Settings** → **Edge Functions** → **Secrets**
      - Click "Add Secret"
      - Name: `GEMINI_API_KEY`
      - Value: Paste your Gemini API key
      - Click "Save"

   c. **Verify the Configuration**:
      - The AI tutor will now be functional in the Exam Paper Viewer
      - If the API key is missing, users will see a friendly error message

   **Note**: The Gemini API has a generous free tier. For production use, monitor your usage in the Google AI Studio dashboard.

5. **Create test users** (optional):
   You can create test users through the admin panel or directly in Supabase:
   - Admin user: `admin@example.com` / `password123`
   - Member user: `member@example.com` / `password123`

6. **Start development server**:
   ```bash
   npm run dev
   ```


## User Roles & Permissions

### Admin
- Full system access
- User management (create, read, update, delete)
- Access to admin dashboard
- All report and transaction permissions

### Member
- Dashboard access
- View reports
- Create transactions
- Limited system access

### Viewer
- Dashboard access (read-only)
- View reports only
- No transaction or admin capabilities

## Key Features

### Authentication Flow
- Secure login with email/password
- Role-based redirects (Admin → `/admin/dashboard`, Others → `/dashboard`)
- Session management with automatic refresh
- Protected routes with permission checks

### Role-Based Access Control
Helper functions for permission checking:
- `hasPermission(user, resource, action)`
- `hasMenuAccess(user, menuId)`
- `hasSubMenuAccess(user, menuId, subMenuId)`
- `hasComponentAccess(user, componentId)`

### Admin User Management
- Complete user CRUD operations
- Role assignment and modification
- Account activation/deactivation
- Secure API calls via Edge Functions

### Security Features
- Row Level Security (RLS) enabled on all tables
- Service role key secured in Edge Functions
- Authorization header validation
- Admin-only operations protected

## Database Schema

### Authentication & Authorization Tables
- `users`: User profiles with roles and permissions
- `roles`: System roles (admin, member, viewer)
- `permissions`: Granular permissions system
- `role_permissions`: Role-permission relationships
- `user_roles`: User-role assignments

### Exam Papers Tables
- `exam_subjects`: Subject definitions (Mathematics, Physics, etc.)
- `exam_papers`: Exam paper metadata, file URLs, and extracted text
- `student_paper_interactions`: Tracks which students access which papers
- `chat_sessions`: Stores AI chat history for each student per paper

### Key Features
- Automatic timestamp updates
- UUID primary keys
- Foreign key constraints with CASCADE deletes
- Comprehensive RLS policies on all tables
- Optimized indexes for query performance
- JSONB storage for flexible chat message data

## API Endpoints

### Edge Functions

**Admin Management**:
- `POST /functions/v1/admin-users`: Create user
- `GET /functions/v1/admin-users`: List users
- `PUT /functions/v1/admin-users/{id}`: Update user
- `DELETE /functions/v1/admin-users/{id}`: Delete user
- `GET /functions/v1/admin-roles`: List roles
- `POST /functions/v1/admin-roles`: Create role
- `PUT /functions/v1/admin-roles/{id}`: Update role
- `DELETE /functions/v1/admin-roles/{id}`: Delete role
- `GET /functions/v1/admin-permissions`: List permissions
- `POST /functions/v1/admin-permissions`: Create permission
- `PUT /functions/v1/admin-permissions/{id}`: Update permission
- `DELETE /functions/v1/admin-permissions/{id}`: Delete permission

**Authentication**:
- `POST /functions/v1/update-password`: Update user password
- `POST /functions/v1/validate-password`: Validate password strength

**AI & Exam Features**:
- `POST /functions/v1/exam-chat-ai`: AI-powered exam tutor chatbot
  - Requires `GEMINI_API_KEY` to be configured in Supabase secrets
  - Automatically detects question numbers (e.g., "question 1", "Q5")
  - Extracts specific questions and marking schemes from uploaded PDFs
  - Returns structured responses with explanations, examples, and solutions
  - References marking scheme to provide guidance on getting full marks
  - Handles errors gracefully with user-friendly messages

- `POST /functions/v1/extract-pdf-text`: PDF text extraction service
  - Automatically triggered when exam papers are uploaded
  - Extracts text from both exam paper and marking scheme PDFs
  - Updates extraction status (pending → processing → completed/failed)
  - Stores extracted text in database for AI to access

All endpoints require proper authorization and include comprehensive error handling.

## How the AI Tutor Works

### Upload Process
1. Admin uploads an exam paper PDF and marking scheme PDF
2. Files are stored in Supabase storage buckets
3. `extract-pdf-text` edge function is automatically triggered
4. Text is extracted from both PDFs using pdf-parse library
5. Extracted text is stored in the database with status tracking

### Student Interaction
1. Student navigates to an exam paper
2. Student asks a question (e.g., "Explain question 5")
3. System detects the question number from the query
4. Specific question text is extracted from the exam paper
5. Corresponding marking scheme section is extracted
6. AI receives focused content: the specific question + marking scheme
7. AI generates structured response:
   - **Explanation**: What the question asks and key concepts
   - **Examples**: 2-3 concrete examples demonstrating the concepts
   - **How to Get Full Marks**: Specific marking points from scheme
   - **Solution**: Complete model answer aligned with marking criteria

### Question Detection
The AI automatically recognizes various question formats:
- "question 1", "question 5a"
- "Q1", "Q.5", "q3"
- "1)", "5a)", "3."
- Standalone numbers at start: "1 explain", "5 solve"

## Development

### File Structure
- `src/components/`: Reusable UI components
- `src/contexts/`: React contexts (Auth)
- `src/pages/`: Route components
- `src/types/`: TypeScript type definitions
- `src/utils/`: Helper functions and API clients
- `src/lib/`: External service configurations
- `supabase/migrations/`: Database migrations
- `supabase/functions/`: Edge Functions

### Best Practices
- TypeScript for type safety
- Modular component architecture
- Consistent error handling
- Responsive design patterns
- Security-first approach

## Deployment

The application is ready for deployment to any modern hosting platform. Ensure environment variables are properly configured in your deployment environment.

## Contributing

1. Follow the existing code style and patterns
2. Maintain TypeScript strict mode compliance
3. Add proper error handling for new features
4. Update tests for any new functionality
5. Follow the established file organization structure

## License

This project is proprietary software for Islamic finance operations.