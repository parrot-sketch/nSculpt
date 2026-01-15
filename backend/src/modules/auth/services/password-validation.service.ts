import { Injectable, BadRequestException } from '@nestjs/common';
import zxcvbn from 'zxcvbn';

/**
 * Password Validation Service
 * Phase 1 Security Hardening: Password Complexity Enforcement
 * 
 * Implements NIST SP 800-63B password guidelines:
 * - Minimum 12 characters
 * - Mixed case, numbers, special characters
 * - Strength scoring using zxcvbn
 * - Protection against common/breached passwords
 */
@Injectable()
export class PasswordValidationService {
    private readonly MIN_PASSWORD_LENGTH = 12;
    private readonly MIN_STRENGTH_SCORE = 3; // Out of 4 (zxcvbn scale)

    /**
     * Validate password strength using zxcvbn library
     * Minimum score: 3 (out of 4) - "Strong" password
     * 
     * @param password - Password to validate
     * @param userInputs - Optional array of user-specific inputs (email, name, etc.) to check against
     * @throws BadRequestException if password is too weak
     */
    validatePasswordStrength(password: string, userInputs: string[] = []): void {
        // Check minimum length first (fast check)
        if (password.length < this.MIN_PASSWORD_LENGTH) {
            throw new BadRequestException({
                message: `Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`,
                field: 'password',
            });
        }

        // Use zxcvbn for comprehensive strength analysis
        const result = zxcvbn(password, userInputs);

        if (result.score < this.MIN_STRENGTH_SCORE) {
            throw new BadRequestException({
                message: 'Password is too weak',
                suggestions: result.feedback.suggestions,
                warning: result.feedback.warning,
                field: 'password',
                score: result.score,
                requiredScore: this.MIN_STRENGTH_SCORE,
            });
        }
    }

    /**
     * Validate password complexity requirements
     * Ensures password contains:
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     * - No more than 2 consecutive identical characters
     * 
     * @param password - Password to validate
     * @throws BadRequestException if complexity requirements not met
     */
    validatePasswordComplexity(password: string): void {
        const requirements = [
            {
                regex: /[a-z]/,
                message: 'Password must contain at least one lowercase letter',
            },
            {
                regex: /[A-Z]/,
                message: 'Password must contain at least one uppercase letter',
            },
            {
                regex: /\d/,
                message: 'Password must contain at least one number',
            },
            {
                regex: /[@$!%*?&]/,
                message: 'Password must contain at least one special character (@$!%*?&)',
            },
        ];

        for (const requirement of requirements) {
            if (!requirement.regex.test(password)) {
                throw new BadRequestException({
                    message: requirement.message,
                    field: 'password',
                });
            }
        }

        // Check for 3+ consecutive identical characters
        if (/(.)\1{2,}/.test(password)) {
            throw new BadRequestException({
                message: 'Password cannot contain 3 or more consecutive identical characters',
                field: 'password',
            });
        }
    }

    /**
     * Check password against common breached passwords
     * TODO: Integrate with haveibeenpwned API in Phase 2
     * 
     * @param password - Password to check
     * @returns Promise<boolean> - True if password is breached
     */
    async checkBreachedPassword(password: string): Promise<boolean> {
        // Placeholder for Phase 2 implementation
        // Will integrate with haveibeenpwned Passwords API
        // https://haveibeenpwned.com/API/v3#PwnedPasswords
        return false;
    }

    /**
     * Comprehensive password validation
     * Combines complexity and strength checks
     * 
     * @param password - Password to validate
     * @param userInputs - Optional user-specific inputs to check against
     */
    async validatePassword(password: string, userInputs: string[] = []): Promise<void> {
        // Check complexity requirements
        this.validatePasswordComplexity(password);

        // Check strength using zxcvbn
        this.validatePasswordStrength(password, userInputs);

        // Check against breached passwords (Phase 2)
        const isBreached = await this.checkBreachedPassword(password);
        if (isBreached) {
            throw new BadRequestException({
                message: 'This password has been found in data breaches. Please choose a different password.',
                field: 'password',
            });
        }
    }
}
