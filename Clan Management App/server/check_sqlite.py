import sqlite3

try:
    conn = sqlite3.connect('prisma/dev.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name, phone, branch, registrationPaid FROM Member")
    members = cursor.fetchall()
    
    print(f"Found {len(members)} members in SQLite DB")
    for i in range(min(5, len(members))):
        print(members[i])
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
