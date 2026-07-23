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

-- 7. Tasks cədvəli üçün RLS Policies (hamı oxuya bilsin)
CREATE POLICY "Allow read tasks" ON tasks
FOR SELECT USING (true);
