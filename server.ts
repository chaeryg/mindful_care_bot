import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini API
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({ apiKey });
};

// In-memory store for Mood Diary and Calendar Events
interface MoodRecord {
  id: string;
  timestamp: string;
  dateFormatted: string;
  userMessage: string;
  botReply: string;
  emotionKeyword: string;
  stressLevel: number;
  recommendedAction: string;
  syncedToCalendar: boolean;
  syncedToSheets: boolean;
  calendarEventTitle?: string;
  calendarTimeSlot?: string;
  isCrisis?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  category: 'work' | 'personal' | 'care';
  stressTrigger?: number;
  description?: string;
}

const initialCalendarEvents: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: '팀 주간 동향 회의',
    start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    category: 'work'
  },
  {
    id: 'evt-2',
    title: '프로젝트 중간 점검 보고',
    start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(15, 30, 0, 0)).toISOString(),
    category: 'work'
  },
  {
    id: 'evt-3',
    title: '동료와 저녁 식사',
    start: new Date(new Date().setHours(18, 30, 0, 0)).toISOString(),
    end: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    category: 'personal'
  }
];

let moodRecords: MoodRecord[] = [
  {
    id: 'record-1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    dateFormatted: new Date(Date.now() - 86400000 * 2).toLocaleString('ko-KR'),
    userMessage: '업무량이 너무 많아서 하루종일 마음이 지치고 머리가 아팠어요.',
    botReply: '오늘 정말 고생 많으셨어요. 차근차근 해내고 계시니 너무 조급해하지 마시고 따뜻한 차 한 잔 마시며 휴식을 취해보세요.',
    emotionKeyword: '피로',
    stressLevel: 7,
    recommendedAction: '20분 따뜻한 차 마시기 & 스트레칭',
    syncedToCalendar: true,
    syncedToSheets: true,
    calendarEventTitle: '🌿 [리프레시] 20분 따뜻한 차 마시기 & 스트레칭',
    calendarTimeSlot: '16:00 - 16:20'
  },
  {
    id: 'record-2',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    dateFormatted: new Date(Date.now() - 86400000).toLocaleString('ko-KR'),
    userMessage: '친구와 오랜만에 만나 대화하며 마음이 많이 가벼워졌습니다.',
    botReply: '좋은 사람과의 대화는 마음에 큰 활력이 되지요. 오늘의 기분 좋은 평온함을 잘 간직하시길 바라요.',
    emotionKeyword: '평온',
    stressLevel: 3,
    recommendedAction: '15분 가벼운 밤 산책',
    syncedToCalendar: false,
    syncedToSheets: true
  }
];

let calendarEvents: CalendarEvent[] = [...initialCalendarEvents];

