import assert from "node:assert/strict";
import fs, { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, mock, test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { NextRequest } from "next/server.js";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const loadDependency = createRequire(import.meta.url);
const noRequests = mock.method(globalThis, "fetch", () => assert.fail("Auth tests must not make live requests."));
let envFileReads = 0;
const noEnvFiles = mock.method(fs, "readFileSync", (file, ...args) => {
  if (/(^|[\\/])\.env(?:\.|$)/.test(String(file))) {
    envFileReads++;
    assert.fail("Auth tests must not load credentials.");
  }
  return readFileSync(file, ...args);
});
after(() => {
  noRequests.mock.restore();
  noEnvFiles.mock.restore();
  assert.equal(noRequests.mock.callCount(), 0, "No live requests, including during configuration import");
  assert.equal(envFileReads, 0, "No environment-file loading, including during configuration import");
});

const { buildEmailSettings, buildGoogleSettings, summarizeAuthSettings } = await import("./configure-auth.mjs");

// Compile real TypeScript as in analytics.test.mjs; replace only external boundaries.
function loadModule(file, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file,
  });
  const testModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: testModule, exports: testModule.exports,
    require: (name) => name in mocks ? mocks[name] : loadDependency(name),
    URL, TextDecoder, console, fetch: noRequests, ...globals,
  }, { filename: file });
  return testModule.exports;
}

