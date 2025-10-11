#!/usr/bin/env python3
"""List all files in B2 bucket."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.core.storage import storage

def list_files():
    """List all files in the B2 bucket."""
    print("=" * 60)
    print(f"Files in bucket: {storage.bucket_name}")
    print("=" * 60)

    try:
        # List all files in the bucket
        files = list(storage.bucket.ls(recursive=True))

        if not files:
            print("\n  No files found in bucket")
            return

        print(f"\nFound {len(files)} files:\n")

        for file_info in files:
            # file_info is a tuple: (file_version_info, folder_name)
            file_version = file_info[0]

            file_name = file_version.file_name
            file_size = file_version.size
            content_type = file_version.content_type

            print(f"  • {file_name}")
            print(f"    Size: {file_size:,} bytes ({file_size / 1024:.2f} KB)")
            print(f"    Type: {content_type}")
            print()

    except Exception as e:
        print(f"\nError listing files: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    list_files()
