import { NextRequest, NextResponse } from 'next/server';
import ical from 'node-ical';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(url);
    const data = ical.parseICS(response.data);
    
    const events = Object.values(data)
      .filter(item => item.type === 'VEVENT')
      .map((item: any) => ({
        id: item.uid,
        title: item.summary,
        date: item.start.toISOString().split('T')[0],
        description: item.description,
        type: 'assignment' // Default for D2L items
      }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching D2L feed:', error);
    return NextResponse.json({ error: 'Failed to fetch D2L feed' }, { status: 500 });
  }
}
