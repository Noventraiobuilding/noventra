-- NOVENTRA Supabase Setup
-- Bu kodları Supabase SQL Editor-ə yapışdırıb Run edin

-- 1. Profiles cədvəli üçün RLS Policies əlavə et
CREATE POLICY "Allow read for all" ON profiles
FOR SELECT USING (true);

-- 2. Authenticated istifadəçilər profil yarada bilərlər
CREATE POLICY "Allow insert for authenticated" ON profiles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. İstifadəçilər öz profilini yeniləyə bilərlər
CREATE POLICY "Allow update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Mövcud NULL referral_code-ları doldur
UPDATE profiles 
SET referral_code = 'NV' || SUBSTR(MD5(RANDOM()::text), 1, 6)
WHERE referral_code IS NULL;

-- 5. Earnings cədvəli üçün RLS Policies
CREATE POLICY "Allow read earnings" ON earnings
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Allow insert earnings" ON earnings
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Investments cədvəli üçün RLS Policies
CREATE POLICY "Allow read investments" ON investments
FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

CREATE POLICY "Allow insert investments" ON investments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 7. Admin investments-i yeniləyə bilsin (approve/reject üçün)
CREATE POLICY "Allow admin update investments" ON investments
FOR UPDATE USING (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
) WITH CHECK (
  lower((auth.jwt() ->> 'email')::text) = lower('Ayazdiana666@gmail.com')
);

-- 8. Tasks cədvəli üçün RLS Policies (hamı oxuya bilsin)
CREATE POLICY "Allow read tasks" ON tasks
FOR SELECT USING (true);

-- 9. receipt_url sütununu nullable et (mövcud NOT NULL constraint varsa)
ALTER TABLE investments ALTER COLUMN receipt_url DROP NOT NULL;

-- 10. Əgər receipt_url sütunu yoxdursa əlavə et (idempotent – xəta verməz)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investments' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE investments ADD COLUMN receipt_url TEXT;
  END IF;
END $$;

-- 11. Receipts storage bucket yarat (çek şəkillərini saxlamaq üçün)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 12. Storage bucket üçün RLS Policies
CREATE POLICY "Allow authenticated upload receipts" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public read receipts" ON storage.objects
FOR SELECT USING (bucket_id = 'receipts');

