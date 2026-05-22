import { beforeEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.hoisted(() => vi.fn());
const closeMock = vi.hoisted(() => vi.fn());
const mongoClientMock = vi.hoisted(() => vi.fn());

vi.mock('mongodb', () => ({
  MongoClient: mongoClientMock,
}));

describe('getMongoClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mongoClientMock.mockImplementation(function MockMongoClient() {
      return {
      close: closeMock,
      connect: connectMock,
      db: vi.fn(),
      };
    });
  });

  it('clears a rejected cached connection so the next call can retry', async () => {
    const connectionError = new Error('connection failed');
    connectMock.mockRejectedValue(connectionError);

    const { getMongoClient } = await import('@/server/db/client');

    await expect(getMongoClient()).rejects.toThrow('connection failed');
    await expect(getMongoClient()).rejects.toThrow('connection failed');

    expect(mongoClientMock).toHaveBeenCalledTimes(2);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it('closes the cached client and clears it for the next connection', async () => {
    const client = {
      close: closeMock,
      db: vi.fn(),
    };
    connectMock.mockResolvedValue(client);

    const { closeMongoClient, getMongoClient } = await import(
      '@/server/db/client'
    );

    await expect(getMongoClient()).resolves.toBe(client);
    await closeMongoClient();
    await expect(getMongoClient()).resolves.toBe(client);

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(mongoClientMock).toHaveBeenCalledTimes(2);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });
});
