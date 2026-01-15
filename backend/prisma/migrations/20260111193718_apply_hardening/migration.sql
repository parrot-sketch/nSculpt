-- Database Safety Hardening for Clinical Core
-- Combined Phase 1, 2, and 3 Triggers

-- =============================================================================
-- PHASE 1: BASIC IMMUTABILITY
-- =============================================================================

-- 1. Function to protect FINAL observations from modification
CREATE OR REPLACE FUNCTION protect_final_observations()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates ONLY to toggle isLatest (for versioning) or voiding
  IF OLD.status = 'FINAL' AND NEW.status = 'FINAL' AND OLD.isLatest = NEW.isLatest THEN
     RAISE EXCEPTION 'Cannot edit a FINAL Observation. You must create a new version (amendment).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for Observation protection
DROP TRIGGER IF EXISTS trigger_protect_final_observations ON observations;
CREATE TRIGGER trigger_protect_final_observations
BEFORE UPDATE ON observations
FOR EACH ROW EXECUTE FUNCTION protect_final_observations();

-- 3. Function to check if Encounter is LOCKED
CREATE OR REPLACE FUNCTION check_encounter_locked()
RETURNS TRIGGER AS $$
DECLARE
  encounter_locked BOOLEAN;
BEGIN
  -- Skip check if no encounter linked (e.g. historical data loading)
  IF NEW."encounterId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "locked" INTO encounter_locked FROM encounters WHERE id = NEW."encounterId";
  
  IF encounter_locked THEN
    RAISE EXCEPTION 'Cannot add data to a Locked Encounter.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers to prevent writing to Locked Encounters
DROP TRIGGER IF EXISTS trigger_check_observation_lock ON observations;
CREATE TRIGGER trigger_check_observation_lock
BEFORE INSERT ON observations
FOR EACH ROW EXECUTE FUNCTION check_encounter_locked();

DROP TRIGGER IF EXISTS trigger_check_condition_lock ON conditions;
CREATE TRIGGER trigger_check_condition_lock
BEFORE INSERT ON conditions
FOR EACH ROW EXECUTE FUNCTION check_encounter_locked();

-- =============================================================================
-- PHASE 2: FORENSICS & EDGE CASES
-- =============================================================================

-- 1. BLOCK HARD DELETES (Forensic Defensibility)
CREATE OR REPLACE FUNCTION block_final_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Strict Forensic Rule: No hard deletion of clinical data. Period.
  -- Users must use status = 'ENTERED_IN_ERROR' or 'voided' flags.
  RAISE EXCEPTION 'Forensic Violation: Hard deletion of clinical records is prohibited. You must use status updates to void data.';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply to Observation
DROP TRIGGER IF EXISTS trigger_block_final_delete ON "observations";
CREATE TRIGGER trigger_block_final_delete
BEFORE DELETE ON "observations"
FOR EACH ROW EXECUTE FUNCTION block_final_delete();

-- Apply to Condition (Gap Fixed)
DROP TRIGGER IF EXISTS trigger_block_cond_delete ON "conditions";
CREATE TRIGGER trigger_block_cond_delete
BEFORE DELETE ON "conditions"
FOR EACH ROW EXECUTE FUNCTION block_final_delete();

-- Apply to EMR Notes (Gap Fixed - Narrative Forensics)
DROP TRIGGER IF EXISTS trigger_block_note_delete ON "emr_notes";
CREATE TRIGGER trigger_block_note_delete
BEFORE DELETE ON "emr_notes"
FOR EACH ROW EXECUTE FUNCTION block_final_delete();


-- 2. PREVENT LOCK EVASION (Update Checks)

-- Upgrade check_encounter_locked to handle UPDATES (Reparenting)
CREATE OR REPLACE FUNCTION check_encounter_locked_update()
RETURNS TRIGGER AS $$
DECLARE
  is_locked BOOLEAN;
  target_encounter_id UUID;
BEGIN
  -- Only run check if encounterId is changing or being set
  IF (TG_OP = 'UPDATE' AND NEW."encounterId" IS NOT DISTINCT FROM OLD."encounterId") THEN
    RETURN NEW;
  END IF;

  target_encounter_id := NEW."encounterId";

  IF target_encounter_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "locked" INTO is_locked 
  FROM "encounters" 
  WHERE "id" = target_encounter_id;

  IF is_locked = true THEN
    RAISE EXCEPTION 'Safety Violation: Cannot link data to a Locked Encounter.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply "Trojan Horse" defense to Observations & Conditions
