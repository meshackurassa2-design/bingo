CREATE TABLE IF NOT EXISTS clickpesa_transactions (
  order_reference VARCHAR(20) PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Secure the table with RLS
ALTER TABLE clickpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Allow Edge Functions (service role) to insert and update
CREATE POLICY "Service role can manage clickpesa_transactions"
  ON clickpesa_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
