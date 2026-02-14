
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model ConnectedAccount
 * 
 */
export type ConnectedAccount = $Result.DefaultSelection<Prisma.$ConnectedAccountPayload>
/**
 * Model OAuthToken
 * 
 */
export type OAuthToken = $Result.DefaultSelection<Prisma.$OAuthTokenPayload>
/**
 * Model SyncState
 * 
 */
export type SyncState = $Result.DefaultSelection<Prisma.$SyncStatePayload>
/**
 * Model Approval
 * 
 */
export type Approval = $Result.DefaultSelection<Prisma.$ApprovalPayload>
/**
 * Model AuditLog
 * 
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model ProcessedEvent
 * 
 */
export type ProcessedEvent = $Result.DefaultSelection<Prisma.$ProcessedEventPayload>
/**
 * Model EncryptionKey
 * 
 */
export type EncryptionKey = $Result.DefaultSelection<Prisma.$EncryptionKeyPayload>
/**
 * Model CachedMessage
 * 
 */
export type CachedMessage = $Result.DefaultSelection<Prisma.$CachedMessagePayload>
/**
 * Model CachedEvent
 * 
 */
export type CachedEvent = $Result.DefaultSelection<Prisma.$CachedEventPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more ConnectedAccounts
 * const connectedAccounts = await prisma.connectedAccount.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more ConnectedAccounts
   * const connectedAccounts = await prisma.connectedAccount.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.connectedAccount`: Exposes CRUD operations for the **ConnectedAccount** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ConnectedAccounts
    * const connectedAccounts = await prisma.connectedAccount.findMany()
    * ```
    */
  get connectedAccount(): Prisma.ConnectedAccountDelegate<ExtArgs>;

  /**
   * `prisma.oAuthToken`: Exposes CRUD operations for the **OAuthToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more OAuthTokens
    * const oAuthTokens = await prisma.oAuthToken.findMany()
    * ```
    */
  get oAuthToken(): Prisma.OAuthTokenDelegate<ExtArgs>;

  /**
   * `prisma.syncState`: Exposes CRUD operations for the **SyncState** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SyncStates
    * const syncStates = await prisma.syncState.findMany()
    * ```
    */
  get syncState(): Prisma.SyncStateDelegate<ExtArgs>;

  /**
   * `prisma.approval`: Exposes CRUD operations for the **Approval** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Approvals
    * const approvals = await prisma.approval.findMany()
    * ```
    */
  get approval(): Prisma.ApprovalDelegate<ExtArgs>;

  /**
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs>;

  /**
   * `prisma.processedEvent`: Exposes CRUD operations for the **ProcessedEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProcessedEvents
    * const processedEvents = await prisma.processedEvent.findMany()
    * ```
    */
  get processedEvent(): Prisma.ProcessedEventDelegate<ExtArgs>;

  /**
   * `prisma.encryptionKey`: Exposes CRUD operations for the **EncryptionKey** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more EncryptionKeys
    * const encryptionKeys = await prisma.encryptionKey.findMany()
    * ```
    */
  get encryptionKey(): Prisma.EncryptionKeyDelegate<ExtArgs>;

  /**
   * `prisma.cachedMessage`: Exposes CRUD operations for the **CachedMessage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CachedMessages
    * const cachedMessages = await prisma.cachedMessage.findMany()
    * ```
    */
  get cachedMessage(): Prisma.CachedMessageDelegate<ExtArgs>;

  /**
   * `prisma.cachedEvent`: Exposes CRUD operations for the **CachedEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CachedEvents
    * const cachedEvents = await prisma.cachedEvent.findMany()
    * ```
    */
  get cachedEvent(): Prisma.CachedEventDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    ConnectedAccount: 'ConnectedAccount',
    OAuthToken: 'OAuthToken',
    SyncState: 'SyncState',
    Approval: 'Approval',
    AuditLog: 'AuditLog',
    ProcessedEvent: 'ProcessedEvent',
    EncryptionKey: 'EncryptionKey',
    CachedMessage: 'CachedMessage',
    CachedEvent: 'CachedEvent'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "connectedAccount" | "oAuthToken" | "syncState" | "approval" | "auditLog" | "processedEvent" | "encryptionKey" | "cachedMessage" | "cachedEvent"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      ConnectedAccount: {
        payload: Prisma.$ConnectedAccountPayload<ExtArgs>
        fields: Prisma.ConnectedAccountFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConnectedAccountFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConnectedAccountFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>
          }
          findFirst: {
            args: Prisma.ConnectedAccountFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConnectedAccountFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>
          }
          findMany: {
            args: Prisma.ConnectedAccountFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>[]
          }
          create: {
            args: Prisma.ConnectedAccountCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>
          }
          createMany: {
            args: Prisma.ConnectedAccountCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConnectedAccountCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>[]
          }
          delete: {
            args: Prisma.ConnectedAccountDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>
          }
          update: {
            args: Prisma.ConnectedAccountUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>
          }
          deleteMany: {
            args: Prisma.ConnectedAccountDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConnectedAccountUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ConnectedAccountUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectedAccountPayload>
          }
          aggregate: {
            args: Prisma.ConnectedAccountAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConnectedAccount>
          }
          groupBy: {
            args: Prisma.ConnectedAccountGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConnectedAccountGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConnectedAccountCountArgs<ExtArgs>
            result: $Utils.Optional<ConnectedAccountCountAggregateOutputType> | number
          }
        }
      }
      OAuthToken: {
        payload: Prisma.$OAuthTokenPayload<ExtArgs>
        fields: Prisma.OAuthTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OAuthTokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OAuthTokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>
          }
          findFirst: {
            args: Prisma.OAuthTokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OAuthTokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>
          }
          findMany: {
            args: Prisma.OAuthTokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>[]
          }
          create: {
            args: Prisma.OAuthTokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>
          }
          createMany: {
            args: Prisma.OAuthTokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.OAuthTokenCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>[]
          }
          delete: {
            args: Prisma.OAuthTokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>
          }
          update: {
            args: Prisma.OAuthTokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>
          }
          deleteMany: {
            args: Prisma.OAuthTokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.OAuthTokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.OAuthTokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$OAuthTokenPayload>
          }
          aggregate: {
            args: Prisma.OAuthTokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateOAuthToken>
          }
          groupBy: {
            args: Prisma.OAuthTokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<OAuthTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.OAuthTokenCountArgs<ExtArgs>
            result: $Utils.Optional<OAuthTokenCountAggregateOutputType> | number
          }
        }
      }
      SyncState: {
        payload: Prisma.$SyncStatePayload<ExtArgs>
        fields: Prisma.SyncStateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SyncStateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SyncStateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          findFirst: {
            args: Prisma.SyncStateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SyncStateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          findMany: {
            args: Prisma.SyncStateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>[]
          }
          create: {
            args: Prisma.SyncStateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          createMany: {
            args: Prisma.SyncStateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SyncStateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>[]
          }
          delete: {
            args: Prisma.SyncStateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          update: {
            args: Prisma.SyncStateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          deleteMany: {
            args: Prisma.SyncStateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SyncStateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SyncStateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SyncStatePayload>
          }
          aggregate: {
            args: Prisma.SyncStateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSyncState>
          }
          groupBy: {
            args: Prisma.SyncStateGroupByArgs<ExtArgs>
            result: $Utils.Optional<SyncStateGroupByOutputType>[]
          }
          count: {
            args: Prisma.SyncStateCountArgs<ExtArgs>
            result: $Utils.Optional<SyncStateCountAggregateOutputType> | number
          }
        }
      }
      Approval: {
        payload: Prisma.$ApprovalPayload<ExtArgs>
        fields: Prisma.ApprovalFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ApprovalFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ApprovalFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>
          }
          findFirst: {
            args: Prisma.ApprovalFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ApprovalFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>
          }
          findMany: {
            args: Prisma.ApprovalFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>[]
          }
          create: {
            args: Prisma.ApprovalCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>
          }
          createMany: {
            args: Prisma.ApprovalCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ApprovalCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>[]
          }
          delete: {
            args: Prisma.ApprovalDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>
          }
          update: {
            args: Prisma.ApprovalUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>
          }
          deleteMany: {
            args: Prisma.ApprovalDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ApprovalUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ApprovalUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ApprovalPayload>
          }
          aggregate: {
            args: Prisma.ApprovalAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateApproval>
          }
          groupBy: {
            args: Prisma.ApprovalGroupByArgs<ExtArgs>
            result: $Utils.Optional<ApprovalGroupByOutputType>[]
          }
          count: {
            args: Prisma.ApprovalCountArgs<ExtArgs>
            result: $Utils.Optional<ApprovalCountAggregateOutputType> | number
          }
        }
      }
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AuditLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      ProcessedEvent: {
        payload: Prisma.$ProcessedEventPayload<ExtArgs>
        fields: Prisma.ProcessedEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProcessedEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProcessedEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          findFirst: {
            args: Prisma.ProcessedEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProcessedEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          findMany: {
            args: Prisma.ProcessedEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>[]
          }
          create: {
            args: Prisma.ProcessedEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          createMany: {
            args: Prisma.ProcessedEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProcessedEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>[]
          }
          delete: {
            args: Prisma.ProcessedEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          update: {
            args: Prisma.ProcessedEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          deleteMany: {
            args: Prisma.ProcessedEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProcessedEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ProcessedEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProcessedEventPayload>
          }
          aggregate: {
            args: Prisma.ProcessedEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProcessedEvent>
          }
          groupBy: {
            args: Prisma.ProcessedEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProcessedEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProcessedEventCountArgs<ExtArgs>
            result: $Utils.Optional<ProcessedEventCountAggregateOutputType> | number
          }
        }
      }
      EncryptionKey: {
        payload: Prisma.$EncryptionKeyPayload<ExtArgs>
        fields: Prisma.EncryptionKeyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EncryptionKeyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EncryptionKeyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>
          }
          findFirst: {
            args: Prisma.EncryptionKeyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EncryptionKeyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>
          }
          findMany: {
            args: Prisma.EncryptionKeyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>[]
          }
          create: {
            args: Prisma.EncryptionKeyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>
          }
          createMany: {
            args: Prisma.EncryptionKeyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EncryptionKeyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>[]
          }
          delete: {
            args: Prisma.EncryptionKeyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>
          }
          update: {
            args: Prisma.EncryptionKeyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>
          }
          deleteMany: {
            args: Prisma.EncryptionKeyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EncryptionKeyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.EncryptionKeyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$EncryptionKeyPayload>
          }
          aggregate: {
            args: Prisma.EncryptionKeyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEncryptionKey>
          }
          groupBy: {
            args: Prisma.EncryptionKeyGroupByArgs<ExtArgs>
            result: $Utils.Optional<EncryptionKeyGroupByOutputType>[]
          }
          count: {
            args: Prisma.EncryptionKeyCountArgs<ExtArgs>
            result: $Utils.Optional<EncryptionKeyCountAggregateOutputType> | number
          }
        }
      }
      CachedMessage: {
        payload: Prisma.$CachedMessagePayload<ExtArgs>
        fields: Prisma.CachedMessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CachedMessageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CachedMessageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>
          }
          findFirst: {
            args: Prisma.CachedMessageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CachedMessageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>
          }
          findMany: {
            args: Prisma.CachedMessageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>[]
          }
          create: {
            args: Prisma.CachedMessageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>
          }
          createMany: {
            args: Prisma.CachedMessageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CachedMessageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>[]
          }
          delete: {
            args: Prisma.CachedMessageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>
          }
          update: {
            args: Prisma.CachedMessageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>
          }
          deleteMany: {
            args: Prisma.CachedMessageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CachedMessageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.CachedMessageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedMessagePayload>
          }
          aggregate: {
            args: Prisma.CachedMessageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCachedMessage>
          }
          groupBy: {
            args: Prisma.CachedMessageGroupByArgs<ExtArgs>
            result: $Utils.Optional<CachedMessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.CachedMessageCountArgs<ExtArgs>
            result: $Utils.Optional<CachedMessageCountAggregateOutputType> | number
          }
        }
      }
      CachedEvent: {
        payload: Prisma.$CachedEventPayload<ExtArgs>
        fields: Prisma.CachedEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CachedEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CachedEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>
          }
          findFirst: {
            args: Prisma.CachedEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CachedEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>
          }
          findMany: {
            args: Prisma.CachedEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>[]
          }
          create: {
            args: Prisma.CachedEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>
          }
          createMany: {
            args: Prisma.CachedEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CachedEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>[]
          }
          delete: {
            args: Prisma.CachedEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>
          }
          update: {
            args: Prisma.CachedEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>
          }
          deleteMany: {
            args: Prisma.CachedEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CachedEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.CachedEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CachedEventPayload>
          }
          aggregate: {
            args: Prisma.CachedEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCachedEvent>
          }
          groupBy: {
            args: Prisma.CachedEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<CachedEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.CachedEventCountArgs<ExtArgs>
            result: $Utils.Optional<CachedEventCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ConnectedAccountCountOutputType
   */

  export type ConnectedAccountCountOutputType = {
    approvals: number
    auditLogs: number
  }

  export type ConnectedAccountCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    approvals?: boolean | ConnectedAccountCountOutputTypeCountApprovalsArgs
    auditLogs?: boolean | ConnectedAccountCountOutputTypeCountAuditLogsArgs
  }

  // Custom InputTypes
  /**
   * ConnectedAccountCountOutputType without action
   */
  export type ConnectedAccountCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccountCountOutputType
     */
    select?: ConnectedAccountCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ConnectedAccountCountOutputType without action
   */
  export type ConnectedAccountCountOutputTypeCountApprovalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApprovalWhereInput
  }

  /**
   * ConnectedAccountCountOutputType without action
   */
  export type ConnectedAccountCountOutputTypeCountAuditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
  }


  /**
   * Models
   */

  /**
   * Model ConnectedAccount
   */

  export type AggregateConnectedAccount = {
    _count: ConnectedAccountCountAggregateOutputType | null
    _min: ConnectedAccountMinAggregateOutputType | null
    _max: ConnectedAccountMaxAggregateOutputType | null
  }

  export type ConnectedAccountMinAggregateOutputType = {
    id: string | null
    tenantId: string | null
    userId: string | null
    provider: string | null
    providerAccountId: string | null
    email: string | null
    displayName: string | null
    status: string | null
    enabledScopes: string | null
    requestedScopes: string | null
    createdAt: Date | null
    updatedAt: Date | null
    lastSyncAt: Date | null
  }

  export type ConnectedAccountMaxAggregateOutputType = {
    id: string | null
    tenantId: string | null
    userId: string | null
    provider: string | null
    providerAccountId: string | null
    email: string | null
    displayName: string | null
    status: string | null
    enabledScopes: string | null
    requestedScopes: string | null
    createdAt: Date | null
    updatedAt: Date | null
    lastSyncAt: Date | null
  }

  export type ConnectedAccountCountAggregateOutputType = {
    id: number
    tenantId: number
    userId: number
    provider: number
    providerAccountId: number
    email: number
    displayName: number
    status: number
    enabledScopes: number
    requestedScopes: number
    createdAt: number
    updatedAt: number
    lastSyncAt: number
    _all: number
  }


  export type ConnectedAccountMinAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    provider?: true
    providerAccountId?: true
    email?: true
    displayName?: true
    status?: true
    enabledScopes?: true
    requestedScopes?: true
    createdAt?: true
    updatedAt?: true
    lastSyncAt?: true
  }

  export type ConnectedAccountMaxAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    provider?: true
    providerAccountId?: true
    email?: true
    displayName?: true
    status?: true
    enabledScopes?: true
    requestedScopes?: true
    createdAt?: true
    updatedAt?: true
    lastSyncAt?: true
  }

  export type ConnectedAccountCountAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    provider?: true
    providerAccountId?: true
    email?: true
    displayName?: true
    status?: true
    enabledScopes?: true
    requestedScopes?: true
    createdAt?: true
    updatedAt?: true
    lastSyncAt?: true
    _all?: true
  }

  export type ConnectedAccountAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConnectedAccount to aggregate.
     */
    where?: ConnectedAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectedAccounts to fetch.
     */
    orderBy?: ConnectedAccountOrderByWithRelationInput | ConnectedAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConnectedAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectedAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectedAccounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ConnectedAccounts
    **/
    _count?: true | ConnectedAccountCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConnectedAccountMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConnectedAccountMaxAggregateInputType
  }

  export type GetConnectedAccountAggregateType<T extends ConnectedAccountAggregateArgs> = {
        [P in keyof T & keyof AggregateConnectedAccount]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConnectedAccount[P]>
      : GetScalarType<T[P], AggregateConnectedAccount[P]>
  }




  export type ConnectedAccountGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectedAccountWhereInput
    orderBy?: ConnectedAccountOrderByWithAggregationInput | ConnectedAccountOrderByWithAggregationInput[]
    by: ConnectedAccountScalarFieldEnum[] | ConnectedAccountScalarFieldEnum
    having?: ConnectedAccountScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConnectedAccountCountAggregateInputType | true
    _min?: ConnectedAccountMinAggregateInputType
    _max?: ConnectedAccountMaxAggregateInputType
  }

  export type ConnectedAccountGroupByOutputType = {
    id: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName: string | null
    status: string
    enabledScopes: string
    requestedScopes: string
    createdAt: Date
    updatedAt: Date
    lastSyncAt: Date | null
    _count: ConnectedAccountCountAggregateOutputType | null
    _min: ConnectedAccountMinAggregateOutputType | null
    _max: ConnectedAccountMaxAggregateOutputType | null
  }

  type GetConnectedAccountGroupByPayload<T extends ConnectedAccountGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConnectedAccountGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConnectedAccountGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConnectedAccountGroupByOutputType[P]>
            : GetScalarType<T[P], ConnectedAccountGroupByOutputType[P]>
        }
      >
    >


  export type ConnectedAccountSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    provider?: boolean
    providerAccountId?: boolean
    email?: boolean
    displayName?: boolean
    status?: boolean
    enabledScopes?: boolean
    requestedScopes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastSyncAt?: boolean
    oauthToken?: boolean | ConnectedAccount$oauthTokenArgs<ExtArgs>
    syncState?: boolean | ConnectedAccount$syncStateArgs<ExtArgs>
    approvals?: boolean | ConnectedAccount$approvalsArgs<ExtArgs>
    auditLogs?: boolean | ConnectedAccount$auditLogsArgs<ExtArgs>
    _count?: boolean | ConnectedAccountCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connectedAccount"]>

  export type ConnectedAccountSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    provider?: boolean
    providerAccountId?: boolean
    email?: boolean
    displayName?: boolean
    status?: boolean
    enabledScopes?: boolean
    requestedScopes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastSyncAt?: boolean
  }, ExtArgs["result"]["connectedAccount"]>

  export type ConnectedAccountSelectScalar = {
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    provider?: boolean
    providerAccountId?: boolean
    email?: boolean
    displayName?: boolean
    status?: boolean
    enabledScopes?: boolean
    requestedScopes?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    lastSyncAt?: boolean
  }

  export type ConnectedAccountInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    oauthToken?: boolean | ConnectedAccount$oauthTokenArgs<ExtArgs>
    syncState?: boolean | ConnectedAccount$syncStateArgs<ExtArgs>
    approvals?: boolean | ConnectedAccount$approvalsArgs<ExtArgs>
    auditLogs?: boolean | ConnectedAccount$auditLogsArgs<ExtArgs>
    _count?: boolean | ConnectedAccountCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ConnectedAccountIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ConnectedAccountPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ConnectedAccount"
    objects: {
      oauthToken: Prisma.$OAuthTokenPayload<ExtArgs> | null
      syncState: Prisma.$SyncStatePayload<ExtArgs> | null
      approvals: Prisma.$ApprovalPayload<ExtArgs>[]
      auditLogs: Prisma.$AuditLogPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      tenantId: string
      userId: string
      provider: string
      providerAccountId: string
      email: string
      displayName: string | null
      status: string
      enabledScopes: string
      requestedScopes: string
      createdAt: Date
      updatedAt: Date
      lastSyncAt: Date | null
    }, ExtArgs["result"]["connectedAccount"]>
    composites: {}
  }

  type ConnectedAccountGetPayload<S extends boolean | null | undefined | ConnectedAccountDefaultArgs> = $Result.GetResult<Prisma.$ConnectedAccountPayload, S>

  type ConnectedAccountCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ConnectedAccountFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ConnectedAccountCountAggregateInputType | true
    }

  export interface ConnectedAccountDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ConnectedAccount'], meta: { name: 'ConnectedAccount' } }
    /**
     * Find zero or one ConnectedAccount that matches the filter.
     * @param {ConnectedAccountFindUniqueArgs} args - Arguments to find a ConnectedAccount
     * @example
     * // Get one ConnectedAccount
     * const connectedAccount = await prisma.connectedAccount.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConnectedAccountFindUniqueArgs>(args: SelectSubset<T, ConnectedAccountFindUniqueArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ConnectedAccount that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ConnectedAccountFindUniqueOrThrowArgs} args - Arguments to find a ConnectedAccount
     * @example
     * // Get one ConnectedAccount
     * const connectedAccount = await prisma.connectedAccount.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConnectedAccountFindUniqueOrThrowArgs>(args: SelectSubset<T, ConnectedAccountFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ConnectedAccount that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountFindFirstArgs} args - Arguments to find a ConnectedAccount
     * @example
     * // Get one ConnectedAccount
     * const connectedAccount = await prisma.connectedAccount.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConnectedAccountFindFirstArgs>(args?: SelectSubset<T, ConnectedAccountFindFirstArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ConnectedAccount that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountFindFirstOrThrowArgs} args - Arguments to find a ConnectedAccount
     * @example
     * // Get one ConnectedAccount
     * const connectedAccount = await prisma.connectedAccount.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConnectedAccountFindFirstOrThrowArgs>(args?: SelectSubset<T, ConnectedAccountFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ConnectedAccounts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ConnectedAccounts
     * const connectedAccounts = await prisma.connectedAccount.findMany()
     * 
     * // Get first 10 ConnectedAccounts
     * const connectedAccounts = await prisma.connectedAccount.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const connectedAccountWithIdOnly = await prisma.connectedAccount.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConnectedAccountFindManyArgs>(args?: SelectSubset<T, ConnectedAccountFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ConnectedAccount.
     * @param {ConnectedAccountCreateArgs} args - Arguments to create a ConnectedAccount.
     * @example
     * // Create one ConnectedAccount
     * const ConnectedAccount = await prisma.connectedAccount.create({
     *   data: {
     *     // ... data to create a ConnectedAccount
     *   }
     * })
     * 
     */
    create<T extends ConnectedAccountCreateArgs>(args: SelectSubset<T, ConnectedAccountCreateArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ConnectedAccounts.
     * @param {ConnectedAccountCreateManyArgs} args - Arguments to create many ConnectedAccounts.
     * @example
     * // Create many ConnectedAccounts
     * const connectedAccount = await prisma.connectedAccount.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConnectedAccountCreateManyArgs>(args?: SelectSubset<T, ConnectedAccountCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ConnectedAccounts and returns the data saved in the database.
     * @param {ConnectedAccountCreateManyAndReturnArgs} args - Arguments to create many ConnectedAccounts.
     * @example
     * // Create many ConnectedAccounts
     * const connectedAccount = await prisma.connectedAccount.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ConnectedAccounts and only return the `id`
     * const connectedAccountWithIdOnly = await prisma.connectedAccount.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConnectedAccountCreateManyAndReturnArgs>(args?: SelectSubset<T, ConnectedAccountCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ConnectedAccount.
     * @param {ConnectedAccountDeleteArgs} args - Arguments to delete one ConnectedAccount.
     * @example
     * // Delete one ConnectedAccount
     * const ConnectedAccount = await prisma.connectedAccount.delete({
     *   where: {
     *     // ... filter to delete one ConnectedAccount
     *   }
     * })
     * 
     */
    delete<T extends ConnectedAccountDeleteArgs>(args: SelectSubset<T, ConnectedAccountDeleteArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ConnectedAccount.
     * @param {ConnectedAccountUpdateArgs} args - Arguments to update one ConnectedAccount.
     * @example
     * // Update one ConnectedAccount
     * const connectedAccount = await prisma.connectedAccount.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConnectedAccountUpdateArgs>(args: SelectSubset<T, ConnectedAccountUpdateArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ConnectedAccounts.
     * @param {ConnectedAccountDeleteManyArgs} args - Arguments to filter ConnectedAccounts to delete.
     * @example
     * // Delete a few ConnectedAccounts
     * const { count } = await prisma.connectedAccount.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConnectedAccountDeleteManyArgs>(args?: SelectSubset<T, ConnectedAccountDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConnectedAccounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ConnectedAccounts
     * const connectedAccount = await prisma.connectedAccount.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConnectedAccountUpdateManyArgs>(args: SelectSubset<T, ConnectedAccountUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ConnectedAccount.
     * @param {ConnectedAccountUpsertArgs} args - Arguments to update or create a ConnectedAccount.
     * @example
     * // Update or create a ConnectedAccount
     * const connectedAccount = await prisma.connectedAccount.upsert({
     *   create: {
     *     // ... data to create a ConnectedAccount
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ConnectedAccount we want to update
     *   }
     * })
     */
    upsert<T extends ConnectedAccountUpsertArgs>(args: SelectSubset<T, ConnectedAccountUpsertArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ConnectedAccounts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountCountArgs} args - Arguments to filter ConnectedAccounts to count.
     * @example
     * // Count the number of ConnectedAccounts
     * const count = await prisma.connectedAccount.count({
     *   where: {
     *     // ... the filter for the ConnectedAccounts we want to count
     *   }
     * })
    **/
    count<T extends ConnectedAccountCountArgs>(
      args?: Subset<T, ConnectedAccountCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConnectedAccountCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ConnectedAccount.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConnectedAccountAggregateArgs>(args: Subset<T, ConnectedAccountAggregateArgs>): Prisma.PrismaPromise<GetConnectedAccountAggregateType<T>>

    /**
     * Group by ConnectedAccount.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectedAccountGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConnectedAccountGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConnectedAccountGroupByArgs['orderBy'] }
        : { orderBy?: ConnectedAccountGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConnectedAccountGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConnectedAccountGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ConnectedAccount model
   */
  readonly fields: ConnectedAccountFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ConnectedAccount.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConnectedAccountClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    oauthToken<T extends ConnectedAccount$oauthTokenArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccount$oauthTokenArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    syncState<T extends ConnectedAccount$syncStateArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccount$syncStateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    approvals<T extends ConnectedAccount$approvalsArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccount$approvalsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "findMany"> | Null>
    auditLogs<T extends ConnectedAccount$auditLogsArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccount$auditLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ConnectedAccount model
   */ 
  interface ConnectedAccountFieldRefs {
    readonly id: FieldRef<"ConnectedAccount", 'String'>
    readonly tenantId: FieldRef<"ConnectedAccount", 'String'>
    readonly userId: FieldRef<"ConnectedAccount", 'String'>
    readonly provider: FieldRef<"ConnectedAccount", 'String'>
    readonly providerAccountId: FieldRef<"ConnectedAccount", 'String'>
    readonly email: FieldRef<"ConnectedAccount", 'String'>
    readonly displayName: FieldRef<"ConnectedAccount", 'String'>
    readonly status: FieldRef<"ConnectedAccount", 'String'>
    readonly enabledScopes: FieldRef<"ConnectedAccount", 'String'>
    readonly requestedScopes: FieldRef<"ConnectedAccount", 'String'>
    readonly createdAt: FieldRef<"ConnectedAccount", 'DateTime'>
    readonly updatedAt: FieldRef<"ConnectedAccount", 'DateTime'>
    readonly lastSyncAt: FieldRef<"ConnectedAccount", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ConnectedAccount findUnique
   */
  export type ConnectedAccountFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * Filter, which ConnectedAccount to fetch.
     */
    where: ConnectedAccountWhereUniqueInput
  }

  /**
   * ConnectedAccount findUniqueOrThrow
   */
  export type ConnectedAccountFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * Filter, which ConnectedAccount to fetch.
     */
    where: ConnectedAccountWhereUniqueInput
  }

  /**
   * ConnectedAccount findFirst
   */
  export type ConnectedAccountFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * Filter, which ConnectedAccount to fetch.
     */
    where?: ConnectedAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectedAccounts to fetch.
     */
    orderBy?: ConnectedAccountOrderByWithRelationInput | ConnectedAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConnectedAccounts.
     */
    cursor?: ConnectedAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectedAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectedAccounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConnectedAccounts.
     */
    distinct?: ConnectedAccountScalarFieldEnum | ConnectedAccountScalarFieldEnum[]
  }

  /**
   * ConnectedAccount findFirstOrThrow
   */
  export type ConnectedAccountFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * Filter, which ConnectedAccount to fetch.
     */
    where?: ConnectedAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectedAccounts to fetch.
     */
    orderBy?: ConnectedAccountOrderByWithRelationInput | ConnectedAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConnectedAccounts.
     */
    cursor?: ConnectedAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectedAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectedAccounts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConnectedAccounts.
     */
    distinct?: ConnectedAccountScalarFieldEnum | ConnectedAccountScalarFieldEnum[]
  }

  /**
   * ConnectedAccount findMany
   */
  export type ConnectedAccountFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * Filter, which ConnectedAccounts to fetch.
     */
    where?: ConnectedAccountWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectedAccounts to fetch.
     */
    orderBy?: ConnectedAccountOrderByWithRelationInput | ConnectedAccountOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ConnectedAccounts.
     */
    cursor?: ConnectedAccountWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectedAccounts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectedAccounts.
     */
    skip?: number
    distinct?: ConnectedAccountScalarFieldEnum | ConnectedAccountScalarFieldEnum[]
  }

  /**
   * ConnectedAccount create
   */
  export type ConnectedAccountCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * The data needed to create a ConnectedAccount.
     */
    data: XOR<ConnectedAccountCreateInput, ConnectedAccountUncheckedCreateInput>
  }

  /**
   * ConnectedAccount createMany
   */
  export type ConnectedAccountCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ConnectedAccounts.
     */
    data: ConnectedAccountCreateManyInput | ConnectedAccountCreateManyInput[]
  }

  /**
   * ConnectedAccount createManyAndReturn
   */
  export type ConnectedAccountCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ConnectedAccounts.
     */
    data: ConnectedAccountCreateManyInput | ConnectedAccountCreateManyInput[]
  }

  /**
   * ConnectedAccount update
   */
  export type ConnectedAccountUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * The data needed to update a ConnectedAccount.
     */
    data: XOR<ConnectedAccountUpdateInput, ConnectedAccountUncheckedUpdateInput>
    /**
     * Choose, which ConnectedAccount to update.
     */
    where: ConnectedAccountWhereUniqueInput
  }

  /**
   * ConnectedAccount updateMany
   */
  export type ConnectedAccountUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ConnectedAccounts.
     */
    data: XOR<ConnectedAccountUpdateManyMutationInput, ConnectedAccountUncheckedUpdateManyInput>
    /**
     * Filter which ConnectedAccounts to update
     */
    where?: ConnectedAccountWhereInput
  }

  /**
   * ConnectedAccount upsert
   */
  export type ConnectedAccountUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * The filter to search for the ConnectedAccount to update in case it exists.
     */
    where: ConnectedAccountWhereUniqueInput
    /**
     * In case the ConnectedAccount found by the `where` argument doesn't exist, create a new ConnectedAccount with this data.
     */
    create: XOR<ConnectedAccountCreateInput, ConnectedAccountUncheckedCreateInput>
    /**
     * In case the ConnectedAccount was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConnectedAccountUpdateInput, ConnectedAccountUncheckedUpdateInput>
  }

  /**
   * ConnectedAccount delete
   */
  export type ConnectedAccountDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    /**
     * Filter which ConnectedAccount to delete.
     */
    where: ConnectedAccountWhereUniqueInput
  }

  /**
   * ConnectedAccount deleteMany
   */
  export type ConnectedAccountDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConnectedAccounts to delete
     */
    where?: ConnectedAccountWhereInput
  }

  /**
   * ConnectedAccount.oauthToken
   */
  export type ConnectedAccount$oauthTokenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    where?: OAuthTokenWhereInput
  }

  /**
   * ConnectedAccount.syncState
   */
  export type ConnectedAccount$syncStateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    where?: SyncStateWhereInput
  }

  /**
   * ConnectedAccount.approvals
   */
  export type ConnectedAccount$approvalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    where?: ApprovalWhereInput
    orderBy?: ApprovalOrderByWithRelationInput | ApprovalOrderByWithRelationInput[]
    cursor?: ApprovalWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ApprovalScalarFieldEnum | ApprovalScalarFieldEnum[]
  }

  /**
   * ConnectedAccount.auditLogs
   */
  export type ConnectedAccount$auditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    cursor?: AuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * ConnectedAccount without action
   */
  export type ConnectedAccountDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
  }


  /**
   * Model OAuthToken
   */

  export type AggregateOAuthToken = {
    _count: OAuthTokenCountAggregateOutputType | null
    _avg: OAuthTokenAvgAggregateOutputType | null
    _sum: OAuthTokenSumAggregateOutputType | null
    _min: OAuthTokenMinAggregateOutputType | null
    _max: OAuthTokenMaxAggregateOutputType | null
  }

  export type OAuthTokenAvgAggregateOutputType = {
    keyVersion: number | null
  }

  export type OAuthTokenSumAggregateOutputType = {
    keyVersion: number | null
  }

  export type OAuthTokenMinAggregateOutputType = {
    id: string | null
    accountId: string | null
    accessTokenEnc: string | null
    refreshTokenEnc: string | null
    keyVersion: number | null
    encryptionKeyId: string | null
    accessTokenExpiresAt: Date | null
    tokenType: string | null
    scope: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OAuthTokenMaxAggregateOutputType = {
    id: string | null
    accountId: string | null
    accessTokenEnc: string | null
    refreshTokenEnc: string | null
    keyVersion: number | null
    encryptionKeyId: string | null
    accessTokenExpiresAt: Date | null
    tokenType: string | null
    scope: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OAuthTokenCountAggregateOutputType = {
    id: number
    accountId: number
    accessTokenEnc: number
    refreshTokenEnc: number
    keyVersion: number
    encryptionKeyId: number
    accessTokenExpiresAt: number
    tokenType: number
    scope: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OAuthTokenAvgAggregateInputType = {
    keyVersion?: true
  }

  export type OAuthTokenSumAggregateInputType = {
    keyVersion?: true
  }

  export type OAuthTokenMinAggregateInputType = {
    id?: true
    accountId?: true
    accessTokenEnc?: true
    refreshTokenEnc?: true
    keyVersion?: true
    encryptionKeyId?: true
    accessTokenExpiresAt?: true
    tokenType?: true
    scope?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OAuthTokenMaxAggregateInputType = {
    id?: true
    accountId?: true
    accessTokenEnc?: true
    refreshTokenEnc?: true
    keyVersion?: true
    encryptionKeyId?: true
    accessTokenExpiresAt?: true
    tokenType?: true
    scope?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OAuthTokenCountAggregateInputType = {
    id?: true
    accountId?: true
    accessTokenEnc?: true
    refreshTokenEnc?: true
    keyVersion?: true
    encryptionKeyId?: true
    accessTokenExpiresAt?: true
    tokenType?: true
    scope?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OAuthTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OAuthToken to aggregate.
     */
    where?: OAuthTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OAuthTokens to fetch.
     */
    orderBy?: OAuthTokenOrderByWithRelationInput | OAuthTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OAuthTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OAuthTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OAuthTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned OAuthTokens
    **/
    _count?: true | OAuthTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OAuthTokenAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OAuthTokenSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OAuthTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OAuthTokenMaxAggregateInputType
  }

  export type GetOAuthTokenAggregateType<T extends OAuthTokenAggregateArgs> = {
        [P in keyof T & keyof AggregateOAuthToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOAuthToken[P]>
      : GetScalarType<T[P], AggregateOAuthToken[P]>
  }




  export type OAuthTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OAuthTokenWhereInput
    orderBy?: OAuthTokenOrderByWithAggregationInput | OAuthTokenOrderByWithAggregationInput[]
    by: OAuthTokenScalarFieldEnum[] | OAuthTokenScalarFieldEnum
    having?: OAuthTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OAuthTokenCountAggregateInputType | true
    _avg?: OAuthTokenAvgAggregateInputType
    _sum?: OAuthTokenSumAggregateInputType
    _min?: OAuthTokenMinAggregateInputType
    _max?: OAuthTokenMaxAggregateInputType
  }

  export type OAuthTokenGroupByOutputType = {
    id: string
    accountId: string
    accessTokenEnc: string
    refreshTokenEnc: string
    keyVersion: number
    encryptionKeyId: string
    accessTokenExpiresAt: Date
    tokenType: string
    scope: string
    createdAt: Date
    updatedAt: Date
    _count: OAuthTokenCountAggregateOutputType | null
    _avg: OAuthTokenAvgAggregateOutputType | null
    _sum: OAuthTokenSumAggregateOutputType | null
    _min: OAuthTokenMinAggregateOutputType | null
    _max: OAuthTokenMaxAggregateOutputType | null
  }

  type GetOAuthTokenGroupByPayload<T extends OAuthTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OAuthTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OAuthTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OAuthTokenGroupByOutputType[P]>
            : GetScalarType<T[P], OAuthTokenGroupByOutputType[P]>
        }
      >
    >


  export type OAuthTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    accessTokenEnc?: boolean
    refreshTokenEnc?: boolean
    keyVersion?: boolean
    encryptionKeyId?: boolean
    accessTokenExpiresAt?: boolean
    tokenType?: boolean
    scope?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["oAuthToken"]>

  export type OAuthTokenSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    accessTokenEnc?: boolean
    refreshTokenEnc?: boolean
    keyVersion?: boolean
    encryptionKeyId?: boolean
    accessTokenExpiresAt?: boolean
    tokenType?: boolean
    scope?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["oAuthToken"]>

  export type OAuthTokenSelectScalar = {
    id?: boolean
    accountId?: boolean
    accessTokenEnc?: boolean
    refreshTokenEnc?: boolean
    keyVersion?: boolean
    encryptionKeyId?: boolean
    accessTokenExpiresAt?: boolean
    tokenType?: boolean
    scope?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OAuthTokenInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }
  export type OAuthTokenIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }

  export type $OAuthTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "OAuthToken"
    objects: {
      account: Prisma.$ConnectedAccountPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      accountId: string
      accessTokenEnc: string
      refreshTokenEnc: string
      keyVersion: number
      encryptionKeyId: string
      accessTokenExpiresAt: Date
      tokenType: string
      scope: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["oAuthToken"]>
    composites: {}
  }

  type OAuthTokenGetPayload<S extends boolean | null | undefined | OAuthTokenDefaultArgs> = $Result.GetResult<Prisma.$OAuthTokenPayload, S>

  type OAuthTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OAuthTokenFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OAuthTokenCountAggregateInputType | true
    }

  export interface OAuthTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['OAuthToken'], meta: { name: 'OAuthToken' } }
    /**
     * Find zero or one OAuthToken that matches the filter.
     * @param {OAuthTokenFindUniqueArgs} args - Arguments to find a OAuthToken
     * @example
     * // Get one OAuthToken
     * const oAuthToken = await prisma.oAuthToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends OAuthTokenFindUniqueArgs>(args: SelectSubset<T, OAuthTokenFindUniqueArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one OAuthToken that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {OAuthTokenFindUniqueOrThrowArgs} args - Arguments to find a OAuthToken
     * @example
     * // Get one OAuthToken
     * const oAuthToken = await prisma.oAuthToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends OAuthTokenFindUniqueOrThrowArgs>(args: SelectSubset<T, OAuthTokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first OAuthToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenFindFirstArgs} args - Arguments to find a OAuthToken
     * @example
     * // Get one OAuthToken
     * const oAuthToken = await prisma.oAuthToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends OAuthTokenFindFirstArgs>(args?: SelectSubset<T, OAuthTokenFindFirstArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first OAuthToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenFindFirstOrThrowArgs} args - Arguments to find a OAuthToken
     * @example
     * // Get one OAuthToken
     * const oAuthToken = await prisma.oAuthToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends OAuthTokenFindFirstOrThrowArgs>(args?: SelectSubset<T, OAuthTokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more OAuthTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all OAuthTokens
     * const oAuthTokens = await prisma.oAuthToken.findMany()
     * 
     * // Get first 10 OAuthTokens
     * const oAuthTokens = await prisma.oAuthToken.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const oAuthTokenWithIdOnly = await prisma.oAuthToken.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends OAuthTokenFindManyArgs>(args?: SelectSubset<T, OAuthTokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a OAuthToken.
     * @param {OAuthTokenCreateArgs} args - Arguments to create a OAuthToken.
     * @example
     * // Create one OAuthToken
     * const OAuthToken = await prisma.oAuthToken.create({
     *   data: {
     *     // ... data to create a OAuthToken
     *   }
     * })
     * 
     */
    create<T extends OAuthTokenCreateArgs>(args: SelectSubset<T, OAuthTokenCreateArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many OAuthTokens.
     * @param {OAuthTokenCreateManyArgs} args - Arguments to create many OAuthTokens.
     * @example
     * // Create many OAuthTokens
     * const oAuthToken = await prisma.oAuthToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends OAuthTokenCreateManyArgs>(args?: SelectSubset<T, OAuthTokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many OAuthTokens and returns the data saved in the database.
     * @param {OAuthTokenCreateManyAndReturnArgs} args - Arguments to create many OAuthTokens.
     * @example
     * // Create many OAuthTokens
     * const oAuthToken = await prisma.oAuthToken.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many OAuthTokens and only return the `id`
     * const oAuthTokenWithIdOnly = await prisma.oAuthToken.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends OAuthTokenCreateManyAndReturnArgs>(args?: SelectSubset<T, OAuthTokenCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a OAuthToken.
     * @param {OAuthTokenDeleteArgs} args - Arguments to delete one OAuthToken.
     * @example
     * // Delete one OAuthToken
     * const OAuthToken = await prisma.oAuthToken.delete({
     *   where: {
     *     // ... filter to delete one OAuthToken
     *   }
     * })
     * 
     */
    delete<T extends OAuthTokenDeleteArgs>(args: SelectSubset<T, OAuthTokenDeleteArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one OAuthToken.
     * @param {OAuthTokenUpdateArgs} args - Arguments to update one OAuthToken.
     * @example
     * // Update one OAuthToken
     * const oAuthToken = await prisma.oAuthToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends OAuthTokenUpdateArgs>(args: SelectSubset<T, OAuthTokenUpdateArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more OAuthTokens.
     * @param {OAuthTokenDeleteManyArgs} args - Arguments to filter OAuthTokens to delete.
     * @example
     * // Delete a few OAuthTokens
     * const { count } = await prisma.oAuthToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends OAuthTokenDeleteManyArgs>(args?: SelectSubset<T, OAuthTokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more OAuthTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many OAuthTokens
     * const oAuthToken = await prisma.oAuthToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends OAuthTokenUpdateManyArgs>(args: SelectSubset<T, OAuthTokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one OAuthToken.
     * @param {OAuthTokenUpsertArgs} args - Arguments to update or create a OAuthToken.
     * @example
     * // Update or create a OAuthToken
     * const oAuthToken = await prisma.oAuthToken.upsert({
     *   create: {
     *     // ... data to create a OAuthToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the OAuthToken we want to update
     *   }
     * })
     */
    upsert<T extends OAuthTokenUpsertArgs>(args: SelectSubset<T, OAuthTokenUpsertArgs<ExtArgs>>): Prisma__OAuthTokenClient<$Result.GetResult<Prisma.$OAuthTokenPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of OAuthTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenCountArgs} args - Arguments to filter OAuthTokens to count.
     * @example
     * // Count the number of OAuthTokens
     * const count = await prisma.oAuthToken.count({
     *   where: {
     *     // ... the filter for the OAuthTokens we want to count
     *   }
     * })
    **/
    count<T extends OAuthTokenCountArgs>(
      args?: Subset<T, OAuthTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OAuthTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a OAuthToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OAuthTokenAggregateArgs>(args: Subset<T, OAuthTokenAggregateArgs>): Prisma.PrismaPromise<GetOAuthTokenAggregateType<T>>

    /**
     * Group by OAuthToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OAuthTokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OAuthTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OAuthTokenGroupByArgs['orderBy'] }
        : { orderBy?: OAuthTokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OAuthTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOAuthTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the OAuthToken model
   */
  readonly fields: OAuthTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for OAuthToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OAuthTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    account<T extends ConnectedAccountDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccountDefaultArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the OAuthToken model
   */ 
  interface OAuthTokenFieldRefs {
    readonly id: FieldRef<"OAuthToken", 'String'>
    readonly accountId: FieldRef<"OAuthToken", 'String'>
    readonly accessTokenEnc: FieldRef<"OAuthToken", 'String'>
    readonly refreshTokenEnc: FieldRef<"OAuthToken", 'String'>
    readonly keyVersion: FieldRef<"OAuthToken", 'Int'>
    readonly encryptionKeyId: FieldRef<"OAuthToken", 'String'>
    readonly accessTokenExpiresAt: FieldRef<"OAuthToken", 'DateTime'>
    readonly tokenType: FieldRef<"OAuthToken", 'String'>
    readonly scope: FieldRef<"OAuthToken", 'String'>
    readonly createdAt: FieldRef<"OAuthToken", 'DateTime'>
    readonly updatedAt: FieldRef<"OAuthToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * OAuthToken findUnique
   */
  export type OAuthTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * Filter, which OAuthToken to fetch.
     */
    where: OAuthTokenWhereUniqueInput
  }

  /**
   * OAuthToken findUniqueOrThrow
   */
  export type OAuthTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * Filter, which OAuthToken to fetch.
     */
    where: OAuthTokenWhereUniqueInput
  }

  /**
   * OAuthToken findFirst
   */
  export type OAuthTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * Filter, which OAuthToken to fetch.
     */
    where?: OAuthTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OAuthTokens to fetch.
     */
    orderBy?: OAuthTokenOrderByWithRelationInput | OAuthTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OAuthTokens.
     */
    cursor?: OAuthTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OAuthTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OAuthTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OAuthTokens.
     */
    distinct?: OAuthTokenScalarFieldEnum | OAuthTokenScalarFieldEnum[]
  }

  /**
   * OAuthToken findFirstOrThrow
   */
  export type OAuthTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * Filter, which OAuthToken to fetch.
     */
    where?: OAuthTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OAuthTokens to fetch.
     */
    orderBy?: OAuthTokenOrderByWithRelationInput | OAuthTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for OAuthTokens.
     */
    cursor?: OAuthTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OAuthTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OAuthTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of OAuthTokens.
     */
    distinct?: OAuthTokenScalarFieldEnum | OAuthTokenScalarFieldEnum[]
  }

  /**
   * OAuthToken findMany
   */
  export type OAuthTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * Filter, which OAuthTokens to fetch.
     */
    where?: OAuthTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of OAuthTokens to fetch.
     */
    orderBy?: OAuthTokenOrderByWithRelationInput | OAuthTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing OAuthTokens.
     */
    cursor?: OAuthTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` OAuthTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` OAuthTokens.
     */
    skip?: number
    distinct?: OAuthTokenScalarFieldEnum | OAuthTokenScalarFieldEnum[]
  }

  /**
   * OAuthToken create
   */
  export type OAuthTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * The data needed to create a OAuthToken.
     */
    data: XOR<OAuthTokenCreateInput, OAuthTokenUncheckedCreateInput>
  }

  /**
   * OAuthToken createMany
   */
  export type OAuthTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many OAuthTokens.
     */
    data: OAuthTokenCreateManyInput | OAuthTokenCreateManyInput[]
  }

  /**
   * OAuthToken createManyAndReturn
   */
  export type OAuthTokenCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many OAuthTokens.
     */
    data: OAuthTokenCreateManyInput | OAuthTokenCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * OAuthToken update
   */
  export type OAuthTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * The data needed to update a OAuthToken.
     */
    data: XOR<OAuthTokenUpdateInput, OAuthTokenUncheckedUpdateInput>
    /**
     * Choose, which OAuthToken to update.
     */
    where: OAuthTokenWhereUniqueInput
  }

  /**
   * OAuthToken updateMany
   */
  export type OAuthTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update OAuthTokens.
     */
    data: XOR<OAuthTokenUpdateManyMutationInput, OAuthTokenUncheckedUpdateManyInput>
    /**
     * Filter which OAuthTokens to update
     */
    where?: OAuthTokenWhereInput
  }

  /**
   * OAuthToken upsert
   */
  export type OAuthTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * The filter to search for the OAuthToken to update in case it exists.
     */
    where: OAuthTokenWhereUniqueInput
    /**
     * In case the OAuthToken found by the `where` argument doesn't exist, create a new OAuthToken with this data.
     */
    create: XOR<OAuthTokenCreateInput, OAuthTokenUncheckedCreateInput>
    /**
     * In case the OAuthToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OAuthTokenUpdateInput, OAuthTokenUncheckedUpdateInput>
  }

  /**
   * OAuthToken delete
   */
  export type OAuthTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
    /**
     * Filter which OAuthToken to delete.
     */
    where: OAuthTokenWhereUniqueInput
  }

  /**
   * OAuthToken deleteMany
   */
  export type OAuthTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which OAuthTokens to delete
     */
    where?: OAuthTokenWhereInput
  }

  /**
   * OAuthToken without action
   */
  export type OAuthTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OAuthToken
     */
    select?: OAuthTokenSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: OAuthTokenInclude<ExtArgs> | null
  }


  /**
   * Model SyncState
   */

  export type AggregateSyncState = {
    _count: SyncStateCountAggregateOutputType | null
    _avg: SyncStateAvgAggregateOutputType | null
    _sum: SyncStateSumAggregateOutputType | null
    _min: SyncStateMinAggregateOutputType | null
    _max: SyncStateMaxAggregateOutputType | null
  }

  export type SyncStateAvgAggregateOutputType = {
    pollErrorCount: number | null
  }

  export type SyncStateSumAggregateOutputType = {
    pollErrorCount: number | null
  }

  export type SyncStateMinAggregateOutputType = {
    id: string | null
    accountId: string | null
    emailHistoryId: string | null
    calendarSyncToken: string | null
    gmailHistoryId: string | null
    gmailWatchExpiry: Date | null
    mailDeltaLink: string | null
    calendarDeltaLink: string | null
    googleCalendarSyncToken: string | null
    emailSubscriptionId: string | null
    mailSubscriptionId: string | null
    calendarSubscriptionId: string | null
    subscriptionExpiry: Date | null
    lastEmailSync: Date | null
    lastCalendarSync: Date | null
    emailSyncStatus: string | null
    calendarSyncStatus: string | null
    errorMessage: string | null
    usePolling: boolean | null
    lastPollAt: Date | null
    pollErrorCount: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SyncStateMaxAggregateOutputType = {
    id: string | null
    accountId: string | null
    emailHistoryId: string | null
    calendarSyncToken: string | null
    gmailHistoryId: string | null
    gmailWatchExpiry: Date | null
    mailDeltaLink: string | null
    calendarDeltaLink: string | null
    googleCalendarSyncToken: string | null
    emailSubscriptionId: string | null
    mailSubscriptionId: string | null
    calendarSubscriptionId: string | null
    subscriptionExpiry: Date | null
    lastEmailSync: Date | null
    lastCalendarSync: Date | null
    emailSyncStatus: string | null
    calendarSyncStatus: string | null
    errorMessage: string | null
    usePolling: boolean | null
    lastPollAt: Date | null
    pollErrorCount: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SyncStateCountAggregateOutputType = {
    id: number
    accountId: number
    emailHistoryId: number
    calendarSyncToken: number
    gmailHistoryId: number
    gmailWatchExpiry: number
    mailDeltaLink: number
    calendarDeltaLink: number
    googleCalendarSyncToken: number
    emailSubscriptionId: number
    mailSubscriptionId: number
    calendarSubscriptionId: number
    subscriptionExpiry: number
    lastEmailSync: number
    lastCalendarSync: number
    emailSyncStatus: number
    calendarSyncStatus: number
    errorMessage: number
    usePolling: number
    lastPollAt: number
    pollErrorCount: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SyncStateAvgAggregateInputType = {
    pollErrorCount?: true
  }

  export type SyncStateSumAggregateInputType = {
    pollErrorCount?: true
  }

  export type SyncStateMinAggregateInputType = {
    id?: true
    accountId?: true
    emailHistoryId?: true
    calendarSyncToken?: true
    gmailHistoryId?: true
    gmailWatchExpiry?: true
    mailDeltaLink?: true
    calendarDeltaLink?: true
    googleCalendarSyncToken?: true
    emailSubscriptionId?: true
    mailSubscriptionId?: true
    calendarSubscriptionId?: true
    subscriptionExpiry?: true
    lastEmailSync?: true
    lastCalendarSync?: true
    emailSyncStatus?: true
    calendarSyncStatus?: true
    errorMessage?: true
    usePolling?: true
    lastPollAt?: true
    pollErrorCount?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SyncStateMaxAggregateInputType = {
    id?: true
    accountId?: true
    emailHistoryId?: true
    calendarSyncToken?: true
    gmailHistoryId?: true
    gmailWatchExpiry?: true
    mailDeltaLink?: true
    calendarDeltaLink?: true
    googleCalendarSyncToken?: true
    emailSubscriptionId?: true
    mailSubscriptionId?: true
    calendarSubscriptionId?: true
    subscriptionExpiry?: true
    lastEmailSync?: true
    lastCalendarSync?: true
    emailSyncStatus?: true
    calendarSyncStatus?: true
    errorMessage?: true
    usePolling?: true
    lastPollAt?: true
    pollErrorCount?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SyncStateCountAggregateInputType = {
    id?: true
    accountId?: true
    emailHistoryId?: true
    calendarSyncToken?: true
    gmailHistoryId?: true
    gmailWatchExpiry?: true
    mailDeltaLink?: true
    calendarDeltaLink?: true
    googleCalendarSyncToken?: true
    emailSubscriptionId?: true
    mailSubscriptionId?: true
    calendarSubscriptionId?: true
    subscriptionExpiry?: true
    lastEmailSync?: true
    lastCalendarSync?: true
    emailSyncStatus?: true
    calendarSyncStatus?: true
    errorMessage?: true
    usePolling?: true
    lastPollAt?: true
    pollErrorCount?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SyncStateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SyncState to aggregate.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SyncStates
    **/
    _count?: true | SyncStateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SyncStateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SyncStateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SyncStateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SyncStateMaxAggregateInputType
  }

  export type GetSyncStateAggregateType<T extends SyncStateAggregateArgs> = {
        [P in keyof T & keyof AggregateSyncState]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSyncState[P]>
      : GetScalarType<T[P], AggregateSyncState[P]>
  }




  export type SyncStateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SyncStateWhereInput
    orderBy?: SyncStateOrderByWithAggregationInput | SyncStateOrderByWithAggregationInput[]
    by: SyncStateScalarFieldEnum[] | SyncStateScalarFieldEnum
    having?: SyncStateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SyncStateCountAggregateInputType | true
    _avg?: SyncStateAvgAggregateInputType
    _sum?: SyncStateSumAggregateInputType
    _min?: SyncStateMinAggregateInputType
    _max?: SyncStateMaxAggregateInputType
  }

  export type SyncStateGroupByOutputType = {
    id: string
    accountId: string
    emailHistoryId: string | null
    calendarSyncToken: string | null
    gmailHistoryId: string | null
    gmailWatchExpiry: Date | null
    mailDeltaLink: string | null
    calendarDeltaLink: string | null
    googleCalendarSyncToken: string | null
    emailSubscriptionId: string | null
    mailSubscriptionId: string | null
    calendarSubscriptionId: string | null
    subscriptionExpiry: Date | null
    lastEmailSync: Date | null
    lastCalendarSync: Date | null
    emailSyncStatus: string | null
    calendarSyncStatus: string | null
    errorMessage: string | null
    usePolling: boolean
    lastPollAt: Date | null
    pollErrorCount: number
    createdAt: Date
    updatedAt: Date
    _count: SyncStateCountAggregateOutputType | null
    _avg: SyncStateAvgAggregateOutputType | null
    _sum: SyncStateSumAggregateOutputType | null
    _min: SyncStateMinAggregateOutputType | null
    _max: SyncStateMaxAggregateOutputType | null
  }

  type GetSyncStateGroupByPayload<T extends SyncStateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SyncStateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SyncStateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SyncStateGroupByOutputType[P]>
            : GetScalarType<T[P], SyncStateGroupByOutputType[P]>
        }
      >
    >


  export type SyncStateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    emailHistoryId?: boolean
    calendarSyncToken?: boolean
    gmailHistoryId?: boolean
    gmailWatchExpiry?: boolean
    mailDeltaLink?: boolean
    calendarDeltaLink?: boolean
    googleCalendarSyncToken?: boolean
    emailSubscriptionId?: boolean
    mailSubscriptionId?: boolean
    calendarSubscriptionId?: boolean
    subscriptionExpiry?: boolean
    lastEmailSync?: boolean
    lastCalendarSync?: boolean
    emailSyncStatus?: boolean
    calendarSyncStatus?: boolean
    errorMessage?: boolean
    usePolling?: boolean
    lastPollAt?: boolean
    pollErrorCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["syncState"]>

  export type SyncStateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    emailHistoryId?: boolean
    calendarSyncToken?: boolean
    gmailHistoryId?: boolean
    gmailWatchExpiry?: boolean
    mailDeltaLink?: boolean
    calendarDeltaLink?: boolean
    googleCalendarSyncToken?: boolean
    emailSubscriptionId?: boolean
    mailSubscriptionId?: boolean
    calendarSubscriptionId?: boolean
    subscriptionExpiry?: boolean
    lastEmailSync?: boolean
    lastCalendarSync?: boolean
    emailSyncStatus?: boolean
    calendarSyncStatus?: boolean
    errorMessage?: boolean
    usePolling?: boolean
    lastPollAt?: boolean
    pollErrorCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["syncState"]>

  export type SyncStateSelectScalar = {
    id?: boolean
    accountId?: boolean
    emailHistoryId?: boolean
    calendarSyncToken?: boolean
    gmailHistoryId?: boolean
    gmailWatchExpiry?: boolean
    mailDeltaLink?: boolean
    calendarDeltaLink?: boolean
    googleCalendarSyncToken?: boolean
    emailSubscriptionId?: boolean
    mailSubscriptionId?: boolean
    calendarSubscriptionId?: boolean
    subscriptionExpiry?: boolean
    lastEmailSync?: boolean
    lastCalendarSync?: boolean
    emailSyncStatus?: boolean
    calendarSyncStatus?: boolean
    errorMessage?: boolean
    usePolling?: boolean
    lastPollAt?: boolean
    pollErrorCount?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SyncStateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }
  export type SyncStateIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }

  export type $SyncStatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SyncState"
    objects: {
      account: Prisma.$ConnectedAccountPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      accountId: string
      emailHistoryId: string | null
      calendarSyncToken: string | null
      gmailHistoryId: string | null
      gmailWatchExpiry: Date | null
      mailDeltaLink: string | null
      calendarDeltaLink: string | null
      googleCalendarSyncToken: string | null
      emailSubscriptionId: string | null
      mailSubscriptionId: string | null
      calendarSubscriptionId: string | null
      subscriptionExpiry: Date | null
      lastEmailSync: Date | null
      lastCalendarSync: Date | null
      emailSyncStatus: string | null
      calendarSyncStatus: string | null
      errorMessage: string | null
      usePolling: boolean
      lastPollAt: Date | null
      pollErrorCount: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["syncState"]>
    composites: {}
  }

  type SyncStateGetPayload<S extends boolean | null | undefined | SyncStateDefaultArgs> = $Result.GetResult<Prisma.$SyncStatePayload, S>

  type SyncStateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SyncStateFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SyncStateCountAggregateInputType | true
    }

  export interface SyncStateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SyncState'], meta: { name: 'SyncState' } }
    /**
     * Find zero or one SyncState that matches the filter.
     * @param {SyncStateFindUniqueArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SyncStateFindUniqueArgs>(args: SelectSubset<T, SyncStateFindUniqueArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SyncState that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SyncStateFindUniqueOrThrowArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SyncStateFindUniqueOrThrowArgs>(args: SelectSubset<T, SyncStateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SyncState that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindFirstArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SyncStateFindFirstArgs>(args?: SelectSubset<T, SyncStateFindFirstArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SyncState that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindFirstOrThrowArgs} args - Arguments to find a SyncState
     * @example
     * // Get one SyncState
     * const syncState = await prisma.syncState.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SyncStateFindFirstOrThrowArgs>(args?: SelectSubset<T, SyncStateFindFirstOrThrowArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SyncStates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SyncStates
     * const syncStates = await prisma.syncState.findMany()
     * 
     * // Get first 10 SyncStates
     * const syncStates = await prisma.syncState.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const syncStateWithIdOnly = await prisma.syncState.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SyncStateFindManyArgs>(args?: SelectSubset<T, SyncStateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SyncState.
     * @param {SyncStateCreateArgs} args - Arguments to create a SyncState.
     * @example
     * // Create one SyncState
     * const SyncState = await prisma.syncState.create({
     *   data: {
     *     // ... data to create a SyncState
     *   }
     * })
     * 
     */
    create<T extends SyncStateCreateArgs>(args: SelectSubset<T, SyncStateCreateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SyncStates.
     * @param {SyncStateCreateManyArgs} args - Arguments to create many SyncStates.
     * @example
     * // Create many SyncStates
     * const syncState = await prisma.syncState.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SyncStateCreateManyArgs>(args?: SelectSubset<T, SyncStateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SyncStates and returns the data saved in the database.
     * @param {SyncStateCreateManyAndReturnArgs} args - Arguments to create many SyncStates.
     * @example
     * // Create many SyncStates
     * const syncState = await prisma.syncState.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SyncStates and only return the `id`
     * const syncStateWithIdOnly = await prisma.syncState.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SyncStateCreateManyAndReturnArgs>(args?: SelectSubset<T, SyncStateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SyncState.
     * @param {SyncStateDeleteArgs} args - Arguments to delete one SyncState.
     * @example
     * // Delete one SyncState
     * const SyncState = await prisma.syncState.delete({
     *   where: {
     *     // ... filter to delete one SyncState
     *   }
     * })
     * 
     */
    delete<T extends SyncStateDeleteArgs>(args: SelectSubset<T, SyncStateDeleteArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SyncState.
     * @param {SyncStateUpdateArgs} args - Arguments to update one SyncState.
     * @example
     * // Update one SyncState
     * const syncState = await prisma.syncState.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SyncStateUpdateArgs>(args: SelectSubset<T, SyncStateUpdateArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SyncStates.
     * @param {SyncStateDeleteManyArgs} args - Arguments to filter SyncStates to delete.
     * @example
     * // Delete a few SyncStates
     * const { count } = await prisma.syncState.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SyncStateDeleteManyArgs>(args?: SelectSubset<T, SyncStateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SyncStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SyncStates
     * const syncState = await prisma.syncState.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SyncStateUpdateManyArgs>(args: SelectSubset<T, SyncStateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SyncState.
     * @param {SyncStateUpsertArgs} args - Arguments to update or create a SyncState.
     * @example
     * // Update or create a SyncState
     * const syncState = await prisma.syncState.upsert({
     *   create: {
     *     // ... data to create a SyncState
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SyncState we want to update
     *   }
     * })
     */
    upsert<T extends SyncStateUpsertArgs>(args: SelectSubset<T, SyncStateUpsertArgs<ExtArgs>>): Prisma__SyncStateClient<$Result.GetResult<Prisma.$SyncStatePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SyncStates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateCountArgs} args - Arguments to filter SyncStates to count.
     * @example
     * // Count the number of SyncStates
     * const count = await prisma.syncState.count({
     *   where: {
     *     // ... the filter for the SyncStates we want to count
     *   }
     * })
    **/
    count<T extends SyncStateCountArgs>(
      args?: Subset<T, SyncStateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SyncStateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SyncState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SyncStateAggregateArgs>(args: Subset<T, SyncStateAggregateArgs>): Prisma.PrismaPromise<GetSyncStateAggregateType<T>>

    /**
     * Group by SyncState.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SyncStateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SyncStateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SyncStateGroupByArgs['orderBy'] }
        : { orderBy?: SyncStateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SyncStateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSyncStateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SyncState model
   */
  readonly fields: SyncStateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SyncState.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SyncStateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    account<T extends ConnectedAccountDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccountDefaultArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SyncState model
   */ 
  interface SyncStateFieldRefs {
    readonly id: FieldRef<"SyncState", 'String'>
    readonly accountId: FieldRef<"SyncState", 'String'>
    readonly emailHistoryId: FieldRef<"SyncState", 'String'>
    readonly calendarSyncToken: FieldRef<"SyncState", 'String'>
    readonly gmailHistoryId: FieldRef<"SyncState", 'String'>
    readonly gmailWatchExpiry: FieldRef<"SyncState", 'DateTime'>
    readonly mailDeltaLink: FieldRef<"SyncState", 'String'>
    readonly calendarDeltaLink: FieldRef<"SyncState", 'String'>
    readonly googleCalendarSyncToken: FieldRef<"SyncState", 'String'>
    readonly emailSubscriptionId: FieldRef<"SyncState", 'String'>
    readonly mailSubscriptionId: FieldRef<"SyncState", 'String'>
    readonly calendarSubscriptionId: FieldRef<"SyncState", 'String'>
    readonly subscriptionExpiry: FieldRef<"SyncState", 'DateTime'>
    readonly lastEmailSync: FieldRef<"SyncState", 'DateTime'>
    readonly lastCalendarSync: FieldRef<"SyncState", 'DateTime'>
    readonly emailSyncStatus: FieldRef<"SyncState", 'String'>
    readonly calendarSyncStatus: FieldRef<"SyncState", 'String'>
    readonly errorMessage: FieldRef<"SyncState", 'String'>
    readonly usePolling: FieldRef<"SyncState", 'Boolean'>
    readonly lastPollAt: FieldRef<"SyncState", 'DateTime'>
    readonly pollErrorCount: FieldRef<"SyncState", 'Int'>
    readonly createdAt: FieldRef<"SyncState", 'DateTime'>
    readonly updatedAt: FieldRef<"SyncState", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SyncState findUnique
   */
  export type SyncStateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState findUniqueOrThrow
   */
  export type SyncStateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState findFirst
   */
  export type SyncStateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SyncStates.
     */
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState findFirstOrThrow
   */
  export type SyncStateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * Filter, which SyncState to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SyncStates.
     */
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState findMany
   */
  export type SyncStateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * Filter, which SyncStates to fetch.
     */
    where?: SyncStateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SyncStates to fetch.
     */
    orderBy?: SyncStateOrderByWithRelationInput | SyncStateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SyncStates.
     */
    cursor?: SyncStateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SyncStates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SyncStates.
     */
    skip?: number
    distinct?: SyncStateScalarFieldEnum | SyncStateScalarFieldEnum[]
  }

  /**
   * SyncState create
   */
  export type SyncStateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * The data needed to create a SyncState.
     */
    data: XOR<SyncStateCreateInput, SyncStateUncheckedCreateInput>
  }

  /**
   * SyncState createMany
   */
  export type SyncStateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SyncStates.
     */
    data: SyncStateCreateManyInput | SyncStateCreateManyInput[]
  }

  /**
   * SyncState createManyAndReturn
   */
  export type SyncStateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SyncStates.
     */
    data: SyncStateCreateManyInput | SyncStateCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SyncState update
   */
  export type SyncStateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * The data needed to update a SyncState.
     */
    data: XOR<SyncStateUpdateInput, SyncStateUncheckedUpdateInput>
    /**
     * Choose, which SyncState to update.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState updateMany
   */
  export type SyncStateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SyncStates.
     */
    data: XOR<SyncStateUpdateManyMutationInput, SyncStateUncheckedUpdateManyInput>
    /**
     * Filter which SyncStates to update
     */
    where?: SyncStateWhereInput
  }

  /**
   * SyncState upsert
   */
  export type SyncStateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * The filter to search for the SyncState to update in case it exists.
     */
    where: SyncStateWhereUniqueInput
    /**
     * In case the SyncState found by the `where` argument doesn't exist, create a new SyncState with this data.
     */
    create: XOR<SyncStateCreateInput, SyncStateUncheckedCreateInput>
    /**
     * In case the SyncState was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SyncStateUpdateInput, SyncStateUncheckedUpdateInput>
  }

  /**
   * SyncState delete
   */
  export type SyncStateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
    /**
     * Filter which SyncState to delete.
     */
    where: SyncStateWhereUniqueInput
  }

  /**
   * SyncState deleteMany
   */
  export type SyncStateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SyncStates to delete
     */
    where?: SyncStateWhereInput
  }

  /**
   * SyncState without action
   */
  export type SyncStateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SyncState
     */
    select?: SyncStateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SyncStateInclude<ExtArgs> | null
  }


  /**
   * Model Approval
   */

  export type AggregateApproval = {
    _count: ApprovalCountAggregateOutputType | null
    _min: ApprovalMinAggregateOutputType | null
    _max: ApprovalMaxAggregateOutputType | null
  }

  export type ApprovalMinAggregateOutputType = {
    id: string | null
    tenantId: string | null
    userId: string | null
    accountId: string | null
    actionType: string | null
    status: string | null
    actionPayload: string | null
    riskLevel: string | null
    riskReason: string | null
    requestedAt: Date | null
    expiresAt: Date | null
    decidedAt: Date | null
    decidedBy: string | null
    correlationId: string | null
    createdAt: Date | null
  }

  export type ApprovalMaxAggregateOutputType = {
    id: string | null
    tenantId: string | null
    userId: string | null
    accountId: string | null
    actionType: string | null
    status: string | null
    actionPayload: string | null
    riskLevel: string | null
    riskReason: string | null
    requestedAt: Date | null
    expiresAt: Date | null
    decidedAt: Date | null
    decidedBy: string | null
    correlationId: string | null
    createdAt: Date | null
  }

  export type ApprovalCountAggregateOutputType = {
    id: number
    tenantId: number
    userId: number
    accountId: number
    actionType: number
    status: number
    actionPayload: number
    riskLevel: number
    riskReason: number
    requestedAt: number
    expiresAt: number
    decidedAt: number
    decidedBy: number
    correlationId: number
    createdAt: number
    _all: number
  }


  export type ApprovalMinAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    accountId?: true
    actionType?: true
    status?: true
    actionPayload?: true
    riskLevel?: true
    riskReason?: true
    requestedAt?: true
    expiresAt?: true
    decidedAt?: true
    decidedBy?: true
    correlationId?: true
    createdAt?: true
  }

  export type ApprovalMaxAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    accountId?: true
    actionType?: true
    status?: true
    actionPayload?: true
    riskLevel?: true
    riskReason?: true
    requestedAt?: true
    expiresAt?: true
    decidedAt?: true
    decidedBy?: true
    correlationId?: true
    createdAt?: true
  }

  export type ApprovalCountAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    accountId?: true
    actionType?: true
    status?: true
    actionPayload?: true
    riskLevel?: true
    riskReason?: true
    requestedAt?: true
    expiresAt?: true
    decidedAt?: true
    decidedBy?: true
    correlationId?: true
    createdAt?: true
    _all?: true
  }

  export type ApprovalAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Approval to aggregate.
     */
    where?: ApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Approvals to fetch.
     */
    orderBy?: ApprovalOrderByWithRelationInput | ApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Approvals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Approvals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Approvals
    **/
    _count?: true | ApprovalCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ApprovalMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ApprovalMaxAggregateInputType
  }

  export type GetApprovalAggregateType<T extends ApprovalAggregateArgs> = {
        [P in keyof T & keyof AggregateApproval]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateApproval[P]>
      : GetScalarType<T[P], AggregateApproval[P]>
  }




  export type ApprovalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ApprovalWhereInput
    orderBy?: ApprovalOrderByWithAggregationInput | ApprovalOrderByWithAggregationInput[]
    by: ApprovalScalarFieldEnum[] | ApprovalScalarFieldEnum
    having?: ApprovalScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ApprovalCountAggregateInputType | true
    _min?: ApprovalMinAggregateInputType
    _max?: ApprovalMaxAggregateInputType
  }

  export type ApprovalGroupByOutputType = {
    id: string
    tenantId: string
    userId: string
    accountId: string
    actionType: string
    status: string
    actionPayload: string
    riskLevel: string
    riskReason: string | null
    requestedAt: Date
    expiresAt: Date
    decidedAt: Date | null
    decidedBy: string | null
    correlationId: string
    createdAt: Date
    _count: ApprovalCountAggregateOutputType | null
    _min: ApprovalMinAggregateOutputType | null
    _max: ApprovalMaxAggregateOutputType | null
  }

  type GetApprovalGroupByPayload<T extends ApprovalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ApprovalGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ApprovalGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ApprovalGroupByOutputType[P]>
            : GetScalarType<T[P], ApprovalGroupByOutputType[P]>
        }
      >
    >


  export type ApprovalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    accountId?: boolean
    actionType?: boolean
    status?: boolean
    actionPayload?: boolean
    riskLevel?: boolean
    riskReason?: boolean
    requestedAt?: boolean
    expiresAt?: boolean
    decidedAt?: boolean
    decidedBy?: boolean
    correlationId?: boolean
    createdAt?: boolean
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["approval"]>

  export type ApprovalSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    accountId?: boolean
    actionType?: boolean
    status?: boolean
    actionPayload?: boolean
    riskLevel?: boolean
    riskReason?: boolean
    requestedAt?: boolean
    expiresAt?: boolean
    decidedAt?: boolean
    decidedBy?: boolean
    correlationId?: boolean
    createdAt?: boolean
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["approval"]>

  export type ApprovalSelectScalar = {
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    accountId?: boolean
    actionType?: boolean
    status?: boolean
    actionPayload?: boolean
    riskLevel?: boolean
    riskReason?: boolean
    requestedAt?: boolean
    expiresAt?: boolean
    decidedAt?: boolean
    decidedBy?: boolean
    correlationId?: boolean
    createdAt?: boolean
  }

  export type ApprovalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }
  export type ApprovalIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | ConnectedAccountDefaultArgs<ExtArgs>
  }

  export type $ApprovalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Approval"
    objects: {
      account: Prisma.$ConnectedAccountPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      tenantId: string
      userId: string
      accountId: string
      actionType: string
      status: string
      actionPayload: string
      riskLevel: string
      riskReason: string | null
      requestedAt: Date
      expiresAt: Date
      decidedAt: Date | null
      decidedBy: string | null
      correlationId: string
      createdAt: Date
    }, ExtArgs["result"]["approval"]>
    composites: {}
  }

  type ApprovalGetPayload<S extends boolean | null | undefined | ApprovalDefaultArgs> = $Result.GetResult<Prisma.$ApprovalPayload, S>

  type ApprovalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ApprovalFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ApprovalCountAggregateInputType | true
    }

  export interface ApprovalDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Approval'], meta: { name: 'Approval' } }
    /**
     * Find zero or one Approval that matches the filter.
     * @param {ApprovalFindUniqueArgs} args - Arguments to find a Approval
     * @example
     * // Get one Approval
     * const approval = await prisma.approval.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ApprovalFindUniqueArgs>(args: SelectSubset<T, ApprovalFindUniqueArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Approval that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ApprovalFindUniqueOrThrowArgs} args - Arguments to find a Approval
     * @example
     * // Get one Approval
     * const approval = await prisma.approval.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ApprovalFindUniqueOrThrowArgs>(args: SelectSubset<T, ApprovalFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Approval that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalFindFirstArgs} args - Arguments to find a Approval
     * @example
     * // Get one Approval
     * const approval = await prisma.approval.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ApprovalFindFirstArgs>(args?: SelectSubset<T, ApprovalFindFirstArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Approval that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalFindFirstOrThrowArgs} args - Arguments to find a Approval
     * @example
     * // Get one Approval
     * const approval = await prisma.approval.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ApprovalFindFirstOrThrowArgs>(args?: SelectSubset<T, ApprovalFindFirstOrThrowArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Approvals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Approvals
     * const approvals = await prisma.approval.findMany()
     * 
     * // Get first 10 Approvals
     * const approvals = await prisma.approval.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const approvalWithIdOnly = await prisma.approval.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ApprovalFindManyArgs>(args?: SelectSubset<T, ApprovalFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Approval.
     * @param {ApprovalCreateArgs} args - Arguments to create a Approval.
     * @example
     * // Create one Approval
     * const Approval = await prisma.approval.create({
     *   data: {
     *     // ... data to create a Approval
     *   }
     * })
     * 
     */
    create<T extends ApprovalCreateArgs>(args: SelectSubset<T, ApprovalCreateArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Approvals.
     * @param {ApprovalCreateManyArgs} args - Arguments to create many Approvals.
     * @example
     * // Create many Approvals
     * const approval = await prisma.approval.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ApprovalCreateManyArgs>(args?: SelectSubset<T, ApprovalCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Approvals and returns the data saved in the database.
     * @param {ApprovalCreateManyAndReturnArgs} args - Arguments to create many Approvals.
     * @example
     * // Create many Approvals
     * const approval = await prisma.approval.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Approvals and only return the `id`
     * const approvalWithIdOnly = await prisma.approval.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ApprovalCreateManyAndReturnArgs>(args?: SelectSubset<T, ApprovalCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Approval.
     * @param {ApprovalDeleteArgs} args - Arguments to delete one Approval.
     * @example
     * // Delete one Approval
     * const Approval = await prisma.approval.delete({
     *   where: {
     *     // ... filter to delete one Approval
     *   }
     * })
     * 
     */
    delete<T extends ApprovalDeleteArgs>(args: SelectSubset<T, ApprovalDeleteArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Approval.
     * @param {ApprovalUpdateArgs} args - Arguments to update one Approval.
     * @example
     * // Update one Approval
     * const approval = await prisma.approval.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ApprovalUpdateArgs>(args: SelectSubset<T, ApprovalUpdateArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Approvals.
     * @param {ApprovalDeleteManyArgs} args - Arguments to filter Approvals to delete.
     * @example
     * // Delete a few Approvals
     * const { count } = await prisma.approval.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ApprovalDeleteManyArgs>(args?: SelectSubset<T, ApprovalDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Approvals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Approvals
     * const approval = await prisma.approval.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ApprovalUpdateManyArgs>(args: SelectSubset<T, ApprovalUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Approval.
     * @param {ApprovalUpsertArgs} args - Arguments to update or create a Approval.
     * @example
     * // Update or create a Approval
     * const approval = await prisma.approval.upsert({
     *   create: {
     *     // ... data to create a Approval
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Approval we want to update
     *   }
     * })
     */
    upsert<T extends ApprovalUpsertArgs>(args: SelectSubset<T, ApprovalUpsertArgs<ExtArgs>>): Prisma__ApprovalClient<$Result.GetResult<Prisma.$ApprovalPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Approvals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalCountArgs} args - Arguments to filter Approvals to count.
     * @example
     * // Count the number of Approvals
     * const count = await prisma.approval.count({
     *   where: {
     *     // ... the filter for the Approvals we want to count
     *   }
     * })
    **/
    count<T extends ApprovalCountArgs>(
      args?: Subset<T, ApprovalCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ApprovalCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Approval.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ApprovalAggregateArgs>(args: Subset<T, ApprovalAggregateArgs>): Prisma.PrismaPromise<GetApprovalAggregateType<T>>

    /**
     * Group by Approval.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ApprovalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ApprovalGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ApprovalGroupByArgs['orderBy'] }
        : { orderBy?: ApprovalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ApprovalGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetApprovalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Approval model
   */
  readonly fields: ApprovalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Approval.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ApprovalClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    account<T extends ConnectedAccountDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ConnectedAccountDefaultArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Approval model
   */ 
  interface ApprovalFieldRefs {
    readonly id: FieldRef<"Approval", 'String'>
    readonly tenantId: FieldRef<"Approval", 'String'>
    readonly userId: FieldRef<"Approval", 'String'>
    readonly accountId: FieldRef<"Approval", 'String'>
    readonly actionType: FieldRef<"Approval", 'String'>
    readonly status: FieldRef<"Approval", 'String'>
    readonly actionPayload: FieldRef<"Approval", 'String'>
    readonly riskLevel: FieldRef<"Approval", 'String'>
    readonly riskReason: FieldRef<"Approval", 'String'>
    readonly requestedAt: FieldRef<"Approval", 'DateTime'>
    readonly expiresAt: FieldRef<"Approval", 'DateTime'>
    readonly decidedAt: FieldRef<"Approval", 'DateTime'>
    readonly decidedBy: FieldRef<"Approval", 'String'>
    readonly correlationId: FieldRef<"Approval", 'String'>
    readonly createdAt: FieldRef<"Approval", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Approval findUnique
   */
  export type ApprovalFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * Filter, which Approval to fetch.
     */
    where: ApprovalWhereUniqueInput
  }

  /**
   * Approval findUniqueOrThrow
   */
  export type ApprovalFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * Filter, which Approval to fetch.
     */
    where: ApprovalWhereUniqueInput
  }

  /**
   * Approval findFirst
   */
  export type ApprovalFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * Filter, which Approval to fetch.
     */
    where?: ApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Approvals to fetch.
     */
    orderBy?: ApprovalOrderByWithRelationInput | ApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Approvals.
     */
    cursor?: ApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Approvals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Approvals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Approvals.
     */
    distinct?: ApprovalScalarFieldEnum | ApprovalScalarFieldEnum[]
  }

  /**
   * Approval findFirstOrThrow
   */
  export type ApprovalFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * Filter, which Approval to fetch.
     */
    where?: ApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Approvals to fetch.
     */
    orderBy?: ApprovalOrderByWithRelationInput | ApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Approvals.
     */
    cursor?: ApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Approvals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Approvals.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Approvals.
     */
    distinct?: ApprovalScalarFieldEnum | ApprovalScalarFieldEnum[]
  }

  /**
   * Approval findMany
   */
  export type ApprovalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * Filter, which Approvals to fetch.
     */
    where?: ApprovalWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Approvals to fetch.
     */
    orderBy?: ApprovalOrderByWithRelationInput | ApprovalOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Approvals.
     */
    cursor?: ApprovalWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Approvals from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Approvals.
     */
    skip?: number
    distinct?: ApprovalScalarFieldEnum | ApprovalScalarFieldEnum[]
  }

  /**
   * Approval create
   */
  export type ApprovalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * The data needed to create a Approval.
     */
    data: XOR<ApprovalCreateInput, ApprovalUncheckedCreateInput>
  }

  /**
   * Approval createMany
   */
  export type ApprovalCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Approvals.
     */
    data: ApprovalCreateManyInput | ApprovalCreateManyInput[]
  }

  /**
   * Approval createManyAndReturn
   */
  export type ApprovalCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Approvals.
     */
    data: ApprovalCreateManyInput | ApprovalCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Approval update
   */
  export type ApprovalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * The data needed to update a Approval.
     */
    data: XOR<ApprovalUpdateInput, ApprovalUncheckedUpdateInput>
    /**
     * Choose, which Approval to update.
     */
    where: ApprovalWhereUniqueInput
  }

  /**
   * Approval updateMany
   */
  export type ApprovalUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Approvals.
     */
    data: XOR<ApprovalUpdateManyMutationInput, ApprovalUncheckedUpdateManyInput>
    /**
     * Filter which Approvals to update
     */
    where?: ApprovalWhereInput
  }

  /**
   * Approval upsert
   */
  export type ApprovalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * The filter to search for the Approval to update in case it exists.
     */
    where: ApprovalWhereUniqueInput
    /**
     * In case the Approval found by the `where` argument doesn't exist, create a new Approval with this data.
     */
    create: XOR<ApprovalCreateInput, ApprovalUncheckedCreateInput>
    /**
     * In case the Approval was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ApprovalUpdateInput, ApprovalUncheckedUpdateInput>
  }

  /**
   * Approval delete
   */
  export type ApprovalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
    /**
     * Filter which Approval to delete.
     */
    where: ApprovalWhereUniqueInput
  }

  /**
   * Approval deleteMany
   */
  export type ApprovalDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Approvals to delete
     */
    where?: ApprovalWhereInput
  }

  /**
   * Approval without action
   */
  export type ApprovalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Approval
     */
    select?: ApprovalSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ApprovalInclude<ExtArgs> | null
  }


  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogAvgAggregateOutputType = {
    durationMs: number | null
  }

  export type AuditLogSumAggregateOutputType = {
    durationMs: number | null
  }

  export type AuditLogMinAggregateOutputType = {
    id: string | null
    tenantId: string | null
    userId: string | null
    accountId: string | null
    action: string | null
    resourceType: string | null
    resourceId: string | null
    correlationId: string | null
    ipAddress: string | null
    userAgent: string | null
    status: string | null
    errorCode: string | null
    metadata: string | null
    durationMs: number | null
    createdAt: Date | null
  }

  export type AuditLogMaxAggregateOutputType = {
    id: string | null
    tenantId: string | null
    userId: string | null
    accountId: string | null
    action: string | null
    resourceType: string | null
    resourceId: string | null
    correlationId: string | null
    ipAddress: string | null
    userAgent: string | null
    status: string | null
    errorCode: string | null
    metadata: string | null
    durationMs: number | null
    createdAt: Date | null
  }

  export type AuditLogCountAggregateOutputType = {
    id: number
    tenantId: number
    userId: number
    accountId: number
    action: number
    resourceType: number
    resourceId: number
    correlationId: number
    ipAddress: number
    userAgent: number
    status: number
    errorCode: number
    metadata: number
    durationMs: number
    createdAt: number
    _all: number
  }


  export type AuditLogAvgAggregateInputType = {
    durationMs?: true
  }

  export type AuditLogSumAggregateInputType = {
    durationMs?: true
  }

  export type AuditLogMinAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    accountId?: true
    action?: true
    resourceType?: true
    resourceId?: true
    correlationId?: true
    ipAddress?: true
    userAgent?: true
    status?: true
    errorCode?: true
    metadata?: true
    durationMs?: true
    createdAt?: true
  }

  export type AuditLogMaxAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    accountId?: true
    action?: true
    resourceType?: true
    resourceId?: true
    correlationId?: true
    ipAddress?: true
    userAgent?: true
    status?: true
    errorCode?: true
    metadata?: true
    durationMs?: true
    createdAt?: true
  }

  export type AuditLogCountAggregateInputType = {
    id?: true
    tenantId?: true
    userId?: true
    accountId?: true
    action?: true
    resourceType?: true
    resourceId?: true
    correlationId?: true
    ipAddress?: true
    userAgent?: true
    status?: true
    errorCode?: true
    metadata?: true
    durationMs?: true
    createdAt?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuditLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuditLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _avg?: AuditLogAvgAggregateInputType
    _sum?: AuditLogSumAggregateInputType
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    id: string
    tenantId: string
    userId: string
    accountId: string | null
    action: string
    resourceType: string
    resourceId: string | null
    correlationId: string
    ipAddress: string | null
    userAgent: string | null
    status: string
    errorCode: string | null
    metadata: string | null
    durationMs: number | null
    createdAt: Date
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    accountId?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    correlationId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    status?: boolean
    errorCode?: boolean
    metadata?: boolean
    durationMs?: boolean
    createdAt?: boolean
    account?: boolean | AuditLog$accountArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    accountId?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    correlationId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    status?: boolean
    errorCode?: boolean
    metadata?: boolean
    durationMs?: boolean
    createdAt?: boolean
    account?: boolean | AuditLog$accountArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>

  export type AuditLogSelectScalar = {
    id?: boolean
    tenantId?: boolean
    userId?: boolean
    accountId?: boolean
    action?: boolean
    resourceType?: boolean
    resourceId?: boolean
    correlationId?: boolean
    ipAddress?: boolean
    userAgent?: boolean
    status?: boolean
    errorCode?: boolean
    metadata?: boolean
    durationMs?: boolean
    createdAt?: boolean
  }

  export type AuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | AuditLog$accountArgs<ExtArgs>
  }
  export type AuditLogIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    account?: boolean | AuditLog$accountArgs<ExtArgs>
  }

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {
      account: Prisma.$ConnectedAccountPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      tenantId: string
      userId: string
      accountId: string | null
      action: string
      resourceType: string
      resourceId: string | null
      correlationId: string
      ipAddress: string | null
      userAgent: string | null
      status: string
      errorCode: string | null
      metadata: string | null
      durationMs: number | null
      createdAt: Date
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AuditLogs and returns the data saved in the database.
     * @param {AuditLogCreateManyAndReturnArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AuditLogs and only return the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AuditLogCreateManyAndReturnArgs>(args?: SelectSubset<T, AuditLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    account<T extends AuditLog$accountArgs<ExtArgs> = {}>(args?: Subset<T, AuditLog$accountArgs<ExtArgs>>): Prisma__ConnectedAccountClient<$Result.GetResult<Prisma.$ConnectedAccountPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditLog model
   */ 
  interface AuditLogFieldRefs {
    readonly id: FieldRef<"AuditLog", 'String'>
    readonly tenantId: FieldRef<"AuditLog", 'String'>
    readonly userId: FieldRef<"AuditLog", 'String'>
    readonly accountId: FieldRef<"AuditLog", 'String'>
    readonly action: FieldRef<"AuditLog", 'String'>
    readonly resourceType: FieldRef<"AuditLog", 'String'>
    readonly resourceId: FieldRef<"AuditLog", 'String'>
    readonly correlationId: FieldRef<"AuditLog", 'String'>
    readonly ipAddress: FieldRef<"AuditLog", 'String'>
    readonly userAgent: FieldRef<"AuditLog", 'String'>
    readonly status: FieldRef<"AuditLog", 'String'>
    readonly errorCode: FieldRef<"AuditLog", 'String'>
    readonly metadata: FieldRef<"AuditLog", 'String'>
    readonly durationMs: FieldRef<"AuditLog", 'Int'>
    readonly createdAt: FieldRef<"AuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
  }

  /**
   * AuditLog createManyAndReturn
   */
  export type AuditLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
  }

  /**
   * AuditLog.account
   */
  export type AuditLog$accountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectedAccount
     */
    select?: ConnectedAccountSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectedAccountInclude<ExtArgs> | null
    where?: ConnectedAccountWhereInput
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
  }


  /**
   * Model ProcessedEvent
   */

  export type AggregateProcessedEvent = {
    _count: ProcessedEventCountAggregateOutputType | null
    _min: ProcessedEventMinAggregateOutputType | null
    _max: ProcessedEventMaxAggregateOutputType | null
  }

  export type ProcessedEventMinAggregateOutputType = {
    id: string | null
    idempotencyKey: string | null
    eventId: string | null
    eventType: string | null
    accountId: string | null
    provider: string | null
    payload: string | null
    processedAt: Date | null
    expiresAt: Date | null
  }

  export type ProcessedEventMaxAggregateOutputType = {
    id: string | null
    idempotencyKey: string | null
    eventId: string | null
    eventType: string | null
    accountId: string | null
    provider: string | null
    payload: string | null
    processedAt: Date | null
    expiresAt: Date | null
  }

  export type ProcessedEventCountAggregateOutputType = {
    id: number
    idempotencyKey: number
    eventId: number
    eventType: number
    accountId: number
    provider: number
    payload: number
    processedAt: number
    expiresAt: number
    _all: number
  }


  export type ProcessedEventMinAggregateInputType = {
    id?: true
    idempotencyKey?: true
    eventId?: true
    eventType?: true
    accountId?: true
    provider?: true
    payload?: true
    processedAt?: true
    expiresAt?: true
  }

  export type ProcessedEventMaxAggregateInputType = {
    id?: true
    idempotencyKey?: true
    eventId?: true
    eventType?: true
    accountId?: true
    provider?: true
    payload?: true
    processedAt?: true
    expiresAt?: true
  }

  export type ProcessedEventCountAggregateInputType = {
    id?: true
    idempotencyKey?: true
    eventId?: true
    eventType?: true
    accountId?: true
    provider?: true
    payload?: true
    processedAt?: true
    expiresAt?: true
    _all?: true
  }

  export type ProcessedEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProcessedEvent to aggregate.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProcessedEvents
    **/
    _count?: true | ProcessedEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProcessedEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProcessedEventMaxAggregateInputType
  }

  export type GetProcessedEventAggregateType<T extends ProcessedEventAggregateArgs> = {
        [P in keyof T & keyof AggregateProcessedEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProcessedEvent[P]>
      : GetScalarType<T[P], AggregateProcessedEvent[P]>
  }




  export type ProcessedEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProcessedEventWhereInput
    orderBy?: ProcessedEventOrderByWithAggregationInput | ProcessedEventOrderByWithAggregationInput[]
    by: ProcessedEventScalarFieldEnum[] | ProcessedEventScalarFieldEnum
    having?: ProcessedEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProcessedEventCountAggregateInputType | true
    _min?: ProcessedEventMinAggregateInputType
    _max?: ProcessedEventMaxAggregateInputType
  }

  export type ProcessedEventGroupByOutputType = {
    id: string
    idempotencyKey: string
    eventId: string
    eventType: string
    accountId: string
    provider: string | null
    payload: string | null
    processedAt: Date
    expiresAt: Date
    _count: ProcessedEventCountAggregateOutputType | null
    _min: ProcessedEventMinAggregateOutputType | null
    _max: ProcessedEventMaxAggregateOutputType | null
  }

  type GetProcessedEventGroupByPayload<T extends ProcessedEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProcessedEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProcessedEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProcessedEventGroupByOutputType[P]>
            : GetScalarType<T[P], ProcessedEventGroupByOutputType[P]>
        }
      >
    >


  export type ProcessedEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    idempotencyKey?: boolean
    eventId?: boolean
    eventType?: boolean
    accountId?: boolean
    provider?: boolean
    payload?: boolean
    processedAt?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["processedEvent"]>

  export type ProcessedEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    idempotencyKey?: boolean
    eventId?: boolean
    eventType?: boolean
    accountId?: boolean
    provider?: boolean
    payload?: boolean
    processedAt?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["processedEvent"]>

  export type ProcessedEventSelectScalar = {
    id?: boolean
    idempotencyKey?: boolean
    eventId?: boolean
    eventType?: boolean
    accountId?: boolean
    provider?: boolean
    payload?: boolean
    processedAt?: boolean
    expiresAt?: boolean
  }


  export type $ProcessedEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProcessedEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      idempotencyKey: string
      eventId: string
      eventType: string
      accountId: string
      provider: string | null
      payload: string | null
      processedAt: Date
      expiresAt: Date
    }, ExtArgs["result"]["processedEvent"]>
    composites: {}
  }

  type ProcessedEventGetPayload<S extends boolean | null | undefined | ProcessedEventDefaultArgs> = $Result.GetResult<Prisma.$ProcessedEventPayload, S>

  type ProcessedEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ProcessedEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ProcessedEventCountAggregateInputType | true
    }

  export interface ProcessedEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProcessedEvent'], meta: { name: 'ProcessedEvent' } }
    /**
     * Find zero or one ProcessedEvent that matches the filter.
     * @param {ProcessedEventFindUniqueArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProcessedEventFindUniqueArgs>(args: SelectSubset<T, ProcessedEventFindUniqueArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ProcessedEvent that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ProcessedEventFindUniqueOrThrowArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProcessedEventFindUniqueOrThrowArgs>(args: SelectSubset<T, ProcessedEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ProcessedEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventFindFirstArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProcessedEventFindFirstArgs>(args?: SelectSubset<T, ProcessedEventFindFirstArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ProcessedEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventFindFirstOrThrowArgs} args - Arguments to find a ProcessedEvent
     * @example
     * // Get one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProcessedEventFindFirstOrThrowArgs>(args?: SelectSubset<T, ProcessedEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ProcessedEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProcessedEvents
     * const processedEvents = await prisma.processedEvent.findMany()
     * 
     * // Get first 10 ProcessedEvents
     * const processedEvents = await prisma.processedEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const processedEventWithIdOnly = await prisma.processedEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProcessedEventFindManyArgs>(args?: SelectSubset<T, ProcessedEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ProcessedEvent.
     * @param {ProcessedEventCreateArgs} args - Arguments to create a ProcessedEvent.
     * @example
     * // Create one ProcessedEvent
     * const ProcessedEvent = await prisma.processedEvent.create({
     *   data: {
     *     // ... data to create a ProcessedEvent
     *   }
     * })
     * 
     */
    create<T extends ProcessedEventCreateArgs>(args: SelectSubset<T, ProcessedEventCreateArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ProcessedEvents.
     * @param {ProcessedEventCreateManyArgs} args - Arguments to create many ProcessedEvents.
     * @example
     * // Create many ProcessedEvents
     * const processedEvent = await prisma.processedEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProcessedEventCreateManyArgs>(args?: SelectSubset<T, ProcessedEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProcessedEvents and returns the data saved in the database.
     * @param {ProcessedEventCreateManyAndReturnArgs} args - Arguments to create many ProcessedEvents.
     * @example
     * // Create many ProcessedEvents
     * const processedEvent = await prisma.processedEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProcessedEvents and only return the `id`
     * const processedEventWithIdOnly = await prisma.processedEvent.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProcessedEventCreateManyAndReturnArgs>(args?: SelectSubset<T, ProcessedEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ProcessedEvent.
     * @param {ProcessedEventDeleteArgs} args - Arguments to delete one ProcessedEvent.
     * @example
     * // Delete one ProcessedEvent
     * const ProcessedEvent = await prisma.processedEvent.delete({
     *   where: {
     *     // ... filter to delete one ProcessedEvent
     *   }
     * })
     * 
     */
    delete<T extends ProcessedEventDeleteArgs>(args: SelectSubset<T, ProcessedEventDeleteArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ProcessedEvent.
     * @param {ProcessedEventUpdateArgs} args - Arguments to update one ProcessedEvent.
     * @example
     * // Update one ProcessedEvent
     * const processedEvent = await prisma.processedEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProcessedEventUpdateArgs>(args: SelectSubset<T, ProcessedEventUpdateArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ProcessedEvents.
     * @param {ProcessedEventDeleteManyArgs} args - Arguments to filter ProcessedEvents to delete.
     * @example
     * // Delete a few ProcessedEvents
     * const { count } = await prisma.processedEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProcessedEventDeleteManyArgs>(args?: SelectSubset<T, ProcessedEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProcessedEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProcessedEvents
     * const processedEvent = await prisma.processedEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProcessedEventUpdateManyArgs>(args: SelectSubset<T, ProcessedEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ProcessedEvent.
     * @param {ProcessedEventUpsertArgs} args - Arguments to update or create a ProcessedEvent.
     * @example
     * // Update or create a ProcessedEvent
     * const processedEvent = await prisma.processedEvent.upsert({
     *   create: {
     *     // ... data to create a ProcessedEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProcessedEvent we want to update
     *   }
     * })
     */
    upsert<T extends ProcessedEventUpsertArgs>(args: SelectSubset<T, ProcessedEventUpsertArgs<ExtArgs>>): Prisma__ProcessedEventClient<$Result.GetResult<Prisma.$ProcessedEventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ProcessedEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventCountArgs} args - Arguments to filter ProcessedEvents to count.
     * @example
     * // Count the number of ProcessedEvents
     * const count = await prisma.processedEvent.count({
     *   where: {
     *     // ... the filter for the ProcessedEvents we want to count
     *   }
     * })
    **/
    count<T extends ProcessedEventCountArgs>(
      args?: Subset<T, ProcessedEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProcessedEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProcessedEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProcessedEventAggregateArgs>(args: Subset<T, ProcessedEventAggregateArgs>): Prisma.PrismaPromise<GetProcessedEventAggregateType<T>>

    /**
     * Group by ProcessedEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProcessedEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProcessedEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProcessedEventGroupByArgs['orderBy'] }
        : { orderBy?: ProcessedEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProcessedEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProcessedEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProcessedEvent model
   */
  readonly fields: ProcessedEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProcessedEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProcessedEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProcessedEvent model
   */ 
  interface ProcessedEventFieldRefs {
    readonly id: FieldRef<"ProcessedEvent", 'String'>
    readonly idempotencyKey: FieldRef<"ProcessedEvent", 'String'>
    readonly eventId: FieldRef<"ProcessedEvent", 'String'>
    readonly eventType: FieldRef<"ProcessedEvent", 'String'>
    readonly accountId: FieldRef<"ProcessedEvent", 'String'>
    readonly provider: FieldRef<"ProcessedEvent", 'String'>
    readonly payload: FieldRef<"ProcessedEvent", 'String'>
    readonly processedAt: FieldRef<"ProcessedEvent", 'DateTime'>
    readonly expiresAt: FieldRef<"ProcessedEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProcessedEvent findUnique
   */
  export type ProcessedEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent findUniqueOrThrow
   */
  export type ProcessedEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent findFirst
   */
  export type ProcessedEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProcessedEvents.
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProcessedEvents.
     */
    distinct?: ProcessedEventScalarFieldEnum | ProcessedEventScalarFieldEnum[]
  }

  /**
   * ProcessedEvent findFirstOrThrow
   */
  export type ProcessedEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvent to fetch.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProcessedEvents.
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProcessedEvents.
     */
    distinct?: ProcessedEventScalarFieldEnum | ProcessedEventScalarFieldEnum[]
  }

  /**
   * ProcessedEvent findMany
   */
  export type ProcessedEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter, which ProcessedEvents to fetch.
     */
    where?: ProcessedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProcessedEvents to fetch.
     */
    orderBy?: ProcessedEventOrderByWithRelationInput | ProcessedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProcessedEvents.
     */
    cursor?: ProcessedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProcessedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProcessedEvents.
     */
    skip?: number
    distinct?: ProcessedEventScalarFieldEnum | ProcessedEventScalarFieldEnum[]
  }

  /**
   * ProcessedEvent create
   */
  export type ProcessedEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * The data needed to create a ProcessedEvent.
     */
    data: XOR<ProcessedEventCreateInput, ProcessedEventUncheckedCreateInput>
  }

  /**
   * ProcessedEvent createMany
   */
  export type ProcessedEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProcessedEvents.
     */
    data: ProcessedEventCreateManyInput | ProcessedEventCreateManyInput[]
  }

  /**
   * ProcessedEvent createManyAndReturn
   */
  export type ProcessedEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ProcessedEvents.
     */
    data: ProcessedEventCreateManyInput | ProcessedEventCreateManyInput[]
  }

  /**
   * ProcessedEvent update
   */
  export type ProcessedEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * The data needed to update a ProcessedEvent.
     */
    data: XOR<ProcessedEventUpdateInput, ProcessedEventUncheckedUpdateInput>
    /**
     * Choose, which ProcessedEvent to update.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent updateMany
   */
  export type ProcessedEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProcessedEvents.
     */
    data: XOR<ProcessedEventUpdateManyMutationInput, ProcessedEventUncheckedUpdateManyInput>
    /**
     * Filter which ProcessedEvents to update
     */
    where?: ProcessedEventWhereInput
  }

  /**
   * ProcessedEvent upsert
   */
  export type ProcessedEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * The filter to search for the ProcessedEvent to update in case it exists.
     */
    where: ProcessedEventWhereUniqueInput
    /**
     * In case the ProcessedEvent found by the `where` argument doesn't exist, create a new ProcessedEvent with this data.
     */
    create: XOR<ProcessedEventCreateInput, ProcessedEventUncheckedCreateInput>
    /**
     * In case the ProcessedEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProcessedEventUpdateInput, ProcessedEventUncheckedUpdateInput>
  }

  /**
   * ProcessedEvent delete
   */
  export type ProcessedEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
    /**
     * Filter which ProcessedEvent to delete.
     */
    where: ProcessedEventWhereUniqueInput
  }

  /**
   * ProcessedEvent deleteMany
   */
  export type ProcessedEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProcessedEvents to delete
     */
    where?: ProcessedEventWhereInput
  }

  /**
   * ProcessedEvent without action
   */
  export type ProcessedEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProcessedEvent
     */
    select?: ProcessedEventSelect<ExtArgs> | null
  }


  /**
   * Model EncryptionKey
   */

  export type AggregateEncryptionKey = {
    _count: EncryptionKeyCountAggregateOutputType | null
    _avg: EncryptionKeyAvgAggregateOutputType | null
    _sum: EncryptionKeySumAggregateOutputType | null
    _min: EncryptionKeyMinAggregateOutputType | null
    _max: EncryptionKeyMaxAggregateOutputType | null
  }

  export type EncryptionKeyAvgAggregateOutputType = {
    version: number | null
  }

  export type EncryptionKeySumAggregateOutputType = {
    version: number | null
  }

  export type EncryptionKeyMinAggregateOutputType = {
    id: string | null
    tenantId: string | null
    version: number | null
    keyEncrypted: string | null
    algorithm: string | null
    status: string | null
    createdAt: Date | null
    rotatedAt: Date | null
    expiresAt: Date | null
  }

  export type EncryptionKeyMaxAggregateOutputType = {
    id: string | null
    tenantId: string | null
    version: number | null
    keyEncrypted: string | null
    algorithm: string | null
    status: string | null
    createdAt: Date | null
    rotatedAt: Date | null
    expiresAt: Date | null
  }

  export type EncryptionKeyCountAggregateOutputType = {
    id: number
    tenantId: number
    version: number
    keyEncrypted: number
    algorithm: number
    status: number
    createdAt: number
    rotatedAt: number
    expiresAt: number
    _all: number
  }


  export type EncryptionKeyAvgAggregateInputType = {
    version?: true
  }

  export type EncryptionKeySumAggregateInputType = {
    version?: true
  }

  export type EncryptionKeyMinAggregateInputType = {
    id?: true
    tenantId?: true
    version?: true
    keyEncrypted?: true
    algorithm?: true
    status?: true
    createdAt?: true
    rotatedAt?: true
    expiresAt?: true
  }

  export type EncryptionKeyMaxAggregateInputType = {
    id?: true
    tenantId?: true
    version?: true
    keyEncrypted?: true
    algorithm?: true
    status?: true
    createdAt?: true
    rotatedAt?: true
    expiresAt?: true
  }

  export type EncryptionKeyCountAggregateInputType = {
    id?: true
    tenantId?: true
    version?: true
    keyEncrypted?: true
    algorithm?: true
    status?: true
    createdAt?: true
    rotatedAt?: true
    expiresAt?: true
    _all?: true
  }

  export type EncryptionKeyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EncryptionKey to aggregate.
     */
    where?: EncryptionKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EncryptionKeys to fetch.
     */
    orderBy?: EncryptionKeyOrderByWithRelationInput | EncryptionKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EncryptionKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EncryptionKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EncryptionKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned EncryptionKeys
    **/
    _count?: true | EncryptionKeyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: EncryptionKeyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: EncryptionKeySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EncryptionKeyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EncryptionKeyMaxAggregateInputType
  }

  export type GetEncryptionKeyAggregateType<T extends EncryptionKeyAggregateArgs> = {
        [P in keyof T & keyof AggregateEncryptionKey]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEncryptionKey[P]>
      : GetScalarType<T[P], AggregateEncryptionKey[P]>
  }




  export type EncryptionKeyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: EncryptionKeyWhereInput
    orderBy?: EncryptionKeyOrderByWithAggregationInput | EncryptionKeyOrderByWithAggregationInput[]
    by: EncryptionKeyScalarFieldEnum[] | EncryptionKeyScalarFieldEnum
    having?: EncryptionKeyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EncryptionKeyCountAggregateInputType | true
    _avg?: EncryptionKeyAvgAggregateInputType
    _sum?: EncryptionKeySumAggregateInputType
    _min?: EncryptionKeyMinAggregateInputType
    _max?: EncryptionKeyMaxAggregateInputType
  }

  export type EncryptionKeyGroupByOutputType = {
    id: string
    tenantId: string
    version: number
    keyEncrypted: string
    algorithm: string
    status: string
    createdAt: Date
    rotatedAt: Date | null
    expiresAt: Date | null
    _count: EncryptionKeyCountAggregateOutputType | null
    _avg: EncryptionKeyAvgAggregateOutputType | null
    _sum: EncryptionKeySumAggregateOutputType | null
    _min: EncryptionKeyMinAggregateOutputType | null
    _max: EncryptionKeyMaxAggregateOutputType | null
  }

  type GetEncryptionKeyGroupByPayload<T extends EncryptionKeyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EncryptionKeyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EncryptionKeyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EncryptionKeyGroupByOutputType[P]>
            : GetScalarType<T[P], EncryptionKeyGroupByOutputType[P]>
        }
      >
    >


  export type EncryptionKeySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    version?: boolean
    keyEncrypted?: boolean
    algorithm?: boolean
    status?: boolean
    createdAt?: boolean
    rotatedAt?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["encryptionKey"]>

  export type EncryptionKeySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    tenantId?: boolean
    version?: boolean
    keyEncrypted?: boolean
    algorithm?: boolean
    status?: boolean
    createdAt?: boolean
    rotatedAt?: boolean
    expiresAt?: boolean
  }, ExtArgs["result"]["encryptionKey"]>

  export type EncryptionKeySelectScalar = {
    id?: boolean
    tenantId?: boolean
    version?: boolean
    keyEncrypted?: boolean
    algorithm?: boolean
    status?: boolean
    createdAt?: boolean
    rotatedAt?: boolean
    expiresAt?: boolean
  }


  export type $EncryptionKeyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "EncryptionKey"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      tenantId: string
      version: number
      keyEncrypted: string
      algorithm: string
      status: string
      createdAt: Date
      rotatedAt: Date | null
      expiresAt: Date | null
    }, ExtArgs["result"]["encryptionKey"]>
    composites: {}
  }

  type EncryptionKeyGetPayload<S extends boolean | null | undefined | EncryptionKeyDefaultArgs> = $Result.GetResult<Prisma.$EncryptionKeyPayload, S>

  type EncryptionKeyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<EncryptionKeyFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: EncryptionKeyCountAggregateInputType | true
    }

  export interface EncryptionKeyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['EncryptionKey'], meta: { name: 'EncryptionKey' } }
    /**
     * Find zero or one EncryptionKey that matches the filter.
     * @param {EncryptionKeyFindUniqueArgs} args - Arguments to find a EncryptionKey
     * @example
     * // Get one EncryptionKey
     * const encryptionKey = await prisma.encryptionKey.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EncryptionKeyFindUniqueArgs>(args: SelectSubset<T, EncryptionKeyFindUniqueArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one EncryptionKey that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {EncryptionKeyFindUniqueOrThrowArgs} args - Arguments to find a EncryptionKey
     * @example
     * // Get one EncryptionKey
     * const encryptionKey = await prisma.encryptionKey.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EncryptionKeyFindUniqueOrThrowArgs>(args: SelectSubset<T, EncryptionKeyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first EncryptionKey that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyFindFirstArgs} args - Arguments to find a EncryptionKey
     * @example
     * // Get one EncryptionKey
     * const encryptionKey = await prisma.encryptionKey.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EncryptionKeyFindFirstArgs>(args?: SelectSubset<T, EncryptionKeyFindFirstArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first EncryptionKey that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyFindFirstOrThrowArgs} args - Arguments to find a EncryptionKey
     * @example
     * // Get one EncryptionKey
     * const encryptionKey = await prisma.encryptionKey.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EncryptionKeyFindFirstOrThrowArgs>(args?: SelectSubset<T, EncryptionKeyFindFirstOrThrowArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more EncryptionKeys that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all EncryptionKeys
     * const encryptionKeys = await prisma.encryptionKey.findMany()
     * 
     * // Get first 10 EncryptionKeys
     * const encryptionKeys = await prisma.encryptionKey.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const encryptionKeyWithIdOnly = await prisma.encryptionKey.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EncryptionKeyFindManyArgs>(args?: SelectSubset<T, EncryptionKeyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a EncryptionKey.
     * @param {EncryptionKeyCreateArgs} args - Arguments to create a EncryptionKey.
     * @example
     * // Create one EncryptionKey
     * const EncryptionKey = await prisma.encryptionKey.create({
     *   data: {
     *     // ... data to create a EncryptionKey
     *   }
     * })
     * 
     */
    create<T extends EncryptionKeyCreateArgs>(args: SelectSubset<T, EncryptionKeyCreateArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many EncryptionKeys.
     * @param {EncryptionKeyCreateManyArgs} args - Arguments to create many EncryptionKeys.
     * @example
     * // Create many EncryptionKeys
     * const encryptionKey = await prisma.encryptionKey.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EncryptionKeyCreateManyArgs>(args?: SelectSubset<T, EncryptionKeyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many EncryptionKeys and returns the data saved in the database.
     * @param {EncryptionKeyCreateManyAndReturnArgs} args - Arguments to create many EncryptionKeys.
     * @example
     * // Create many EncryptionKeys
     * const encryptionKey = await prisma.encryptionKey.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many EncryptionKeys and only return the `id`
     * const encryptionKeyWithIdOnly = await prisma.encryptionKey.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EncryptionKeyCreateManyAndReturnArgs>(args?: SelectSubset<T, EncryptionKeyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a EncryptionKey.
     * @param {EncryptionKeyDeleteArgs} args - Arguments to delete one EncryptionKey.
     * @example
     * // Delete one EncryptionKey
     * const EncryptionKey = await prisma.encryptionKey.delete({
     *   where: {
     *     // ... filter to delete one EncryptionKey
     *   }
     * })
     * 
     */
    delete<T extends EncryptionKeyDeleteArgs>(args: SelectSubset<T, EncryptionKeyDeleteArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one EncryptionKey.
     * @param {EncryptionKeyUpdateArgs} args - Arguments to update one EncryptionKey.
     * @example
     * // Update one EncryptionKey
     * const encryptionKey = await prisma.encryptionKey.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EncryptionKeyUpdateArgs>(args: SelectSubset<T, EncryptionKeyUpdateArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more EncryptionKeys.
     * @param {EncryptionKeyDeleteManyArgs} args - Arguments to filter EncryptionKeys to delete.
     * @example
     * // Delete a few EncryptionKeys
     * const { count } = await prisma.encryptionKey.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EncryptionKeyDeleteManyArgs>(args?: SelectSubset<T, EncryptionKeyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more EncryptionKeys.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many EncryptionKeys
     * const encryptionKey = await prisma.encryptionKey.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EncryptionKeyUpdateManyArgs>(args: SelectSubset<T, EncryptionKeyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one EncryptionKey.
     * @param {EncryptionKeyUpsertArgs} args - Arguments to update or create a EncryptionKey.
     * @example
     * // Update or create a EncryptionKey
     * const encryptionKey = await prisma.encryptionKey.upsert({
     *   create: {
     *     // ... data to create a EncryptionKey
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the EncryptionKey we want to update
     *   }
     * })
     */
    upsert<T extends EncryptionKeyUpsertArgs>(args: SelectSubset<T, EncryptionKeyUpsertArgs<ExtArgs>>): Prisma__EncryptionKeyClient<$Result.GetResult<Prisma.$EncryptionKeyPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of EncryptionKeys.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyCountArgs} args - Arguments to filter EncryptionKeys to count.
     * @example
     * // Count the number of EncryptionKeys
     * const count = await prisma.encryptionKey.count({
     *   where: {
     *     // ... the filter for the EncryptionKeys we want to count
     *   }
     * })
    **/
    count<T extends EncryptionKeyCountArgs>(
      args?: Subset<T, EncryptionKeyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EncryptionKeyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a EncryptionKey.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EncryptionKeyAggregateArgs>(args: Subset<T, EncryptionKeyAggregateArgs>): Prisma.PrismaPromise<GetEncryptionKeyAggregateType<T>>

    /**
     * Group by EncryptionKey.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EncryptionKeyGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EncryptionKeyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EncryptionKeyGroupByArgs['orderBy'] }
        : { orderBy?: EncryptionKeyGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EncryptionKeyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEncryptionKeyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the EncryptionKey model
   */
  readonly fields: EncryptionKeyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for EncryptionKey.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EncryptionKeyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the EncryptionKey model
   */ 
  interface EncryptionKeyFieldRefs {
    readonly id: FieldRef<"EncryptionKey", 'String'>
    readonly tenantId: FieldRef<"EncryptionKey", 'String'>
    readonly version: FieldRef<"EncryptionKey", 'Int'>
    readonly keyEncrypted: FieldRef<"EncryptionKey", 'String'>
    readonly algorithm: FieldRef<"EncryptionKey", 'String'>
    readonly status: FieldRef<"EncryptionKey", 'String'>
    readonly createdAt: FieldRef<"EncryptionKey", 'DateTime'>
    readonly rotatedAt: FieldRef<"EncryptionKey", 'DateTime'>
    readonly expiresAt: FieldRef<"EncryptionKey", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * EncryptionKey findUnique
   */
  export type EncryptionKeyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * Filter, which EncryptionKey to fetch.
     */
    where: EncryptionKeyWhereUniqueInput
  }

  /**
   * EncryptionKey findUniqueOrThrow
   */
  export type EncryptionKeyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * Filter, which EncryptionKey to fetch.
     */
    where: EncryptionKeyWhereUniqueInput
  }

  /**
   * EncryptionKey findFirst
   */
  export type EncryptionKeyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * Filter, which EncryptionKey to fetch.
     */
    where?: EncryptionKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EncryptionKeys to fetch.
     */
    orderBy?: EncryptionKeyOrderByWithRelationInput | EncryptionKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EncryptionKeys.
     */
    cursor?: EncryptionKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EncryptionKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EncryptionKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EncryptionKeys.
     */
    distinct?: EncryptionKeyScalarFieldEnum | EncryptionKeyScalarFieldEnum[]
  }

  /**
   * EncryptionKey findFirstOrThrow
   */
  export type EncryptionKeyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * Filter, which EncryptionKey to fetch.
     */
    where?: EncryptionKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EncryptionKeys to fetch.
     */
    orderBy?: EncryptionKeyOrderByWithRelationInput | EncryptionKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for EncryptionKeys.
     */
    cursor?: EncryptionKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EncryptionKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EncryptionKeys.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of EncryptionKeys.
     */
    distinct?: EncryptionKeyScalarFieldEnum | EncryptionKeyScalarFieldEnum[]
  }

  /**
   * EncryptionKey findMany
   */
  export type EncryptionKeyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * Filter, which EncryptionKeys to fetch.
     */
    where?: EncryptionKeyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of EncryptionKeys to fetch.
     */
    orderBy?: EncryptionKeyOrderByWithRelationInput | EncryptionKeyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing EncryptionKeys.
     */
    cursor?: EncryptionKeyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` EncryptionKeys from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` EncryptionKeys.
     */
    skip?: number
    distinct?: EncryptionKeyScalarFieldEnum | EncryptionKeyScalarFieldEnum[]
  }

  /**
   * EncryptionKey create
   */
  export type EncryptionKeyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * The data needed to create a EncryptionKey.
     */
    data: XOR<EncryptionKeyCreateInput, EncryptionKeyUncheckedCreateInput>
  }

  /**
   * EncryptionKey createMany
   */
  export type EncryptionKeyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many EncryptionKeys.
     */
    data: EncryptionKeyCreateManyInput | EncryptionKeyCreateManyInput[]
  }

  /**
   * EncryptionKey createManyAndReturn
   */
  export type EncryptionKeyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many EncryptionKeys.
     */
    data: EncryptionKeyCreateManyInput | EncryptionKeyCreateManyInput[]
  }

  /**
   * EncryptionKey update
   */
  export type EncryptionKeyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * The data needed to update a EncryptionKey.
     */
    data: XOR<EncryptionKeyUpdateInput, EncryptionKeyUncheckedUpdateInput>
    /**
     * Choose, which EncryptionKey to update.
     */
    where: EncryptionKeyWhereUniqueInput
  }

  /**
   * EncryptionKey updateMany
   */
  export type EncryptionKeyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update EncryptionKeys.
     */
    data: XOR<EncryptionKeyUpdateManyMutationInput, EncryptionKeyUncheckedUpdateManyInput>
    /**
     * Filter which EncryptionKeys to update
     */
    where?: EncryptionKeyWhereInput
  }

  /**
   * EncryptionKey upsert
   */
  export type EncryptionKeyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * The filter to search for the EncryptionKey to update in case it exists.
     */
    where: EncryptionKeyWhereUniqueInput
    /**
     * In case the EncryptionKey found by the `where` argument doesn't exist, create a new EncryptionKey with this data.
     */
    create: XOR<EncryptionKeyCreateInput, EncryptionKeyUncheckedCreateInput>
    /**
     * In case the EncryptionKey was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EncryptionKeyUpdateInput, EncryptionKeyUncheckedUpdateInput>
  }

  /**
   * EncryptionKey delete
   */
  export type EncryptionKeyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
    /**
     * Filter which EncryptionKey to delete.
     */
    where: EncryptionKeyWhereUniqueInput
  }

  /**
   * EncryptionKey deleteMany
   */
  export type EncryptionKeyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which EncryptionKeys to delete
     */
    where?: EncryptionKeyWhereInput
  }

  /**
   * EncryptionKey without action
   */
  export type EncryptionKeyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the EncryptionKey
     */
    select?: EncryptionKeySelect<ExtArgs> | null
  }


  /**
   * Model CachedMessage
   */

  export type AggregateCachedMessage = {
    _count: CachedMessageCountAggregateOutputType | null
    _min: CachedMessageMinAggregateOutputType | null
    _max: CachedMessageMaxAggregateOutputType | null
  }

  export type CachedMessageMinAggregateOutputType = {
    id: string | null
    accountId: string | null
    providerId: string | null
    threadId: string | null
    internetMessageId: string | null
    fromEmail: string | null
    fromName: string | null
    subject: string | null
    snippet: string | null
    labels: string | null
    isRead: boolean | null
    isDraft: boolean | null
    sentAt: Date | null
    receivedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CachedMessageMaxAggregateOutputType = {
    id: string | null
    accountId: string | null
    providerId: string | null
    threadId: string | null
    internetMessageId: string | null
    fromEmail: string | null
    fromName: string | null
    subject: string | null
    snippet: string | null
    labels: string | null
    isRead: boolean | null
    isDraft: boolean | null
    sentAt: Date | null
    receivedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CachedMessageCountAggregateOutputType = {
    id: number
    accountId: number
    providerId: number
    threadId: number
    internetMessageId: number
    fromEmail: number
    fromName: number
    subject: number
    snippet: number
    labels: number
    isRead: number
    isDraft: number
    sentAt: number
    receivedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CachedMessageMinAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    threadId?: true
    internetMessageId?: true
    fromEmail?: true
    fromName?: true
    subject?: true
    snippet?: true
    labels?: true
    isRead?: true
    isDraft?: true
    sentAt?: true
    receivedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CachedMessageMaxAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    threadId?: true
    internetMessageId?: true
    fromEmail?: true
    fromName?: true
    subject?: true
    snippet?: true
    labels?: true
    isRead?: true
    isDraft?: true
    sentAt?: true
    receivedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CachedMessageCountAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    threadId?: true
    internetMessageId?: true
    fromEmail?: true
    fromName?: true
    subject?: true
    snippet?: true
    labels?: true
    isRead?: true
    isDraft?: true
    sentAt?: true
    receivedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CachedMessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CachedMessage to aggregate.
     */
    where?: CachedMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedMessages to fetch.
     */
    orderBy?: CachedMessageOrderByWithRelationInput | CachedMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CachedMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CachedMessages
    **/
    _count?: true | CachedMessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CachedMessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CachedMessageMaxAggregateInputType
  }

  export type GetCachedMessageAggregateType<T extends CachedMessageAggregateArgs> = {
        [P in keyof T & keyof AggregateCachedMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCachedMessage[P]>
      : GetScalarType<T[P], AggregateCachedMessage[P]>
  }




  export type CachedMessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CachedMessageWhereInput
    orderBy?: CachedMessageOrderByWithAggregationInput | CachedMessageOrderByWithAggregationInput[]
    by: CachedMessageScalarFieldEnum[] | CachedMessageScalarFieldEnum
    having?: CachedMessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CachedMessageCountAggregateInputType | true
    _min?: CachedMessageMinAggregateInputType
    _max?: CachedMessageMaxAggregateInputType
  }

  export type CachedMessageGroupByOutputType = {
    id: string
    accountId: string
    providerId: string
    threadId: string
    internetMessageId: string
    fromEmail: string
    fromName: string | null
    subject: string | null
    snippet: string | null
    labels: string
    isRead: boolean
    isDraft: boolean
    sentAt: Date
    receivedAt: Date
    createdAt: Date
    updatedAt: Date
    _count: CachedMessageCountAggregateOutputType | null
    _min: CachedMessageMinAggregateOutputType | null
    _max: CachedMessageMaxAggregateOutputType | null
  }

  type GetCachedMessageGroupByPayload<T extends CachedMessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CachedMessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CachedMessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CachedMessageGroupByOutputType[P]>
            : GetScalarType<T[P], CachedMessageGroupByOutputType[P]>
        }
      >
    >


  export type CachedMessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    threadId?: boolean
    internetMessageId?: boolean
    fromEmail?: boolean
    fromName?: boolean
    subject?: boolean
    snippet?: boolean
    labels?: boolean
    isRead?: boolean
    isDraft?: boolean
    sentAt?: boolean
    receivedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["cachedMessage"]>

  export type CachedMessageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    threadId?: boolean
    internetMessageId?: boolean
    fromEmail?: boolean
    fromName?: boolean
    subject?: boolean
    snippet?: boolean
    labels?: boolean
    isRead?: boolean
    isDraft?: boolean
    sentAt?: boolean
    receivedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["cachedMessage"]>

  export type CachedMessageSelectScalar = {
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    threadId?: boolean
    internetMessageId?: boolean
    fromEmail?: boolean
    fromName?: boolean
    subject?: boolean
    snippet?: boolean
    labels?: boolean
    isRead?: boolean
    isDraft?: boolean
    sentAt?: boolean
    receivedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $CachedMessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CachedMessage"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      accountId: string
      providerId: string
      threadId: string
      internetMessageId: string
      fromEmail: string
      fromName: string | null
      subject: string | null
      snippet: string | null
      labels: string
      isRead: boolean
      isDraft: boolean
      sentAt: Date
      receivedAt: Date
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["cachedMessage"]>
    composites: {}
  }

  type CachedMessageGetPayload<S extends boolean | null | undefined | CachedMessageDefaultArgs> = $Result.GetResult<Prisma.$CachedMessagePayload, S>

  type CachedMessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CachedMessageFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CachedMessageCountAggregateInputType | true
    }

  export interface CachedMessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CachedMessage'], meta: { name: 'CachedMessage' } }
    /**
     * Find zero or one CachedMessage that matches the filter.
     * @param {CachedMessageFindUniqueArgs} args - Arguments to find a CachedMessage
     * @example
     * // Get one CachedMessage
     * const cachedMessage = await prisma.cachedMessage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CachedMessageFindUniqueArgs>(args: SelectSubset<T, CachedMessageFindUniqueArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one CachedMessage that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CachedMessageFindUniqueOrThrowArgs} args - Arguments to find a CachedMessage
     * @example
     * // Get one CachedMessage
     * const cachedMessage = await prisma.cachedMessage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CachedMessageFindUniqueOrThrowArgs>(args: SelectSubset<T, CachedMessageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first CachedMessage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageFindFirstArgs} args - Arguments to find a CachedMessage
     * @example
     * // Get one CachedMessage
     * const cachedMessage = await prisma.cachedMessage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CachedMessageFindFirstArgs>(args?: SelectSubset<T, CachedMessageFindFirstArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first CachedMessage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageFindFirstOrThrowArgs} args - Arguments to find a CachedMessage
     * @example
     * // Get one CachedMessage
     * const cachedMessage = await prisma.cachedMessage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CachedMessageFindFirstOrThrowArgs>(args?: SelectSubset<T, CachedMessageFindFirstOrThrowArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more CachedMessages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CachedMessages
     * const cachedMessages = await prisma.cachedMessage.findMany()
     * 
     * // Get first 10 CachedMessages
     * const cachedMessages = await prisma.cachedMessage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cachedMessageWithIdOnly = await prisma.cachedMessage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CachedMessageFindManyArgs>(args?: SelectSubset<T, CachedMessageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a CachedMessage.
     * @param {CachedMessageCreateArgs} args - Arguments to create a CachedMessage.
     * @example
     * // Create one CachedMessage
     * const CachedMessage = await prisma.cachedMessage.create({
     *   data: {
     *     // ... data to create a CachedMessage
     *   }
     * })
     * 
     */
    create<T extends CachedMessageCreateArgs>(args: SelectSubset<T, CachedMessageCreateArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many CachedMessages.
     * @param {CachedMessageCreateManyArgs} args - Arguments to create many CachedMessages.
     * @example
     * // Create many CachedMessages
     * const cachedMessage = await prisma.cachedMessage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CachedMessageCreateManyArgs>(args?: SelectSubset<T, CachedMessageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CachedMessages and returns the data saved in the database.
     * @param {CachedMessageCreateManyAndReturnArgs} args - Arguments to create many CachedMessages.
     * @example
     * // Create many CachedMessages
     * const cachedMessage = await prisma.cachedMessage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CachedMessages and only return the `id`
     * const cachedMessageWithIdOnly = await prisma.cachedMessage.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CachedMessageCreateManyAndReturnArgs>(args?: SelectSubset<T, CachedMessageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a CachedMessage.
     * @param {CachedMessageDeleteArgs} args - Arguments to delete one CachedMessage.
     * @example
     * // Delete one CachedMessage
     * const CachedMessage = await prisma.cachedMessage.delete({
     *   where: {
     *     // ... filter to delete one CachedMessage
     *   }
     * })
     * 
     */
    delete<T extends CachedMessageDeleteArgs>(args: SelectSubset<T, CachedMessageDeleteArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one CachedMessage.
     * @param {CachedMessageUpdateArgs} args - Arguments to update one CachedMessage.
     * @example
     * // Update one CachedMessage
     * const cachedMessage = await prisma.cachedMessage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CachedMessageUpdateArgs>(args: SelectSubset<T, CachedMessageUpdateArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more CachedMessages.
     * @param {CachedMessageDeleteManyArgs} args - Arguments to filter CachedMessages to delete.
     * @example
     * // Delete a few CachedMessages
     * const { count } = await prisma.cachedMessage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CachedMessageDeleteManyArgs>(args?: SelectSubset<T, CachedMessageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CachedMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CachedMessages
     * const cachedMessage = await prisma.cachedMessage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CachedMessageUpdateManyArgs>(args: SelectSubset<T, CachedMessageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CachedMessage.
     * @param {CachedMessageUpsertArgs} args - Arguments to update or create a CachedMessage.
     * @example
     * // Update or create a CachedMessage
     * const cachedMessage = await prisma.cachedMessage.upsert({
     *   create: {
     *     // ... data to create a CachedMessage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CachedMessage we want to update
     *   }
     * })
     */
    upsert<T extends CachedMessageUpsertArgs>(args: SelectSubset<T, CachedMessageUpsertArgs<ExtArgs>>): Prisma__CachedMessageClient<$Result.GetResult<Prisma.$CachedMessagePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of CachedMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageCountArgs} args - Arguments to filter CachedMessages to count.
     * @example
     * // Count the number of CachedMessages
     * const count = await prisma.cachedMessage.count({
     *   where: {
     *     // ... the filter for the CachedMessages we want to count
     *   }
     * })
    **/
    count<T extends CachedMessageCountArgs>(
      args?: Subset<T, CachedMessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CachedMessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CachedMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CachedMessageAggregateArgs>(args: Subset<T, CachedMessageAggregateArgs>): Prisma.PrismaPromise<GetCachedMessageAggregateType<T>>

    /**
     * Group by CachedMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedMessageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CachedMessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CachedMessageGroupByArgs['orderBy'] }
        : { orderBy?: CachedMessageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CachedMessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCachedMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CachedMessage model
   */
  readonly fields: CachedMessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CachedMessage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CachedMessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CachedMessage model
   */ 
  interface CachedMessageFieldRefs {
    readonly id: FieldRef<"CachedMessage", 'String'>
    readonly accountId: FieldRef<"CachedMessage", 'String'>
    readonly providerId: FieldRef<"CachedMessage", 'String'>
    readonly threadId: FieldRef<"CachedMessage", 'String'>
    readonly internetMessageId: FieldRef<"CachedMessage", 'String'>
    readonly fromEmail: FieldRef<"CachedMessage", 'String'>
    readonly fromName: FieldRef<"CachedMessage", 'String'>
    readonly subject: FieldRef<"CachedMessage", 'String'>
    readonly snippet: FieldRef<"CachedMessage", 'String'>
    readonly labels: FieldRef<"CachedMessage", 'String'>
    readonly isRead: FieldRef<"CachedMessage", 'Boolean'>
    readonly isDraft: FieldRef<"CachedMessage", 'Boolean'>
    readonly sentAt: FieldRef<"CachedMessage", 'DateTime'>
    readonly receivedAt: FieldRef<"CachedMessage", 'DateTime'>
    readonly createdAt: FieldRef<"CachedMessage", 'DateTime'>
    readonly updatedAt: FieldRef<"CachedMessage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CachedMessage findUnique
   */
  export type CachedMessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * Filter, which CachedMessage to fetch.
     */
    where: CachedMessageWhereUniqueInput
  }

  /**
   * CachedMessage findUniqueOrThrow
   */
  export type CachedMessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * Filter, which CachedMessage to fetch.
     */
    where: CachedMessageWhereUniqueInput
  }

  /**
   * CachedMessage findFirst
   */
  export type CachedMessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * Filter, which CachedMessage to fetch.
     */
    where?: CachedMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedMessages to fetch.
     */
    orderBy?: CachedMessageOrderByWithRelationInput | CachedMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CachedMessages.
     */
    cursor?: CachedMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CachedMessages.
     */
    distinct?: CachedMessageScalarFieldEnum | CachedMessageScalarFieldEnum[]
  }

  /**
   * CachedMessage findFirstOrThrow
   */
  export type CachedMessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * Filter, which CachedMessage to fetch.
     */
    where?: CachedMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedMessages to fetch.
     */
    orderBy?: CachedMessageOrderByWithRelationInput | CachedMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CachedMessages.
     */
    cursor?: CachedMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CachedMessages.
     */
    distinct?: CachedMessageScalarFieldEnum | CachedMessageScalarFieldEnum[]
  }

  /**
   * CachedMessage findMany
   */
  export type CachedMessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * Filter, which CachedMessages to fetch.
     */
    where?: CachedMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedMessages to fetch.
     */
    orderBy?: CachedMessageOrderByWithRelationInput | CachedMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CachedMessages.
     */
    cursor?: CachedMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedMessages.
     */
    skip?: number
    distinct?: CachedMessageScalarFieldEnum | CachedMessageScalarFieldEnum[]
  }

  /**
   * CachedMessage create
   */
  export type CachedMessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * The data needed to create a CachedMessage.
     */
    data: XOR<CachedMessageCreateInput, CachedMessageUncheckedCreateInput>
  }

  /**
   * CachedMessage createMany
   */
  export type CachedMessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CachedMessages.
     */
    data: CachedMessageCreateManyInput | CachedMessageCreateManyInput[]
  }

  /**
   * CachedMessage createManyAndReturn
   */
  export type CachedMessageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CachedMessages.
     */
    data: CachedMessageCreateManyInput | CachedMessageCreateManyInput[]
  }

  /**
   * CachedMessage update
   */
  export type CachedMessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * The data needed to update a CachedMessage.
     */
    data: XOR<CachedMessageUpdateInput, CachedMessageUncheckedUpdateInput>
    /**
     * Choose, which CachedMessage to update.
     */
    where: CachedMessageWhereUniqueInput
  }

  /**
   * CachedMessage updateMany
   */
  export type CachedMessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CachedMessages.
     */
    data: XOR<CachedMessageUpdateManyMutationInput, CachedMessageUncheckedUpdateManyInput>
    /**
     * Filter which CachedMessages to update
     */
    where?: CachedMessageWhereInput
  }

  /**
   * CachedMessage upsert
   */
  export type CachedMessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * The filter to search for the CachedMessage to update in case it exists.
     */
    where: CachedMessageWhereUniqueInput
    /**
     * In case the CachedMessage found by the `where` argument doesn't exist, create a new CachedMessage with this data.
     */
    create: XOR<CachedMessageCreateInput, CachedMessageUncheckedCreateInput>
    /**
     * In case the CachedMessage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CachedMessageUpdateInput, CachedMessageUncheckedUpdateInput>
  }

  /**
   * CachedMessage delete
   */
  export type CachedMessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
    /**
     * Filter which CachedMessage to delete.
     */
    where: CachedMessageWhereUniqueInput
  }

  /**
   * CachedMessage deleteMany
   */
  export type CachedMessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CachedMessages to delete
     */
    where?: CachedMessageWhereInput
  }

  /**
   * CachedMessage without action
   */
  export type CachedMessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedMessage
     */
    select?: CachedMessageSelect<ExtArgs> | null
  }


  /**
   * Model CachedEvent
   */

  export type AggregateCachedEvent = {
    _count: CachedEventCountAggregateOutputType | null
    _min: CachedEventMinAggregateOutputType | null
    _max: CachedEventMaxAggregateOutputType | null
  }

  export type CachedEventMinAggregateOutputType = {
    id: string | null
    accountId: string | null
    providerId: string | null
    calendarId: string | null
    title: string | null
    description: string | null
    location: string | null
    startTime: Date | null
    endTime: Date | null
    isAllDay: boolean | null
    timezone: string | null
    organizerEmail: string | null
    organizerName: string | null
    status: string | null
    visibility: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CachedEventMaxAggregateOutputType = {
    id: string | null
    accountId: string | null
    providerId: string | null
    calendarId: string | null
    title: string | null
    description: string | null
    location: string | null
    startTime: Date | null
    endTime: Date | null
    isAllDay: boolean | null
    timezone: string | null
    organizerEmail: string | null
    organizerName: string | null
    status: string | null
    visibility: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CachedEventCountAggregateOutputType = {
    id: number
    accountId: number
    providerId: number
    calendarId: number
    title: number
    description: number
    location: number
    startTime: number
    endTime: number
    isAllDay: number
    timezone: number
    organizerEmail: number
    organizerName: number
    status: number
    visibility: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CachedEventMinAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    calendarId?: true
    title?: true
    description?: true
    location?: true
    startTime?: true
    endTime?: true
    isAllDay?: true
    timezone?: true
    organizerEmail?: true
    organizerName?: true
    status?: true
    visibility?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CachedEventMaxAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    calendarId?: true
    title?: true
    description?: true
    location?: true
    startTime?: true
    endTime?: true
    isAllDay?: true
    timezone?: true
    organizerEmail?: true
    organizerName?: true
    status?: true
    visibility?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CachedEventCountAggregateInputType = {
    id?: true
    accountId?: true
    providerId?: true
    calendarId?: true
    title?: true
    description?: true
    location?: true
    startTime?: true
    endTime?: true
    isAllDay?: true
    timezone?: true
    organizerEmail?: true
    organizerName?: true
    status?: true
    visibility?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CachedEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CachedEvent to aggregate.
     */
    where?: CachedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedEvents to fetch.
     */
    orderBy?: CachedEventOrderByWithRelationInput | CachedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CachedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CachedEvents
    **/
    _count?: true | CachedEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CachedEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CachedEventMaxAggregateInputType
  }

  export type GetCachedEventAggregateType<T extends CachedEventAggregateArgs> = {
        [P in keyof T & keyof AggregateCachedEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCachedEvent[P]>
      : GetScalarType<T[P], AggregateCachedEvent[P]>
  }




  export type CachedEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CachedEventWhereInput
    orderBy?: CachedEventOrderByWithAggregationInput | CachedEventOrderByWithAggregationInput[]
    by: CachedEventScalarFieldEnum[] | CachedEventScalarFieldEnum
    having?: CachedEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CachedEventCountAggregateInputType | true
    _min?: CachedEventMinAggregateInputType
    _max?: CachedEventMaxAggregateInputType
  }

  export type CachedEventGroupByOutputType = {
    id: string
    accountId: string
    providerId: string
    calendarId: string
    title: string
    description: string | null
    location: string | null
    startTime: Date
    endTime: Date
    isAllDay: boolean
    timezone: string | null
    organizerEmail: string
    organizerName: string | null
    status: string
    visibility: string
    createdAt: Date
    updatedAt: Date
    _count: CachedEventCountAggregateOutputType | null
    _min: CachedEventMinAggregateOutputType | null
    _max: CachedEventMaxAggregateOutputType | null
  }

  type GetCachedEventGroupByPayload<T extends CachedEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CachedEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CachedEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CachedEventGroupByOutputType[P]>
            : GetScalarType<T[P], CachedEventGroupByOutputType[P]>
        }
      >
    >


  export type CachedEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    calendarId?: boolean
    title?: boolean
    description?: boolean
    location?: boolean
    startTime?: boolean
    endTime?: boolean
    isAllDay?: boolean
    timezone?: boolean
    organizerEmail?: boolean
    organizerName?: boolean
    status?: boolean
    visibility?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["cachedEvent"]>

  export type CachedEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    calendarId?: boolean
    title?: boolean
    description?: boolean
    location?: boolean
    startTime?: boolean
    endTime?: boolean
    isAllDay?: boolean
    timezone?: boolean
    organizerEmail?: boolean
    organizerName?: boolean
    status?: boolean
    visibility?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["cachedEvent"]>

  export type CachedEventSelectScalar = {
    id?: boolean
    accountId?: boolean
    providerId?: boolean
    calendarId?: boolean
    title?: boolean
    description?: boolean
    location?: boolean
    startTime?: boolean
    endTime?: boolean
    isAllDay?: boolean
    timezone?: boolean
    organizerEmail?: boolean
    organizerName?: boolean
    status?: boolean
    visibility?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $CachedEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CachedEvent"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      accountId: string
      providerId: string
      calendarId: string
      title: string
      description: string | null
      location: string | null
      startTime: Date
      endTime: Date
      isAllDay: boolean
      timezone: string | null
      organizerEmail: string
      organizerName: string | null
      status: string
      visibility: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["cachedEvent"]>
    composites: {}
  }

  type CachedEventGetPayload<S extends boolean | null | undefined | CachedEventDefaultArgs> = $Result.GetResult<Prisma.$CachedEventPayload, S>

  type CachedEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CachedEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CachedEventCountAggregateInputType | true
    }

  export interface CachedEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CachedEvent'], meta: { name: 'CachedEvent' } }
    /**
     * Find zero or one CachedEvent that matches the filter.
     * @param {CachedEventFindUniqueArgs} args - Arguments to find a CachedEvent
     * @example
     * // Get one CachedEvent
     * const cachedEvent = await prisma.cachedEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CachedEventFindUniqueArgs>(args: SelectSubset<T, CachedEventFindUniqueArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one CachedEvent that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {CachedEventFindUniqueOrThrowArgs} args - Arguments to find a CachedEvent
     * @example
     * // Get one CachedEvent
     * const cachedEvent = await prisma.cachedEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CachedEventFindUniqueOrThrowArgs>(args: SelectSubset<T, CachedEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first CachedEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventFindFirstArgs} args - Arguments to find a CachedEvent
     * @example
     * // Get one CachedEvent
     * const cachedEvent = await prisma.cachedEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CachedEventFindFirstArgs>(args?: SelectSubset<T, CachedEventFindFirstArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first CachedEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventFindFirstOrThrowArgs} args - Arguments to find a CachedEvent
     * @example
     * // Get one CachedEvent
     * const cachedEvent = await prisma.cachedEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CachedEventFindFirstOrThrowArgs>(args?: SelectSubset<T, CachedEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more CachedEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CachedEvents
     * const cachedEvents = await prisma.cachedEvent.findMany()
     * 
     * // Get first 10 CachedEvents
     * const cachedEvents = await prisma.cachedEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const cachedEventWithIdOnly = await prisma.cachedEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CachedEventFindManyArgs>(args?: SelectSubset<T, CachedEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a CachedEvent.
     * @param {CachedEventCreateArgs} args - Arguments to create a CachedEvent.
     * @example
     * // Create one CachedEvent
     * const CachedEvent = await prisma.cachedEvent.create({
     *   data: {
     *     // ... data to create a CachedEvent
     *   }
     * })
     * 
     */
    create<T extends CachedEventCreateArgs>(args: SelectSubset<T, CachedEventCreateArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many CachedEvents.
     * @param {CachedEventCreateManyArgs} args - Arguments to create many CachedEvents.
     * @example
     * // Create many CachedEvents
     * const cachedEvent = await prisma.cachedEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CachedEventCreateManyArgs>(args?: SelectSubset<T, CachedEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CachedEvents and returns the data saved in the database.
     * @param {CachedEventCreateManyAndReturnArgs} args - Arguments to create many CachedEvents.
     * @example
     * // Create many CachedEvents
     * const cachedEvent = await prisma.cachedEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CachedEvents and only return the `id`
     * const cachedEventWithIdOnly = await prisma.cachedEvent.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CachedEventCreateManyAndReturnArgs>(args?: SelectSubset<T, CachedEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a CachedEvent.
     * @param {CachedEventDeleteArgs} args - Arguments to delete one CachedEvent.
     * @example
     * // Delete one CachedEvent
     * const CachedEvent = await prisma.cachedEvent.delete({
     *   where: {
     *     // ... filter to delete one CachedEvent
     *   }
     * })
     * 
     */
    delete<T extends CachedEventDeleteArgs>(args: SelectSubset<T, CachedEventDeleteArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one CachedEvent.
     * @param {CachedEventUpdateArgs} args - Arguments to update one CachedEvent.
     * @example
     * // Update one CachedEvent
     * const cachedEvent = await prisma.cachedEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CachedEventUpdateArgs>(args: SelectSubset<T, CachedEventUpdateArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more CachedEvents.
     * @param {CachedEventDeleteManyArgs} args - Arguments to filter CachedEvents to delete.
     * @example
     * // Delete a few CachedEvents
     * const { count } = await prisma.cachedEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CachedEventDeleteManyArgs>(args?: SelectSubset<T, CachedEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CachedEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CachedEvents
     * const cachedEvent = await prisma.cachedEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CachedEventUpdateManyArgs>(args: SelectSubset<T, CachedEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CachedEvent.
     * @param {CachedEventUpsertArgs} args - Arguments to update or create a CachedEvent.
     * @example
     * // Update or create a CachedEvent
     * const cachedEvent = await prisma.cachedEvent.upsert({
     *   create: {
     *     // ... data to create a CachedEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CachedEvent we want to update
     *   }
     * })
     */
    upsert<T extends CachedEventUpsertArgs>(args: SelectSubset<T, CachedEventUpsertArgs<ExtArgs>>): Prisma__CachedEventClient<$Result.GetResult<Prisma.$CachedEventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of CachedEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventCountArgs} args - Arguments to filter CachedEvents to count.
     * @example
     * // Count the number of CachedEvents
     * const count = await prisma.cachedEvent.count({
     *   where: {
     *     // ... the filter for the CachedEvents we want to count
     *   }
     * })
    **/
    count<T extends CachedEventCountArgs>(
      args?: Subset<T, CachedEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CachedEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CachedEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CachedEventAggregateArgs>(args: Subset<T, CachedEventAggregateArgs>): Prisma.PrismaPromise<GetCachedEventAggregateType<T>>

    /**
     * Group by CachedEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CachedEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CachedEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CachedEventGroupByArgs['orderBy'] }
        : { orderBy?: CachedEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CachedEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCachedEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CachedEvent model
   */
  readonly fields: CachedEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CachedEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CachedEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CachedEvent model
   */ 
  interface CachedEventFieldRefs {
    readonly id: FieldRef<"CachedEvent", 'String'>
    readonly accountId: FieldRef<"CachedEvent", 'String'>
    readonly providerId: FieldRef<"CachedEvent", 'String'>
    readonly calendarId: FieldRef<"CachedEvent", 'String'>
    readonly title: FieldRef<"CachedEvent", 'String'>
    readonly description: FieldRef<"CachedEvent", 'String'>
    readonly location: FieldRef<"CachedEvent", 'String'>
    readonly startTime: FieldRef<"CachedEvent", 'DateTime'>
    readonly endTime: FieldRef<"CachedEvent", 'DateTime'>
    readonly isAllDay: FieldRef<"CachedEvent", 'Boolean'>
    readonly timezone: FieldRef<"CachedEvent", 'String'>
    readonly organizerEmail: FieldRef<"CachedEvent", 'String'>
    readonly organizerName: FieldRef<"CachedEvent", 'String'>
    readonly status: FieldRef<"CachedEvent", 'String'>
    readonly visibility: FieldRef<"CachedEvent", 'String'>
    readonly createdAt: FieldRef<"CachedEvent", 'DateTime'>
    readonly updatedAt: FieldRef<"CachedEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CachedEvent findUnique
   */
  export type CachedEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * Filter, which CachedEvent to fetch.
     */
    where: CachedEventWhereUniqueInput
  }

  /**
   * CachedEvent findUniqueOrThrow
   */
  export type CachedEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * Filter, which CachedEvent to fetch.
     */
    where: CachedEventWhereUniqueInput
  }

  /**
   * CachedEvent findFirst
   */
  export type CachedEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * Filter, which CachedEvent to fetch.
     */
    where?: CachedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedEvents to fetch.
     */
    orderBy?: CachedEventOrderByWithRelationInput | CachedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CachedEvents.
     */
    cursor?: CachedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CachedEvents.
     */
    distinct?: CachedEventScalarFieldEnum | CachedEventScalarFieldEnum[]
  }

  /**
   * CachedEvent findFirstOrThrow
   */
  export type CachedEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * Filter, which CachedEvent to fetch.
     */
    where?: CachedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedEvents to fetch.
     */
    orderBy?: CachedEventOrderByWithRelationInput | CachedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CachedEvents.
     */
    cursor?: CachedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CachedEvents.
     */
    distinct?: CachedEventScalarFieldEnum | CachedEventScalarFieldEnum[]
  }

  /**
   * CachedEvent findMany
   */
  export type CachedEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * Filter, which CachedEvents to fetch.
     */
    where?: CachedEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CachedEvents to fetch.
     */
    orderBy?: CachedEventOrderByWithRelationInput | CachedEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CachedEvents.
     */
    cursor?: CachedEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CachedEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CachedEvents.
     */
    skip?: number
    distinct?: CachedEventScalarFieldEnum | CachedEventScalarFieldEnum[]
  }

  /**
   * CachedEvent create
   */
  export type CachedEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * The data needed to create a CachedEvent.
     */
    data: XOR<CachedEventCreateInput, CachedEventUncheckedCreateInput>
  }

  /**
   * CachedEvent createMany
   */
  export type CachedEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CachedEvents.
     */
    data: CachedEventCreateManyInput | CachedEventCreateManyInput[]
  }

  /**
   * CachedEvent createManyAndReturn
   */
  export type CachedEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many CachedEvents.
     */
    data: CachedEventCreateManyInput | CachedEventCreateManyInput[]
  }

  /**
   * CachedEvent update
   */
  export type CachedEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * The data needed to update a CachedEvent.
     */
    data: XOR<CachedEventUpdateInput, CachedEventUncheckedUpdateInput>
    /**
     * Choose, which CachedEvent to update.
     */
    where: CachedEventWhereUniqueInput
  }

  /**
   * CachedEvent updateMany
   */
  export type CachedEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CachedEvents.
     */
    data: XOR<CachedEventUpdateManyMutationInput, CachedEventUncheckedUpdateManyInput>
    /**
     * Filter which CachedEvents to update
     */
    where?: CachedEventWhereInput
  }

  /**
   * CachedEvent upsert
   */
  export type CachedEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * The filter to search for the CachedEvent to update in case it exists.
     */
    where: CachedEventWhereUniqueInput
    /**
     * In case the CachedEvent found by the `where` argument doesn't exist, create a new CachedEvent with this data.
     */
    create: XOR<CachedEventCreateInput, CachedEventUncheckedCreateInput>
    /**
     * In case the CachedEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CachedEventUpdateInput, CachedEventUncheckedUpdateInput>
  }

  /**
   * CachedEvent delete
   */
  export type CachedEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
    /**
     * Filter which CachedEvent to delete.
     */
    where: CachedEventWhereUniqueInput
  }

  /**
   * CachedEvent deleteMany
   */
  export type CachedEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CachedEvents to delete
     */
    where?: CachedEventWhereInput
  }

  /**
   * CachedEvent without action
   */
  export type CachedEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CachedEvent
     */
    select?: CachedEventSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ConnectedAccountScalarFieldEnum: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    provider: 'provider',
    providerAccountId: 'providerAccountId',
    email: 'email',
    displayName: 'displayName',
    status: 'status',
    enabledScopes: 'enabledScopes',
    requestedScopes: 'requestedScopes',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    lastSyncAt: 'lastSyncAt'
  };

  export type ConnectedAccountScalarFieldEnum = (typeof ConnectedAccountScalarFieldEnum)[keyof typeof ConnectedAccountScalarFieldEnum]


  export const OAuthTokenScalarFieldEnum: {
    id: 'id',
    accountId: 'accountId',
    accessTokenEnc: 'accessTokenEnc',
    refreshTokenEnc: 'refreshTokenEnc',
    keyVersion: 'keyVersion',
    encryptionKeyId: 'encryptionKeyId',
    accessTokenExpiresAt: 'accessTokenExpiresAt',
    tokenType: 'tokenType',
    scope: 'scope',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OAuthTokenScalarFieldEnum = (typeof OAuthTokenScalarFieldEnum)[keyof typeof OAuthTokenScalarFieldEnum]


  export const SyncStateScalarFieldEnum: {
    id: 'id',
    accountId: 'accountId',
    emailHistoryId: 'emailHistoryId',
    calendarSyncToken: 'calendarSyncToken',
    gmailHistoryId: 'gmailHistoryId',
    gmailWatchExpiry: 'gmailWatchExpiry',
    mailDeltaLink: 'mailDeltaLink',
    calendarDeltaLink: 'calendarDeltaLink',
    googleCalendarSyncToken: 'googleCalendarSyncToken',
    emailSubscriptionId: 'emailSubscriptionId',
    mailSubscriptionId: 'mailSubscriptionId',
    calendarSubscriptionId: 'calendarSubscriptionId',
    subscriptionExpiry: 'subscriptionExpiry',
    lastEmailSync: 'lastEmailSync',
    lastCalendarSync: 'lastCalendarSync',
    emailSyncStatus: 'emailSyncStatus',
    calendarSyncStatus: 'calendarSyncStatus',
    errorMessage: 'errorMessage',
    usePolling: 'usePolling',
    lastPollAt: 'lastPollAt',
    pollErrorCount: 'pollErrorCount',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SyncStateScalarFieldEnum = (typeof SyncStateScalarFieldEnum)[keyof typeof SyncStateScalarFieldEnum]


  export const ApprovalScalarFieldEnum: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    accountId: 'accountId',
    actionType: 'actionType',
    status: 'status',
    actionPayload: 'actionPayload',
    riskLevel: 'riskLevel',
    riskReason: 'riskReason',
    requestedAt: 'requestedAt',
    expiresAt: 'expiresAt',
    decidedAt: 'decidedAt',
    decidedBy: 'decidedBy',
    correlationId: 'correlationId',
    createdAt: 'createdAt'
  };

  export type ApprovalScalarFieldEnum = (typeof ApprovalScalarFieldEnum)[keyof typeof ApprovalScalarFieldEnum]


  export const AuditLogScalarFieldEnum: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    accountId: 'accountId',
    action: 'action',
    resourceType: 'resourceType',
    resourceId: 'resourceId',
    correlationId: 'correlationId',
    ipAddress: 'ipAddress',
    userAgent: 'userAgent',
    status: 'status',
    errorCode: 'errorCode',
    metadata: 'metadata',
    durationMs: 'durationMs',
    createdAt: 'createdAt'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const ProcessedEventScalarFieldEnum: {
    id: 'id',
    idempotencyKey: 'idempotencyKey',
    eventId: 'eventId',
    eventType: 'eventType',
    accountId: 'accountId',
    provider: 'provider',
    payload: 'payload',
    processedAt: 'processedAt',
    expiresAt: 'expiresAt'
  };

  export type ProcessedEventScalarFieldEnum = (typeof ProcessedEventScalarFieldEnum)[keyof typeof ProcessedEventScalarFieldEnum]


  export const EncryptionKeyScalarFieldEnum: {
    id: 'id',
    tenantId: 'tenantId',
    version: 'version',
    keyEncrypted: 'keyEncrypted',
    algorithm: 'algorithm',
    status: 'status',
    createdAt: 'createdAt',
    rotatedAt: 'rotatedAt',
    expiresAt: 'expiresAt'
  };

  export type EncryptionKeyScalarFieldEnum = (typeof EncryptionKeyScalarFieldEnum)[keyof typeof EncryptionKeyScalarFieldEnum]


  export const CachedMessageScalarFieldEnum: {
    id: 'id',
    accountId: 'accountId',
    providerId: 'providerId',
    threadId: 'threadId',
    internetMessageId: 'internetMessageId',
    fromEmail: 'fromEmail',
    fromName: 'fromName',
    subject: 'subject',
    snippet: 'snippet',
    labels: 'labels',
    isRead: 'isRead',
    isDraft: 'isDraft',
    sentAt: 'sentAt',
    receivedAt: 'receivedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CachedMessageScalarFieldEnum = (typeof CachedMessageScalarFieldEnum)[keyof typeof CachedMessageScalarFieldEnum]


  export const CachedEventScalarFieldEnum: {
    id: 'id',
    accountId: 'accountId',
    providerId: 'providerId',
    calendarId: 'calendarId',
    title: 'title',
    description: 'description',
    location: 'location',
    startTime: 'startTime',
    endTime: 'endTime',
    isAllDay: 'isAllDay',
    timezone: 'timezone',
    organizerEmail: 'organizerEmail',
    organizerName: 'organizerName',
    status: 'status',
    visibility: 'visibility',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CachedEventScalarFieldEnum = (typeof CachedEventScalarFieldEnum)[keyof typeof CachedEventScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type ConnectedAccountWhereInput = {
    AND?: ConnectedAccountWhereInput | ConnectedAccountWhereInput[]
    OR?: ConnectedAccountWhereInput[]
    NOT?: ConnectedAccountWhereInput | ConnectedAccountWhereInput[]
    id?: StringFilter<"ConnectedAccount"> | string
    tenantId?: StringFilter<"ConnectedAccount"> | string
    userId?: StringFilter<"ConnectedAccount"> | string
    provider?: StringFilter<"ConnectedAccount"> | string
    providerAccountId?: StringFilter<"ConnectedAccount"> | string
    email?: StringFilter<"ConnectedAccount"> | string
    displayName?: StringNullableFilter<"ConnectedAccount"> | string | null
    status?: StringFilter<"ConnectedAccount"> | string
    enabledScopes?: StringFilter<"ConnectedAccount"> | string
    requestedScopes?: StringFilter<"ConnectedAccount"> | string
    createdAt?: DateTimeFilter<"ConnectedAccount"> | Date | string
    updatedAt?: DateTimeFilter<"ConnectedAccount"> | Date | string
    lastSyncAt?: DateTimeNullableFilter<"ConnectedAccount"> | Date | string | null
    oauthToken?: XOR<OAuthTokenNullableRelationFilter, OAuthTokenWhereInput> | null
    syncState?: XOR<SyncStateNullableRelationFilter, SyncStateWhereInput> | null
    approvals?: ApprovalListRelationFilter
    auditLogs?: AuditLogListRelationFilter
  }

  export type ConnectedAccountOrderByWithRelationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    email?: SortOrder
    displayName?: SortOrderInput | SortOrder
    status?: SortOrder
    enabledScopes?: SortOrder
    requestedScopes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastSyncAt?: SortOrderInput | SortOrder
    oauthToken?: OAuthTokenOrderByWithRelationInput
    syncState?: SyncStateOrderByWithRelationInput
    approvals?: ApprovalOrderByRelationAggregateInput
    auditLogs?: AuditLogOrderByRelationAggregateInput
  }

  export type ConnectedAccountWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    tenantId_userId_provider_providerAccountId?: ConnectedAccountTenantIdUserIdProviderProviderAccountIdCompoundUniqueInput
    AND?: ConnectedAccountWhereInput | ConnectedAccountWhereInput[]
    OR?: ConnectedAccountWhereInput[]
    NOT?: ConnectedAccountWhereInput | ConnectedAccountWhereInput[]
    tenantId?: StringFilter<"ConnectedAccount"> | string
    userId?: StringFilter<"ConnectedAccount"> | string
    provider?: StringFilter<"ConnectedAccount"> | string
    providerAccountId?: StringFilter<"ConnectedAccount"> | string
    email?: StringFilter<"ConnectedAccount"> | string
    displayName?: StringNullableFilter<"ConnectedAccount"> | string | null
    status?: StringFilter<"ConnectedAccount"> | string
    enabledScopes?: StringFilter<"ConnectedAccount"> | string
    requestedScopes?: StringFilter<"ConnectedAccount"> | string
    createdAt?: DateTimeFilter<"ConnectedAccount"> | Date | string
    updatedAt?: DateTimeFilter<"ConnectedAccount"> | Date | string
    lastSyncAt?: DateTimeNullableFilter<"ConnectedAccount"> | Date | string | null
    oauthToken?: XOR<OAuthTokenNullableRelationFilter, OAuthTokenWhereInput> | null
    syncState?: XOR<SyncStateNullableRelationFilter, SyncStateWhereInput> | null
    approvals?: ApprovalListRelationFilter
    auditLogs?: AuditLogListRelationFilter
  }, "id" | "tenantId_userId_provider_providerAccountId">

  export type ConnectedAccountOrderByWithAggregationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    email?: SortOrder
    displayName?: SortOrderInput | SortOrder
    status?: SortOrder
    enabledScopes?: SortOrder
    requestedScopes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastSyncAt?: SortOrderInput | SortOrder
    _count?: ConnectedAccountCountOrderByAggregateInput
    _max?: ConnectedAccountMaxOrderByAggregateInput
    _min?: ConnectedAccountMinOrderByAggregateInput
  }

  export type ConnectedAccountScalarWhereWithAggregatesInput = {
    AND?: ConnectedAccountScalarWhereWithAggregatesInput | ConnectedAccountScalarWhereWithAggregatesInput[]
    OR?: ConnectedAccountScalarWhereWithAggregatesInput[]
    NOT?: ConnectedAccountScalarWhereWithAggregatesInput | ConnectedAccountScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    tenantId?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    userId?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    provider?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    providerAccountId?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    email?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    displayName?: StringNullableWithAggregatesFilter<"ConnectedAccount"> | string | null
    status?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    enabledScopes?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    requestedScopes?: StringWithAggregatesFilter<"ConnectedAccount"> | string
    createdAt?: DateTimeWithAggregatesFilter<"ConnectedAccount"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ConnectedAccount"> | Date | string
    lastSyncAt?: DateTimeNullableWithAggregatesFilter<"ConnectedAccount"> | Date | string | null
  }

  export type OAuthTokenWhereInput = {
    AND?: OAuthTokenWhereInput | OAuthTokenWhereInput[]
    OR?: OAuthTokenWhereInput[]
    NOT?: OAuthTokenWhereInput | OAuthTokenWhereInput[]
    id?: StringFilter<"OAuthToken"> | string
    accountId?: StringFilter<"OAuthToken"> | string
    accessTokenEnc?: StringFilter<"OAuthToken"> | string
    refreshTokenEnc?: StringFilter<"OAuthToken"> | string
    keyVersion?: IntFilter<"OAuthToken"> | number
    encryptionKeyId?: StringFilter<"OAuthToken"> | string
    accessTokenExpiresAt?: DateTimeFilter<"OAuthToken"> | Date | string
    tokenType?: StringFilter<"OAuthToken"> | string
    scope?: StringFilter<"OAuthToken"> | string
    createdAt?: DateTimeFilter<"OAuthToken"> | Date | string
    updatedAt?: DateTimeFilter<"OAuthToken"> | Date | string
    account?: XOR<ConnectedAccountRelationFilter, ConnectedAccountWhereInput>
  }

  export type OAuthTokenOrderByWithRelationInput = {
    id?: SortOrder
    accountId?: SortOrder
    accessTokenEnc?: SortOrder
    refreshTokenEnc?: SortOrder
    keyVersion?: SortOrder
    encryptionKeyId?: SortOrder
    accessTokenExpiresAt?: SortOrder
    tokenType?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    account?: ConnectedAccountOrderByWithRelationInput
  }

  export type OAuthTokenWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    accountId?: string
    AND?: OAuthTokenWhereInput | OAuthTokenWhereInput[]
    OR?: OAuthTokenWhereInput[]
    NOT?: OAuthTokenWhereInput | OAuthTokenWhereInput[]
    accessTokenEnc?: StringFilter<"OAuthToken"> | string
    refreshTokenEnc?: StringFilter<"OAuthToken"> | string
    keyVersion?: IntFilter<"OAuthToken"> | number
    encryptionKeyId?: StringFilter<"OAuthToken"> | string
    accessTokenExpiresAt?: DateTimeFilter<"OAuthToken"> | Date | string
    tokenType?: StringFilter<"OAuthToken"> | string
    scope?: StringFilter<"OAuthToken"> | string
    createdAt?: DateTimeFilter<"OAuthToken"> | Date | string
    updatedAt?: DateTimeFilter<"OAuthToken"> | Date | string
    account?: XOR<ConnectedAccountRelationFilter, ConnectedAccountWhereInput>
  }, "id" | "accountId">

  export type OAuthTokenOrderByWithAggregationInput = {
    id?: SortOrder
    accountId?: SortOrder
    accessTokenEnc?: SortOrder
    refreshTokenEnc?: SortOrder
    keyVersion?: SortOrder
    encryptionKeyId?: SortOrder
    accessTokenExpiresAt?: SortOrder
    tokenType?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OAuthTokenCountOrderByAggregateInput
    _avg?: OAuthTokenAvgOrderByAggregateInput
    _max?: OAuthTokenMaxOrderByAggregateInput
    _min?: OAuthTokenMinOrderByAggregateInput
    _sum?: OAuthTokenSumOrderByAggregateInput
  }

  export type OAuthTokenScalarWhereWithAggregatesInput = {
    AND?: OAuthTokenScalarWhereWithAggregatesInput | OAuthTokenScalarWhereWithAggregatesInput[]
    OR?: OAuthTokenScalarWhereWithAggregatesInput[]
    NOT?: OAuthTokenScalarWhereWithAggregatesInput | OAuthTokenScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"OAuthToken"> | string
    accountId?: StringWithAggregatesFilter<"OAuthToken"> | string
    accessTokenEnc?: StringWithAggregatesFilter<"OAuthToken"> | string
    refreshTokenEnc?: StringWithAggregatesFilter<"OAuthToken"> | string
    keyVersion?: IntWithAggregatesFilter<"OAuthToken"> | number
    encryptionKeyId?: StringWithAggregatesFilter<"OAuthToken"> | string
    accessTokenExpiresAt?: DateTimeWithAggregatesFilter<"OAuthToken"> | Date | string
    tokenType?: StringWithAggregatesFilter<"OAuthToken"> | string
    scope?: StringWithAggregatesFilter<"OAuthToken"> | string
    createdAt?: DateTimeWithAggregatesFilter<"OAuthToken"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"OAuthToken"> | Date | string
  }

  export type SyncStateWhereInput = {
    AND?: SyncStateWhereInput | SyncStateWhereInput[]
    OR?: SyncStateWhereInput[]
    NOT?: SyncStateWhereInput | SyncStateWhereInput[]
    id?: StringFilter<"SyncState"> | string
    accountId?: StringFilter<"SyncState"> | string
    emailHistoryId?: StringNullableFilter<"SyncState"> | string | null
    calendarSyncToken?: StringNullableFilter<"SyncState"> | string | null
    gmailHistoryId?: StringNullableFilter<"SyncState"> | string | null
    gmailWatchExpiry?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    mailDeltaLink?: StringNullableFilter<"SyncState"> | string | null
    calendarDeltaLink?: StringNullableFilter<"SyncState"> | string | null
    googleCalendarSyncToken?: StringNullableFilter<"SyncState"> | string | null
    emailSubscriptionId?: StringNullableFilter<"SyncState"> | string | null
    mailSubscriptionId?: StringNullableFilter<"SyncState"> | string | null
    calendarSubscriptionId?: StringNullableFilter<"SyncState"> | string | null
    subscriptionExpiry?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    lastEmailSync?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    lastCalendarSync?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    emailSyncStatus?: StringNullableFilter<"SyncState"> | string | null
    calendarSyncStatus?: StringNullableFilter<"SyncState"> | string | null
    errorMessage?: StringNullableFilter<"SyncState"> | string | null
    usePolling?: BoolFilter<"SyncState"> | boolean
    lastPollAt?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    pollErrorCount?: IntFilter<"SyncState"> | number
    createdAt?: DateTimeFilter<"SyncState"> | Date | string
    updatedAt?: DateTimeFilter<"SyncState"> | Date | string
    account?: XOR<ConnectedAccountRelationFilter, ConnectedAccountWhereInput>
  }

  export type SyncStateOrderByWithRelationInput = {
    id?: SortOrder
    accountId?: SortOrder
    emailHistoryId?: SortOrderInput | SortOrder
    calendarSyncToken?: SortOrderInput | SortOrder
    gmailHistoryId?: SortOrderInput | SortOrder
    gmailWatchExpiry?: SortOrderInput | SortOrder
    mailDeltaLink?: SortOrderInput | SortOrder
    calendarDeltaLink?: SortOrderInput | SortOrder
    googleCalendarSyncToken?: SortOrderInput | SortOrder
    emailSubscriptionId?: SortOrderInput | SortOrder
    mailSubscriptionId?: SortOrderInput | SortOrder
    calendarSubscriptionId?: SortOrderInput | SortOrder
    subscriptionExpiry?: SortOrderInput | SortOrder
    lastEmailSync?: SortOrderInput | SortOrder
    lastCalendarSync?: SortOrderInput | SortOrder
    emailSyncStatus?: SortOrderInput | SortOrder
    calendarSyncStatus?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    usePolling?: SortOrder
    lastPollAt?: SortOrderInput | SortOrder
    pollErrorCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    account?: ConnectedAccountOrderByWithRelationInput
  }

  export type SyncStateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    accountId?: string
    AND?: SyncStateWhereInput | SyncStateWhereInput[]
    OR?: SyncStateWhereInput[]
    NOT?: SyncStateWhereInput | SyncStateWhereInput[]
    emailHistoryId?: StringNullableFilter<"SyncState"> | string | null
    calendarSyncToken?: StringNullableFilter<"SyncState"> | string | null
    gmailHistoryId?: StringNullableFilter<"SyncState"> | string | null
    gmailWatchExpiry?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    mailDeltaLink?: StringNullableFilter<"SyncState"> | string | null
    calendarDeltaLink?: StringNullableFilter<"SyncState"> | string | null
    googleCalendarSyncToken?: StringNullableFilter<"SyncState"> | string | null
    emailSubscriptionId?: StringNullableFilter<"SyncState"> | string | null
    mailSubscriptionId?: StringNullableFilter<"SyncState"> | string | null
    calendarSubscriptionId?: StringNullableFilter<"SyncState"> | string | null
    subscriptionExpiry?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    lastEmailSync?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    lastCalendarSync?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    emailSyncStatus?: StringNullableFilter<"SyncState"> | string | null
    calendarSyncStatus?: StringNullableFilter<"SyncState"> | string | null
    errorMessage?: StringNullableFilter<"SyncState"> | string | null
    usePolling?: BoolFilter<"SyncState"> | boolean
    lastPollAt?: DateTimeNullableFilter<"SyncState"> | Date | string | null
    pollErrorCount?: IntFilter<"SyncState"> | number
    createdAt?: DateTimeFilter<"SyncState"> | Date | string
    updatedAt?: DateTimeFilter<"SyncState"> | Date | string
    account?: XOR<ConnectedAccountRelationFilter, ConnectedAccountWhereInput>
  }, "id" | "accountId">

  export type SyncStateOrderByWithAggregationInput = {
    id?: SortOrder
    accountId?: SortOrder
    emailHistoryId?: SortOrderInput | SortOrder
    calendarSyncToken?: SortOrderInput | SortOrder
    gmailHistoryId?: SortOrderInput | SortOrder
    gmailWatchExpiry?: SortOrderInput | SortOrder
    mailDeltaLink?: SortOrderInput | SortOrder
    calendarDeltaLink?: SortOrderInput | SortOrder
    googleCalendarSyncToken?: SortOrderInput | SortOrder
    emailSubscriptionId?: SortOrderInput | SortOrder
    mailSubscriptionId?: SortOrderInput | SortOrder
    calendarSubscriptionId?: SortOrderInput | SortOrder
    subscriptionExpiry?: SortOrderInput | SortOrder
    lastEmailSync?: SortOrderInput | SortOrder
    lastCalendarSync?: SortOrderInput | SortOrder
    emailSyncStatus?: SortOrderInput | SortOrder
    calendarSyncStatus?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    usePolling?: SortOrder
    lastPollAt?: SortOrderInput | SortOrder
    pollErrorCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SyncStateCountOrderByAggregateInput
    _avg?: SyncStateAvgOrderByAggregateInput
    _max?: SyncStateMaxOrderByAggregateInput
    _min?: SyncStateMinOrderByAggregateInput
    _sum?: SyncStateSumOrderByAggregateInput
  }

  export type SyncStateScalarWhereWithAggregatesInput = {
    AND?: SyncStateScalarWhereWithAggregatesInput | SyncStateScalarWhereWithAggregatesInput[]
    OR?: SyncStateScalarWhereWithAggregatesInput[]
    NOT?: SyncStateScalarWhereWithAggregatesInput | SyncStateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SyncState"> | string
    accountId?: StringWithAggregatesFilter<"SyncState"> | string
    emailHistoryId?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    calendarSyncToken?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    gmailHistoryId?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    gmailWatchExpiry?: DateTimeNullableWithAggregatesFilter<"SyncState"> | Date | string | null
    mailDeltaLink?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    calendarDeltaLink?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    googleCalendarSyncToken?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    emailSubscriptionId?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    mailSubscriptionId?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    calendarSubscriptionId?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    subscriptionExpiry?: DateTimeNullableWithAggregatesFilter<"SyncState"> | Date | string | null
    lastEmailSync?: DateTimeNullableWithAggregatesFilter<"SyncState"> | Date | string | null
    lastCalendarSync?: DateTimeNullableWithAggregatesFilter<"SyncState"> | Date | string | null
    emailSyncStatus?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    calendarSyncStatus?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    errorMessage?: StringNullableWithAggregatesFilter<"SyncState"> | string | null
    usePolling?: BoolWithAggregatesFilter<"SyncState"> | boolean
    lastPollAt?: DateTimeNullableWithAggregatesFilter<"SyncState"> | Date | string | null
    pollErrorCount?: IntWithAggregatesFilter<"SyncState"> | number
    createdAt?: DateTimeWithAggregatesFilter<"SyncState"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SyncState"> | Date | string
  }

  export type ApprovalWhereInput = {
    AND?: ApprovalWhereInput | ApprovalWhereInput[]
    OR?: ApprovalWhereInput[]
    NOT?: ApprovalWhereInput | ApprovalWhereInput[]
    id?: StringFilter<"Approval"> | string
    tenantId?: StringFilter<"Approval"> | string
    userId?: StringFilter<"Approval"> | string
    accountId?: StringFilter<"Approval"> | string
    actionType?: StringFilter<"Approval"> | string
    status?: StringFilter<"Approval"> | string
    actionPayload?: StringFilter<"Approval"> | string
    riskLevel?: StringFilter<"Approval"> | string
    riskReason?: StringNullableFilter<"Approval"> | string | null
    requestedAt?: DateTimeFilter<"Approval"> | Date | string
    expiresAt?: DateTimeFilter<"Approval"> | Date | string
    decidedAt?: DateTimeNullableFilter<"Approval"> | Date | string | null
    decidedBy?: StringNullableFilter<"Approval"> | string | null
    correlationId?: StringFilter<"Approval"> | string
    createdAt?: DateTimeFilter<"Approval"> | Date | string
    account?: XOR<ConnectedAccountRelationFilter, ConnectedAccountWhereInput>
  }

  export type ApprovalOrderByWithRelationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    actionType?: SortOrder
    status?: SortOrder
    actionPayload?: SortOrder
    riskLevel?: SortOrder
    riskReason?: SortOrderInput | SortOrder
    requestedAt?: SortOrder
    expiresAt?: SortOrder
    decidedAt?: SortOrderInput | SortOrder
    decidedBy?: SortOrderInput | SortOrder
    correlationId?: SortOrder
    createdAt?: SortOrder
    account?: ConnectedAccountOrderByWithRelationInput
  }

  export type ApprovalWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ApprovalWhereInput | ApprovalWhereInput[]
    OR?: ApprovalWhereInput[]
    NOT?: ApprovalWhereInput | ApprovalWhereInput[]
    tenantId?: StringFilter<"Approval"> | string
    userId?: StringFilter<"Approval"> | string
    accountId?: StringFilter<"Approval"> | string
    actionType?: StringFilter<"Approval"> | string
    status?: StringFilter<"Approval"> | string
    actionPayload?: StringFilter<"Approval"> | string
    riskLevel?: StringFilter<"Approval"> | string
    riskReason?: StringNullableFilter<"Approval"> | string | null
    requestedAt?: DateTimeFilter<"Approval"> | Date | string
    expiresAt?: DateTimeFilter<"Approval"> | Date | string
    decidedAt?: DateTimeNullableFilter<"Approval"> | Date | string | null
    decidedBy?: StringNullableFilter<"Approval"> | string | null
    correlationId?: StringFilter<"Approval"> | string
    createdAt?: DateTimeFilter<"Approval"> | Date | string
    account?: XOR<ConnectedAccountRelationFilter, ConnectedAccountWhereInput>
  }, "id">

  export type ApprovalOrderByWithAggregationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    actionType?: SortOrder
    status?: SortOrder
    actionPayload?: SortOrder
    riskLevel?: SortOrder
    riskReason?: SortOrderInput | SortOrder
    requestedAt?: SortOrder
    expiresAt?: SortOrder
    decidedAt?: SortOrderInput | SortOrder
    decidedBy?: SortOrderInput | SortOrder
    correlationId?: SortOrder
    createdAt?: SortOrder
    _count?: ApprovalCountOrderByAggregateInput
    _max?: ApprovalMaxOrderByAggregateInput
    _min?: ApprovalMinOrderByAggregateInput
  }

  export type ApprovalScalarWhereWithAggregatesInput = {
    AND?: ApprovalScalarWhereWithAggregatesInput | ApprovalScalarWhereWithAggregatesInput[]
    OR?: ApprovalScalarWhereWithAggregatesInput[]
    NOT?: ApprovalScalarWhereWithAggregatesInput | ApprovalScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Approval"> | string
    tenantId?: StringWithAggregatesFilter<"Approval"> | string
    userId?: StringWithAggregatesFilter<"Approval"> | string
    accountId?: StringWithAggregatesFilter<"Approval"> | string
    actionType?: StringWithAggregatesFilter<"Approval"> | string
    status?: StringWithAggregatesFilter<"Approval"> | string
    actionPayload?: StringWithAggregatesFilter<"Approval"> | string
    riskLevel?: StringWithAggregatesFilter<"Approval"> | string
    riskReason?: StringNullableWithAggregatesFilter<"Approval"> | string | null
    requestedAt?: DateTimeWithAggregatesFilter<"Approval"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"Approval"> | Date | string
    decidedAt?: DateTimeNullableWithAggregatesFilter<"Approval"> | Date | string | null
    decidedBy?: StringNullableWithAggregatesFilter<"Approval"> | string | null
    correlationId?: StringWithAggregatesFilter<"Approval"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Approval"> | Date | string
  }

  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    tenantId?: StringFilter<"AuditLog"> | string
    userId?: StringFilter<"AuditLog"> | string
    accountId?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    resourceType?: StringFilter<"AuditLog"> | string
    resourceId?: StringNullableFilter<"AuditLog"> | string | null
    correlationId?: StringFilter<"AuditLog"> | string
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    userAgent?: StringNullableFilter<"AuditLog"> | string | null
    status?: StringFilter<"AuditLog"> | string
    errorCode?: StringNullableFilter<"AuditLog"> | string | null
    metadata?: StringNullableFilter<"AuditLog"> | string | null
    durationMs?: IntNullableFilter<"AuditLog"> | number | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    account?: XOR<ConnectedAccountNullableRelationFilter, ConnectedAccountWhereInput> | null
  }

  export type AuditLogOrderByWithRelationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrderInput | SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrderInput | SortOrder
    correlationId?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    status?: SortOrder
    errorCode?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    account?: ConnectedAccountOrderByWithRelationInput
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    tenantId?: StringFilter<"AuditLog"> | string
    userId?: StringFilter<"AuditLog"> | string
    accountId?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    resourceType?: StringFilter<"AuditLog"> | string
    resourceId?: StringNullableFilter<"AuditLog"> | string | null
    correlationId?: StringFilter<"AuditLog"> | string
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    userAgent?: StringNullableFilter<"AuditLog"> | string | null
    status?: StringFilter<"AuditLog"> | string
    errorCode?: StringNullableFilter<"AuditLog"> | string | null
    metadata?: StringNullableFilter<"AuditLog"> | string | null
    durationMs?: IntNullableFilter<"AuditLog"> | number | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    account?: XOR<ConnectedAccountNullableRelationFilter, ConnectedAccountWhereInput> | null
  }, "id">

  export type AuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrderInput | SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrderInput | SortOrder
    correlationId?: SortOrder
    ipAddress?: SortOrderInput | SortOrder
    userAgent?: SortOrderInput | SortOrder
    status?: SortOrder
    errorCode?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    durationMs?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _avg?: AuditLogAvgOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
    _sum?: AuditLogSumOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AuditLog"> | string
    tenantId?: StringWithAggregatesFilter<"AuditLog"> | string
    userId?: StringWithAggregatesFilter<"AuditLog"> | string
    accountId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    action?: StringWithAggregatesFilter<"AuditLog"> | string
    resourceType?: StringWithAggregatesFilter<"AuditLog"> | string
    resourceId?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    correlationId?: StringWithAggregatesFilter<"AuditLog"> | string
    ipAddress?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    userAgent?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    status?: StringWithAggregatesFilter<"AuditLog"> | string
    errorCode?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    metadata?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    durationMs?: IntNullableWithAggregatesFilter<"AuditLog"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
  }

  export type ProcessedEventWhereInput = {
    AND?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    OR?: ProcessedEventWhereInput[]
    NOT?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    id?: StringFilter<"ProcessedEvent"> | string
    idempotencyKey?: StringFilter<"ProcessedEvent"> | string
    eventId?: StringFilter<"ProcessedEvent"> | string
    eventType?: StringFilter<"ProcessedEvent"> | string
    accountId?: StringFilter<"ProcessedEvent"> | string
    provider?: StringNullableFilter<"ProcessedEvent"> | string | null
    payload?: StringNullableFilter<"ProcessedEvent"> | string | null
    processedAt?: DateTimeFilter<"ProcessedEvent"> | Date | string
    expiresAt?: DateTimeFilter<"ProcessedEvent"> | Date | string
  }

  export type ProcessedEventOrderByWithRelationInput = {
    id?: SortOrder
    idempotencyKey?: SortOrder
    eventId?: SortOrder
    eventType?: SortOrder
    accountId?: SortOrder
    provider?: SortOrderInput | SortOrder
    payload?: SortOrderInput | SortOrder
    processedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type ProcessedEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    idempotencyKey?: string
    AND?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    OR?: ProcessedEventWhereInput[]
    NOT?: ProcessedEventWhereInput | ProcessedEventWhereInput[]
    eventId?: StringFilter<"ProcessedEvent"> | string
    eventType?: StringFilter<"ProcessedEvent"> | string
    accountId?: StringFilter<"ProcessedEvent"> | string
    provider?: StringNullableFilter<"ProcessedEvent"> | string | null
    payload?: StringNullableFilter<"ProcessedEvent"> | string | null
    processedAt?: DateTimeFilter<"ProcessedEvent"> | Date | string
    expiresAt?: DateTimeFilter<"ProcessedEvent"> | Date | string
  }, "id" | "idempotencyKey">

  export type ProcessedEventOrderByWithAggregationInput = {
    id?: SortOrder
    idempotencyKey?: SortOrder
    eventId?: SortOrder
    eventType?: SortOrder
    accountId?: SortOrder
    provider?: SortOrderInput | SortOrder
    payload?: SortOrderInput | SortOrder
    processedAt?: SortOrder
    expiresAt?: SortOrder
    _count?: ProcessedEventCountOrderByAggregateInput
    _max?: ProcessedEventMaxOrderByAggregateInput
    _min?: ProcessedEventMinOrderByAggregateInput
  }

  export type ProcessedEventScalarWhereWithAggregatesInput = {
    AND?: ProcessedEventScalarWhereWithAggregatesInput | ProcessedEventScalarWhereWithAggregatesInput[]
    OR?: ProcessedEventScalarWhereWithAggregatesInput[]
    NOT?: ProcessedEventScalarWhereWithAggregatesInput | ProcessedEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    idempotencyKey?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    eventId?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    eventType?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    accountId?: StringWithAggregatesFilter<"ProcessedEvent"> | string
    provider?: StringNullableWithAggregatesFilter<"ProcessedEvent"> | string | null
    payload?: StringNullableWithAggregatesFilter<"ProcessedEvent"> | string | null
    processedAt?: DateTimeWithAggregatesFilter<"ProcessedEvent"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"ProcessedEvent"> | Date | string
  }

  export type EncryptionKeyWhereInput = {
    AND?: EncryptionKeyWhereInput | EncryptionKeyWhereInput[]
    OR?: EncryptionKeyWhereInput[]
    NOT?: EncryptionKeyWhereInput | EncryptionKeyWhereInput[]
    id?: StringFilter<"EncryptionKey"> | string
    tenantId?: StringFilter<"EncryptionKey"> | string
    version?: IntFilter<"EncryptionKey"> | number
    keyEncrypted?: StringFilter<"EncryptionKey"> | string
    algorithm?: StringFilter<"EncryptionKey"> | string
    status?: StringFilter<"EncryptionKey"> | string
    createdAt?: DateTimeFilter<"EncryptionKey"> | Date | string
    rotatedAt?: DateTimeNullableFilter<"EncryptionKey"> | Date | string | null
    expiresAt?: DateTimeNullableFilter<"EncryptionKey"> | Date | string | null
  }

  export type EncryptionKeyOrderByWithRelationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    version?: SortOrder
    keyEncrypted?: SortOrder
    algorithm?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    rotatedAt?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
  }

  export type EncryptionKeyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    tenantId_version?: EncryptionKeyTenantIdVersionCompoundUniqueInput
    AND?: EncryptionKeyWhereInput | EncryptionKeyWhereInput[]
    OR?: EncryptionKeyWhereInput[]
    NOT?: EncryptionKeyWhereInput | EncryptionKeyWhereInput[]
    tenantId?: StringFilter<"EncryptionKey"> | string
    version?: IntFilter<"EncryptionKey"> | number
    keyEncrypted?: StringFilter<"EncryptionKey"> | string
    algorithm?: StringFilter<"EncryptionKey"> | string
    status?: StringFilter<"EncryptionKey"> | string
    createdAt?: DateTimeFilter<"EncryptionKey"> | Date | string
    rotatedAt?: DateTimeNullableFilter<"EncryptionKey"> | Date | string | null
    expiresAt?: DateTimeNullableFilter<"EncryptionKey"> | Date | string | null
  }, "id" | "tenantId_version">

  export type EncryptionKeyOrderByWithAggregationInput = {
    id?: SortOrder
    tenantId?: SortOrder
    version?: SortOrder
    keyEncrypted?: SortOrder
    algorithm?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    rotatedAt?: SortOrderInput | SortOrder
    expiresAt?: SortOrderInput | SortOrder
    _count?: EncryptionKeyCountOrderByAggregateInput
    _avg?: EncryptionKeyAvgOrderByAggregateInput
    _max?: EncryptionKeyMaxOrderByAggregateInput
    _min?: EncryptionKeyMinOrderByAggregateInput
    _sum?: EncryptionKeySumOrderByAggregateInput
  }

  export type EncryptionKeyScalarWhereWithAggregatesInput = {
    AND?: EncryptionKeyScalarWhereWithAggregatesInput | EncryptionKeyScalarWhereWithAggregatesInput[]
    OR?: EncryptionKeyScalarWhereWithAggregatesInput[]
    NOT?: EncryptionKeyScalarWhereWithAggregatesInput | EncryptionKeyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"EncryptionKey"> | string
    tenantId?: StringWithAggregatesFilter<"EncryptionKey"> | string
    version?: IntWithAggregatesFilter<"EncryptionKey"> | number
    keyEncrypted?: StringWithAggregatesFilter<"EncryptionKey"> | string
    algorithm?: StringWithAggregatesFilter<"EncryptionKey"> | string
    status?: StringWithAggregatesFilter<"EncryptionKey"> | string
    createdAt?: DateTimeWithAggregatesFilter<"EncryptionKey"> | Date | string
    rotatedAt?: DateTimeNullableWithAggregatesFilter<"EncryptionKey"> | Date | string | null
    expiresAt?: DateTimeNullableWithAggregatesFilter<"EncryptionKey"> | Date | string | null
  }

  export type CachedMessageWhereInput = {
    AND?: CachedMessageWhereInput | CachedMessageWhereInput[]
    OR?: CachedMessageWhereInput[]
    NOT?: CachedMessageWhereInput | CachedMessageWhereInput[]
    id?: StringFilter<"CachedMessage"> | string
    accountId?: StringFilter<"CachedMessage"> | string
    providerId?: StringFilter<"CachedMessage"> | string
    threadId?: StringFilter<"CachedMessage"> | string
    internetMessageId?: StringFilter<"CachedMessage"> | string
    fromEmail?: StringFilter<"CachedMessage"> | string
    fromName?: StringNullableFilter<"CachedMessage"> | string | null
    subject?: StringNullableFilter<"CachedMessage"> | string | null
    snippet?: StringNullableFilter<"CachedMessage"> | string | null
    labels?: StringFilter<"CachedMessage"> | string
    isRead?: BoolFilter<"CachedMessage"> | boolean
    isDraft?: BoolFilter<"CachedMessage"> | boolean
    sentAt?: DateTimeFilter<"CachedMessage"> | Date | string
    receivedAt?: DateTimeFilter<"CachedMessage"> | Date | string
    createdAt?: DateTimeFilter<"CachedMessage"> | Date | string
    updatedAt?: DateTimeFilter<"CachedMessage"> | Date | string
  }

  export type CachedMessageOrderByWithRelationInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    threadId?: SortOrder
    internetMessageId?: SortOrder
    fromEmail?: SortOrder
    fromName?: SortOrderInput | SortOrder
    subject?: SortOrderInput | SortOrder
    snippet?: SortOrderInput | SortOrder
    labels?: SortOrder
    isRead?: SortOrder
    isDraft?: SortOrder
    sentAt?: SortOrder
    receivedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedMessageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    accountId_providerId?: CachedMessageAccountIdProviderIdCompoundUniqueInput
    AND?: CachedMessageWhereInput | CachedMessageWhereInput[]
    OR?: CachedMessageWhereInput[]
    NOT?: CachedMessageWhereInput | CachedMessageWhereInput[]
    accountId?: StringFilter<"CachedMessage"> | string
    providerId?: StringFilter<"CachedMessage"> | string
    threadId?: StringFilter<"CachedMessage"> | string
    internetMessageId?: StringFilter<"CachedMessage"> | string
    fromEmail?: StringFilter<"CachedMessage"> | string
    fromName?: StringNullableFilter<"CachedMessage"> | string | null
    subject?: StringNullableFilter<"CachedMessage"> | string | null
    snippet?: StringNullableFilter<"CachedMessage"> | string | null
    labels?: StringFilter<"CachedMessage"> | string
    isRead?: BoolFilter<"CachedMessage"> | boolean
    isDraft?: BoolFilter<"CachedMessage"> | boolean
    sentAt?: DateTimeFilter<"CachedMessage"> | Date | string
    receivedAt?: DateTimeFilter<"CachedMessage"> | Date | string
    createdAt?: DateTimeFilter<"CachedMessage"> | Date | string
    updatedAt?: DateTimeFilter<"CachedMessage"> | Date | string
  }, "id" | "accountId_providerId">

  export type CachedMessageOrderByWithAggregationInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    threadId?: SortOrder
    internetMessageId?: SortOrder
    fromEmail?: SortOrder
    fromName?: SortOrderInput | SortOrder
    subject?: SortOrderInput | SortOrder
    snippet?: SortOrderInput | SortOrder
    labels?: SortOrder
    isRead?: SortOrder
    isDraft?: SortOrder
    sentAt?: SortOrder
    receivedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CachedMessageCountOrderByAggregateInput
    _max?: CachedMessageMaxOrderByAggregateInput
    _min?: CachedMessageMinOrderByAggregateInput
  }

  export type CachedMessageScalarWhereWithAggregatesInput = {
    AND?: CachedMessageScalarWhereWithAggregatesInput | CachedMessageScalarWhereWithAggregatesInput[]
    OR?: CachedMessageScalarWhereWithAggregatesInput[]
    NOT?: CachedMessageScalarWhereWithAggregatesInput | CachedMessageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CachedMessage"> | string
    accountId?: StringWithAggregatesFilter<"CachedMessage"> | string
    providerId?: StringWithAggregatesFilter<"CachedMessage"> | string
    threadId?: StringWithAggregatesFilter<"CachedMessage"> | string
    internetMessageId?: StringWithAggregatesFilter<"CachedMessage"> | string
    fromEmail?: StringWithAggregatesFilter<"CachedMessage"> | string
    fromName?: StringNullableWithAggregatesFilter<"CachedMessage"> | string | null
    subject?: StringNullableWithAggregatesFilter<"CachedMessage"> | string | null
    snippet?: StringNullableWithAggregatesFilter<"CachedMessage"> | string | null
    labels?: StringWithAggregatesFilter<"CachedMessage"> | string
    isRead?: BoolWithAggregatesFilter<"CachedMessage"> | boolean
    isDraft?: BoolWithAggregatesFilter<"CachedMessage"> | boolean
    sentAt?: DateTimeWithAggregatesFilter<"CachedMessage"> | Date | string
    receivedAt?: DateTimeWithAggregatesFilter<"CachedMessage"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"CachedMessage"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CachedMessage"> | Date | string
  }

  export type CachedEventWhereInput = {
    AND?: CachedEventWhereInput | CachedEventWhereInput[]
    OR?: CachedEventWhereInput[]
    NOT?: CachedEventWhereInput | CachedEventWhereInput[]
    id?: StringFilter<"CachedEvent"> | string
    accountId?: StringFilter<"CachedEvent"> | string
    providerId?: StringFilter<"CachedEvent"> | string
    calendarId?: StringFilter<"CachedEvent"> | string
    title?: StringFilter<"CachedEvent"> | string
    description?: StringNullableFilter<"CachedEvent"> | string | null
    location?: StringNullableFilter<"CachedEvent"> | string | null
    startTime?: DateTimeFilter<"CachedEvent"> | Date | string
    endTime?: DateTimeFilter<"CachedEvent"> | Date | string
    isAllDay?: BoolFilter<"CachedEvent"> | boolean
    timezone?: StringNullableFilter<"CachedEvent"> | string | null
    organizerEmail?: StringFilter<"CachedEvent"> | string
    organizerName?: StringNullableFilter<"CachedEvent"> | string | null
    status?: StringFilter<"CachedEvent"> | string
    visibility?: StringFilter<"CachedEvent"> | string
    createdAt?: DateTimeFilter<"CachedEvent"> | Date | string
    updatedAt?: DateTimeFilter<"CachedEvent"> | Date | string
  }

  export type CachedEventOrderByWithRelationInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    calendarId?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    isAllDay?: SortOrder
    timezone?: SortOrderInput | SortOrder
    organizerEmail?: SortOrder
    organizerName?: SortOrderInput | SortOrder
    status?: SortOrder
    visibility?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    accountId_providerId?: CachedEventAccountIdProviderIdCompoundUniqueInput
    AND?: CachedEventWhereInput | CachedEventWhereInput[]
    OR?: CachedEventWhereInput[]
    NOT?: CachedEventWhereInput | CachedEventWhereInput[]
    accountId?: StringFilter<"CachedEvent"> | string
    providerId?: StringFilter<"CachedEvent"> | string
    calendarId?: StringFilter<"CachedEvent"> | string
    title?: StringFilter<"CachedEvent"> | string
    description?: StringNullableFilter<"CachedEvent"> | string | null
    location?: StringNullableFilter<"CachedEvent"> | string | null
    startTime?: DateTimeFilter<"CachedEvent"> | Date | string
    endTime?: DateTimeFilter<"CachedEvent"> | Date | string
    isAllDay?: BoolFilter<"CachedEvent"> | boolean
    timezone?: StringNullableFilter<"CachedEvent"> | string | null
    organizerEmail?: StringFilter<"CachedEvent"> | string
    organizerName?: StringNullableFilter<"CachedEvent"> | string | null
    status?: StringFilter<"CachedEvent"> | string
    visibility?: StringFilter<"CachedEvent"> | string
    createdAt?: DateTimeFilter<"CachedEvent"> | Date | string
    updatedAt?: DateTimeFilter<"CachedEvent"> | Date | string
  }, "id" | "accountId_providerId">

  export type CachedEventOrderByWithAggregationInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    calendarId?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    location?: SortOrderInput | SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    isAllDay?: SortOrder
    timezone?: SortOrderInput | SortOrder
    organizerEmail?: SortOrder
    organizerName?: SortOrderInput | SortOrder
    status?: SortOrder
    visibility?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CachedEventCountOrderByAggregateInput
    _max?: CachedEventMaxOrderByAggregateInput
    _min?: CachedEventMinOrderByAggregateInput
  }

  export type CachedEventScalarWhereWithAggregatesInput = {
    AND?: CachedEventScalarWhereWithAggregatesInput | CachedEventScalarWhereWithAggregatesInput[]
    OR?: CachedEventScalarWhereWithAggregatesInput[]
    NOT?: CachedEventScalarWhereWithAggregatesInput | CachedEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"CachedEvent"> | string
    accountId?: StringWithAggregatesFilter<"CachedEvent"> | string
    providerId?: StringWithAggregatesFilter<"CachedEvent"> | string
    calendarId?: StringWithAggregatesFilter<"CachedEvent"> | string
    title?: StringWithAggregatesFilter<"CachedEvent"> | string
    description?: StringNullableWithAggregatesFilter<"CachedEvent"> | string | null
    location?: StringNullableWithAggregatesFilter<"CachedEvent"> | string | null
    startTime?: DateTimeWithAggregatesFilter<"CachedEvent"> | Date | string
    endTime?: DateTimeWithAggregatesFilter<"CachedEvent"> | Date | string
    isAllDay?: BoolWithAggregatesFilter<"CachedEvent"> | boolean
    timezone?: StringNullableWithAggregatesFilter<"CachedEvent"> | string | null
    organizerEmail?: StringWithAggregatesFilter<"CachedEvent"> | string
    organizerName?: StringNullableWithAggregatesFilter<"CachedEvent"> | string | null
    status?: StringWithAggregatesFilter<"CachedEvent"> | string
    visibility?: StringWithAggregatesFilter<"CachedEvent"> | string
    createdAt?: DateTimeWithAggregatesFilter<"CachedEvent"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CachedEvent"> | Date | string
  }

  export type ConnectedAccountCreateInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenCreateNestedOneWithoutAccountInput
    syncState?: SyncStateCreateNestedOneWithoutAccountInput
    approvals?: ApprovalCreateNestedManyWithoutAccountInput
    auditLogs?: AuditLogCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountUncheckedCreateInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenUncheckedCreateNestedOneWithoutAccountInput
    syncState?: SyncStateUncheckedCreateNestedOneWithoutAccountInput
    approvals?: ApprovalUncheckedCreateNestedManyWithoutAccountInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUpdateOneWithoutAccountNestedInput
    syncState?: SyncStateUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUpdateManyWithoutAccountNestedInput
    auditLogs?: AuditLogUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUncheckedUpdateOneWithoutAccountNestedInput
    syncState?: SyncStateUncheckedUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUncheckedUpdateManyWithoutAccountNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountCreateManyInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
  }

  export type ConnectedAccountUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ConnectedAccountUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type OAuthTokenCreateInput = {
    id?: string
    accessTokenEnc: string
    refreshTokenEnc: string
    keyVersion?: number
    encryptionKeyId: string
    accessTokenExpiresAt: Date | string
    tokenType?: string
    scope: string
    createdAt?: Date | string
    updatedAt?: Date | string
    account: ConnectedAccountCreateNestedOneWithoutOauthTokenInput
  }

  export type OAuthTokenUncheckedCreateInput = {
    id?: string
    accountId: string
    accessTokenEnc: string
    refreshTokenEnc: string
    keyVersion?: number
    encryptionKeyId: string
    accessTokenExpiresAt: Date | string
    tokenType?: string
    scope: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OAuthTokenUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accessTokenEnc?: StringFieldUpdateOperationsInput | string
    refreshTokenEnc?: StringFieldUpdateOperationsInput | string
    keyVersion?: IntFieldUpdateOperationsInput | number
    encryptionKeyId?: StringFieldUpdateOperationsInput | string
    accessTokenExpiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tokenType?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    account?: ConnectedAccountUpdateOneRequiredWithoutOauthTokenNestedInput
  }

  export type OAuthTokenUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    accessTokenEnc?: StringFieldUpdateOperationsInput | string
    refreshTokenEnc?: StringFieldUpdateOperationsInput | string
    keyVersion?: IntFieldUpdateOperationsInput | number
    encryptionKeyId?: StringFieldUpdateOperationsInput | string
    accessTokenExpiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tokenType?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OAuthTokenCreateManyInput = {
    id?: string
    accountId: string
    accessTokenEnc: string
    refreshTokenEnc: string
    keyVersion?: number
    encryptionKeyId: string
    accessTokenExpiresAt: Date | string
    tokenType?: string
    scope: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OAuthTokenUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    accessTokenEnc?: StringFieldUpdateOperationsInput | string
    refreshTokenEnc?: StringFieldUpdateOperationsInput | string
    keyVersion?: IntFieldUpdateOperationsInput | number
    encryptionKeyId?: StringFieldUpdateOperationsInput | string
    accessTokenExpiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tokenType?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OAuthTokenUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    accessTokenEnc?: StringFieldUpdateOperationsInput | string
    refreshTokenEnc?: StringFieldUpdateOperationsInput | string
    keyVersion?: IntFieldUpdateOperationsInput | number
    encryptionKeyId?: StringFieldUpdateOperationsInput | string
    accessTokenExpiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tokenType?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateCreateInput = {
    id?: string
    emailHistoryId?: string | null
    calendarSyncToken?: string | null
    gmailHistoryId?: string | null
    gmailWatchExpiry?: Date | string | null
    mailDeltaLink?: string | null
    calendarDeltaLink?: string | null
    googleCalendarSyncToken?: string | null
    emailSubscriptionId?: string | null
    mailSubscriptionId?: string | null
    calendarSubscriptionId?: string | null
    subscriptionExpiry?: Date | string | null
    lastEmailSync?: Date | string | null
    lastCalendarSync?: Date | string | null
    emailSyncStatus?: string | null
    calendarSyncStatus?: string | null
    errorMessage?: string | null
    usePolling?: boolean
    lastPollAt?: Date | string | null
    pollErrorCount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    account: ConnectedAccountCreateNestedOneWithoutSyncStateInput
  }

  export type SyncStateUncheckedCreateInput = {
    id?: string
    accountId: string
    emailHistoryId?: string | null
    calendarSyncToken?: string | null
    gmailHistoryId?: string | null
    gmailWatchExpiry?: Date | string | null
    mailDeltaLink?: string | null
    calendarDeltaLink?: string | null
    googleCalendarSyncToken?: string | null
    emailSubscriptionId?: string | null
    mailSubscriptionId?: string | null
    calendarSubscriptionId?: string | null
    subscriptionExpiry?: Date | string | null
    lastEmailSync?: Date | string | null
    lastCalendarSync?: Date | string | null
    emailSyncStatus?: string | null
    calendarSyncStatus?: string | null
    errorMessage?: string | null
    usePolling?: boolean
    lastPollAt?: Date | string | null
    pollErrorCount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    emailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    gmailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    gmailWatchExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    mailDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    calendarDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    googleCalendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    mailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastEmailSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastCalendarSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    usePolling?: BoolFieldUpdateOperationsInput | boolean
    lastPollAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pollErrorCount?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    account?: ConnectedAccountUpdateOneRequiredWithoutSyncStateNestedInput
  }

  export type SyncStateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    emailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    gmailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    gmailWatchExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    mailDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    calendarDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    googleCalendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    mailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastEmailSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastCalendarSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    usePolling?: BoolFieldUpdateOperationsInput | boolean
    lastPollAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pollErrorCount?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateCreateManyInput = {
    id?: string
    accountId: string
    emailHistoryId?: string | null
    calendarSyncToken?: string | null
    gmailHistoryId?: string | null
    gmailWatchExpiry?: Date | string | null
    mailDeltaLink?: string | null
    calendarDeltaLink?: string | null
    googleCalendarSyncToken?: string | null
    emailSubscriptionId?: string | null
    mailSubscriptionId?: string | null
    calendarSubscriptionId?: string | null
    subscriptionExpiry?: Date | string | null
    lastEmailSync?: Date | string | null
    lastCalendarSync?: Date | string | null
    emailSyncStatus?: string | null
    calendarSyncStatus?: string | null
    errorMessage?: string | null
    usePolling?: boolean
    lastPollAt?: Date | string | null
    pollErrorCount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    emailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    gmailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    gmailWatchExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    mailDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    calendarDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    googleCalendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    mailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastEmailSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastCalendarSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    usePolling?: BoolFieldUpdateOperationsInput | boolean
    lastPollAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pollErrorCount?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    emailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    gmailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    gmailWatchExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    mailDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    calendarDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    googleCalendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    mailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastEmailSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastCalendarSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    usePolling?: BoolFieldUpdateOperationsInput | boolean
    lastPollAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pollErrorCount?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApprovalCreateInput = {
    id?: string
    tenantId: string
    userId: string
    actionType: string
    status?: string
    actionPayload: string
    riskLevel?: string
    riskReason?: string | null
    requestedAt?: Date | string
    expiresAt: Date | string
    decidedAt?: Date | string | null
    decidedBy?: string | null
    correlationId: string
    createdAt?: Date | string
    account: ConnectedAccountCreateNestedOneWithoutApprovalsInput
  }

  export type ApprovalUncheckedCreateInput = {
    id?: string
    tenantId: string
    userId: string
    accountId: string
    actionType: string
    status?: string
    actionPayload: string
    riskLevel?: string
    riskReason?: string | null
    requestedAt?: Date | string
    expiresAt: Date | string
    decidedAt?: Date | string | null
    decidedBy?: string | null
    correlationId: string
    createdAt?: Date | string
  }

  export type ApprovalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    account?: ConnectedAccountUpdateOneRequiredWithoutApprovalsNestedInput
  }

  export type ApprovalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApprovalCreateManyInput = {
    id?: string
    tenantId: string
    userId: string
    accountId: string
    actionType: string
    status?: string
    actionPayload: string
    riskLevel?: string
    riskReason?: string | null
    requestedAt?: Date | string
    expiresAt: Date | string
    decidedAt?: Date | string | null
    decidedBy?: string | null
    correlationId: string
    createdAt?: Date | string
  }

  export type ApprovalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApprovalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateInput = {
    id?: string
    tenantId: string
    userId: string
    action: string
    resourceType: string
    resourceId?: string | null
    correlationId: string
    ipAddress?: string | null
    userAgent?: string | null
    status: string
    errorCode?: string | null
    metadata?: string | null
    durationMs?: number | null
    createdAt?: Date | string
    account?: ConnectedAccountCreateNestedOneWithoutAuditLogsInput
  }

  export type AuditLogUncheckedCreateInput = {
    id?: string
    tenantId: string
    userId: string
    accountId?: string | null
    action: string
    resourceType: string
    resourceId?: string | null
    correlationId: string
    ipAddress?: string | null
    userAgent?: string | null
    status: string
    errorCode?: string | null
    metadata?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    account?: ConnectedAccountUpdateOneWithoutAuditLogsNestedInput
  }

  export type AuditLogUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateManyInput = {
    id?: string
    tenantId: string
    userId: string
    accountId?: string | null
    action: string
    resourceType: string
    resourceId?: string | null
    correlationId: string
    ipAddress?: string | null
    userAgent?: string | null
    status: string
    errorCode?: string | null
    metadata?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    accountId?: NullableStringFieldUpdateOperationsInput | string | null
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventCreateInput = {
    id?: string
    idempotencyKey: string
    eventId: string
    eventType: string
    accountId: string
    provider?: string | null
    payload?: string | null
    processedAt?: Date | string
    expiresAt: Date | string
  }

  export type ProcessedEventUncheckedCreateInput = {
    id?: string
    idempotencyKey: string
    eventId: string
    eventType: string
    accountId: string
    provider?: string | null
    payload?: string | null
    processedAt?: Date | string
    expiresAt: Date | string
  }

  export type ProcessedEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    idempotencyKey?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    idempotencyKey?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventCreateManyInput = {
    id?: string
    idempotencyKey: string
    eventId: string
    eventType: string
    accountId: string
    provider?: string | null
    payload?: string | null
    processedAt?: Date | string
    expiresAt: Date | string
  }

  export type ProcessedEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    idempotencyKey?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProcessedEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    idempotencyKey?: StringFieldUpdateOperationsInput | string
    eventId?: StringFieldUpdateOperationsInput | string
    eventType?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    payload?: NullableStringFieldUpdateOperationsInput | string | null
    processedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EncryptionKeyCreateInput = {
    id?: string
    tenantId: string
    version?: number
    keyEncrypted: string
    algorithm?: string
    status?: string
    createdAt?: Date | string
    rotatedAt?: Date | string | null
    expiresAt?: Date | string | null
  }

  export type EncryptionKeyUncheckedCreateInput = {
    id?: string
    tenantId: string
    version?: number
    keyEncrypted: string
    algorithm?: string
    status?: string
    createdAt?: Date | string
    rotatedAt?: Date | string | null
    expiresAt?: Date | string | null
  }

  export type EncryptionKeyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    keyEncrypted?: StringFieldUpdateOperationsInput | string
    algorithm?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rotatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EncryptionKeyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    keyEncrypted?: StringFieldUpdateOperationsInput | string
    algorithm?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rotatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EncryptionKeyCreateManyInput = {
    id?: string
    tenantId: string
    version?: number
    keyEncrypted: string
    algorithm?: string
    status?: string
    createdAt?: Date | string
    rotatedAt?: Date | string | null
    expiresAt?: Date | string | null
  }

  export type EncryptionKeyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    keyEncrypted?: StringFieldUpdateOperationsInput | string
    algorithm?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rotatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EncryptionKeyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    keyEncrypted?: StringFieldUpdateOperationsInput | string
    algorithm?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rotatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CachedMessageCreateInput = {
    id?: string
    accountId: string
    providerId: string
    threadId: string
    internetMessageId: string
    fromEmail: string
    fromName?: string | null
    subject?: string | null
    snippet?: string | null
    labels: string
    isRead?: boolean
    isDraft?: boolean
    sentAt: Date | string
    receivedAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CachedMessageUncheckedCreateInput = {
    id?: string
    accountId: string
    providerId: string
    threadId: string
    internetMessageId: string
    fromEmail: string
    fromName?: string | null
    subject?: string | null
    snippet?: string | null
    labels: string
    isRead?: boolean
    isDraft?: boolean
    sentAt: Date | string
    receivedAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CachedMessageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    internetMessageId?: StringFieldUpdateOperationsInput | string
    fromEmail?: StringFieldUpdateOperationsInput | string
    fromName?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    snippet?: NullableStringFieldUpdateOperationsInput | string | null
    labels?: StringFieldUpdateOperationsInput | string
    isRead?: BoolFieldUpdateOperationsInput | boolean
    isDraft?: BoolFieldUpdateOperationsInput | boolean
    sentAt?: DateTimeFieldUpdateOperationsInput | Date | string
    receivedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedMessageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    internetMessageId?: StringFieldUpdateOperationsInput | string
    fromEmail?: StringFieldUpdateOperationsInput | string
    fromName?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    snippet?: NullableStringFieldUpdateOperationsInput | string | null
    labels?: StringFieldUpdateOperationsInput | string
    isRead?: BoolFieldUpdateOperationsInput | boolean
    isDraft?: BoolFieldUpdateOperationsInput | boolean
    sentAt?: DateTimeFieldUpdateOperationsInput | Date | string
    receivedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedMessageCreateManyInput = {
    id?: string
    accountId: string
    providerId: string
    threadId: string
    internetMessageId: string
    fromEmail: string
    fromName?: string | null
    subject?: string | null
    snippet?: string | null
    labels: string
    isRead?: boolean
    isDraft?: boolean
    sentAt: Date | string
    receivedAt: Date | string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CachedMessageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    internetMessageId?: StringFieldUpdateOperationsInput | string
    fromEmail?: StringFieldUpdateOperationsInput | string
    fromName?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    snippet?: NullableStringFieldUpdateOperationsInput | string | null
    labels?: StringFieldUpdateOperationsInput | string
    isRead?: BoolFieldUpdateOperationsInput | boolean
    isDraft?: BoolFieldUpdateOperationsInput | boolean
    sentAt?: DateTimeFieldUpdateOperationsInput | Date | string
    receivedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedMessageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    internetMessageId?: StringFieldUpdateOperationsInput | string
    fromEmail?: StringFieldUpdateOperationsInput | string
    fromName?: NullableStringFieldUpdateOperationsInput | string | null
    subject?: NullableStringFieldUpdateOperationsInput | string | null
    snippet?: NullableStringFieldUpdateOperationsInput | string | null
    labels?: StringFieldUpdateOperationsInput | string
    isRead?: BoolFieldUpdateOperationsInput | boolean
    isDraft?: BoolFieldUpdateOperationsInput | boolean
    sentAt?: DateTimeFieldUpdateOperationsInput | Date | string
    receivedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedEventCreateInput = {
    id?: string
    accountId: string
    providerId: string
    calendarId: string
    title: string
    description?: string | null
    location?: string | null
    startTime: Date | string
    endTime: Date | string
    isAllDay?: boolean
    timezone?: string | null
    organizerEmail: string
    organizerName?: string | null
    status?: string
    visibility?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CachedEventUncheckedCreateInput = {
    id?: string
    accountId: string
    providerId: string
    calendarId: string
    title: string
    description?: string | null
    location?: string | null
    startTime: Date | string
    endTime: Date | string
    isAllDay?: boolean
    timezone?: string | null
    organizerEmail: string
    organizerName?: string | null
    status?: string
    visibility?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CachedEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    calendarId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isAllDay?: BoolFieldUpdateOperationsInput | boolean
    timezone?: NullableStringFieldUpdateOperationsInput | string | null
    organizerEmail?: StringFieldUpdateOperationsInput | string
    organizerName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    visibility?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    calendarId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isAllDay?: BoolFieldUpdateOperationsInput | boolean
    timezone?: NullableStringFieldUpdateOperationsInput | string | null
    organizerEmail?: StringFieldUpdateOperationsInput | string
    organizerName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    visibility?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedEventCreateManyInput = {
    id?: string
    accountId: string
    providerId: string
    calendarId: string
    title: string
    description?: string | null
    location?: string | null
    startTime: Date | string
    endTime: Date | string
    isAllDay?: boolean
    timezone?: string | null
    organizerEmail: string
    organizerName?: string | null
    status?: string
    visibility?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CachedEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    calendarId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isAllDay?: BoolFieldUpdateOperationsInput | boolean
    timezone?: NullableStringFieldUpdateOperationsInput | string | null
    organizerEmail?: StringFieldUpdateOperationsInput | string
    organizerName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    visibility?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CachedEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    accountId?: StringFieldUpdateOperationsInput | string
    providerId?: StringFieldUpdateOperationsInput | string
    calendarId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    location?: NullableStringFieldUpdateOperationsInput | string | null
    startTime?: DateTimeFieldUpdateOperationsInput | Date | string
    endTime?: DateTimeFieldUpdateOperationsInput | Date | string
    isAllDay?: BoolFieldUpdateOperationsInput | boolean
    timezone?: NullableStringFieldUpdateOperationsInput | string | null
    organizerEmail?: StringFieldUpdateOperationsInput | string
    organizerName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    visibility?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type OAuthTokenNullableRelationFilter = {
    is?: OAuthTokenWhereInput | null
    isNot?: OAuthTokenWhereInput | null
  }

  export type SyncStateNullableRelationFilter = {
    is?: SyncStateWhereInput | null
    isNot?: SyncStateWhereInput | null
  }

  export type ApprovalListRelationFilter = {
    every?: ApprovalWhereInput
    some?: ApprovalWhereInput
    none?: ApprovalWhereInput
  }

  export type AuditLogListRelationFilter = {
    every?: AuditLogWhereInput
    some?: AuditLogWhereInput
    none?: AuditLogWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ApprovalOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConnectedAccountTenantIdUserIdProviderProviderAccountIdCompoundUniqueInput = {
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
  }

  export type ConnectedAccountCountOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    email?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    enabledScopes?: SortOrder
    requestedScopes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastSyncAt?: SortOrder
  }

  export type ConnectedAccountMaxOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    email?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    enabledScopes?: SortOrder
    requestedScopes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastSyncAt?: SortOrder
  }

  export type ConnectedAccountMinOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    provider?: SortOrder
    providerAccountId?: SortOrder
    email?: SortOrder
    displayName?: SortOrder
    status?: SortOrder
    enabledScopes?: SortOrder
    requestedScopes?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    lastSyncAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type ConnectedAccountRelationFilter = {
    is?: ConnectedAccountWhereInput
    isNot?: ConnectedAccountWhereInput
  }

  export type OAuthTokenCountOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    accessTokenEnc?: SortOrder
    refreshTokenEnc?: SortOrder
    keyVersion?: SortOrder
    encryptionKeyId?: SortOrder
    accessTokenExpiresAt?: SortOrder
    tokenType?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OAuthTokenAvgOrderByAggregateInput = {
    keyVersion?: SortOrder
  }

  export type OAuthTokenMaxOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    accessTokenEnc?: SortOrder
    refreshTokenEnc?: SortOrder
    keyVersion?: SortOrder
    encryptionKeyId?: SortOrder
    accessTokenExpiresAt?: SortOrder
    tokenType?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OAuthTokenMinOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    accessTokenEnc?: SortOrder
    refreshTokenEnc?: SortOrder
    keyVersion?: SortOrder
    encryptionKeyId?: SortOrder
    accessTokenExpiresAt?: SortOrder
    tokenType?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OAuthTokenSumOrderByAggregateInput = {
    keyVersion?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type SyncStateCountOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    emailHistoryId?: SortOrder
    calendarSyncToken?: SortOrder
    gmailHistoryId?: SortOrder
    gmailWatchExpiry?: SortOrder
    mailDeltaLink?: SortOrder
    calendarDeltaLink?: SortOrder
    googleCalendarSyncToken?: SortOrder
    emailSubscriptionId?: SortOrder
    mailSubscriptionId?: SortOrder
    calendarSubscriptionId?: SortOrder
    subscriptionExpiry?: SortOrder
    lastEmailSync?: SortOrder
    lastCalendarSync?: SortOrder
    emailSyncStatus?: SortOrder
    calendarSyncStatus?: SortOrder
    errorMessage?: SortOrder
    usePolling?: SortOrder
    lastPollAt?: SortOrder
    pollErrorCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SyncStateAvgOrderByAggregateInput = {
    pollErrorCount?: SortOrder
  }

  export type SyncStateMaxOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    emailHistoryId?: SortOrder
    calendarSyncToken?: SortOrder
    gmailHistoryId?: SortOrder
    gmailWatchExpiry?: SortOrder
    mailDeltaLink?: SortOrder
    calendarDeltaLink?: SortOrder
    googleCalendarSyncToken?: SortOrder
    emailSubscriptionId?: SortOrder
    mailSubscriptionId?: SortOrder
    calendarSubscriptionId?: SortOrder
    subscriptionExpiry?: SortOrder
    lastEmailSync?: SortOrder
    lastCalendarSync?: SortOrder
    emailSyncStatus?: SortOrder
    calendarSyncStatus?: SortOrder
    errorMessage?: SortOrder
    usePolling?: SortOrder
    lastPollAt?: SortOrder
    pollErrorCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SyncStateMinOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    emailHistoryId?: SortOrder
    calendarSyncToken?: SortOrder
    gmailHistoryId?: SortOrder
    gmailWatchExpiry?: SortOrder
    mailDeltaLink?: SortOrder
    calendarDeltaLink?: SortOrder
    googleCalendarSyncToken?: SortOrder
    emailSubscriptionId?: SortOrder
    mailSubscriptionId?: SortOrder
    calendarSubscriptionId?: SortOrder
    subscriptionExpiry?: SortOrder
    lastEmailSync?: SortOrder
    lastCalendarSync?: SortOrder
    emailSyncStatus?: SortOrder
    calendarSyncStatus?: SortOrder
    errorMessage?: SortOrder
    usePolling?: SortOrder
    lastPollAt?: SortOrder
    pollErrorCount?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SyncStateSumOrderByAggregateInput = {
    pollErrorCount?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type ApprovalCountOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    actionType?: SortOrder
    status?: SortOrder
    actionPayload?: SortOrder
    riskLevel?: SortOrder
    riskReason?: SortOrder
    requestedAt?: SortOrder
    expiresAt?: SortOrder
    decidedAt?: SortOrder
    decidedBy?: SortOrder
    correlationId?: SortOrder
    createdAt?: SortOrder
  }

  export type ApprovalMaxOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    actionType?: SortOrder
    status?: SortOrder
    actionPayload?: SortOrder
    riskLevel?: SortOrder
    riskReason?: SortOrder
    requestedAt?: SortOrder
    expiresAt?: SortOrder
    decidedAt?: SortOrder
    decidedBy?: SortOrder
    correlationId?: SortOrder
    createdAt?: SortOrder
  }

  export type ApprovalMinOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    actionType?: SortOrder
    status?: SortOrder
    actionPayload?: SortOrder
    riskLevel?: SortOrder
    riskReason?: SortOrder
    requestedAt?: SortOrder
    expiresAt?: SortOrder
    decidedAt?: SortOrder
    decidedBy?: SortOrder
    correlationId?: SortOrder
    createdAt?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type ConnectedAccountNullableRelationFilter = {
    is?: ConnectedAccountWhereInput | null
    isNot?: ConnectedAccountWhereInput | null
  }

  export type AuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrder
    correlationId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    status?: SortOrder
    errorCode?: SortOrder
    metadata?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogAvgOrderByAggregateInput = {
    durationMs?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrder
    correlationId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    status?: SortOrder
    errorCode?: SortOrder
    metadata?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    userId?: SortOrder
    accountId?: SortOrder
    action?: SortOrder
    resourceType?: SortOrder
    resourceId?: SortOrder
    correlationId?: SortOrder
    ipAddress?: SortOrder
    userAgent?: SortOrder
    status?: SortOrder
    errorCode?: SortOrder
    metadata?: SortOrder
    durationMs?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogSumOrderByAggregateInput = {
    durationMs?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type ProcessedEventCountOrderByAggregateInput = {
    id?: SortOrder
    idempotencyKey?: SortOrder
    eventId?: SortOrder
    eventType?: SortOrder
    accountId?: SortOrder
    provider?: SortOrder
    payload?: SortOrder
    processedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type ProcessedEventMaxOrderByAggregateInput = {
    id?: SortOrder
    idempotencyKey?: SortOrder
    eventId?: SortOrder
    eventType?: SortOrder
    accountId?: SortOrder
    provider?: SortOrder
    payload?: SortOrder
    processedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type ProcessedEventMinOrderByAggregateInput = {
    id?: SortOrder
    idempotencyKey?: SortOrder
    eventId?: SortOrder
    eventType?: SortOrder
    accountId?: SortOrder
    provider?: SortOrder
    payload?: SortOrder
    processedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type EncryptionKeyTenantIdVersionCompoundUniqueInput = {
    tenantId: string
    version: number
  }

  export type EncryptionKeyCountOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    version?: SortOrder
    keyEncrypted?: SortOrder
    algorithm?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    rotatedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type EncryptionKeyAvgOrderByAggregateInput = {
    version?: SortOrder
  }

  export type EncryptionKeyMaxOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    version?: SortOrder
    keyEncrypted?: SortOrder
    algorithm?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    rotatedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type EncryptionKeyMinOrderByAggregateInput = {
    id?: SortOrder
    tenantId?: SortOrder
    version?: SortOrder
    keyEncrypted?: SortOrder
    algorithm?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    rotatedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type EncryptionKeySumOrderByAggregateInput = {
    version?: SortOrder
  }

  export type CachedMessageAccountIdProviderIdCompoundUniqueInput = {
    accountId: string
    providerId: string
  }

  export type CachedMessageCountOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    threadId?: SortOrder
    internetMessageId?: SortOrder
    fromEmail?: SortOrder
    fromName?: SortOrder
    subject?: SortOrder
    snippet?: SortOrder
    labels?: SortOrder
    isRead?: SortOrder
    isDraft?: SortOrder
    sentAt?: SortOrder
    receivedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedMessageMaxOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    threadId?: SortOrder
    internetMessageId?: SortOrder
    fromEmail?: SortOrder
    fromName?: SortOrder
    subject?: SortOrder
    snippet?: SortOrder
    labels?: SortOrder
    isRead?: SortOrder
    isDraft?: SortOrder
    sentAt?: SortOrder
    receivedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedMessageMinOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    threadId?: SortOrder
    internetMessageId?: SortOrder
    fromEmail?: SortOrder
    fromName?: SortOrder
    subject?: SortOrder
    snippet?: SortOrder
    labels?: SortOrder
    isRead?: SortOrder
    isDraft?: SortOrder
    sentAt?: SortOrder
    receivedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedEventAccountIdProviderIdCompoundUniqueInput = {
    accountId: string
    providerId: string
  }

  export type CachedEventCountOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    calendarId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    location?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    isAllDay?: SortOrder
    timezone?: SortOrder
    organizerEmail?: SortOrder
    organizerName?: SortOrder
    status?: SortOrder
    visibility?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedEventMaxOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    calendarId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    location?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    isAllDay?: SortOrder
    timezone?: SortOrder
    organizerEmail?: SortOrder
    organizerName?: SortOrder
    status?: SortOrder
    visibility?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CachedEventMinOrderByAggregateInput = {
    id?: SortOrder
    accountId?: SortOrder
    providerId?: SortOrder
    calendarId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    location?: SortOrder
    startTime?: SortOrder
    endTime?: SortOrder
    isAllDay?: SortOrder
    timezone?: SortOrder
    organizerEmail?: SortOrder
    organizerName?: SortOrder
    status?: SortOrder
    visibility?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OAuthTokenCreateNestedOneWithoutAccountInput = {
    create?: XOR<OAuthTokenCreateWithoutAccountInput, OAuthTokenUncheckedCreateWithoutAccountInput>
    connectOrCreate?: OAuthTokenCreateOrConnectWithoutAccountInput
    connect?: OAuthTokenWhereUniqueInput
  }

  export type SyncStateCreateNestedOneWithoutAccountInput = {
    create?: XOR<SyncStateCreateWithoutAccountInput, SyncStateUncheckedCreateWithoutAccountInput>
    connectOrCreate?: SyncStateCreateOrConnectWithoutAccountInput
    connect?: SyncStateWhereUniqueInput
  }

  export type ApprovalCreateNestedManyWithoutAccountInput = {
    create?: XOR<ApprovalCreateWithoutAccountInput, ApprovalUncheckedCreateWithoutAccountInput> | ApprovalCreateWithoutAccountInput[] | ApprovalUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: ApprovalCreateOrConnectWithoutAccountInput | ApprovalCreateOrConnectWithoutAccountInput[]
    createMany?: ApprovalCreateManyAccountInputEnvelope
    connect?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
  }

  export type AuditLogCreateNestedManyWithoutAccountInput = {
    create?: XOR<AuditLogCreateWithoutAccountInput, AuditLogUncheckedCreateWithoutAccountInput> | AuditLogCreateWithoutAccountInput[] | AuditLogUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutAccountInput | AuditLogCreateOrConnectWithoutAccountInput[]
    createMany?: AuditLogCreateManyAccountInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type OAuthTokenUncheckedCreateNestedOneWithoutAccountInput = {
    create?: XOR<OAuthTokenCreateWithoutAccountInput, OAuthTokenUncheckedCreateWithoutAccountInput>
    connectOrCreate?: OAuthTokenCreateOrConnectWithoutAccountInput
    connect?: OAuthTokenWhereUniqueInput
  }

  export type SyncStateUncheckedCreateNestedOneWithoutAccountInput = {
    create?: XOR<SyncStateCreateWithoutAccountInput, SyncStateUncheckedCreateWithoutAccountInput>
    connectOrCreate?: SyncStateCreateOrConnectWithoutAccountInput
    connect?: SyncStateWhereUniqueInput
  }

  export type ApprovalUncheckedCreateNestedManyWithoutAccountInput = {
    create?: XOR<ApprovalCreateWithoutAccountInput, ApprovalUncheckedCreateWithoutAccountInput> | ApprovalCreateWithoutAccountInput[] | ApprovalUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: ApprovalCreateOrConnectWithoutAccountInput | ApprovalCreateOrConnectWithoutAccountInput[]
    createMany?: ApprovalCreateManyAccountInputEnvelope
    connect?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
  }

  export type AuditLogUncheckedCreateNestedManyWithoutAccountInput = {
    create?: XOR<AuditLogCreateWithoutAccountInput, AuditLogUncheckedCreateWithoutAccountInput> | AuditLogCreateWithoutAccountInput[] | AuditLogUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutAccountInput | AuditLogCreateOrConnectWithoutAccountInput[]
    createMany?: AuditLogCreateManyAccountInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type OAuthTokenUpdateOneWithoutAccountNestedInput = {
    create?: XOR<OAuthTokenCreateWithoutAccountInput, OAuthTokenUncheckedCreateWithoutAccountInput>
    connectOrCreate?: OAuthTokenCreateOrConnectWithoutAccountInput
    upsert?: OAuthTokenUpsertWithoutAccountInput
    disconnect?: OAuthTokenWhereInput | boolean
    delete?: OAuthTokenWhereInput | boolean
    connect?: OAuthTokenWhereUniqueInput
    update?: XOR<XOR<OAuthTokenUpdateToOneWithWhereWithoutAccountInput, OAuthTokenUpdateWithoutAccountInput>, OAuthTokenUncheckedUpdateWithoutAccountInput>
  }

  export type SyncStateUpdateOneWithoutAccountNestedInput = {
    create?: XOR<SyncStateCreateWithoutAccountInput, SyncStateUncheckedCreateWithoutAccountInput>
    connectOrCreate?: SyncStateCreateOrConnectWithoutAccountInput
    upsert?: SyncStateUpsertWithoutAccountInput
    disconnect?: SyncStateWhereInput | boolean
    delete?: SyncStateWhereInput | boolean
    connect?: SyncStateWhereUniqueInput
    update?: XOR<XOR<SyncStateUpdateToOneWithWhereWithoutAccountInput, SyncStateUpdateWithoutAccountInput>, SyncStateUncheckedUpdateWithoutAccountInput>
  }

  export type ApprovalUpdateManyWithoutAccountNestedInput = {
    create?: XOR<ApprovalCreateWithoutAccountInput, ApprovalUncheckedCreateWithoutAccountInput> | ApprovalCreateWithoutAccountInput[] | ApprovalUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: ApprovalCreateOrConnectWithoutAccountInput | ApprovalCreateOrConnectWithoutAccountInput[]
    upsert?: ApprovalUpsertWithWhereUniqueWithoutAccountInput | ApprovalUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: ApprovalCreateManyAccountInputEnvelope
    set?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    disconnect?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    delete?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    connect?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    update?: ApprovalUpdateWithWhereUniqueWithoutAccountInput | ApprovalUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: ApprovalUpdateManyWithWhereWithoutAccountInput | ApprovalUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: ApprovalScalarWhereInput | ApprovalScalarWhereInput[]
  }

  export type AuditLogUpdateManyWithoutAccountNestedInput = {
    create?: XOR<AuditLogCreateWithoutAccountInput, AuditLogUncheckedCreateWithoutAccountInput> | AuditLogCreateWithoutAccountInput[] | AuditLogUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutAccountInput | AuditLogCreateOrConnectWithoutAccountInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutAccountInput | AuditLogUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: AuditLogCreateManyAccountInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutAccountInput | AuditLogUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutAccountInput | AuditLogUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type OAuthTokenUncheckedUpdateOneWithoutAccountNestedInput = {
    create?: XOR<OAuthTokenCreateWithoutAccountInput, OAuthTokenUncheckedCreateWithoutAccountInput>
    connectOrCreate?: OAuthTokenCreateOrConnectWithoutAccountInput
    upsert?: OAuthTokenUpsertWithoutAccountInput
    disconnect?: OAuthTokenWhereInput | boolean
    delete?: OAuthTokenWhereInput | boolean
    connect?: OAuthTokenWhereUniqueInput
    update?: XOR<XOR<OAuthTokenUpdateToOneWithWhereWithoutAccountInput, OAuthTokenUpdateWithoutAccountInput>, OAuthTokenUncheckedUpdateWithoutAccountInput>
  }

  export type SyncStateUncheckedUpdateOneWithoutAccountNestedInput = {
    create?: XOR<SyncStateCreateWithoutAccountInput, SyncStateUncheckedCreateWithoutAccountInput>
    connectOrCreate?: SyncStateCreateOrConnectWithoutAccountInput
    upsert?: SyncStateUpsertWithoutAccountInput
    disconnect?: SyncStateWhereInput | boolean
    delete?: SyncStateWhereInput | boolean
    connect?: SyncStateWhereUniqueInput
    update?: XOR<XOR<SyncStateUpdateToOneWithWhereWithoutAccountInput, SyncStateUpdateWithoutAccountInput>, SyncStateUncheckedUpdateWithoutAccountInput>
  }

  export type ApprovalUncheckedUpdateManyWithoutAccountNestedInput = {
    create?: XOR<ApprovalCreateWithoutAccountInput, ApprovalUncheckedCreateWithoutAccountInput> | ApprovalCreateWithoutAccountInput[] | ApprovalUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: ApprovalCreateOrConnectWithoutAccountInput | ApprovalCreateOrConnectWithoutAccountInput[]
    upsert?: ApprovalUpsertWithWhereUniqueWithoutAccountInput | ApprovalUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: ApprovalCreateManyAccountInputEnvelope
    set?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    disconnect?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    delete?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    connect?: ApprovalWhereUniqueInput | ApprovalWhereUniqueInput[]
    update?: ApprovalUpdateWithWhereUniqueWithoutAccountInput | ApprovalUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: ApprovalUpdateManyWithWhereWithoutAccountInput | ApprovalUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: ApprovalScalarWhereInput | ApprovalScalarWhereInput[]
  }

  export type AuditLogUncheckedUpdateManyWithoutAccountNestedInput = {
    create?: XOR<AuditLogCreateWithoutAccountInput, AuditLogUncheckedCreateWithoutAccountInput> | AuditLogCreateWithoutAccountInput[] | AuditLogUncheckedCreateWithoutAccountInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutAccountInput | AuditLogCreateOrConnectWithoutAccountInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutAccountInput | AuditLogUpsertWithWhereUniqueWithoutAccountInput[]
    createMany?: AuditLogCreateManyAccountInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutAccountInput | AuditLogUpdateWithWhereUniqueWithoutAccountInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutAccountInput | AuditLogUpdateManyWithWhereWithoutAccountInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type ConnectedAccountCreateNestedOneWithoutOauthTokenInput = {
    create?: XOR<ConnectedAccountCreateWithoutOauthTokenInput, ConnectedAccountUncheckedCreateWithoutOauthTokenInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutOauthTokenInput
    connect?: ConnectedAccountWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ConnectedAccountUpdateOneRequiredWithoutOauthTokenNestedInput = {
    create?: XOR<ConnectedAccountCreateWithoutOauthTokenInput, ConnectedAccountUncheckedCreateWithoutOauthTokenInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutOauthTokenInput
    upsert?: ConnectedAccountUpsertWithoutOauthTokenInput
    connect?: ConnectedAccountWhereUniqueInput
    update?: XOR<XOR<ConnectedAccountUpdateToOneWithWhereWithoutOauthTokenInput, ConnectedAccountUpdateWithoutOauthTokenInput>, ConnectedAccountUncheckedUpdateWithoutOauthTokenInput>
  }

  export type ConnectedAccountCreateNestedOneWithoutSyncStateInput = {
    create?: XOR<ConnectedAccountCreateWithoutSyncStateInput, ConnectedAccountUncheckedCreateWithoutSyncStateInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutSyncStateInput
    connect?: ConnectedAccountWhereUniqueInput
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type ConnectedAccountUpdateOneRequiredWithoutSyncStateNestedInput = {
    create?: XOR<ConnectedAccountCreateWithoutSyncStateInput, ConnectedAccountUncheckedCreateWithoutSyncStateInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutSyncStateInput
    upsert?: ConnectedAccountUpsertWithoutSyncStateInput
    connect?: ConnectedAccountWhereUniqueInput
    update?: XOR<XOR<ConnectedAccountUpdateToOneWithWhereWithoutSyncStateInput, ConnectedAccountUpdateWithoutSyncStateInput>, ConnectedAccountUncheckedUpdateWithoutSyncStateInput>
  }

  export type ConnectedAccountCreateNestedOneWithoutApprovalsInput = {
    create?: XOR<ConnectedAccountCreateWithoutApprovalsInput, ConnectedAccountUncheckedCreateWithoutApprovalsInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutApprovalsInput
    connect?: ConnectedAccountWhereUniqueInput
  }

  export type ConnectedAccountUpdateOneRequiredWithoutApprovalsNestedInput = {
    create?: XOR<ConnectedAccountCreateWithoutApprovalsInput, ConnectedAccountUncheckedCreateWithoutApprovalsInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutApprovalsInput
    upsert?: ConnectedAccountUpsertWithoutApprovalsInput
    connect?: ConnectedAccountWhereUniqueInput
    update?: XOR<XOR<ConnectedAccountUpdateToOneWithWhereWithoutApprovalsInput, ConnectedAccountUpdateWithoutApprovalsInput>, ConnectedAccountUncheckedUpdateWithoutApprovalsInput>
  }

  export type ConnectedAccountCreateNestedOneWithoutAuditLogsInput = {
    create?: XOR<ConnectedAccountCreateWithoutAuditLogsInput, ConnectedAccountUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutAuditLogsInput
    connect?: ConnectedAccountWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ConnectedAccountUpdateOneWithoutAuditLogsNestedInput = {
    create?: XOR<ConnectedAccountCreateWithoutAuditLogsInput, ConnectedAccountUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: ConnectedAccountCreateOrConnectWithoutAuditLogsInput
    upsert?: ConnectedAccountUpsertWithoutAuditLogsInput
    disconnect?: ConnectedAccountWhereInput | boolean
    delete?: ConnectedAccountWhereInput | boolean
    connect?: ConnectedAccountWhereUniqueInput
    update?: XOR<XOR<ConnectedAccountUpdateToOneWithWhereWithoutAuditLogsInput, ConnectedAccountUpdateWithoutAuditLogsInput>, ConnectedAccountUncheckedUpdateWithoutAuditLogsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type OAuthTokenCreateWithoutAccountInput = {
    id?: string
    accessTokenEnc: string
    refreshTokenEnc: string
    keyVersion?: number
    encryptionKeyId: string
    accessTokenExpiresAt: Date | string
    tokenType?: string
    scope: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OAuthTokenUncheckedCreateWithoutAccountInput = {
    id?: string
    accessTokenEnc: string
    refreshTokenEnc: string
    keyVersion?: number
    encryptionKeyId: string
    accessTokenExpiresAt: Date | string
    tokenType?: string
    scope: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OAuthTokenCreateOrConnectWithoutAccountInput = {
    where: OAuthTokenWhereUniqueInput
    create: XOR<OAuthTokenCreateWithoutAccountInput, OAuthTokenUncheckedCreateWithoutAccountInput>
  }

  export type SyncStateCreateWithoutAccountInput = {
    id?: string
    emailHistoryId?: string | null
    calendarSyncToken?: string | null
    gmailHistoryId?: string | null
    gmailWatchExpiry?: Date | string | null
    mailDeltaLink?: string | null
    calendarDeltaLink?: string | null
    googleCalendarSyncToken?: string | null
    emailSubscriptionId?: string | null
    mailSubscriptionId?: string | null
    calendarSubscriptionId?: string | null
    subscriptionExpiry?: Date | string | null
    lastEmailSync?: Date | string | null
    lastCalendarSync?: Date | string | null
    emailSyncStatus?: string | null
    calendarSyncStatus?: string | null
    errorMessage?: string | null
    usePolling?: boolean
    lastPollAt?: Date | string | null
    pollErrorCount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateUncheckedCreateWithoutAccountInput = {
    id?: string
    emailHistoryId?: string | null
    calendarSyncToken?: string | null
    gmailHistoryId?: string | null
    gmailWatchExpiry?: Date | string | null
    mailDeltaLink?: string | null
    calendarDeltaLink?: string | null
    googleCalendarSyncToken?: string | null
    emailSubscriptionId?: string | null
    mailSubscriptionId?: string | null
    calendarSubscriptionId?: string | null
    subscriptionExpiry?: Date | string | null
    lastEmailSync?: Date | string | null
    lastCalendarSync?: Date | string | null
    emailSyncStatus?: string | null
    calendarSyncStatus?: string | null
    errorMessage?: string | null
    usePolling?: boolean
    lastPollAt?: Date | string | null
    pollErrorCount?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SyncStateCreateOrConnectWithoutAccountInput = {
    where: SyncStateWhereUniqueInput
    create: XOR<SyncStateCreateWithoutAccountInput, SyncStateUncheckedCreateWithoutAccountInput>
  }

  export type ApprovalCreateWithoutAccountInput = {
    id?: string
    tenantId: string
    userId: string
    actionType: string
    status?: string
    actionPayload: string
    riskLevel?: string
    riskReason?: string | null
    requestedAt?: Date | string
    expiresAt: Date | string
    decidedAt?: Date | string | null
    decidedBy?: string | null
    correlationId: string
    createdAt?: Date | string
  }

  export type ApprovalUncheckedCreateWithoutAccountInput = {
    id?: string
    tenantId: string
    userId: string
    actionType: string
    status?: string
    actionPayload: string
    riskLevel?: string
    riskReason?: string | null
    requestedAt?: Date | string
    expiresAt: Date | string
    decidedAt?: Date | string | null
    decidedBy?: string | null
    correlationId: string
    createdAt?: Date | string
  }

  export type ApprovalCreateOrConnectWithoutAccountInput = {
    where: ApprovalWhereUniqueInput
    create: XOR<ApprovalCreateWithoutAccountInput, ApprovalUncheckedCreateWithoutAccountInput>
  }

  export type ApprovalCreateManyAccountInputEnvelope = {
    data: ApprovalCreateManyAccountInput | ApprovalCreateManyAccountInput[]
  }

  export type AuditLogCreateWithoutAccountInput = {
    id?: string
    tenantId: string
    userId: string
    action: string
    resourceType: string
    resourceId?: string | null
    correlationId: string
    ipAddress?: string | null
    userAgent?: string | null
    status: string
    errorCode?: string | null
    metadata?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AuditLogUncheckedCreateWithoutAccountInput = {
    id?: string
    tenantId: string
    userId: string
    action: string
    resourceType: string
    resourceId?: string | null
    correlationId: string
    ipAddress?: string | null
    userAgent?: string | null
    status: string
    errorCode?: string | null
    metadata?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type AuditLogCreateOrConnectWithoutAccountInput = {
    where: AuditLogWhereUniqueInput
    create: XOR<AuditLogCreateWithoutAccountInput, AuditLogUncheckedCreateWithoutAccountInput>
  }

  export type AuditLogCreateManyAccountInputEnvelope = {
    data: AuditLogCreateManyAccountInput | AuditLogCreateManyAccountInput[]
  }

  export type OAuthTokenUpsertWithoutAccountInput = {
    update: XOR<OAuthTokenUpdateWithoutAccountInput, OAuthTokenUncheckedUpdateWithoutAccountInput>
    create: XOR<OAuthTokenCreateWithoutAccountInput, OAuthTokenUncheckedCreateWithoutAccountInput>
    where?: OAuthTokenWhereInput
  }

  export type OAuthTokenUpdateToOneWithWhereWithoutAccountInput = {
    where?: OAuthTokenWhereInput
    data: XOR<OAuthTokenUpdateWithoutAccountInput, OAuthTokenUncheckedUpdateWithoutAccountInput>
  }

  export type OAuthTokenUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    accessTokenEnc?: StringFieldUpdateOperationsInput | string
    refreshTokenEnc?: StringFieldUpdateOperationsInput | string
    keyVersion?: IntFieldUpdateOperationsInput | number
    encryptionKeyId?: StringFieldUpdateOperationsInput | string
    accessTokenExpiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tokenType?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OAuthTokenUncheckedUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    accessTokenEnc?: StringFieldUpdateOperationsInput | string
    refreshTokenEnc?: StringFieldUpdateOperationsInput | string
    keyVersion?: IntFieldUpdateOperationsInput | number
    encryptionKeyId?: StringFieldUpdateOperationsInput | string
    accessTokenExpiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    tokenType?: StringFieldUpdateOperationsInput | string
    scope?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateUpsertWithoutAccountInput = {
    update: XOR<SyncStateUpdateWithoutAccountInput, SyncStateUncheckedUpdateWithoutAccountInput>
    create: XOR<SyncStateCreateWithoutAccountInput, SyncStateUncheckedCreateWithoutAccountInput>
    where?: SyncStateWhereInput
  }

  export type SyncStateUpdateToOneWithWhereWithoutAccountInput = {
    where?: SyncStateWhereInput
    data: XOR<SyncStateUpdateWithoutAccountInput, SyncStateUncheckedUpdateWithoutAccountInput>
  }

  export type SyncStateUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    emailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    gmailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    gmailWatchExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    mailDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    calendarDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    googleCalendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    mailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastEmailSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastCalendarSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    usePolling?: BoolFieldUpdateOperationsInput | boolean
    lastPollAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pollErrorCount?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SyncStateUncheckedUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    emailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    gmailHistoryId?: NullableStringFieldUpdateOperationsInput | string | null
    gmailWatchExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    mailDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    calendarDeltaLink?: NullableStringFieldUpdateOperationsInput | string | null
    googleCalendarSyncToken?: NullableStringFieldUpdateOperationsInput | string | null
    emailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    mailSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSubscriptionId?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionExpiry?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastEmailSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastCalendarSync?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    emailSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    calendarSyncStatus?: NullableStringFieldUpdateOperationsInput | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    usePolling?: BoolFieldUpdateOperationsInput | boolean
    lastPollAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    pollErrorCount?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApprovalUpsertWithWhereUniqueWithoutAccountInput = {
    where: ApprovalWhereUniqueInput
    update: XOR<ApprovalUpdateWithoutAccountInput, ApprovalUncheckedUpdateWithoutAccountInput>
    create: XOR<ApprovalCreateWithoutAccountInput, ApprovalUncheckedCreateWithoutAccountInput>
  }

  export type ApprovalUpdateWithWhereUniqueWithoutAccountInput = {
    where: ApprovalWhereUniqueInput
    data: XOR<ApprovalUpdateWithoutAccountInput, ApprovalUncheckedUpdateWithoutAccountInput>
  }

  export type ApprovalUpdateManyWithWhereWithoutAccountInput = {
    where: ApprovalScalarWhereInput
    data: XOR<ApprovalUpdateManyMutationInput, ApprovalUncheckedUpdateManyWithoutAccountInput>
  }

  export type ApprovalScalarWhereInput = {
    AND?: ApprovalScalarWhereInput | ApprovalScalarWhereInput[]
    OR?: ApprovalScalarWhereInput[]
    NOT?: ApprovalScalarWhereInput | ApprovalScalarWhereInput[]
    id?: StringFilter<"Approval"> | string
    tenantId?: StringFilter<"Approval"> | string
    userId?: StringFilter<"Approval"> | string
    accountId?: StringFilter<"Approval"> | string
    actionType?: StringFilter<"Approval"> | string
    status?: StringFilter<"Approval"> | string
    actionPayload?: StringFilter<"Approval"> | string
    riskLevel?: StringFilter<"Approval"> | string
    riskReason?: StringNullableFilter<"Approval"> | string | null
    requestedAt?: DateTimeFilter<"Approval"> | Date | string
    expiresAt?: DateTimeFilter<"Approval"> | Date | string
    decidedAt?: DateTimeNullableFilter<"Approval"> | Date | string | null
    decidedBy?: StringNullableFilter<"Approval"> | string | null
    correlationId?: StringFilter<"Approval"> | string
    createdAt?: DateTimeFilter<"Approval"> | Date | string
  }

  export type AuditLogUpsertWithWhereUniqueWithoutAccountInput = {
    where: AuditLogWhereUniqueInput
    update: XOR<AuditLogUpdateWithoutAccountInput, AuditLogUncheckedUpdateWithoutAccountInput>
    create: XOR<AuditLogCreateWithoutAccountInput, AuditLogUncheckedCreateWithoutAccountInput>
  }

  export type AuditLogUpdateWithWhereUniqueWithoutAccountInput = {
    where: AuditLogWhereUniqueInput
    data: XOR<AuditLogUpdateWithoutAccountInput, AuditLogUncheckedUpdateWithoutAccountInput>
  }

  export type AuditLogUpdateManyWithWhereWithoutAccountInput = {
    where: AuditLogScalarWhereInput
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyWithoutAccountInput>
  }

  export type AuditLogScalarWhereInput = {
    AND?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    OR?: AuditLogScalarWhereInput[]
    NOT?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    id?: StringFilter<"AuditLog"> | string
    tenantId?: StringFilter<"AuditLog"> | string
    userId?: StringFilter<"AuditLog"> | string
    accountId?: StringNullableFilter<"AuditLog"> | string | null
    action?: StringFilter<"AuditLog"> | string
    resourceType?: StringFilter<"AuditLog"> | string
    resourceId?: StringNullableFilter<"AuditLog"> | string | null
    correlationId?: StringFilter<"AuditLog"> | string
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    userAgent?: StringNullableFilter<"AuditLog"> | string | null
    status?: StringFilter<"AuditLog"> | string
    errorCode?: StringNullableFilter<"AuditLog"> | string | null
    metadata?: StringNullableFilter<"AuditLog"> | string | null
    durationMs?: IntNullableFilter<"AuditLog"> | number | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
  }

  export type ConnectedAccountCreateWithoutOauthTokenInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    syncState?: SyncStateCreateNestedOneWithoutAccountInput
    approvals?: ApprovalCreateNestedManyWithoutAccountInput
    auditLogs?: AuditLogCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountUncheckedCreateWithoutOauthTokenInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    syncState?: SyncStateUncheckedCreateNestedOneWithoutAccountInput
    approvals?: ApprovalUncheckedCreateNestedManyWithoutAccountInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountCreateOrConnectWithoutOauthTokenInput = {
    where: ConnectedAccountWhereUniqueInput
    create: XOR<ConnectedAccountCreateWithoutOauthTokenInput, ConnectedAccountUncheckedCreateWithoutOauthTokenInput>
  }

  export type ConnectedAccountUpsertWithoutOauthTokenInput = {
    update: XOR<ConnectedAccountUpdateWithoutOauthTokenInput, ConnectedAccountUncheckedUpdateWithoutOauthTokenInput>
    create: XOR<ConnectedAccountCreateWithoutOauthTokenInput, ConnectedAccountUncheckedCreateWithoutOauthTokenInput>
    where?: ConnectedAccountWhereInput
  }

  export type ConnectedAccountUpdateToOneWithWhereWithoutOauthTokenInput = {
    where?: ConnectedAccountWhereInput
    data: XOR<ConnectedAccountUpdateWithoutOauthTokenInput, ConnectedAccountUncheckedUpdateWithoutOauthTokenInput>
  }

  export type ConnectedAccountUpdateWithoutOauthTokenInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    syncState?: SyncStateUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUpdateManyWithoutAccountNestedInput
    auditLogs?: AuditLogUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountUncheckedUpdateWithoutOauthTokenInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    syncState?: SyncStateUncheckedUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUncheckedUpdateManyWithoutAccountNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountCreateWithoutSyncStateInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenCreateNestedOneWithoutAccountInput
    approvals?: ApprovalCreateNestedManyWithoutAccountInput
    auditLogs?: AuditLogCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountUncheckedCreateWithoutSyncStateInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenUncheckedCreateNestedOneWithoutAccountInput
    approvals?: ApprovalUncheckedCreateNestedManyWithoutAccountInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountCreateOrConnectWithoutSyncStateInput = {
    where: ConnectedAccountWhereUniqueInput
    create: XOR<ConnectedAccountCreateWithoutSyncStateInput, ConnectedAccountUncheckedCreateWithoutSyncStateInput>
  }

  export type ConnectedAccountUpsertWithoutSyncStateInput = {
    update: XOR<ConnectedAccountUpdateWithoutSyncStateInput, ConnectedAccountUncheckedUpdateWithoutSyncStateInput>
    create: XOR<ConnectedAccountCreateWithoutSyncStateInput, ConnectedAccountUncheckedCreateWithoutSyncStateInput>
    where?: ConnectedAccountWhereInput
  }

  export type ConnectedAccountUpdateToOneWithWhereWithoutSyncStateInput = {
    where?: ConnectedAccountWhereInput
    data: XOR<ConnectedAccountUpdateWithoutSyncStateInput, ConnectedAccountUncheckedUpdateWithoutSyncStateInput>
  }

  export type ConnectedAccountUpdateWithoutSyncStateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUpdateManyWithoutAccountNestedInput
    auditLogs?: AuditLogUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountUncheckedUpdateWithoutSyncStateInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUncheckedUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUncheckedUpdateManyWithoutAccountNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountCreateWithoutApprovalsInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenCreateNestedOneWithoutAccountInput
    syncState?: SyncStateCreateNestedOneWithoutAccountInput
    auditLogs?: AuditLogCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountUncheckedCreateWithoutApprovalsInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenUncheckedCreateNestedOneWithoutAccountInput
    syncState?: SyncStateUncheckedCreateNestedOneWithoutAccountInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountCreateOrConnectWithoutApprovalsInput = {
    where: ConnectedAccountWhereUniqueInput
    create: XOR<ConnectedAccountCreateWithoutApprovalsInput, ConnectedAccountUncheckedCreateWithoutApprovalsInput>
  }

  export type ConnectedAccountUpsertWithoutApprovalsInput = {
    update: XOR<ConnectedAccountUpdateWithoutApprovalsInput, ConnectedAccountUncheckedUpdateWithoutApprovalsInput>
    create: XOR<ConnectedAccountCreateWithoutApprovalsInput, ConnectedAccountUncheckedCreateWithoutApprovalsInput>
    where?: ConnectedAccountWhereInput
  }

  export type ConnectedAccountUpdateToOneWithWhereWithoutApprovalsInput = {
    where?: ConnectedAccountWhereInput
    data: XOR<ConnectedAccountUpdateWithoutApprovalsInput, ConnectedAccountUncheckedUpdateWithoutApprovalsInput>
  }

  export type ConnectedAccountUpdateWithoutApprovalsInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUpdateOneWithoutAccountNestedInput
    syncState?: SyncStateUpdateOneWithoutAccountNestedInput
    auditLogs?: AuditLogUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountUncheckedUpdateWithoutApprovalsInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUncheckedUpdateOneWithoutAccountNestedInput
    syncState?: SyncStateUncheckedUpdateOneWithoutAccountNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountCreateWithoutAuditLogsInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenCreateNestedOneWithoutAccountInput
    syncState?: SyncStateCreateNestedOneWithoutAccountInput
    approvals?: ApprovalCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountUncheckedCreateWithoutAuditLogsInput = {
    id?: string
    tenantId: string
    userId: string
    provider: string
    providerAccountId: string
    email: string
    displayName?: string | null
    status?: string
    enabledScopes?: string
    requestedScopes?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    lastSyncAt?: Date | string | null
    oauthToken?: OAuthTokenUncheckedCreateNestedOneWithoutAccountInput
    syncState?: SyncStateUncheckedCreateNestedOneWithoutAccountInput
    approvals?: ApprovalUncheckedCreateNestedManyWithoutAccountInput
  }

  export type ConnectedAccountCreateOrConnectWithoutAuditLogsInput = {
    where: ConnectedAccountWhereUniqueInput
    create: XOR<ConnectedAccountCreateWithoutAuditLogsInput, ConnectedAccountUncheckedCreateWithoutAuditLogsInput>
  }

  export type ConnectedAccountUpsertWithoutAuditLogsInput = {
    update: XOR<ConnectedAccountUpdateWithoutAuditLogsInput, ConnectedAccountUncheckedUpdateWithoutAuditLogsInput>
    create: XOR<ConnectedAccountCreateWithoutAuditLogsInput, ConnectedAccountUncheckedCreateWithoutAuditLogsInput>
    where?: ConnectedAccountWhereInput
  }

  export type ConnectedAccountUpdateToOneWithWhereWithoutAuditLogsInput = {
    where?: ConnectedAccountWhereInput
    data: XOR<ConnectedAccountUpdateWithoutAuditLogsInput, ConnectedAccountUncheckedUpdateWithoutAuditLogsInput>
  }

  export type ConnectedAccountUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUpdateOneWithoutAccountNestedInput
    syncState?: SyncStateUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUpdateManyWithoutAccountNestedInput
  }

  export type ConnectedAccountUncheckedUpdateWithoutAuditLogsInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    provider?: StringFieldUpdateOperationsInput | string
    providerAccountId?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    displayName?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    enabledScopes?: StringFieldUpdateOperationsInput | string
    requestedScopes?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    lastSyncAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    oauthToken?: OAuthTokenUncheckedUpdateOneWithoutAccountNestedInput
    syncState?: SyncStateUncheckedUpdateOneWithoutAccountNestedInput
    approvals?: ApprovalUncheckedUpdateManyWithoutAccountNestedInput
  }

  export type ApprovalCreateManyAccountInput = {
    id?: string
    tenantId: string
    userId: string
    actionType: string
    status?: string
    actionPayload: string
    riskLevel?: string
    riskReason?: string | null
    requestedAt?: Date | string
    expiresAt: Date | string
    decidedAt?: Date | string | null
    decidedBy?: string | null
    correlationId: string
    createdAt?: Date | string
  }

  export type AuditLogCreateManyAccountInput = {
    id?: string
    tenantId: string
    userId: string
    action: string
    resourceType: string
    resourceId?: string | null
    correlationId: string
    ipAddress?: string | null
    userAgent?: string | null
    status: string
    errorCode?: string | null
    metadata?: string | null
    durationMs?: number | null
    createdAt?: Date | string
  }

  export type ApprovalUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApprovalUncheckedUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ApprovalUncheckedUpdateManyWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    actionType?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    actionPayload?: StringFieldUpdateOperationsInput | string
    riskLevel?: StringFieldUpdateOperationsInput | string
    riskReason?: NullableStringFieldUpdateOperationsInput | string | null
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    decidedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    decidedBy?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyWithoutAccountInput = {
    id?: StringFieldUpdateOperationsInput | string
    tenantId?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    resourceType?: StringFieldUpdateOperationsInput | string
    resourceId?: NullableStringFieldUpdateOperationsInput | string | null
    correlationId?: StringFieldUpdateOperationsInput | string
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    userAgent?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    errorCode?: NullableStringFieldUpdateOperationsInput | string | null
    metadata?: NullableStringFieldUpdateOperationsInput | string | null
    durationMs?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ConnectedAccountCountOutputTypeDefaultArgs instead
     */
    export type ConnectedAccountCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConnectedAccountCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ConnectedAccountDefaultArgs instead
     */
    export type ConnectedAccountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConnectedAccountDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OAuthTokenDefaultArgs instead
     */
    export type OAuthTokenArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OAuthTokenDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SyncStateDefaultArgs instead
     */
    export type SyncStateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SyncStateDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ApprovalDefaultArgs instead
     */
    export type ApprovalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ApprovalDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AuditLogDefaultArgs instead
     */
    export type AuditLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AuditLogDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ProcessedEventDefaultArgs instead
     */
    export type ProcessedEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ProcessedEventDefaultArgs<ExtArgs>
    /**
     * @deprecated Use EncryptionKeyDefaultArgs instead
     */
    export type EncryptionKeyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = EncryptionKeyDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CachedMessageDefaultArgs instead
     */
    export type CachedMessageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CachedMessageDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CachedEventDefaultArgs instead
     */
    export type CachedEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CachedEventDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}