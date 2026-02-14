
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.ConnectedAccountScalarFieldEnum = {
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

exports.Prisma.OAuthTokenScalarFieldEnum = {
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

exports.Prisma.SyncStateScalarFieldEnum = {
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

exports.Prisma.ApprovalScalarFieldEnum = {
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

exports.Prisma.AuditLogScalarFieldEnum = {
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

exports.Prisma.ProcessedEventScalarFieldEnum = {
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

exports.Prisma.EncryptionKeyScalarFieldEnum = {
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

exports.Prisma.CachedMessageScalarFieldEnum = {
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

exports.Prisma.CachedEventScalarFieldEnum = {
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

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
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

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
