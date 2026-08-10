import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatSection } from './components/ChatSection';
import { MoodDiaryView } from './components/MoodDiaryView';
import { CalendarView } from './components/CalendarView';
import { AppsScriptModal } from './components/AppsScriptModal';
import { MoodEntry, CalendarEvent } from './types';
import { Bell, Settings, ShieldCheck, HeartPulse, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'chat' | 'diary' | 'calendar' | 'script'>('chat');
  const [records, setRecords] = useState<MoodEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const [recordsRes, eventsRes] = await Promise.all([
        fetch('/api/sheets/records'),
        fetch('/api/calendar/events')
      ]);

      const recordsData = await recordsRes.json();
      const eventsData = await eventsRes.json();

      setRecords(recordsData.records || []);
      setEvents(eventsData.events || []);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNewRecordAdded = (newRecord: MoodEntry) => {
    setRecords(prev => [newRecord, ...prev]);
    // Refresh calendar events if auto-scheduled
    fetch('/api/calendar/events')
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(err => console.error(err));
  };

  const handleScheduleCareManual = async (actionTitle?: string) => {
    try {
      const latest = records[0];
      const res = await fetch('/api/calendar/schedule-care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionTitle: actionTitle || latest?.recommendedAction || '30분 명상 및 휴식',
          stressLevel: latest?.stressLevel || 7,
          emotionKeyword: latest?.emotionKeyword || '피로'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(prev => [...prev, data.event]);
        setCurrentTab('calendar');
      } else {
        const errorData = await res.json();
        alert(errorData.error || '일정을 생성하지 못했습니다.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetData = async () => {
    if (!confirm('감정 일기 데이터를 초기화하시겠습니까?')) return;
    try {
      const res = await fetch('/api/sheets/reset', { method: 'POST' });
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error(err);
    }
  };

  const latestRecord = records[0];
  const latestCareEvent = events.filter(e => e.category === 'care').pop();

  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-white flex flex-col md:flex-row p-4 md:p-6 gap-6 font-sans frosted-bg relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Frosted Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        latestRecord={latestRecord}
        latestCareEvent={latestCareEvent}
        onScheduleCareClick={() => handleScheduleCareManual()}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Top Header bar matching Frosted Glass specs */}
        <header className="flex justify-between items-center px-4 py-1 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
            <span className="text-sm font-medium flex items-center">
              Mindful Care Bot
              <span className="opacity-50 font-normal ml-2 text-xs">Online</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              title="알림 센터"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 cursor-pointer transition-all"
            >
              <Bell className="w-4 h-4 text-white/70" />
            </div>
            <div
              title="설정"
              onClick={() => setCurrentTab('script')}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 cursor-pointer transition-all"
            >
              <Settings className="w-4 h-4 text-white/70" />
            </div>
          </div>
        </header>

        {/* Dynamic View rendering */}
        {currentTab === 'chat' && (
          <ChatSection
            onNewRecordAdded={handleNewRecordAdded}
            onOpenCalendar={() => setCurrentTab('calendar')}
          />
        )}

        {currentTab === 'diary' && (
          <MoodDiaryView
            records={records}
            onRefresh={fetchData}
            onReset={handleResetData}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            events={events}
            latestRecord={latestRecord}
            onScheduleCare={handleScheduleCareManual}
          />
        )}

        {currentTab === 'script' && (
          <AppsScriptModal />
        )}

        {/* Bottom Footer matching Frosted Glass theme specs */}
        <footer className="px-4 flex flex-col sm:flex-row justify-between items-center py-1 gap-2 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-indigo-200/60 uppercase tracking-wider font-semibold">
                Syncing Sheets
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
              <span className="text-[10px] text-indigo-200/60 uppercase tracking-wider font-semibold">
                Stress Threshold: 7.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-white/30">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              Emotional Ethics Policy v1.2
            </span>
            <span>•</span>
            <span>Google Workspace & AI Studio Integration</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
