import React, { useState, useEffect } from 'react';
import { CalendarEvent, MoodEntry } from '../types';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, Sparkles, UserCheck, ShieldCheck, Plus, Trash2, Info, ExternalLink, LogIn, LogOut } from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  latestRecord?: MoodEntry;
  onScheduleCare: (title?: string) => void;
  onDeleteEvent?: (id: string) => void;
  onOpenScriptModal?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  latestRecord,
  onScheduleCare,
  onDeleteEvent,
  onOpenScriptModal
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'heavy' | 'light'>('heavy');
  const [showSyncGuide, setShowSyncGuide] = useState<boolean>(false);

  // Format time range helper
  const formatTimeRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sStr = s.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const eStr = e.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${sStr} - ${eStr}`;
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`'${title}' 일정을 삭제하시겠습니까?`)) {
      if (onDeleteEvent) onDeleteEvent(id);
    }
  };

  return (
    <div className="flex-1 rounded-[32px] md:rounded-[40px] bg-black/20 backdrop-blur-md border border-white/10 p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <span>마음 케어 휴식 일정</span>
          </h2>
          <p className="text-xs text-indigo-200/60 mt-0.5">
            상담 대화 내용에 맞춰 기존 일정과 겹치지 않는 여유 시간에 마음 케어 일정을 예약해 드립니다.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenScriptModal && (
            <button
              onClick={onOpenScriptModal}
              className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-medium rounded-xl text-xs flex items-center gap-1.5 border border-emerald-400/30 transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Google Calendar 무료 연동 코드</span>
            </button>
          )}

          <button
            onClick={() => setShowSyncGuide(!showSyncGuide)}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white font-medium rounded-xl text-xs flex items-center gap-1.5 border border-white/10 transition-all"
          >
            <Info className="w-3.5 h-3.5 text-indigo-300" />
            <span>작동 가이드</span>
          </button>

          <button
            onClick={() => onScheduleCare(latestRecord?.recommendedAction)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow border border-indigo-400/40 transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>케어 일정 자동 등록</span>
          </button>
        </div>
      </div>

      {/* Calendar Sync Status Explanation Banner */}
      {showSyncGuide && (
        <div className="mt-4 p-4 rounded-2xl bg-indigo-900/40 border border-indigo-400/30 text-xs text-indigo-100 flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              캘린더 연동 여부 및 작동 방식 안내
            </span>
            <button
              onClick={() => setShowSyncGuide(false)}
              className="text-indigo-300 hover:text-white text-xs px-2 py-0.5"
            >
              닫기 ✕
            </button>
          </div>
          <div className="space-y-1.5 text-indigo-200/90 leading-relaxed font-serif-kr">
            <p>
              1. <strong>스마트 챗봇 자동 연동 (앱 내부)</strong>: 챗봇에서 스트레스 지수가 7 이상이 되면 기존 업무·회의와 겹치지 않는 빈 시간(Conflict-Free)을 찾아 자동으로 케어 일정을 배치합니다. 아래 리스트의 <span className="text-emerald-300 font-semibold">[자동 연동 케어]</span> 뱃지가 연동된 일정입니다.
            </p>
            <p>
              2. <strong>내 개인 Google Calendar 실제 연동 (Google Apps Script)</strong>: 앱 상단 및 사이드바의 <span className="text-indigo-300 font-semibold">'Google Apps Script 연동 가이드'</span>에 제공된 1줄 스크립트를 구글 시트/캘린더에 적용하면, 사용자의 실제 Google Calendar 앱에서도 일정이 자동 동기화됩니다.
            </p>
          </div>
          {onOpenScriptModal && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onOpenScriptModal}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-medium rounded-lg text-xs flex items-center gap-1 border border-emerald-400/30 transition-all"
              >
                <span>Apps Script 코드 및 연동 가이드 보기</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

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
              🎯 <strong>일정이 많은 사용자 모드:</strong> 회의나 업무 일정이 빽빽한 날에도 기존 일정을 확인하여 <span className="text-emerald-300 font-semibold underline underline-offset-2">30분의 여유 시간</span>을 찾고, 일정이 겹치지 않게 명상/휴식 타임을 넣어 드립니다.
            </p>
          ) : (
            <p>
              🎯 <strong>일정이 여유로운 사용자 모드:</strong> 캘린더 앱에 따로 들어갈 필요 없이, 챗봇과의 편안한 대화만으로 멘탈 케어 일정이 자동으로 등록되어 루틴 형성을 돕습니다.
            </p>
          )}
        </div>
      </div>

      {/* Today's Schedule Timeline showing Conflict Free Auto Scheduling */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
        <div className="flex items-center justify-between text-xs text-indigo-200/70 font-medium px-1">
          <span>오늘의 휴식 및 케어 일정</span>
          <span className="text-emerald-400 text-[11px] flex items-center gap-1 cursor-pointer hover:underline" onClick={() => setShowSyncGuide(true)}>
            <ShieldCheck className="w-3.5 h-3.5" />
            캘린더 연동 완료 (상태 안내)
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

              <div className="shrink-0 flex items-center gap-3 self-end sm:self-center">
                {evt.category === 'care' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    케어 시간 확정
                  </span>
                ) : (
                  <span className="text-[11px] text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
                    기존 일정
                  </span>
                )}

                <button
                  onClick={() => handleDelete(evt.id, evt.title)}
                  title="일정 삭제"
                  className="p-1.5 rounded-lg text-rose-300/70 hover:text-rose-200 hover:bg-rose-500/20 border border-transparent hover:border-rose-400/30 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
