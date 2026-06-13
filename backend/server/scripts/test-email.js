const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  throw envResult.error;
}

const requiredKeys = [
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_USER',
  'MAIL_PASS',
  'MAIL_FROM',
  'FRONTEND_URL',
];

function readRequired(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function hasMarkdownLink(value) {
  return /\[[^\]]+\]\([^)]+\)/.test(value);
}

function normalizeGmailAppPassword(value) {
  return value.replace(/\s/g, '');
}

function getSafeMailErrorMessage(error) {
  if (
    error?.code === 'EAUTH' ||
    error?.responseCode === 534 ||
    error?.responseCode === 535
  ) {
    return 'SMTP authentication failed. Check MAIL_USER, Gmail App Password, and that 2-Step Verification is enabled.';
  }

  if (
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ECONNECTION' ||
    error?.code === 'ESOCKET' ||
    error?.code === 'EDNS'
  ) {
    return 'SMTP connection failed or timed out. Check network access, MAIL_HOST, and MAIL_PORT.';
  }

  return error?.message || 'Unable to send test email due to an SMTP error.';
}

function loadMailConfig() {
  const config = Object.fromEntries(
    requiredKeys.map((key) => [key, readRequired(key)]),
  );
  const port = Number(config.MAIL_PORT);
  const rawPass = config.MAIL_PASS;
  const pass = normalizeGmailAppPassword(rawPass);
  const secure = port === 465;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('MAIL_PORT must be a valid number.');
  }

  if (config.MAIL_HOST !== 'smtp.gmail.com' || ![465, 587].includes(port)) {
    console.warn(
      'Warning: Gmail SMTP is expected to use MAIL_HOST=smtp.gmail.com and MAIL_PORT=587 or 465.',
    );
  }

  if (rawPass.length !== 16) {
    console.warn(
      `Warning: MAIL_PASS_LENGTH is ${rawPass.length}. Gmail App Passwords are usually 16 characters; check .env format and App Password value.`,
    );
  }

  if (hasMarkdownLink(config.MAIL_USER) || hasMarkdownLink(config.MAIL_FROM)) {
    throw new Error(
      'MAIL_USER/MAIL_FROM must be plain email values, not Markdown links. Example: MAIL_FROM="Cinema Booking" <your_email@gmail.com>',
    );
  }

  if (hasMarkdownLink(config.FRONTEND_URL)) {
    throw new Error(
      'FRONTEND_URL must be a plain URL. Example: FRONTEND_URL=http://localhost:3000',
    );
  }

  new URL(config.FRONTEND_URL);

  return {
    host: config.MAIL_HOST,
    port,
    secure,
    user: config.MAIL_USER,
    pass,
    from: config.MAIL_FROM,
    frontendUrl: config.FRONTEND_URL,
    rawPassLength: rawPass.length,
    normalizedPassLength: pass.length,
  };
}

async function main() {
  const mailConfig = loadMailConfig();

  console.log('--- SMTP config check ---');
  console.log(`ENV_FILE: ${envPath}`);
  console.log(`MAIL_HOST: ${mailConfig.host}`);
  console.log(`MAIL_PORT: ${mailConfig.port}`);
  console.log(`MAIL_SECURE: ${mailConfig.secure}`);
  console.log(`MAIL_USER: ${mailConfig.user}`);
  console.log(`MAIL_FROM: ${mailConfig.from}`);
  console.log('MAIL_PASS_EXISTS: true');
  console.log(`MAIL_PASS_LENGTH: ${mailConfig.rawPassLength}`);
  if (mailConfig.normalizedPassLength !== mailConfig.rawPassLength) {
    console.log(`MAIL_PASS_NORMALIZED_LENGTH: ${mailConfig.normalizedPassLength}`);
  }
  console.log(`FRONTEND_URL: ${mailConfig.frontendUrl}`);
  console.log('-------------------------');

  const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    auth: {
      user: mailConfig.user,
      pass: mailConfig.pass,
    },
  });

  console.log('Verifying SMTP transporter...');
  await transporter.verify();

  console.log(`Sending test email to ${mailConfig.user}...`);
  const info = await transporter.sendMail({
    from: mailConfig.from,
    to: mailConfig.user,
    subject: 'Cinema Booking SMTP test',
    text: [
      'This is a development SMTP test email from Cinema Booking.',
      '',
      'If you received this email, MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, and MAIL_FROM are working.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2e7d32;">Cinema Booking SMTP test</h2>
        <p>This is a development SMTP test email from Cinema Booking.</p>
        <p>If you received this email, the mail environment variables are working.</p>
      </div>
    `,
  });

  console.log('Test email sent successfully.');
  console.log(`Message ID: ${info.messageId}`);
}

main().catch((error) => {
  console.error('SMTP test failed.');
  console.error(getSafeMailErrorMessage(error));
  console.error(
    'For Gmail, MAIL_PASS must be a Gmail App Password. Enable 2-Step Verification, create an App Password, and paste it into MAIL_PASS without extra spaces.',
  );
  process.exit(1);
});
