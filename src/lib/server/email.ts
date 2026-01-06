import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(env.SMTP_PORT || '587'),
  secure: env.SMTP_PORT === '465',
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD
  }
});

const fromAddress = `"${env.SMTP_FROM_NAME || 'Checkmate'}" <${env.SMTP_FROM_ADDRESS || 'noreply@checkmate.com'}>`;
const appUrl = env.PUBLIC_APP_URL || 'http://localhost:5173';
const appName = env.PUBLIC_APP_NAME || 'Checkmate';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '')
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email Templates
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .logo { text-align: center; margin-bottom: 30px; font-size: 28px; font-weight: bold; color: #6366f1; }
    .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #4f46e5; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .muted { color: #888; font-size: 13px; }
    h1 { color: #111; margin-bottom: 20px; }
    .code { background: #f4f4f5; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #6366f1; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">${appName}</div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p class="muted">This email was sent from ${appUrl}</p>
    </div>
  </div>
</body>
</html>`;
}

// Organization Invitation Email
export async function sendOrganizationInvite(
  to: string,
  organizationName: string,
  role: string,
  inviteToken: string,
  inviterName?: string
): Promise<boolean> {
  const inviteUrl = `${appUrl}/invite/${inviteToken}`;
  const roleDisplay = role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  const content = `
    <h1>You're Invited!</h1>
    <p>${inviterName ? `${inviterName} has invited you` : 'You have been invited'} to join <strong>${organizationName}</strong> on ${appName} as a <strong>${roleDisplay}</strong>.</p>
    <p>${appName} is a powerful education platform for creating tests, study materials, and tracking student progress.</p>
    <p style="text-align: center;">
      <a href="${inviteUrl}" class="button">Accept Invitation</a>
    </p>
    <p class="muted">This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
    <p class="muted">Or copy this link: ${inviteUrl}</p>
  `;

  return sendEmail({
    to,
    subject: `You're invited to join ${organizationName} on ${appName}`,
    html: baseTemplate(content)
  });
}

// Organization Owner Welcome Email (when admin creates org)
export async function sendOrgOwnerWelcome(
  to: string,
  organizationName: string,
  tempPassword: string
): Promise<boolean> {
  const loginUrl = `${appUrl}/login`;

  const content = `
    <h1>Welcome to ${appName}!</h1>
    <p>Your organization <strong>${organizationName}</strong> has been approved and set up on ${appName}.</p>
    <p>You have been assigned as the <strong>Organization Owner</strong>. Here are your login credentials:</p>
    <p><strong>Email:</strong> ${to}</p>
    <p><strong>Temporary Password:</strong></p>
    <div class="code">${tempPassword}</div>
    <p style="text-align: center;">
      <a href="${loginUrl}" class="button">Login to Your Account</a>
    </p>
    <p><strong>Important:</strong> Please change your password immediately after logging in for security purposes.</p>
    <p class="muted">If you didn't request this account, please contact our support team.</p>
  `;

  return sendEmail({
    to,
    subject: `Welcome to ${appName} - Your organization is ready!`,
    html: baseTemplate(content)
  });
}

// Password Reset Email
export async function sendPasswordReset(
  to: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${appUrl}/reset-password/${resetToken}`;

  const content = `
    <h1>Reset Your Password</h1>
    <p>We received a request to reset your password for your ${appName} account.</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </p>
    <p class="muted">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    <p class="muted">Or copy this link: ${resetUrl}</p>
  `;

  return sendEmail({
    to,
    subject: `Reset your ${appName} password`,
    html: baseTemplate(content)
  });
}

// Email Verification
export async function sendEmailVerification(
  to: string,
  verificationToken: string
): Promise<boolean> {
  const verifyUrl = `${appUrl}/verify-email/${verificationToken}`;

  const content = `
    <h1>Verify Your Email</h1>
    <p>Thank you for signing up for ${appName}! Please verify your email address to complete your registration.</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="button">Verify Email</a>
    </p>
    <p class="muted">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    <p class="muted">Or copy this link: ${verifyUrl}</p>
  `;

  return sendEmail({
    to,
    subject: `Verify your ${appName} email address`,
    html: baseTemplate(content)
  });
}

// Class Invitation Email
export async function sendClassInvite(
  to: string,
  className: string,
  teacherName: string,
  joinCode: string
): Promise<boolean> {
  const joinUrl = `${appUrl}/join?code=${joinCode}`;

  const content = `
    <h1>You're Invited to a Class!</h1>
    <p><strong>${teacherName}</strong> has invited you to join their class <strong>${className}</strong> on ${appName}.</p>
    <p>Use the following code to join:</p>
    <div class="code">${joinCode}</div>
    <p style="text-align: center;">
      <a href="${joinUrl}" class="button">Join Class</a>
    </p>
    <p class="muted">If you don't have an account, you'll be prompted to create one when you click the button above.</p>
  `;

  return sendEmail({
    to,
    subject: `Join ${className} on ${appName}`,
    html: baseTemplate(content)
  });
}

// Test Assigned Notification
export async function sendTestAssigned(
  to: string,
  testTitle: string,
  className: string,
  dueDate?: Date
): Promise<boolean> {
  const content = `
    <h1>New Test Assigned</h1>
    <p>A new test has been assigned in your class <strong>${className}</strong>:</p>
    <h2 style="color: #6366f1;">${testTitle}</h2>
    ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
    <p style="text-align: center;">
      <a href="${appUrl}/student" class="button">View Test</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `New Test: ${testTitle} - ${className}`,
    html: baseTemplate(content)
  });
}

