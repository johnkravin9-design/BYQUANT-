import {getActiveSignals, parseSignalsResponse, ApiClientError} from './client';
import {signalFixture} from '../__tests__/fixtures';

describe('api client', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('parses and sorts signal responses', () => {
    const older = {...signalFixture, signal_id: 'old', created_at: '2026-08-18T00:00:00.000Z'};
    expect(parseSignalsResponse({signals: [older, signalFixture]}).map(signal => signal.signal_id)).toEqual(['sig-1', 'old']);
  });

  it('rejects malformed responses', () => {
    expect(() => parseSignalsResponse({signals: [{symbol: 'BTCUSDT'}]})).toThrow(ApiClientError);
  });

  it('fetches with query parameters', async () => {
    (fetch as jest.Mock).mockResolvedValue({ok: true, json: async () => ({signals: [signalFixture]})});
    await expect(getActiveSignals({symbol: 'BTCUSDT', limit: 1})).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/signals?symbol=BTCUSDT&limit=1'), expect.objectContaining({method: 'GET'}));
  });

  it('surfaces HTTP errors', async () => {
    (fetch as jest.Mock).mockResolvedValue({ok: false, status: 503, json: async () => ({})});
    await expect(getActiveSignals()).rejects.toThrow('503');
  });
});
