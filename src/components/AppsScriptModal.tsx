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
      <div className="my-4 p-4 rounded-2xl bg-indigo-950/60 border border-indigo-400/30 text-xs space-y-3 text-indigo-100 shadow-inner">
        <div className="flex items-center justify-between border-b border-indigo-400/20 pb-2">
          <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>💡 Google Apps Script 방식의 장점 (100% 무료 & 평생 이용)</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-200 text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-medium">
            유료 Google Cloud 신청 필요 없음
          </span>
        </div>

        <p className="text-indigo-200/90 leading-relaxed">
          Google Cloud의 유료 API 승인절차 없이, 내 Google 계정(구글 시트/캘린더)의 기본 기능만 활용해 <strong>100% 무료</strong>로 마음 케어 일정을 내 캘린더에 동기화할 수 있습니다.
        </p>

        <div className="pt-1">
          <div className="font-medium text-white mb-1.5">📌 1분 연동 순서 (3단계):</div>
          <ol className="list-decimal list-inside space-y-1.5 text-indigo-100/90 pl-1 font-serif-kr leading-relaxed">
            <li><a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-300 underline font-semibold hover:text-white">sheets.new</a>에 접속해 새 구글 시트를 만듭니다.</li>
            <li>상단 메뉴 <code>[확장 프로그램] -&gt; [Apps Script]</code> 클릭 후, 아래 코드를 복사해서 붙여넣고 저장(<code>Ctrl+S</code>)합니다.</li>
            <li>상단 실행 버튼(▶ <code>recordMoodEntry</code>)을 1회 누르거나 웹앱으로 배포하면, 챗봇 대화 분석 결과와 케어 일정이 내 구글 캘린더 및 시트에 자동 등록됩니다!</li>
          </ol>
        </div>
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
