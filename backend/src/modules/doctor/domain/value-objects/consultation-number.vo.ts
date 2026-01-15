/**
 * ConsultationNumber Value Object
 * 
 * Generates human-readable consultation numbers
 * Format: CONS-YYYY-NNNNN
 * Example: CONS-2026-00001
 * 
 * @value-object
 */

export class ConsultationNumber {
  private constructor(private readonly value: string) {}

  /**
   * Generate new consultation number
   */
  static generate(sequenceNumber: number, year?: number): ConsultationNumber {
    const currentYear = year || new Date().getFullYear();
    const paddedSequence = sequenceNumber.toString().padStart(5, '0');
    const consultationNumber = `CONS-${currentYear}-${paddedSequence}`;

    return new ConsultationNumber(consultationNumber);
  }

  /**
   * Reconstitute from string
   */
  static fromString(value: string): ConsultationNumber {
    if (!ConsultationNumber.isValid(value)) {
      throw new Error(`Invalid consultation number format: ${value}`);
    }

    return new ConsultationNumber(value);
  }

  /**
   * Validate format
   */
  static isValid(value: string): boolean {
    const pattern = /^CONS-\d{4}-\d{5}$/;
    return pattern.test(value);
  }

  /**
   * Get string value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Extract year from consultation number
   */
  getYear(): number {
    const parts = this.value.split('-');
    return parseInt(parts[1], 10);
  }

  /**
   * Extract sequence from consultation number
   */
  getSequence(): number {
    const parts = this.value.split('-');
    return parseInt(parts[2], 10);
  }

  /**
   * Value equality
   */
  equals(other: ConsultationNumber): boolean {
    return this.value === other.value;
  }
}