// Test Graded Notification
export async function sendTestGraded(
  to: string,
  testTitle: string,
  score: number,
  totalPoints: number
): Promise<boolean> {
  const percentage = Math.round((score / totalPoints) * 100);

  const content = `
    <h1>Your Test Has Been Graded</h1>
    <p>Your submission for <strong>${testTitle}</strong> has been graded.</p>
    <div class="code">${score} / ${totalPoints} (${percentage}%)</div>
    <p style="text-align: center;">
      <a href="${appUrl}/student/grades" class="button">View Details</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `Test Graded: ${testTitle} - ${percentage}%`,
    html: baseTemplate(content)
  });
}

// Request Approved Notification
export async function sendRequestApproved(
  to: string,
  organizationName: string
): Promise<boolean> {
  const content = `
    <h1>Request Approved!</h1>
    <p>Great news! Your request to create <strong>${organizationName}</strong> on ${appName} has been approved.</p>
    <p>You can now log in to your account and start setting up your organization.</p>
    <p style="text-align: center;">
      <a href="${appUrl}/login" class="button">Login Now</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `Your ${appName} organization has been approved!`,
    html: baseTemplate(content)
  });
}

// Admin User Invite Email (for platform admins creating users)
export async function sendUserInvite(
  to: string,
  inviteToken: string,
  role: string
): Promise<boolean> {
  const inviteUrl = `${appUrl}/invite/${inviteToken}`;
  const roleDisplay = role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  const content = `
    <h1>Welcome to ${appName}!</h1>
    <p>An administrator has created an account for you on ${appName} as a <strong>${roleDisplay}</strong>.</p>
    <p>Click the button below to set up your account and create your password:</p>
    <p style="text-align: center;">
      <a href="${inviteUrl}" class="button">Set Up Your Account</a>
    </p>
    <p class="muted">This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
    <p class="muted">Or copy this link: ${inviteUrl}</p>
  `;

  return sendEmail({
    to,
    subject: `You've been invited to ${appName}`,
    html: baseTemplate(content)
  });
}

// Request Rejected Notification
export async function sendRequestRejected(
  to: string,
  organizationName: string,
  reason?: string
): Promise<boolean> {
  const content = `
    <h1>Request Update</h1>
    <p>We've reviewed your request to create <strong>${organizationName}</strong> on ${appName}.</p>
    <p>Unfortunately, we were unable to approve your request at this time.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>If you believe this was a mistake or have additional information to provide, please contact our support team.</p>
  `;

  return sendEmail({
    to,
    subject: `Update on your ${appName} organization request`,
    html: baseTemplate(content)
  });
}

// Feature Request Response Email
export async function sendFeatureRequestResponse(
  to: string,
  requestTitle: string,
  status: string,
  adminResponse: string,
  adminName?: string
): Promise<boolean> {
  const statusColors: Record<string, string> = {
    'pending': '#6b7280',
    'in-review': '#3b82f6',
    'planned': '#8b5cf6',
    'in-progress': '#f59e0b',
    'completed': '#10b981',
    'rejected': '#ef4444'
  };
  
  const statusLabels: Record<string, string> = {
    'pending': 'Pending',
    'in-review': 'In Review',
    'planned': 'Planned',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'rejected': 'Not Planned'
  };

  const statusColor = statusColors[status] || '#6b7280';
  const statusLabel = statusLabels[status] || status;

  const content = `
    <h1>Feature Request Update</h1>
    <p>Your feature request has been reviewed by our team.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">${requestTitle}</p>
      <p style="margin: 0;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: white; background-color: ${statusColor};">
          ${statusLabel}
        </span>
      </p>
    </div>
    
    <h2 style="font-size: 16px; margin-top: 24px;">Response from ${adminName || 'the team'}:</h2>
    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #1e40af; white-space: pre-wrap;">${adminResponse}</p>
    </div>
    
    <p class="muted">Thank you for helping us improve ${appName}!</p>
  `;

  return sendEmail({
    to,
    subject: `Update on your feature request: ${requestTitle}`,
    html: baseTemplate(content)
  });
}
