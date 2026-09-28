-- Multi-bag (slice 14): track several contests, one primary "on the bag".
ALTER TABLE card_items ADD COLUMN contest_id INTEGER;
ALTER TABLE contests ADD COLUMN active INTEGER NOT NULL DEFAULT 0;
-- Existing cards belong to the most recent contest (they were written for it).
UPDATE card_items SET contest_id = (SELECT MAX(id) FROM contests);
UPDATE contests SET active = 1 WHERE id = (SELECT MAX(id) FROM contests);
