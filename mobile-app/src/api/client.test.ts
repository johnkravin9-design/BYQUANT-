import {getActiveSignals, parseSignalsResponse, ApiClientError} from './client';
import {signalFixture} from '../__tests__/fixtures';

describe('api client', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('parses 200 { data: [...] }, PostgreSQL numeric strings, and sorts latest first', () => {
    const older = {...signalFixture, signal_id: 'old', entry_price: '64000.00000000', created_at: '2026-08-18T00:00:00.000Z'};
    const parsed = parseSignalsResponse({data: [older, {...signalFixture, entry_price: '65000.12345678'}]});
    expect(parsed.map(signal => signal.signal_id)).toEqual(['sig-1', 'old']);
    expect(parsed[0].entry_price).toBe(65000.12345678);
  });

  it('parses 200 { data: [] }', () => {
    expect(parseSignalsResponse({data: []})).toEqual([]);
  });

  it('rejects malformed JSON shapes', () => {
    expect(() => parseSignalsResponse({signals: [{symbol: 'BTCUSDT'}]})).toThrow(ApiClientError);
    expect(() => parseSignalsResponse({data: {signal_id: 'sig'}})).toThrow(ApiClientError);
  });

  it('fetches with symbol and limit query parameters', async () => {
    (fetch as jest.Mock).mockResolvedValue({ok: true, status: 200, json: async () => ({data: [{...signalFixture, entry_price: '64000.00000000'}]})});
    await expect(getActiveSignals({symbol: 'BTCUSDT', limit: 1})).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/signals?symbol=BTCUSDT&limit=1'), expect.objectContaining({method: 'GET'}));
  });

  it.each([400, 401, 500])('surfaces HTTP %i errors', async status => {
    (fetch as jest.Mock).mockResolvedValue({ok: false, status, json: async () => ({})});
    await expect(getActiveSignals()).rejects.toMatchObject({status});
  });

  it('surfaces malformed response JSON from fetch', async () => {
    (fetch as jest.Mock).mockResolvedValue({ok: true, status: 200, json: async () => ({data: [{symbol: 'BTCUSDT'}]})});
    await expect(getActiveSignals()).rejects.toThrow('Malformed signal response');
  });

  it('surfaces network timeout', async () => {
    (fetch as jest.Mock).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), {name: 'AbortError'})));
    }));
    await expect(getActiveSignals({timeoutMs: 1})).rejects.toThrow('timed out');
  });

  it('surfaces network failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    await expect(getActiveSignals()).rejects.toThrow('network down');
  });
});
