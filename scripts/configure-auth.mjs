import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import nextEnv from "@next/env";

const root = fileURLToPath(new URL("../", import.meta.url));
const AUTH_LINK_PATTERN = /ConfirmationURL|TokenHash|SiteURL|RedirectTo|<a\b|https?:\/\//i;

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Configure it privately in .env.local; do not paste credentials in chat.`);
  return value;
}

function siteOrigin(env) {
  const site = new URL(env.NEXT_PUBLIC_SITE_URL || "https://swagoncampus.vercel.app");
  if (site.protocol !== "https:" || site.username || site.password) throw new Error("NEXT_PUBLIC_SITE_URL must be the HTTPS production origin.");
  return site.origin;
}

export function buildEmailSettings(env, existing, template) {
  const email = required(env, "GMAIL_SMTP_USER").toLowerCase();
  const password = required(env, "GMAIL_APP_PASSWORD").replace(/\s/g, "");
  if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*@gmail\.com$/.test(email)) throw new Error("GMAIL_SMTP_USER must be the Gmail address used to create the App Password.");
  if (!/^[a-zA-Z0-9]{16}$/.test(password)) throw new Error("Use a 16-character Gmail App Password, not the regular account password.");
  if (!template.includes("{{ .Token }}") || AUTH_LINK_PATTERN.test(template)) throw new Error("Email template must contain only the numeric token flow, not authentication links.");
  if (existing.hook_send_email_enabled) throw new Error("A Send Email hook is enabled. Review that existing configuration before switching this project to Gmail SMTP.");

  return {
    external_email_enabled: true,
    mailer_autoconfirm: false,
    mailer_allow_unverified_email_sign_ins: false,
    mailer_otp_length: 6,
    mailer_otp_exp: 600,
    smtp_host: "smtp.gmail.com",
    smtp_port: "465",
    smtp_user: email,
    smtp_pass: password,
    smtp_admin_email: email,
    smtp_sender_name: "SwagOnCampus",
    smtp_max_frequency: 60,
    rate_limit_email_sent: 30,
    mailer_subjects_confirmation: "Your SwagOnCampus verification code",
    mailer_subjects_magic_link: "Your SwagOnCampus sign-in code",
    mailer_subjects_recovery: "Your SwagOnCampus password recovery code",
    mailer_templates_confirmation_content: template,
    mailer_templates_magic_link_content: template,
    mailer_templates_recovery_content: template,
  };
}

export function buildGoogleSettings(env, existing) {
  const clientId = required(env, "GOOGLE_CLIENT_ID");
  const secret = required(env, "GOOGLE_CLIENT_SECRET");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error("GOOGLE_CLIENT_ID must be a Google Web application OAuth client ID.");
  const site = siteOrigin(env);
  const allowed = new Set((existing.uri_allow_list ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
  allowed.add(`${site}/auth/callback`);
  return {
    site_url: site,
    uri_allow_list: [...allowed].join(","),
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: secret,
    external_google_skip_nonce_check: false,
  };
}

export function summarizeAuthSettings(settings) {
  const codeOnly = (template) => typeof template === "string" && template.includes("{{ .Token }}") && !AUTH_LINK_PATTERN.test(template);
  return {
    emailEnabled: settings.external_email_enabled === true,
    emailConfirmationRequired: settings.mailer_autoconfirm === false,
    otpLength: settings.mailer_otp_length,
    otpExpirySeconds: settings.mailer_otp_exp,
    gmailSmtpConfigured: settings.smtp_host === "smtp.gmail.com" && !!settings.smtp_user && !!settings.smtp_admin_email,
    emailHookEnabled: settings.hook_send_email_enabled === true,
    signupTemplateCodeOnly: codeOnly(settings.mailer_templates_confirmation_content),
    signinTemplateCodeOnly: codeOnly(settings.mailer_templates_magic_link_content),
    recoveryTemplateCodeOnly: codeOnly(settings.mailer_templates_recovery_content),
    emailLimitPerHour: settings.rate_limit_email_sent,
    googleEnabled: settings.external_google_enabled === true,
    googleClientConfigured: !!settings.external_google_client_id,
  };
}

async function main() {
  nextEnv.loadEnvConfig(root);
  const args = process.argv.slice(2);
  const applyEmail = args.includes("--apply-email");
  const applyGoogle = args.includes("--apply-google");
  if (args.some((arg) => !["--check", "--apply-email", "--apply-google"].includes(arg))) {
    throw new Error("Usage: npm run auth:config -- [--check | --apply-email | --apply-google]");
  }
  const projectUrl = new URL(required(process.env, "NEXT_PUBLIC_SUPABASE_URL"));
  if (!/^[a-z0-9]+\.supabase\.co$/.test(projectUrl.hostname) || projectUrl.protocol !== "https:") {
    throw new Error("This setup command requires the hosted Supabase HTTPS project URL.");
  }
  const projectRef = projectUrl.hostname.split(".")[0];
  console.log(`Auth configuration target: ${projectRef}`);
  console.log(`Google authorized redirect URI: ${projectUrl.origin}/auth/v1/callback`);
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!accessToken) {
    if (applyEmail || applyGoogle) throw new Error("SUPABASE_ACCESS_TOKEN is required to change project settings. A service-role key cannot configure SMTP or Google.");
    const response = await fetch(`${projectUrl.origin}/auth/v1/settings`, {
      headers: { apikey: required(process.env, "NEXT_PUBLIC_SUPABASE_ANON_KEY") }, signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Public auth settings request failed (HTTP ${response.status}).`);
    const settings = await response.json();
    console.log(JSON.stringify({ emailEnabled: settings.external?.email, emailConfirmationRequired: settings.mailer_autoconfirm === false, googleEnabled: settings.external?.google }, null, 2));
    console.log("SMTP, email templates, and OTP length cannot be checked without a Supabase management access token. No settings were changed.");
    process.exitCode = 2;
    return;
  }

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  async function getSettings() {
    const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Auth configuration read failed (HTTP ${response.status}). Check management-token permissions.`);
    return response.json();
  }
  const existing = await getSettings();
  const patch = {};
  if (applyEmail) Object.assign(patch, buildEmailSettings(process.env, existing, readFileSync(path.join(root, "supabase/templates/email-code.html"), "utf8")));
  if (applyGoogle) Object.assign(patch, buildGoogleSettings(process.env, existing));
  if (Object.keys(patch).length) {
    const response = await fetch(endpoint, { method: "PATCH", headers, body: JSON.stringify(patch), signal: AbortSignal.timeout(20_000) });
    // The API can return secret values. Never log or persist its response body.
    if (!response.ok) throw new Error(`Auth configuration update failed (HTTP ${response.status}); no secret response details were printed.`);
    console.log("Requested auth settings saved. Checking readiness without revealing credentials.");
  }
  const summary = summarizeAuthSettings(Object.keys(patch).length ? await getSettings() : existing);
  console.log(JSON.stringify(summary, null, 2));
  console.log("This checks configuration only. Verify actual email arrival and Google sign-in from a browser before declaring delivery operational.");
  if (!summary.emailEnabled || !summary.emailConfirmationRequired || summary.otpLength !== 6 || !summary.gmailSmtpConfigured || summary.emailHookEnabled ||
      !summary.signupTemplateCodeOnly || !summary.signinTemplateCodeOnly || !summary.recoveryTemplateCodeOnly || !summary.googleEnabled || !summary.googleClientConfigured) process.exitCode = 2;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Auth configuration failed.");
    process.exitCode = 1;
  });
}
