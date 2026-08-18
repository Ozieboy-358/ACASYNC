import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const rawICAL = require('ical.js');
const ICAL = rawICAL.default || rawICAL;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Clean up URL formatting
  url = url.trim();
  if (url.startsWith('webcal://')) {
    url = url.replace('webcal://', 'https://');
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*'
      },
      timeout: 15000
    });

    const jcalData = ICAL.parse(response.data);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events = vevents.map((vevent: any) => {
      const event = new ICAL.Event(vevent);
      let eventDate = new Date().toISOString().split('T')[0];
      
      try {
        if (event.startDate) {
          eventDate = event.startDate.toJSDate().toISOString().split('T')[0];
        }
      } catch (e) {
        // Fallback date parsing if ical parser date fails
      }

      const summaryLower = (event.summary || '').toLowerCase();
      let type: 'assignment' | 'exam' | 'quiz' | 'material' = 'assignment';
      if (summaryLower.includes('quiz')) type = 'quiz';
      else if (summaryLower.includes('exam') || summaryLower.includes('test') || summaryLower.includes('midterm') || summaryLower.includes('final')) type = 'exam';
      else if (summaryLower.includes('lecture') || summaryLower.includes('slide') || summaryLower.includes('reading') || summaryLower.includes('session') || summaryLower.includes('film')) type = 'material';

      // Clean HTML tags from description if present
      let cleanDesc = event.description || '';
      if (cleanDesc.includes('<')) {
        cleanDesc = cleanDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      return {
        id: event.uid || Math.random().toString(36).substring(2),
        title: event.summary || 'Untitled Event',
        date: eventDate,
        description: cleanDesc,
        location: event.location || '',
        type
      };
    });

    return NextResponse.json({ events, count: events.length });
  } catch (error: any) {
    console.error('Error fetching D2L iCal feed:', error?.message || error);
    return NextResponse.json({ error: `Failed to fetch D2L iCal feed: ${error?.message || 'Unknown error'}` }, { status: 500 });
  }
}