// System Prompt definition following PRD instructions
const SYSTEM_INSTRUCTIONS = `
역할 (Role)
당신은 사용자의 마음을 어루만져 주는 따뜻한 심리 상담가이자, 감정 상태를 객관적으로 분석하여 기록하는 'AI 데일리 심리 케어 챗봇(Mindful Care Bot)'입니다.

핵심 임무 (Core Objectives)
1. 사용자가 입력한 일상이나 고민에 대해 깊이 공감하고 따뜻한 위로를 제공합니다.
2. 대화 내용을 바탕으로 사용자의 현재 '핵심 감정 키워드'와 '스트레스 지수(1~10)'를 정량적으로 분석합니다.
3. 분석된 상태에 맞춰 일상에서 실천할 수 있는 15분~30분 내외의 '추천 케어 행동(예: 명상, 산책, 심호흡 등)'을 제안합니다.
4. 구글 시트 및 캘린더 자동화 시스템(Apps Script)이 데이터를 쉽게 읽어갈 수 있도록, 반드시 정해진 출력 형식을 엄격하게 준수합니다.

제약 및 예외 처리 사항 (Constraints & Exception Handling)
- [중요] 사용자가 자해, 극단적 선택 등 심각한 우울감이나 위기 상황을 암시하는 단어를 사용할 경우, 즉시 정량적 분석을 중단하고 다음 문구를 출력하세요: 
  "지금 많이 힘드신 상태인 것 같아요. 혼자 견디기 버거울 때는 언제든 도움을 받을 수 있습니다. 자살예방 상담전화 1393 또는 정신건강 위기상담전화 1577-0199로 꼭 연락해 보세요. 당신은 소중한 사람입니다."
- 대화문은 전문 용어보다는 친구처럼 편안하고 다정한 어투(해요체)를 사용합니다.

출력 형식 (Output Format)
당신의 답변은 반드시 아래와 같이 [대화문]과 [데이터 요약] 두 가지 섹션으로 명확히 분리되어야 합니다. [데이터 요약] 섹션은 Apps Script가 정규표현식이나 JSON 파싱으로 데이터를 추출할 수 있도록 마크다운 JSON 포맷을 유지해야 합니다.

[대화문]
(사용자의 상황에 대한 공감과 위로, 추천 케어 행동에 대한 따뜻한 제안을 3~4문장으로 작성하세요.)

[데이터 요약]
\`\`\`json
{
  "emotion_keyword": "대화에서 추출한 핵심 감정 1개 (예: 무기력, 불안, 분노, 평온, 피로, 번아웃)",
  "stress_level": "1부터 10까지의 정수 (10이 가장 높은 스트레스)",
  "recommended_action": "구글 캘린더 일정명으로 쓰기 적합한 짧은 행동 지침 (예: 15분 심호흡, 가벼운 동네 산책, 20분 명상)"
}
\`\`\`
`;

