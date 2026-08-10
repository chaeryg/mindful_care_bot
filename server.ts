import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Google OAuth State Store
let userGoogleTokens: any = null;
let userGoogleEmail: string | null = null;

function getOAuth2Client(req?: express.Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  let host = req ? req.get('host') : 'localhost:3000';
  let protocol = req ? (req.headers['x-forwarded-proto'] as string || req.protocol || 'http') : 'http';
  if (host?.includes('run.app') || host?.includes('ais-')) {
    protocol = 'https';
  }
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function syncToRealGoogleCalendar(req: express.Request, title: string, description: string, startTimeIso: string, endTimeIso: string) {
  if (!userGoogleTokens) return false;
  try {
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(userGoogleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description,
        start: { dateTime: startTimeIso },
        end: { dateTime: endTimeIso },
      }
    });
    console.log(`[Google Calendar] Synchronized event: "${title}" (${startTimeIso})`);
    return true;
  } catch (err) {
    console.error('[Google Calendar] API insert error:', err);
    return false;
  }
}

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
5. 사용자의 현재 날씨 상태(맑음, 비, 눈, 미세먼지 등)가 주어지면, 날씨에 최적화된 케어 행동을 추천하세요. (예: 비/눈/미세먼지면 '실내 15분 스트레칭' 또는 '실내 명상/따뜻한 차', 맑은 날씨면 '근처 공원 산책' 또는 '가벼운 야외 조깅/햇살 쬐기')

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

// Helper: Smart fallback reply generator if Gemini API fails or key is unconfigured
function generateSmartFallbackReply(userMessage: string, weather: string = '맑음'): string {
  const msg = userMessage.toLowerCase();
  const isIndoorWeather = weather.includes('비') || weather.includes('눈') || weather.includes('미세먼지') || weather.includes('흐림');
  
  let dialog = "";
  let emotion = "피로";
  let stress = 6;
  let action = isIndoorWeather ? "20분 실내 스트레칭 및 따뜻한 차 마시기" : "20분 햇살 쬐며 가벼운 산책";

  if (msg.includes('힘들') || msg.includes('지치') || msg.includes('피곤') || msg.includes('지쳤') || msg.includes('야근')) {
    dialog = `오늘 하루 정말 고생 많으셨어요. ${weather ? `오늘 날씨(${weather})에 맞춰 ` : ''}나 자신에게 따뜻하고 온기어린 휴식을 선물해 보세요.`;
    emotion = "피로";
    stress = 8;
    action = isIndoorWeather ? "30분 실내 온열 안대 착용 및 눈 휴식" : "20분 가벼운 공원 산책";
  } else if (msg.includes('불안') || msg.includes('걱정') || msg.includes('스트레스') || msg.includes('두렵')) {
    dialog = "마음속 불안과 걱정 때문에 가슴이 많이 답답하셨겠어요. 잠시 천천히 깊은 숨을 내쉬며 마음의 무게를 조금 내려놓아 보세요.";
    emotion = "불안";
    stress = 8;
    action = isIndoorWeather ? "15분 실내 복식 호흡 및 아로마 휴식" : "20분 야외 햇살 아래 깊은 호흡";
  } else if (msg.includes('화') || msg.includes('짜증') || msg.includes('분노') || msg.includes('답답')) {
    dialog = "답답하고 가슴 아픈 일 때문에 마음이 많이 상하셨겠어요. 따뜻한 차 한 잔과 함께 마음을 토닥여보시는 건 어떨까요?";
    emotion = "답답함";
    stress = 7;
    action = isIndoorWeather ? "20분 실내 잔잔한 음악 듣기 & 스트레칭" : "20분 가벼운 동네 산책";
  } else if (msg.includes('슬프') || msg.includes('우울') || msg.includes('눈물') || msg.includes('외롭')) {
    dialog = "혼자 버텨내느라 마음 고생이 참 많으셨어요. 당신의 감정은 그 자체로 소중하니 너무 애쓰지 마시고 편안하게 휴식을 취해보세요.";
    emotion = "우울";
    stress = 7;
    action = "30분 실내 마음 정돈 명상";
  } else if (msg.includes('좋') || msg.includes('기쁨') || msg.includes('행복') || msg.includes('평온') || msg.includes('감사')) {
    dialog = "오늘 기분 좋은 평온함이 함께했군요! 따뜻하고 긍정적인 에너지를 소중히 간직하며 기분 좋게 하루를 마무리하시길 바랄게요.";
    emotion = "평온";
    stress = 2;
    action = "15분 소소한 일상 감사 기록하기";
  } else {
    dialog = "소중한 마음을 나누어주셔서 고마워요. 오늘 하루 있었던 감정을 있는 그대로 안아주며 나만을 위한 온전한 휴식 시간을 보내보세요.";
    emotion = "소통";
    stress = 5;
    action = isIndoorWeather ? "20분 실내 조용한 스트레칭 및 차 한 잔" : "20분 따뜻한 야외 산책";
  }

  return `[대화문]\n${dialog}\n\n[데이터 요약]\n\`\`\`json\n{\n  "emotion_keyword": "${emotion}",\n  "stress_level": ${stress},\n  "recommended_action": "${action}"\n}\n\`\`\``;
}

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

