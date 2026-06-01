-- user_integrations 테이블 생성
-- 각 사용자의 통합 서비스 연결 상태를 저장
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- 'gmail', 'slack', 'notion', 'call_recording', 'android_notifications'
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,  -- 추가 데이터 (access_token 등)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- RLS 활성화
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- 자신의 통합 데이터만 읽기/쓰기 허용
CREATE POLICY "Users can view own integrations"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
