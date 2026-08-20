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

  // Validate URL structure and protocol
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid URL protocol. Only HTTP and HTTPS are allowed.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*'
      },
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024 // 10MB limit
    });

    const jcalData = ICAL.parse(response.data);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events = vevents.map((vevent: any) => {
      const event = new ICAL.Event(vevent);
      const now = new Date();
      let eventDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
      
      try {
        if (event.startDate) {
          const jsDate = event.startDate.toJSDate();
          const year = jsDate.getFullYear();
          const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
          const day = jsDate.getDate().toString().padStart(2, '0');
          eventDate = `${year}-${month}-${day}`;
        }
      } catch (e) {
        // Fallback date parsing if ical parser date fails
      }

      const summaryLower = (event.summary || '').toLowerCase();
      const rawDesc = event.description || '';
      const rawLocation = event.location || '';
      
      // Extract direct URLs from ical properties or description
      let directUrl = '';
      try {
        const urlProp = vevent.getFirstPropertyValue('url') || vevent.getFirstPropertyValue('attach');
        if (urlProp && typeof urlProp === 'string' && urlProp.startsWith('http')) {
          directUrl = urlProp;
        }
      } catch {}

      if (!directUrl) {
        const urlMatch = (rawDesc + ' ' + rawLocation).match(/https?:\/\/[^\s<>"']+/i);
        if (urlMatch) {
          directUrl = urlMatch[0];
        }
      }

      let type: 'assignment' | 'exam' | 'quiz' | 'material' = 'assignment';
      if (summaryLower.includes('quiz')) {
        type = 'quiz';
      } else if (summaryLower.includes('exam') || summaryLower.includes('test') || summaryLower.includes('midterm') || summaryLower.includes('final')) {
        type = 'exam';
      } else if (
        summaryLower.includes('lecture') || 
        summaryLower.includes('slide') || 
        summaryLower.includes('reading') || 
        summaryLower.includes('session') || 
        summaryLower.includes('notes') || 
        summaryLower.includes('module') || 
        summaryLower.includes('topic') || 
        summaryLower.includes('chapter') || 
        summaryLower.includes('handout') || 
        summaryLower.includes('syllabus') || 
        summaryLower.includes('presentation') || 
        summaryLower.includes('video') || 
        summaryLower.includes('film')
      ) {
        type = 'material';
      }

      // Clean HTML tags from description if present
      let cleanDesc = rawDesc;
      if (cleanDesc.includes('<')) {
        cleanDesc = cleanDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }

      return {
        id: event.uid || Math.random().toString(36).substring(2),
        title: event.summary || 'Untitled Event',
        date: eventDate,
        description: cleanDesc,
        location: rawLocation,
        materialUrl: directUrl || rawLocation || undefined,
        type
      };
    });

    return NextResponse.json({ events, count: events.length });
  } catch (error: any) {
    console.error('Error fetching D2L iCal feed:', error?.message || error);
    return NextResponse.json({ error: `Failed to fetch D2L iCal feed: ${error?.message || 'Unknown error'}` }, { status: 500 });
  }
}
