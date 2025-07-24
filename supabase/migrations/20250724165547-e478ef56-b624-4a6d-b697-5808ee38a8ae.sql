-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  country TEXT DEFAULT 'United States',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PEPRs (Personal Emergency Preparedness Records) table
CREATE TABLE public.peprs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  country TEXT DEFAULT 'United States',
  special_needs TEXT,
  medications TEXT,
  pets TEXT,
  emergency_contacts TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PEPR members table (family, roommates, etc.)
CREATE TABLE public.pepr_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pepr_id UUID NOT NULL REFERENCES public.peprs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  relationship TEXT,
  special_needs TEXT,
  medications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergencies table
CREATE TABLE public.emergencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declared_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  emergency_type TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  radius_miles INTEGER NOT NULL DEFAULT 10,
  state TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user emergency status table
CREATE TABLE public.user_emergency_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('safe', 'needs_help', 'at_home', 'evacuated', 'unknown')),
  location TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, emergency_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peprs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pepr_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emergency_status ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create policies for PEPRs
CREATE POLICY "Users can view their own PEPRs" ON public.peprs
  FOR SELECT USING (
    owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own PEPRs" ON public.peprs
  FOR INSERT WITH CHECK (
    owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own PEPRs" ON public.peprs
  FOR UPDATE USING (
    owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all PEPRs" ON public.peprs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create policies for PEPR members
CREATE POLICY "Users can manage their PEPR members" ON public.pepr_members
  FOR ALL USING (
    pepr_id IN (
      SELECT id FROM public.peprs 
      WHERE owner_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create policies for emergencies
CREATE POLICY "Everyone can view active emergencies" ON public.emergencies
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage emergencies" ON public.emergencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create policies for user emergency status
CREATE POLICY "Users can manage their own emergency status" ON public.user_emergency_status
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all emergency statuses" ON public.user_emergency_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_peprs_updated_at
  BEFORE UPDATE ON public.peprs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergencies_updated_at
  BEFORE UPDATE ON public.emergencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_emergency_status_updated_at
  BEFORE UPDATE ON public.user_emergency_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();