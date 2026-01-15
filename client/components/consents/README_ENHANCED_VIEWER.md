# Enhanced PDF Consent Viewer - Architecture & Usage

## 🎯 **Overview**

The Enhanced PDF Viewer provides an **ultimate user experience** for reviewing and signing consent documents, following **best engineering practices** and **enterprise-grade UX patterns**.

---

## 🏗️ **Architecture**

### **Component Structure** (Single Responsibility Principle)

```
EnhancedPDFViewer/
├── EnhancedPDFViewer.tsx      # Main container component
├── SignatureProgressBar        # Progress tracking component
├── SignatureFieldOverlay       # Individual signature field overlay
└── useConsentSignatures.ts     # Business logic hook (custom hook pattern)
```

### **Separation of Concerns**

| Layer | Responsibility | Location |
|-------|----------------|----------|
| **Presentation** | UI rendering, layout, styling | `EnhancedPDFViewer.tsx` |
| **Business Logic** | Signature validation, progress calculation | `useConsentSignatures.ts` |
| **Data Fetching** | API calls, caching | React Query in hook |
| **State Management** | Local UI state | React useState/useRef |

---

## ✨ **Key Features**

### 1. **Responsive Full-Width Layout**
- ✅ Auto-calculates optimal zoom based on container size
- ✅ Utilizes full horizontal space
- ✅ Maintains aspect ratio
- ✅ Smooth zoom transitions

### 2. **Interactive Signature Fields**
- ✅ Visual overlays showing signature locations
- ✅ Color-coded by signer type:
  - 🔵 **Blue**: Patient
  - 🟣 **Purple**: Guardian
  - 🟢 **Green**: Doctor
  - 🟡 **Amber**: Nurse Witness
  - ⚫ **Gray**: Admin
- ✅ Click-to-sign workflow
- ✅ Real-time status updates

### 3. **Progress Tracking**
- ✅ Visual progress bar
- ✅ Percentage completion
- ✅ Pending signature count
- ✅ Completion validation

### 4. **Keyboard Shortcuts** (Accessibility)
- `←` / `→` : Navigate pages
- `+` / `-` : Zoom in/out
- `F` : Fullscreen toggle

### 5. **Validation & Business Rules**
- ✅ Status-based signing rules
- ✅ Document locking enforcement
- ✅ Required signature validation
- ✅ Role-based permissions (TODO: backend)

---

## 🎨 **UX Patterns Implemented**

### 1. **Progressive Disclosure**
- Shows only relevant information at each step
- Signature modal appears only when needed

### 2. **Visual Feedback**
- Hover states on interactive elements
- Active field highlighting
- Loading states during API calls
- Success/error notifications (TODO)

### 3. **Error Prevention**
- Disabled states for invalid actions
- Clear visual indicators for required fields
- Validation before submission

### 4. **Consistency**
- Consistent color coding
- Predictable interaction patterns
- Standard iconography

---

## 📊 **Data Flow**

```
┌─────────────────────────────────────────────────────────────┐
│                    EnhancedPDFViewer                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              useConsentSignatures()                    │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         React Query (Data Layer)                 │  │  │
│  │  │  ┌───────────────────┐  ┌────────────────────┐  │  │  │
│  │  │  │ GET /signatures   │  │ GET /template-     │  │  │  │
│  │  │  │                   │  │     fields         │  │  │  │
│  │  │  └───────────────────┘  └────────────────────┘  │  │  │
│  │  │             │                      │             │  │  │
│  │  │             v                      v             │  │  │
│  │  │  ┌─────────────────────────────────────────┐   │  │  │
│  │  │  │     Merge & Calculate Progress          │   │  │  │
│  │  │  └─────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  Returns:                                               │  │
│  │  - signatureFields[]                                    │  │
│  │  - progress { total, signed, pending, percentComplete } │  │
│  │  - submitSignature()                                    │  │
│  │  - validation functions                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          v                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Render UI Components                      │  │
│  │  - SignatureProgressBar                                │  │
│  │  - PDF Iframe                                          │  │
│  │  - SignatureFieldOverlay (foreach field)              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  User Interaction:                                          │
│  1. Click signature field                                   │
│  2. Open SignatureModal                                     │
│  3. Draw/Type/Upload signature                              │
│  4. Submit → POST /signatures                               │
│  5. Refetch & update UI                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Usage**

### Basic Implementation

```typescript
import { EnhancedPDFViewer } from '@/components/consents/EnhancedPDFViewer';

