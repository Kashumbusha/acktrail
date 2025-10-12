"""
Script to create a backup of the database before cleanup.
"""
import subprocess
import os
from datetime import datetime
from app.core.config import settings

def backup_database():
    """Create a PostgreSQL dump of the current database."""

    # Parse database URL
    db_url = settings.database_url

    # Extract connection details from URL
    # Format: postgresql://user:pass@host:port/dbname
    if "@" in db_url:
        # Split credentials and host
        creds_part = db_url.split("://")[1].split("@")[0]
        host_part = db_url.split("@")[1]

        user = creds_part.split(":")[0]
        password = creds_part.split(":")[1] if ":" in creds_part else ""

        host = host_part.split(":")[0].split("/")[0]
        port = host_part.split(":")[1].split("/")[0] if ":" in host_part else "5432"
        dbname = host_part.split("/")[-1]

        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_{dbname}_{timestamp}.sql"

        print(f"📦 Creating backup: {backup_file}")
        print(f"   Database: {dbname}")
        print(f"   Host: {host}")

        # Set password environment variable
        env = os.environ.copy()
        env['PGPASSWORD'] = password

        try:
            # Run pg_dump
            subprocess.run([
                'pg_dump',
                '-h', host,
                '-p', port,
                '-U', user,
                '-d', dbname,
                '-f', backup_file
            ], env=env, check=True)

            print(f"✅ Backup created successfully: {backup_file}")
            print(f"   You can restore it with: psql -h {host} -U {user} -d {dbname} -f {backup_file}")
            return backup_file

        except subprocess.CalledProcessError as e:
            print(f"❌ Backup failed: {str(e)}")
            print("⚠️  Make sure pg_dump is installed: brew install postgresql")
            return None
    else:
        print("❌ Could not parse database URL")
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("💾 DATABASE BACKUP SCRIPT")
    print("=" * 60)
    backup_database()