// Helper: Conflict-checking algorithm for demo calendar
function findNextFreeSlot(events: CalendarEvent[], baseDate: Date, durationMinutes: number) {
  let searchStart = new Date(baseDate);
  searchStart.setMinutes(searchStart.getMinutes() + 15);
  
  if (searchStart.getHours() < 9) {
    searchStart.setHours(9, 0, 0, 0);
  }

  const searchEnd = new Date(baseDate);
  searchEnd.setHours(21, 0, 0, 0);

  if (searchStart >= searchEnd) {
    searchStart = new Date(baseDate.getTime() + 86400000);
    searchStart.setHours(9, 0, 0, 0);
    searchEnd.setTime(searchStart.getTime());
    searchEnd.setHours(21, 0, 0, 0);
  }

  let currentAttempt = new Date(searchStart);

  while (currentAttempt.getTime() + durationMinutes * 60 * 1000 <= searchEnd.getTime()) {
    const slotStart = new Date(currentAttempt);
    const slotEnd = new Date(currentAttempt.getTime() + durationMinutes * 60 * 1000);

    const hasConflict = events.some(evt => {
      const evtStart = new Date(evt.start);
      const evtEnd = new Date(evt.end);
      return slotStart < evtEnd && slotEnd > evtStart;
    });

    if (!hasConflict) {
      return { start: slotStart, end: slotEnd };
    }

    currentAttempt = new Date(currentAttempt.getTime() + 30 * 60 * 1000);
  }

  return null;
}

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const crisisKeywords = ['자해', '죽고 싶', '자살', '극단적', '살기 싫', '삶을 끝내'];
    const containsCrisis = crisisKeywords.some(kw => message.includes(kw));

    if (containsCrisis) {
      const crisisText = "지금 많이 힘드신 상태인 것 같아요. 혼자 견디기 버거울 때는 언제든 도움을 받을 수 있습니다. 자살예방 상담전화 1393 또는 정신건강 위기상담전화 1577-0199로 꼭 연락해 보세요. 당신은 소중한 사람입니다.";
      const newRecord: MoodRecord = {
        id: `rec-${Date.now()}`,
        timestamp: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString('ko-KR'),
        userMessage: message,
        botReply: crisisText,
        emotionKeyword: '위기상황',
        stressLevel: 10,
        recommendedAction: '전문상담기관 1393/1577-0199 상담 받기',
        syncedToCalendar: false,
        syncedToSheets: true,
        isCrisis: true
      };
      moodRecords.unshift(newRecord);

      return res.json({
        replyText: crisisText,
        emotionKeyword: '위기상황',
        stressLevel: 10,
        recommendedAction: '전문상담기관 1393/1577-0199 상담 받기',
        isCrisis: true,
        record: newRecord
      });
    }

    const ai = getAiClient();
    const fullPrompt = `${SYSTEM_INSTRUCTIONS}\n\n사용자 메시지: "${message}"\n\n위 가이드라인에 따라 답변을 작성해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt
    });

    const botResponseText = response.text || '';

    let replyText = botResponseText;
    let emotionKeyword = '불안';
    let stressLevel = 5;
    let recommendedAction = '15분 마음 정돈 및 휴식';
    let isCrisis = false;

    if (botResponseText.includes('1393') || botResponseText.includes('1577-0199')) {
      isCrisis = true;
    }

    const jsonMatch = botResponseText.match(/```json\s*([\s\S]*?)\s*```/) || botResponseText.match(/\{[\s\S]*"emotion_keyword"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.emotion_keyword) emotionKeyword = parsed.emotion_keyword;
        if (parsed.stress_level) stressLevel = parseInt(parsed.stress_level, 10) || 5;
        if (parsed.recommended_action) recommendedAction = parsed.recommended_action;
      } catch (err) {
        console.error('Failed to parse AI JSON summary:', err);
      }
    }

    const dialogMatch = botResponseText.match(/\[대화문\]([\s\S]*?)(?=\[데이터 요약\]|```|$)/);
    if (dialogMatch && dialogMatch[1].trim()) {
      replyText = dialogMatch[1].trim();
    } else {
      replyText = botResponseText.replace(/```json[\s\S]*?```/g, '').replace(/\[대화문\]/g, '').replace(/\[데이터 요약\]/g, '').trim();
    }

    let calendarEventTitle: string | undefined;
    let calendarTimeSlot: string | undefined;
    let syncedToCalendar = false;

    if (stressLevel >= 7 && !isCrisis) {
      const today = new Date();
      const availableSlot = findNextFreeSlot(calendarEvents, today, 30);
      
      if (availableSlot) {
        const careEvent: CalendarEvent = {
          id: `care-${Date.now()}`,
          title: `🌿 [리프레시] ${recommendedAction}`,
          start: availableSlot.start.toISOString(),
          end: availableSlot.end.toISOString(),
          category: 'care',
          stressTrigger: stressLevel,
          description: `AI 데일리 심리 케어 자동 감정 케어 타임 (스트레스 지수: ${stressLevel}/10, 주요 감정: ${emotionKeyword})`
        };
        calendarEvents.push(careEvent);
        syncedToCalendar = true;
        calendarEventTitle = careEvent.title;
        
        const startTimeStr = availableSlot.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTimeStr = availableSlot.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
        calendarTimeSlot = `${startTimeStr} - ${endTimeStr}`;
      }
    }

    const newRecord: MoodRecord = {
      id: `rec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('ko-KR'),
      userMessage: message,
      botReply: replyText,
      emotionKeyword,
      stressLevel,
      recommendedAction,
      syncedToCalendar,
      syncedToSheets: true,
      calendarEventTitle,
      calendarTimeSlot,
      isCrisis
    };

    moodRecords.unshift(newRecord);

    return res.json({
      replyText,
      emotionKeyword,
      stressLevel,
      recommendedAction,
      syncedToCalendar,
      calendarEventTitle,
      calendarTimeSlot,
      isCrisis,
      record: newRecord
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.get('/api/sheets/records', (req, res) => {
  res.json({ records: moodRecords });
});

app.post('/api/sheets/reset', (req, res) => {
  moodRecords = [...moodRecords.slice(0, 2)];
  res.json({ success: true, records: moodRecords });
});

app.get('/api/calendar/events', (req, res) => {
  res.json({ events: calendarEvents });
});

app.post('/api/calendar/schedule-care', (req, res) => {
  const { actionTitle, stressLevel, emotionKeyword } = req.body;
  const today = new Date();
  const availableSlot = findNextFreeSlot(calendarEvents, today, 30);

  if (!availableSlot) {
    return res.status(409).json({ error: '오늘 일정이 꽉 차서 겹치지 않는 빈 시간을 찾을 수 없습니다.' });
  }

  const careEvent: CalendarEvent = {
    id: `care-${Date.now()}`,
    title: `🌿 [리프레시] ${actionTitle || '30분 명상 및 휴식'}`,
    start: availableSlot.start.toISOString(),
    end: availableSlot.end.toISOString(),
    category: 'care',
    stressTrigger: stressLevel || 7,
    description: `맞춤형 멘탈 케어 타임블록 (감정: ${emotionKeyword || '스트레스 원인'})`
  };

  calendarEvents.push(careEvent);

  const startTimeStr = availableSlot.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTimeStr = availableSlot.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  res.json({
    success: true,
    event: careEvent,
    timeSlot: `${startTimeStr} - ${endTimeStr}`
  });
});

app.get('/api/apps-script/code', (req, res) => {
  const code = `
/**
 * Mindful Care Bot - Google Apps Script (Code.gs)
 * 구글 시트 감정 기록 적재 및 구글 캘린더 충돌 방지(Conflict Check) 자동 연동
 */

const STRESS_THRESHOLD = 7;
const SHEET_NAME = 'Mood_Diary';
const DEFAULT_CARE_DURATION_MIN = 30;

function recordMoodEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['날짜/시간 (A열)', '감정 키워드 (B열)', '스트레스 지수 (C열)', '추천 케어 행동 (D열)', '사용자 대화 (E열)', '캘린더 예약 여부 (F열)']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#E2E8F0');
  }

  const nowFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const stressLevel = Number(data.stress_level) || 1;
  let calendarScheduled = false;

  if (stressLevel >= STRESS_THRESHOLD) {
    calendarScheduled = autoScheduleCareTime(data.recommended_action, stressLevel, data.emotion_keyword);
  }

  sheet.appendRow([
    nowFormatted,
    data.emotion_keyword,
    stressLevel,
    data.recommended_action,
    data.user_message || '',
    calendarScheduled ? '예약 완료 (충돌검사 통과)' : (stressLevel >= STRESS_THRESHOLD ? '시간 부족/실패' : '미대상')
  ]);
}

