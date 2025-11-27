import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import type { SaleRequest, Company, Sale, Reel } from '@/lib/types';

// GET - List sales with their reels
export async function GET() {
  try {
    const sales = await sql`
      SELECT 
        s.id,
        s.sale_bill_number,
        s.sale_bill_date,
        s.company_id,
        c.name as sold_to,
        s.sale_type,
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
      INNER JOIN company c ON c.id = s.company_id
      LEFT JOIN reels r ON r.sale_id = s.id
      GROUP BY s.id, s.sale_bill_number, s.sale_bill_date, s.company_id, c.name, s.sale_type, s.created_at
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
    const { sale_bill_number, sale_bill_date, company_id, reels, sale_type } = body;
    const saleType = sale_type || 'from_godown';

    // Validate required fields
    if (!sale_bill_number || !sale_bill_date || !company_id) {
      return NextResponse.json(
        { success: false, error: 'Sale Bill Number, Sale Bill Date, and Company are required' },
        { status: 400 }
      );
    }

    // Validate company_id exists and is a customer
    const company = await sql`
      SELECT id, name, type FROM company WHERE id = ${company_id}
    ` as Company[];

    if (company.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 400 }
      );
    }

    if (company[0].type !== 'customer') {
      return NextResponse.json(
        { success: false, error: 'Selected company must be a customer' },
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
      // Only require reel_number for 'from_godown' sales
      if (saleType === 'from_godown' && (!reel.reel_number || reel.reel_number.trim() === '')) {
        return NextResponse.json(
          { success: false, error: 'Reel number is required for all reels in a sale from godown' },
          { status: 400 }
        );
      }
    }

    // Check if reels are available (not already sold)
    const reelIds = reels.map((r: SaleRequest['reels'][0]) => r.reel_id);
    const existingReels = await sql`
      SELECT id, sale_id FROM reels WHERE id = ANY(${reelIds})
    ` as Array<{ id: number; sale_id: number | null }>;

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
      INSERT INTO sales (sale_bill_number, sale_bill_date, company_id, sale_type)
      VALUES (${sale_bill_number}, ${sale_bill_date}, ${company_id}, ${saleType})
      RETURNING id, sale_bill_number, sale_bill_date, company_id, sale_type, created_at
    ` as Sale[];

    const saleId = sale[0].id;

    // Update reels with sale_id, rate, and reel_number (only for from_godown sales)
    const updatedReels: Reel[] = [];
    for (const reel of reels) {
      let result: Reel[];
      if (saleType === 'from_godown' && reel.reel_number) {
        result = await sql`
          UPDATE reels
          SET sale_id = ${saleId}, rate = ${reel.rate}, reel_number = ${reel.reel_number.trim()}
          WHERE id = ${reel.reel_id} AND sale_id IS NULL
          RETURNING id, reel_number, purchase_id, gsm, size, size_unit, bf, weight, shade, rate, sale_id, created_at
        ` as Reel[];
      } else {
        result = await sql`
          UPDATE reels
          SET sale_id = ${saleId}, rate = ${reel.rate}
          WHERE id = ${reel.reel_id} AND sale_id IS NULL
          RETURNING id, reel_number, purchase_id, gsm, size, size_unit, bf, weight, shade, rate, sale_id, created_at
        ` as Reel[];
      }
      if (result.length > 0) {
        updatedReels.push(result[0]);
      }
    }

    // Return sale with company name for backward compatibility
    const saleWithCompany = {
      ...sale[0],
      sold_to: company[0].name,
    };

    return NextResponse.json({
      success: true,
      data: {
        sale: saleWithCompany,
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

