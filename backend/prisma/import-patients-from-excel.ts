/**
 * Import Patients from Excel File
 * 
 * This script reads patient data from an Excel file and imports them into the database.
 * 
 * Usage:
 *   npx ts-node prisma/import-patients-from-excel.ts <path-to-excel-file>
 * 
 * Excel File Format:
 * The script expects an Excel file with the following columns (column names are case-insensitive):
 * 
 * Required Fields:
 * - firstName (or First Name)
 * - lastName (or Last Name)
 * - dateOfBirth (or Date of Birth, DOB) - Can be in various date formats
 * 
 * Optional Fields (will be mapped if present):
 * - middleName (or Middle Name)
 * - gender (MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY)
 * - email
 * - phone (or Phone, Tel)
 * - whatsapp (or WhatsApp)
 * - alternatePhone (or Alternate Phone, Phone Secondary)
 * - address (or Address, Address Line 1)
 * - city
 * - state
 * - zipCode (or Zip Code, Postal Code)
 * - country (defaults to "Kenya")
 * - occupation
 * - bloodType (or Blood Type)
 * - patientNumber (or Patient Number, MRN) - If not provided, will be auto-generated
 * - fileNumber (or File Number) - If not provided, will be auto-generated
 * 
 * Next of Kin Fields:
 * - nextOfKinFirstName (or Next of Kin First Name)
 * - nextOfKinLastName (or Next of Kin Last Name)
 * - nextOfKinRelationship (or Next of Kin Relationship)
 * - nextOfKinContact (or Next of Kin Contact, Next of Kin Phone)
 * 
 * The script will:
 * 1. Read the Excel file
 * 2. Validate required fields
 * 3. Auto-generate patientNumber and fileNumber if not provided
 * 4. Check for duplicates (by email, phone, or name+DOB)
 * 5. Create patient records
 * 6. Create next of kin contacts if provided
 * 7. Report success/failures
 */

import * as XLSX from 'xlsx';
import { PrismaClient, PatientStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

// Use PrismaClient directly (like seed.ts does)
// It will use DATABASE_URL from environment variables
const prisma = new PrismaClient();

// Column name mappings (case-insensitive)
const COLUMN_MAPPINGS: Record<string, string> = {
  // Required fields
  'first name': 'firstName',
  'firstname': 'firstName',
  'fname': 'firstName',
  'last name': 'lastName',
  'lastname': 'lastName',
  'lname': 'lastName',
  'client name': 'clientName', // Special handling for "CLIENT NAME" - will split into first/last
  'date of birth': 'dateOfBirth',
  'dob': 'dateOfBirth',
  'd.o.b': 'dateOfBirth',
  'birthdate': 'dateOfBirth',
  'birth date': 'dateOfBirth',
  
  // Optional fields
  'middle name': 'middleName',
  'middlename': 'middleName',
  'mname': 'middleName',
  'email': 'email',
  'phone': 'phone',
  'tel': 'phone',
  'telephone': 'phone',
  'whatsapp': 'whatsapp',
  'alternate phone': 'alternatePhone',
  'phone secondary': 'alternatePhone',
  'secondary phone': 'alternatePhone',
  'address': 'address',
  'address line 1': 'address',
  'residence': 'address', // Map RESIDENCE to address
  'city': 'city',
  'state': 'state',
  'zip code': 'zipCode',
  'postal code': 'zipCode',
  'zip': 'zipCode',
  'country': 'country',
  'occupation': 'occupation',
  'blood type': 'bloodType',
  'bloodtype': 'bloodType',
  'patient number': 'patientNumber',
  'mrn': 'patientNumber',
  'file number': 'fileNumber',
  'file no': 'fileNumber',
  'filenumber': 'fileNumber',
  'drug allergies': 'drugAllergies', // Will be handled separately
  
  // Next of Kin
  'next of kin first name': 'nextOfKinFirstName',
  'nok first name': 'nextOfKinFirstName',
  'next of kin last name': 'nextOfKinLastName',
  'nok last name': 'nextOfKinLastName',
  'next of kin': 'nextOfKinName', // Full name - will split
  'nok': 'nextOfKinName',
  'next of kin relationship': 'nextOfKinRelationship',
  'relationship': 'nextOfKinRelationship',
  'nok relationship': 'nextOfKinRelationship',
  'next of kin contact': 'nextOfKinContact',
  'next of kin phone': 'nextOfKinContact',
  'nok contact': 'nextOfKinContact',
  'nok phone': 'nextOfKinContact',
};

interface ExcelRow {
  [key: string]: any;
}

interface PatientData {
  // Required
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  
  // Optional
  middleName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  occupation?: string;
  bloodType?: string;
  patientNumber?: string;
  fileNumber?: string;
  
  // Next of Kin
  nextOfKinFirstName?: string;
  nextOfKinLastName?: string;
  nextOfKinRelationship?: string;
  nextOfKinContact?: string;
}

/**
 * Normalize column name to standard format
 */
function normalizeColumnName(colName: string): string {
  return COLUMN_MAPPINGS[colName.toLowerCase().trim()] || colName;
}

/**
 * Parse date from various formats
 */
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) return null;
    return dateValue;
  }
  
  // If it's a number (Excel serial date)
  if (typeof dateValue === 'number') {
    // Excel dates are days since 1900-01-01
    // But Excel incorrectly treats 1900 as a leap year, so we use 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
    if (isNaN(date.getTime())) return null;
    return date;
  }
  
  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    if (!trimmed) return null;
    
    // Try various date formats
    // DD/MM/YYYY or DD-MM-YYYY (common in Kenya)
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1; // Month is 0-indexed
      const year = parseInt(ddmmyyyy[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // MM/DD/YYYY (US format)
    const mmddyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1], 10) - 1;
      const day = parseInt(mmddyyyy[2], 10);
      const year = parseInt(mmddyyyy[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try standard Date parsing (handles many formats)
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      // Validate the date is reasonable (not year 1900 from Excel epoch)
      const year = parsed.getFullYear();
      if (year >= 1900 && year <= 2100) {
        return parsed;
      }
    }
  }
  
  return null;
}

