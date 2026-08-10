import React from 'react';
import { PhoneCall, ShieldAlert, Heart } from 'lucide-react';

export const CrisisBanner: React.FC = () => {
  return (
    <div className="mb-4 p-4 rounded-2xl bg-rose-500/20 border border-rose-400/40 backdrop-blur-md text-rose-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500/30 rounded-xl text-rose-300 shrink-0">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <span>위기 상황 및 정서적 지원 안내</span>
            <span className="px-1.5 py-0.5 bg-rose-500/40 rounded text-[10px]">24시간 무료</span>
          </div>
          <p className="text-sm mt-0.5 text-white/90 leading-relaxed font-serif-kr">
            "지금 많이 힘드신 상태인 것 같아요. 혼자 견디기 버거울 때는 언제든 도움을 받을 수 있습니다."
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-rose-400/20">
        <a
          href="tel:1393"
          className="flex-1 md:flex-initial px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow border border-rose-400/50 transition-all active:scale-95"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>자살예방 1393</span>
        </a>
        <a
          href="tel:1577-0199"
          className="flex-1 md:flex-initial px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border border-white/20 transition-all active:scale-95"
        >
          <Heart className="w-3.5 h-3.5 text-rose-300" />
          <span>정신건강 1577-0199</span>
        </a>
      </div>
    </div>
  );
};
