import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Note: The middleware functions (withAuth, withRBAC, withRLS, withErrorHandler)
 * should be defined in a shared middleware utility file.
 * 
 * Example structure:
 * - lib/middleware/withAuth.ts
 * - lib/middleware/withRBAC.ts
 * - lib/middleware/withRLS.ts
 * - lib/middleware/withErrorHandler.ts
 */

// Import middleware (adjust path as needed)
// import { withAuth } from '@/lib/middleware/withAuth';
// import { withRBAC } from '@/lib/middleware/withRBAC';
// import { withRLS } from '@/lib/middleware/withRLS';
// import { withErrorHandler } from '@/lib/middleware/withErrorHandler';

// Import types
import type { AnnotationType } from '@/types/consent';
import { getApiUrl } from '@/lib/env';
import apiClient from '@/services/apiClient';

// Zod schema for create annotation request
const CreateAnnotationSchema = z.object({
  annotationType: z.enum(['HIGHLIGHT', 'COMMENT', 'TEXT_EDIT', 'DRAWING', 'ARROW', 'RECTANGLE', 'CIRCLE']),
  pageNumber: z.number().int().positive(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  coordinates: z.record(z.any()).optional(), // JSONB for complex shapes
  content: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Hex color
});

const UpdateAnnotationSchema = CreateAnnotationSchema.partial().extend({
  annotationType: z.enum(['HIGHLIGHT', 'COMMENT', 'TEXT_EDIT', 'DRAWING', 'ARROW', 'RECTANGLE', 'CIRCLE']).optional(),
  pageNumber: z.number().int().positive().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export type CreateAnnotationDto = z.infer<typeof CreateAnnotationSchema>;
export type UpdateAnnotationDto = z.infer<typeof UpdateAnnotationSchema>;

/**
 * GET /api/v1/pdf-consents/[id]/annotations
 * Get all annotations for a consent
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id: consentId } = context.params;

    // Call backend API
    const response = await apiClient.get(
      getApiUrl(`/pdf-consents/${consentId}/annotations`),
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
          message: error.response?.data?.message || error.message || 'Failed to fetch annotations',
          code: error.response?.data?.code || 'FETCH_ANNOTATIONS_ERROR',
          statusCode: error.response?.status || 500,
        },
      },
      { status: error.response?.status || 500 }
    );
  }
}

/**
 * POST /api/v1/pdf-consents/[id]/annotations
 * Create a new annotation
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id: consentId } = context.params;
    const body = await request.json();

    // Validate request body
    const validatedData = CreateAnnotationSchema.parse(body);

    // Call backend API
    const response = await apiClient.post(
      getApiUrl(`/pdf-consents/${consentId}/annotations`),
      validatedData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: response.data,
        error: null,
      },
      { status: 201 }
    );
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
          message: error.response?.data?.message || error.message || 'Failed to create annotation',
          code: error.response?.data?.code || 'CREATE_ANNOTATION_ERROR',
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
 *       withRLS(async (request: NextRequest, context: { params: { id: string }; user?: any }) => {
 *         const { id: consentId } = context.params;
 * 
 *         const response = await apiClient.get(
 *           getApiUrl(`/pdf-consents/${consentId}/annotations`),
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
 * export const POST = withErrorHandler(
 *   withAuth(
 *     withRBAC(['consent:write'])(
 *       withRLS(async (request: NextRequest, context: { params: { id: string }; user?: any }) => {
 *         const { id: consentId } = context.params;
 *         const body = await request.json();
 *         const validatedData = CreateAnnotationSchema.parse(body);
 * 
 *         const response = await apiClient.post(
 *           getApiUrl(`/pdf-consents/${consentId}/annotations`),
 *           validatedData,
 *           {
 *             headers: {
 *               Authorization: `Bearer ${context.user?.token}`,
 *               'Content-Type': 'application/json',
 *             },
 *           }
 *         );
 * 
 *         return NextResponse.json(
 *           {
 *             success: true,
 *             data: response.data,
 *             error: null,
 *           },
 *           { status: 201 }
 *         );
 *       })
 *     )
 *   )
 * );
 */