/**
 * Generate unique patient number (MRN-YYYY-XXXXX)
 */
async function generatePatientNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MRN-${year}-`;

  const lastPatient = await prisma.patient.findFirst({
    where: {
      patientNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      patientNumber: 'desc',
    },
    select: {
      patientNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastPatient) {
    const match = lastPatient.patientNumber.match(/-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const formattedNumber = nextNumber.toString().padStart(5, '0');
  return `${prefix}${formattedNumber}`;
}

/**
 * Generate unique file number (NS001, NS002, etc.)
 */
async function generateFileNumber(): Promise<string> {
  const lastPatient = await prisma.patient.findFirst({
    where: {
      fileNumber: {
        startsWith: 'NS',
      },
    },
    orderBy: {
      fileNumber: 'desc',
    },
    select: {
      fileNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastPatient) {
    const match = lastPatient.fileNumber.match(/NS(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const formattedNumber = nextNumber.toString().padStart(3, '0');
  return `NS${formattedNumber}`;
}

/**
 * Check for duplicate patient
 */
async function checkDuplicate(data: PatientData): Promise<{ isDuplicate: boolean; reason?: string; existingPatient?: any }> {
  // Check by email
  if (data.email) {
    const existing = await prisma.patient.findFirst({
      where: { email: data.email },
      select: { id: true, patientNumber: true, fileNumber: true, firstName: true, lastName: true },
    });
    if (existing) {
      return { isDuplicate: true, reason: `Email: ${data.email}`, existingPatient: existing };
    }
  }

  // Check by phone
  if (data.phone) {
    const existing = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: data.phone },
          { alternatePhone: data.phone },
        ],
      },
      select: { id: true, patientNumber: true, fileNumber: true, firstName: true, lastName: true },
    });
    if (existing) {
      return { isDuplicate: true, reason: `Phone: ${data.phone}`, existingPatient: existing };
    }
  }

  // Check by name + DOB
  const existing = await prisma.patient.findFirst({
    where: {
      firstName: { equals: data.firstName, mode: 'insensitive' },
      lastName: { equals: data.lastName, mode: 'insensitive' },
      dateOfBirth: data.dateOfBirth,
    },
    select: { id: true, patientNumber: true, fileNumber: true, firstName: true, lastName: true },
  });
  if (existing) {
    return { isDuplicate: true, reason: `Name + DOB: ${data.firstName} ${data.lastName} (${data.dateOfBirth.toISOString().split('T')[0]})`, existingPatient: existing };
  }

  return { isDuplicate: false };
}

/**
 * Parse Excel row to PatientData
 */
function parseRow(row: ExcelRow, columnMap: Map<string, string>): PatientData | null {
  const data: Partial<PatientData> = {};

  // Map columns
  for (const [excelCol, standardCol] of columnMap.entries()) {
    const value = row[excelCol];
    if (value !== undefined && value !== null && value !== '') {
      (data as any)[standardCol] = value;
    }
  }

  // Handle CLIENT NAME - split into firstName and lastName
  if ((data as any).clientName && !data.firstName && !data.lastName) {
    const clientName = String((data as any).clientName).trim();
    const nameParts = clientName.split(/\s+/).filter(p => p.length > 0);
    if (nameParts.length >= 2) {
      data.firstName = nameParts[0];
      data.lastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      data.firstName = nameParts[0];
      data.lastName = 'Unknown'; // Default if only one name part
    }
    delete (data as any).clientName;
  }

  // Handle NEXT OF KIN - split into firstName and lastName
  if ((data as any).nextOfKinName && !data.nextOfKinFirstName && !data.nextOfKinLastName) {
    const nokName = String((data as any).nextOfKinName).trim();
    const nokParts = nokName.split(/\s+/).filter(p => p.length > 0);
    if (nokParts.length >= 2) {
      data.nextOfKinFirstName = nokParts[0];
      data.nextOfKinLastName = nokParts.slice(1).join(' ');
    } else if (nokParts.length === 1) {
      data.nextOfKinFirstName = nokParts[0];
      data.nextOfKinLastName = '';
    }
    delete (data as any).nextOfKinName;
  }

  // Validate required fields
  if (!data.firstName || !data.lastName) {
    return null; // Skip rows without required fields
  }

  // Parse date of birth
  const dob = parseDate(data.dateOfBirth);
  if (!dob) {
    // Log the actual value for debugging
    console.warn(`⚠️  Row: Invalid date format "${data.dateOfBirth}" for ${data.firstName} ${data.lastName} - skipping row`);
    return null; // Skip instead of throwing to continue processing other rows
  }

  // Clean string values (trim whitespace)
  const cleanString = (val: any): string | undefined => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed || undefined;
    }
    return val ? String(val).trim() : undefined;
  };

  return {
    firstName: cleanString(data.firstName)!,
    lastName: cleanString(data.lastName)!,
    dateOfBirth: dob,
    middleName: cleanString(data.middleName),
    gender: cleanString(data.gender),
    email: cleanString(data.email),
    phone: cleanString(data.phone),
    whatsapp: cleanString(data.whatsapp),
    alternatePhone: cleanString(data.alternatePhone),
    address: cleanString(data.address),
    city: cleanString(data.city),
    state: cleanString(data.state),
    zipCode: cleanString(data.zipCode),
    country: cleanString(data.country) || 'Kenya',
    occupation: cleanString(data.occupation),
    bloodType: cleanString(data.bloodType),
    patientNumber: cleanString(data.patientNumber),
    fileNumber: cleanString(data.fileNumber),
    nextOfKinFirstName: cleanString(data.nextOfKinFirstName),
    nextOfKinLastName: cleanString(data.nextOfKinLastName),
    nextOfKinRelationship: cleanString(data.nextOfKinRelationship),
    nextOfKinContact: cleanString(data.nextOfKinContact),
  };
}

/**
 * Create patient in database
 */
async function createPatient(data: PatientData, createdBy?: string): Promise<string> {
  // Generate patientNumber and fileNumber if not provided
  const patientNumber = data.patientNumber || await generatePatientNumber();
  const fileNumber = data.fileNumber || await generateFileNumber();

  // Check if patientNumber or fileNumber already exists
  if (data.patientNumber) {
    const existing = await prisma.patient.findUnique({
      where: { patientNumber: data.patientNumber },
    });
    if (existing) {
      throw new Error(`Patient number ${data.patientNumber} already exists`);
    }
  }

  if (data.fileNumber) {
    const existing = await prisma.patient.findUnique({
      where: { fileNumber: data.fileNumber },
    });
    if (existing) {
      throw new Error(`File number ${data.fileNumber} already exists`);
    }
  }

  // Create patient
  const patient = await prisma.patient.create({
    data: {
      patientNumber,
      fileNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      alternatePhone: data.alternatePhone,
      address: data.address,
      city: data.city || 'Nairobi',
      state: data.state,
      zipCode: data.zipCode,
      country: data.country || 'Kenya',
      occupation: data.occupation,
      bloodType: data.bloodType,
      status: PatientStatus.ACTIVE,
      lifecycleState: 'REGISTERED',
      createdBy,
    },
  });

  // Create next of kin contact if provided
  if (data.nextOfKinFirstName || data.nextOfKinLastName) {
    await prisma.patientContact.create({
      data: {
        patientId: patient.id,
        firstName: data.nextOfKinFirstName || '',
        lastName: data.nextOfKinLastName || '',
        relationship: data.nextOfKinRelationship || 'UNKNOWN',
        phone: data.nextOfKinContact,
        isNextOfKin: true,
        isEmergencyContact: true,
        createdBy,
      },
    });
  }

  return patient.id;
}

/**
 * Main import function
 */
async function importPatients(excelPath: string, createdBy?: string) {
  console.log('📊 Reading Excel file:', excelPath);

  // Check if file exists
  if (!fs.existsSync(excelPath)) {
    throw new Error(`File not found: ${excelPath}`);
  }

  // Read Excel file
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

  if (rows.length === 0) {
    throw new Error('Excel file is empty or has no data rows');
  }

  console.log(`📋 Found ${rows.length} rows in sheet "${sheetName}"`);

  // Build column mapping
  const columnMap = new Map<string, string>();
  const firstRow = rows[0];
  for (const colName of Object.keys(firstRow)) {
    const normalized = normalizeColumnName(colName);
    columnMap.set(colName, normalized);
  }

  console.log('📝 Column mappings:');
  for (const [excelCol, standardCol] of columnMap.entries()) {
    console.log(`   ${excelCol} → ${standardCol}`);
  }

  // Get admin user for createdBy if not provided
  let adminUserId: string | undefined = createdBy;
  if (!adminUserId) {
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@nairobi-sculpt.com' },
      select: { id: true },
    });
    adminUserId = adminUser?.id;
  }

  // Process rows
  const results = {
    total: rows.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ row: number; name: string; error: string }>,
    duplicates: [] as Array<{ row: number; name: string; reason: string }>,
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because Excel rows are 1-indexed and we have header

    try {
      // Parse row
      const patientData = parseRow(row, columnMap);
      if (!patientData) {
        results.skipped++;
        console.log(`⏭️  Row ${rowNum}: Skipped (missing required fields)`);
        continue;
      }

      const patientName = `${patientData.firstName} ${patientData.lastName}`;

      // Check for duplicates
      const duplicateCheck = await checkDuplicate(patientData);
      if (duplicateCheck.isDuplicate) {
        results.duplicates.push({
          row: rowNum,
          name: patientName,
          reason: duplicateCheck.reason || 'Unknown',
        });
        results.skipped++;
        console.log(`⚠️  Row ${rowNum} (${patientName}): Duplicate - ${duplicateCheck.reason}`);
        continue;
      }

      // Create patient
      const patientId = await createPatient(patientData, adminUserId);
      results.success++;
      console.log(`✅ Row ${rowNum} (${patientName}): Created successfully (ID: ${patientId})`);

    } catch (error: any) {
      results.failed++;
      const patientName = row[Object.keys(row)[0]] || `Row ${rowNum}`;
      const errorMsg = error.message || String(error);
      results.errors.push({
        row: rowNum,
        name: String(patientName),
        error: errorMsg,
      });
      console.error(`❌ Row ${rowNum} (${patientName}): ${errorMsg}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total rows processed: ${results.total}`);
  console.log(`✅ Successfully imported: ${results.success}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.duplicates.length > 0) {
    console.log(`\n⚠️  Duplicates found (${results.duplicates.length}):`);
    results.duplicates.forEach((dup) => {
      console.log(`   Row ${dup.row} (${dup.name}): ${dup.reason}`);
    });
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ Errors (${results.errors.length}):`);
    results.errors.forEach((err) => {
      console.log(`   Row ${err.row} (${err.name}): ${err.error}`);
    });
  }

  console.log('='.repeat(60));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx ts-node prisma/import-patients-from-excel.ts <path-to-excel-file>');
    console.error('\nExamples:');
    console.error('  # Running in Docker (file in backend directory):');
    console.error('  docker-compose exec backend npx ts-node prisma/import-patients-from-excel.ts "NS CLIENT FILES -.xlsx"');
    console.error('  # Running locally:');
    console.error('  npx ts-node prisma/import-patients-from-excel.ts "../NS CLIENT FILES -.xlsx"');
    process.exit(1);
  }

  // Handle file path - if relative, resolve from current working directory
  // In Docker, /app is the working directory (maps to ./backend on host)
  // On host, we might be in backend/ or project root
  let excelPath = args[0];
  
  // If path doesn't start with /, it's relative
  if (!path.isAbsolute(excelPath)) {
    // Try resolving from current directory first
    if (fs.existsSync(excelPath)) {
      excelPath = path.resolve(excelPath);
    } else {
      // Try resolving from parent directory (for files in project root when running from backend/)
      const parentPath = path.resolve('..', excelPath);
      if (fs.existsSync(parentPath)) {
        excelPath = parentPath;
      } else {
        // Try resolving from project root (for Docker)
        const rootPath = path.resolve('/', 'app', '..', excelPath);
        if (fs.existsSync(rootPath)) {
          excelPath = rootPath;
        } else {
          excelPath = path.resolve(excelPath);
        }
      }
    }
  }

  const createdBy = args[1]; // Optional: user ID to set as createdBy

  try {
    await importPatients(excelPath, createdBy);
    console.log('\n✨ Import completed!');
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { importPatients };
