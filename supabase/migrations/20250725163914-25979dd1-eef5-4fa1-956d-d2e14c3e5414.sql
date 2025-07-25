-- Add disaster-specific prompting field to emergencies table
ALTER TABLE public.emergencies 
ADD COLUMN disaster_prompts TEXT;

-- Add a comment to document the purpose
COMMENT ON COLUMN public.emergencies.disaster_prompts IS 'Disaster-specific prompts and information to be fed to the Emergency Agent during active emergencies';