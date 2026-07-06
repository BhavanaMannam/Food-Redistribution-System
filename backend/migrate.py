import sqlite3
import hashlib

conn = sqlite3.connect('food_redistribution.db')
cur = conn.cursor()

# Add is_public to tenants
try:
    cur.execute('ALTER TABLE tenants ADD COLUMN is_public INTEGER DEFAULT 1')
    print('Added is_public to tenants')
except Exception as e:
    print('is_public:', e)

# Add password_hash to users
try:
    cur.execute('ALTER TABLE users ADD COLUMN password_hash TEXT')
    print('Added password_hash to users')
except Exception as e:
    print('password_hash:', e)

# Migrate existing plain-text passwords
cur.execute('SELECT id, password FROM users WHERE password IS NOT NULL')
rows = cur.fetchall()
for uid, pwd in rows:
    if pwd:
        hashed = hashlib.sha256(pwd.encode()).hexdigest()
        cur.execute('UPDATE users SET password_hash = ? WHERE id = ?', (hashed, uid))
        print(f'Migrated user id={uid}')

conn.commit()

# Verify
print('\n--- tenants columns ---')
for r in cur.execute('PRAGMA table_info(tenants)').fetchall():
    print(r)
print('\n--- users columns ---')
for r in cur.execute('PRAGMA table_info(users)').fetchall():
    print(r)
print('\n--- users data ---')
for r in cur.execute('SELECT id, username, password_hash FROM users').fetchall():
    print(r)

conn.close()
print('\nMigration complete.')
