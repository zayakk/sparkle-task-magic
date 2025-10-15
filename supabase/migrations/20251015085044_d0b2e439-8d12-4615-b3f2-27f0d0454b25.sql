-- Allow users to set their own role during signup
CREATE POLICY "Users can set their own role on signup"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);