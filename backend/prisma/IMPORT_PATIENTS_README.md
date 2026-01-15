# Import Patients from Excel

This script allows you to import patient data directly from an Excel file into the database.

## Prerequisites

- Node.js and npm installed
- Database connection configured
- Excel file with patient data

## Installation

The required dependencies (`xlsx` and `@types/xlsx`) are already installed. If you need to reinstall:

```bash
cd backend
npm install xlsx @types/xlsx --save-dev
```

## Excel File Format

The script expects an Excel file (`.xlsx` or `.xls`) with patient data. Column names are **case-insensitive** and can be in various formats.

### Required Columns

These columns **must** be present in your Excel file:

- **First Name** (or `firstName`, `First Name`, `FName`)
- **Last Name** (or `lastName`, `Last Name`, `LName`)
- **Date of Birth** (or `dateOfBirth`, `DOB`, `Birth Date`) - Can be in various date formats

### Optional Columns

These columns will be imported if present:

#### Personal Information
- **Middle Name** (or `middleName`, `Middle Name`)
- **Gender** (`MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`)
- **Blood Type** (or `bloodType`, `Blood Type`) - e.g., `A+`, `B-`, `O+`

#### Contact Information
- **Email**
- **Phone** (or `Phone`, `Tel`, `Telephone`)
- **WhatsApp**
- **Alternate Phone** (or `Alternate Phone`, `Phone Secondary`)

#### Address
- **Address** (or `Address`, `Address Line 1`)
- **City** (defaults to "Nairobi" if not provided)
- **State**
- **Zip Code** (or `Zip Code`, `Postal Code`, `Zip`)
- **Country** (defaults to "Kenya" if not provided)

#### Additional
- **Occupation**
- **Patient Number** (or `Patient Number`, `MRN`) - If not provided, will be auto-generated as `MRN-YYYY-XXXXX`
- **File Number** (or `File Number`) - If not provided, will be auto-generated as `NS001`, `NS002`, etc.

#### Next of Kin
- **Next of Kin First Name** (or `Next of Kin First Name`, `NOK First Name`)
- **Next of Kin Last Name** (or `Next of Kin Last Name`, `NOK Last Name`)
- **Next of Kin Relationship** (or `Next of Kin Relationship`, `NOK Relationship`)
- **Next of Kin Contact** (or `Next of Kin Contact`, `Next of Kin Phone`, `NOK Contact`)

## Usage

### Running in Docker (Recommended)

Since the application runs in Docker, you should run the import script inside the Docker container:

```bash
# Copy Excel file to backend directory (if not already there)
cp "NS CLIENT FILES -.xlsx" backend/

# Run the import script inside the backend container
docker-compose exec backend npm run db:import-patients "NS CLIENT FILES -.xlsx"
```

Or using ts-node directly in Docker:

```bash
docker-compose exec backend npx ts-node prisma/import-patients-from-excel.ts "NS CLIENT FILES -.xlsx"
```

**Note**: The Excel file path should be relative to the `/app` directory inside the container (which maps to `./backend` on your host).

### Running Locally (Outside Docker)

If you want to run it locally (requires local database connection):

```bash
cd backend
npm run db:import-patients "../NS CLIENT FILES -.xlsx"
```

Or using ts-node directly:

```bash
cd backend
npx ts-node prisma/import-patients-from-excel.ts "../NS CLIENT FILES -.xlsx"
```

### With Created By User ID

If you want to specify which user should be marked as the creator:

```bash
# In Docker
docker-compose exec backend npx ts-node prisma/import-patients-from-excel.ts "NS CLIENT FILES -.xlsx" <user-id>

# Locally
npx ts-node prisma/import-patients-from-excel.ts "../NS CLIENT FILES -.xlsx" <user-id>
```

If not provided, the script will use the admin user (`admin@nairobi-sculpt.com`) if available.

## How It Works

