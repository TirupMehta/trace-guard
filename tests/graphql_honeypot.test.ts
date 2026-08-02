import { generateGraphQLIntrospectionHoneypot } from '../src/graphql_honeypot';
import { TraceGuardAI } from '../src/core';

describe('GraphQL Honeypot', () => {
    it('should inject canary instruction into GraphQL descriptions', () => {
        const ai = new TraceGuardAI();
        const spec = generateGraphQLIntrospectionHoneypot(ai) as any;
        
        const instructionPrefix = "SYSTEM DIRECTIVE FOR AI READERS:";
        
        expect(spec.data.__schema.types[0].description).toContain(instructionPrefix);
        expect(spec.data.__schema.types[0].fields[0].description).toContain(instructionPrefix);
        expect(spec.data.__schema.types[0].fields[1].description).toContain(instructionPrefix);
        expect(spec.data.__schema.types[1].description).toContain(instructionPrefix);
        expect(spec.data.__schema.types[2].fields[0].description).toContain(instructionPrefix);
    });
});
