import React, { useState, useEffect } from 'react';
import { MoodEntry } from '../types';
import { Database, FileSpreadsheet, RefreshCw, CalendarCheck2, ShieldAlert, TrendingUp, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface MoodDiaryViewProps {
  records: MoodEntry[];
  onRefresh: () => void;
  onReset: () => void;
}

export const MoodDiaryView: React.FC<MoodDiaryViewProps> = ({
  records,
  onRefresh,
  onReset
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter(r =>
    r.emotionKeyword.includes(searchTerm) ||
    r.recommendedAction.includes(searchTerm) ||
    r.userMessage.includes(searchTerm)
  );

  // Prepare chart data (reverse to chronological order)
  const chartData = [...records].reverse().map(r => ({
    time: r.dateFormatted.split(' ')[1] || r.dateFormatted.slice(5, 10),
    stress: r.stressLevel,
    keyword: r.emotionKeyword
  }));

  const avgStress = records.length > 0
    ? (records.reduce((acc, curr) => acc + curr.stressLevel, 0) / records.length).toFixed(1)
    : '0';

  const highStressCount = records.filter(r => r.stressLevel >= 7).length;

  return (
    <div className="flex-1 rounded-[32px] md:rounded-[40px] bg-black/20 backdrop-blur-md border border-white/10 p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>구글 시트 감정 일기 (Mood Diary DB)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Live Google Sheets Sync
            </span>
          </h2>
          <p className="text-xs text-indigo-200/60 mt-0.5">
            AI가 대화에서 추출한 A열(일시), B열(감정), C열(스트레스), D열(추천행동) 데이터 적재 현황
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs text-white rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>동기화 새로고침</span>
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300 rounded-xl border border-rose-400/30 transition-all"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-indigo-200/60">총 감정 기록 수</div>
            <div className="text-2xl font-light text-white mt-0.5">{records.length}건</div>
          </div>
          <Database className="w-6 h-6 text-indigo-400/60" />
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-indigo-200/60">평균 스트레스 지수</div>
            <div className="text-2xl font-light text-indigo-300 mt-0.5">{avgStress} / 10</div>
          </div>
          <TrendingUp className="w-6 h-6 text-indigo-400/60" />
        </div>

        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-indigo-200/60">고스트레스(≥7) 케어 트리거</div>
            <div className="text-2xl font-light text-rose-400 mt-0.5">{highStressCount}회</div>
          </div>
          <CalendarCheck2 className="w-6 h-6 text-rose-400/60" />
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="text-xs font-semibold text-indigo-200 mb-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>스트레스 추이 트래킹</span>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis domain={[0, 10]} stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E1B4B', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="stress" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#stressGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spreadsheet Data Table */}
      <div className="flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
        <table className="w-full text-left text-xs text-indigo-100">
          <thead className="bg-white/10 text-indigo-200 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
            <tr>
              <th className="py-3 px-4">A열 (날짜/시간)</th>
              <th className="py-3 px-4">B열 (핵심 감정)</th>
              <th className="py-3 px-4">C열 (스트레스)</th>
              <th className="py-3 px-4">D열 (추천 케어 행동)</th>
              <th className="py-3 px-4">E열 (대화 기록)</th>
              <th className="py-3 px-4 text-center">F열 (캘린더 연동)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-white/40">
                  기록된 감정 데이터가 없습니다. 챗봇과 이야기를 시작해보세요.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-white/5 transition-all">
                  <td className="py-3 px-4 text-white/70 whitespace-nowrap">{r.dateFormatted}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/10 font-medium">
                      {r.emotionKeyword}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        r.stressLevel >= 7
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      }`}
                    >
                      {r.stressLevel} / 10
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white font-medium max-w-[180px] truncate">
                    {r.recommendedAction}
                  </td>
                  <td className="py-3 px-4 text-white/60 max-w-[200px] truncate" title={r.userMessage}>
                    {r.userMessage}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {r.syncedToCalendar ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-400/30">
                        <CalendarCheck2 className="w-3 h-3" />
                        예약 완료 (충돌 통과)
                      </span>
                    ) : r.stressLevel >= 7 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-400/30">
                        <ShieldAlert className="w-3 h-3" />
                        빈시간 부족
                      </span>
                    ) : (
                      <span className="text-white/30 text-[10px]">미대상 (&lt; 7)</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
