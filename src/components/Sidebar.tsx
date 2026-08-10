import React from 'react';
import { MoodEntry, CalendarEvent } from '../types';
import { Calendar, MessageSquare, Sparkles, AlertCircle, HeartHandshake } from 'lucide-react';

interface SidebarProps {
  currentTab: 'chat' | 'diary' | 'calendar' | 'script';
  setCurrentTab: (tab: 'chat' | 'diary' | 'calendar' | 'script') => void;
  latestRecord?: MoodEntry;
  latestCareEvent?: CalendarEvent;
  onScheduleCareClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  latestRecord,
  latestCareEvent,
  onScheduleCareClick
}) => {
  const stressLevel = latestRecord ? latestRecord.stressLevel : 7.8;
  const emotionKeyword = latestRecord ? latestRecord.emotionKeyword : '피로 및 부담감';

  // Stress level color helper
  const getStressColor = (level: number) => {
    if (level >= 7) return { text: 'text-rose-400', bg: 'bg-rose-400', badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30' };
    if (level >= 4) return { text: 'text-amber-400', bg: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' };
  };

  const stressTheme = getStressColor(stressLevel);

  return (
    <aside className="w-full md:w-80 flex flex-col gap-4 shrink-0">
      {/* Profile Card */}
      <div className="p-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex flex-col items-center text-center shadow-xl">
        <div className="relative w-16 h-16 rounded-full bg-indigo-400/30 border border-indigo-200/50 flex items-center justify-center mb-3 overflow-hidden shadow-inner">
          <div className="w-10 h-10 bg-indigo-300 rounded-full blur-md animate-pulse"></div>
          <HeartHandshake className="w-8 h-8 text-white relative z-10" />
        </div>
        <h2 className="text-lg font-medium tracking-tight text-white font-serif-kr">Mindful Care Assistant</h2>
        <p className="text-xs text-indigo-200/70 mt-0.5">Monitoring your peace today</p>
      </div>

      {/* Navigation Tabs */}
      <div className="p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-1">
        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all ${
            currentTab === 'chat'
              ? 'bg-indigo-500/30 text-white border border-indigo-400/40 shadow-lg'
              : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-300" />
          <span className="font-semibold text-sm">AI 상담 챗봇</span>
        </button>

        <button
          onClick={() => setCurrentTab('calendar')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all ${
            currentTab === 'calendar'
              ? 'bg-indigo-500/30 text-white border border-indigo-400/40 shadow-lg'
              : 'text-indigo-200/70 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-300" />
          <span className="font-semibold text-sm">구글 캘린더</span>
        </button>
      </div>

      {/* Mood Tracker & Stress Widget */}
      <div className="flex-1 p-5 rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs uppercase tracking-widest text-indigo-300 font-bold">Mood Tracker</h3>
            <span className="text-[10px] text-indigo-200/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Live Analysis</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-xs text-white/60">Current Stress Index</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-light ${stressTheme.text}`}>{stressLevel.toFixed(1)}</span>
                <span className="text-xs text-white/40">/ 10</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${stressTheme.bg}`}
                style={{ width: `${Math.min(stressLevel * 10, 100)}%` }}
              ></div>
            </div>

            {/* Keyword tags */}
            <div className="pt-2 flex flex-wrap gap-1.5">
              <span className={`px-2.5 py-1 rounded-lg text-[11px] border font-medium ${stressTheme.badge}`}>
                {emotionKeyword}
              </span>
              <span className="px-2.5 py-1 bg-white/10 rounded-lg text-[11px] text-indigo-100 border border-white/5">
                {stressLevel >= 7 ? '자동 캘린더 케어 대상' : '상태 관리 중'}
              </span>
            </div>
          </div>

          {/* Google Calendar Suggestion Block */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase tracking-widest text-indigo-300 font-bold">Google Calendar</h3>
              <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                Conflict Check On
              </span>
            </div>

            <div className="p-3.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-400/10 rounded-full blur-xl group-hover:bg-indigo-400/20 transition-all"></div>
              <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1 flex items-center justify-between">
                <span>Suggested Care</span>
                <span className="text-[9px] bg-indigo-400/30 text-indigo-100 px-1.5 py-0.5 rounded">30m Block</span>
              </div>
              <div className="text-sm font-medium text-white truncate">
                {latestCareEvent ? latestCareEvent.title : (latestRecord?.recommendedAction || '30분 명상 및 심호흡')}
              </div>
              <div className="text-xs text-white/60 mt-1 flex items-center justify-between">
                <span>{latestRecord?.calendarTimeSlot || '오늘 16:30 - 17:00'}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">빈시간 자동배치</span>
              </div>
            </div>

            <button
              onClick={onScheduleCareClick}
              className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 font-medium active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>휴식 일정 수동 생성 (충돌 검사)</span>
            </button>
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-white/40">
          <AlertCircle className="w-3 h-3 text-indigo-300 shrink-0" />
          <span>위기 상황 시 전문기관 상담안내(1393) 포함</span>
        </div>
      </div>
    </aside>
  );
};
