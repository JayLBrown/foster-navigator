-- Test accounts for the deployed instance. Password for all: password
-- Idempotent: safe to run more than once.
-- Replace before any real foster parent uses this.

INSERT OR IGNORE INTO profiles (user_id, role, email, full_name) VALUES ('spec-erica', 'specialist', 'eadams@example.com', 'Erica Adams');
UPDATE profiles SET role = 'specialist', email = 'eadams@example.com', full_name = 'Erica Adams', password_hash = 'pbkdf2$100000$197a658a5cad196915821890d91c7bec$0a34f8a77d41e5677c1c408f2ccf35516a8dd1acf14284502aba3abe3b91f125' WHERE user_id = 'spec-erica';
INSERT OR IGNORE INTO specialists (user_id, agency_name, work_email) VALUES ('spec-erica', 'Birchwood Family Services', 'eadams@example.com');

INSERT OR IGNORE INTO profiles (user_id, role, email, full_name) VALUES ('spec-marcus', 'specialist', 'mellery@example.com', 'Marcus Ellery');
UPDATE profiles SET role = 'specialist', email = 'mellery@example.com', full_name = 'Marcus Ellery', password_hash = 'pbkdf2$100000$9f8f10c2dcbd665d707b366150e44b7b$37cedc56fd3409c9550228ff03901d3a0e280b1d31b453700fbba6addce63c06' WHERE user_id = 'spec-marcus';
INSERT OR IGNORE INTO specialists (user_id, agency_name, work_email) VALUES ('spec-marcus', 'Birchwood Family Services', 'mellery@example.com');

INSERT OR IGNORE INTO profiles (user_id, role, email, full_name) VALUES ('parent-jay', 'parent', 'jbrown@example.com', 'Jay Brown');
UPDATE profiles SET role = 'parent', email = 'jbrown@example.com', full_name = 'Jay Brown', password_hash = 'pbkdf2$100000$e9405b8b3fadbaad9cc81af6ed5ca650$33fdab4fdf248d571690240e34b434702e2c2c7fb96eee97ee380bea091f0ccd' WHERE user_id = 'parent-jay';
INSERT OR IGNORE INTO parent_profiles (user_id, specialist_user_id, county) VALUES ('parent-jay', 'spec-erica', 'Washtenaw');
UPDATE parent_profiles SET specialist_user_id = 'spec-erica' WHERE user_id = 'parent-jay';

INSERT OR IGNORE INTO profiles (user_id, role, email, full_name) VALUES ('parent-erica', 'parent', 'erica.parent@example.com', 'Erica Adams');
UPDATE profiles SET role = 'parent', email = 'erica.parent@example.com', full_name = 'Erica Adams', password_hash = 'pbkdf2$100000$753230e0d47cc29816f77d78dc33fdd2$25aa6414fb1a4a993b6842a405ec7273ea4950a85a2c224330d6e02e27f93609' WHERE user_id = 'parent-erica';
INSERT OR IGNORE INTO parent_profiles (user_id, specialist_user_id, county) VALUES ('parent-erica', 'spec-erica', 'Washtenaw');
UPDATE parent_profiles SET specialist_user_id = 'spec-erica' WHERE user_id = 'parent-erica';

SELECT role, email, full_name, CASE WHEN password_hash IS NULL THEN 'NO PW' ELSE 'ok' END AS pw FROM profiles ORDER BY role, email;