function ConsentSigningPage({ consentId }: { consentId: string }) {
  const { data: consent } = useQuery(['pdf-consents', consentId], fetchConsent);

  if (!consent) return <LoadingSpinner />;

  return (
    <EnhancedPDFViewer
      consentId={consentId}
      consent={consent}
      onSignatureComplete={(signature) => {
        console.log('Signature completed:', signature);
        // Optional: Show success toast, redirect, etc.
      }}
    />
  );
}
```

### With Custom Signature Fields

```typescript
const customFields: SignatureField[] = [
  {
    id: 'patient-sig-1',
    signerType: 'PATIENT',
    required: true,
    pageNumber: 15,
    x: 100,
    y: 700,
    width: 200,
    height: 60,
    signed: false,
  },
  // ... more fields
];

<EnhancedPDFViewer
  consentId={consentId}
  consent={consent}
  signatureFields={customFields}
/>
```

### Using the Hook Separately

```typescript
import { useConsentSignatures } from '@/hooks/useConsentSignatures';

function CustomComponent({ consentId, consent }) {
  const {
    signatureFields,
    progress,
    submitSignature,
    canSignField,
    getNextUnsignedField,
  } = useConsentSignatures(consentId, consent);

  // Use progress for custom UI
  console.log(`${progress.percentComplete}% complete`);

  // Get next field to sign
  const nextField = getNextUnsignedField();

  // Validate before signing
  const { canSign, reason } = canSignField(signatureFields[0]);
}
```

---

## 🎯 **Best Practices Implemented**

### 1. **React Patterns**
- ✅ Custom hooks for reusable logic
- ✅ Component composition
- ✅ Controlled vs uncontrolled components (properly managed)
- ✅ Proper TypeScript typing
- ✅ Memoization (useMemo, useCallback)

### 2. **State Management**
- ✅ React Query for server state
- ✅ Local state for UI concerns only
- ✅ Derived state (computed from source of truth)
- ✅ Optimistic updates

### 3. **Performance**
- ✅ Lazy loading
- ✅ Debounced/throttled handlers
- ✅ Query caching (React Query)
- ✅ Proper re-render optimization

### 4. **Accessibility**
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ ARIA labels (can be enhanced)
- ✅ Color contrast (WCAG AA compliant)

### 5. **Error Handling**
- ✅ Graceful degradation
- ✅ User-friendly error messages
- ✅ Validation before actions
- ✅ Loading states

---

## 🚀 **Backend Requirements**

### Required API Endpoints

#### 1. Get Signature Fields from Template
```
GET /api/v1/consent-templates/:templateId/signature-fields
Response:
[
  {
    "id": "field-1",
    "signerType": "PATIENT",
    "required": true,
    "pageNumber": 15,
    "x": 100,
    "y": 700,
    "width": 200,
    "height": 60,
    "label": "Patient Signature"
  }
]
```

#### 2. Get Signatures for Consent
```
GET /api/v1/consents/:id/signatures
Response:
[
  {
    "id": "sig-1",
    "consentId": "...",
    "signerType": "PATIENT",
    "signerName": "John Doe",
    "signatureUrl": "/uploads/signatures/...",
    "pageNumber": 15,
    "x": 100,
    "y": 700,
    "width": 200,
    "height": 60,
    "signedAt": "2026-01-07T10:00:00Z"
  }
]
```

#### 3. Submit Signature
```
POST /api/v1/consents/:id/signatures
Body:
{
  "signerType": "PATIENT",
  "signerName": "John Doe",
  "signatureData": "data:image/png;base64,...",
  "signatureMethod": "DRAW",
  "pageNumber": 15,
  "x": 100,
  "y": 700,
  "width": 200,
  "height": 60
}
```

---

## 📈 **Future Enhancements**

### Phase 1 (Current)
- ✅ Responsive layout
- ✅ Signature field overlays
- ✅ Progress tracking
- ✅ Basic validation

### Phase 2 (Next)
- 🔄 Backend API integration
- 🔄 Real-time collaboration (WebSockets)
- 🔄 Audit trail visualization
- 🔄 Advanced annotations

### Phase 3 (Future)
- 📋 Multi-document batch signing
- 📋 Template builder UI
- 📋 AI-powered field detection
- 📋 E-signature compliance (DocuSign-like)

---

## 🐛 **Troubleshooting**

### Issue: Signature fields not showing
**Solution:** Check that:
1. Template has signature fields defined
2. PDF is loaded correctly
3. Current page matches field's pageNumber

### Issue: Progress bar not updating
**Solution:** 
1. Verify React Query cache invalidation
2. Check network tab for API responses
3. Ensure signatures query is enabled

### Issue: Cannot sign field
**Solution:** Check:
1. Document status allows signing
2. Document is not locked
3. User has permission for that signer type

---

## 📚 **Additional Resources**

- [React Query Documentation](https://tanstack.com/query/latest)
- [Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [E-Signature Compliance](https://www.docusign.com/how-it-works/legality/global)

---

## 👥 **Contributing**

When enhancing this component:
1. Follow existing patterns
2. Add TypeScript types
3. Write unit tests
4. Update this documentation
5. Consider accessibility

---

**Built with ❤️ following enterprise best practices**





