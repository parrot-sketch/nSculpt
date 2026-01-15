import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Structured Data Validator Service
 * Validates structured data against JSON schemas
 */
@Injectable()
export class StructuredDataValidatorService {
  /**
   * Validate data against JSON schema
   * Note: For production, consider using ajv library for full JSON Schema validation
   */
  validate(dataType: string, schema: string, data: any): boolean {
    try {
      const schemaObj = JSON.parse(schema);

      switch (dataType) {
        case 'BOTOX_TRACKING':
          return this.validateBotoxTracking(data);
        case 'CAPRINI_ASSESSMENT':
          return this.validateCapriniAssessment(data);
        default:
          // Basic validation for unknown types
          return this.validateBasic(data, schemaObj);
      }
    } catch (error) {
      throw new BadRequestException(`Invalid schema or data: ${error.message}`);
    }
  }

  /**
   * Validate Botox tracking data
   */
  private validateBotoxTracking(data: any): boolean {
    if (!Array.isArray(data)) {
      throw new BadRequestException('Botox tracking data must be an array');
    }

    for (const entry of data) {
      if (!entry.location || typeof entry.location !== 'string') {
        throw new BadRequestException('Each entry must have a location');
      }
      if (!entry.botoxLotNumber || typeof entry.botoxLotNumber !== 'string') {
        throw new BadRequestException('Each entry must have a botoxLotNumber');
      }
      if (
        entry.unitsPerSite === undefined ||
        typeof entry.unitsPerSite !== 'number'
      ) {
        throw new BadRequestException('Each entry must have unitsPerSite as a number');
      }
      if (entry.unitsPerSite < 0) {
        throw new BadRequestException('unitsPerSite must be non-negative');
      }
    }

    return true;
  }

  /**
   * Validate CAPRINI assessment data
   */
  private validateCapriniAssessment(data: any): boolean {
    if (typeof data !== 'object' || data === null) {
      throw new BadRequestException('CAPRINI assessment data must be an object');
    }

    const requiredFields = [
      'onePoint',
      'twoPoints',
      'threePoints',
      'fivePoints',
      'onePointSubtotal',
      'twoPointsSubtotal',
      'threePointsSubtotal',
      'fivePointsSubtotal',
      'totalScore',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    // Validate arrays
    if (!Array.isArray(data.onePoint)) {
      throw new BadRequestException('onePoint must be an array');
    }
    if (!Array.isArray(data.twoPoints)) {
      throw new BadRequestException('twoPoints must be an array');
    }
    if (!Array.isArray(data.threePoints)) {
      throw new BadRequestException('threePoints must be an array');
    }
    if (!Array.isArray(data.fivePoints)) {
      throw new BadRequestException('fivePoints must be an array');
    }

    // Validate numbers
    if (typeof data.onePointSubtotal !== 'number') {
      throw new BadRequestException('onePointSubtotal must be a number');
    }
    if (typeof data.twoPointsSubtotal !== 'number') {
      throw new BadRequestException('twoPointsSubtotal must be a number');
    }
    if (typeof data.threePointsSubtotal !== 'number') {
      throw new BadRequestException('threePointsSubtotal must be a number');
    }
    if (typeof data.fivePointsSubtotal !== 'number') {
      throw new BadRequestException('fivePointsSubtotal must be a number');
    }
    if (typeof data.totalScore !== 'number') {
      throw new BadRequestException('totalScore must be a number');
    }

    // Validate score calculation
    const calculatedTotal =
      data.onePointSubtotal +
      data.twoPointsSubtotal +
      data.threePointsSubtotal +
      data.fivePointsSubtotal;

    if (data.totalScore !== calculatedTotal) {
      throw new BadRequestException(
        `Total score ${data.totalScore} does not match calculated total ${calculatedTotal}`,
      );
    }

    return true;
  }

  /**
   * Basic validation for unknown types
   */
  private validateBasic(data: any, schema: any): boolean {
    // Basic type checking
    if (schema.type === 'object' && typeof data !== 'object') {
      throw new BadRequestException('Data must be an object');
    }
    if (schema.type === 'array' && !Array.isArray(data)) {
      throw new BadRequestException('Data must be an array');
    }
    if (schema.type === 'string' && typeof data !== 'string') {
      throw new BadRequestException('Data must be a string');
    }
    if (schema.type === 'number' && typeof data !== 'number') {
      throw new BadRequestException('Data must be a number');
    }

    return true;
  }

  /**
   * Get default schema for a data type
   */
  getDefaultSchema(dataType: string): string {
    switch (dataType) {
      case 'BOTOX_TRACKING':
        return JSON.stringify({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              botoxLotNumber: { type: 'string' },
              botoxExpirationDate: { type: 'string', format: 'date' },
              unitsPerSite: { type: 'number' },
              totalUnits: { type: 'number' },
            },
            required: ['location', 'botoxLotNumber', 'unitsPerSite'],
          },
        });

      case 'CAPRINI_ASSESSMENT':
        return JSON.stringify({
          type: 'object',
          properties: {
            onePoint: { type: 'array', items: { type: 'string' } },
            twoPoints: { type: 'array', items: { type: 'string' } },
            threePoints: { type: 'array', items: { type: 'string' } },
            fivePoints: { type: 'array', items: { type: 'string' } },
            onePointSubtotal: { type: 'number' },
            twoPointsSubtotal: { type: 'number' },
            threePointsSubtotal: { type: 'number' },
            fivePointsSubtotal: { type: 'number' },
            totalScore: { type: 'number' },
            assessedBy: { type: 'string' },
            assessedAt: { type: 'string', format: 'date-time' },
          },
          required: [
            'onePoint',
            'twoPoints',
            'threePoints',
            'fivePoints',
            'onePointSubtotal',
            'twoPointsSubtotal',
            'threePointsSubtotal',
            'fivePointsSubtotal',
            'totalScore',
          ],
        });

      default:
        throw new BadRequestException(`Unknown data type: ${dataType}`);
    }
  }
}









