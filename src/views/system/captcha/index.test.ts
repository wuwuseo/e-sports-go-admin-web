// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('captcha settings page', () => {
  it('renders provider selection and descriptor-driven fields', () => {
    const source = readFileSync(resolve(__dirname, 'index.vue'), 'utf8');

    expect(source).toContain('v-model="state.selectedProvider"');
    expect(source).toContain(
      'v-for="field in selectedDraft.descriptor.fields"'
    );
    expect(source).toContain("field.type === 'multi_select'");
    expect(source).toContain("field.type === 'number'");
    expect(source).not.toContain('<a-tag color="arcoblue">image_math</a-tag>');
  });
});