// Helper: Convert Lat/Lon to KMA Grid (nx, ny)
function convertLatLonToGrid(lat: number, lon: number) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

// Helper: Get KMA Weather Data via Open API
app.get('/api/weather', async (req, res) => {
  try {
    const rawKey = process.env.KMA_WEATHER_API_KEY || '5tUntX5vxbi6zkVGcDo6Enb2TgvideArVfL%2FpL%2Be3qShBlUM54tEhJHNjjDRt61dP3WGFrK49dfhJJaXfHpVIQ%3D%3D';
    const serviceKey = decodeURIComponent(rawKey);

    const latParam = req.query.lat ? parseFloat(req.query.lat as string) : null;
    const lonParam = req.query.lon ? parseFloat(req.query.lon as string) : null;

    let nx = 60; // Seoul default X
    let ny = 127; // Seoul default Y

    if (latParam && lonParam && !isNaN(latParam) && !isNaN(lonParam)) {
      const grid = convertLatLonToGrid(latParam, lonParam);
      nx = grid.nx;
      ny = grid.ny;
    }

    const now = new Date();
    // Use 45 minutes ago to ensure base_time availability in KMA API
    const targetDate = new Date(now.getTime() - 45 * 60 * 1000);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const hh = String(targetDate.getHours()).padStart(2, '0');

    const base_date = `${yyyy}${mm}${dd}`;
    const base_time = `${hh}00`;

    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${encodeURIComponent(serviceKey)}&numOfRows=10&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`KMA API HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.response?.body?.items?.item || [];

    let ptyVal = 0;
    let tempVal = '22';

    items.forEach((item: any) => {
      if (item.category === 'PTY') ptyVal = parseInt(item.obsrValue, 10) || 0;
      if (item.category === 'T1H') tempVal = item.obsrValue;
    });

    let weatherText = '☀️ 맑음';
    if (ptyVal === 1 || ptyVal === 5) weatherText = '🌧️ 비';
    else if (ptyVal === 2 || ptyVal === 6) weatherText = '🌧️/❄️ 비/눈';
    else if (ptyVal === 3 || ptyVal === 7) weatherText = '❄️ 눈';

    return res.json({
      success: true,
      source: 'kma',
      weather: weatherText,
      temperature: `${tempVal}°C`,
      pty: ptyVal,
      nx,
      ny,
      baseDate: base_date,
      baseTime: base_time
    });
  } catch (err: any) {
    console.warn('Failed to fetch KMA weather, returning fallback:', err?.message);
    return res.json({
      success: true,
      source: 'fallback',
      weather: '☀️ 맑음',
      temperature: '23°C',
      pty: 0
    });
  }
});

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, weather } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const weatherCondition = weather || '맑음';

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

    let botResponseText = '';

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const fullPrompt = `${SYSTEM_INSTRUCTIONS}\n\n[현재 날씨 정보]: ${weatherCondition}\n사용자 메시지: "${message}"\n\n위 날씨 정보와 가이드라인에 따라 날씨에 맞는 추천 케어 행동을 포함하여 답변을 작성해주세요.`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: fullPrompt
        });
        botResponseText = response.text || '';
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed or missing key, switching to Smart Fallback:', apiErr);
    }

    // Fallback response generator if API failed or no response returned
    if (!botResponseText) {
      botResponseText = generateSmartFallbackReply(message, weatherCondition);
    }

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

        // Attempt real Google Calendar sync if connected via OAuth
        syncToRealGoogleCalendar(req, careEvent.title, careEvent.description || '', careEvent.start, careEvent.end);
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
    const fallbackText = "이야기를 공유해 주셔서 고마워요. 오늘 하루 지친 마음을 천천히 토닥이며 따뜻한 차 한 잔과 함께 편안한 휴식을 취해보시는 건 어떨까요?";
    const fallbackRecord: MoodRecord = {
      id: `rec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString('ko-KR'),
      userMessage: req.body?.message || '대화',
      botReply: fallbackText,
      emotionKeyword: '피로',
      stressLevel: 5,
      recommendedAction: '20분 따뜻한 휴식',
      syncedToCalendar: false,
      syncedToSheets: true
    };
    moodRecords.unshift(fallbackRecord);

    return res.json({
      replyText: fallbackText,
      emotionKeyword: '피로',
      stressLevel: 5,
      recommendedAction: '20분 따뜻한 휴식',
      syncedToCalendar: false,
      isCrisis: false,
      record: fallbackRecord
    });
  }
});