const auth = loadModule("lib/auth.ts");
const site = "https://shop.example";
const oauthCode = "fixture-oauth-code+private/value";
const providerDetail = "fixture-provider-error-description";
const privateDetail = "fixture-private-smtp-password-and-provider-token";
const sessionToken = "fixture-session-access-token";
const emailEnv = Object.freeze({ GMAIL_SMTP_USER: "  Fixture.Sender@GMAIL.COM  ", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" });
const googleEnv = Object.freeze({
  NEXT_PUBLIC_SITE_URL: site,
  GOOGLE_CLIENT_ID: "123456789012-fixturewebclient.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "fixture-google-client-secret",
});
const emailTemplate = readFileSync(path.join(root, "supabase/templates/email-code.html"), "utf8");
const unrelatedSettings = Object.freeze({
  mfa_totp_enroll_enabled: true,
  mfa_totp_verify_enabled: true,
  sessions_timebox: 3600,
  sessions_inactivity_timeout: 900,
  sessions_single_per_user: true,
  jwt_exp: 1800,
  password_min_length: 12,
  external_apple_enabled: true,
});
const unsafeRedirects = [
  undefined, null, "", "account", " /account", "https://outside.example/account", `${site}/account`,
  "http://outside.example", "javascript:alert(1)", "//outside.example", "///outside.example",
  "\\account", "/\\outside.example", "/account\\settings", "/account?next=\\outside.example",
  "/account\u0000", "/account\t", "/account\r\n", "/account\u001f", "/account settings",
  "/%2foutside.example", "/%2F%2Foutside.example", "/%5coutside.example", "/account%5Csettings",
  "/account%00", "/account%09", "/account%0a", "/account%0D", "/account%1f", "/account%20settings",
  "/account/..//outside.example", "/account/%2e%2e//outside.example", "/.//outside.example",
  "/auth", "/auth/signin?redirect=/account", "/auth/callback", "/api", "/api/products",
  "/%61uth/signin", "/%61pi/products", "/auth%2fsignin", "/api%2Fproducts",
  "/account/../auth/signup", "/account/%2e%2e/api/products",
  "/%", "/%2", "/%GG", "/%E0%A4%A", "/%C0%AF", "/%ED%A0%80",
];
const invalidTemplates = [
  "", "<p>No code here</p>", "<p>{{ .TokenHash }}</p>", "<p>{{ .ConfirmationURL }}</p>",
  "<p>{{ .Token }} {{ .TokenHash }}</p>", "<p>{{ .Token }} {{ .ConfirmationURL }}</p>",
  '<a href="https://shop.example/auth/confirm">{{ .Token }}</a>',
  '<A HREF="{{ .ConfirmationURL }}">{{ .Token }}</A>',
];

test("configuration helpers import without running main, reading credentials, or fetching", () => {
  assert.equal(noRequests.mock.callCount(), 0);
  assert.equal(envFileReads, 0);
  for (const helper of [buildEmailSettings, buildGoogleSettings, summarizeAuthSettings]) assert.equal(typeof helper, "function");
});

test("email normalization trims and lowercases without dropping dots or plus aliases", () => {
  assert.equal(auth.normalizeEmail(" \tStudent.Name+Orders@Example.COM\r\n"), "student.name+orders@example.com");
  assert.equal(auth.normalizeEmail("  "), "");
  const normalized = auth.normalizeEmail("Person@example.com");
  assert.equal(auth.normalizeEmail(normalized), normalized);
});

test("email validation accepts addresses and rejects missing parts, whitespace, and excess length", () => {
  const longest = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
  assert.equal(longest.length, 254);
  for (const email of ["student@example.com", "Student.Name+Orders@Example.COM", longest]) {
    assert.equal(auth.isEmail(email), true, email);
  }
  for (const email of ["", "student", "student@", "@example.com", "student@example", "student@@example.com",
    " student@example.com", "student@example.com ", "stu dent@example.com", "student@exam\nple.com", `a${longest}`]) {
    assert.equal(auth.isEmail(email), false, JSON.stringify(email));
  }
});

test("email codes accept exactly six ASCII digits, including leading zeroes", () => {
  assert.equal(auth.EMAIL_CODE_LENGTH, 6);
  for (const code of ["000000", "000001", "012345", "100000", "123456", "999999"]) {
    assert.equal(auth.isEmailCode(code), true, code);
  }
  for (const code of [undefined, null, "", "0", "12345", "1234567", "123 456", " 123456", "123456 ",
    "123456\n", "12345\n", "12345x", "123.45", "+12345", "-12345", "1e0005", "\u0661\u0662\u0663\u0664\u0665\u0666",
    "\uff11\uff12\uff13\uff14\uff15\uff16"]) {
    assert.equal(auth.isEmailCode(code), false, JSON.stringify(code));
  }
});

test("email codes reject numbers and other values that coerce to six digits", () => {
  for (const code of [123456, ["123456"], { toString: () => "123456" }]) {
    assert.equal(auth.isEmailCode(code), false, JSON.stringify(code));
  }
});

test("safe redirects preserve internal account, vendor, and admin destinations with query and hash", () => {
  for (const destination of ["/", "/account", "/vendor", "/admin", "/account?tab=orders&sort=desc#latest",
    "/vendor/orders?page=2#pending", "/admin/products?category=tees#top", "/account?label=hello%20there#saved",
    "/authors", "/apiary"]) {
    assert.equal(auth.safeAuthRedirect(destination), destination);
  }
  assert.equal(auth.safeAuthRedirect("/shop/../account?tab=orders#latest"), "/account?tab=orders#latest");
  assert.equal(auth.safeAuthRedirect("/vendor/./orders"), "/vendor/orders");
});

test("safe redirects reject outside origins, encoded separators, controls, normalized double slashes, loops, and malformed escapes", () => {
  for (const destination of unsafeRedirects) {
    assert.equal(auth.safeAuthRedirect(destination), "/", JSON.stringify(destination));
  }
});

test("safe redirects reject literal and encoded DEL control characters", () => {
  for (const destination of ["/account\u007f", "/account%7f", "/account%7F"]) {
    assert.equal(auth.safeAuthRedirect(destination), "/", JSON.stringify(destination));
  }
});

test("auth errors explain SMTP failures, rate limits, and invalid or expired codes without raw details", () => {
  for (const error of [{ status: 500 }, { code: "email_address_not_authorized" }, { code: "email_provider_disabled" }, { code: "unexpected_failure" }]) {
    const message = auth.authErrorMessage({ ...error, message: privateDetail }, "send");
    assert.match(message, /email delivery.*unavailable/i);
    assert.ok(!message.includes(privateDetail));
  }
  for (const error of [{ status: 429 }, { code: "over_email_send_rate_limit" }, { code: "over_request_rate_limit" }]) {
    for (const action of ["send", "verify", "password", "google", "update"]) {
      const message = auth.authErrorMessage({ ...error, message: privateDetail }, action);
      assert.match(message, /too many requests.*wait/i);
      assert.ok(!message.includes(privateDetail));
    }
  }
  for (const code of ["otp_expired", "otp_disabled", "validation_failed"]) {
    const message = auth.authErrorMessage({ code, message: privateDetail }, "verify");
    assert.match(message, /code.*incorrect.*expired.*used/i);
    assert.ok(!message.includes(privateDetail));
  }
});

test("auth errors have safe password and action-specific fallbacks for unknown or thrown failures", () => {
  for (const [code, action, expected] of [
    ["same_password", "update", /different.*password/i],
    ["weak_password", "update", /stronger password.*8/i],
    ["invalid_credentials", "password", /unable to sign in/i],
    ["email_not_confirmed", "password", /unable to sign in/i],
  ]) {
    const message = auth.authErrorMessage({ code, message: privateDetail }, action);
    assert.match(message, expected);
    assert.ok(!message.includes(privateDetail));
  }
  for (const [action, expected] of [["send", /send a code/i], ["verify", /verify.*code/i],
    ["password", /sign-in failed/i], ["google", /google sign-in/i], ["update", /password.*updated/i]]) {
    for (const error of [null, undefined, privateDetail, new Error(privateDetail), { message: privateDetail, code: privateDetail, status: 503 }]) {
      const message = auth.authErrorMessage(error, action);
      assert.match(message, expected);
      assert.ok(!message.includes(privateDetail));
    }
  }
});

function callback(options = {}) {
  const calls = { create: 0, codes: [], otps: [] };
  const logs = [];
  const record = (...args) => logs.push(args);
  const handlers = loadModule("app/auth/callback/route.ts", {
    "@/lib/auth": auth,
    "@/lib/supabase/server": {
      createClient: async () => {
        calls.create++;
        if (options.createError) throw options.createError;
        return {
          auth: {
            exchangeCodeForSession: async (code) => {
              calls.codes.push(code);
              if (options.exchangeError) throw options.exchangeError;
              return options.result ?? { data: { session: { access_token: sessionToken } }, error: null };
            },
            verifyOtp: async (params) => {
              calls.otps.push(params);
              if (options.verifyError) throw options.verifyError;
              return options.result ?? { data: { session: { access_token: sessionToken } }, error: null };
            },
          },
        };
      },
    },
  }, { console: { log: record, warn: record, error: record } });
  return { ...handlers, calls, logs };
}

function callbackRequest(params = {}) {
  const url = new URL("/auth/callback", site);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new NextRequest(url);
}

async function redirectLocation(response, route) {
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const location = new URL(response.headers.get("location"));
  assert.equal(location.origin, site);
  const output = JSON.stringify([...response.headers]) + await response.text() + JSON.stringify(route.logs);
  for (const secret of [oauthCode, providerDetail, privateDetail, sessionToken]) {
    assert.ok(!output.includes(secret), "Redirects and logs must not echo private values");
    assert.ok(!output.includes(encodeURIComponent(secret)), "Redirects and logs must not echo encoded private values");
  }
  assert.equal(location.searchParams.has("code"), false);
  assert.equal(location.searchParams.has("error_description"), false);
  return location;
}

test("OAuth callback exchanges the exact code once and preserves safe destinations without caching or leaking", async () => {
  for (const destination of ["/account?tab=orders#latest", "/vendor/orders?page=2#pending", "/admin?view=analytics#today"]) {
    for (const key of ["next", "redirect"]) {
      const route = callback();
      assert.equal(route.dynamic, "force-dynamic");
      const response = await route.GET(callbackRequest({ code: oauthCode, [key]: destination, error_description: providerDetail }));
      assert.equal((await redirectLocation(response, route)).href, `${site}${destination}`);
      assert.deepEqual(route.calls, { create: 1, codes: [oauthCode], otps: [] });
    }
  }
});

test("OAuth callback prefers redirect over next and defaults invalid or absent destinations to the site root", async () => {
  for (const params of [{ next: "/vendor", redirect: "/account", expected: "/account" },
    { next: "/vendor", redirect: "//outside.example", expected: "/" },
    { next: "/vendor", redirect: "", expected: "/" }, { expected: "/" }]) {
    const { expected, ...query } = params;
    const route = callback();
    const response = await route.GET(callbackRequest({ code: oauthCode, ...query }));
    assert.equal((await redirectLocation(response, route)).href, `${site}${expected}`);
  }
});

test("OAuth callback cannot turn unsafe destinations into success or failure redirects", async () => {
  for (const destination of unsafeRedirects.filter((value) => typeof value === "string")) {
    for (const code of [oauthCode, ""]) {
      const route = callback();
      const response = await route.GET(callbackRequest({ code, next: destination, error_description: providerDetail }));
      const location = await redirectLocation(response, route);
      assert.equal(location.href, code ? `${site}/` : `${site}/auth/signin?error=auth_error`, destination);
    }
  }
});

test("OAuth callback handles missing or empty codes without creating a Supabase client", async () => {
  for (const query of [{}, { code: "" }]) {
    const route = callback();
    const response = await route.GET(callbackRequest({ ...query, next: "/vendor?view=orders#pending", error_description: providerDetail }));
    const location = await redirectLocation(response, route);
    assert.equal(location.pathname, "/auth/signin");
    assert.equal(location.searchParams.get("error"), "auth_error");
    assert.equal(location.searchParams.get("redirect"), "/vendor?view=orders#pending");
    assert.deepEqual(route.calls, { create: 0, codes: [], otps: [] });
  }
});

test("OAuth callback handles exchange errors, null sessions, and exceptions without exposing provider details", async () => {
  for (const options of [
    { result: { data: { session: null }, error: { message: privateDetail } } },
    { result: { data: { session: { access_token: sessionToken } }, error: { message: privateDetail } } },
    { result: { data: { session: null }, error: null } },
    { exchangeError: new Error(privateDetail) },
    { createError: new Error(privateDetail) },
  ]) {
    const route = callback(options);
    const response = await route.GET(callbackRequest({ code: oauthCode, redirect: "/admin?view=analytics#today", error_description: providerDetail }));
    const location = await redirectLocation(response, route);
    assert.equal(location.pathname, "/auth/signin");
    assert.equal(location.searchParams.get("error"), "auth_error");
    assert.equal(location.searchParams.get("redirect"), "/admin?view=analytics#today");
    assert.deepEqual(route.calls, { create: 1, codes: options.createError ? [] : [oauthCode], otps: [] });
  }
});

test("cancelled or failed OAuth never exchanges a supplied code or reflects arbitrary provider errors", async () => {
  for (const error of ["access_denied", "server_error", privateDetail, ""]) {
    const route = callback();
    const response = await route.GET(callbackRequest({ code: oauthCode, error, error_description: providerDetail, next: "/account#profile" }));
    const location = await redirectLocation(response, route);
    assert.equal(location.pathname, "/auth/signin");
    assert.equal(location.searchParams.get("error"), error === "access_denied" ? "oauth_cancelled" : "auth_error");
    assert.equal(location.searchParams.get("redirect"), "/account#profile");
    assert.deepEqual(route.calls, { create: 0, codes: [], otps: [] });
  }
});

test("Supabase verification links sign in via token_hash and reject unknown or failed types", async () => {
  const tokenHash = "fixture-email-token-hash-private";
  // calls.otps elements are created inside the VM realm, so compare fields
  // instead of deepStrictEqual (same structure, different prototypes).
  const assertOtpCalls = (calls, { create, codes, otp }) => {
    assert.equal(calls.create, create);
    assert.deepEqual([...calls.codes], codes);
    assert.equal(calls.otps.length, otp ? 1 : 0);
    if (otp) {
      assert.equal(calls.otps[0].type, otp.type);
      assert.equal(calls.otps[0].token_hash, otp.token_hash);
    }
  };

  // A known link type verifies the session and lands on the safe destination.
  const route = callback();
  const response = await route.GET(callbackRequest({ token_hash: tokenHash, type: "magiclink", next: "/account?tab=orders#latest", error_description: providerDetail }));
  const location = await redirectLocation(response, route);
  assert.equal(location.href, `${site}/account?tab=orders#latest`);
  assert.equal(location.searchParams.has("token_hash"), false);
  assertOtpCalls(route.calls, { create: 1, codes: [], otp: { type: "magiclink", token_hash: tokenHash } });

  // Unknown types and missing values never reach the auth client.
  for (const query of [{ token_hash: tokenHash, type: "ssh_magic" }, { token_hash: tokenHash }, { type: "magiclink" }, {}]) {
    const unknown = callback();
    const failed = await redirectLocation(await unknown.GET(callbackRequest(query)), unknown);
    assert.equal(failed.pathname, "/auth/signin");
    assert.equal(failed.searchParams.get("error"), "auth_error");
    assertOtpCalls(unknown.calls, { create: 0, codes: [], otp: null });
  }

  // Verification errors and null sessions fall back without leaking details.
  for (const options of [
    { result: { data: { session: null }, error: { message: privateDetail } } },
    { result: { data: { session: null }, error: null } },
    { verifyError: new Error(privateDetail) },
    { createError: new Error(privateDetail) },
  ]) {
    const failing = callback(options);
    const failed = await redirectLocation(
      await failing.GET(callbackRequest({ token_hash: tokenHash, type: "recovery", redirect: "/account#profile", error_description: providerDetail })),
      failing,
    );
    assert.equal(failed.pathname, "/auth/signin");
    assert.equal(failed.searchParams.get("error"), "auth_error");
    assert.equal(failed.searchParams.get("redirect"), "/account#profile");
    assertOtpCalls(failing.calls, {
      create: 1,
      codes: [],
      otp: options.createError ? null : { type: "recovery", token_hash: tokenHash },
    });
  }
});

test("sign-in is Google plus password only; sign-up is Google plus code then set-password", () => {
  const form = readFileSync(path.join(root, "components/EmailAuthForm.tsx"), "utf8");
  // Both screens offer Google.
  assert.match(form, /signInWithGoogle/);
  assert.match(form, /Continue with Google/);
  // Sign-in: password form with forgot-password link, no code flow or toggles.
  assert.match(form, /signInWithPassword/);
  assert.match(form, /\/auth\/forgot-password/);
  assert.doesNotMatch(form, /Use a password instead|Use an email code instead/);
  assert.doesNotMatch(form, /purpose="signin"/);
  // Sign-up: email code stage, then the set-password stage via updateUser.
  assert.match(form, /purpose="signup"/);
  assert.match(form, /stage === "code"/);
  assert.match(form, /setStage\("password"\)/);
  assert.match(form, /updateUser\(\{ password \}\)/);

  // The signup code request carries a callback redirect so link-style emails
  // still create a session instead of landing signed-out on the site root.
  const codeForm = readFileSync(path.join(root, "components/EmailCodeForm.tsx"), "utf8");
  assert.match(codeForm, /emailRedirectTo/);
  assert.match(codeForm, /\/auth\/callback\?next=/);
});

test("email settings use normalized Gmail App Passwords and require six-digit confirmed code-only flows", () => {
  const settings = buildEmailSettings(emailEnv, unrelatedSettings, emailTemplate);
  assert.deepEqual(settings, {
    external_email_enabled: true,
    mailer_autoconfirm: false,
    mailer_allow_unverified_email_sign_ins: false,
    mailer_otp_length: 6,
    mailer_otp_exp: 600,
    smtp_host: "smtp.gmail.com",
    smtp_port: "465",
    smtp_user: "fixture.sender@gmail.com",
    smtp_pass: "abcdefghijklmnop",
    smtp_admin_email: "fixture.sender@gmail.com",
    smtp_sender_name: "SwagOnCampus",
    smtp_max_frequency: 60,
    rate_limit_email_sent: 30,
    mailer_subjects_confirmation: "Your SwagOnCampus verification code",
    mailer_subjects_magic_link: "Your SwagOnCampus sign-in code",
    mailer_subjects_recovery: "Your SwagOnCampus password recovery code",
    mailer_templates_confirmation_content: emailTemplate,
    mailer_templates_magic_link_content: emailTemplate,
    mailer_templates_recovery_content: emailTemplate,
  });
  for (const kind of ["confirmation", "magic_link", "recovery"]) {
    const template = settings[`mailer_templates_${kind}_content`];
    assert.match(template, /\{\{ \.Token \}\}/);
    assert.doesNotMatch(template, /ConfirmationURL|TokenHash|<a\b/i);
    assert.match(template.replace("{{ .Token }}", "012345"), /012345/);
  }
  assert.equal(buildEmailSettings({ ...emailEnv, GMAIL_APP_PASSWORD: " abcd\tefgh\nijkl mnop " }, {}, emailTemplate).smtp_pass, "abcdefghijklmnop");
});

test("email settings are a narrow patch and do not mutate MFA, sessions, other providers, or input", () => {
  const existing = Object.freeze({ ...unrelatedSettings, hook_send_email_enabled: false, smtp_pass: "fixture-old-password" });
  const before = structuredClone(existing);
  const patch = buildEmailSettings(emailEnv, existing, emailTemplate);
  assert.deepEqual(existing, before);
  for (const [key, value] of Object.entries(unrelatedSettings)) {
    assert.equal(Object.hasOwn(patch, key), false, key);
    assert.deepEqual({ ...existing, ...patch }[key], value, key);
  }
  assert.deepEqual(emailEnv, { GMAIL_SMTP_USER: "  Fixture.Sender@GMAIL.COM  ", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop" });
});

test("email settings reject missing credentials, regular-password formats, invalid Gmail senders, and active email hooks", () => {
  for (const password of [undefined, "", " ", "short", "RegularPassword!", "a".repeat(15), "a".repeat(17), "abcd efgh ijkl mno!"]) {
    assert.throws(() => buildEmailSettings({ ...emailEnv, GMAIL_APP_PASSWORD: password }, {}, emailTemplate), /GMAIL_APP_PASSWORD|App Password/);
  }
  for (const sender of [undefined, "", " ", "sender@example.com", "sender@googlemail.com", "sender@gmail.com.outside.example",
    "@gmail.com", "sender@@gmail.com", "invalid sender@gmail.com"]) {
    assert.throws(() => buildEmailSettings({ ...emailEnv, GMAIL_SMTP_USER: sender }, {}, emailTemplate), /GMAIL_SMTP_USER/);
  }
  assert.throws(() => buildEmailSettings(emailEnv, { hook_send_email_enabled: true }, emailTemplate), /Send Email hook/);
});

test("email settings reject malformed Gmail local parts", () => {
  for (const sender of ["invalid<sender>@gmail.com", "invalid:sender@gmail.com"]) {
    assert.throws(() => buildEmailSettings({ ...emailEnv, GMAIL_SMTP_USER: sender }, {}, emailTemplate), /GMAIL_SMTP_USER/);
  }
});

test("email settings reject missing numeric tokens, token hashes, confirmation links, and HTML anchors", () => {
  for (const template of invalidTemplates) {
    assert.throws(() => buildEmailSettings(emailEnv, {}, template), /numeric token flow/, template);
  }
});

test("email settings reject plain-text authentication links embedding the numeric token", () => {
  const template = "<p>https://shop.example/auth/confirm?token={{ .Token }}</p>";
  assert.throws(() => buildEmailSettings(emailEnv, {}, template), /numeric token flow/);
});

test("Google settings preserve and deduplicate the redirect allowlist and add only the exact site callback", () => {
  const oldEntries = ["https://legacy.example/auth/callback", "http://localhost:3000/auth/callback", "https://preview.example/**"];
  const existing = Object.freeze({ ...unrelatedSettings, uri_allow_list: ` ${oldEntries.join(", ")},${oldEntries[0]}, ` });
  const before = structuredClone(existing);
  const settings = buildGoogleSettings({ ...googleEnv, NEXT_PUBLIC_SITE_URL: `${site}/ignored/path?query=value#hash` }, existing);
  assert.deepEqual(settings.uri_allow_list.split(","), [...oldEntries, `${site}/auth/callback`]);
  assert.equal(settings.site_url, site);
  assert.deepEqual(existing, before);
  assert.deepEqual(buildGoogleSettings(googleEnv, settings), settings);
  assert.equal(buildGoogleSettings(googleEnv, {}).uri_allow_list, `${site}/auth/callback`);
});

test("Google settings enable the supplied fixture credentials, retain nonce verification, and add no Gmail scopes or unrelated settings", () => {
  const settings = buildGoogleSettings({ ...googleEnv, GOOGLE_CLIENT_ID: ` ${googleEnv.GOOGLE_CLIENT_ID} `,
    GOOGLE_CLIENT_SECRET: ` ${googleEnv.GOOGLE_CLIENT_SECRET} ` }, unrelatedSettings);
  assert.deepEqual(settings, {
    site_url: site,
    uri_allow_list: `${site}/auth/callback`,
    external_google_enabled: true,
    external_google_client_id: googleEnv.GOOGLE_CLIENT_ID,
    external_google_secret: googleEnv.GOOGLE_CLIENT_SECRET,
    external_google_skip_nonce_check: false,
  });
  assert.equal(Object.keys(settings).some((key) => /scope/i.test(key)), false);
  assert.doesNotMatch(JSON.stringify(settings), /gmail|mail\.google\.com|googleapis\.com\/auth/i);
  for (const [key, value] of Object.entries(unrelatedSettings)) {
    assert.equal(Object.hasOwn(settings, key), false, key);
    assert.deepEqual({ ...unrelatedSettings, ...settings }[key], value, key);
  }
});

test("Google settings reject missing credentials, non-Google client IDs, and non-HTTPS or credential-bearing site origins", () => {
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
    for (const value of [undefined, "", " "]) {
      assert.throws(() => buildGoogleSettings({ ...googleEnv, [name]: value }, {}), new RegExp(name));
    }
  }
  for (const clientId of ["fixture-client-id", "123.apps.googleusercontent.com.outside.example", "123.apps.googleusercontent.com?extra=value"]) {
    assert.throws(() => buildGoogleSettings({ ...googleEnv, GOOGLE_CLIENT_ID: clientId }, {}), /GOOGLE_CLIENT_ID/);
  }
  for (const origin of ["http://shop.example", "ftp://shop.example", "https://user:password@shop.example", "https://user@shop.example"]) {
    assert.throws(() => buildGoogleSettings({ ...googleEnv, NEXT_PUBLIC_SITE_URL: origin }, {}), /HTTPS production origin/);
  }
  assert.throws(() => buildGoogleSettings({ ...googleEnv, NEXT_PUBLIC_SITE_URL: "not a URL" }, {}));
});

test("Google client ID validation rejects an empty prefix, embedded whitespace, and URLs with a valid suffix", () => {
  for (const clientId of [".apps.googleusercontent.com", "invalid client.apps.googleusercontent.com", "https://outside.example/.apps.googleusercontent.com"]) {
    assert.throws(() => buildGoogleSettings({ ...googleEnv, GOOGLE_CLIENT_ID: clientId }, {}), /GOOGLE_CLIENT_ID/);
  }
});

test("auth summaries report readiness without returning passwords, client credentials, tokens, or raw templates", () => {
  const settings = Object.freeze({
    ...buildEmailSettings(emailEnv, {}, emailTemplate),
    ...buildGoogleSettings(googleEnv, {}),
    jwt_secret: "fixture-jwt-secret",
    service_role_key: "fixture-service-role-key",
    access_token: "fixture-management-token",
    hook_send_email_secret: "fixture-email-hook-secret",
  });
  const before = structuredClone(settings);
  const summary = summarizeAuthSettings(settings);
  assert.deepEqual(summary, {
    emailEnabled: true,
    emailConfirmationRequired: true,
    otpLength: 6,
    otpExpirySeconds: 600,
    gmailSmtpConfigured: true,
    emailHookEnabled: false,
    signupTemplateCodeOnly: true,
    signinTemplateCodeOnly: true,
    recoveryTemplateCodeOnly: true,
    emailLimitPerHour: 30,
    googleEnabled: true,
    googleClientConfigured: true,
  });
  const output = JSON.stringify(summary);
  for (const key of ["smtp_pass", "smtp_user", "smtp_admin_email", "external_google_client_id", "external_google_secret",
    "jwt_secret", "service_role_key", "access_token", "hook_send_email_secret", "mailer_templates_confirmation_content"]) {
    assert.equal(Object.hasOwn(summary, key), false, key);
    assert.ok(!output.includes(settings[key]), key);
  }
  assert.deepEqual(settings, before);
});

test("auth summaries distinguish missing or unsafe configuration from ready code-only email flows", () => {
  const empty = summarizeAuthSettings({});
  for (const flag of ["emailEnabled", "emailConfirmationRequired", "gmailSmtpConfigured", "emailHookEnabled",
    "signupTemplateCodeOnly", "signinTemplateCodeOnly", "recoveryTemplateCodeOnly", "googleEnabled", "googleClientConfigured"]) {
    assert.equal(empty[flag], false, flag);
  }
  const settings = buildEmailSettings(emailEnv, {}, emailTemplate);
  for (const template of [...invalidTemplates, null, 123456]) {
    const summary = summarizeAuthSettings({ ...settings, hook_send_email_enabled: true, mailer_autoconfirm: true,
      mailer_templates_confirmation_content: template, mailer_templates_magic_link_content: template,
      mailer_templates_recovery_content: template });
    assert.equal(summary.signupTemplateCodeOnly, false);
    assert.equal(summary.signinTemplateCodeOnly, false);
    assert.equal(summary.recoveryTemplateCodeOnly, false);
    assert.equal(summary.emailHookEnabled, true);
    assert.equal(summary.emailConfirmationRequired, false);
  }
  for (const patch of [{ smtp_host: "smtp.other.example" }, { smtp_user: "" }, { smtp_admin_email: "" }]) {
    assert.equal(summarizeAuthSettings({ ...settings, ...patch }).gmailSmtpConfigured, false);
  }
});

test("auth summaries do not label plain-text token authentication links as code-only templates", () => {
  const template = "<p>https://shop.example/auth/confirm?token={{ .Token }}</p>";
  const summary = summarizeAuthSettings({ mailer_templates_confirmation_content: template,
    mailer_templates_magic_link_content: template, mailer_templates_recovery_content: template });
  assert.equal(summary.signupTemplateCodeOnly, false);
  assert.equal(summary.signinTemplateCodeOnly, false);
  assert.equal(summary.recoveryTemplateCodeOnly, false);
});
