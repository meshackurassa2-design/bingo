CREATE TABLE IF NOT EXISTS movie_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE movie_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own requests" ON movie_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view requests" ON movie_requests
  FOR SELECT USING (true);
