import { test, expect, Page } from '@playwright/test';

/**
 * Integration test for the End-to-End Appointment Workflow.
 * 
 * Flow:
 * 1. Patient: Book Appointment Request
 * 2. Front Desk: Assign Schedule/Slot to Request
 * 3. Doctor: Confirm Scheduled Appointment
 */

async function login(page: Page, email: string) {
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', 'User123!');
    await page.click('button[type="submit"]');
    // Wait for auth to complete
    await page.waitForURL(url => !url.href.includes('/login'));
}

test.describe('End-to-End Appointment Workflow', () => {
    // Increased timeout for the full E2E flow
    test.setTimeout(180000);

    test('should progress from patient request to doctor confirmation', async ({ page }) => {
        // Log alerts/dialogs
        page.on('dialog', dialog => {
            console.log(`DIALOG: [${dialog.type()}] ${dialog.message()}`);
            dialog.dismiss().catch(() => { });
        });
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
            else console.log(`BROWSER CONSOLE: ${msg.text()}`);
        });

        const patientEmail = 'patient@nairobi-sculpt.com';
        const frontDeskEmail = 'frontdesk@nairobi-sculpt.com';
        const doctorEmail = 'drken@nairobisculpt.com';
        const patientName = 'John Doe';
        const doctorName = 'Ken Aluora';

        // --- PHASE 1: PATIENT REQUEST ---
        console.log('Phase 1: Patient Request');
        await login(page, patientEmail);

        // Ensure we are on dashboard
        await expect(page.getByText(/Welcome/i)).toBeVisible({ timeout: 15000 });
        console.log('On dashboard, navigating to book...');

        await page.click('a:has-text("Book Appointment")');
        await expect(page).toHaveURL('/patient/book');

        // Step 1: Choose Clinician
        console.log('Step 1: Selecting doctor...');
        const drBtn = page.locator('button').filter({ hasText: doctorName });
        await expect(drBtn).toBeVisible();
        await drBtn.click();

        console.log('Checking if doctor is selected (visual feedback)...');
        await expect(drBtn).toHaveClass(/border-indigo-500/);

        // Small stabilization delay for React state
        await page.waitForTimeout(500);

        console.log('Clicking Next...');
        const nextButton = page.locator('#next-button');
        await expect(nextButton).toBeEnabled({ timeout: 10000 });
        await nextButton.click();

        // Step 2: Confirm Request
        console.log('Step 2: Confirming request...');
        await expect(page.getByText(/Confirm Your Appointment/i)).toBeVisible();

        await page.fill('#reason', 'End-to-end integration test request.');
        console.log('Filled reason, waiting for confirm button...');

        const confirmRequestButton = page.locator('#confirm-request-button');
        await expect(confirmRequestButton).toBeEnabled();
        await confirmRequestButton.click();

        // Success Verification
        console.log('Verifying success message...');
        await expect(page.locator('text=Appointment Scheduled')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=STATUS: REQUESTED')).toBeVisible();

        // Logout patient
        console.log('Logging out patient...');
        await page.goto('/login');

        // --- PHASE 2: FRONT DESK SCHEDULING ---
        console.log('Phase 2: Front Desk Scheduling');
        await login(page, frontDeskEmail);
        await expect(page.getByText(/Front Desk Operations/i)).toBeVisible();

        // Find the "Schedule Now" link for the new request
        console.log('Finding request card for patient...');
        const requestCard = page.locator('div.bg-white').filter({ hasText: patientName }).filter({ hasText: 'New' }).first();
        await expect(requestCard).toBeVisible({ timeout: 15000 });

        console.log('Clicking Schedule Now...');
        await requestCard.locator('a:has-text("Schedule Now")').click();

        // Now in BookingWizard (Step 3: Slot)
        console.log('In BookingWizard, selecting slot...');
        await expect(page.getByText(/Available Times/i)).toBeVisible();

        // Select a different date to avoid conflicts (e.g. 2nd button = Tomorrow)
        const dateButtons = page.locator('button.min-w-\\[80px\\]');
        await expect(dateButtons.nth(1)).toBeVisible();
        await dateButtons.nth(1).click();

        // Wait for slots to reload
        await page.waitForTimeout(1000);

        // Select a slot - we'll take the last available slot to be safe
        const timeSlots = page.locator('button:has-text(":")');
        const count = await timeSlots.count();
        await expect(timeSlots.nth(count - 1)).toBeVisible();
        await timeSlots.nth(count - 1).click();

        console.log('Clicking Continue (Wizard)...');
        await page.click('button:has-text("Continue")');

        // Step 4: Review
        console.log('Step 4: Reviewing and confirming booking...');
        await expect(page.getByRole('heading', { name: 'Confirm Booking' })).toBeVisible();

        const confirmBtn = page.getByRole('button', { name: 'Confirm Booking' });
        await expect(confirmBtn).toBeEnabled();
        await confirmBtn.click();

        // Wait for redirect back to appointments list
        await expect(page).toHaveURL('/frontdesk/appointments', { timeout: 15000 });

        // Logout front desk
        console.log('Logging out front desk...');
        await page.goto('/login');

        // --- PHASE 3: DOCTOR CONFIRMATION ---
        console.log('Phase 3: Doctor Confirmation');
        await login(page, doctorEmail);
        await expect(page.getByText(/Doctor Dashboard/i)).toBeVisible();

        // Find the appointment in DoctorConfirmations widget
        console.log('Finding pending confirmation...');
        await expect(page.getByText(/Pending Your Confirmation/i)).toBeVisible();

        // Use a more robust selector for the confirmation row
        const confirmationRow = page.locator('div').filter({ hasText: patientName }).filter({ hasText: 'CONFIRM' }).first();
        await expect(confirmationRow).toBeVisible({ timeout: 15000 });

        console.log('Clicking CONFIRM...');
        await confirmationRow.getByRole('button', { name: 'CONFIRM' }).click();

        // Verify toast or removal from list
        console.log('Verifying final confirmation success...');
        await expect(page.getByText(/Appointment confirmed/i)).toBeVisible();
        await expect(confirmationRow).not.toBeVisible();
    });
});