1. **Reads Excel File**: The script reads the first sheet of the Excel file
2. **Maps Columns**: Automatically maps Excel column names to database fields (case-insensitive)
3. **Validates Data**: Checks for required fields (firstName, lastName, dateOfBirth)
4. **Generates IDs**: Auto-generates `patientNumber` (MRN-YYYY-XXXXX) and `fileNumber` (NS001) if not provided
5. **Checks Duplicates**: Prevents duplicate imports by checking:
   - Email (if provided)
   - Phone number (if provided)
   - First Name + Last Name + Date of Birth
6. **Creates Patients**: Inserts patient records into the database
7. **Creates Contacts**: Creates next of kin contact records if provided
8. **Reports Results**: Shows summary of successful imports, duplicates, and errors

## Date Format Support

The script supports various date formats:
- `YYYY-MM-DD` (e.g., `2024-01-15`)
- `MM/DD/YYYY` (e.g., `01/15/2024`)
- `MM-DD-YYYY` (e.g., `01-15-2024`)
- `YYYY/MM/DD` (e.g., `2024/01/15`)
- Excel serial dates (numbers)

## Example Excel File Structure

| First Name | Last Name | Date of Birth | Email | Phone | City | Occupation |
|------------|-----------|---------------|-------|-------|------|------------|
| John | Doe | 1990-05-15 | john@example.com | +254712345678 | Nairobi | Engineer |
| Jane | Smith | 1985-08-20 | jane@example.com | +254723456789 | Mombasa | Doctor |

## Output

The script provides detailed output:

```
📊 Reading Excel file: ../NS CLIENT FILES -.xlsx
📋 Found 150 rows in sheet "Sheet1"
📝 Column mappings:
   First Name → firstName
   Last Name → lastName
   Date of Birth → dateOfBirth
   Email → email
   Phone → phone
   ...

✅ Row 2 (John Doe): Created successfully (ID: abc123...)
✅ Row 3 (Jane Smith): Created successfully (ID: def456...)
⚠️  Row 4 (Bob Johnson): Duplicate - Email: bob@example.com
❌ Row 5 (Invalid Patient): Invalid date of birth

============================================================
📊 IMPORT SUMMARY
============================================================
Total rows processed: 150
✅ Successfully imported: 148
⏭️  Skipped: 1
❌ Failed: 1
============================================================
```

## Error Handling

The script handles various error scenarios:

- **Missing Required Fields**: Rows without firstName, lastName, or valid dateOfBirth are skipped
- **Duplicate Patients**: Detected duplicates are reported but not imported
- **Invalid Dates**: Rows with unparseable dates are marked as failed
- **Database Errors**: Any database errors are caught and reported

## Notes

- The script uses **upsert logic** for patient numbers and file numbers - if you provide them, they must be unique
- Duplicate checking is comprehensive - a patient won't be imported if they match by email, phone, or name+DOB
- Next of kin contacts are automatically created in the `patient_contacts` table
- All patients are created with status `ACTIVE` and lifecycle state `REGISTERED`
- The script preserves existing data - it only creates new patients, it doesn't update existing ones

## Troubleshooting

### "File not found"
- Make sure the path to the Excel file is correct
- Use absolute paths if relative paths don't work
- On Windows, you may need to escape spaces: `"../NS CLIENT FILES -.xlsx"`

### "Invalid date of birth"
- Check that date columns contain valid dates
- Try formatting dates in Excel as "Date" format before saving
- The script supports various date formats, but some edge cases may fail

### "Duplicate" errors
- This is expected behavior - the script prevents duplicate imports
- Check if the patient already exists in the database
- You can manually update existing patients through the admin interface

### "Patient number already exists"
- If you're providing custom patient numbers, make sure they're unique
- The script will auto-generate numbers if you don't provide them

## Best Practices

1. **Backup First**: Always backup your database before running bulk imports
2. **Test with Small File**: Test with a small subset first (10-20 rows) before importing the full file
3. **Review Excel File**: Make sure your Excel file has proper column headers
4. **Check Results**: Review the import summary to ensure all expected patients were imported
5. **Handle Duplicates**: Review duplicate reports to decide if you need to update existing records manually
