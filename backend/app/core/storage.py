import logging
from typing import Optional, Tuple
from datetime import datetime, timezone
import uuid
import mimetypes
from io import BytesIO

from b2sdk.v2 import InMemoryAccountInfo, B2Api

from .config import settings

logger = logging.getLogger(__name__)


class B2Storage:
    """Backblaze B2 storage client using native B2 API."""

    def __init__(self):
        if not all([settings.b2_keyid, settings.b2_applicationkey, settings.b2_bucket_name]):
            raise ValueError("B2 credentials not properly configured")

        # Initialize B2 API
        info = InMemoryAccountInfo()
        self.b2_api = B2Api(info)

        # Authorize account
        self.b2_api.authorize_account("production", settings.b2_keyid, settings.b2_applicationkey)

        # Get bucket
        self.bucket_name = settings.b2_bucket_name
        try:
            self.bucket = self.b2_api.get_bucket_by_name(self.bucket_name)
        except Exception as e:
            logger.error(f"Failed to get bucket '{self.bucket_name}': {e}")
            raise ValueError(f"B2 bucket '{self.bucket_name}' not found or not accessible")
    
    def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        folder: str = "policies"
    ) -> Tuple[str, str]:
        """
        Upload file to B2 bucket.

        Args:
            file_content: File content as bytes
            filename: Original filename
            content_type: MIME type (auto-detected if not provided)
            folder: Folder path in bucket

        Returns:
            Tuple of (file_key, public_url)
        """
        try:
            # Generate unique key with timestamp and UUID
            timestamp = datetime.now(timezone.utc).strftime('%Y/%m/%d')
            unique_id = str(uuid.uuid4())[:8]
            file_extension = filename.split('.')[-1] if '.' in filename else ''

            # Create the file key
            if file_extension:
                file_key = f"{folder}/{timestamp}/{unique_id}_{filename}"
            else:
                file_key = f"{folder}/{timestamp}/{unique_id}_{filename}"

            # Auto-detect content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = 'application/octet-stream'

            # Upload to B2 using native API
            file_info = {
                'original_filename': filename,
                'upload_timestamp': datetime.now(timezone.utc).isoformat()
            }

            uploaded_file = self.bucket.upload_bytes(
                data_bytes=file_content,
                file_name=file_key,
                content_type=content_type,
                file_info=file_info
            )

            # Generate public URL
            download_url = self.b2_api.get_download_url_for_file_name(
                self.bucket_name,
                file_key
            )

            logger.info(f"File uploaded successfully: {file_key}")
            return file_key, download_url

        except Exception as e:
            logger.error(f"Failed to upload file to B2: {e}")
            raise RuntimeError(f"File upload failed: {str(e)}")
    
    def delete_file(self, file_key: str) -> bool:
        """
        Delete file from B2 bucket.

        Args:
            file_key: The key of the file to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            # Find the file by name
            file_version = self.bucket.get_file_info_by_name(file_key)
            if file_version:
                self.b2_api.delete_file_version(file_version['fileId'], file_key)
                logger.info(f"File deleted successfully: {file_key}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_key}")
                return False

        except Exception as e:
            logger.error(f"Failed to delete file from B2: {e}")
            return False
    
    def get_file_url(self, file_key: str) -> str:
        """
        Get public URL for a file.

        Args:
            file_key: The key of the file

        Returns:
            Public URL string
        """
        return self.b2_api.get_download_url_for_file_name(self.bucket_name, file_key)

    def download_file(self, file_key: str) -> bytes:
        """
        Download file content from B2.

        Args:
            file_key: The key of the file to download

        Returns:
            File content as bytes
        """
        try:
            downloaded_file = self.bucket.download_file_by_name(file_key)
            download_dest = BytesIO()
            downloaded_file.save(download_dest)
            download_dest.seek(0)
            return download_dest.read()
        except Exception as e:
            logger.error(f"Failed to download file from B2: {e}")
            raise RuntimeError(f"File download failed: {str(e)}")
    
    def file_exists(self, file_key: str) -> bool:
        """
        Check if file exists in B2 bucket.

        Args:
            file_key: The key of the file to check

        Returns:
            True if file exists, False otherwise
        """
        try:
            file_info = self.bucket.get_file_info_by_name(file_key)
            return file_info is not None
        except Exception as e:
            logger.error(f"Error checking file existence: {e}")
            return False
    
    def get_file_info(self, file_key: str) -> Optional[dict]:
        """
        Get file metadata.

        Args:
            file_key: The key of the file

        Returns:
            Dictionary with file metadata or None if not found
        """
        try:
            file_info = self.bucket.get_file_info_by_name(file_key)

            if not file_info:
                return None

            return {
                'content_type': file_info.get('contentType'),
                'content_length': file_info.get('contentLength'),
                'upload_timestamp': file_info.get('uploadTimestamp'),
                'file_id': file_info.get('fileId'),
                'file_name': file_info.get('fileName'),
                'file_info_dict': file_info.get('fileInfo', {})
            }

        except Exception as e:
            logger.error(f"Error getting file info: {e}")
            return None


# Global storage instance
storage = B2Storage()


def upload_policy_file(file_content: bytes, filename: str) -> Tuple[str, str]:
    """
    Upload a policy file to B2 storage.
    
    Args:
        file_content: File content as bytes
        filename: Original filename
        
    Returns:
        Tuple of (file_key, public_url)
    """
    return storage.upload_file(file_content, filename, folder="policies")


def delete_policy_file(file_key: str) -> bool:
    """
    Delete a policy file from B2 storage.
    
    Args:
        file_key: The key of the file to delete
        
    Returns:
        True if successful, False otherwise
    """
    return storage.delete_file(file_key)


def get_policy_file_url(file_key: str) -> str:
    """
    Get public URL for a policy file.

    Args:
        file_key: The key of the file

    Returns:
        Public URL string
    """
    return storage.get_file_url(file_key)


def download_policy_file(file_key: str) -> bytes:
    """
    Download a policy file from B2 storage.

    Args:
        file_key: The key of the file to download

    Returns:
        File content as bytes
    """
    return storage.download_file(file_key)