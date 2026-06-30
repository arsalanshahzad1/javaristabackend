import cron from 'node-cron';
import Certification from '../models/certification.model';
import User from '../models/User';
import { createNotification } from '../services/notification.service';
import { triggerScoreRecompute } from '../services/score-events.service';

function buildEmailHtml(name: string, bodyText: string, certNumber: string, certType: string, expiryDate: string): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px;">
    <h2 style="color: #c0392b;">JavaRista Certification Notice</h2>
    <p>Hi ${name},</p>
    <p>${bodyText}</p>
    <p><strong>Certificate:</strong> ${certNumber}<br>
       <strong>Type:</strong> ${certType}<br>
       <strong>Expiry Date:</strong> ${expiryDate}</p>
    <p>Log in to JavaRista to view your certifications and renewal requirements.</p>
    <p style="color: #888; font-size: 12px;">Java Times Caffè — JavaRista Platform</p>
  </div>
</body>
</html>`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function friendlyCertType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function checkExpiringCertifications(): Promise<void> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Step 1 — Find certs expiring soon and send reminders
    const expiringSoon = await Certification.find({
      status: 'active',
      expiresAt: { $exists: true, $gt: now },
      renewalReminderDays: { $exists: true, $ne: null },
      $expr: {
        $lte: [
          '$expiresAt',
          { $add: [now, { $multiply: ['$renewalReminderDays', 24 * 60 * 60 * 1000] }] },
        ],
      },
      $or: [
        { renewalReminderSentAt: { $exists: false } },
        { renewalReminderSentAt: null },
        { renewalReminderSentAt: { $lt: thirtyDaysAgo } },
      ],
    });

    for (const cert of expiringSoon) {
      try {
        const user = await User.findById(cert.user).select('name email');
        if (!user) continue;

        const certType = friendlyCertType(cert.type);
        const expiryDate = cert.expiresAt ? formatDate(cert.expiresAt) : 'Unknown';
        const bodyText = `Your ${certType} certification expires on ${expiryDate}. Please complete renewal requirements.`;

        await createNotification({
          userId: cert.user,
          type: 'certification_expiring',
          title: 'Certification Expiring Soon',
          body: bodyText,
          link: '/certifications',
          sendEmail: true,
          emailHtml: buildEmailHtml(user.name, bodyText, cert.certificateNumber, certType, expiryDate),
        });

        cert.renewalReminderSentAt = now;
        await cert.save();
      } catch {
        // Isolate per-cert errors so one failure doesn't stop the rest
      }
    }

    // Step 2 — Mark expired certs as revoked
    const expired = await Certification.find({
      status: 'active',
      expiresAt: { $exists: true, $lte: now },
    });

    for (const cert of expired) {
      try {
        const user = await User.findById(cert.user).select('name email');

        cert.status = 'revoked';
        await cert.save();

        triggerScoreRecompute(cert.user.toString(), 'certification_expired').catch(() => {});

        if (user) {
          const certType = friendlyCertType(cert.type);
          const expiryDate = cert.expiresAt ? formatDate(cert.expiresAt) : 'Unknown';
          const bodyText = `Your ${certType} certification has expired. Please contact your manager to renew.`;

          await createNotification({
            userId: cert.user,
            type: 'certification_expiring',
            title: 'Certification Expired',
            body: bodyText,
            link: '/certifications',
            sendEmail: true,
            emailHtml: buildEmailHtml(user.name, bodyText, cert.certificateNumber, certType, expiryDate),
          });
        }
      } catch {
        // Isolate per-cert errors
      }
    }

    console.log(
      `[certificationExpiry] Checked: ${expiringSoon.length} reminders sent, ${expired.length} marked expired`
    );
  } catch (err) {
    console.error('[certificationExpiry] Job error:', err);
  }
}

export function startCertificationExpiryJob(): void {
  cron.schedule('0 8 * * *', () => {
    void checkExpiringCertifications();
  });
  console.log('Certification expiry job scheduled (daily 08:00)');
}
