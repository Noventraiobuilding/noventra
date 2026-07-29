-- NOVENTRA Supabase Setup
-- Bu faylı Supabase SQL Editor-ə yapışdırıb Run edin.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Mövcud cədvəllər üçün əvvəlki siyasətlər qorunur
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for all" ON profiles;
CREATE POLICY "Allow read for all" ON profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON profiles;
CREATE POLICY "Allow insert for authenticated" ON profiles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow update own profile" ON profiles;
CREATE POLICY "Allow update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

UPDATE profiles
SET referral_code = 'NV' || SUBSTR(MD5(RANDOM()::text), 1, 6)
WHERE referral_code IS NULL;

DROP POLICY IF EXISTS "Allow read earnings" ON earnings;
CREATE POLICY "Allow read earnings" ON earnings
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow insert earnings" ON earnings;
CREATE POLICY "Allow insert earnings" ON earnings
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow read investments" ON investments;
CREATE POLICY "Allow read investments" ON investments
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow insert investments" ON investments;
CREATE POLICY "Allow insert investments" ON investments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admin update investments" ON investments;
CREATE POLICY "Allow admin update investments" ON investments
FOR UPDATE USING (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Allow read tasks" ON tasks;
CREATE POLICY "Allow read tasks" ON tasks
FOR SELECT USING (true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'investments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investments' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE investments ADD COLUMN receipt_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investments' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE investments ALTER COLUMN receipt_url DROP NOT NULL;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow authenticated upload receipts" ON storage.objects;
CREATE POLICY "Allow authenticated upload receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public read receipts" ON storage.objects;
CREATE POLICY "Allow public read receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts');

-- Yeni VIP paketi cədvəli
CREATE TABLE IF NOT EXISTS vip_packages (
  level INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  days_valid INT NOT NULL,
  daily_earnings DECIMAL(12,2) NOT NULL
);

ALTER TABLE vip_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VIP packages read for all" ON vip_packages;
CREATE POLICY "VIP packages read for all" ON vip_packages
FOR SELECT USING (true);

DROP POLICY IF EXISTS "VIP packages admin write" ON vip_packages;
CREATE POLICY "VIP packages admin write" ON vip_packages
FOR ALL USING (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

INSERT INTO vip_packages (level, name, price, days_valid, daily_earnings)
VALUES
  (1, 'VIP 1', 25.00, 45, 1.50),
  (2, 'VIP 2', 35.00, 50, 2.30),
  (3, 'VIP 3', 50.00, 60, 3.58),
  (4, 'VIP 4', 150.00, 70, 12.00),
  (5, 'VIP 5', 420.00, 80, 22.00),
  (6, 'VIP 6', 740.00, 90, 31.50),
  (7, 'VIP 7', 1380.00, 100, 68.00),
  (8, 'VIP 8', 2550.00, 120, 116.50),
  (9, 'VIP 9', 4760.00, 150, 259.00),
  (10, 'VIP 10', 8250.00, 180, 710.00),
  (11, 'VIP 11', 12800.00, 200, 1870.00)
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  days_valid = EXCLUDED.days_valid,
  daily_earnings = EXCLUDED.daily_earnings;

CREATE TABLE IF NOT EXISTS user_vips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vip_level INT NOT NULL REFERENCES vip_packages(level),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'rejected')),
  receipt_url VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vips_user_status ON user_vips(user_id, status);
ALTER TABLE user_vips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User VIP select own or admin" ON user_vips;
CREATE POLICY "User VIP select own or admin" ON user_vips
FOR SELECT USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "User VIP insert own or admin" ON user_vips;
CREATE POLICY "User VIP insert own or admin" ON user_vips
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "User VIP admin update" ON user_vips;
CREATE POLICY "User VIP admin update" ON user_vips
FOR UPDATE USING (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day INT NOT NULL CHECK (day BETWEEN 1 AND 22),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_missions_user_day ON missions(user_id, day);
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Missions select own or admin" ON missions;
CREATE POLICY "Missions select own or admin" ON missions
FOR SELECT USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Missions insert own or admin" ON missions;
CREATE POLICY "Missions insert own or admin" ON missions
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Missions update own or admin" ON missions;
CREATE POLICY "Missions update own or admin" ON missions
FOR UPDATE USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

CREATE TABLE IF NOT EXISTS leadership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level BETWEEN 1 AND 6),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leadership_requests_user_status ON leadership_requests(user_id, status);
ALTER TABLE leadership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership select own or admin" ON leadership_requests;
CREATE POLICY "Leadership select own or admin" ON leadership_requests
FOR SELECT USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Leadership insert own or admin" ON leadership_requests;
CREATE POLICY "Leadership insert own or admin" ON leadership_requests
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Leadership admin update" ON leadership_requests;
CREATE POLICY "Leadership admin update" ON leadership_requests
FOR UPDATE USING (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications select own or admin" ON notifications;
CREATE POLICY "Notifications select own or admin" ON notifications
FOR SELECT USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Notifications insert own or admin" ON notifications;
CREATE POLICY "Notifications insert own or admin" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Notifications update own or admin" ON notifications;
CREATE POLICY "Notifications update own or admin" ON notifications
FOR UPDATE USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs select own or admin" ON audit_logs;
CREATE POLICY "Audit logs select own or admin" ON audit_logs
FOR SELECT USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Audit logs insert own or admin" ON audit_logs;
CREATE POLICY "Audit logs insert own or admin" ON audit_logs
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_presence_seen ON user_presence(last_seen DESC);
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presence select own or admin" ON user_presence;
CREATE POLICY "Presence select own or admin" ON user_presence
FOR SELECT USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Presence insert own or admin" ON user_presence;
CREATE POLICY "Presence insert own or admin" ON user_presence
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

DROP POLICY IF EXISTS "Presence update own or admin" ON user_presence;
CREATE POLICY "Presence update own or admin" ON user_presence
FOR UPDATE USING (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  auth.uid() = user_id
  OR lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);
