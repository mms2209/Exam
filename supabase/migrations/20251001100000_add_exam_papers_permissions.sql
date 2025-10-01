/*
  # Add Exam Papers Permissions

  1. New Permissions
    - exam_papers/view - Permission to view and access exam papers (for students)
    - exam_papers/manage - Permission to upload, edit, and delete exam papers (for admins)

  2. Permission Assignment
    - Admin role: Gets both view and manage permissions automatically
    - Member role: Gets view permission for accessing exam papers
    - Viewer role: Gets view permission for read-only access

  3. Security
    - Ensures RBAC system properly controls access to exam paper features
    - Allows granular control over who can view vs manage exam papers
*/

-- Insert exam_papers permissions
INSERT INTO permissions (resource, action, description) VALUES
  ('exam_papers', 'view', 'View and access exam papers'),
  ('exam_papers', 'manage', 'Upload, edit, and delete exam papers')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to roles
DO $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
  viewer_role_id uuid;
  view_permission_id uuid;
  manage_permission_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer';

  -- Get permission IDs
  SELECT id INTO view_permission_id FROM permissions WHERE resource = 'exam_papers' AND action = 'view';
  SELECT id INTO manage_permission_id FROM permissions WHERE resource = 'exam_papers' AND action = 'manage';

  -- Assign both permissions to admin role
  IF admin_role_id IS NOT NULL AND view_permission_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (admin_role_id, view_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF admin_role_id IS NOT NULL AND manage_permission_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (admin_role_id, manage_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Assign view permission to member role
  IF member_role_id IS NOT NULL AND view_permission_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (member_role_id, view_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Assign view permission to viewer role
  IF viewer_role_id IS NOT NULL AND view_permission_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (viewer_role_id, view_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
