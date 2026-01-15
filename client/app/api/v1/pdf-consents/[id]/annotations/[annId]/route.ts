import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUrl } from '@/lib/env';
import apiClient from '@/services/apiClient';

// Import middleware (adjust path as needed)
// import { withAuth } from '@/lib/middleware/withAuth';
// import { withRBAC } from '@/lib/middleware/withRBAC';
// import { withRLS } from '@/lib/middleware/withRLS';
// import { withErrorHandler } from '@/lib/middleware/withErrorHandler';

// Zod schema for update annotation request
const UpdateAnnotationSchema = z.object({
  annotationType: z.enum(['HIGHLIGHT', 'COMMENT', 'TEXT_EDIT', 'DRAWING', 'ARROW', 'RECTANGLE', 'CIRCLE']).optional(),
  pageNumber: z.number().int().positive().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  coordinates: z.record(z.any()).optional(), // JSONB for complex shapes
  content: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Hex color
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export type UpdateAnnotationDto = z.infer<typeof UpdateAnnotationSchema>;

/**
 * GET /api/v1/pdf-consents/[id]/annotations/[annId]
 * Get a specific annotation by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string; annId: string } }
) {
  try {
    const { id: consentId, annId } = context.params;

    // Call backend API
    const response = await apiClient.get(
      getApiUrl(`/pdf-consents/${consentId}/annotations/${annId}`),
      {
        headers: {
          // Authorization header is added by apiClient interceptor
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data,
      error: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: error.response?.data?.message || error.message || 'Failed to fetch annotation',
          code: error.response?.data?.code || 'FETCH_ANNOTATION_ERROR',
          statusCode: error.response?.status || 500,
        },
      },
      { status: error.response?.status || 500 }
    );
  }
}

/**
 * PUT /api/v1/pdf-consents/[id]/annotations/[annId]
 * Update an annotation
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string; annId: string } }
) {
  try {
    const { id: consentId, annId } = context.params;
    const body = await request.json();

    // Validate request body
    const validatedData = UpdateAnnotationSchema.parse(body);

    // Call backend API
    const response = await apiClient.put(
      getApiUrl(`/pdf-consents/${consentId}/annotations/${annId}`),
      validatedData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data,
      error: null,
    });
  } catch (error: any) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    // Handle API errors
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: error.response?.data?.message || error.message || 'Failed to update annotation',
          code: error.response?.data?.code || 'UPDATE_ANNOTATION_ERROR',
          statusCode: error.response?.status || 500,
        },
      },
      { status: error.response?.status || 500 }
    );
  }
}

/**
 * DELETE /api/v1/pdf-consents/[id]/annotations/[annId]
 * Delete an annotation (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string; annId: string } }
) {
  try {
    const { id: consentId, annId } = context.params;

    // Call backend API
    await apiClient.delete(
      getApiUrl(`/pdf-consents/${consentId}/annotations/${annId}`),
      {
        headers: {
          // Authorization header is added by apiClient interceptor
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: { id: annId, deleted: true },
      error: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          message: error.response?.data?.message || error.message || 'Failed to delete annotation',
          code: error.response?.data?.code || 'DELETE_ANNOTATION_ERROR',
          statusCode: error.response?.status || 500,
        },
      },
      { status: error.response?.status || 500 }
    );
  }
}

/**
 * Example with middleware (uncomment and adjust once middleware functions are available):
 * 
 * export const GET = withErrorHandler(
 *   withAuth(
 *     withRBAC(['consent:read'])(
 *       withRLS(async (request: NextRequest, context: { params: { id: string; annId: string }; user?: any }) => {
 *         const { id: consentId, annId } = context.params;
 * 
 *         const response = await apiClient.get(
 *           getApiUrl(`/pdf-consents/${consentId}/annotations/${annId}`),
 *           {
 *             headers: {
 *               Authorization: `Bearer ${context.user?.token}`,
 *             },
 *           }
 *         );
 * 
 *         return NextResponse.json({
 *           success: true,
 *           data: response.data,
 *           error: null,
 *         });
 *       })
 *     )
 *   )
 * );
 * 
 * export const PUT = withErrorHandler(
 *   withAuth(
 *     withRBAC(['consent:write'])(
 *       withRLS(async (request: NextRequest, context: { params: { id: string; annId: string }; user?: any }) => {
 *         const { id: consentId, annId } = context.params;
 *         const body = await request.json();
 *         const validatedData = UpdateAnnotationSchema.parse(body);
 * 
 *         const response = await apiClient.put(
 *           getApiUrl(`/pdf-consents/${consentId}/annotations/${annId}`),
 *           validatedData,
 *           {
 *             headers: {
 *               Authorization: `Bearer ${context.user?.token}`,
 *               'Content-Type': 'application/json',
 *             },
 *           }
 *         );
 * 
 *         return NextResponse.json({
 *           success: true,
 *           data: response.data,
 *           error: null,
 *         });
 *       })
 *     )
 *   )
 * );
 * 
 * export const DELETE = withErrorHandler(
 *   withAuth(
 *     withRBAC(['consent:write'])(
 *       withRLS(async (request: NextRequest, context: { params: { id: string; annId: string }; user?: any }) => {
 *         const { id: consentId, annId } = context.params;
 * 
 *         await apiClient.delete(
 *           getApiUrl(`/pdf-consents/${consentId}/annotations/${annId}`),
 *           {
 *             headers: {
 *               Authorization: `Bearer ${context.user?.token}`,
 *             },
 *           }
 *         );
 * 
 *         return NextResponse.json({
 *           success: true,
 *           data: { id: annId, deleted: true },
 *           error: null,
 *         });
 *       })
 *     )
 *   )
 * );
 */








