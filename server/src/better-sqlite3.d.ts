declare module "better-sqlite3" {
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  class BetterSqlite3Database {
    constructor(filename: string);
    pragma(source: string): unknown;
    exec(source: string): this;
    prepare(source: string): Statement;
    close(): void;
  }

  namespace BetterSqlite3Database {
    export type Database = BetterSqlite3Database;
    export type Statement = Statement;
    export type RunResult = RunResult;
  }

  export = BetterSqlite3Database;
}
