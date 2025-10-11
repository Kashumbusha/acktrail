#!/usr/bin/env python3
"""Test the PDF proxy API endpoint."""

import requests
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.models.database import SessionLocal
from app.models.models import User
from app.core.security import create_jwt_token

def test_pdf_endpoint():
    """Test the PDF proxy endpoint with authentication."""
    print("=" * 60)
    print("Testing PDF Proxy API Endpoint")
    print("=" * 60)

    # Get or create a test user
    db = SessionLocal()
    user = db.query(User).filter(User.email == "kashustephen@gmail.com").first()

    if not user:
        print("✗ Test user not found")
        return False

    print(f"\nTest user: {user.email}")
    print(f"User ID: {user.id}")

    # Create access token
    token = create_jwt_token(user_id=str(user.id), email=user.email, role=user.role)
    print(f"\n✓ Generated JWT token")

    # Test policy ID (from earlier check)
    policy_id = "ab50f812-688d-4ce9-9521-399a1d9d1965"

    # Test the endpoint
    url = f"http://localhost:8000/api/policies/{policy_id}/file"
    headers = {
        "Authorization": f"Bearer {token}"
    }

    print(f"\n[1/2] Testing PDF proxy endpoint...")
    print(f"  URL: {url}")

    try:
        response = requests.get(url, headers=headers, timeout=30)

        print(f"  Status Code: {response.status_code}")

        if response.status_code == 200:
            print(f"  ✓ PDF downloaded successfully!")
            print(f"    Content-Type: {response.headers.get('Content-Type')}")
            print(f"    Content-Length: {len(response.content):,} bytes ({len(response.content) / 1024:.2f} KB)")

            # Verify it's a PDF
            if response.content.startswith(b'%PDF'):
                print(f"    ✓ Content is a valid PDF")
            else:
                print(f"    ✗ Content does not appear to be a PDF")
                return False

        else:
            print(f"  ✗ Request failed!")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print(f"  ✗ Request error: {e}")
        return False

    # Test with query parameter token (for "Open in New Tab")
    print(f"\n[2/2] Testing with query parameter token...")
    url_with_token = f"{url}?token={token}"
    print(f"  URL: {url_with_token}")

    try:
        response = requests.get(url_with_token, timeout=30)

        print(f"  Status Code: {response.status_code}")

        if response.status_code == 200:
            print(f"  ✓ PDF downloaded successfully with query token!")
            print(f"    Content-Length: {len(response.content):,} bytes")

            if response.content.startswith(b'%PDF'):
                print(f"    ✓ Content is a valid PDF")
            else:
                print(f"    ✗ Content does not appear to be a PDF")
                return False

        else:
            print(f"  ✗ Request failed!")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print(f"  ✗ Request error: {e}")
        return False

    print(f"\n{'=' * 60}")
    print(f"✓ All PDF Proxy API Tests Passed!")
    print(f"{'=' * 60}")

    db.close()
    return True


if __name__ == "__main__":
    success = test_pdf_endpoint()
    sys.exit(0 if success else 1)
