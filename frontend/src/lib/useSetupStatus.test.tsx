import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSetupStatus } from './useSetupStatus';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('useSetupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('treats an institution payload as configured even when the configured flag is false', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        configured: false,
        institution: {
          name: 'Test Institution',
          shortName: 'TI',
        },
      },
    } as never);

    const { result } = renderHook(() => useSetupStatus());

    await waitFor(() => {
      expect(result.current.isSetupStatusLoading).toBe(false);
    });

    expect(result.current.isSetupConfigured).toBe(true);
  });
});
