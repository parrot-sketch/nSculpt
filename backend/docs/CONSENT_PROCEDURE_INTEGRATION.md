# Consent & Procedure Integration - Complete Workflow

## Overview

This document explains how **Consents** and **Procedure Plans** integrate in the aesthetic surgery workflow.

---

## Answer: Yes, Consents ARE Related to Procedures

### Two Types of Consents

**1. General Consent** (`ConsentTemplate.templateType = GENERAL`)
- **When:** First consultation/registration
- **Purpose:** One-time consent for privacy, photography, data use
- **Links to:** `Consultation`
- **Applies to:** All future procedures
- **Signs once:** Stays active indefinitely

**2. Procedure-Specific Consent** (`ConsentTemplate.templateType = PROCEDURE_SPECIFIC`)
- **When:** After procedure plan created
- **Purpose:** Consent for specific surgical procedure
- **Links to:** `ProcedurePlan` → `SurgicalCase`
- **Applies to:** One specific procedure
- **Must sign:** Before each surgery

---

## Complete Workflow: Consultation → Procedure Plan → Consent → Surgery

### Step 1: Initial Consultation (First Visit)

```
Patient arrives for consultation
  ↓
System creates Consultation record
  ↓
[OPTIONAL] General Consent presented
  - Template: "GENERAL_CONSENT_V1"
  - Links to: Consultation
  - Signed once, applies to all procedures
```

### Step 2: Procedure Plan Created

```
Doctor discusses procedure with patient
  ↓
System creates ProcedurePlan
  - Links to: Consultation
  - Links to: Patient
  - Contains: Procedure details, CPT codes, inventory needs
  ↓
System determines: procedureType
  - COSMETIC → No insurance, cash-pay
  - RECONSTRUCTIVE → Insurance required, needs prior auth
  - HYBRID → Split billing
```

### Step 3: Procedure-Specific Consent Required

```
Procedure Plan created with CPT code (e.g., "19325")
  ↓
System finds matching ConsentTemplate
  - Queries: ConsentTemplate WHERE procedureCode = "19325" AND templateType = "PROCEDURE_SPECIFIC"
  ↓
System creates PatientConsentInstance
  - Links to: ProcedurePlan (procedurePlanId)
  - Links to: Consultation (consultationId)
  - Links to: ConsentTemplate (templateId)
  ↓
System determines required parties from ConsentTemplateRequiredParty
  - Example: PATIENT, SURGEON, WITNESS (configured per template)
```

### Step 4: Consent Signing Process

```
Patient reviews consent sections:
  - ConsentSection: "Procedure Explanation"
  - ConsentSection: "Risks & Complications"
  - ConsentSection: "Benefits & Limitations"
  - ConsentSection: "Alternatives"
  - etc.
  
For each section:
  - PatientConsentAcknowledgement created
  - Understanding check (if required)
  - Time tracking, scroll depth logged
  
Signatures collected:
  - ConsentSignature: PATIENT signed
  - ConsentSignature: SURGEON signed
  - ConsentSignature: WITNESS signed
  
When ALL required parties signed:
  - Status: SIGNED
  - ConsentDocumentSnapshot created (exact wording preserved)
  - ConsentArtifact generated (signed PDF)
```

### Step 5: Plan Approval & Scheduling

```
Patient approves Procedure Plan
  - Status: APPROVED
  - approvedAt timestamp set
  
Create SurgicalCase
  - Links to: ProcedurePlan (copies details)
  - Links to: PatientConsentInstance (relatedCaseId)
  - Pre-op validation:
    ✅ Consent.status = SIGNED
    ✅ All required parties signed
    ✅ Consent not expired
```

### Step 6: Pre-Op Checklist

```
Before surgery, system validates:
  ✅ Procedure Plan: status = APPROVED
  ✅ Consent: status = SIGNED
  ✅ All required parties signed
  ✅ Prior authorization approved (if reconstructive)
  ✅ Inventory available/pre-allocated
```

### Step 7: Surgery & Inventory Consumption

```
During surgery:
  - Record inventory usage
  - Link to: SurgicalCase
  - Link to: ProcedurePlan (via case)
  - Attach implant serial numbers
```

### Step 8: Billing

```
After surgery:
  - BillLineItem created
  - Uses CPT codes from ProcedurePlan
  - Links to: SurgicalCase
  - Links to: ProcedurePlan (via case)
```

---

## Integration Points in Schema

### ProcedurePlan → Consent

```prisma
PatientConsentInstance {
  procedurePlanId String? // Links to ProcedurePlan
}

ProcedurePlan {
  consentInstance PatientConsentInstance? // One consent per plan
}
```

**Relationship:** One ProcedurePlan can have one PatientConsentInstance (1:1)

### Consultation → Procedure Plan → Consent

```prisma
Consultation {
  procedurePlans ProcedurePlan[]
}

ProcedurePlan {
  consultationId String?
  consentInstance PatientConsentInstance?
}

PatientConsentInstance {
  consultationId String?
  procedurePlanId String?
}
```

**Flow:** Consultation → ProcedurePlan → Consent (all linked)

### SurgicalCase → ProcedurePlan → Consent

