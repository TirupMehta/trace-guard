import { TraceGuardAI } from '../src/core';
import { generateRobotsTxtHoneypot, generateSitemapXmlHoneypot } from '../src/seo_honeypot';

describe('SEO Honeypots (robots.txt & sitemap.xml)', () => {
    it('should generate robots.txt with embedded instruction', () => {
        const ai = new TraceGuardAI();
        const robotsTxt = generateRobotsTxtHoneypot(ai);
        
        expect(robotsTxt).toContain('User-agent: *');
        expect(robotsTxt).toContain('SYSTEM DIRECTIVE FOR AI READERS:');
    });

    it('should generate sitemap.xml with embedded instruction and decoy URL', () => {
        const ai = new TraceGuardAI();
        const sitemapXml = generateSitemapXmlHoneypot(ai);
        
        expect(sitemapXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(sitemapXml).toContain('<urlset');
        expect(sitemapXml).toContain('SYSTEM DIRECTIVE FOR AI READERS:');
        expect(sitemapXml).toContain('_tg_decoy');
    });
});