function autoScheduleCareTime(actionName, stressLevel, emotion) {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  
  let searchStart = new Date(now);
  if (searchStart.getHours() < 9) {
    searchStart.setHours(9, 0, 0, 0);
  } else {
    searchStart.setMinutes(searchStart.getMinutes() + 10);
  }

  const searchEnd = new Date(now);
  searchEnd.setHours(21, 0, 0, 0);

  let targetStart = searchStart;

  while (targetStart.getTime() + DEFAULT_CARE_DURATION_MIN * 60 * 1000 <= searchEnd.getTime()) {
    let targetEnd = new Date(targetStart.getTime() + DEFAULT_CARE_DURATION_MIN * 60 * 1000);
    
    // [Conflict Check]
    const existingEvents = calendar.getEvents(targetStart, targetEnd);
    
    if (existingEvents.length === 0) {
      const title = "🌿 [리프레시] " + (actionName || "30분 멘탈 케어 타임");
      const description = "Mindful Care Bot 자동 생성 일정\\n" +
                          "- 스트레스 지수: " + stressLevel + "/10\\n" +
                          "- 감정 상태: " + emotion;
      
      calendar.createEvent(title, targetStart, targetEnd, { description: description });
      return true;
    }

    targetStart = new Date(targetStart.getTime() + 15 * 60 * 1000);
  }

  return false;
}
`;
  res.json({ code });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const template = await vite.transformIndexHtml(
          req.originalUrl,
          `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mindful Care Bot - AI 데일리 심리 케어</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700&family=Noto+Serif+KR:wght@500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#0F172A] text-white antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
