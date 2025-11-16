import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// Hardcoded ENUM values for validation
const SOLD_TO_OPTIONS = ['Ganpati Graphics'] as const;

// GET - List sales with their reels
export async function GET() {
  try {
    const sales = await sql`
      SELECT 
        s.id,
        s.sale_bill_number,
        s.sale_bill_date,
        s.sold_to,
        s.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'reel_number', r.reel_number,
              'purchase_id', r.purchase_id,
              'gsm', r.gsm,
              'size', r.size,
              'size_unit', r.size_unit,
              'bf', r.bf,
              'weight', r.weight,
              'shade', r.shade,
              'rate', r.rate,
              'created_at', r.created_at
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as reels
      FROM sales s
      LEFT JOIN reels r ON r.sale_id = s.id
      GROUP BY s.id, s.sale_bill_number, s.sale_bill_date, s.sold_to, s.created_at
      ORDER BY s.created_at DESC
    `;
    
    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Create sale + assign reels
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sale_bill_number, sale_bill_date, sold_to, reels } = body;

    // Validate required fields
    if (!sale_bill_number || !sale_bill_date || !sold_to) {
      return NextResponse.json(
        { success: false, error: 'Sale Bill Number, Sale Bill Date, and Sold To are required' },
        { status: 400 }
      );
    }

    // Validate ENUM value
    if (!SOLD_TO_OPTIONS.includes(sold_to as any)) {
      return NextResponse.json(
        { success: false, error: `Invalid sold_to value. Must be one of: ${SOLD_TO_OPTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate reels array
    if (!reels || !Array.isArray(reels) || reels.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one reel is required' },
        { status: 400 }
      );
    }

    // Validate each reel assignment
    for (const reel of reels) {
      if (!reel.reel_id || reel.rate === undefined || reel.rate === null) {
        return NextResponse.json(
          { success: false, error: 'Each reel must have reel_id and rate' },
          { status: 400 }
        );
      }
    }

    // Check if reels are available (not already sold)
    const reelIds = reels.map((r: any) => r.reel_id);
    const existingReels = await sql`
      SELECT id, sale_id FROM reels WHERE id = ANY(${reelIds})
    `;

    for (const reel of existingReels) {
      if (reel.sale_id !== null) {
        return NextResponse.json(
          { success: false, error: `Reel with ID ${reel.id} is already sold` },
          { status: 400 }
        );
      }
    }

    if (existingReels.length !== reelIds.length) {
      return NextResponse.json(
        { success: false, error: 'One or more reel IDs are invalid' },
        { status: 400 }
      );
    }

    // Create sale
    const sale = await sql`
      INSERT INTO sales (sale_bill_number, sale_bill_date, sold_to)
      VALUES (${sale_bill_number}, ${sale_bill_date}, ${sold_to})
      RETURNING id, sale_bill_number, sale_bill_date, sold_to, created_at
    `;

    const saleId = sale[0].id;

    // Update reels with sale_id and rate
    const updatedReels = [];
    for (const reel of reels) {
      const result = await sql`
        UPDATE reels
        SET sale_id = ${saleId}, rate = ${reel.rate}
        WHERE id = ${reel.reel_id} AND sale_id IS NULL
        RETURNING id, reel_number, purchase_id, gsm, size, size_unit, bf, weight, shade, rate, sale_id, created_at
      `;
      if (result.length > 0) {
        updatedReels.push(result[0]);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sale: sale[0],
        reels: updatedReels,
      },
      message: 'Sale created and reels assigned successfully',
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

