-- Fix the extension in public schema warning
-- Move pg_net extension from public to extensions schema

-- First create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move the pg_net extension to the extensions schema
ALTER EXTENSION pg_net SET SCHEMA extensions;