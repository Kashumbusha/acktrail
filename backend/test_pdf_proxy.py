#!/usr/bin/env python3
"""Test PDF proxy functionality."""

import sys
import os
from urllib.parse import unquote

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.models.database import SessionLocal
from app.models.models import Policy
from app.core.storage import download_policy_file

def test_pdf_proxy():
    """Test PDF proxy for a specific policy."""
    print("=" * 60)
    print("Testing PDF Proxy Functionality")
    print("=" * 60)

    db = SessionLocal()

    try:
        # Get the policy
        policy_id = "ab50f812-688d-4ce9-9521-399a1d9d1965"
        policy = db.query(Policy).filter(Policy.id == policy_id).first()

        if not policy:
            print(f"\n✗ Policy {policy_id} not found")
            return False

        print(f"\nPolicy found:")
        print(f"  ID: {policy.id}")
        print(f"  Title: {policy.title}")
        print(f"  File URL: {policy.file_url}")

        # Extract file key using the same logic as in policies.py
        file_url = policy.file_url
        print(f"\n[1/3] Extracting file key from URL...")

        # Split URL to get the file key
        # URL format: https://f003.backblazeb2.com/file/bucket-name/path/to/file.pdf
        url_parts = file_url.split('/')
        bucket_name = url_parts[4]  # Should be 'userfileskashustephen'

        # Get everything after /bucket-name/
        file_key = file_url.split(f"/{bucket_name}/", 1)[1]

        # URL decode the file key
        file_key_decoded = unquote(file_key)

        print(f"  Bucket name: {bucket_name}")
        print(f"  File key (URL encoded): {file_key}")
        print(f"  File key (decoded): {file_key_decoded}")

        # Test download
        print(f"\n[2/3] Testing file download from B2...")

        try:
            # Try with URL decoded key
            file_content = download_policy_file(file_key_decoded)
            print(f"  ✓ Download successful with decoded key!")
            print(f"    File size: {len(file_content):,} bytes ({len(file_content) / 1024:.2f} KB)")

            # Verify it's a valid PDF
            if file_content.startswith(b'%PDF'):
                print(f"  ✓ File is a valid PDF")
            else:
                print(f"  ✗ File does not appear to be a PDF")
                return False

        except Exception as e:
            print(f"  ✗ Download with decoded key failed: {e}")
            print(f"\n  Trying with URL encoded key...")

            try:
                file_content = download_policy_file(file_key)
                print(f"  ✓ Download successful with encoded key!")
                print(f"    File size: {len(file_content):,} bytes ({len(file_content) / 1024:.2f} KB)")

                if file_content.startswith(b'%PDF'):
                    print(f"  ✓ File is a valid PDF")
                else:
                    print(f"  ✗ File does not appear to be a PDF")
                    return False

            except Exception as e2:
                print(f"  ✗ Download with encoded key also failed: {e2}")
                return False

        print(f"\n[3/3] PDF proxy test completed successfully!")
        print(f"\n{'=' * 60}")
        print(f"✓ PDF Proxy Working!")
        print(f"{'=' * 60}")

        return True

    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"✗ PDF Proxy Test Failed!")
        print(f"{'=' * 60}")
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        db.close()


if __name__ == "__main__":
    success = test_pdf_proxy()
    sys.exit(0 if success else 1)
