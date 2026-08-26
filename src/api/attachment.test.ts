// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { getAttachmentAccessUrl } from './attachment';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('attachment api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('silences handled attachment access failures', () => {
    getAttachmentAccessUrl(7);

    expect(axios.get).toHaveBeenCalledWith(
      '/api/v1/admin/auth/attachments/7/access-url',
      { silentError: true }
    );
  });
});
