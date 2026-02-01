"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceService = void 0;
const errors_1 = require("../errors");
class GovernanceService {
    constructor(snapshot) {
        this.snapshot = snapshot;
        this.tablesByBase = this.buildTableIndex(snapshot);
    }
    ensureBaseAllowed(baseId) {
        // If allowedBases is empty, allow all bases (user will use list_bases to discover)
        if (this.snapshot.allowedBases.length > 0 && !this.snapshot.allowedBases.includes(baseId)) {
            throw new errors_1.GovernanceError(`Base ${baseId} is not in the allow-list`, {
                context: { baseId, governanceRule: 'allowedBases' }
            });
        }
    }
    ensureOperationAllowed(operation) {
        if (!this.snapshot.allowedOperations.includes(operation)) {
            throw new errors_1.GovernanceError(`Operation ${operation} is not permitted`, {
                context: { governanceRule: 'allowedOperations' }
            });
        }
    }
    ensureTableAllowed(baseId, table) {
        if (!this.isTableAllowed(baseId, table)) {
            throw new errors_1.GovernanceError(`Table ${table} is not allowed in base ${baseId}`, {
                context: { baseId, table, governanceRule: 'allowedTables' }
            });
        }
    }
    listPiiPolicies(baseId, table) {
        return this.snapshot.piiFields
            ?.filter((field) => field.baseId === baseId && field.table === table)
            .map((field) => ({ field: field.field, policy: field.policy })) ?? [];
    }
    getSnapshot() {
        return this.snapshot;
    }
    isTableAllowed(baseId, table) {
        const allowedTables = this.tablesByBase.get(baseId);
        if (!allowedTables || allowedTables.size === 0) {
            return true;
        }
        return allowedTables.has(table);
    }
    buildTableIndex(snapshot) {
        const map = new Map();
        for (const item of snapshot.allowedTables ?? []) {
            const baseTables = map.get(item.baseId) ?? new Set();
            baseTables.add(item.table);
            map.set(item.baseId, baseTables);
        }
        return map;
    }
}
exports.GovernanceService = GovernanceService;
//# sourceMappingURL=governance.js.map