-- TEST SUITE: Clinical Immutability & Safety
-- Run this directly in psql or TablePlus to verify triggers

-- Prerequisite: Assume we have a Doctor User (ID: 'doc-1'), Patient (ID: 'pat-1'), and Encounter (ID: 'enc-1')
-- For testing purposes, we use placeholders.

--------------------------------------------------------------------------------
-- TEST 1: Attempt to Modify a FINAL Observation
--------------------------------------------------------------------------------

-- Setup: Create a FINAL observation
INSERT INTO "observations" ("id", "patientId", "status", "code", "valueQuantity", "isLatest", "version", "createdAt", "updatedAt")
VALUES ('obs-final-1', 'pat-1', 'FINAL', 'HEART_RATE', 80, true, 1, NOW(), NOW());

-- ATTACK: Try to change the value to 999 (Malicious Edit)
-- EXPECTED: ERROR: Immutable Violation: Cannot update a FINAL Observation...
UPDATE "observations" 
SET "valueQuantity" = 999 
WHERE "id" = 'obs-final-1';

-- PASS: Try to version it (Set isLatest = false)
-- EXPECTED: SUCCESS
UPDATE "observations" 
SET "isLatest" = false, "updatedAt" = NOW() 
WHERE "id" = 'obs-final-1';


--------------------------------------------------------------------------------
-- TEST 2: Attempt to Add to Locked Encounter
--------------------------------------------------------------------------------

-- Setup: Create and Lock an Encounter
INSERT INTO "encounters" ("id", "patientId", "status", "class", "type", "locked", "createdById")
VALUES ('enc-locked-1', 'pat-1', 'FINISHED', 'AMBULATORY', 'Checkup', true, 'doc-1');

-- ATTACK: Try to slip in a new diagnosis
-- EXPECTED: ERROR: Safety Violation: Cannot add clinical data to a Locked Encounter.
INSERT INTO "conditions" ("id", "patientId", "encounterId", "clinicalStatus", "verificationStatus", "code", "createdById")
VALUES ('cond-bad-1', 'pat-1', 'enc-locked-1', 'ACTIVE', 'CONFIRMED', 'FAKE_DIAGNOSIS', 'doc-1');

