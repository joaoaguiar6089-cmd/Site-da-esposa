-- Remove the problematic policy that causes infinite recursion
DROP POLICY "Authenticated can view basic professional info" ON public.professionals;

-- The "Unauthenticated can view basic professional info" with qual:true already covers this case
-- and the "Clients can view professionals for their appointments" covers authenticated users with specific access