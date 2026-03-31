import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Notice {
  id: string;
  title: string;
  date: string;
  url: string;
  category: string;
  source: 'smartstore' | 'developers';
  isNew: boolean;
}

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
  const [smartstore, developers] = await Promise.allSettled([
    fetchSmartstore(),
    fetchDevelopers(),
  ]);

  const data = {
    smartstore: smartstore.status === 'fulfilled' ? smartstore.value : [],
    developers: developers.status === 'fulfilled' ? developers.value : [],
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
