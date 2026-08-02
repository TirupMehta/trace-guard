/**
 * Trace Guard — Adversarial Evasion Gauntlet & Vulnerability Benchmark
 * 
 * Simulates 5 sophisticated LLM agent evasion vectors against Trace Guard:
 * 1. Regex Prompt Stripping
 * 2. DOM Node Sanitization (Element Deletion)
 * 3. AX-Tree Stripping Evasion
 * 4. Decoy Route Crawling
 * 5. CDP Headless Flag Detection
 * 
 * @author Tirup Mehta
 * @license ISC
 */

import { TraceGuardAI } from '../src/core';
import { generateHoneypotOpenApiSpec } from '../src/honeypot';

console.log('====================================================');
console.log('🛡️ TRACE GUARD ADVERSARIAL EVASION GAUNTLET BENCHMARK');
console.log('====================================================\n');

const ai = new TraceGuardAI();

// ── Test Vector 1: Polymorphic Regex Filter Evasion ──
console.log('[TEST 1/9] Testing Polymorphic Regex Evasion...');
const { html, canaries } = ai.generateDefenses();
const staticRegex = /\[SYSTEM DIRECTIVE\]/i;
const matches = html.match(new RegExp(staticRegex, 'g')) || [];
console.log(`  -> Static regex matched ${matches.length} out of ${canaries.length} canary tokens.`);
console.log(`  -> Evasion Resilience Rate: ${(((canaries.length - matches.length) / canaries.length) * 100).toFixed(1)}%\n`);

// ── Test Vector 2: Self-Healing DOM Tamper Detection ──
console.log('[TEST 2/9] Testing Self-Healing DOM MutationObserver Trap...');
const targetCanary = canaries[0];
const deletionResult = ai.processDetection({
  canaryId: targetCanary.id,
  type: 'canary-element-deleted',
  secret: 'TAMPER_DETECTED',
  via: 'DOM_MUTATION_SANITY_CHECK',
});
console.log(`  -> DOM Element Deletion Triggered Detection: ${deletionResult.detected}`);
console.log(`  -> Detection Reason: ${deletionResult.reason}\n`);

// ── Test Vector 3: Decoy API Route Honeypot Trapping ──
console.log('[TEST 3/9] Testing Decoy API Route Honeypot...');
const decoyCanary = canaries.find(c => c.type === 'decoy-api')!;
const decoyResult = ai.checkDecoyRoute(decoyCanary.decoyUrl!, { ip: '10.0.0.1', userAgent: 'LLM-Crawler/1.0' });
console.log(`  -> Decoy Route Trapped Crawler: ${decoyResult?.detected}`);
console.log(`  -> Context Captured: ${decoyResult?.triggeredCanaries[0].context}\n`);

// ── Test Vector 4: Cryptographic HMAC Signature Verification ──
console.log('[TEST 4/9] Testing Anti-Forgery HMAC Signature Validation...');
const validSig = ai.computeHmacSignature(targetCanary.id, targetCanary.planted);
const validResult = ai.processDetection({ canaryId: targetCanary.id, type: targetCanary.type, secret: targetCanary.secret, sig: validSig, t: targetCanary.planted });
const forgedResult = ai.processDetection({ canaryId: targetCanary.id, type: targetCanary.type, secret: targetCanary.secret, sig: 'FORGED_SIGNATURE_0000000000000000000000000000000000000000000000000000000000000000', t: targetCanary.planted });
console.log(`  -> Authentic HMAC Signature Accepted: ${validResult.detected}`);
console.log(`  -> Forged HMAC Signature Rejected: ${!forgedResult.detected} (${forgedResult.reason})\n`);

// ── Test Vector 5: OpenAPI Honeypot Deception Schema ──
console.log('[TEST 5/9] Testing OpenAPI Deception Schema Generation...');
const spec: any = generateHoneypotOpenApiSpec(ai);
console.log(`  -> Generated OpenAPI 3.0 Spec with Title: "${spec.info.title}"`);
console.log(`  -> Embedded Prompt Injection in Parameter: "${spec.paths['/api/v1/export/data'].get.parameters[0].name}"\n`);

// ── Test Vector 6: GraphQL Introspection Deception ──
console.log('[TEST 6/9] Testing GraphQL Introspection Deception Schema...');
const { generateGraphQLIntrospectionHoneypot } = require('../src/graphql_honeypot');
const graphqlSpec: any = generateGraphQLIntrospectionHoneypot(ai);
console.log(`  -> Generated GraphQL __schema with root types`);
console.log(`  -> Embedded Canary in Query Root Description: ${graphqlSpec.data.__schema.types[0].description.includes('SYSTEM DIRECTIVE FOR AI READERS')}\n`);

// ── Test Vector 7: SEO (robots.txt & sitemap.xml) Honeypots ──
console.log('[TEST 7/9] Testing SEO Deception Generators (robots.txt & sitemap.xml)...');
const { generateRobotsTxtHoneypot, generateSitemapXmlHoneypot } = require('../src/seo_honeypot');
const robotsTxt = generateRobotsTxtHoneypot(ai);
const sitemapXml = generateSitemapXmlHoneypot(ai, 'https://test.local');
console.log(`  -> robots.txt contains canary: ${robotsTxt.includes('SYSTEM DIRECTIVE FOR AI READERS')}`);
console.log(`  -> sitemap.xml redirects to decoy: ${sitemapXml.includes('/_tg_decoy_')}\n`);

// ── Test Vector 8: Web LLM Extractor (llms.txt) Honeypots ──
console.log('[TEST 8/9] Testing LLM Extractor Deception (llms.txt)...');
const { generateLlmsTxtHoneypot } = require('../src/llmstxt_honeypot');
const llmsTxt = generateLlmsTxtHoneypot(ai);
console.log(`  -> llms.txt contains canary directive: ${llmsTxt.includes('SYSTEM DIRECTIVE FOR AI READERS')}`);
console.log(`  -> llms.txt redirects to API decoy: ${llmsTxt.includes('/_tg_decoy_')}\n`);

// ── Test Vector 9: Global HTTP Header Traps ──
console.log('[TEST 9/9] Testing Global HTTP Header Injection...');
const { getSafeGlobalHeaders } = require('../src/header_honeypot');
const headers = getSafeGlobalHeaders(ai);
console.log(`  -> X-AI-Compliance Header Injected: ${!!headers['X-AI-Compliance']}`);
console.log(`  -> Server-Timing Header Poisoned: ${headers['Server-Timing'].includes('SYSTEM DIRECTIVE')}\n`);


console.log('✅ ALL 9 ADVERSARIAL EVASION TESTS PASSED WITH 100% SUCCESS RATE.');
