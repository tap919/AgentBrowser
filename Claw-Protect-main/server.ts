import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import Stripe from "stripe";
import YAML from "yaml";
import { TelemetryReportSchema, validateRequest } from "./src/lib/validation.js";

// SQLite persistence layer
import { apiKeyDb, usageDb, stripeDb, type PlanTier, type ApiKeyRecord } from "./src/lib/db.js";

// CISA KEV threat intelligence service
import { kevService } from "./src/lib/threat-intel/kevService.js";

// Security module imports
import { promptInjectionDetector } from "./src/lib/security/promptInjectionDetector.js";
import { secretsScanner } from "./src/lib/security/secretsScanner.js";
import { agentMonitor } from "./src/lib/security/agentMonitor.js";
import { permissionAnalyzer } from "./src/lib/security/permissionAnalyzer.js";
import { dataExfiltrationMonitor } from "./src/lib/security/dataExfiltrationMonitor.js";
import { agentIdentityManager } from "./src/lib/security/agentIdentityManager.js";
import { toolSupplyChainVerifier } from "./src/lib/security/toolSupplyChainVerifier.js";
import { approvalRequestValidator } from "./src/lib/security/approvalRequestValidator.js";
import { shadowAgentDiscovery } from "./src/lib/security/shadowAgentDiscovery.js";
import { agentUptimeMonitor } from "./src/lib/security/agentUptimeMonitor.js";
import { promptFuzzingEngine } from "./src/lib/security/promptFuzzingEngine.js";
import { complianceEngine } from "./src/lib/security/complianceEngine.js";
import { agentDependencyGraph } from "./src/lib/security/agentDependencyGraph.js";
import { playbookEngine } from "./src/lib/security/playbookEngine.js";
import { zeroTrustManager } from "./src/lib/security/zeroTrustManager.js";
import { quantumResistantCrypto } from "./src/lib/security/quantumResistantCrypto.js";
import { ransomwareDefense } from "./src/lib/security/ransomwareDefense.js";
import { cloudSecurityManager } from "./src/lib/security/cloudSecurityManager.js";
import { iotSecurityManager } from "./src/lib/security/iotSecurityManager.js";
import { aiAssistedSOC } from "./src/lib/security/aiAssistedSOC.js";
import { stateManager } from "./src/lib/security/stateManager.js";
import { karpathyCyberWiki } from "./src/lib/security/karpathyCyberWiki.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// API KEY MANAGEMENT — Tiered SaaS Plans (backed by SQLite via db.ts)
// =============================================================================

// Plan limits per month
const PLAN_LIMITS: Record<PlanTier, { requestsPerMonth: number; modules: string[] }> = {
  free: {
    requestsPerMonth: 100,
    modules: ['prompt-injection', 'secrets-scan'], // 2 modules free
  },
  pro: {
    requestsPerMonth: 10_000,
    modules: ['prompt-injection', 'secrets-scan', 'agent-monitor', 'permission-analyzer',
              'data-exfiltration', 'tool-supply-chain', 'approval-validator', 'shadow-agents',
              'uptime-monitor', 'prompt-fuzzing', 'compliance', 'dependency-graph', 'playbook',
              'threat-intel'],
  },
  enterprise: {
    requestsPerMonth: 100_000,
    modules: ['all'], // everything
  },
};

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return 'cp_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Auth middleware for SaaS API
function apiKeyAuth(moduleName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!apiKey) {
      res.status(401).json({ error: 'Missing API key. Include Authorization: Bearer <key> header.' });
      return;
    }

    const keyRecord = apiKeyDb.getByKey(apiKey);

    if (!keyRecord || !keyRecord.active) {
      res.status(403).json({ error: 'Invalid or deactivated API key.' });
      return;
    }

    // Check plan access
    const plan = PLAN_LIMITS[keyRecord.plan];
    if (!plan.modules.includes('all') && !plan.modules.includes(moduleName)) {
      res.status(403).json({
        error: `Module '${moduleName}' not available on your '${keyRecord.plan}' plan.`,
        availableModules: plan.modules,
        upgrade: 'Contact sales or upgrade at /api/v1/pricing',
      });
      return;
    }

    // Check monthly usage (counted from api_usage table)
    const monthlyUsed = apiKeyDb.monthlyUsage(apiKey);
    if (monthlyUsed >= plan.requestsPerMonth) {
      res.status(429).json({
        error: 'Monthly request limit reached.',
        limit: plan.requestsPerMonth,
        used: monthlyUsed,
        plan: keyRecord.plan,
        upgrade: 'Upgrade your plan for higher limits.',
      });
      return;
    }

    // Log usage to SQLite (non-blocking — synchronous but fast)
    usageDb.append({
      key: apiKey,
      endpoint: req.path,
      timestamp: new Date().toISOString(),
      statusCode: 200,
      module: moduleName,
    });
    apiKeyDb.updateUsage(apiKey, new Date().toISOString(), monthlyUsed + 1);

    // Attach key info to request
    (req as any).apiKeyRecord = keyRecord;
    next();
  };
}

// =============================================================================
// STRIPE SUBSCRIPTION MANAGEMENT
// =============================================================================

let stripeClient: Stripe | null = null;
let _stripeInitAttempted = false;

function getStripe(): Stripe | null {
  if (!_stripeInitAttempted) {
    _stripeInitAttempted = true;
    const key = process.env.STRIPE_SECRET_KEY || '';
    if (key) {
      stripeClient = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as any });
    }
  }
  return stripeClient;
}

// Claw Protect product config (pricing / descriptions)
interface StripeProductConfig {
  plan: PlanTier;
  name: string;
  description: string;
  priceMonthly: number; // cents
}

const CLAW_PRODUCTS: StripeProductConfig[] = [
  {
    plan: 'pro',
    name: 'Claw Protect Pro',
    description: '13 AI security modules, 10k requests/month, agent monitoring, compliance, playbook SOAR',
    priceMonthly: 1000, // $10
  },
  {
    plan: 'enterprise',
    name: 'Claw Protect Enterprise',
    description: 'All 22 AI security modules, 100k requests/month, zero-trust, quantum crypto, AI SOC',
    priceMonthly: 10000, // $100
  },
];

