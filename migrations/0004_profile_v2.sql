-- Profile v2 (slice 11): country (ISO-3166 alpha-2), experience level,
-- and the builder's timezone — feeds eligibility cross-check, fit verdicts,
-- and local-time deadline rendering.
ALTER TABLE profile ADD COLUMN country TEXT;
ALTER TABLE profile ADD COLUMN experience_level TEXT;
ALTER TABLE profile ADD COLUMN timezone TEXT;
