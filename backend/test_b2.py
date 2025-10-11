#!/usr/bin/env python3
"""Test script to verify B2 connection and credentials."""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.storage import storage
from app.core.config import settings

def test_b2_connection():
    """Test B2 connection and credentials."""
    print("=" * 60)
    print("Testing B2 (Backblaze) Connection")
    print("=" * 60)

    # Print configuration (masked)
    print(f"\nB2 Configuration:")
    print(f"  Key ID: {settings.b2_keyid[:10]}...{settings.b2_keyid[-4:]}")
    print(f"  Application Key: {settings.b2_applicationkey[:10]}...")
    print(f"  Bucket Name: {settings.b2_bucket_name}")

    try:
        print(f"\n✓ B2 Storage client initialized successfully")
        print(f"  Bucket: {storage.bucket.name}")

        # Test upload with a small file
        print(f"\n[1/3] Testing file upload...")
        test_content = b"This is a test file from AckTrail app"
        test_filename = "test_connection.txt"

        file_key, file_url = storage.upload_file(
            file_content=test_content,
            filename=test_filename,
            folder="test"
        )

        print(f"  ✓ Upload successful!")
        print(f"    File Key: {file_key}")
        print(f"    URL: {file_url}")

        # Test download
        print(f"\n[2/3] Testing file download...")
        downloaded_content = storage.download_file(file_key)

        if downloaded_content == test_content:
            print(f"  ✓ Download successful! Content matches.")
        else:
            print(f"  ✗ Download failed! Content mismatch.")
            return False

        # Test file info
        print(f"\n[3/3] Testing file info retrieval...")
        file_info = storage.get_file_info(file_key)

        if file_info:
            print(f"  ✓ File info retrieved successfully!")
            print(f"    Content Type: {file_info.get('content_type')}")
            print(f"    Size: {file_info.get('content_length')} bytes")
        else:
            print(f"  ✗ Failed to retrieve file info")
            return False

        # Cleanup - delete test file
        print(f"\n[Cleanup] Deleting test file...")
        if storage.delete_file(file_key):
            print(f"  ✓ Test file deleted successfully")
        else:
            print(f"  ! Warning: Failed to delete test file")

        print(f"\n{'=' * 60}")
        print(f"✓ All B2 tests passed successfully!")
        print(f"{'=' * 60}")
        return True

    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"✗ B2 Connection Test Failed!")
        print(f"{'=' * 60}")
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_b2_connection()
    sys.exit(0 if success else 1)