// Google OAuth Endpoints
app.get('/api/auth/google/status', (req, res) => {
  res.json({
    isConnected: !!userGoogleTokens,
    email: userGoogleEmail
  });
});

app.get('/api/auth/google/login', (req, res) => {
  const oauth2Client = getOAuth2Client(req);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) throw new Error('Authorization code missing');
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    userGoogleTokens = tokens;
    oauth2Client.setCredentials(tokens);

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      userGoogleEmail = userInfo.data.email || '연동된 구글 계정';
    } catch (e) {
      userGoogleEmail = '연동된 구글 계정';
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Calendar 연동 완료</title></head>
        <body style="background:#0F172A; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
          <h2>✅ Google Calendar 연동 성공!</h2>
          <p>구글 캘린더 계정이 정상적으로 로그인 연결되었습니다. 창이 닫힙니다...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: ${JSON.stringify(userGoogleEmail)} }, '*');
            }
            setTimeout(() => { window.close(); }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <body style="background:#0F172A; color:#f87171; font-family:sans-serif; text-align:center; padding:50px;">
          <h3>❌ 구글 연동 실패</h3>
          <p>${error.message || '오류가 발생했습니다.'}</p>
        </body>
      </html>
    `);
  }
});

app.post('/api/auth/google/logout', (req, res) => {
  userGoogleTokens = null;
  userGoogleEmail = null;
  res.json({ success: true });
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

app.delete('/api/calendar/events/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = calendarEvents.length;
  calendarEvents = calendarEvents.filter(e => e.id !== id);

  if (calendarEvents.length === initialLength) {
    return res.status(404).json({ error: '해당 일정을 찾을 수 없습니다.' });
  }

  res.json({ success: true, events: calendarEvents });
});

app.post('/api/calendar/schedule-care', async (req, res) => {
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

  // Sync to real Google Calendar if logged in via OAuth
  const realSynced = await syncToRealGoogleCalendar(req, careEvent.title, careEvent.description || '', careEvent.start, careEvent.end);

  const startTimeStr = availableSlot.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTimeStr = availableSlot.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  res.json({
    success: true,
    event: careEvent,
    timeSlot: `${startTimeStr} - ${endTimeStr}`,
    realGoogleSynced: realSynced
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
