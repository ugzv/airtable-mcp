"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceOutputSchema = exports.listExceptionsOutputSchema = exports.exceptionItemSchema = exports.listExceptionsInputSchema = exports.upsertOutputSchema = exports.upsertInputSchema = exports.updateInputSchema = exports.updateOutputSchema = exports.createOutputSchema = exports.createInputSchema = exports.queryOutputSchema = exports.queryInputShape = exports.queryInputSchema = exports.describeOutputSchema = exports.describeInputShape = exports.describeInputSchema = exports.detailLevelSchema = void 0;
const zod_1 = require("zod");
/**
 * Shared Zod schemas and TypeScript types for Airtable Brain tools.
 * Keep these aligned with the JSON Schemas under docs/prd/schemas.
 */
/**
 * Detail level for schema operations to optimize LLM context usage.
 * - tableIdentifiersOnly: Only table IDs and names
 * - identifiersOnly: Table, field, and view IDs and names
 * - full: Complete details including field types, options, descriptions
 */
exports.detailLevelSchema = zod_1.z.enum(['tableIdentifiersOnly', 'identifiersOnly', 'full']);
const describeInputBase = zod_1.z
    .object({
    scope: zod_1.z.enum(['base', 'table']),
    baseId: zod_1.z.string().min(1, 'baseId is required'),
    table: zod_1.z
        .string()
        .min(1, 'table is required when scope=table')
        .optional(),
    detailLevel: exports.detailLevelSchema.optional().default('full'),
    // Deprecated: use detailLevel instead
    includeFields: zod_1.z.boolean().optional().default(true),
    includeViews: zod_1.z.boolean().optional().default(false)
})
    .strict();
exports.describeInputSchema = describeInputBase.superRefine((data, ctx) => {
    if (data.scope === 'table' && !data.table) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['table'],
            message: 'table is required when scope is "table"'
        });
    }
});
exports.describeInputShape = describeInputBase.shape;
const describeFieldSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    options: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional()
})
    .passthrough();
const describeTableSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    primaryFieldId: zod_1.z.string().optional(),
    fields: zod_1.z.array(describeFieldSchema).optional(),
    views: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).optional()
})
    .passthrough();
exports.describeOutputSchema = zod_1.z
    .object({
    base: zod_1.z
        .object({
        id: zod_1.z.string(),
        name: zod_1.z.string()
    })
        .passthrough(),
    tables: zod_1.z.array(describeTableSchema).optional(),
    views: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).optional()
})
    .strict();
const sortDirectionSchema = zod_1.z.enum(['asc', 'desc']);
const queryInputBase = zod_1.z
    .object({
    baseId: zod_1.z.string().min(1, 'baseId is required'),
    table: zod_1.z.string().min(1, 'table is required'),
    fields: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    filterByFormula: zod_1.z.string().optional(),
    view: zod_1.z.string().optional(),
    sorts: zod_1.z
        .array(zod_1.z
        .object({
        field: zod_1.z.string().min(1),
        direction: sortDirectionSchema.optional().default('asc')
    })
        .strict())
        .optional(),
    pageSize: zod_1.z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional(),
    maxRecords: zod_1.z
        .number()
        .int()
        .min(1)
        .optional(),
    offset: zod_1.z.string().optional(),
    returnFieldsByFieldId: zod_1.z.boolean().optional().default(false)
})
    .strict();
exports.queryInputSchema = queryInputBase;
exports.queryInputShape = queryInputBase.shape;
const recordSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    createdTime: zod_1.z.string().optional(),
    fields: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
})
    .strict();
exports.queryOutputSchema = zod_1.z
    .object({
    records: zod_1.z.array(recordSchema),
    offset: zod_1.z.string().optional(),
    summary: zod_1.z
        .object({
        returned: zod_1.z.number().int().nonnegative(),
        hasMore: zod_1.z.boolean()
    })
        .strict()
        .optional()
})
    .strict();
exports.createInputSchema = zod_1.z
    .object({
    baseId: zod_1.z.string().min(1),
    table: zod_1.z.string().min(1),
    records: zod_1.z
        .array(zod_1.z
        .object({
        fields: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
    })
        .strict())
        .min(1),
    typecast: zod_1.z.boolean().optional().default(false),
    idempotencyKey: zod_1.z.string().min(1).optional(),
    dryRun: zod_1.z.boolean().optional().default(false)
})
    .strict();
const createDiffSchema = zod_1.z
    .object({
    added: zod_1.z.number().int().nonnegative(),
    updated: zod_1.z.number().int().nonnegative(),
    unchanged: zod_1.z.number().int().nonnegative()
})
    .strict();
exports.createOutputSchema = zod_1.z
    .object({
    diff: createDiffSchema,
    records: zod_1.z.array(recordSchema).optional(),
    dryRun: zod_1.z.boolean(),
    warnings: zod_1.z.array(zod_1.z.string()).optional()
})
    .strict();
const conflictSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    field: zod_1.z.string(),
    before: zod_1.z.unknown().optional(),
    after: zod_1.z.unknown().optional(),
    current: zod_1.z.unknown()
})
    .strict();
const mutationDiffSchema = zod_1.z
    .object({
    added: zod_1.z.number().int().nonnegative(),
    updated: zod_1.z.number().int().nonnegative(),
    unchanged: zod_1.z.number().int().nonnegative(),
    conflicts: zod_1.z.number().int().nonnegative()
})
    .strict();
exports.updateOutputSchema = zod_1.z
    .object({
    diff: mutationDiffSchema,
    records: zod_1.z.array(recordSchema).optional(),
    dryRun: zod_1.z.boolean(),
    conflicts: zod_1.z.array(conflictSchema).optional()
})
    .strict();
exports.updateInputSchema = zod_1.z
    .object({
    baseId: zod_1.z.string().min(1),
    table: zod_1.z.string().min(1),
    records: zod_1.z
        .array(zod_1.z
        .object({
        id: zod_1.z.string(),
        fields: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
    })
        .strict())
        .min(1),
    typecast: zod_1.z.boolean().optional().default(false),
    idempotencyKey: zod_1.z.string().min(1).optional(),
    dryRun: zod_1.z.boolean().optional().default(false),
    conflictStrategy: zod_1.z
        .enum(['fail_on_conflict', 'server_merge', 'client_merge'])
        .optional()
        .default('fail_on_conflict'),
    ifUnchangedHash: zod_1.z.string().optional()
})
    .strict();
exports.upsertInputSchema = zod_1.z
    .object({
    baseId: zod_1.z.string().min(1),
    table: zod_1.z.string().min(1),
    records: zod_1.z
        .array(zod_1.z
        .object({
        fields: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
    })
        .strict())
        .min(1),
    performUpsert: zod_1.z
        .object({
        fieldsToMergeOn: zod_1.z.array(zod_1.z.string().min(1)).min(1)
    })
        .strict(),
    typecast: zod_1.z.boolean().optional().default(false),
    idempotencyKey: zod_1.z.string().min(1).optional(),
    dryRun: zod_1.z.boolean().optional().default(false),
    conflictStrategy: zod_1.z
        .enum(['fail_on_conflict', 'server_merge', 'client_merge'])
        .optional()
        .default('fail_on_conflict')
})
    .strict();
exports.upsertOutputSchema = zod_1.z
    .object({
    diff: mutationDiffSchema,
    records: zod_1.z.array(recordSchema).optional(),
    dryRun: zod_1.z.boolean(),
    conflicts: zod_1.z.array(conflictSchema).optional()
})
    .strict();
exports.listExceptionsInputSchema = zod_1.z
    .object({
    since: zod_1.z.string().optional(),
    severity: zod_1.z.enum(['info', 'warning', 'error']).optional(),
    limit: zod_1.z.number().int().min(1).max(500).optional().default(100),
    cursor: zod_1.z.string().optional()
})
    .strict();
exports.exceptionItemSchema = zod_1.z
    .object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    severity: zod_1.z.enum(['info', 'warning', 'error']),
    category: zod_1.z.enum(['rate_limit', 'validation', 'auth', 'conflict', 'schema_drift', 'other']),
    summary: zod_1.z.string(),
    details: zod_1.z.string().optional(),
    proposedFix: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional()
})
    .strict();
exports.listExceptionsOutputSchema = zod_1.z
    .object({
    items: zod_1.z.array(exports.exceptionItemSchema),
    cursor: zod_1.z.string().optional()
})
    .strict();
const allowedOperations = ['describe', 'query', 'create', 'update', 'upsert'];
exports.governanceOutputSchema = zod_1.z
    .object({
    allowedBases: zod_1.z.array(zod_1.z.string()),
    allowedTables: zod_1.z
        .array(zod_1.z
        .object({
        baseId: zod_1.z.string(),
        table: zod_1.z.string()
    })
        .strict())
        .optional()
        .default([]),
    allowedOperations: zod_1.z
        .array(zod_1.z.enum(allowedOperations))
        .default([...allowedOperations]),
    piiFields: zod_1.z
        .array(zod_1.z
        .object({
        baseId: zod_1.z.string(),
        table: zod_1.z.string(),
        field: zod_1.z.string(),
        policy: zod_1.z.enum(['mask', 'hash', 'drop'])
    })
        .strict())
        .optional()
        .default([]),
    redactionPolicy: zod_1.z.enum(['mask_all_pii', 'mask_on_inline', 'none']).default('mask_on_inline'),
    loggingPolicy: zod_1.z.enum(['errors_only', 'minimal', 'verbose']).default('minimal'),
    retentionDays: zod_1.z.number().int().min(0).default(7)
})
    .strict();
//# sourceMappingURL=types.js.map