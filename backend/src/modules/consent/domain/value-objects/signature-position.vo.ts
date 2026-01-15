/**
 * Signature Position Value Object
 * 
 * Represents the position where a signature should be placed on a PDF page.
 * This is a value object - immutable and validated.
 */

export class SignaturePosition {
  constructor(
    public readonly pageNumber: number,
    public readonly x: number,
    public readonly y: number,
    public readonly width?: number,
    public readonly height?: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.pageNumber < 1) {
      throw new Error('Page number must be at least 1');
    }
    if (this.x < 0) {
      throw new Error('X coordinate must be non-negative');
    }
    if (this.y < 0) {
      throw new Error('Y coordinate must be non-negative');
    }
    if (this.width !== undefined && this.width <= 0) {
      throw new Error('Width must be positive');
    }
    if (this.height !== undefined && this.height <= 0) {
      throw new Error('Height must be positive');
    }
  }

  /**
   * Create from web coordinates (top-left origin) to PDF coordinates (bottom-left origin)
   */
  static fromWebCoordinates(
    webX: number,
    webY: number,
    pageNumber: number,
    pageHeight: number,
    scaleFactor: number = 1.0,
    width?: number,
    height?: number,
  ): SignaturePosition {
    const pdfX = webX * scaleFactor;
    const pdfY = pageHeight - (webY * scaleFactor); // Invert Y axis

    return new SignaturePosition(
      pageNumber,
      pdfX,
      pdfY,
      width ? width * scaleFactor : undefined,
      height ? height * scaleFactor : undefined,
    );
  }

  equals(other: SignaturePosition): boolean {
    return (
      this.pageNumber === other.pageNumber &&
      this.x === other.x &&
      this.y === other.y &&
      this.width === other.width &&
      this.height === other.height
    );
  }
}





