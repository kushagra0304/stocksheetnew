import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

// Create database connection after env vars are loaded
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Make sure .env.local exists with DATABASE_URL.');
}

const sql = neon(process.env.DATABASE_URL);

interface ColumnInfo {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface PrimaryKey {
  column_name: string;
}

interface ForeignKey {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  delete_rule: string;
}

interface Index {
  indexname: string;
  indexdef: string;
}

interface EnumType {
  enum_name: string;
  enum_values: string;
}

async function generateSchema() {
  try {
    console.log('🔄 Generating schema from database...');

    let schemaContent = `-- Stocksheet Database Schema
-- Auto-generated on ${new Date().toISOString()}
-- DO NOT EDIT MANUALLY - This file is auto-synced from the database
-- Run: npm run schema:generate

`;

    // Get ENUM types
    const enums = await sql`
      SELECT t.typname as enum_name,
             string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    ` as EnumType[];

    if (enums.length > 0) {
      schemaContent += '-- ENUM Types\n';
      for (const enumType of enums) {
        const values = enumType.enum_values.split(', ').map(v => `'${v}'`).join(', ');
        schemaContent += `CREATE TYPE ${enumType.enum_name} AS ENUM (${values});\n`;
      }
      schemaContent += '\n';
    }

    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    ` as { table_name: string }[];

    // Process each table
    for (const table of tables) {
      const tableName = table.table_name;
      
      // Get columns
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        ORDER BY ordinal_position;
      ` as ColumnInfo[];

      // Get primary keys
      const primaryKeys = await sql`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = ${tableName}
        AND tc.constraint_type = 'PRIMARY KEY';
      ` as PrimaryKey[];
      const pkColumns = primaryKeys.map(pk => pk.column_name);

      // Get foreign keys
      const foreignKeys = await sql`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = ${tableName};
      ` as ForeignKey[];

      // Get indexes (excluding primary key indexes)
      const indexes = await sql`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = ${tableName}
        AND indexname NOT IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
          AND constraint_type = 'PRIMARY KEY'
        );
      ` as Index[];

      // Generate CREATE TABLE statement
      schemaContent += `-- Table: ${tableName}\n`;
      schemaContent += `CREATE TABLE ${tableName} (\n`;

      // Add columns
      const columnDefs: string[] = [];
      for (const col of columns) {
        let colDef = `    ${col.column_name} `;

        // Map PostgreSQL types
        let pgType = col.udt_name;
        if (pgType === 'varchar' && col.character_maximum_length) {
          pgType = `VARCHAR(${col.character_maximum_length})`;
        } else if (pgType === 'int4') {
          pgType = 'INTEGER';
        } else if (pgType === 'numeric') {
          pgType = 'NUMERIC';
        } else if (pgType === 'timestamp') {
          pgType = 'TIMESTAMP WITH TIME ZONE';
        } else if (pgType === 'date') {
          pgType = 'DATE';
        } else if (pgType === 'serial') {
          pgType = 'SERIAL';
        } else if (pgType.startsWith('_')) {
          // Array type - use the base type
          pgType = pgType.substring(1).toUpperCase();
        } else {
          // Use the UDT name as-is (for ENUMs and other custom types)
          pgType = pgType.toUpperCase();
        }

        colDef += pgType;

        // Add NOT NULL
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }

        // Add DEFAULT
        if (col.column_default) {
          const defaultValue = col.column_default;
          colDef += ` DEFAULT ${defaultValue}`;
        }

        columnDefs.push(colDef);
      }

      schemaContent += columnDefs.join(',\n');
      schemaContent += '\n);\n\n';

      // Add primary key constraint if not already in column definition
      if (pkColumns.length > 0) {
        schemaContent += `ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_pkey PRIMARY KEY (${pkColumns.join(', ')});\n\n`;
      }

      // Add foreign key constraints
      for (const fk of foreignKeys) {
        const onDelete = fk.delete_rule === 'CASCADE' ? 'ON DELETE CASCADE' :
                         fk.delete_rule === 'SET NULL' ? 'ON DELETE SET NULL' :
                         fk.delete_rule === 'RESTRICT' ? 'ON DELETE RESTRICT' : '';
        
        const constraintName = `${tableName}_${fk.column_name}_fkey`;
        schemaContent += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} `;
        schemaContent += `FOREIGN KEY (${fk.column_name}) `;
        schemaContent += `REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name}) `;
        if (onDelete) {
          schemaContent += `${onDelete} `;
        }
        schemaContent += ';\n';
      }

      if (foreignKeys.length > 0) {
        schemaContent += '\n';
      }

      // Add indexes
      for (const idx of indexes) {
        // Extract just the CREATE INDEX part, removing the semicolon
        let indexDef = idx.indexdef;
        if (!indexDef.endsWith(';')) {
          indexDef += ';';
        }
        schemaContent += `${indexDef}\n`;
      }

      if (indexes.length > 0) {
        schemaContent += '\n';
      }
    }

    // Write to file
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    fs.writeFileSync(schemaPath, schemaContent, 'utf-8');

    console.log('✅ Schema generated successfully!');
    console.log(`📄 Written to: ${schemaPath}`);
    console.log(`📊 Found ${tables.length} tables and ${enums.length} ENUM types`);
  } catch (error) {
    console.error('❌ Error generating schema:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run the generator
generateSchema();

