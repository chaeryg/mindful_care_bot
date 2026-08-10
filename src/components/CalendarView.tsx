import React, { useState } from 'react';
import { CalendarEvent, MoodEntry } from '../types';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, Sparkles, UserCheck, ShieldCheck, Plus } from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  latestRecord?: MoodEntry;
  onScheduleCare: (title?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  latestRecord,
  onScheduleCare
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'heavy' | 'light'>('heavy');

  // Format time range helper
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sStr = s.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const eStr = e.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${sStr} - ${eStr}`;
  };

  return (
    <div className="flex-1 rounded-[32px] md:rounded-[40px] bg-black/20 backdrop-blur-md border border-white/10 p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <span>구글 캘린더 자동화 & 일정 충돌 방지 (Conflict Check)</span>
          </h2>
          <p className="text-xs text-indigo-200/60 mt-0.5">
            스트레스 지수 7 이상 시 기존 일정(Busy)과 겹치지 않는 '진짜 빈 시간'을 찾아 자동 케어 블록 배치
          </p>
        </div>

        <button
          onClick={() => onScheduleCare(latestRecord?.recommendedAction)}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow border border-indigo-400/40 transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
          <span>빈시간 탐색 & 케어 일정 배치</span>
        </button>
      </div>

      {/* Target User Switcher & Concept Banner */}
      <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            맞춤형 유저 경험 타겟 모드
          </span>
          <div className="flex bg-black/30 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSelectedTarget('heavy')}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                selectedTarget === 'heavy'
                  ? 'bg-indigo-500 text-white font-semibold shadow'
                  : 'text-indigo-200/60 hover:text-white'
              }`}
            >
              타겟 1: 캘린더 헤비 유저
            </button>
            <button
              onClick={() => setSelectedTarget('light')}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                selectedTarget === 'light'
                  ? 'bg-indigo-500 text-white font-semibold shadow'
                  : 'text-indigo-200/60 hover:text-white'
              }`}
            >
              타겟 2: 캘린더 라이트 유저
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs text-indigo-100 leading-relaxed font-serif-kr">
          {selectedTarget === 'heavy' ? (
            <p>
              🎯 <strong>캘린더 헤비 유저 모드:</strong> 기존 회의 및 업무 일정이 빽빽하게 등록되어 있어도, Apps Script 충돌 검사 로직이 <span className="text-emerald-300 font-semibold underline underline-offset-2">기존 일정 사이 30분의 빈 여유 시간</span>을 계산하여 일정이 겹치는 오버랩 문제 없이 명상/휴식 타임을 삽입해 드립니다.
            </p>
          ) : (
            <p>
              🎯 <strong>캘린더 라이트 유저 모드:</strong> 번거롭게 일일이 캘린더 앱에 접속해 일정을 등록할 필요 없이, 챗봇과의 단순한 대화만으로 멘탈 케어 타임블록이 자동으로 캘린더에 예약되어 케어 루틴 형성을 돕습니다.
            </p>
          )}
        </div>
      </div>

      {/* Today's Schedule Timeline showing Conflict Free Auto Scheduling */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
        <div className="flex items-center justify-between text-xs text-indigo-200/70 font-medium px-1">
          <span>오늘의 타임라인 일정 (Conflict Detection Active)</span>
          <span className="text-emerald-400 text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            구글 캘린더 API 실시간 연동
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-xs bg-white/5 rounded-2xl border border-white/10">
            등록된 일정이 없습니다.
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                evt.category === 'care'
                  ? 'bg-emerald-500/20 border-emerald-400/40 shadow-lg shadow-emerald-500/10'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl text-white shrink-0 ${
                    evt.category === 'care' ? 'bg-emerald-500' : 'bg-indigo-600/60'
                  }`}
                >
                  {evt.category === 'care' ? <Sparkles className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white">{evt.title}</h3>
                    {evt.category === 'care' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-200 text-[10px] font-bold border border-emerald-300/40">
                        자동 연동 케어
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-200/60 mt-0.5">{formatTimeRange(evt.start, evt.end)}</p>
                  {evt.description && (
                    <p className="text-[11px] text-white/70 mt-1 font-serif-kr bg-black/20 p-2 rounded-lg border border-white/5">
                      {evt.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                {evt.category === 'care' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    충돌검사 통과됨
                  </span>
                ) : (
                  <span className="text-[11px] text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
                    기존 일정 (Busy)
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Conflict Resolution Mechanism Info */}
      <div className="mt-2 p-3 rounded-2xl bg-black/30 border border-white/10 text-[11px] text-white/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>예외 처리: Apps Script가 <code>CalendarApp.getEvents(start, end)</code>로 기존 일정을 사전 확인합니다.</span>
        </div>
        <span className="text-indigo-300 font-semibold">임계치: 스트레스 ≥ 7</span>
      </div>
    </div>
  );
};
