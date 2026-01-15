# Click-to-Place Signature Feature

## 🎯 Overview

Users can now **click the Sign tool and place signatures anywhere** on the PDF document, not just in pre-defined fields. This works like using a rubber stamp - select your signature and click anywhere on the document to place it.

---

## 🚀 How It Works

### **Step-by-Step Workflow**

```
┌─────────────────────────────────────────────────────┐
│  1. Click "✍️ Sign" tool in left sidebar             │
├─────────────────────────────────────────────────────┤
│  2. Right sidebar opens with saved signatures        │
├─────────────────────────────────────────────────────┤
│  3. Click a signature to select it                   │
│     → Signature now follows your cursor              │
│     → Cursor changes to crosshair                    │
├─────────────────────────────────────────────────────┤
│  4. Click anywhere on the PDF                        │
│     → Signature placed at that location              │
│     → Saved to backend                               │
│     → Appears immediately on document                │
└─────────────────────────────────────────────────────┘
```

---

## 📺 Visual Guide

### **1. Activate Sign Tool**
```
Left Sidebar:
┌─────────────────┐
│  T  │ ✏️  │ ⌫  │
│  ◻  │ 🖼  │ 🔗 │
│ [✍️] │ ⏹  │ ✂  │  ← Click this
└─────────────────┘
```

### **2. Right Sidebar Opens**
```
┌──────────────────────────────────┐
│  Signature List                   │
│  Select a signature, then         │
│  click on PDF                     │
├──────────────────────────────────┤
│  [+ New Signature]               │
│                                   │
│  Saved Signatures (2)            │
│                                   │
│  ┌──────────────────────────┐   │
│  │ John Doe             [🗑] │   │
│  │ ┌──────────────────┐     │   │
│  │ │  John Doe        │     │   │ ← Click to select
│  │ └──────────────────┘     │   │
│  └──────────────────────────┘   │
└──────────────────────────────────┘
```

### **3. Signature Selected - Cursor Preview**
```
┌────────────────────────────────────────┐
│  Signature List                         │
│  ✓ Click on PDF to place signature     │
│  🖱️ Click anywhere on the PDF to place │
├────────────────────────────────────────┤
│  Saved Signatures (2)                  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ John Doe [selected] ✓       [🗑] │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘

PDF Viewer:
┌───────────────────────────────────────┐
│                                       │
│  [Moving preview of signature         │
│   follows your cursor]                │
│   ┌─────────────┐                     │
│   │ John Doe    │ ← Follows mouse     │
│   └─────────────┘                     │
│                                       │
│  Cursor: ✚ (crosshair)                │
└───────────────────────────────────────┘
```

### **4. Click to Place**
```
PDF Viewer:
┌───────────────────────────────────────┐
│  Patient Information                  │
│  Name: _______________                │
│  Date: _______________                │
│                                       │
│  I hereby consent to...               │
│                                       │
│  ┌─────────────────────┐             │
│  │   John Doe          │ ← Placed!   │
│  └─────────────────────┘             │
│                                       │
│  Date: ______________                 │
└───────────────────────────────────────┘
```

---

## 🎨 Visual Feedback

### **Cursor States**

| State | Cursor | Description |
|-------|--------|-------------|
| Normal | `→` | Default cursor |
| Sign tool active (no signature) | `→` | Regular cursor + hint overlay |
| Signature selected | `✚` | Crosshair + moving preview |

### **Signature Preview**

When signature is selected:
- **Dashed blue border** around preview
- **Semi-transparent** (70% opacity)
- **Follows cursor** exactly
- **200x60px** size (default)

### **Placed Signatures**

After placement:
- **Solid green border**
- **Light green background**
- **Full opacity**
- **Permanent** (saved to backend)

---

## 🆚 Two Ways to Sign

### **Method 1: Pre-defined Fields** (Original)
```
Use Case: Consent forms with specific signature areas
         (Patient signature, Doctor signature, etc.)

Process:
1. PDF loads with colored signature fields
2. Click on a field
3. Select/create signature
4. Signature fills that specific field
```

### **Method 2: Click-to-Place** (New!)
```
Use Case: Annotating documents, initialing pages,
         signing arbitrary locations

Process:
1. Click Sign tool in sidebar
2. Select a saved signature
3. Click anywhere on PDF
4. Signature placed at that exact spot
```

**Both methods work together!** You can use fields AND free placement in the same document.

---

## 🔧 Technical Details

### **Placement Calculation**

```typescript
// User clicks at (clientX, clientY)
const container = e.currentTarget.getBoundingClientRect();

// Calculate position relative to PDF
const clickX = e.clientX - rect.left;
const clickY = e.clientY - rect.top;

// Account for zoom and centering
const pdfWidth = 595 * zoom;
const offsetX = (containerWidth - pdfWidth) / 2;

// Get position in PDF coordinates
const x = (clickX - offsetX) / zoom;
const y = (clickY - offsetY) / zoom;
```

