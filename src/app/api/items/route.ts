import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch last 10 reels with joined purchase and sale data (for backward compatibility)
export async function GET() {
  try {
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
      LIMIT 10
    `;
    
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Deprecated: Use /api/purchases or /api/sales instead
export async function POST(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Please use /api/purchases to create purchases with reels, or /api/sales to create sales and assign reels.',
    },
    { status: 410 }
  );
}

