/*
  # Create Admin User Account

  ## Problem
  No users exist in the database, preventing admin login.

  ## Solution
  1. Create admin user in Supabase Auth
  2. Create corresponding record in users table
  3. Link user to admin role via user_roles table

  ## Changes
  - Creates admin@example.com user account
  - Password: password123
  - Links to admin role
  - Sets as active user

  ## Security
  - User created with active status
  - Proper role assignment via user_roles
  - Email/password authentication enabled
*/

-- First, create the admin user in auth.users (if not exists)
-- Note: We need to use the auth schema extension
DO $$
DECLARE
  admin_user_id uuid;
  admin_role_id uuid;
  user_exists boolean;
BEGIN
  -- Get the admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role does not exist';
  END IF;

  -- Check if user already exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@example.com') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Create user in auth.users with a known UUID
    admin_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_new,
      recovery_token
    ) VALUES (
      admin_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"System Administrator"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      ''
    );
  ELSE
    -- Get existing user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@example.com';
  END IF;

  -- Create or update user in public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    is_active,
    menu_access,
    sub_menu_access,
    component_access
  ) VALUES (
    admin_user_id,
    'admin@example.com',
    'System Administrator',
    true,
    '["dashboard", "users", "roles", "permissions", "admin", "reports", "settings"]'::jsonb,
    '{"users": ["manage"], "roles": ["manage"], "permissions": ["manage"]}'::jsonb,
    '["user-management", "role-management", "permission-management", "admin-panel"]'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active,
    menu_access = EXCLUDED.menu_access,
    sub_menu_access = EXCLUDED.sub_menu_access,
    component_access = EXCLUDED.component_access;

  -- Assign admin role to user in user_roles table
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (admin_user_id, admin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'Admin user created/updated successfully with ID: %', admin_user_id;
END $$;
