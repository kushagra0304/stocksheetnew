import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - List purchases with their reels
export async function GET() {
  try {
    const purchases = await sql`
      SELECT 
        p.id,
        p.purchase_bill_number,
        p.purchase_bill_date,
        p.company_id,
        c.name as bought_from_mill,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'reel_number', r.reel_number,
              'gsm', r.gsm,
              'size', r.size,
              'size_unit', r.size_unit,
              'bf', r.bf,
              'weight', r.weight,
              'shade', r.shade,
              'rate', r.rate,
              'sale_id', r.sale_id,
              'created_at', r.created_at
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as reels
      FROM purchases p
      INNER JOIN company c ON c.id = p.company_id
      LEFT JOIN reels r ON r.purchase_id = p.id
      GROUP BY p.id, p.purchase_bill_number, p.purchase_bill_date, p.company_id, c.name, p.created_at
      ORDER BY p.created_at DESC
    `;
    
    return NextResponse.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Create purchase + reels
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { purchase_bill_number, purchase_bill_date, company_id, reels, ship_to_customer_id, sale_bill_number, sale_bill_date } = body;
    const isShipTo = !!ship_to_customer_id;

    // Validate required fields
    if (!purchase_bill_number || !purchase_bill_date || !company_id) {
      return NextResponse.json(
        { success: false, error: 'Purchase Bill Number, Purchase Bill Date, and Company are required' },
        { status: 400 }
      );
    }

    // Validate company_id exists and is a mill
    const company = await sql`
      SELECT id, name, type FROM company WHERE id = ${company_id}
    `;

    if (company.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 400 }
      );
    }

    if (company[0].type !== 'mill') {
      return NextResponse.json(
        { success: false, error: 'Selected company must be a mill' },
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

    // Validate ship-to fields if enabled
    let customer: any[] = [];
    if (isShipTo) {
      if (!sale_bill_number || !sale_bill_date) {
        return NextResponse.json(
          { success: false, error: 'Sale bill number and date are required when ship-to is enabled' },
          { status: 400 }
        );
      }
      
      // Validate customer exists and is a customer type
      customer = await sql`
        SELECT id, name, type FROM company WHERE id = ${ship_to_customer_id}
      `;
      
      if (customer.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 400 }
        );
      }
      
      if (customer[0].type !== 'customer') {
        return NextResponse.json(
          { success: false, error: 'Selected company must be a customer' },
          { status: 400 }
        );
      }
    }

    // Validate each reel (reel_number is optional)
    for (const reel of reels) {
      if (!reel.gsm || !reel.size || !reel.size_unit || 
          reel.bf === undefined || reel.weight === undefined || !reel.shade) {
        return NextResponse.json(
          { success: false, error: 'All reel fields (gsm, size, size_unit, bf, weight, shade) are required. Reel number is optional.' },
          { status: 400 }
        );
      }
      // Validate rate when ship-to is enabled
      if (isShipTo && (reel.rate === undefined || reel.rate === null)) {
        return NextResponse.json(
          { success: false, error: 'Rate is required for all reels when ship-to is enabled' },
          { status: 400 }
        );
      }
    }

    // Create purchase and reels in a transaction
    const purchase = await sql`
      INSERT INTO purchases (purchase_bill_number, purchase_bill_date, company_id)
      VALUES (${purchase_bill_number}, ${purchase_bill_date}, ${company_id})
      RETURNING id, purchase_bill_number, purchase_bill_date, company_id, created_at
    `;

    const purchaseId = purchase[0].id;

    // Insert reels (rate is not set during purchase unless ship-to is enabled)
    // reel_number can be NULL if empty or not provided
    const insertedReels = [];
    for (const reel of reels) {
      const reelNumber = reel.reel_number && reel.reel_number.trim() !== '' ? reel.reel_number.trim() : null;
      const result = await sql`
        INSERT INTO reels (purchase_id, reel_number, gsm, size, size_unit, bf, weight, shade)
        VALUES (${purchaseId}, ${reelNumber}, ${reel.gsm}, ${reel.size}, ${reel.size_unit}, 
                ${reel.bf}, ${reel.weight}, ${reel.shade})
        RETURNING id, reel_number, gsm, size, size_unit, bf, weight, shade, rate, sale_id, created_at
      `;
      insertedReels.push(result[0]);
    }

    // If ship-to is enabled, create sale automatically
    let sale = null;
    if (isShipTo) {
      // Create sale with sale_type = 'direct_ship_to'
      sale = await sql`
        INSERT INTO sales (sale_bill_number, sale_bill_date, company_id, sale_type)
        VALUES (${sale_bill_number}, ${sale_bill_date}, ${ship_to_customer_id}, 'direct_ship_to')
        RETURNING id, sale_bill_number, sale_bill_date, company_id, sale_type, created_at
      `;

      const saleId = sale[0].id;

      // Update all reels with sale_id and rate (reel_number not required for direct_ship_to)
      for (let i = 0; i < insertedReels.length; i++) {
        const reel = reels[i];
        const updated = await sql`
          UPDATE reels
          SET sale_id = ${saleId}, rate = ${reel.rate}
          WHERE id = ${insertedReels[i].id}
          RETURNING id, reel_number, gsm, size, size_unit, bf, weight, shade, rate, sale_id, created_at
        `;
        insertedReels[i] = updated[0];
      }
    }

    // Return purchase with company name for backward compatibility
    const purchaseWithCompany = {
      ...purchase[0],
      bought_from_mill: company[0].name,
    };

    const response: any = {
      success: true,
      data: {
        purchase: purchaseWithCompany,
        reels: insertedReels,
      },
      message: isShipTo ? 'Purchase and sale created successfully' : 'Purchase and reels created successfully',
    };

    if (sale) {
      response.data.sale = {
        ...sale[0],
        sold_to: customer[0].name,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

