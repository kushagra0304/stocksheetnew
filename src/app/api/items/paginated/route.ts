import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch paginated items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM items
    `;
    const total = parseInt(countResult[0].total.toString());
    const totalPages = Math.ceil(total / limit);

    // Get paginated items
    const items = await sql`
      SELECT id, gsm, sale_bill_number, size, rate, bf, shade, bought_from_mill, sold_to, purchase_bill_number, sale_bill_date, purchase_bill_date, created_at
      FROM items
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching paginated items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

