import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, ExternalLink, Sparkles, Terminal } from 'lucide-react';

export const AppsScriptModal: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/apps-script/code')
      .then(res => res.json())
      .then(data => {
        setCode(data.code || '');
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch script code:', err);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 rounded-[32px] md:rounded-[40px] bg-black/20 backdrop-blur-md border border-white/10 p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-white/10 flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <span>Google Apps Script (Code.gs) 코드 생성기</span>
          </h2>
          <p className="text-xs text-indigo-200/60 mt-0.5">
            구글 시트(Mood Diary DB) 적재 및 구글 캘린더 충돌 방지(Conflict Check) 자동 연동 스크립트
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow border border-indigo-400/40 transition-all active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '복사 완료!' : '스크립트 코드 복사'}</span>
        </button>
      </div>

      {/* Instructions Step-by-Step */}
      <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-2 text-indigo-100">
        <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>구글 스프레드시트 & Apps Script 적용 방법 (3단계):</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-white/80 pl-1 font-serif-kr leading-relaxed">
          <li>구글 스프레드시트 새 문서 생성 후 상단 메뉴에서 <code>[확장 프로그램] -&gt; [Apps Script]</code> 선택</li>
          <li>열린 에디터의 <code>Code.gs</code> 내용을 전체 삭제하고 아래 상자의 코드를 붙여넣기 후 저장 (<code>Ctrl + S</code>)</li>
          <li><code>recordMoodEntry</code> 실행 또는 WebApp 배포(Trigger)를 설정하면 AI 응답 데이터가 시트에 적재되고, 스트레스 ≥ 7일 때 캘린더 빈 시간에 케어 일정이 자동 생성됩니다.</li>
        </ol>
      </div>

      {/* Code Viewer Container */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-4 relative flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] text-white/50">
          <span className="font-mono">Code.gs (Google Apps Script Engine)</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Conflict Checking Logic Included
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-indigo-200/50">
            스크립트 코드를 불러오는 중...
          </div>
        ) : (
          <pre className="flex-1 overflow-auto text-xs font-mono text-indigo-200 leading-relaxed selection:bg-indigo-500/40">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
