export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string; // [대화문] output or user message
  timestamp: string; // ISO or formatted string
  emotionKeyword?: string;
  stressLevel?: number; // 1 to 10
  recommendedAction?: string;
  isCrisis?: boolean;
}

export interface MoodEntry {
  id: string;
  timestamp: string; // ISO date-time
  dateFormatted: string; // YYYY-MM-DD HH:mm
  userMessage: string;
  botReply: string;
  emotionKeyword: string;
  stressLevel: number;
  recommendedAction: string;
  syncedToCalendar?: boolean;
  syncedToSheets?: boolean;
  calendarEventTitle?: string;
  calendarTimeSlot?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  category: 'care' | 'work' | 'personal';
  isAutoScheduled?: boolean;
  stressLevelTrigger?: number;
}

export interface MentalCareStats {
  averageStress: number;
  totalEntries: number;
  mostFrequentEmotion: string;
  highStressCount: number; // stress >= 7
  careScheduledCount: number;
}
