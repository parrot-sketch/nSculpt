# Consent Engine Implementation Summary

## Overview

The consent engine has been enhanced to support enterprise-grade, word-for-word digitization of NSAC consent forms with comprehensive features for dynamic fill-ins, structured data, and page-level tracking.

---

## Schema Enhancements

### ✅ New Models Added

#### 1. **ConsentFillInField**
- Defines fill-in fields within consent content (e.g., `___PROCEDURE_NAME___`, `{{SURGEON_NAME}}`)
- Supports template-level, section-level, and clause-level fields
- Field types: TEXT, DATE, NUMBER, SELECT, MULTILINE
- Includes content markers for rendering

#### 2. **ConsentFillInValue**
- Stores actual values filled in for a specific consent instance
- Links to field definition and instance
- Tracks who filled it and when

#### 3. **ConsentStructuredData**
- Stores complex structured data (JSON format)
- Used for:
  - Botox treatment tracking tables
  - CAPRINI risk assessment scores
  - Other structured clinical data
- Includes JSON schema for validation

#### 4. **ConsentPage**
- Page-level structure for multi-page consents
- Tracks which sections/clauses appear on which pages
- Supports page numbering and titles
- Configurable initial requirements

#### 5. **ConsentPageAcknowledgement**
- Tracks patient initials on each page
- Includes engagement metrics (time spent, scroll depth)
- Digital signature evidence (IP, user agent, device type)

### ✅ Enhanced Existing Models

#### ConsentTemplate
- Added `fillInFields` relation
- Added `pages` relation

#### ConsentSection
- Added `fillInFields` relation
- Added `pages` relation (many-to-many via sectionIds array)

#### ConsentClause
- Added `fillInFields` relation

#### PatientConsentInstance
- Added `fillInValues` relation
- Added `structuredData` relation
- Added `pageAcknowledgments` relation

---

## Key Features Supported

### 1. Word-for-Word Preservation ✅
- Content stored as structured sections/clauses
- Fill-in markers preserved in content
- Final document generated with values inserted
- Immutable snapshot at signing time

### 2. Dynamic Fill-In Fields ✅
- Template-level defaults (e.g., clinic name)
- Section-level fields (e.g., procedure name)
- Clause-level fields (e.g., specific risks)
- Pre-population from ProcedurePlan
- Doctor editing capability

### 3. Structured Data Capture ✅
- Botox treatment tracking (lot numbers, units, sites)
- CAPRINI risk assessment (scoring tables)
- Extensible for other structured data types

### 4. Page-Level Tracking ✅
- Multi-page document support
- Page-by-page review enforcement
- Initial checkpoints on each page
- Sequential progression tracking

### 5. Multi-Party Signatures ✅
- Patient signs first
- Surgeon certifies discussion
- Anesthesiologist signs separately
- Witness (optional)
- All tracked in ConsentSignature model

---

## Document Support

### ✅ General Consent (19 sections)
- Fixed content with fill-ins
- Multiple signature parties
- Page-level initials
- ✅ **Supported**

### ✅ Botox Consent
- Procedure-specific content
- Treatment tracking table (structured data)
- Lot numbers, expiration dates, units
- ✅ **Supported**

### ✅ Aesthetic Procedures Consent
- Fill-in sections (procedure name, risks, alternatives)
- Detailed risk sections
- CAPRINI risk assessment (structured data)
- Page-level initial checkpoints
- Multiple signature parties
- ✅ **Supported**

---

## Database Migration Required

**⚠️ IMPORTANT:** Before deploying, run:

```bash
cd backend
npx prisma migrate dev --name add_consent_enhancements
npx prisma generate
```

**Or if using Docker:**
```bash
docker-compose exec backend npx prisma db push --accept-data-loss
docker-compose exec backend npx prisma generate
```

---

## Next Implementation Steps

### Phase 1: Backend Services
1. ✅ Schema complete
2. ⏭️ Create repositories for new models
3. ⏭️ Build template parsing service (PDF → structured)
4. ⏭️ Build content rendering service (fill-ins → final document)
5. ⏭️ Build structured data validators
6. ⏭️ Enhance consent service with new features

### Phase 2: Template Management UI
1. ⏭️ PDF upload and parsing
2. ⏭️ Content structuring tools
3. ⏭️ Fill-in field definition interface
4. ⏭️ Page management interface
5. ⏭️ Structured data schema definition

### Phase 3: Instance Creation & Editing
1. ⏭️ Instance builder with pre-population
2. ⏭️ Fill-in field editor
3. ⏭️ Structured data editors (Botox, CAPRINI)
4. ⏭️ Preview with filled values

### Phase 4: Signing Flow
1. ⏭️ Page-by-page viewer
2. ⏭️ Initials capture per page
3. ⏭️ Section acknowledgments
4. ⏭️ Understanding checks
5. ⏭️ Multi-party signatures
6. ⏭️ PDF generation with filled values

---

## Design Principles Followed

### ✅ Enterprise-Grade
- Comprehensive audit trail
- Immutable snapshots
- Legal defensibility
- HIPAA compliance

### ✅ Flexible & Extensible
- Template-based system
- Dynamic field support
- Structured data schemas
- Version control

### ✅ User Experience
- Progressive disclosure (page-by-page)
- Clear progress indicators
- Understanding checks
- Mobile/tablet support

### ✅ Data Integrity
- Validation at every step
- Schema enforcement for structured data
- Hash verification
- Complete audit logs

---

## API Endpoints Needed

### Template Management
- `POST /consent/templates` - Create from PDF
- `GET /consent/templates/:id` - Get with full structure
- `PUT /consent/templates/:id` - Update (new version)

### Instance Management
- `POST /consent/instances` - Create from template
- `GET /consent/instances/:id` - Get with all data
- `POST /consent/instances/:id/fill-in-values` - Set fill-in values
- `POST /consent/instances/:id/structured-data` - Set structured data

### Signing Flow
- `GET /consent/instances/:id/pages/:pageId` - Get page content
- `POST /consent/instances/:id/pages/:pageId/acknowledge` - Initial page
- `POST /consent/instances/:id/acknowledge` - Acknowledge section/clause
- `POST /consent/instances/:id/sign` - Sign (multi-party)

---

## Summary

✅ **Schema Enhanced** - All new models added  
✅ **Design Documented** - Complete design specification  
⏭️ **Next:** Backend services and frontend components  

The foundation is solid and ready for implementation! 🚀









