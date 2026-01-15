# Patient Intake Workflow - Complete Implementation

## Overview

The patient intake process must be **clear and comprehensive**, collecting ALL required information before creating the user account and saving the patient record. This applies to both:
1. **Front Desk Registration** - Staff creates patient on behalf of patient
2. **Self-Registration** - Patient registers themselves via tablet

## Workflow Steps

### 1. Collect All Information
Both intake methods collect:
- ✅ Personal: firstName, lastName, middleName, dateOfBirth, gender
- ✅ Contact: email, phone, whatsapp
- ✅ Residence: address, city (required), state, zipCode, country
- ✅ Additional: occupation
- ✅ Next of Kin: firstName, lastName, relationship, contact
- ⚠️ Drug Allergies: Can be added after patient creation (via patient_allergies table)

### 2. Create Patient Record
- Generate file number (NS001 format)
- Generate patient number (MRN-YYYY-XXXXX format)
- Save all collected information
- Create next of kin contact record (if provided)

### 3. Create User Account (Self-Registration Only)
- Hash password
- Create User record with PATIENT role
- Link user to patient record

### 4. Return to Front Desk Mode (Self-Registration)
- Automatically switch tablet back to front desk mode
- Show success message with patient number

## Security Considerations

### Patient List Display
- ❌ **NO patient IDs displayed** (security risk)
- ✅ Only show specified attributes:
  1. File No. (NS001)
  2. Patient Name
  3. Age
  4. DOB
  5. Email
  6. Tel
  7. WhatsApp
  8. Occupation
  9. Drug Allergies (in detail view)
  10. Residence
  11. Next of Kin
  12. Relation to Next of Kin
  13. Next of Kin Contact
  14. Doctor in Charge
  15. Services (when required)

### Why No Patient IDs?
- Patient IDs (UUIDs) are internal system identifiers
- Exposing them in lists is a security risk (information disclosure)
- File numbers (NS001) are sufficient for identification
- Patient IDs are only used in URLs (which are already protected by authentication)

## Form Fields Collected

### Front Desk Form (`/admin/patients/new`)
**Sections:**
1. Personal Information
   - First Name* (required)
   - Last Name* (required)
   - Middle Name
   - Date of Birth* (required)
   - Gender
   - Occupation

2. Contact Information
   - Email
   - Tel (Primary Phone)
   - WhatsApp

3. Residence
   - Address
   - City* (required - residence)
   - State/Province
   - ZIP/Postal Code
   - Country

4. Next of Kin
   - First Name
   - Last Name
   - Relation to Next of Kin
   - Next of Kin Contact

5. Note about Drug Allergies
   - Can be added after patient creation

### Self-Registration Form (`/register`)
**5-Step Process:**
1. Personal Information
   - First Name* (required)
   - Last Name* (required)
   - Middle Name
   - Date of Birth* (required)
   - Gender
   - Occupation

2. Contact Information
   - Email* (required - for account)
   - Phone
   - WhatsApp
   - Address
   - City* (required - residence)
   - State/Province
   - ZIP/Postal Code
   - Country

3. Emergency Contact (Next of Kin)
   - First Name
   - Last Name
   - Relationship
   - Contact Phone

4. Account Creation
   - Password* (required)
   - Confirm Password* (required)
   - Password strength indicator

5. Review & Submit
   - Review all information
   - Submit registration
   - Creates patient + user account
   - Auto-returns to front desk mode

## Data Flow

### Front Desk Registration
```
User fills form → Submit → 
  → Create patient record (with all fields)
  → Create next of kin contact (if provided)
  → Redirect to patient detail page
```

### Self-Registration
```
Patient fills 5-step form → Submit →
  → Create patient record (with all fields)
  → Create next of kin contact (if provided)
  → Hash password
  → Create user account (PATIENT role)
  → Link user to patient
  → Auto-return to front desk mode
  → Show success message
```

## Implementation Status

✅ **Patient List** - Updated to show only specified fields, NO patient IDs
✅ **Front Desk Form** - Collects all required information
✅ **Self-Registration Form** - Collects all required information (including occupation and city)
✅ **File Number Generation** - NS001 format
✅ **Next of Kin** - Stored in patient_contacts table
✅ **Drug Allergies** - Can be added via patient_allergies table (after creation)

## Next Steps

- [ ] Add drug allergies form section (optional during intake)
- [ ] Add validation to ensure city is provided
- [ ] Add confirmation step before account creation (self-registration)
- [ ] Add email confirmation workflow (self-registration)






