import { supabase } from './supabase';

export interface AIResult {
  title: string;
  summary: string;
  meeting_minutes: string;
  tasks: Array<{
    title: string;
    memo: string;
    due_date: string | null;
    due_time: string | null;
    assignee_name: string | null;
    priority: 'high' | 'medium' | 'low';
  }>;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

// ── Whisper STT ─────────────────────────────────────────────────────────────
export async function transcribeAudio(audioBlob: Blob, language: string = 'ko'): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No auth session found.');

  const formData = new FormData();
  const ext = audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a' : 'webm';
  formData.append('file', audioBlob, `audio.${ext}`);
  formData.append('model', 'whisper-1');
  if (language && language !== 'auto') {
    formData.append('language', language);
  }
  formData.append('temperature', '0');
  formData.append('condition_on_previous_text', 'false');

  // ⚠️ Content-Type 헤더를 직접 설정하지 않음 — 브라우저가 multipart boundary 자동 설정
  const res = await fetch(`${SUPABASE_URL}/functions/v1/proxy-openai`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'x-openai-path': '/v1/audio/transcriptions',
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper API failed (${res.status}): ${text}`);
  }

  const result = await res.json();
  if (!result.text) throw new Error('No text returned from Whisper');
  return result.text;
}

// ── GPT 분석 ─────────────────────────────────────────────────────────────────
export async function analyzeWithGPT(
  transcript: string,
  outputLang: 'ko' | 'en' = 'ko',
  meetingLang: string = outputLang,
): Promise<AIResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No auth session found.');

  const isEn = outputLang === 'en';
  const outputLangName = isEn ? 'English' : '한국어';
  const todayStr = new Date().toISOString().slice(0, 10);

  const crossLangNote = isEn
    ? `\n\nCRITICAL: Regardless of the transcript's language, write ALL output fields in ${outputLangName}.`
    : `\n\n중요: 녹취록 언어와 관계없이 모든 출력을 ${outputLangName}로 작성하세요.`;

  const prompt = isEn
    ? `Analyze the transcript and return ONLY valid JSON. No markdown fences.${crossLangNote}
Today: ${todayStr}
{
  "title": "One-line topic (max 60 chars, in ${outputLangName})",
  "summary": "3-4 sentence summary (in ${outputLangName})",
  "meeting_minutes": "Detailed markdown minutes with bullet points (in ${outputLangName})",
  "tasks": [{ "title": "Task title", "memo": "Details", "due_date": "YYYY-MM-DD or null", "due_time": "HH:MM or null", "assignee_name": "Name or null", "priority": "high|medium|low" }]
}
[TRANSCRIPT]
${transcript}`.trim()
    : `아래 녹취록을 분석해 JSON만 반환하세요. 마크다운 틱 금지.${crossLangNote}
오늘: ${todayStr}
{
  "title": "핵심 주제 한 줄 (20자 이내, ${outputLangName}로)",
  "summary": "3~4문장 요약 (${outputLangName}로)",
  "meeting_minutes": "상세 회의록 마크다운 (${outputLangName}로)",
  "tasks": [{ "title": "할 일 제목", "memo": "설명", "due_date": "YYYY-MM-DD 또는 null", "due_time": "HH:MM 또는 null", "assignee_name": "담당자명 또는 null", "priority": "high|medium|low" }]
}
[녹취록]
${transcript}`.trim();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/proxy-openai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'x-openai-path': '/v1/chat/completions',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `You are a professional meeting summarizer. Output exclusively in ${outputLangName}.` },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GPT analysis failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  let content = data.choices?.[0]?.message?.content || '{}';
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(content) as AIResult;
  } catch {
    throw new Error('Failed to parse GPT response as JSON.');
  }
}

