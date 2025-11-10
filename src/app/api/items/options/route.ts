import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch existing options for shade, bought_from_mill, and sold_to
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const field = searchParams.get('field');

    if (!field || !['shade', 'bought_from_mill', 'sold_to'].includes(field)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field parameter' },
        { status: 400 }
      );
    }

    // Get distinct, non-null values for the specified field
    let result;
    if (field === 'shade') {
      result = await sql`
        SELECT DISTINCT shade as value
        FROM items
        WHERE shade IS NOT NULL
        ORDER BY shade ASC
      `;
    } else if (field === 'bought_from_mill') {
      result = await sql`
        SELECT DISTINCT bought_from_mill as value
        FROM items
        WHERE bought_from_mill IS NOT NULL
        ORDER BY bought_from_mill ASC
      `;
    } else {
      result = await sql`
        SELECT DISTINCT sold_to as value
        FROM items
        WHERE sold_to IS NOT NULL
        ORDER BY sold_to ASC
      `;
    }

    const options = result.map((row: any) => row.value).filter(Boolean);

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

