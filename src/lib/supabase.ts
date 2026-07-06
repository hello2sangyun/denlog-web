import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// createClient는 빈 문자열을 받으면 빌드 타임에 크래시하므로 placeholder 사용
export const supabase = createClient(supabaseUrl, supabaseKey);
