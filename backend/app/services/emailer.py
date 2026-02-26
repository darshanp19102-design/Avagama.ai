from __future__ import annotations

import smtplib
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def can_send_email() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD and settings.SMTP_FROM)


# Base64 and remote SVGs are aggressively blocked by Outlook/Gmail. 
# Using pure HTML typography styled exactly like the logo ensures 100% delivery.
LOGO_HTML = (
    '<div style="text-align:center;">'
    '<span style="font-family:\'Inter\',Arial,sans-serif;font-weight:600;'
    'font-size:32px;color:#7a528a;letter-spacing:-1.5px;">'
    'Avagama<span style="font-family:\'Nunito\',\'Varela Round\',sans-serif;font-weight:400;font-size:36px;color:#4ab0a5;letter-spacing:0px;">.ai</span>'
    '<sup style="font-size:10px;color:#b0b0b0;font-weight:400;margin-left:2px;">TM</sup></span>'
    '</div>'
)


def _email_wrapper(body_html: str) -> str:
    """Wrap email body in a branded, enterprise-grade HTML template."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f4fc;font-family:'Inter',Arial,Helvetica,sans-serif;color:#2f343a;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4fc;padding:40px 0;">
<tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <!-- Logo -->
    <tr><td style="text-align:center;padding:0 0 32px;">
      {LOGO_HTML}
    </td></tr>
    <!-- Card -->
    <tr><td style="background:#ffffff;border-radius:16px;padding:40px 44px;box-shadow:0 4px 24px rgba(0,0,0,.06);">
      {body_html}
    </td></tr>
    <!-- Footer -->
    <tr><td style="text-align:center;padding:28px 0 0;font-size:12px;color:#9ca3af;">
      Powered by Avaali &nbsp;|&nbsp; &copy; 2026, All Rights Reserved<br/>
      <span style="color:#b0b5bc;">This is an automated message from Avagama.ai</span>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""


def send_verification_email(to_email: str, verify_link: str) -> bool:
    if not can_send_email():
        return False

    body_html = f"""\
<h2 style="font-size:22px;font-weight:700;color:#1f2937;margin:0 0 8px;">Welcome to Avagama.ai! 🎉</h2>
<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
  Thank you for signing up. Please verify your email address to get started with AI-powered process evaluation.
</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:8px 0 24px;">
  <a href="{verify_link}" style="display:inline-block;background:linear-gradient(135deg,#b28bc5,#9e6eb1);color:#fff;
    text-decoration:none;padding:12px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:.01em;">
    Verify my email
  </a>
</td></tr>
</table>
<p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">
  Or copy and paste this link into your browser:<br/>
  <a href="{verify_link}" style="color:#9b51a5;word-break:break-all;">{verify_link}</a>
</p>
<hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px;"/>
<p style="font-size:12px;color:#b0b5bc;margin:0;">
  This link is valid for 5 minutes. If you did not create this account, you can safely ignore this email.
</p>"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Verify your Avagama.ai account'
    msg['From'] = settings.SMTP_FROM
    msg['To'] = to_email
    msg.attach(MIMEText(
        f"Welcome to Avagama.ai!\n\nPlease verify your email by clicking the link below (valid for 5 minutes):\n{verify_link}\n\n"
        f"If you did not create this account, you can ignore this message.",
        'plain'
    ))
    msg.attach(MIMEText(_email_wrapper(body_html), 'html'))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True


def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    if not can_send_email():
        return False

    body_html = f"""\
<h2 style="font-size:22px;font-weight:700;color:#1f2937;margin:0 0 8px;">Reset your password</h2>
<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
  We received a request to reset the password for your Avagama.ai account. Click the button below to set a new password.
</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:8px 0 24px;">
  <a href="{reset_link}" style="display:inline-block;background:linear-gradient(135deg,#b28bc5,#9e6eb1);color:#fff;
    text-decoration:none;padding:12px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:.01em;">
    Reset password
  </a>
</td></tr>
</table>
<p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0;">
  Or copy and paste this link into your browser:<br/>
  <a href="{reset_link}" style="color:#9b51a5;word-break:break-all;">{reset_link}</a>
</p>
<hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0 16px;"/>
<p style="font-size:12px;color:#b0b5bc;margin:0;">
  This link is valid for 5 minutes. If you did not request a password reset, you can safely ignore this email.
</p>"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Reset your Avagama.ai password'
    msg['From'] = settings.SMTP_FROM
    msg['To'] = to_email
    msg.attach(MIMEText(
        f"You requested a password reset for your Avagama.ai account.\n\n"
        f"Click the link below to reset your password (valid for 5 minutes):\n{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email.",
        'plain'
    ))
    msg.attach(MIMEText(_email_wrapper(body_html), 'html'))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True