```prisma
SurgicalCase {
  procedurePlan ProcedurePlan?
}

ProcedurePlan {
  surgicalCase SurgicalCase?
}

PatientConsentInstance {
  relatedCaseId String? // Links to SurgicalCase
}
```

**Flow:** SurgicalCase ← ProcedurePlan → Consent (all connected)

---

## Example: Complete Flow

### Scenario: Patient wants breast augmentation

**1. First Consultation**
```
Consultation created
  ↓
General Consent presented and signed
  - Applies to all future procedures
```

**2. Procedure Planning**
```
Doctor creates ProcedurePlan:
  - procedureName: "Breast Augmentation"
  - procedureType: COSMETIC
  - primaryCPTCode: "19325"
  - estimatedCost: $8,000
  
Add Inventory Requirements:
  - Breast implants: 300cc Round (2)
  - Sutures: 1 pack
```

**3. Procedure-Specific Consent**
```
System finds template: "BREAST_AUG_CONSENT_V2"
  - Matches CPT code: "19325"
  - templateType: PROCEDURE_SPECIFIC

Creates PatientConsentInstance:
  - procedurePlanId: [plan ID]
  - consultationId: [consultation ID]
  
Required Parties (from template):
  1. PATIENT (order=1)
  2. SURGEON (order=2)
  3. WITNESS (order=3)
```

**4. Patient Signs**
```
Patient reviews sections:
  - Acknowledges each section
  - Passes understanding checks
  - Signs: ConsentSignature (PATIENT)
  
Surgeon signs:
  - ConsentSignature (SURGEON)
  
Nurse witnesses:
  - ConsentSignature (WITNESS)
  
All parties signed:
  - Status: SIGNED
  - ConsentDocumentSnapshot created
  - Signed PDF generated
```

**5. Plan Approval**
```
Patient approves plan:
  - Status: APPROVED
  - approvedAt set
```

**6. Schedule Surgery**
```
Create SurgicalCase:
  - Links to: ProcedurePlan
  - Links to: Consent (relatedCaseId)
  - Validates: Consent signed
```

**7. Surgery**
```
Record inventory usage:
  - Implants: SN12345, SN12346
  - Linked to: Case, Plan, Consent
```

**8. Billing**
```
Create BillLineItem:
  - CPT: "19325" (from plan)
  - Links to: Case, Plan
```

---

## Key Integration Rules

### Consent Required Before Surgery

**Validation:**
```typescript
if (procedurePlan.status === APPROVED) {
  if (!procedurePlan.consentInstance) {
    throw Error("Consent required before surgery");
  }
  if (procedurePlan.consentInstance.status !== SIGNED) {
    throw Error("Consent must be signed before surgery");
  }
  // Validate all required parties signed
}
```

### Template Selection by CPT Code

**Logic:**
```typescript
// Find matching consent template
const template = await findTemplate({
  procedureCode: procedurePlan.primaryCPTCode,
  templateType: "PROCEDURE_SPECIFIC",
  isActive: true
});

if (!template) {
  throw Error("No consent template found for procedure");
}
```

### Re-Consent if Plan Changes

**Trigger:**
- Procedure plan significantly modified
- New risks identified
- Template updated (major changes)

**Workflow:**
```
1. Mark existing consent: SUPERSEDED
2. Create new PatientConsentInstance
3. Link to previous: supersedesId
4. Create ConsentVersionHistory entry
5. Patient re-signs new consent
```

---

## Database Queries

### Find Consent for Procedure Plan

```sql
SELECT * FROM patient_consent_instances
WHERE procedure_plan_id = ?
  AND status = 'SIGNED'
ORDER BY signed_at DESC
LIMIT 1;
```

### Find All Procedures Needing Consent

```sql
SELECT pp.* FROM procedure_plans pp
LEFT JOIN patient_consent_instances pci ON pci.procedure_plan_id = pp.id
WHERE pp.status IN ('APPROVED', 'SCHEDULED')
  AND (pci.id IS NULL OR pci.status != 'SIGNED');
```

### Find All Signed Consents for Patient

```sql
SELECT pci.*, pp.procedure_name, pp.primary_cpt_code
FROM patient_consent_instances pci
JOIN procedure_plans pp ON pp.id = pci.procedure_plan_id
WHERE pci.patient_id = ?
  AND pci.status = 'SIGNED'
ORDER BY pci.signed_at DESC;
```

---

## Summary

**Consents ARE related to procedures:**

1. **General Consent:** One-time, links to Consultation
2. **Procedure-Specific Consent:** Required per procedure, links to ProcedurePlan

**Integration Flow:**
```
Consultation
  ↓
Procedure Plan (created from consultation)
  ↓
Consent (required for procedure plan)
  ↓
Surgical Case (requires signed consent)
  ↓
Surgery (inventory consumption)
  ↓
Billing (uses CPT codes from plan)
```

**All linked via foreign keys:**
- `PatientConsentInstance.procedurePlanId` → `ProcedurePlan.id`
- `PatientConsentInstance.relatedCaseId` → `SurgicalCase.id`
- `ProcedurePlan.consultationId` → `Consultation.id`
- `SurgicalCase` inherits from `ProcedurePlan`

Complete traceability from consultation to billing! ✅









