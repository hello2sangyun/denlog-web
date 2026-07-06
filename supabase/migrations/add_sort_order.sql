-- Migration: add sort_order column for drag-and-drop reordering
-- Run this in Supabase SQL Editor

-- 1) todos 테이블에 sort_order 추가 (이미 있으면 무시)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

-- 2) folders 테이블에 sort_order 추가
ALTER TABLE folders ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT NULL;

-- 3) 기존 할일에 초기 순서 부여 (created_at 역순)
UPDATE todos t
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS rn
  FROM todos
) sub
WHERE t.id = sub.id AND t.sort_order IS NULL;

-- 4) 기존 폴더에 초기 순서 부여 (created_at 순)
UPDATE folders f
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) - 1 AS rn
  FROM folders
) sub
WHERE f.id = sub.id AND f.sort_order IS NULL;

-- 5) 인덱스 (선택사항, 성능 향상)
CREATE INDEX IF NOT EXISTS idx_todos_sort_order ON todos(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON folders(owner_id, sort_order);
