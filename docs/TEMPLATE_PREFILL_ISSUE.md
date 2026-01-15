# Template Prefill Issue - Troubleshooting Guide

## Issue
The consent modal does not prefill (show) available consent templates in the dropdown.

## Changes Made

### 1. Added Error Handling
- Added error state display in the template dropdown
- Shows error message if templates fail to load
- Shows "No templates available" message if array is empty

### 2. Added Debugging
- Added console.log statements to debug template fetching
- Logs templates, loading state, and errors when modal opens

### 3. Fixed Template Code Display
- Changed from `template.templateCode` to `template.procedureCode`
- Updated to match actual PDFConsentTemplate interface

## Next Steps for Debugging

1. **Open browser console** when opening GenerateConsentModal
2. **Check console logs** for:
   - "GenerateConsentModal - Templates:" - Should show array of templates
   - "GenerateConsentModal - Templates Loading:" - Should show false when loaded
   - "GenerateConsentModal - Templates Error:" - Should show null/undefined if successful

3. **Check Network Tab**:
   - Look for request to `/api/v1/consents/templates`
   - Check response status (should be 200)
   - Check response body format

4. **Verify Response Format**:
   - Backend should return array directly: `[template1, template2, ...]`
   - Frontend service handles: `Array.isArray(response.data) ? response.data : response.data.data || []`

## Possible Issues

1. **No Templates in Database**: Database might be empty
2. **API Endpoint Issue**: Backend endpoint might be returning wrong format
3. **Authentication Issue**: User might not have permission
4. **Response Format Mismatch**: Backend might be wrapping response in object

## Testing

1. Open GenerateConsentModal
2. Check browser console for logs
3. Check Network tab for API call
4. Verify templates appear in dropdown (if templates exist in DB)








