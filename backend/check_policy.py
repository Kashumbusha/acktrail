#!/usr/bin/env python3
"""Check which policy uses the PDF file."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.models.database import SessionLocal
from app.models.models import Policy

def check_policies():
    """Check which policy has the PDF file."""
    print("=" * 60)
    print("Checking Policies with PDF Files")
    print("=" * 60)

    db = SessionLocal()

    try:
        # Get all policies with file_url
        policies = db.query(Policy).filter(Policy.file_url.isnot(None)).all()

        if not policies:
            print("\n  No policies with PDF files found")
            return

        print(f"\nFound {len(policies)} policies with files:\n")

        for policy in policies:
            print(f"  Policy ID: {policy.id}")
            print(f"  Title: {policy.title}")
            print(f"  Version: {policy.version}")
            print(f"  File URL: {policy.file_url}")
            print(f"  Created: {policy.created_at}")
            print()

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    check_policies()