DROP TRIGGER IF EXISTS trigger_chk_obs_lock_update ON "observations";
CREATE TRIGGER trigger_chk_obs_lock_update
BEFORE UPDATE ON "observations"
FOR EACH ROW EXECUTE FUNCTION check_encounter_locked_update();

DROP TRIGGER IF EXISTS trigger_chk_cond_lock_update ON "conditions";
CREATE TRIGGER trigger_chk_cond_lock_update
BEFORE UPDATE ON "conditions"
FOR EACH ROW EXECUTE FUNCTION check_encounter_locked_update();


-- 3. COVERAGE FOR EMR NOTES (Scope Fixed)

-- Apply insert check (reuse function from Phase 1)
DROP TRIGGER IF EXISTS trigger_chk_note_lock ON "emr_notes";
CREATE TRIGGER trigger_chk_note_lock
BEFORE INSERT ON "emr_notes"
FOR EACH ROW EXECUTE FUNCTION check_encounter_locked();

-- Apply update check
DROP TRIGGER IF EXISTS trigger_chk_note_lock_update ON "emr_notes";
CREATE TRIGGER trigger_chk_note_lock_update
BEFORE UPDATE ON "emr_notes"
FOR EACH ROW EXECUTE FUNCTION check_encounter_locked_update();

-- =============================================================================
-- PHASE 3: ROOT INTEGRITY (ENCOUNTER & NOTES)
-- =============================================================================

-- 1. ENCOUNTER SELF-PROTECTION (The "Root" Lock)

CREATE OR REPLACE FUNCTION protect_encounter_locked_state()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Prevent Soft Unlock (The "Break-Glass" Guard)
  -- Once locked, it stays locked unless we specifically allow (e.g., via a distinct Stored Proc)
  -- For now, we block ALL direct SQL updates that try to set locked = false.
  IF OLD."locked" = true AND NEW."locked" = false THEN
     RAISE EXCEPTION 'Security Violation: Encounters cannot be unlocked via standard updates. Audit required.';
  END IF;

  -- 2. Prevent Context Mutation on Locked Encounters
  -- If locked, you cannot change the patient, the provider, or the dates.
  IF OLD."locked" = true THEN
     IF NEW."patientId" IS DISTINCT FROM OLD."patientId" OR
        NEW."serviceProviderId" IS DISTINCT FROM OLD."serviceProviderId" OR
        NEW."periodStart" IS DISTINCT FROM OLD."periodStart" THEN
          RAISE EXCEPTION 'Integrity Violation: Cannot alter context of a Locked Encounter.';
     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to Encounters (UPDATE)
DROP TRIGGER IF EXISTS trigger_protect_encounter_state ON "encounters";
CREATE TRIGGER trigger_protect_encounter_state
BEFORE UPDATE ON "encounters"
FOR EACH ROW EXECUTE FUNCTION protect_encounter_locked_state();


-- 3. Block Deletion of Locked Encounters
CREATE OR REPLACE FUNCTION block_locked_encounter_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."locked" = true THEN
    RAISE EXCEPTION 'Forensic Violation: Cannot delete a Locked Encounter.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_block_encounter_delete ON "encounters";
CREATE TRIGGER trigger_block_encounter_delete
BEFORE DELETE ON "encounters"
FOR EACH ROW EXECUTE FUNCTION block_locked_encounter_delete();


-- 2. EMR NOTE SELF-LOCKING

CREATE OR REPLACE FUNCTION protect_locked_note()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."locked" = true THEN
     -- Strict Immutability for Locked Notes
     RAISE EXCEPTION 'Immutable Violation: Cannot edit a Locked EMR Note.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to EMR Notes (UPDATE)
DROP TRIGGER IF EXISTS trigger_protect_locked_note ON "emr_notes";
CREATE TRIGGER trigger_protect_locked_note
BEFORE UPDATE ON "emr_notes"
FOR EACH ROW EXECUTE FUNCTION protect_locked_note();
