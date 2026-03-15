/**
 * Mock SQLite database for testing DAO functions.
 * Tracks all calls to runAsync, getAllAsync, getFirstAsync, execAsync
 * and returns configurable results.
 */
export function createMockDb() {
  const calls: { method: string; sql: string; params?: any[] }[] = [];
  let runAsyncResult: any = { changes: 1 };
  let getAllAsyncResults: Record<string, any[]> = {};
  let getFirstAsyncResults: Record<string, any> = {};
  let defaultGetAllResult: any[] = [];
  let defaultGetFirstResult: any = null;

  const db = {
    runAsync: jest.fn(async (sql: string, params?: any[]) => {
      calls.push({ method: 'runAsync', sql, params });
      return runAsyncResult;
    }),
    getAllAsync: jest.fn(async (sql: string, params?: any[]) => {
      calls.push({ method: 'getAllAsync', sql, params });
      // Check if there's a specific result for this SQL pattern
      for (const [pattern, result] of Object.entries(getAllAsyncResults)) {
        if (sql.includes(pattern)) return result;
      }
      return defaultGetAllResult;
    }),
    getFirstAsync: jest.fn(async (sql: string, params?: any[]) => {
      calls.push({ method: 'getFirstAsync', sql, params });
      for (const [pattern, result] of Object.entries(getFirstAsyncResults)) {
        if (sql.includes(pattern)) return result;
      }
      return defaultGetFirstResult;
    }),
    execAsync: jest.fn(async (sql: string) => {
      calls.push({ method: 'execAsync', sql });
    }),
  };

  return {
    db: db as any,
    calls,
    // Configuration helpers
    setRunResult: (r: any) => { runAsyncResult = r; },
    setGetAllResult: (pattern: string, result: any[]) => { getAllAsyncResults[pattern] = result; },
    setGetFirstResult: (pattern: string, result: any) => { getFirstAsyncResults[pattern] = result; },
    setDefaultGetAll: (result: any[]) => { defaultGetAllResult = result; },
    setDefaultGetFirst: (result: any) => { defaultGetFirstResult = result; },
    reset: () => {
      calls.length = 0;
      db.runAsync.mockClear();
      db.getAllAsync.mockClear();
      db.getFirstAsync.mockClear();
      db.execAsync.mockClear();
      getAllAsyncResults = {};
      getFirstAsyncResults = {};
      defaultGetAllResult = [];
      defaultGetFirstResult = null;
    },
    // Assertion helpers
    lastCall: () => calls[calls.length - 1],
    callsFor: (method: string) => calls.filter(c => c.method === method),
    sqlContains: (text: string) => calls.some(c => c.sql.includes(text)),
  };
}

export function createCtx(mockDb: ReturnType<typeof createMockDb>) {
  return { db: mockDb.db, userId: 'test-user-123' };
}
