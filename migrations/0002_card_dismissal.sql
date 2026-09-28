-- Card dismissal support (final-review revision): a hover-dismissed card stays
-- hidden until its type is rewritten with new truth. Clear-the-bag deletes rows.
ALTER TABLE card_items ADD COLUMN dismissed INTEGER NOT NULL DEFAULT 0;
