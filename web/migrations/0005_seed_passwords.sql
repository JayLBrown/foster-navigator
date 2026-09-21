-- Development passwords. Every seeded account uses: navigator
-- Set a different one with: node tools/set-password.mjs <email> "<password>"

UPDATE profiles SET password_hash = 'pbkdf2$100000$0b05ba333c6b05b4576310293808c1a4$00420a367469eaa94d0e623ad805e070e1b100653e8b4984d32ae3a6c04620ec' WHERE email = 'erica@example-cpa.org';
UPDATE profiles SET password_hash = 'pbkdf2$100000$99ac32e8a10ffd5f80711aae3caa9518$776dd45f4480d72d7c57598aecb788f840daeffa36bc2638e125c9f25a03f7c6' WHERE email = 'marcus@example-cpa.org';
UPDATE profiles SET password_hash = 'pbkdf2$100000$74bcefbdb2291e96dd6e9be9f6e7e123$9406b9ccac9fe34a8712ba1fa26851d20b0b6ed7318db6677fda679120213364' WHERE email = 'jay@example.org';
UPDATE profiles SET password_hash = 'pbkdf2$100000$7ba797081c8a1b4d65c4c9621b4fc4a3$e7c1d86d2451a5fc48ad5e8f897ea7fc9892f932bc7c1314631d90f3e45ee67a' WHERE email = 'kim@example.org';
