import boto3
import logging
from typing import Optional, Tuple
from botocore.exceptions import ClientError, NoCredentialsError
from datetime import datetime, timezone
import uuid
import mimetypes
from io import BytesIO

from .config import settings

logger = logging.getLogger(__name__)


class B2Storage:
    """Backblaze B2 storage client using S3-compatible API."""
    
    def __init__(self):
        if not all([settings.b2_keyid, settings.b2_applicationkey, settings.b2_bucket_name]):
            raise ValueError("B2 credentials not properly configured")
        
        # B2 S3-compatible endpoint
        self.endpoint_url = "https://s3.us-west-000.backblazeb2.com"
        
        # Initialize S3 client with B2 credentials
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=settings.b2_keyid,
            aws_secret_access_key=settings.b2_applicationkey,
            region_name='us-west-000'
        )
        self.bucket_name = settings.b2_bucket_name
    
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
            
            # Upload to B2
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type,
                Metadata={
                    'original_filename': filename,
                    'upload_timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
            
            # Generate public URL
            public_url = f"https://f000.backblazeb2.com/file/{self.bucket_name}/{file_key}"
            
            logger.info(f"File uploaded successfully: {file_key}")
            return file_key, public_url
            
        except ClientError as e:
            logger.error(f"Failed to upload file to B2: {e}")
            raise RuntimeError(f"File upload failed: {str(e)}")
        except NoCredentialsError:
            logger.error("B2 credentials not found or invalid")
            raise RuntimeError("B2 credentials not found or invalid")
        except Exception as e:
            logger.error(f"Unexpected error during file upload: {e}")
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
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            logger.info(f"File deleted successfully: {file_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file from B2: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during file deletion: {e}")
            return False
    
    def get_file_url(self, file_key: str) -> str:
        """
        Get public URL for a file.
        
        Args:
            file_key: The key of the file
            
        Returns:
            Public URL string
        """
        return f"https://f000.backblazeb2.com/file/{self.bucket_name}/{file_key}"
    
    def file_exists(self, file_key: str) -> bool:
        """
        Check if file exists in B2 bucket.
        
        Args:
            file_key: The key of the file to check
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            logger.error(f"Error checking file existence: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking file existence: {e}")
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
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            
            return {
                'content_type': response.get('ContentType'),
                'content_length': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'metadata': response.get('Metadata', {}),
                'etag': response.get('ETag', '').strip('"')
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            logger.error(f"Error getting file info: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting file info: {e}")
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