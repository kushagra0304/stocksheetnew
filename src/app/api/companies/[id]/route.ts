import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Get single company by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const companies = await sql`
      SELECT id, name, type, created_at, updated_at
      FROM company
      WHERE id = ${id}
    `;

    if (companies.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: companies[0] });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update company
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, type } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Validate type enum
    if (type !== 'mill' && type !== 'customer') {
      return NextResponse.json(
        { success: false, error: "Type must be either 'mill' or 'customer'" },
        { status: 400 }
      );
    }

    // Validate name is not empty
    if (name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company name cannot be empty' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existing = await sql`
      SELECT id FROM company WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name (excluding current company)
    const duplicate = await sql`
      SELECT id FROM company WHERE name = ${name.trim()} AND id != ${id}
    `;

    if (duplicate.length > 0) {
      return NextResponse.json(
        { success: false, error: 'A company with this name already exists' },
        { status: 400 }
      );
    }

    // Update company
    const result = await sql`
      UPDATE company
      SET name = ${name.trim()}, type = ${type}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, type, created_at, updated_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Company updated successfully',
    });
  } catch (error) {
    console.error('Error updating company:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { success: false, error: 'A company with this name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete company (with in-use check)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    // Check if company exists
    const company = await sql`
      SELECT id, name, type FROM company WHERE id = ${id}
    `;

    if (company.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if company is in use in purchases
    const purchasesCount = await sql`
      SELECT COUNT(*) as count FROM purchases WHERE company_id = ${id}
    `;

    // Check if company is in use in sales
    const salesCount = await sql`
      SELECT COUNT(*) as count FROM sales WHERE company_id = ${id}
    `;

    const purchaseCount = parseInt(purchasesCount[0].count.toString());
    const saleCount = parseInt(salesCount[0].count.toString());

    if (purchaseCount > 0 || saleCount > 0) {
      const messages = [];
      if (purchaseCount > 0) {
        messages.push(`${purchaseCount} purchase record(s)`);
      }
      if (saleCount > 0) {
        messages.push(`${saleCount} sale record(s)`);
      }
      
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete company. It is currently used in ${messages.join(' and ')}.`,
        },
        { status: 400 }
      );
    }

    // Delete company
    await sql`
      DELETE FROM company WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