// ── 오디오 업로드 ─────────────────────────────────────────────────────────────
export async function uploadAudio(userId: string, meetingId: string, audioBlob: Blob): Promise<string> {
  const ext = audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a' : 'webm';
  const storagePath = `${userId}/${meetingId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || `audio/${ext}`,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Audio upload failed: ${uploadError.message}`);
  }

  // 1년짜리 서명 URL 생성 (재생용)
  const { data: signed, error: signErr } = await supabase.storage
    .from('recordings')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  if (signErr || !signed?.signedUrl) {
    return storagePath; // fallback
  }

  return signed.signedUrl;
}

// ── DB 저장 (앱 meetingService와 동일한 로직) ─────────────────────────────────
export async function saveToSupabase(
  userId: string,
  meetingId: string,
  durationSec: number,
  transcript: string,
  audioUrl: string,
  ai: AIResult,
  options: {
    folderId?: string | null;
    mode?: string;
    roomCode?: string | null;
    language?: 'ko' | 'en';
  } = {}
): Promise<string> {
  const { folderId = null, mode = 'solo', roomCode = null, language = 'ko' } = options;

  const combinedSummary = JSON.stringify({
    short: ai.summary,
    minutes: ai.meeting_minutes,
  });

  const title = ai.title || (language === 'en' ? 'Meeting Recording' : '회의 녹음');

  const { data: rec, error: recErr } = await supabase
    .from('meeting_recordings')
    .upsert({
      id: meetingId,
      user_id: userId,
      title,
      mode,
      duration_sec: durationSec,
      transcript,
      summary: combinedSummary,
      audio_url: audioUrl,
      folder_id: folderId ?? null,
    }, { onConflict: 'id' })
    .select('id')
    .single();

  if (recErr) throw recErr;

  // 기존 tasks 삭제 후 재삽입 (retry 대응)
  await supabase.from('recording_tasks').delete().eq('recording_id', meetingId);

  // ── Team 모드: 참가자 이름 → user_id 매핑 ─────────────────────────────
  const participantMap = new Map<string, string>(); // displayName(lower) → user_id
  if (mode === 'team' && roomCode) {
    const { data: parts } = await supabase
      .from('meeting_room_participants')
      .select('user_id, display_name')
      .eq('room_id', roomCode);
    (parts ?? []).forEach((p: any) => {
      if (p.display_name && p.user_id) {
        participantMap.set(p.display_name.toLowerCase().trim(), p.user_id);
      }
    });
  }

  // ── Tasks 삽입 ─────────────────────────────────────────────────────────
  if (ai.tasks && ai.tasks.length > 0) {
    const taskRows = ai.tasks.map(t => {
      let dueTimeIso: string | null = null;
      if (t.due_date && t.due_time) {
        dueTimeIso = new Date(`${t.due_date}T${t.due_time}:00`).toISOString();
      }

      let assigneeIds: string[] = [];
      let memoText = t.memo ?? '';

      if (t.assignee_name) {
        const nameLower = t.assignee_name.toLowerCase().trim();
        const matchedUserId =
          participantMap.get(nameLower) ??
          [...participantMap.entries()].find(([k]) => k.includes(nameLower) || nameLower.includes(k))?.[1] ??
          null;

        if (matchedUserId) {
          assigneeIds = [matchedUserId];
        } else {
          const assigneeLabel = language === 'en' ? 'Assignee' : '담당';
          memoText = `[${assigneeLabel}: ${t.assignee_name}]\n${memoText}`.trim();
        }
      }

      return {
        recording_id: rec.id,
        user_id: userId,
        title: t.title,
        memo: memoText || null,
        due_date: t.due_date,
        due_time: dueTimeIso,
        priority: t.priority,
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : [],
        accepted: false,
        folder_id: folderId ?? null,
      };
    });

    const { error: taskErr } = await supabase.from('recording_tasks').insert(taskRows);
    if (taskErr) throw taskErr;
  }

  // ── Team 모드: 참가자 저장 + 폴더 공유 + 미팅 완료 처리 ──────────────
  if (mode === 'team' && roomCode) {
    const { data: roomParticipants } = await supabase
      .from('meeting_room_participants')
      .select('user_id, display_name, avatar_url, role')
      .eq('room_id', roomCode);

    if (roomParticipants && roomParticipants.length > 0) {
      // recording_participants 저장
      const participantRows = roomParticipants.map((p: any) => ({
        recording_id: rec.id,
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: p.role,
      }));
      await supabase.from('recording_participants').insert(participantRows).then(() => {});

      // 참가자에게 폴더 접근 권한 부여
      if (folderId) {
        for (const p of roomParticipants) {
          if (p.user_id !== userId) {
            const { data: existing } = await supabase
              .from('folder_members')
              .select('id')
              .eq('folder_id', folderId)
              .eq('user_id', p.user_id)
              .single();

            if (!existing) {
              await supabase.from('folder_members').insert({
                folder_id: folderId,
                user_id: p.user_id,
                role: 'editor',
                invited_by: userId,
                accepted_at: new Date().toISOString(),
              });
            }
          }
        }
      }

      // 모든 참가자에게 meeting_result 알림 발송
      const notifRows = roomParticipants
        .filter((p: any) => p.user_id !== userId)
        .map((p: any) => ({
          user_id: p.user_id,
          type: 'meeting_result',
          title: language === 'en' ? '✨ Meeting Analysis Complete' : '✨ 통화 AI 분석 완료',
          body: language === 'en'
            ? 'Your meeting has been transcribed and tasks have been extracted.'
            : '회의 내용이 기록되고 할 일이 추출되었습니다.',
          meeting_id: rec.id,
          is_read: false,
        }));
      if (notifRows.length > 0) {
        await supabase.from('notifications').insert(notifRows);
      }
    }

    // 미팅 상태 완료로 업데이트
    await supabase
      .from('meetings')
      .update({ status: 'done', ended_at: new Date().toISOString() })
      .eq('qr_code', roomCode);
  }

  return rec.id;
}

