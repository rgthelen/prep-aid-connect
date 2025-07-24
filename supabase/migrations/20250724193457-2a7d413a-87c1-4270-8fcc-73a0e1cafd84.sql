-- Update the function to use the correct schema for pg_net
CREATE OR REPLACE FUNCTION public.handle_emergency_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  function_url text;
  payload jsonb;
  request_id bigint;
BEGIN
  -- Construct the edge function URL
  function_url := 'https://xlgbutxnfpkggwalxptj.supabase.co/functions/v1/update-emergency-status';
  
  -- Prepare the payload
  payload := jsonb_build_object(
    'emergency_id', COALESCE(NEW.id, OLD.id),
    'action', TG_OP
  );
  
  -- Make async HTTP request to edge function (fire and forget)
  SELECT extensions.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZ2J1dHhuZnBrZ2d3YWx4cHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNzU0MTIsImV4cCI6MjA2ODk1MTQxMn0.XzKd7dgbGLrp-aOHBA6OSRl63yu4WeGrE_AE7GsLpJs'
    ),
    body := payload
  ) INTO request_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;