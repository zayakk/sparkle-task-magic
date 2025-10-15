-- Create app_role enum for user types
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Update profiles table to include class info
ALTER TABLE public.profiles ADD COLUMN class_name TEXT;
ALTER TABLE public.profiles ADD COLUMN display_name TEXT;

-- Update tasks table for teacher-student system
ALTER TABLE public.tasks ADD COLUMN assigned_by UUID REFERENCES auth.users(id);
ALTER TABLE public.tasks ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE public.tasks ADD COLUMN points_reward INTEGER DEFAULT 10;
ALTER TABLE public.tasks ADD COLUMN teacher_comment TEXT;

-- Create student_rewards table
CREATE TABLE public.student_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their rewards"
  ON public.student_rewards FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can create rewards"
  ON public.student_rewards FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  points_reward INTEGER DEFAULT 20,
  time_limit INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = true);

-- Create user_challenges table
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenges"
  ON public.user_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
  ON public.user_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges"
  ON public.user_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- Update RLS policies for tasks to support teacher-student
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;

CREATE POLICY "Students can view assigned tasks"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR
    auth.uid() = assigned_by
  );

CREATE POLICY "Students can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can create tasks for students"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = assigned_by);

-- Insert sample challenges in Mongolian
INSERT INTO public.challenges (title, description, type, difficulty, points_reward, time_limit) VALUES
  ('Математикийн сорилт', '10 асуулт дээр 5 минутад хариулах', 'math', 'easy', 20, 300),
  ('Түргэн бодох', '20 асуулт дээр 10 минутад хариулах', 'math', 'medium', 50, 600),
  ('Үгийн сорилт', 'Англи үгсийг орчуулах', 'vocabulary', 'easy', 15, 180),
  ('Дурсамж тоглоом', 'Картуудыг таньж олох', 'memory', 'medium', 30, 120),
  ('Хурдан хариу', 'Түргэн хариулах тоглоом', 'speed', 'hard', 75, 90);