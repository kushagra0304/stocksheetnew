import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch paginated reels with joined purchase and sale data
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
      FROM reels
    `;
    const total = parseInt(countResult[0].total.toString());
    const totalPages = Math.ceil(total / limit);

    // Get paginated reels with joined purchase and sale data
    const items = await sql`
      SELECT 
        r.id,
        r.reel_number,
        r.gsm,
        r.size,
        r.size_unit,
        r.rate,
        r.bf,
        r.weight,
        r.shade,
        r.created_at,
        p.purchase_bill_number,
        p.purchase_bill_date,
        c_p.name as bought_from_mill,
        s.sale_bill_number,
        s.sale_bill_date,
        c_s.name as sold_to
      FROM reels r
      INNER JOIN purchases p ON p.id = r.purchase_id
      INNER JOIN company c_p ON c_p.id = p.company_id
      LEFT JOIN sales s ON s.id = r.sale_id
      LEFT JOIN company c_s ON c_s.id = s.company_id
      ORDER BY r.created_at DESC
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

