import hashlib
from typing import Union


def compute_sha256(content: Union[str, bytes]) -> str:
    """
    Compute SHA-256 hash of content.
    
    Args:
        content: String or bytes content to hash
        
    Returns:
        Hexadecimal SHA-256 hash string
    """
    if isinstance(content, str):
        content = content.encode('utf-8')
    
    return hashlib.sha256(content).hexdigest()


def compute_policy_hash(
    title: str,
    body_markdown: str = None,
    file_content: bytes = None
) -> str:
    """
    Compute SHA-256 hash for policy content.
    
    This creates a deterministic hash based on the policy's content
    to detect changes and ensure integrity.
    
    Args:
        title: Policy title
        body_markdown: Policy markdown content (if any)
        file_content: Policy file content in bytes (if any)
        
    Returns:
        Hexadecimal SHA-256 hash string
    """
    hasher = hashlib.sha256()
    
    # Add title
    hasher.update(title.encode('utf-8'))
    
    # Add markdown content if present
    if body_markdown:
        hasher.update(body_markdown.encode('utf-8'))
    
    # Add file content if present
    if file_content:
        hasher.update(file_content)
    
    return hasher.hexdigest()


def verify_policy_hash(
    expected_hash: str,
    title: str,
    body_markdown: str = None,
    file_content: bytes = None
) -> bool:
    """
    Verify if policy content matches expected hash.
    
    Args:
        expected_hash: Expected SHA-256 hash
        title: Policy title
        body_markdown: Policy markdown content (if any)
        file_content: Policy file content in bytes (if any)
        
    Returns:
        True if hash matches, False otherwise
    """
    computed_hash = compute_policy_hash(title, body_markdown, file_content)
    return computed_hash == expected_hash


def compute_file_hash(file_content: bytes) -> str:
    """
    Compute SHA-256 hash of file content.
    
    Args:
        file_content: File content as bytes
        
    Returns:
        Hexadecimal SHA-256 hash string
    """
    return hashlib.sha256(file_content).hexdigest()


def verify_file_hash(expected_hash: str, file_content: bytes) -> bool:
    """
    Verify if file content matches expected hash.
    
    Args:
        expected_hash: Expected SHA-256 hash
        file_content: File content as bytes
        
    Returns:
        True if hash matches, False otherwise
    """
    computed_hash = compute_file_hash(file_content)
    return computed_hash == expected_hash