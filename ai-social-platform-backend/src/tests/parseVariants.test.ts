import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseVariantsFromText } from '../services/claude.service.js';

describe('parseVariantsFromText', () => {
  it('extracts three variants from Claude delimiter format', () => {
    const text = `---VARIANT_A---
Hello professional world
---VARIANT_B---
Hey there #social
---VARIANT_C---
Stop scrolling!`;

    const v = parseVariantsFromText(text);
    assert.equal(v.variantA, 'Hello professional world');
    assert.equal(v.variantB, 'Hey there #social');
    assert.equal(v.variantC, 'Stop scrolling!');
  });
});
