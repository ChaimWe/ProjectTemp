import { describe, it, expect } from '@jest/globals';
import { matchAlbRule, evaluateRulesAgainstRequest, simulateRuleEvaluation } from './RequestDebugger.jsx';

describe('ALB/WAF Matching Logic', () => {
    it('should match ALB path-pattern with wildcard', () => {
        const rule = { Conditions: [{ Field: 'path-pattern', Values: ['/foo/*'] }] };
        const req = { uri: '/foo/bar', headers: {} };
        expect(matchAlbRule(req, rule)).toBe(true);
    });
    it('should not match ALB path-pattern if not matching', () => {
        const rule = { Conditions: [{ Field: 'path-pattern', Values: ['/foo/*'] }] };
        const req = { uri: '/bar/baz', headers: {} };
        expect(matchAlbRule(req, rule)).toBe(false);
    });
    it('should match ALB host header case-insensitively', () => {
        const rule = { Conditions: [{ HostHeaderConfig: { Values: ['EXAMPLE.com'] } }] };
        const req = { uri: '/', headers: { host: [{ value: 'example.com' }] } };
        expect(matchAlbRule(req, rule)).toBe(true);
    });
    it('should handle empty rules/requests gracefully', () => {
        expect(matchAlbRule({}, {})).toBe(false);
        expect(evaluateRulesAgainstRequest({}, [])).toEqual({ matchedRules: [], labelsGenerated: new Set() });
    });
    it('should match WAF ByteMatchStatement', () => {
        const rule = {
            Statement: {
                ByteMatchStatement: {
                    SearchString: '/foo',
                    FieldToMatch: { UriPath: {} },
                    TextTransformations: [],
                    PositionalConstraint: 'STARTS_WITH'
                }
            }
        };
        const req = { uri: '/foo/bar' };
        const result = simulateRuleEvaluation(req, rule, new Set());
        expect(result.matched).toBe(true);
    });
    it('should handle malformed rules without crashing', () => {
        expect(() => matchAlbRule(null, null)).not.toThrow();
        expect(() => simulateRuleEvaluation({}, {}, new Set())).not.toThrow();
    });
    it('should handle large rule sets efficiently', () => {
        const rules = Array.from({ length: 1000 }, (_, i) => ({
            Conditions: [{ Field: 'path-pattern', Values: [`/foo${i}/*`] }]
        }));
        const req = { uri: '/foo999/bar', headers: {} };
        const matches = rules.filter(r => matchAlbRule(req, r));
        expect(matches.length).toBe(1);
    });
}); 