// ── QR Room 생성 (Team Meeting 호스트) ────────────────────────────────────────
export async function createMeetingRoom(
  userId: string,
  title: string,
  folderId?: string | null
): Promise<{ roomCode: string; meetingDbId: string }> {
  // 6자리 영숫자 코드 생성
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      user_id: userId,
      title,
      qr_code: roomCode,
      folder_id: folderId ?? null,
      status: 'waiting',
    })
    .select('id')
    .single();

  if (error) throw error;

  // 호스트를 참가자로 등록
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  await supabase.from('meeting_room_participants').insert({
    room_id: roomCode,
    user_id: userId,
    display_name: profile?.display_name ?? 'Host',
    avatar_url: profile?.avatar_url ?? null,
    role: 'host',
  });

  return { roomCode, meetingDbId: data.id };
}

// ── QR Room 참가 ─────────────────────────────────────────────────────────────
export async function joinMeetingRoom(
  userId: string,
  roomCode: string
): Promise<{ title: string; folderId: string | null; hostName: string }> {
  // 미팅 정보 조회
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select('id, title, folder_id, status')
    .eq('qr_code', roomCode.toUpperCase())
    .single();

  if (error || !meeting) throw new Error('Meeting room not found. Check the code and try again.');
  if (meeting.status === 'done') throw new Error('This meeting has already ended.');

  // 내 프로필 조회
  const { data: profile } = await supabase
    .from('users')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  // 이미 참가했는지 확인
  const { data: existing } = await supabase
    .from('meeting_room_participants')
    .select('id')
    .eq('room_id', roomCode.toUpperCase())
    .eq('user_id', userId)
    .single();

  if (!existing) {
    await supabase.from('meeting_room_participants').insert({
      room_id: roomCode.toUpperCase(),
      user_id: userId,
      display_name: profile?.display_name ?? 'Guest',
      avatar_url: profile?.avatar_url ?? null,
      role: 'participant',
    });
  }

  // 호스트 이름 조회
  const { data: hostPart } = await supabase
    .from('meeting_room_participants')
    .select('display_name')
    .eq('room_id', roomCode.toUpperCase())
    .eq('role', 'host')
    .single();

  return {
    title: meeting.title,
    folderId: meeting.folder_id,
    hostName: hostPart?.display_name ?? 'Host',
  };
}
