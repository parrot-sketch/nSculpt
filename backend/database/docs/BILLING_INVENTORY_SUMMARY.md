# Billing & Inventory Domains - Implementation Summary

## Overview

Two critical foundational domains have been added to the Enterprise Surgical EHR schema:

1. **Billing** - Complete revenue cycle management
2. **Inventory** - Equipment and supply management

---

## Billing Domain

### Models Added (14 tables)

#### Insurance Management
- **InsuranceProvider**: Insurance companies with payer IDs, contact information
- **InsurancePolicy**: Patient insurance policies with coverage details (deductible, copay, coinsurance)
  - Supports primary, secondary, and tertiary insurance
  - Tracks subscriber information

#### Pricing & Codes
- **BillingCode**: CPT, ICD-10, HCPCS codes with default pricing
- **FeeSchedule**: Flexible pricing schedules
  - Can be scoped to insurance provider or cash pay
  - Time-bound with effective/expiration dates
- **FeeScheduleItem**: Individual code pricing within schedules

#### Charges & Invoicing
- **Charge**: Individual billable items
  - Linked to cases, records, billing codes
  - Supports quantity-based billing, discounts
  - Tracks service dates and status
- **Invoice**: Bills sent to patients/insurance
  - Groups multiple charges
  - Tracks payment status and balances
- **InvoiceItem**: Line items on invoices

#### Payments
- **Payment**: Payment tracking
  - Multiple payment methods (cash, check, credit card, ACH, wire, insurance)
  - Supports patient, insurance, and third-party payments
- **PaymentAllocation**: Flexible allocation of payments
  - Can allocate to multiple charges/invoices
  - Tracks unallocated amounts

#### Claims Processing
- **Claim**: Insurance claims
  - Supports EDI formats (X12 837P, 837I)
  - Tracks submission, response, and payment
  - Stores EDI files for audit
- **ClaimItem**: Line items on claims

#### Payment Plans
- **PaymentPlan**: Installment payment plans
  - Supports down payments and monthly installments
  - Automatic due date calculation
- **PaymentPlanInstallment**: Individual installment tracking

### Key Features

✅ **Complete Revenue Cycle**:
- Charge capture → Invoice generation → Payment processing → Claims submission

✅ **Insurance Support**:
- Multiple insurance tiers
- EDI claim submission
- Response tracking (835, 277)

✅ **Flexible Pricing**:
- Fee schedules by insurance provider
- Discounts and adjustments
- Default pricing from billing codes

✅ **Payment Flexibility**:
- Multiple payment methods
- Partial payments
- Payment plans for large balances

---

## Inventory Domain

### Models Added (9 tables)

#### Vendor & Catalog
- **Vendor**: Supplier information
  - Contact details, payment terms
  - Account numbers for procurement
- **InventoryCategory**: Hierarchical categorization
  - Supports parent/child relationships
  - Categories: Equipment, Supplies, Implants, etc.
- **InventoryItem**: Master catalog
  - Equipment vs. Supplies distinction
  - Equipment-specific: calibration requirements, FDA clearance
  - Reorder points and quantities
  - Track serial numbers, lot numbers, expiration dates

#### Stock Management
- **InventoryStock**: Current stock levels
  - Quantity on hand, reserved, available
  - Lot/serial number tracking
  - Expiration date tracking
  - Cost tracking (FIFO/LIFO support)
- **InventoryTransaction**: Complete audit trail
  - Transaction types: RECEIPT, ISSUE, ADJUSTMENT, RETURN, TRANSFER, ALLOCATION, DEALLOCATION
  - Links to purchase orders and cases
  - Batch/lot tracking

#### Procurement
- **PurchaseOrder**: Purchase order management
  - Vendor relationships
  - Order and delivery date tracking
- **PurchaseOrderItem**: Line items
  - Quantity ordered vs. received
  - Partial receipt support

#### Equipment Management
- **EquipmentAssignment**: Location tracking
  - Assigns equipment to theaters, departments, storage
  - Assignment/unassignment history
- **EquipmentMaintenance**: Maintenance and calibration
  - Scheduled maintenance tracking
  - Calibration certificates
  - Service provider information
  - Cost tracking

### Key Features

✅ **Complete Inventory Management**:
- Item catalog → Stock tracking → Transactions → Procurement

✅ **Dual Item Types**:
- **Equipment**: Fixed assets requiring maintenance/calibration
- **Supplies**: Consumables with stock levels

✅ **Advanced Tracking**:
- Lot numbers for supplies
- Serial numbers for equipment
- Expiration dates
- Location-based stock

✅ **Procurement Workflow**:
- Purchase order creation
- Partial receipt tracking
- Vendor management

✅ **Equipment Lifecycle**:
- Assignment to locations
- Maintenance scheduling
- Calibration tracking with certificates

---

## Integration Points

### Billing ↔ Theater
- Charges can link to `SurgicalCase` via `caseId`
- Cases generate charges for procedures

### Billing ↔ Medical Records
- Charges can link to `MedicalRecord` via `recordId`
- Documentation supports billing

### Inventory ↔ Theater
- `ResourceAllocation` can reference inventory items
- Cases consume supplies tracked in inventory
- Equipment assigned to theaters tracked

### Inventory ↔ Cases
- Inventory transactions can link to `SurgicalCase`
- Track supply usage per case

---

## Database Statistics

- **Total Models**: 32 (added 23 models)
- **Total Tables**: ~32 tables
- **Schema Files**: 9 domain files
- **Lines of Schema**: ~1660 lines (merged)

---

## Next Steps

### Recommended Enhancements

1. **Billing**:
   - Integration with payment gateways
   - Automated claim submission workflows
   - Denial management tracking
   - Collections workflow

2. **Inventory**:
   - Barcode scanning support
   - Automated reorder triggers
   - Supplier performance metrics
   - Cost analysis reports

3. **Integration**:
   - Real-time charge capture from cases
   - Automatic inventory deduction on case completion
   - Equipment availability checks during scheduling

---

## Compliance Considerations

### Billing
- **HIPAA**: Payment information is PHI
- **PCI DSS**: Credit card processing requires compliance
- **SOX**: Financial reporting requirements
- **Regulatory**: Insurance claim requirements vary by state

### Inventory
- **FDA**: Medical device tracking requirements
- **Regulatory**: Equipment calibration for certain devices
- **Financial**: Asset depreciation tracking

---

## Documentation

For detailed design decisions, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Section 5 (Billing) and Section 6 (Inventory)
- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) - Billing and Inventory domain diagrams
- [DESIGN_SUMMARY.md](./DESIGN_SUMMARY.md) - Requirements met section












