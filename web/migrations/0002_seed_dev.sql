-- Development seed. Specialists cannot self-register (that would let anyone
-- register as a specialist and start receiving real families' escalations),
-- so they are seeded. Replace with real agency data before any pilot.

INSERT INTO profiles (user_id, role, email, full_name) VALUES
  ('spec-erica',  'specialist', 'erica@example-cpa.org',  'Erica Adams'),
  ('spec-marcus', 'specialist', 'marcus@example-cpa.org', 'Marcus Ellery'),
  ('parent-jay',  'parent',     'jay@example.org',        'Jay Brown'),
  ('parent-kim',  'parent',     'kim@example.org',        'Kim Reed');

INSERT INTO specialists (user_id, agency_name, work_email) VALUES
  ('spec-erica',  'Example Child Placing Agency', 'erica@example-cpa.org'),
  ('spec-marcus', 'Example Child Placing Agency', 'marcus@example-cpa.org');

-- Erica carries both families.
INSERT INTO parent_profiles (user_id, specialist_user_id, county) VALUES
  ('parent-jay', 'spec-erica', 'Washtenaw'),
  ('parent-kim', 'spec-erica', 'Wayne');

-- Marcus is seeded with no caseload on purpose: signing in as him should
-- show an empty queue, which is the visual proof that a specialist cannot
-- see escalations that were not sent to them.
