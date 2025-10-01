/*
  # Fix is_admin() function to work with user_roles table

  ## Problem
  The is_admin() function was referencing users.role_id which was removed
  when the schema migrated to support multiple roles per user via the 
  user_roles junction table.

  ## Solution
  Update the is_admin() function to check the user_roles table instead
  of the old users.role_id column.

  ## Changes
  1. Replace is_admin() function with correct logic using CREATE OR REPLACE
  2. Function now joins users -> user_roles -> roles
  3. Maintains SECURITY DEFINER for RLS bypass
  4. Checks if user has ANY role named 'admin'

  ## Security
  - Function remains SECURITY DEFINER to bypass RLS
  - Still checks authenticated user's role membership
  - No data exposure risk as it only returns boolean
*/

-- Replace the function with updated logic (no drop needed with CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.user_roles ur ON u.id = ur.user_id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE u.id = uid
      AND r.name = 'admin'
      AND u.is_active = true
  );
$$;

-- Ensure the function has proper ownership
ALTER FUNCTION public.is_admin(uuid) OWNER TO postgres;
