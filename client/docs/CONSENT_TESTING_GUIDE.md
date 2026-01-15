# PDF Consent Testing Guide for Admin

This guide explains how to test the complete PDF consent workflow as an admin user.

## Prerequisites

1. **Admin Account**: You need to be logged in as an ADMIN user
2. **Patient Record**: You need at least one patient in the system
3. **Consent Template**: You need at least one PDF consent template uploaded

## Complete Workflow

### Step 1: Upload a Consent Template (if not done)

1. Navigate to: **Admin → System Config → Consent Templates**
   - URL: `/admin/system-config/consent-templates`

2. Click **"Upload PDF"** button

3. Select a PDF file and upload it

4. Fill in the template details:
   - Template Name
   - Description
   - Template Type
   - Placeholders (if any, e.g., `{{PATIENT_NAME}}`, `{{DATE}}`)

5. Save the template

### Step 2: Generate a Consent for a Patient

1. Navigate to a patient's profile:
   - Go to **Admin → Patients**
   - Click on any patient

2. Navigate to the **Consents** tab:
   - URL: `/admin/patients/[patient-id]/consents`
   - Or click the "Consents" link in the patient profile

3. Click **"Generate Consent"** button (top right)

4. In the modal:
   - Select a template from the dropdown
   - Fill in any placeholder values (if the template has placeholders)
   - Click **"Generate Consent"**

5. The consent will be created in **DRAFT** status and you'll be taken to the consent viewer

### Step 3: Send Consent for Signature

1. In the consent viewer, you'll see action buttons

2. Click **"Send for Signature"** button
   - This changes the status from `DRAFT` to `READY_FOR_SIGNATURE`
   - The consent is now ready to be signed

### Step 4: Sign the Consent

1. Click **"Sign"** button in the consent viewer

2. The signature panel will open:
   - You can draw your signature
   - Or upload a signature image
   - Or type your name

3. Select your signer type:
   - **PATIENT**: If signing as the patient
   - **DOCTOR**: If signing as the doctor
   - **WITNESS**: If signing as a witness
   - **ADMIN**: If signing as admin (with override)

4. Click **"Sign Consent"**

5. The signature will be added and the consent status will update:
   - If all required signatures are collected → Status becomes `SIGNED`
   - If only some signatures are collected → Status becomes `PARTIALLY_SIGNED`

### Step 5: View Signed Consent

1. Once signed, you can:
   - **View the PDF**: The PDF preview shows the signed document
   - **Download**: Click "Download" to save the PDF
   - **View Signatures**: See all signatures in the timeline

### Step 6: Additional Actions (Optional)

#### Revoke a Consent
1. Click **"Revoke"** button
2. Enter a reason for revocation
3. The consent status changes to `REVOKED`
4. Note: Cannot revoke if surgery is already scheduled

#### Archive a Consent
1. Only available for `SIGNED` or `REVOKED` consents
2. Click **"Archive"** button
3. Enter a reason for archiving
4. The consent is soft-deleted (still accessible for audit)

## Testing Checklist

- [ ] Upload a PDF template
- [ ] Generate a consent from template
- [ ] Send consent for signature
- [ ] Sign as patient
- [ ] Sign as doctor (after patient)
- [ ] View signed PDF
- [ ] Download signed PDF
- [ ] Revoke a consent
- [ ] Archive a consent
- [ ] View archived consents
- [ ] Test error handling (e.g., signing out of order)

## Common Issues & Solutions

### Issue: "No templates available"
**Solution**: Make sure you've uploaded at least one template in the Consent Templates page

### Issue: "Cannot sign - signature order violation"
**Solution**: Patient must sign before doctor. Check the signature order requirements.

### Issue: "PDF not loading"
**Solution**: 
- Check browser console for errors
- Verify the backend is running
- Check that the PDF file exists on the server

### Issue: "Access denied"
**Solution**: 
- Verify you're logged in as ADMIN, DOCTOR, or NURSE
- Front Desk users cannot view or sign consents
- Check RLS (Row-Level Security) - you must have access to the patient

## API Endpoints Used

- `GET /api/v1/consents/templates` - List PDF templates
- `POST /api/v1/consents` - Generate consent
- `POST /api/v1/consents/:id/send-for-signature` - Send for signature
- `POST /api/v1/consents/:id/sign` - Sign consent
- `GET /api/v1/consents/:id` - Get consent details
- `GET /api/v1/consents/:id/download` - Download PDF
- `POST /api/v1/consents/:id/revoke` - Revoke consent
- `POST /api/v1/consents/:id/archive` - Archive consent

## Next Steps

After testing the basic workflow, you can:
1. Test with multiple signers
2. Test signature order enforcement
3. Test revocation rules (e.g., cannot revoke if surgery scheduled)
4. Test RBAC (different roles see different actions)
5. Test RLS (users can only see consents for their patients)









