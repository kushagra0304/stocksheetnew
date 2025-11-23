import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch all reels for a specific date (based on purchase or sale date)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Parse the date and create date range (start and end of day)
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all reels where purchase_date or sale_date matches the selected date
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
      WHERE (p.purchase_bill_date >= ${startOfDay.toISOString().split('T')[0]} 
             AND p.purchase_bill_date <= ${endOfDay.toISOString().split('T')[0]})
         OR (s.sale_bill_date >= ${startOfDay.toISOString().split('T')[0]} 
             AND s.sale_bill_date <= ${endOfDay.toISOString().split('T')[0]})
      ORDER BY r.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: items,
      date: date,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching items by date:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