### **API Call**

```typescript
POST /api/v1/consents/{consentId}/annotations
{
  "type": "SIGNATURE",
  "content": {
    "signatureName": "John Doe",
    "signatureData": "data:image/png;base64,...",
    "signatureType": "draw"
  },
  "pageNumber": 3,
  "xPosition": 150,
  "yPosition": 400,
  "width": 200,
  "height": 60
}
```

### **State Management**

```typescript
// Selected signature for placement
const [selectedSignatureToPlace, setSelectedSignatureToPlace] = 
  useState<SavedSignature | null>(null);

// Array of placed signatures (per page)
const [placedSignatures, setPlacedSignatures] = useState<Array<{
  id: string;
  signature: SavedSignature;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>>([]);

// Cursor position for preview
const [cursorPosition, setCursorPosition] = 
  useState<{ x: number; y: number } | null>(null);
```

---

## 📋 Use Cases

### **1. Patient Initials on Each Page**
```
Page 1: [JD] ← Initial bottom right
Page 2: [JD] ← Initial bottom right
Page 3: [JD] ← Initial bottom right
```

### **2. Multiple Approvals**
```
Consent Form:
┌──────────────────────────────────┐
│  Procedure: Rhinoplasty          │
│                                   │
│  Approved by:                     │
│  Surgeon: [Dr. Smith signature]  │
│  Nurse:   [Nurse A signature]    │
│  Admin:   [Admin B signature]    │
└──────────────────────────────────┘
```

### **3. Corrections & Annotations**
```
Original Text: The patient will pay $5,000
                                   ^
                            [initials]
                         (correction approved)
```

### **4. Witness Signatures**
```
Main signature field: [Patient signature]

Witnessed by: [Witness 1] ← Click-to-place
             [Witness 2] ← Click-to-place
```

---

## 🎯 Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Cursor Preview** | ✅ | Signature follows cursor |
| **Crosshair Cursor** | ✅ | Visual feedback |
| **Multi-page** | ✅ | Place on any page |
| **Zoom Support** | ✅ | Works at any zoom level |
| **Backend Save** | ✅ | Persists to database |
| **Real-time Display** | ✅ | Shows immediately |
| **Multiple Placements** | ✅ | Same signature multiple times |
| **Undo** | ⏳ | Coming soon |

---

## 🚨 Important Notes

### **Bounds Checking**
Signatures must be placed **within PDF bounds**. Click outside → ignored.

```typescript
// Check if click is within PDF bounds
if (x < 0 || x > 595 - signatureWidth || 
    y < 0 || y > 842 - signatureHeight) {
  console.log('Click outside PDF bounds');
  return;
}
```

### **Z-Index Layering**
```
Bottom → Top:
1. PDF Document (iframe)
2. Pre-defined signature fields
3. Placed signatures
4. Cursor preview
5. Tool hints
```

### **Pointer Events**
- PDF iframe: `pointer-events: none` (clicks pass through)
- Placed signatures: `pointer-events: none` (can't interfere)
- Container: Captures all clicks

---

## 🎬 Complete Example

```typescript
// 1. User clicks Sign tool
setSelectedTool('sign');
setShowSignatureList(true);

// 2. User selects signature
handleSelectSignatureForPlacement(signature);
// → selectedSignatureToPlace = signature
// → cursor changes to crosshair
// → preview follows cursor

// 3. User clicks on PDF at (x: 150, y: 400)
handlePdfClick(event);
// → Calculate position
// → POST to /api/v1/consents/{id}/annotations
// → Add to placedSignatures array
// → Signature appears on PDF

// 4. Result
// Signature visible at exact position
// Saved to backend
// Can repeat for more signatures
```

---

## 💡 Pro Tips

1. **Multiple Initials**: Select signature once, click multiple times
2. **Different Pages**: Change page, signature stays selected
3. **Quick Reset**: Click Sign tool again to deselect
4. **Precise Placement**: Zoom in for pixel-perfect positioning
5. **Saved Forever**: All placements saved to backend

---

## 🔄 Workflow Comparison

### **Before (Field-only)**
```
❌ Can only sign in pre-defined fields
❌ Limited to specific locations
❌ No flexibility for annotations
```

### **After (Field + Click-to-Place)**
```
✅ Sign in pre-defined fields
✅ Place signatures anywhere
✅ Multiple signatures per page
✅ Flexible document annotation
✅ Just like physical documents!
```

---

## 🎉 Result

You now have **two powerful ways** to sign documents:

1. **Structured**: Use pre-defined fields (patient/doctor/witness)
2. **Flexible**: Click anywhere to place signatures/initials

**This matches real-world consent signing workflows perfectly!** 🖊️✨



