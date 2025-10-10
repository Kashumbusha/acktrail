from typing import Optional, Dict, Any
import logging
from datetime import datetime
from jinja2 import Template

import requests

from .config import settings

logger = logging.getLogger(__name__)


def send_brevo_email(
    to_email: str, 
    subject: str, 
    html_content: str, 
    sender_name: Optional[str] = None,
    tags: Optional[list] = None
) -> Optional[str]:
    """Send email via Brevo API and return message ID."""
    api_key = settings.brevo_api_key
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    if sender_name is None:
        sender_name = settings.sender_name

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key,
    }
    
    payload = {
        "sender": {"email": settings.sender_email, "name": sender_name},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }
    
    if tags:
        payload["tags"] = tags
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        resp.raise_for_status()
        result = resp.json()
        message_id = result.get("messageId")
        logger.info(f"Email sent successfully to {to_email}, message_id: {message_id}")
        return message_id
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise


def render_auth_code_email(name: str, code: str, org_name: str) -> str:
    """Render the authentication code email template."""
    template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Authentication Code</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #333; }
            .code { font-size: 32px; font-weight: bold; text-align: center; background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; color: #007bff; letter-spacing: 2px; }
            .content { line-height: 1.6; color: #333; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">{{ org_name }}</div>
            </div>
            
            <div class="content">
                <h2>Hello {{ name }},</h2>
                <p>Your authentication code is:</p>
                
                <div class="code">{{ code }}</div>
                
                <p>This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.</p>
                
                <p>Enter this code in the application to complete your sign-in.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from {{ org_name }}. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """)
    
    return template.render(name=name, code=code, org_name=org_name)


def render_magic_link_email(
    user_name: str, 
    policy_title: str, 
    magic_link_url: str, 
    due_date: Optional[datetime] = None,
    org_name: str = None
) -> str:
    """Render the magic link email template."""
    if org_name is None:
        org_name = settings.org_name
    
    due_text = ""
    if due_date:
        due_text = f"<p><strong>Due date:</strong> {due_date.strftime('%B %d, %Y at %I:%M %p')}</p>"
    
    template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Policy Acknowledgment Required</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #333; }
            .content { line-height: 1.6; color: #333; }
            .policy-title { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; font-weight: bold; }
            .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
            .cta-button:hover { background-color: #0056b3; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
            .urgent { color: #dc3545; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">{{ org_name }}</div>
            </div>
            
            <div class="content">
                <h2>Hello {{ user_name }},</h2>
                <p>You have been assigned a new policy that requires your acknowledgment:</p>
                
                <div class="policy-title">{{ policy_title }}</div>
                
                {{ due_text|safe }}
                
                <p>Please click the button below to review and acknowledge this policy:</p>
                
                <div style="text-align: center;">
                    <a href="{{ magic_link_url }}" class="cta-button">Review & Acknowledge Policy</a>
                </div>
                
                <p><small>If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href="{{ magic_link_url }}">{{ magic_link_url }}</a></small></p>
                
                <p>This link is unique to you and will expire in 30 days. If you have any questions about this policy, please contact your administrator.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from {{ org_name }}. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """)
    
    return template.render(
        user_name=user_name,
        policy_title=policy_title,
        magic_link_url=magic_link_url,
        due_text=due_text,
        org_name=org_name
    )


def render_reminder_email(
    user_name: str,
    policy_title: str,
    magic_link_url: str,
    days_remaining: int,
    reminder_count: int,
    org_name: str = None
) -> str:
    """Render the reminder email template with different styles based on reminder count."""
    if org_name is None:
        org_name = settings.org_name
    
    # Determine styling and messaging based on reminder count
    if reminder_count == 1:
        # First reminder - gentle and friendly
        reminder_text = "This is a friendly reminder"
        header_color = "#007bff"
        button_color = "#007bff"
        border_color = "#007bff"
        urgency_text = "gentle-reminder"
    elif reminder_count == 2:
        # Second reminder - more urgent
        reminder_text = "This is your second reminder"
        header_color = "#ffc107"
        button_color = "#ffc107"
        border_color = "#ffc107"
        urgency_text = "urgent-reminder"
    else:
        # Third/final reminder - most urgent
        reminder_text = "This is your final reminder"
        header_color = "#dc3545"
        button_color = "#dc3545"
        border_color = "#dc3545"
        urgency_text = "final-reminder"
    
    urgency_class = "urgent" if days_remaining <= 3 or reminder_count >= 2 else ""
    
    template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Policy Acknowledgment Reminder</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 5px solid {{ border_color }}; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #333; }
            .reminder-badge { background-color: {{ header_color }}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; display: inline-block; margin-bottom: 20px; }
            .content { line-height: 1.6; color: #333; }
            .policy-title { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; font-weight: bold; border-left: 3px solid {{ header_color }}; }
            .cta-button { display: inline-block; background-color: {{ button_color }}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .cta-button:hover { opacity: 0.9; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
            .urgent { color: #dc3545; font-weight: bold; }
            .gentle-reminder .content h2 { color: #007bff; }
            .urgent-reminder .content h2 { color: #ffc107; }
            .final-reminder .content h2 { color: #dc3545; }
            .deadline-warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 15px 0; }
            .overdue-warning { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px; margin: 15px 0; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container {{ urgency_text }}">
            <div class="header">
                <div class="logo">{{ org_name }}</div>
                <div class="reminder-badge">{{ reminder_text }}</div>
            </div>
            
            <div class="content">
                <h2>Hello {{ user_name }},</h2>
                {% if reminder_count == 1 %}
                    <p>We hope this message finds you well. We wanted to gently remind you that you have a policy requiring acknowledgment:</p>
                {% elif reminder_count == 2 %}
                    <p>We notice you haven't yet acknowledged the following policy. Your prompt attention would be appreciated:</p>
                {% else %}
                    <p><strong>URGENT:</strong> This is your final reminder. Immediate action is required for the following policy:</p>
                {% endif %}
                
                <div class="policy-title">{{ policy_title }}</div>
                
                {% if days_remaining > 3 %}
                    <p>This policy acknowledgment is due in {{ days_remaining }} day(s).</p>
                {% elif days_remaining > 0 %}
                    <div class="deadline-warning">
                        ⚠️ <strong>Deadline approaching:</strong> This policy acknowledgment is due in {{ days_remaining }} day(s).
                    </div>
                {% else %}
                    <div class="overdue-warning">
                        🚨 <strong>OVERDUE:</strong> This policy acknowledgment is past due and requires immediate attention.
                    </div>
                {% endif %}
                
                {% if reminder_count == 1 %}
                    <p>When you have a moment, please click the button below to review and acknowledge this policy:</p>
                {% elif reminder_count == 2 %}
                    <p>Please prioritize reviewing and acknowledging this policy by clicking the button below:</p>
                {% else %}
                    <p><strong>Please acknowledge this policy immediately by clicking the button below:</strong></p>
                    <p><em>Failure to acknowledge this policy may result in further escalation.</em></p>
                {% endif %}
                
                <div style="text-align: center;">
                    <a href="{{ magic_link_url }}" class="cta-button">
                        {% if reminder_count >= 3 %}Acknowledge Now{% else %}Review & Acknowledge Policy{% endif %}
                    </a>
                </div>
                
                <p><small>If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href="{{ magic_link_url }}">{{ magic_link_url }}</a></small></p>
                
                {% if reminder_count >= 2 %}
                    <p style="margin-top: 30px; padding: 15px; background-color: #e9ecef; border-radius: 4px;">
                        <strong>Need help?</strong> If you're experiencing any issues or have questions about this policy, 
                        please contact your administrator immediately.
                    </p>
                {% endif %}
            </div>
            
            <div class="footer">
                <p>This is an automated message from {{ org_name }}. Please do not reply to this email.</p>
                {% if reminder_count >= 3 %}
                    <p style="color: #dc3545; font-weight: bold;">This is your final reminder - no additional reminders will be sent.</p>
                {% endif %}
            </div>
        </div>
    </body>
    </html>
    """)
    
    return template.render(
        user_name=user_name,
        policy_title=policy_title,
        magic_link_url=magic_link_url,
        days_remaining=days_remaining,
        reminder_count=reminder_count,
        urgency_class=urgency_class,
        reminder_text=reminder_text,
        urgency_text=urgency_text,
        header_color=header_color,
        button_color=button_color,
        border_color=border_color,
        org_name=org_name
    )


def send_auth_code_email(user_email: str, user_name: str, code: str) -> Optional[str]:
    """Send authentication code email."""
    subject = f"Your {settings.org_name} Authentication Code"
    html_content = render_auth_code_email(user_name, code, settings.org_name)
    
    return send_brevo_email(
        to_email=user_email,
        subject=subject,
        html_content=html_content,
        tags=["auth_code"]
    )


def send_policy_assignment_email(
    user_email: str,
    user_name: str,
    policy_title: str,
    magic_link_url: str,
    due_date: Optional[datetime] = None
) -> Optional[str]:
    """Send policy assignment email with magic link."""
    subject = f"Policy Acknowledgment Required: {policy_title}"
    html_content = render_magic_link_email(
        user_name, policy_title, magic_link_url, due_date
    )
    
    return send_brevo_email(
        to_email=user_email,
        subject=subject,
        html_content=html_content,
        tags=["policy_assignment"]
    )


def send_reminder_email(
    user_email: str,
    user_name: str,
    policy_title: str,
    magic_link_url: str,
    days_remaining: int,
    reminder_count: int
) -> Optional[str]:
    """Send reminder email for pending policy acknowledgment."""
    subject = f"Reminder: Policy Acknowledgment Required - {policy_title}"
    html_content = render_reminder_email(
        user_name, policy_title, magic_link_url, days_remaining, reminder_count
    )
    
    return send_brevo_email(
        to_email=user_email,
        subject=subject,
        html_content=html_content,
        tags=["policy_reminder"]
    )






