'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Notice } from './api/notices/route';

const SOURCE_META = {
  smartstore: { name: '스마트스토어', emoji: '🛒', color: '#03C75A', bg: '#f0fff6', border: '#b2f0d0' },
  searchad:   { name: '네이버 광고',   emoji: '📢', color: '#1a73e8', bg: '#f0f6ff', border: '#b2d0f0' },
  developers: { name: '개발자센터',    emoji: '⚙️', color: '#6d28d9', bg: '#f5f0ff', border: '#d0b2f0' },
};

type Source = keyof typeof SOURCE_META;

interface Data {
  smartstore: Notice[];
  searchad: Notice[];
  developers: Notice[];
  fetchedAt: string;
}

function NoticeCard({ notice }: { notice: Notice }) {
  const meta = SOURCE_META[notice.source];
  return (
    <a
      href={notice.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-xl border bg-white hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
      style={{ borderColor: meta.border }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {notice.isNew && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-red-500">
                NEW
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: meta.bg, color: meta.color }}>
              {notice.category}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {notice.title}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">{notice.date}</p>
        </div>
        <span className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1">→</span>
      </div>
    </a>
  );
}

function SourcePanel({ source, notices, loading }: { source: Source; notices: Notice[]; loading: boolean }) {
  const meta = SOURCE_META[source];
  const newCount = notices.filter(n => n.isNew).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: meta.bg }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <div>
            <h2 className="font-bold text-gray-800 text-sm">{meta.name}</h2>
            <p className="text-xs text-gray-500">최근 공지사항</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full text-white bg-red-500">
              {newCount}건 신규
            </span>
          )}
          <a
            href={
              source === 'smartstore' ? 'https://sell.smartstore.naver.com/#/notice/list' :
              source === 'searchad'   ? 'https://ads.naver.com/notice' :
              'https://developers.naver.com/notice/'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-1 rounded-lg font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: meta.color }}
          >
            전체보기
          </a>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[480px]">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">공지사항을 불러올 수 없습니다</p>
            <p className="text-xs mt-1">전체보기 버튼으로 직접 확인하세요</p>
          </div>
        ) : (
          notices.map(n => <NoticeCard key={n.id} notice={n} />)
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<Source | 'all'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notices', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalNew = data
    ? [...(data.smartstore ?? []), ...(data.searchad ?? []), ...(data.developers ?? [])].filter(n => n.isNew).length
    : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: '#03C75A' }}>N</div>
            <div>
              <h1 className="font-black text-gray-900 text-base leading-tight">네이버 공지 대시보드</h1>
              <p className="text-xs text-gray-400">서비스 점검 · 공지 모니터링</p>
            </div>
            {totalNew > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full text-white bg-red-500 animate-pulse">
                🔴 신규 {totalNew}건
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400 hidden sm:block">
                {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 기준
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#03C75A' }}
            >
              {loading ? '갱신 중...' : '⟳ 새로고침'}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2 flex gap-2 overflow-x-auto">
          {(['all', 'smartstore', 'searchad', 'developers'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                filter === s ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={filter === s ? { backgroundColor: s === 'all' ? '#374151' : SOURCE_META[s].color } : {}}
            >
              {s === 'all' ? '전체' : `${SOURCE_META[s].emoji} ${SOURCE_META[s].name}`}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {filter === 'all' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(['smartstore', 'searchad', 'developers'] as Source[]).map(s => (
              <SourcePanel key={s} source={s} notices={data?.[s] ?? []} loading={loading} />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <SourcePanel source={filter} notices={data?.[filter] ?? []} loading={loading} />
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
          <strong>⚠️ 참고:</strong> 네이버 서비스 정책에 따라 일부 공지가 불러와지지 않을 수 있습니다.
          각 패널의 <strong>전체보기</strong> 버튼으로 공식 페이지를 직접 확인하세요.
          대시보드는 <strong>5분마다 자동 갱신</strong>됩니다.
        </div>
      </div>
    </main>
  );
}
