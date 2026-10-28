/*
 * Sends a test OTP email using the settings in backend/.env.
 *   node scripts/test-email.cjs your.name@hindujarenewables.com
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { verifyMailer, sendOtpEmail, provider } = require('../config/mailer');

(async () => {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.error('Usage: node scripts/test-email.cjs <your-email>');
    process.exit(1);
  }
  console.log(`Provider: ${provider()}`);
  console.log(`Connection: ${await verifyMailer()}`);
  await sendOtpEmail(to, '000000', 5);
  console.log(`Test email sent to ${to}. Check the inbox (and junk folder).`);
})().catch((e) => {
  console.error(`Failed: ${e.message}`);
  if (/AADSTS7000215|invalid_client/.test(e.message)) console.error('Hint: GRAPH_CLIENT_SECRET is wrong or expired — use the secret VALUE, not its ID.');
  if (/AADSTS700016|unauthorized_client/.test(e.message)) console.error('Hint: GRAPH_CLIENT_ID or GRAPH_TENANT_ID is wrong.');
  if (/\(403\)|ErrorAccessDenied/.test(e.message)) console.error('Hint: Mail.Send (Application) needs admin consent, or the RBAC scope does not include GRAPH_SENDER.');
  if (/\(404\)|ErrorInvalidUser|MailboxNotEnabled/.test(e.message)) console.error('Hint: GRAPH_SENDER must be an existing mailbox (a shared mailbox is fine).');
  if (/535|5\.7\.139|5\.7\.3/.test(e.message)) console.error('Hint: SMTP AUTH is disabled for this mailbox/tenant. Use MAIL_PROVIDER=graph.');
  process.exit(1);
});
