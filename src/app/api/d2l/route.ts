import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
const ICAL = require('ical.js');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(url);
    const jcalData = ICAL.parse(response.data);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events = vevents.map((vevent: any) => {
      const event = new ICAL.Event(vevent);
      return {
        id: event.uid,
        title: event.summary,
        date: event.startDate.toJSDate().toISOString().split('T')[0],
        description: event.description || '',
        type: 'assignment'
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching D2L feed:', error);
    return NextResponse.json({ error: 'Failed to fetch D2L feed' }, { status: 500 });
  }
}