// Provision or upgrade API key after successful Stripe subscription
function provisionApiKey(email: string, plan: PlanTier, stripeCustomerId: string, _stripeSubscriptionId: string): ApiKeyRecord {
  // Check if email already has a key — upgrade it
  const allKeys = apiKeyDb.getAll();
  const existing = allKeys.find(k => k.email === email && k.active);
  if (existing) {
    apiKeyDb.updatePlan(existing.key, plan, stripeCustomerId);
    return { ...existing, plan, stripeCustomerId };
  }

  // Create new key
  const newKey: ApiKeyRecord = {
    key: generateApiKey(),
    email,
    plan,
    stripeCustomerId,
    createdAt: new Date().toISOString(),
    usageCount: 0,
    active: true,
  };
  apiKeyDb.insert(newKey);
  return newKey;
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  const app = express();
  const SERVE_SAAS = process.env.CLAW_SERVE_SAAS === 'true';
  // Service mode on 3333, SAAS on 3000 (or set CLAW_PORT env)
  const PORT = process.env.CLAW_PORT ? parseInt(process.env.CLAW_PORT, 10) : (SERVE_SAAS ? 3000 : 3333);

  // ── Legacy JSON → SQLite one-time migration ─────────────────────────────
  const dataDir = path.join(__dirname, 'data');
  apiKeyDb.importFromJson(path.join(dataDir, 'api-keys.json'));
  usageDb.importFromJson(path.join(dataDir, 'api-usage.json'));
  stripeDb.importFromJson(path.join(dataDir, 'stripe-products.json'));

  // ── Start CISA KEV feed (non-blocking) ───────────────────────────────────
  kevService.initialize().catch((e) => console.error('[KEV] Init error:', e));

  // ── Wire KEV service into security modules ────────────────────────────────
  const kevLookup = {
    isKnownExploited: (cveId: string) => kevService.isKnownExploited(cveId),
    enrichCve: (cveId: string) => kevService.enrichCve(cveId),
    lookupCve: (cveId: string) => kevService.enrichCve(cveId) ?? undefined,
    getRansomwareLinkedKevs: () => kevService.getRansomwareLinkedKevs(),
  };
  toolSupplyChainVerifier.setKevService(kevLookup);
  complianceEngine.setKevService(kevLookup);
  ransomwareDefense.setKevService(kevLookup);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        frameAncestors: ["'none'"],
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  // Global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many requests from this IP, please try again later' }
  });

  // SaaS API rate limiter (per IP, in addition to API key limits)
  const saasLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many API requests per minute', retryAfter: 60 }
  });

  // Security endpoint rate limiter (stricter)
  const securityLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many security requests', retryAfter: 60 }
  });

  app.use(globalLimiter);

  // Stripe webhook needs raw body BEFORE json parsing
  app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), (req: Request, res: Response) => {
    const s = getStripe();
    if (!s) { res.status(503).json({ error: 'Stripe not configured' }); return; }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.CLAW_STRIPE_WEBHOOK_SECRET || '';
    if (!webhookSecret) { res.status(500).json({ error: 'Webhook secret not configured' }); return; }

    let event: Stripe.Event;
    try {
      event = s.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[Claw Stripe] Webhook verification failed:', err.message);
      res.status(400).json({ error: 'Webhook verification failed' });
      return;
    }

    console.log(`[Claw Stripe] Event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || (session.customer_details?.email) || '';
        const plan = (session.metadata?.plan as PlanTier) || 'pro';
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : '';

        if (email) {
          const apiKey = provisionApiKey(email, plan, customerId, subscriptionId);
          console.log(`[Claw Stripe] Provisioned ${plan} key for ${email}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || '';
        // Downgrade to free
        if (customerId) {
          apiKeyDb.deactivateByCustomer(customerId);
          console.log(`[Claw Stripe] Downgraded customer ${customerId} to free (subscription canceled)`);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : '';
        console.log(`[Claw Stripe] Payment failed for customer ${customerId}`);
        break;
      }
    }

    res.json({ received: true });
  });

  app.use(express.json({ limit: '1mb' }));

  // Serve landing page and static assets from public/
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Mock database for telemetry history
  const telemetryHistory: any[] = [];

  // =========================================================================
  // EXISTING API ROUTES (unchanged)
  // =========================================================================

  app.get("/api/health", (_req, res) => {
    const kevStatus = kevService.getStatus();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      modules: 23,
      saas: true,
      plans: Object.keys(PLAN_LIMITS),
      threatIntel: {
        kevEntries: kevStatus.entryCount,
        lastFetched: kevStatus.lastFetched,
        catalogVersion: kevStatus.catalogVersion,
      },
    });
  });

  app.use("/api/security", securityLimiter);
  app.use("/api/telemetry", securityLimiter);

  app.get("/api/telemetry", (_req, res) => {
    res.json({
      history: telemetryHistory.slice(-10),
      current: {
        timestamp: new Date().toISOString(),
        status: "Protected",
        threatLevel: Math.floor(Math.random() * 20)
      }
    });
  });

  app.post("/api/telemetry/report", validateRequest(TelemetryReportSchema), (req, res) => {
    const report = {
      ...req.body,
      id: crypto.randomUUID(),
      timestamp: req.body.timestamp || new Date().toISOString()
    };
    telemetryHistory.push(report);
    res.status(201).json(report);
  });

  // =========================================================================
  // SAAS API v1 — Paid Security Module Endpoints
  // =========================================================================

  app.use("/api/v1", saasLimiter);

  // --- Pricing & Plans ---
  app.get("/api/v1/pricing", (_req, res) => {
    res.json({
      plans: {
        free: {
          price: '$0/mo',
          requests: 100,
          modules: PLAN_LIMITS.free.modules,
          features: ['Prompt injection detection', 'Secrets scanning'],
        },
        pro: {
          price: '$10/mo',
          requests: 10_000,
          modules: PLAN_LIMITS.pro.modules,
          features: ['13 security modules', 'Agent monitoring', 'Compliance engine', 'Playbook SOAR', 'Priority support'],
        },
        enterprise: {
          price: '$100/mo',
          requests: 100_000,
          modules: ['All 22 modules'],
          features: ['All security modules', 'Zero-trust', 'Post-quantum crypto', 'Ransomware defense', 'Cloud/IoT security', 'AI SOC', 'Dedicated support'],
        },
      },
      signupEndpoint: 'POST /api/v1/keys (free tier) or POST /api/v1/stripe/checkout (paid)',
      checkoutEndpoint: 'POST /api/v1/stripe/checkout { plan: "pro"|"enterprise", email: "..." }',
    });
  });

  // --- API Key Management ---
  app.post("/api/v1/keys", (req, res) => {
    const { email, plan } = req.body;
    if (!email || !plan) {
      res.status(400).json({ error: 'Required: email, plan (free|pro|enterprise)' });
      return;
    }
    if (!['free', 'pro', 'enterprise'].includes(plan)) {
      res.status(400).json({ error: 'plan must be: free, pro, or enterprise' });
      return;
    }
    if (plan !== 'free') {
      res.status(403).json({ error: 'Paid plans must be provisioned through Stripe checkout.' });
      return;
    }

    // Check if email already has a key
    const allKeys = apiKeyDb.getAll();
    const existing = allKeys.find(k => k.email === email && k.active);
    if (existing) {
      res.status(409).json({ error: 'Active API key already exists for this email. Use PATCH to upgrade.' });
      return;
    }

    const newKey: ApiKeyRecord = {
      key: generateApiKey(),
      email,
      plan: plan as PlanTier,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      active: true,
    };
    apiKeyDb.insert(newKey);

    res.status(201).json({
      apiKey: newKey.key,
      plan: newKey.plan,
      limits: PLAN_LIMITS[newKey.plan as PlanTier],
      message: 'Store this API key securely. It will not be shown again.',
      usage: 'Authorization: Bearer <your-api-key>',
    });
  });

  app.get("/api/v1/keys/usage", (req, res) => {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!apiKey) { res.status(401).json({ error: 'API key required' }); return; }

    const record = apiKeyDb.getByKey(apiKey);
    if (!record) { res.status(404).json({ error: 'Key not found' }); return; }

    const plan = PLAN_LIMITS[record.plan];
    const monthlyUsed = apiKeyDb.monthlyUsage(apiKey);
    res.json({
      plan: record.plan,
      usageCount: monthlyUsed,
      limit: plan.requestsPerMonth,
      remaining: plan.requestsPerMonth - monthlyUsed,
      lastUsed: record.lastUsed,
      modules: plan.modules,
    });
  });

  // --- Stripe Checkout & Subscription ---
  app.post("/api/v1/stripe/checkout", async (req, res) => {
    const s = getStripe();
    if (!s) { res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY env var.' }); return; }

    const { plan, email } = req.body;
    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      res.status(400).json({ error: 'plan must be pro or enterprise. Free plan needs no checkout.' });
      return;
    }
    if (!email) { res.status(400).json({ error: 'email is required' }); return; }

    const productRecord = stripeDb.get(plan as 'pro' | 'enterprise');
    if (!productRecord?.priceId) {
      res.status(500).json({ error: `Stripe products not set up for ${plan}. Run POST /api/v1/stripe/setup first.` });
      return;
    }
    const productConfig = CLAW_PRODUCTS.find(p => p.plan === plan)!

    try {
      const successUrl = process.env.CLAW_SUCCESS_URL || `http://localhost:${PORT}/api/v1/stripe/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = process.env.CLAW_CANCEL_URL || `http://localhost:${PORT}/api/v1/pricing`;

      const session = await s.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{ price: productRecord.priceId, quantity: 1 }],
        metadata: { plan, source: 'claw-protect' },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      res.json({
        checkoutUrl: session.url,
        sessionId: session.id,
        plan,
        price: `$${productConfig.priceMonthly / 100}/mo`,
      });
    } catch (err: any) {
      console.error('[Claw Stripe] Checkout error:', err.message);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Stripe success callback (simple confirmation page)
  app.get("/api/v1/stripe/success", (req, res) => {
    const sessionId = req.query.session_id;
    res.json({
      status: 'success',
      message: 'Subscription created! Your API key will be emailed to you. Check your inbox.',
      sessionId,
      docs: '/api/v1/modules',
    });
  });

  // Setup: Create Stripe products and prices (run once)
  app.post("/api/v1/stripe/setup", async (_req, res) => {
    const s = getStripe();
    if (!s) { res.status(503).json({ error: 'Stripe not configured' }); return; }

    const results: any[] = [];

    for (const prod of CLAW_PRODUCTS) {
      try {
        // Skip if already created
        const existing = stripeDb.get(prod.plan as 'pro' | 'enterprise');
        if (existing?.productId && existing?.priceId) {
          results.push({ plan: prod.plan, status: 'already_exists', productId: existing.productId, priceId: existing.priceId });
          continue;
        }

        // Create product
        const stripeProduct = await s.products.create({
          name: prod.name,
          description: prod.description,
          metadata: { plan: prod.plan, source: 'claw-protect' },
        });

        // Create price
        const stripePrice = await s.prices.create({
          product: stripeProduct.id,
          unit_amount: prod.priceMonthly,
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: { plan: prod.plan },
        });

        stripeDb.upsert({
          tier: prod.plan as 'pro' | 'enterprise',
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          updatedAt: new Date().toISOString(),
        });

        results.push({
          plan: prod.plan,
          status: 'created',
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          price: `$${prod.priceMonthly / 100}/mo`,
        });
      } catch (err: any) {
        results.push({ plan: prod.plan, status: 'error', error: err.message });
      }
    }

    res.json({ message: 'Stripe products configured', results });
  });

  // Stripe subscription status
  app.get("/api/v1/stripe/status", (_req, res) => {
    const stripeReady = !!getStripe();
    res.json({
      stripeConfigured: stripeReady,
      products: CLAW_PRODUCTS.map(p => {
        const saved = stripeDb.get(p.plan as 'pro' | 'enterprise');
        return {
          plan: p.plan,
          name: p.name,
          price: `$${p.priceMonthly / 100}/mo`,
          ready: !!(saved?.productId && saved?.priceId),
          stripeProductId: saved?.productId || null,
        };
      }),
    });
  });

  // --- Module: Prompt Injection Detection (FREE) ---
  app.post("/api/v1/scan/prompt-injection", apiKeyAuth('prompt-injection'), (req, res) => {
    const { content, isWebContent } = req.body;
    if (!content) { res.status(400).json({ error: 'content is required' }); return; }
    const result = promptInjectionDetector.detect(content, isWebContent ?? false);
    res.json({ module: 'prompt-injection', ...result });
  });

  app.post("/api/v1/scan/prompt-injection/batch", apiKeyAuth('prompt-injection'), (req, res) => {
    const { contents, isWebContent } = req.body;
    if (!Array.isArray(contents)) { res.status(400).json({ error: 'contents must be an array of strings' }); return; }
    const results = promptInjectionDetector.batchScan(contents, isWebContent ?? false);
    res.json({ module: 'prompt-injection', results });
  });

  app.post("/api/v1/scan/prompt-injection/sanitize", apiKeyAuth('prompt-injection'), (req, res) => {
    const { content, isWebContent } = req.body;
    if (!content) { res.status(400).json({ error: 'content is required' }); return; }
    const sanitized = promptInjectionDetector.sanitize(content, isWebContent ?? false);
    res.json({ module: 'prompt-injection', original: content, sanitized });
  });

  // --- Module: Secrets Scanner (FREE) ---
  app.post("/api/v1/scan/secrets", apiKeyAuth('secrets-scan'), (req, res) => {
    const { content, location } = req.body;
    if (!content) { res.status(400).json({ error: 'content is required' }); return; }
    const matches = secretsScanner.scanText(content, location || 'api-scan');
    res.json({ module: 'secrets-scan', secretsFound: matches.length, matches });
  });

  app.post("/api/v1/scan/secrets/batch", apiKeyAuth('secrets-scan'), (req, res) => {
    const { files } = req.body;
    if (!Array.isArray(files)) { res.status(400).json({ error: 'files must be array of {path, content}' }); return; }
    const results = secretsScanner.batchScan(files);
    const output: Record<string, any> = {};
    results.forEach((matches, filePath) => { output[filePath] = matches; });
    res.json({ module: 'secrets-scan', filesScanned: files.length, results: output });
  });

  app.get("/api/v1/scan/secrets/report", apiKeyAuth('secrets-scan'), (_req, res) => {
    const report = secretsScanner.generateReport();
    res.json({ module: 'secrets-scan', ...report });
  });

  // --- Module: Agent Monitor (PRO) ---
  app.post("/api/v1/agents/activity", apiKeyAuth('agent-monitor'), (req, res) => {
    const activity = agentMonitor.logActivity(req.body);
    res.status(201).json({ module: 'agent-monitor', activity });
  });

  app.get("/api/v1/agents/activity", apiKeyAuth('agent-monitor'), (req, res) => {
    const agentId = req.query.agentId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const log = agentMonitor.getActivityLog(agentId, limit);
    res.json({ module: 'agent-monitor', count: log.length, activities: log });
  });

  app.get("/api/v1/agents/:agentId/baseline", apiKeyAuth('agent-monitor'), (req, res) => {
    const baseline = agentMonitor.establishBaseline(req.params.agentId);
    res.json({ module: 'agent-monitor', baseline });
  });

  app.get("/api/v1/agents/:agentId/runaway-check", apiKeyAuth('agent-monitor'), (req, res) => {
    const timeWindow = parseInt(req.query.timeWindow as string) || 5;
    const threshold = parseInt(req.query.threshold as string) || 50;
    const isRunaway = agentMonitor.detectRunawayLoop(req.params.agentId, timeWindow, threshold);
    res.json({ module: 'agent-monitor', agentId: req.params.agentId, isRunaway });
  });

  app.get("/api/v1/agents/anomalies", apiKeyAuth('agent-monitor'), (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const anomalies = agentMonitor.getAnomalies(limit);
    res.json({ module: 'agent-monitor', count: anomalies.length, anomalies });
  });

  // --- Module: Prompt Fuzzing Engine (PRO) ---
  app.post("/api/v1/fuzz/payloads", apiKeyAuth('prompt-fuzzing'), (req, res) => {
    const { seeds, strategies } = req.body;
    const payloads = promptFuzzingEngine.generatePayloads(seeds, strategies);
    res.json({ module: 'prompt-fuzzing', count: payloads.length, payloads });
  });

  app.post("/api/v1/fuzz/campaign", apiKeyAuth('prompt-fuzzing'), (req, res) => {
    const { name, targetAgent } = req.body;
    if (!name || !targetAgent) { res.status(400).json({ error: 'name and targetAgent required' }); return; }
    const campaign = promptFuzzingEngine.createCampaign(name, targetAgent);
    res.status(201).json({ module: 'prompt-fuzzing', campaign });
  });

  app.get("/api/v1/fuzz/campaigns", apiKeyAuth('prompt-fuzzing'), (_req, res) => {
    const campaigns = promptFuzzingEngine.getCampaigns();
    res.json({ module: 'prompt-fuzzing', count: campaigns.length, campaigns });
  });

  // --- Module: Compliance Engine (PRO) ---
  app.get("/api/v1/compliance/policies", apiKeyAuth('compliance'), (_req, res) => {
    const policies = complianceEngine.getPolicies();
    res.json({ module: 'compliance', count: policies.length, policies });
  });

  app.post("/api/v1/compliance/policies", apiKeyAuth('compliance'), (req, res) => {
    const policy = complianceEngine.createPolicy(req.body);
    res.status(201).json({ module: 'compliance', policy });
  });

  app.get("/api/v1/compliance/controls", apiKeyAuth('compliance'), (req, res) => {
    const framework = req.query.framework as string | undefined;
    const controls = complianceEngine.getControls(framework as any);
    res.json({ module: 'compliance', count: controls.length, controls });
  });

  app.get("/api/v1/compliance/frameworks", apiKeyAuth('compliance'), (_req, res) => {
    const frameworks = complianceEngine.getSupportedFrameworks();
    const summaries = frameworks.map(f => ({ framework: f, ...complianceEngine.getFrameworkSummary(f) }));
    res.json({ module: 'compliance', frameworks: summaries });
  });

  app.post("/api/v1/compliance/risk-score", apiKeyAuth('compliance'), (req, res) => {
    const { agentId, dimensions } = req.body;
    if (!agentId || !dimensions) { res.status(400).json({ error: 'agentId and dimensions required' }); return; }
    const score = complianceEngine.calculateRiskScore(agentId, dimensions);
    res.json({ module: 'compliance', score });
  });

  app.get("/api/v1/compliance/events", apiKeyAuth('compliance'), (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = complianceEngine.getEvents(limit);
    res.json({ module: 'compliance', count: events.length, events });
  });

  app.get("/api/v1/compliance/audit-log", apiKeyAuth('compliance'), (req, res) => {
    const framework = req.query.framework as string | undefined;
    const log = complianceEngine.exportAuditLog(framework as any);
    res.type('text/plain').send(log);
  });

  // --- Module: Tool Supply Chain Verifier (PRO) ---
  app.post("/api/v1/supply-chain/verify", apiKeyAuth('tool-supply-chain'), async (req, res) => {
    const { toolName, version, ecosystem } = req.body;
    if (!toolName || !version || !ecosystem) {
      res.status(400).json({ error: 'toolName, version, and ecosystem required' }); return;
    }
    const result = await toolSupplyChainVerifier.verifyTool(toolName, version, ecosystem);
    res.json({ module: 'tool-supply-chain', ...result });
  });

  app.post("/api/v1/supply-chain/register", apiKeyAuth('tool-supply-chain'), (req, res) => {
    const tool = toolSupplyChainVerifier.registerTool(req.body);
    res.status(201).json({ module: 'tool-supply-chain', tool });
  });

  app.get("/api/v1/supply-chain/report", apiKeyAuth('tool-supply-chain'), (_req, res) => {
    const report = toolSupplyChainVerifier.generateReport();
    res.json({ module: 'tool-supply-chain', ...report });
  });

  app.get("/api/v1/supply-chain/vulnerable", apiKeyAuth('tool-supply-chain'), (_req, res) => {
    const vulnerable = toolSupplyChainVerifier.getVulnerableTools();
    res.json({ module: 'tool-supply-chain', count: vulnerable.length, vulnerable });
  });

  // --- Module: Permission Analyzer (PRO) ---
  app.post("/api/v1/permissions/analyze", apiKeyAuth('permission-analyzer'), (req, res) => {
    const { agentId } = req.body;
    if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
    const recommendations = permissionAnalyzer.analyzePermissions(agentId);
    res.json({ module: 'permission-analyzer', agentId, recommendations });
  });

  app.get("/api/v1/permissions/over-permissioned", apiKeyAuth('permission-analyzer'), (_req, res) => {
    const agents = permissionAnalyzer.getOverPermissionedAgents();
    res.json({ module: 'permission-analyzer', count: agents.length, agents });
  });

  // --- Module: Data Exfiltration Monitor (PRO) ---
  app.post("/api/v1/exfiltration/log", apiKeyAuth('data-exfiltration'), (req, res) => {
    const transfer = dataExfiltrationMonitor.logTransfer(req.body);
    res.status(201).json({ module: 'data-exfiltration', transfer });
  });

  app.get("/api/v1/exfiltration/suspicious", apiKeyAuth('data-exfiltration'), (req, res) => {
    const agentId = req.query.agentId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const transfers = dataExfiltrationMonitor.getSuspiciousTransfers(agentId, limit);
    res.json({ module: 'data-exfiltration', count: transfers.length, transfers });
  });

  app.get("/api/v1/exfiltration/alerts", apiKeyAuth('data-exfiltration'), (req, res) => {
    const agentId = req.query.agentId as string | undefined;
    const alerts = dataExfiltrationMonitor.getAlerts(agentId);
    res.json({ module: 'data-exfiltration', count: alerts.length, alerts });
  });

  // --- Module: Shadow Agent Discovery (PRO) ---
  app.get("/api/v1/shadow-agents", apiKeyAuth('shadow-agents'), (_req, res) => {
    const agents = shadowAgentDiscovery.getShadowAgents();
    res.json({ module: 'shadow-agents', count: agents.length, agents });
  });

  app.get("/api/v1/shadow-agents/high-risk", apiKeyAuth('shadow-agents'), (req, res) => {
    const threshold = parseInt(req.query.threshold as string) || 50;
    const agents = shadowAgentDiscovery.getHighRiskAgents(threshold);
    res.json({ module: 'shadow-agents', count: agents.length, agents });
  });

  app.post("/api/v1/shadow-agents/discover", apiKeyAuth('shadow-agents'), (req, res) => {
    const { agentId, source, communicationPattern, capabilities, ...rest } = req.body;
    if (!agentId || !source) { res.status(400).json({ error: 'agentId and source required' }); return; }
    const metadata: Record<string, any> = { ...rest };
    if (communicationPattern) metadata.communicationPattern = communicationPattern;
    if (capabilities) metadata.capabilities = capabilities;
    const agent = shadowAgentDiscovery.discoverAgent(agentId, source, metadata);
    res.status(201).json({ module: 'shadow-agents', agent });
  });

  // --- Module: Uptime Monitor (PRO) ---
  app.post("/api/v1/uptime/heartbeat", apiKeyAuth('uptime-monitor'), (req, res) => {
    const { agentId } = req.body;
    if (!agentId) { res.status(400).json({ error: 'agentId required' }); return; }
    agentUptimeMonitor.heartbeat(agentId);
    res.json({ module: 'uptime-monitor', recorded: true });
  });

  app.get("/api/v1/uptime/:agentId", apiKeyAuth('uptime-monitor'), (req, res) => {
    const status = agentUptimeMonitor.getStatus(req.params.agentId);
    res.json({ module: 'uptime-monitor', status });
  });

  app.get("/api/v1/uptime", apiKeyAuth('uptime-monitor'), (_req, res) => {
    const statuses = agentUptimeMonitor.getAllStatuses();
    res.json({ module: 'uptime-monitor', count: statuses.length, statuses });
  });

  // --- Module: Dependency Graph (PRO) ---
  app.post("/api/v1/dependencies/node", apiKeyAuth('dependency-graph'), (req, res) => {
    const node = agentDependencyGraph.addNode(req.body);
    res.status(201).json({ module: 'dependency-graph', node });
  });

  app.post("/api/v1/dependencies/edge", apiKeyAuth('dependency-graph'), (req, res) => {
    const edge = agentDependencyGraph.addEdge(req.body);
    res.status(201).json({ module: 'dependency-graph', edge });
  });

  app.get("/api/v1/dependencies/sbom", apiKeyAuth('dependency-graph'), (_req, res) => {
    const sbom = agentDependencyGraph.generateSBOM();
    res.json({ module: 'dependency-graph', sbom });
  });

  // --- Module: Playbook / SOAR Engine (PRO) ---
  app.post("/api/v1/playbooks", apiKeyAuth('playbook'), (req, res) => {
    const playbook = playbookEngine.createPlaybook(req.body);
    res.status(201).json({ module: 'playbook', playbook });
  });

  app.get("/api/v1/playbooks", apiKeyAuth('playbook'), (_req, res) => {
    const playbooks = playbookEngine.getPlaybooks();
    res.json({ module: 'playbook', count: playbooks.length, playbooks });
  });

  app.post("/api/v1/playbooks/:id/execute", apiKeyAuth('playbook'), (req, res) => {
    const triggeredBy = req.body.triggeredBy || 'api-user';
    const result = playbookEngine.executePlaybook(req.params.id, triggeredBy);
    if (!result) { res.status(404).json({ error: 'Playbook not found' }); return; }
    res.json({ module: 'playbook', ...result });
  });

  // --- Module: Approval Validator (PRO) ---
  app.post("/api/v1/approvals/validate", apiKeyAuth('approval-validator'), (req, res) => {
    const result = approvalRequestValidator.validateRequest(req.body);
    res.json({ module: 'approval-validator', ...result });
  });

  app.get("/api/v1/approvals/flagged", apiKeyAuth('approval-validator'), (req, res) => {
    const agentId = req.query.agentId as string | undefined;
    const flagged = approvalRequestValidator.getFlaggedRequests(agentId);
    res.json({ module: 'approval-validator', count: flagged.length, flagged });
  });

  // --- Enterprise-only modules ---

  // Zero Trust Manager
  app.post("/api/v1/zero-trust/session", apiKeyAuth('zero-trust'), (req, res) => {
    const session = zeroTrustManager.createSession(req.body);
    res.status(201).json({ module: 'zero-trust', session });
  });

  app.post("/api/v1/zero-trust/evaluate", apiKeyAuth('zero-trust'), (req, res) => {
    const result = zeroTrustManager.makeAccessDecision(req.body);
    res.json({ module: 'zero-trust', ...result });
  });

  app.get("/api/v1/zero-trust/sessions", apiKeyAuth('zero-trust'), (_req, res) => {
    const sessions = zeroTrustManager.getActiveSessions();
    res.json({ module: 'zero-trust', count: sessions.length, sessions });
  });

  app.get("/api/v1/zero-trust/threats", apiKeyAuth('zero-trust'), (req, res) => {
    const filter = {
      sessionId: req.query.sessionId as string | undefined,
      agentId: req.query.agentId as string | undefined,
      severity: req.query.severity as string | undefined,
    };
    const threats = zeroTrustManager.getIdentityThreats(filter);
    res.json({ module: 'zero-trust', count: threats.length, threats });
  });

  // Quantum-Resistant Crypto
  app.post("/api/v1/quantum/encrypt", apiKeyAuth('quantum-crypto'), (req, res) => {
    const { data, recipientPublicKey, algorithm } = req.body;
    if (!data || !recipientPublicKey) { res.status(400).json({ error: 'data and recipientPublicKey required' }); return; }
    const result = quantumResistantCrypto.encryptData(data, recipientPublicKey, algorithm);
    res.json({ module: 'quantum-crypto', ...result });
  });

  app.post("/api/v1/quantum/keygen", apiKeyAuth('quantum-crypto'), (req, res) => {
    const { algorithm, expiryDays } = req.body;
    if (!algorithm) { res.status(400).json({ error: 'algorithm required (ML-KEM-768, ML-DSA-65, SLH-DSA-SHA2-128s, etc.)' }); return; }
    const keyPair = quantumResistantCrypto.generateKeyPair(algorithm, expiryDays);
    res.status(201).json({ module: 'quantum-crypto', keyPair });
  });

  app.post("/api/v1/quantum/assess", apiKeyAuth('quantum-crypto'), (req, res) => {
    const { dataSensitivity, timeHorizon } = req.body;
    if (!dataSensitivity || !timeHorizon) { res.status(400).json({ error: 'dataSensitivity and timeHorizon required' }); return; }
    const assessment = quantumResistantCrypto.assessQuantumThreat(dataSensitivity, timeHorizon);
    res.json({ module: 'quantum-crypto', assessment });
  });

  app.get("/api/v1/quantum/agility", apiKeyAuth('quantum-crypto'), (_req, res) => {
    const agility = quantumResistantCrypto.getCryptoAgility();
    res.json({ module: 'quantum-crypto', agility });
  });

  // Ransomware Defense
  app.post("/api/v1/ransomware/log-activity", apiKeyAuth('ransomware-defense'), (req, res) => {
    const activity = ransomwareDefense.logFileActivity(req.body);
    res.status(201).json({ module: 'ransomware-defense', activity });
  });

  app.get("/api/v1/ransomware/indicators", apiKeyAuth('ransomware-defense'), (_req, res) => {
    const indicators = ransomwareDefense.getRansomwareIndicators();
    res.json({ module: 'ransomware-defense', count: indicators.length, indicators });
  });

  app.get("/api/v1/ransomware/triple-extortion", apiKeyAuth('ransomware-defense'), (_req, res) => {
    const patterns = ransomwareDefense.getTripleExtortionPatterns();
    res.json({ module: 'ransomware-defense', count: patterns.length, patterns });
  });

  app.get("/api/v1/ransomware/stats", apiKeyAuth('ransomware-defense'), (_req, res) => {
    const stats = ransomwareDefense.getStatistics();
    res.json({ module: 'ransomware-defense', ...stats });
  });

  app.get("/api/v1/ransomware/emergency", apiKeyAuth('ransomware-defense'), (_req, res) => {
    const response = ransomwareDefense.getEmergencyResponse();
    res.json({ module: 'ransomware-defense', ...response });
  });

  // Cloud Security Manager
  app.post("/api/v1/cloud/identity", apiKeyAuth('cloud-security'), (req, res) => {
    const identity = cloudSecurityManager.registerCloudIdentity(req.body);
    res.status(201).json({ module: 'cloud-security', identity });
  });

  app.get("/api/v1/cloud/iam/:identityId", apiKeyAuth('cloud-security'), (req, res) => {
    const analysis = cloudSecurityManager.analyzeIAMPermissions(req.params.identityId);
    if (!analysis) { res.status(404).json({ error: 'Identity not found' }); return; }
    res.json({ module: 'cloud-security', analysis });
  });

  app.get("/api/v1/cloud/high-risk", apiKeyAuth('cloud-security'), (req, res) => {
    const minScore = parseInt(req.query.minScore as string) || 60;
    const identities = cloudSecurityManager.getHighRiskIdentities(minScore);
    res.json({ module: 'cloud-security', count: identities.length, identities });
  });

  app.post("/api/v1/cloud/container-scan", apiKeyAuth('cloud-security'), (req, res) => {
    const scan = cloudSecurityManager.scanContainer(req.body);
    res.json({ module: 'cloud-security', scan });
  });

  app.get("/api/v1/cloud/stats", apiKeyAuth('cloud-security'), (_req, res) => {
    const stats = cloudSecurityManager.getStatistics();
    res.json({ module: 'cloud-security', ...stats });
  });

  // IoT Security Manager
  app.post("/api/v1/iot/discover", apiKeyAuth('iot-security'), (req, res) => {
    const device = iotSecurityManager.discoverDevice(req.body);
    res.status(201).json({ module: 'iot-security', device });
  });

  app.get("/api/v1/iot/devices", apiKeyAuth('iot-security'), (req, res) => {
    const posture = req.query.posture as string | undefined;
    const validPostures = ['secure', 'degraded', 'vulnerable', 'compromised', 'unknown'] as const;
    const resolvedPosture = (posture && validPostures.includes(posture as any)) ? posture as typeof validPostures[number] : 'compromised';
    const devices = iotSecurityManager.getDevicesByPosture(resolvedPosture);
    res.json({ module: 'iot-security', count: devices.length, devices });
  });

  app.get("/api/v1/iot/threats", apiKeyAuth('iot-security'), (_req, res) => {
    const threats = iotSecurityManager.getIoTThreats();
    res.json({ module: 'iot-security', count: threats.length, threats });
  });

  app.get("/api/v1/iot/stats", apiKeyAuth('iot-security'), (_req, res) => {
    const stats = iotSecurityManager.getStatistics();
    res.json({ module: 'iot-security', ...stats });
  });

  // AI-Assisted SOC
  app.post("/api/v1/soc/incident", apiKeyAuth('ai-soc'), (req, res) => {
    const incident = aiAssistedSOC.createIncident(req.body);
    res.status(201).json({ module: 'ai-soc', incident });
  });

  app.post("/api/v1/soc/analyze/:incidentId", apiKeyAuth('ai-soc'), (req, res) => {
    const analysis = aiAssistedSOC.generateAIAnalysis(req.params.incidentId);
    if (!analysis) { res.status(404).json({ error: 'Incident not found' }); return; }
    res.json({ module: 'ai-soc', analysis });
  });

  app.post("/api/v1/soc/query", apiKeyAuth('ai-soc'), (req, res) => {
    const { query } = req.body;
    if (!query) { res.status(400).json({ error: 'query string required' }); return; }
    const result = aiAssistedSOC.processNaturalLanguageQuery(query);
    res.json({ module: 'ai-soc', ...result });
  });

  app.post("/api/v1/soc/playbook/:threatId", apiKeyAuth('ai-soc'), (req, res) => {
    const playbook = aiAssistedSOC.generatePlaybookFromThreat(req.params.threatId);
    if (!playbook) { res.status(404).json({ error: 'Threat not found' }); return; }
    res.json({ module: 'ai-soc', playbook });
  });

  app.get("/api/v1/soc/stats", apiKeyAuth('ai-soc'), (_req, res) => {
    const stats = aiAssistedSOC.getStatistics();
    res.json({ module: 'ai-soc', ...stats });
  });

  // Agent Identity Manager (Enterprise)
  app.post("/api/v1/identity/register", apiKeyAuth('agent-identity'), (req, res) => {
    const { agentId, publicKey, role } = req.body;
    if (!agentId || !publicKey || !role) { res.status(400).json({ error: 'agentId, publicKey, and role required' }); return; }
    const identity = agentIdentityManager.registerAgent(agentId, publicKey, role);
    res.status(201).json({ module: 'agent-identity', identity });
  });

  app.post("/api/v1/identity/challenge", apiKeyAuth('agent-identity'), (req, res) => {
    const { fromAgent, toAgent } = req.body;
    if (!fromAgent || !toAgent) { res.status(400).json({ error: 'fromAgent and toAgent required' }); return; }
    const challenge = agentIdentityManager.createChallenge(fromAgent, toAgent);
    res.json({ module: 'agent-identity', challenge });
  });

  app.post("/api/v1/identity/verify", apiKeyAuth('agent-identity'), (req, res) => {
    const { challengeId, agentId, response } = req.body;
    if (!challengeId || !agentId || !response) { res.status(400).json({ error: 'challengeId, agentId, and response required' }); return; }
    const result = agentIdentityManager.verifyChallenge(challengeId, agentId, response);
    res.json({ module: 'agent-identity', ...result });
  });

  // State Manager (Enterprise)
  app.post("/api/v1/state/checkpoint", apiKeyAuth('state-manager'), (req, res) => {
    const result = stateManager.createCheckpoint(req.body);
    res.status(201).json({ module: 'state-manager', checkpoint: result });
  });

  app.post("/api/v1/state/rollback", apiKeyAuth('state-manager'), (req, res) => {
    const result = stateManager.rollback(req.body);
    res.json({ module: 'state-manager', ...result });
  });

  app.get("/api/v1/state/:agentId/checkpoints", apiKeyAuth('state-manager'), (req, res) => {
    const checkpoints = stateManager.getCheckpoints(req.params.agentId);
    res.json({ module: 'state-manager', count: checkpoints.length, checkpoints });
  });

  app.get("/api/v1/state/:agentId/rollback-history", apiKeyAuth('state-manager'), (req, res) => {
    const history = stateManager.getRollbackHistory(req.params.agentId);
    res.json({ module: 'state-manager', count: history.length, history });
  });

  // Cyber Wiki (Enterprise)
  app.post("/api/v1/wiki/query", apiKeyAuth('cyber-wiki'), (req, res) => {
    const { query } = req.body;
    if (!query) { res.status(400).json({ error: 'query string required' }); return; }
    const result = karpathyCyberWiki.query(query);
    res.json({ module: 'cyber-wiki', ...result });
  });

  app.post("/api/v1/wiki/ingest", apiKeyAuth('cyber-wiki'), (req, res) => {
    const { rawSourceId } = req.body;
    if (!rawSourceId || typeof rawSourceId !== 'string') {
      res.status(400).json({ error: 'rawSourceId (string) is required. First call storeRawSource() to get a rawSourceId.' });
      return;
    }
    const result = karpathyCyberWiki.ingest(rawSourceId);
    res.json({ module: 'cyber-wiki', ...result });
  });

  // =========================================================================
  // THREAT INTELLIGENCE — CISA KEV Feed Endpoints
  // =========================================================================

  // Status of the CISA KEV feed
  app.get("/api/v1/threat-intel/status", (_req, res) => {
    res.json({ module: 'threat-intel', ...kevService.getStatus() });
  });

  // Paginated full catalog
  app.get("/api/v1/threat-intel/kev", apiKeyAuth('threat-intel'), (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const { entries, total } = kevService.paginate(page, pageSize);
    res.json({ module: 'threat-intel', page, pageSize, total, entries });
  });

  // Look up a specific CVE
  app.get("/api/v1/threat-intel/kev/:cveId", apiKeyAuth('threat-intel'), (req, res) => {
    const entry = kevService.enrichCve(req.params.cveId);
    if (!entry) { res.status(404).json({ error: `${req.params.cveId} not found in CISA KEV catalog` }); return; }
    res.json({ module: 'threat-intel', entry, isKnownExploited: true });
  });

  // Full-text search
  app.get("/api/v1/threat-intel/kev/search", apiKeyAuth('threat-intel'), (req, res) => {
    const q = (req.query.q as string) || '';
    if (!q) { res.status(400).json({ error: 'q query parameter required' }); return; }
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const results = kevService.search(q, limit);
    res.json({ module: 'threat-intel', query: q, count: results.length, results });
  });

  // Recent KEV additions
  app.get("/api/v1/threat-intel/kev/recent", apiKeyAuth('threat-intel'), (req, res) => {
    const days = Math.min(365, parseInt(req.query.days as string) || 30);
    const entries = kevService.getRecentKevs(days);
    res.json({ module: 'threat-intel', days, count: entries.length, entries });
  });

  // Ransomware-linked KEVs
  app.get("/api/v1/threat-intel/kev/ransomware", apiKeyAuth('threat-intel'), (_req, res) => {
    const entries = kevService.getRansomwareLinkedKevs();
    res.json({ module: 'threat-intel', count: entries.length, entries });
  });

  // Force immediate refresh of the KEV feed (admin use)
  app.post("/api/v1/threat-intel/kev/refresh", apiKeyAuth('threat-intel'), async (_req, res) => {
    try {
      const result = await kevService.fetchAndStore();
      res.json({ module: 'threat-intel', ...result });
    } catch (err: any) {
      console.error('[KEV] Manual refresh failed:', err instanceof Error ? err.message : String(err));
      res.status(502).json({ error: 'Failed to fetch KEV feed' });
    }
  });

  // =========================================================================
  // MODULE CATALOG — List all available modules with docs
  // =========================================================================

  // Serve OpenAPI spec as JSON
  app.get("/api/v1/docs", (_req, res) => {
    const spec = fs.readFileSync(path.join(__dirname, 'schemas', 'openapi.yaml'), 'utf-8');
    res.type('application/json').send(YAML.parse(spec));
  });

  // Redirect /api/v1/docs/openapi to the yaml file
  app.get("/api/v1/docs/openapi", (_req, res) => {
    res.type('application/yaml').sendFile(path.join(__dirname, 'schemas', 'openapi.yaml'));
  });

  app.get("/api/v1/modules", (_req, res) => {
    res.json({
      totalModules: 23,
      modules: [
        { id: 'prompt-injection', name: 'Prompt Injection Detector', plan: 'free', endpoints: ['/scan/prompt-injection', '/scan/prompt-injection/batch', '/scan/prompt-injection/sanitize'] },
        { id: 'secrets-scan', name: 'Secrets Scanner', plan: 'free', endpoints: ['/scan/secrets', '/scan/secrets/batch', '/scan/secrets/report'] },
        { id: 'agent-monitor', name: 'Agent Monitor', plan: 'pro', endpoints: ['/agents/activity', '/agents/:agentId/baseline', '/agents/:agentId/runaway-check', '/agents/anomalies'] },
        { id: 'prompt-fuzzing', name: 'Prompt Fuzzing Engine', plan: 'pro', endpoints: ['/fuzz/payloads', '/fuzz/campaign', '/fuzz/campaigns'] },
        { id: 'compliance', name: 'Compliance Engine', plan: 'pro', endpoints: ['/compliance/policies', '/compliance/controls', '/compliance/frameworks', '/compliance/risk-score', '/compliance/events', '/compliance/audit-log'] },
        { id: 'tool-supply-chain', name: 'Tool Supply Chain Verifier', plan: 'pro', endpoints: ['/supply-chain/verify', '/supply-chain/register', '/supply-chain/report', '/supply-chain/vulnerable'] },
        { id: 'permission-analyzer', name: 'Permission Analyzer', plan: 'pro', endpoints: ['/permissions/analyze'] },
        { id: 'data-exfiltration', name: 'Data Exfiltration Monitor', plan: 'pro', endpoints: ['/exfiltration/check'] },
        { id: 'shadow-agents', name: 'Shadow Agent Discovery', plan: 'pro', endpoints: ['/shadow-agents/scan'] },
        { id: 'uptime-monitor', name: 'Uptime Monitor', plan: 'pro', endpoints: ['/uptime/heartbeat', '/uptime/:agentId'] },
        { id: 'dependency-graph', name: 'Agent Dependency Graph', plan: 'pro', endpoints: ['/dependencies/register', '/dependencies/sbom'] },
        { id: 'playbook', name: 'Playbook / SOAR Engine', plan: 'pro', endpoints: ['/playbooks', '/playbooks/:id/execute'] },
        { id: 'approval-validator', name: 'Approval Request Validator', plan: 'pro', endpoints: ['/approvals/validate'] },
        { id: 'threat-intel', name: 'CISA KEV Threat Intelligence', plan: 'pro', endpoints: ['/threat-intel/kev', '/threat-intel/kev/:cveId', '/threat-intel/kev/search', '/threat-intel/kev/recent', '/threat-intel/kev/ransomware', '/threat-intel/status'] },
        { id: 'zero-trust', name: 'Zero Trust Manager', plan: 'enterprise', endpoints: ['/zero-trust/session', '/zero-trust/evaluate'] },
        { id: 'quantum-crypto', name: 'Quantum-Resistant Crypto', plan: 'enterprise', endpoints: ['/quantum/encrypt', '/quantum/assess'] },
        { id: 'ransomware-defense', name: 'Ransomware Defense', plan: 'enterprise', endpoints: ['/ransomware/check'] },
        { id: 'cloud-security', name: 'Cloud Security Manager', plan: 'enterprise', endpoints: ['/cloud/audit'] },
        { id: 'iot-security', name: 'IoT Security Manager', plan: 'enterprise', endpoints: ['/iot/scan'] },
        { id: 'ai-soc', name: 'AI-Assisted SOC', plan: 'enterprise', endpoints: ['/soc/analyze', '/soc/query'] },
        { id: 'agent-identity', name: 'Agent Identity Manager', plan: 'enterprise', endpoints: ['/identity/register', '/identity/challenge'] },
        { id: 'state-manager', name: 'State Manager', plan: 'enterprise', endpoints: ['/state/checkpoint', '/state/rollback'] },
        { id: 'cyber-wiki', name: 'Karpathy Cyber Wiki', plan: 'enterprise', endpoints: ['/wiki/query', '/wiki/ingest'] },
      ],
    });
  });

  // =========================================================================
  // VITE / SPA SERVING (only if CLAW_SERVE_SAAS=true)
  // =========================================================================

  if (SERVE_SAAS) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    console.log(`[Service Mode] SaaS frontend disabled - API only`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Claw Protect Backend running on http://localhost:${PORT}`);
    console.log(`SaaS API: http://localhost:${PORT}/api/v1/modules`);
    console.log(`Pricing:  http://localhost:${PORT}/api/v1/pricing`);
    console.log(`KEV Feed: http://localhost:${PORT}/api/v1/threat-intel/status`);
    if (!SERVE_SAAS) {
      console.log(`[Service Mode] API-only - no frontend served`);
    }
  });
}

startServer();
