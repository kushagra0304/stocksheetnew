import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch last 10 items
export async function GET() {
  try {
    const items = await sql`
      SELECT id, gsm, sale_bill_number, size, rate, bf, weight, shade, bought_from_mill, sold_to, purchase_bill_number, sale_bill_date, purchase_bill_date, created_at
      FROM items
      ORDER BY created_at DESC
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

// POST - Add new item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gsm, sale_bill_number, size, rate, bf, weight, shade, bought_from_mill, sold_to, purchase_bill_number, sale_bill_date, purchase_bill_date } = body;

    // Validate required fields
    if (!gsm || !sale_bill_number || !size || rate === undefined || rate === null || !shade || !sold_to || bf === undefined || bf === null || weight === undefined || weight === null) {
      return NextResponse.json(
        { success: false, error: 'GSM, Sale Bill Number, Size, Rate, BF, Weight, Shade, and Sold To are required' },
        { status: 400 }
      );
    }

    // Insert new item
    const result = await sql`
      INSERT INTO items (gsm, sale_bill_number, size, rate, bf, weight, shade, bought_from_mill, sold_to, purchase_bill_number, sale_bill_date, purchase_bill_date)
      VALUES (${gsm}, ${sale_bill_number}, ${size}, ${rate}, ${bf}, ${weight}, ${shade}, ${bought_from_mill || null}, ${sold_to}, ${purchase_bill_number || null}, ${sale_bill_date || null}, ${purchase_bill_date || null})
      RETURNING id, gsm, sale_bill_number, size, rate, bf, weight, shade, bought_from_mill, sold_to, purchase_bill_number, sale_bill_date, purchase_bill_date, created_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Item added successfully',
    });
  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

