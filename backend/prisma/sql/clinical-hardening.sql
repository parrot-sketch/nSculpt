-- Database Safety Hardening for Clinical Core

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
