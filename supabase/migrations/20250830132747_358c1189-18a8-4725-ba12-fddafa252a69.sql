-- Security Fix: Restrict access to sensitive site settings
-- This fixes the critical vulnerability where business owner's phone number was publicly accessible

-- Drop the overly permissive policy that allows anyone to view all site settings
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

-- Create a secure policy that only allows public access to non-sensitive settings
CREATE POLICY "Public can view non-sensitive site settings" 
ON public.site_settings 
FOR SELECT 
USING (
  setting_key IN (
    'hero_image_url',
    'site_title', 
    'site_description',
    'business_hours',
    'address',
    'social_media_facebook',
    'social_media_instagram',
    'social_media_whatsapp_public'
  )
);

-- Create a policy for admins to view all settings (including sensitive ones)
CREATE POLICY "Admins can view all site settings" 
ON public.site_settings 
FOR SELECT 
USING (is_active_admin());

-- The existing "Admins can manage site settings" policy for ALL operations remains intact
-- This ensures admins can still create, update, and delete any settings

-- Create a secure function to get non-sensitive settings for public use
CREATE OR REPLACE FUNCTION public.get_public_site_setting(setting_key_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  setting_value text;
  allowed_keys text[] := ARRAY[
    'hero_image_url',
    'site_title', 
    'site_description',
    'business_hours',
    'address',
    'social_media_facebook',
    'social_media_instagram',
    'social_media_whatsapp_public'
  ];
BEGIN
  -- Check if the requested setting key is allowed for public access
  IF setting_key_param = ANY(allowed_keys) THEN
    SELECT site_settings.setting_value INTO setting_value
    FROM public.site_settings
    WHERE site_settings.setting_key = setting_key_param;
    
    RETURN setting_value;
  ELSE
    -- Log attempt to access sensitive data
    INSERT INTO public.security_audit_log (user_id, event_type, event_details, created_at)
    VALUES (auth.uid(), 'unauthorized_setting_access_attempt', 
           jsonb_build_object('requested_key', setting_key_param), 
           now());
    
    RETURN NULL;
  END IF;
END;
$$;