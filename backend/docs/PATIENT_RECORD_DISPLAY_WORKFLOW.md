# Patient Record Display Workflow

## Required Fields Display Order

The patient record must display the following information in this exact order:

1. **File No.** - Format: NS001, NS002, NS003, etc. (first patient is NS001)
2. **Patient Name** - Single column (FirstName LastName)
3. **Age** - Calculated from Date of Birth
4. **Date of Birth (DOB)**
5. **Email**
6. **Tel** - Primary phone number
7. **WhatsApp** - WhatsApp number
8. **Occupation**
9. **Drug Allergies** - From `patient_allergies` table
10. **Residence** - City (e.g., Nairobi)
11. **Next of Kin** - Name from `patient_contacts` table where `isNextOfKin = true`
12. **Relation to Next of Kin** - Relationship field from `patient_contacts`
13. **Next of Kin Contact** - Phone/email from `patient_contacts`
14. **Doctor in Charge** - Assigned doctor name
15. **Services** - Can be provided when required (model should support)

## Data Model Support

### Current Schema Support:
- ✅ File Number (`fileNumber`) - Currently uses MRN format, needs to be changed to NS001 format
- ✅ Patient Name (`firstName`, `lastName`) - Supported
- ✅ Age - Can be calculated from `dateOfBirth`
- ✅ DOB (`dateOfBirth`) - Supported
- ✅ Email (`email`) - Supported
- ✅ Tel (`phone`) - Supported
- ✅ WhatsApp (`whatsapp`) - Supported
- ✅ Occupation (`occupation`) - Supported
- ✅ Drug Allergies - `patient_allergies` table exists, needs Prisma model
- ✅ Residence (`city`) - Supported
- ✅ Next of Kin - `patient_contacts` table with `isNextOfKin = true`
- ✅ Relation to Next of Kin - `relationship` field in `patient_contacts`
- ✅ Next of Kin Contact - `phone`/`email` in `patient_contacts`
- ✅ Doctor in Charge - `doctorInChargeId` relation
- ⚠️ Services - Need to check if this refers to procedures/consultations or a separate services field

## Implementation Tasks

1. **Update File Number Generation**
   - Change from `MRN-YYYY-XXXXX` to `NS001`, `NS002`, etc.
   - Generate based on total patient count, not year-based

2. **Add PatientAllergy Model to Prisma Schema**
   - Map to existing `patient_allergies` table
   - Include relation to Patient model

3. **Update Patient Repository**
   - Include `allergies` and `contacts` when fetching patient by ID
   - Calculate age from DOB

4. **Update Patient Detail Page**
   - Display all fields in the specified order
   - Format file number as NS001
   - Show allergies as a list
   - Show next of kin information
   - Calculate and display age

5. **Update Patient Service/Type**
   - Include allergies and contacts in response
   - Add age calculation helper






