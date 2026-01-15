# Patient Import Results

## Status

The import script is **working correctly**! It successfully imported many patients from your Excel file.

## How to Run

```bash
# From project root
./scripts/import-patients.sh "NS CLIENT FILES -.xlsx"
```

Or manually in Docker:

```bash
# Copy file to backend directory
cp "NS CLIENT FILES -.xlsx" backend/

# Run import
docker-compose exec -T backend npm run db:import-patients "NS CLIENT FILES -.xlsx"
```

## Understanding the Results

### Successful Imports ✅
- Patients with valid data (name, date of birth, etc.) are imported successfully
- Patient numbers and file numbers are auto-generated if not provided
- Next of kin contacts are created automatically

### Duplicates ⚠️
- Patients that already exist in the database (by email, phone, or name+DOB) are skipped
- This is expected behavior - the script prevents duplicate imports
- If you need to update existing patients, do so manually through the admin interface

### Failed Imports ❌
- **Invalid Date of Birth**: Some rows have dates that can't be parsed
  - Common causes:
    - Dates stored as text in unusual formats
    - Empty date fields
    - Invalid date values
  - **Solution**: Review the Excel file and fix date formats, then re-run the import

### Skipped Rows ⏭️
- Rows missing required fields (firstName, lastName, or valid dateOfBirth)
- Empty rows or header rows

## Date Format Support

The script supports these date formats:
- `DD/MM/YYYY` (e.g., 15/05/1990)
- `DD-MM-YYYY` (e.g., 15-05-1990)
- `YYYY-MM-DD` (e.g., 1990-05-15)
- `MM/DD/YYYY` (e.g., 05/15/1990) - US format
- Excel serial dates (numbers)
- Standard JavaScript Date.parse() formats

## Fixing Failed Dates

If you have many failed dates, you can:

1. **Open the Excel file** and check the date column format
2. **Format dates consistently** - Right-click the date column → Format Cells → Date → Choose a format
3. **Re-run the import** - The script will skip already-imported patients (duplicates) and import the fixed ones

## Column Mapping

Your Excel file columns are automatically mapped:
- `CLIENT NAME` → Split into firstName and lastName
- `D.O.B` → dateOfBirth
- `TEL` → phone
- `TEL WHATSAPP` → whatsapp
- `RESIDENCE` → address
- `NEXT OF KIN` → Split into nextOfKinFirstName and nextOfKinLastName
- `RELATIONSHIP` → nextOfKinRelationship
- `FILE NO` → fileNumber (if provided, otherwise auto-generated)

## Next Steps

1. **Review the import summary** to see how many patients were imported
2. **Check failed rows** - Review the error messages to understand what needs fixing
3. **Fix date formats** in Excel if needed
4. **Re-run the import** - Already imported patients will be skipped as duplicates
5. **Verify in database** - Check the admin panel to confirm patients were imported correctly

## Tips

- The script is **idempotent** - you can run it multiple times safely
- Duplicates are automatically detected and skipped
- Patient numbers and file numbers are auto-generated if not provided
- All imports are logged for audit purposes
