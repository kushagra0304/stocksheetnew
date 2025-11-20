import { NextResponse } from 'next/server';

// Hardcoded ENUM values from database schema
const SHADE_OPTIONS = ['GY', 'NS'] as const;
const SOLD_TO_OPTIONS = ['Ganpati Graphics'] as const;
const BOUGHT_FROM_MILL_OPTIONS = ['Deoria Paper Mills Ltd.', 'Ramaa Shyama Papers Pvt. Ltd.', 'Devrishi papers pvt. ltd.'] as const;

// GET - Fetch ENUM options for shade, bought_from_mill, and sold_to
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

    // Return hardcoded ENUM values
    let options: readonly string[];
    if (field === 'shade') {
      options = SHADE_OPTIONS;
    } else if (field === 'bought_from_mill') {
      options = BOUGHT_FROM_MILL_OPTIONS;
    } else {
      options = SOLD_TO_OPTIONS;
    }

    return NextResponse.json({ success: true, data: [...options] });
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

