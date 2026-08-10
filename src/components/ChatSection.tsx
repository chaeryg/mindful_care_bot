import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MoodEntry } from '../types';
import { Send, Sparkles, Bot, User, Clock, CalendarCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CrisisBanner } from './CrisisBanner';

interface ChatSectionProps {
  onNewRecordAdded: (record: MoodEntry) => void;
  onOpenCalendar: () => void;
}

export const ChatSection: React.FC<ChatSectionProps> = ({
  onNewRecordAdded,
  onOpenCalendar
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'bot',
      text: '안녕하세요. 오늘 어떤 일로 마음에 무거움이나 걱정이 찾아오셨나요? 편안하게 당신의 이야기를 들려주세요. 제가 곁에서 함께 들어드릴게요.',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [selectedWeather, setSelectedWeather] = useState<string>('☀️ 맑음');
  const [isKmaSynced, setIsKmaSynced] = useState(false);
  const [temperatureInfo, setTemperatureInfo] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const weatherOptions = ['☀️ 맑음', '🌧️ 비', '❄️ 눈', '😷 미세먼지', '☁️ 흐림'];

  useEffect(() => {
    const fetchWeather = (lat?: number, lon?: number) => {
      const query = lat && lon ? `?lat=${lat}&lon=${lon}` : '';
      fetch(`/api/weather${query}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.weather) {
            const matched = weatherOptions.find(opt => opt.includes(data.weather) || data.weather.includes(opt.slice(2))) || (data.weather.includes('비') ? '🌧️ 비' : data.weather.includes('눈') ? '❄️ 눈' : '☀️ 맑음');
            setSelectedWeather(matched);
            if (data.temperature) {
              setTemperatureInfo(data.temperature);
            }
            if (data.source === 'kma') {
              setIsKmaSynced(true);
            }
          }
        })
        .catch(err => console.warn('Weather fetch error:', err));
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (_error) => {
          // Fallback to default location
          fetchWeather();
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeather();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickPrompts = [
    '오늘 회사 발표에 실수가 있어서 속상하고 마음이 너무 답답해요.',
    '업무량이 산더미처럼 쌓여서 하루종일 머리가 아프고 번아웃이 온 것 같아요.',
    '친구와 오랜만에 수다 떨며 기분전환을 했더니 마음이 편안해졌어요.',
    '요즘 미래에 대한 불안감 때문에 밤에 통 잠을 이루지 못하겠어요.'
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          weather: selectedWeather,
          history: messages.map(m => ({ role: m.sender, content: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI server');
      }

      const data = await response.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.replyText,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        emotionKeyword: data.emotionKeyword,
        stressLevel: data.stressLevel,
        recommendedAction: data.recommendedAction,
        isCrisis: data.isCrisis
      };

      setMessages(prev => [...prev, botMsg]);

      if (data.isCrisis) {
        setShowCrisisAlert(true);
      }

      if (data.record) {
        onNewRecordAdded(data.record);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: '죄송합니다. 서비스에 잠시 연결할 수 없습니다. 다정한 조언을 다시 전달해드릴 수 있도록 잠시 후 다시 시도해보아 주세요.',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 rounded-[32px] md:rounded-[40px] bg-black/20 backdrop-blur-md border border-white/10 p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl relative">
      {/* Header bar */}
      <div className="pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.7)] animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-semibold text-white flex items-center gap-2">
              <span>Mindful Care Bot</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-normal">Online</span>
            </h1>
            <p className="text-[11px] text-indigo-200/60 hidden sm:block">AI 공감 대화 & 감정 상태 실시간 정량 분석</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Weather Display Badge */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/15 text-xs shadow-sm">
            <span className="text-[11px] text-indigo-100 font-medium flex items-center gap-1.5">
              <span>오늘 날씨{temperatureInfo ? ` : ${temperatureInfo}` : ''}</span>
              <span className="text-[11px] font-semibold text-white bg-indigo-500/80 px-2.5 py-0.5 rounded-full border border-indigo-300/30">
                {selectedWeather}
              </span>
            </span>
          </div>

          <button
            onClick={() => {
              setMessages([
                {
                  id: 'msg-init-reset',
                  sender: 'bot',
                  text: '대화가 새롭게 시작되었습니다. 오늘 느꼈던 어떤 기분이든 편하게 나누어주세요.',
                  timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                }
              ]);
              setShowCrisisAlert(false);
            }}
            title="대화 초기화"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
        {showCrisisAlert && <CrisisBanner />}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end ml-auto' : 'items-start'} max-w-[90%] sm:max-w-[80%]`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-white/40">
                {msg.sender === 'bot' ? (
                  <>
                    <Bot className="w-3 h-3 text-indigo-300" />
                    <span>AI Care Bot</span>
                  </>
                ) : (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3 text-indigo-300" />
                  </>
                )}
                <span>• {msg.timestamp}</span>
              </div>

              <div
                className={`p-4 text-sm leading-relaxed rounded-2xl shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600/80 text-white rounded-tr-none border border-indigo-400/30 shadow-indigo-500/20'
                    : msg.isCrisis
                    ? 'bg-rose-950/60 text-rose-100 rounded-tl-none border border-rose-500/40'
                    : 'bg-white/10 border border-white/10 text-slate-100 rounded-tl-none backdrop-blur-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Data Summary Pill Card if attached */}
                {msg.sender === 'bot' && msg.stressLevel !== undefined && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 text-[11px] font-medium border border-white/10">
                        핵심 감정: {msg.emotionKeyword}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          msg.stressLevel >= 7
                            ? 'bg-rose-500/30 text-rose-300 border-rose-400/40'
                            : msg.stressLevel >= 4
                            ? 'bg-amber-500/30 text-amber-300 border-amber-400/40'
                            : 'bg-emerald-500/30 text-emerald-300 border-emerald-400/40'
                        }`}
                      >
                        스트레스: {msg.stressLevel} / 10
                      </span>
                    </div>

                    {msg.recommendedAction && (
                      <div className="w-full mt-1 p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 flex items-center justify-between text-[11px]">
                        <span className="text-indigo-200 font-medium">추천 케어: {msg.recommendedAction}</span>
                        {msg.stressLevel >= 7 && (
                          <button
                            onClick={onOpenCalendar}
                            className="text-[10px] text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1 underline underline-offset-2"
                          >
                            <CalendarCheck className="w-3 h-3" />
                            <span>캘린더 일정 확인</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-indigo-200/60 bg-white/5 px-4 py-2.5 rounded-2xl w-fit border border-white/10"
          >
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="ml-1 font-serif-kr">감정을 읽고 공감 조언과 정량 지수를 분석하는 중...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          예시 질문:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-3 py-1 bg-white/5 hover:bg-white/15 text-indigo-200 hover:text-white rounded-full text-[11px] whitespace-nowrap border border-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {prompt.length > 22 ? prompt.slice(0, 22) + '...' : prompt}
          </button>
        ))}
      </div>

      {/* Chat Input Bar matching Frosted Glass design specs */}
      <div className="mt-2 p-1.5 bg-white/10 rounded-full border border-white/20 flex items-center pr-1.5 backdrop-blur-xl shadow-lg">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          placeholder="오늘 마음속 고민이나 스트레스 받았던 일들을 말해보세요..."
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none px-5 text-sm text-white placeholder:text-white/40 disabled:opacity-50"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="bg-white hover:bg-indigo-50 text-indigo-950 font-bold px-5 py-2.5 rounded-full text-xs transition-all flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-40 disabled:hover:bg-white"
        >
          <span>전송</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
