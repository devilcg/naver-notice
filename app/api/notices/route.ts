import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Notice {
  id: string;
  title: string;
  date: string;
  url: string;
  category: string;
  source: 'smartstore' | 'searchad' | 'developers';
  isNew: boolean;
}

const SOURCES = {
  smartstore: {
    name: '스마트스토어',
    color: '#03C75A',
    url: 'https://sell.smartstore.naver.com/api/notice/list?page=1&size=10',
    apiType: 'json' as const,
  },
  searchad: {
    name: '네이버 광고',
    color: '#1EC800',
    url: 'https://searchad.naver.com/biz-center/noticeList?page=1&pageSize=10',
    apiType: 'html' as const,
  },
  developers: {
    name: '개발자센터',
    color: '#00C73C',
    url: 'https://developers.naver.com/notice/',
    apiType: 'html' as const,
  },
};

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function isNew(dateStr: string): boolean {
  try {
    const date = new Date(dateStr.replace(/\./g, '-'));
    return Date.now() - date.getTime() < TWO_WEEKS_MS;
  } catch {
    return false;
  }
}

async function fetchSmartstore(): Promise<Notice[]> {
  try {
    const res = await axios.get(
      'https://sell.smartstore.naver.com/api/notice/list?page=1&pageSize=10',
      { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const items = res.data?.contents ?? res.data?.list ?? res.data?.data ?? [];
    return items.slice(0, 10).map((item: any, i: number) => ({
      id: `ss-${item.noticeId ?? item.id ?? i}`,
      title: item.title ?? item.noticeTitle ?? '제목 없음',
      date: item.createDate ?? item.regDate ?? item.date ?? '',
      url: item.url ?? `https://sell.smartstore.naver.com/#/notice/detail/${item.noticeId ?? item.id}`,
      category: item.category ?? item.noticeType ?? '공지',
      source: 'smartstore',
      isNew: isNew(item.createDate ?? item.regDate ?? ''),
    }));
  } catch {
    return fetchSmartStoreHtml();
  }
}

async function fetchSmartStoreHtml(): Promise<Notice[]> {
  try {
    const res = await axios.get('https://sell.smartstore.naver.com/notice/list', {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    });
    const $ = cheerio.load(res.data);
    const notices: Notice[] = [];
    $('tr, .notice-item, .list-item').each((i, el) => {
      if (i >= 10) return;
      const title = $(el).find('td:nth-child(2), .title, a').first().text().trim();
      const date = $(el).find('td:last-child, .date, .reg-date').text().trim();
      const href = $(el).find('a').attr('href') ?? '';
      if (title) {
        notices.push({
          id: `ss-${i}`,
          title,
          date,
          url: href.startsWith('http') ? href : `https://sell.smartstore.naver.com${href}`,
          category: '공지',
          source: 'smartstore',
          isNew: isNew(date),
        });
      }
    });
    return notices;
  } catch {
    return [];
  }
}

async function fetchSearchAd(): Promise<Notice[]> {
  try {
    const res = await axios.get(
      'https://api.naver.com/bizService/notice?pageSize=10&page=1',
      { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const items = res.data?.list ?? res.data?.items ?? res.data ?? [];
    if (Array.isArray(items) && items.length > 0) {
      return items.slice(0, 10).map((item: any, i: number) => ({
        id: `ad-${item.id ?? i}`,
        title: item.title ?? '제목 없음',
        date: item.regDate ?? item.date ?? '',
        url: item.url ?? `https://searchad.naver.com/biz-center/noticeView?noticeSeq=${item.id}`,
        category: item.category ?? '공지',
        source: 'searchad',
        isNew: isNew(item.regDate ?? item.date ?? ''),
      }));
    }
    throw new Error('no items');
  } catch {
    return fetchSearchAdHtml();
  }
}

async function fetchSearchAdHtml(): Promise<Notice[]> {
  try {
    const res = await axios.get('https://searchad.naver.com/biz-center/noticeList', {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    });
    const $ = cheerio.load(res.data);
    const notices: Notice[] = [];
    $('tr, .notice_list li, .notice-row').each((i, el) => {
      if (i >= 10) return;
      const title = $(el).find('.subject, .title, td:nth-child(2), a').first().text().trim();
      const date = $(el).find('.date, td:last-child').text().trim();
      const href = $(el).find('a').attr('href') ?? '';
      if (title) {
        notices.push({
          id: `ad-${i}`,
          title,
          date,
          url: href.startsWith('http') ? href : `https://searchad.naver.com${href}`,
          category: '공지',
          source: 'searchad',
          isNew: isNew(date),
        });
      }
    });
    return notices;
  } catch {
    return [];
  }
}

async function fetchDevelopers(): Promise<Notice[]> {
  try {
    const res = await axios.get('https://developers.naver.com/notice/', {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    });
    const $ = cheerio.load(res.data);
    const notices: Notice[] = [];
    $('tr, .list_notice li, .notice_item').each((i, el) => {
      if (i >= 10) return;
      const title = $(el).find('.subject, .title, td:nth-child(2), a').first().text().trim();
      const date = $(el).find('.date, td:last-child').text().trim();
      const href = $(el).find('a').attr('href') ?? '';
      if (title) {
        notices.push({
          id: `dev-${i}`,
          title,
          date,
          url: href.startsWith('http') ? href : `https://developers.naver.com${href}`,
          category: '공지',
          source: 'developers',
          isNew: isNew(date),
        });
      }
    });
    return notices;
  } catch {
    return [];
  }
}

export async function GET() {
  const [smartstore, searchad, developers] = await Promise.allSettled([
    fetchSmartstore(),
    fetchSearchAd(),
    fetchDevelopers(),
  ]);

  const data = {
    smartstore: smartstore.status === 'fulfilled' ? smartstore.value : [],
    searchad: searchad.status === 'fulfilled' ? searchad.value : [],
    developers: developers.status === 'fulfilled' ? developers.value : [],
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
