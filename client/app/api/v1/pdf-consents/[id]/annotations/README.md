# PDF Consent Annotations API Routes

## Overview

Next.js 14 App Router API routes for PDF consent annotations. These routes act as a proxy layer that calls the NestJS backend API.

## Routes

### GET /api/v1/pdf-consents/[id]/annotations
Get all annotations for a consent document.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "consentId": "uuid",
      "annotationType": "HIGHLIGHT",
      "pageNumber": 1,
      "x": 100.5,
      "y": 200.5,
      "width": 50,
      "height": 20,
      "content": "Note text",
      "color": "#FF0000",
      "createdBy": "uuid",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "error": null
}
```

### POST /api/v1/pdf-consents/[id]/annotations
Create a new annotation.

**Request Body:**
```json
{
  "annotationType": "HIGHLIGHT",
  "pageNumber": 1,
  "x": 100.5,
  "y": 200.5,
  "width": 50,
  "height": 20,
  "content": "Note text",
  "color": "#FF0000",
  "coordinates": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "consentId": "uuid",
    "annotationType": "HIGHLIGHT",
    "pageNumber": 1,
    "x": 100.5,
    "y": 200.5,
    "width": 50,
    "height": 20,
    "content": "Note text",
    "color": "#FF0000",
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/pdf-consents/[id]/annotations/[annId]
Get a specific annotation by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "consentId": "uuid",
    "annotationType": "HIGHLIGHT",
    "pageNumber": 1,
    "x": 100.5,
    "y": 200.5,
    "width": 50,
    "height": 20,
    "content": "Note text",
    "color": "#FF0000",
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "error": null
}
```

### PUT /api/v1/pdf-consents/[id]/annotations/[annId]
Update an annotation.

**Request Body:**
```json
{
  "content": "Updated note text",
  "color": "#00FF00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "consentId": "uuid",
    "annotationType": "HIGHLIGHT",
    "pageNumber": 1,
    "x": 100.5,
    "y": 200.5,
    "width": 50,
    "height": 20,
    "content": "Updated note text",
    "color": "#00FF00",
    "createdBy": "uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T01:00:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/pdf-consents/[id]/annotations/[annId]
Delete an annotation (soft delete).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "deleted": true
  },
  "error": null
}
```

## Error Responses

All routes return errors in this format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {}
  }
}
```

## Middleware Integration

The routes include commented examples showing how to integrate with middleware functions:

- `withAuth` - JWT validation
- `withRBAC` - Permission check (e.g., `['consent:read']`, `['consent:write']`)
- `withRLS` - Row-level security validation
- `withErrorHandler` - Error formatting

To enable middleware, uncomment the examples and ensure the middleware functions are available.

## Validation

Request validation uses Zod schemas:
- `CreateAnnotationSchema` - For POST requests
- `UpdateAnnotationSchema` - For PUT requests

Validation errors return 400 status with details:

```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": [
      {
        "path": ["annotationType"],
        "message": "Required"
      }
    ]
  }
}
```

## Backend Integration

These routes call the NestJS backend API endpoints:
- `GET /api/v1/pdf-consents/:id/annotations`
- `POST /api/v1/pdf-consents/:id/annotations`
- `GET /api/v1/pdf-consents/:id/annotations/:annId`
- `PUT /api/v1/pdf-consents/:id/annotations/:annId`
- `DELETE /api/v1/pdf-consents/:id/annotations/:annId`

The backend must implement these endpoints. See the backend implementation documentation for details.








