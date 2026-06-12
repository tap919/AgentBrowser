/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Agent State Management - State Checkpointing & Rollback
// Allows agents to save and revert to prior "safe states" if downstream tasks fail
// or behave unexpectedly, preventing cascading failures

export interface AgentState {
  agentId: string;
  checkpointId: string;
  timestamp: Date;
  state: {
    memory: Record<string, unknown>;
    context: Record<string, unknown>;
    variables: Record<string, unknown>;
    flags: Record<string, boolean>;
  };
  metadata: {
    description: string;
    tags: string[];
    automatic: boolean; // true if auto-saved, false if manual
  };
  hash: string; // SHA-256 hash of state for integrity verification
}

export interface StateCheckpoint {
  checkpointId: string;
  agentId: string;
  createdAt: Date;
  state: AgentState['state'];
  metadata: AgentState['metadata'];
  parentCheckpointId?: string; // For checkpoint chains
}

export interface RollbackOperation {
  operationId: string;
  agentId: string;
  fromCheckpointId: string;
  toCheckpointId: string;
  timestamp: Date;
  reason: string;
  success: boolean;
  changes: {
    added: string[];
    modified: string[];
    removed: string[];
  };
}

export interface StateManagerConfig {
  maxCheckpointsPerAgent: number; // Default: 50
  checkpointRetentionDays: number; // Default: 30
  autoCheckpointInterval: number; // Minutes; 0 = disabled (not yet implemented)
  compressionEnabled: boolean; // Compress large states (not yet implemented)
  encryptionEnabled: boolean; // Encrypt sensitive state data (not yet implemented)
}

class StateManager {
  private checkpoints: Map<string, StateCheckpoint[]> = new Map();
  private rollbackHistory: RollbackOperation[] = [];
  private config: StateManagerConfig = {
    maxCheckpointsPerAgent: 50,
    checkpointRetentionDays: 30,
    autoCheckpointInterval: 15, // Auto-checkpoint every 15 min
    compressionEnabled: true,
    encryptionEnabled: true,
  };

  /**
   * Create a new state checkpoint for an agent
   */
  createCheckpoint(params: {
    agentId: string;
    state: AgentState['state'];
    description: string;
    tags?: string[];
    automatic?: boolean;
  }): StateCheckpoint {
    const { agentId, state, description, tags = [], automatic = false } = params;

    const checkpointId = `ckpt-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
    const checkpoint: StateCheckpoint = {
      checkpointId,
      agentId,
      createdAt: new Date(),
      state: this.cloneState(state),
      metadata: {
        description,
        tags,
        automatic,
      },
    };

    // Add to checkpoint history
    if (!this.checkpoints.has(agentId)) {
      this.checkpoints.set(agentId, []);
    }

    const agentCheckpoints = this.checkpoints.get(agentId)!;
    agentCheckpoints.push(checkpoint);

    // Enforce max checkpoints per agent
    if (agentCheckpoints.length > this.config.maxCheckpointsPerAgent) {
      agentCheckpoints.shift(); // Remove oldest
    }

    // Clean up old checkpoints
    this.cleanupExpiredCheckpoints(agentId);

    return checkpoint;
  }

  /**
   * Rollback agent to a previous checkpoint
   */
  rollback(params: {
    agentId: string;
    checkpointId: string;
    reason: string;
  }): RollbackOperation {
    const { agentId, checkpointId, reason } = params;

    const agentCheckpoints = this.checkpoints.get(agentId);
    if (!agentCheckpoints || agentCheckpoints.length === 0) {
      throw new Error(`No checkpoints found for agent ${agentId}`);
    }

    const targetCheckpoint = agentCheckpoints.find(
      (cp) => cp.checkpointId === checkpointId
    );

    if (!targetCheckpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found for agent ${agentId}`);
    }

    // Determine current state (latest checkpoint)
    const currentCheckpoint = agentCheckpoints[agentCheckpoints.length - 1];

    const operation: RollbackOperation = {
      operationId: `rollback-${Date.now()}`,
      agentId,
      fromCheckpointId: currentCheckpoint.checkpointId,
      toCheckpointId: checkpointId,
      timestamp: new Date(),
      reason,
      success: true,
      changes: this.calculateStateChanges(
        currentCheckpoint.state,
        targetCheckpoint.state
      ),
    };

    this.rollbackHistory.push(operation);

    // Create a new checkpoint representing the rolled-back state
    // This makes the rollback persistent and traceable
    const rollbackCheckpoint = this.createCheckpoint({
      agentId,
      state: targetCheckpoint.state,
      description: `Rollback to ${checkpointId}: ${reason}`,
      tags: ['rollback', targetCheckpoint.checkpointId],
      automatic: false,
    });

    operation.success = true;
    return operation;
  }

  /**
   * Get all checkpoints for an agent
   */
  getCheckpoints(agentId: string): StateCheckpoint[] {
    return this.checkpoints.get(agentId) || [];
  }

  /**
   * Get a specific checkpoint
   */
  getCheckpoint(agentId: string, checkpointId: string): StateCheckpoint | undefined {
    const agentCheckpoints = this.checkpoints.get(agentId);
    return agentCheckpoints?.find((cp) => cp.checkpointId === checkpointId);
  }

  /**
   * Delete a specific checkpoint
   */
  deleteCheckpoint(agentId: string, checkpointId: string): boolean {
    const agentCheckpoints = this.checkpoints.get(agentId);
    if (!agentCheckpoints) return false;

    const index = agentCheckpoints.findIndex(
      (cp) => cp.checkpointId === checkpointId
    );

    if (index === -1) return false;

    agentCheckpoints.splice(index, 1);
    return true;
  }

  /**
   * Delete all checkpoints for an agent
   */
  deleteAllCheckpoints(agentId: string): number {
    const agentCheckpoints = this.checkpoints.get(agentId);
    if (!agentCheckpoints) return 0;

    const count = agentCheckpoints.length;
    this.checkpoints.delete(agentId);
    return count;
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(agentId?: string): RollbackOperation[] {
    if (agentId) {
      return this.rollbackHistory.filter((op) => op.agentId === agentId);
    }
    return this.rollbackHistory;
  }

  /**
   * Compare two checkpoints and show differences
   */
  compareCheckpoints(
    agentId: string,
    checkpointId1: string,
    checkpointId2: string
  ): {
    checkpoint1: StateCheckpoint;
    checkpoint2: StateCheckpoint;
    differences: {
      added: string[];
      modified: string[];
      removed: string[];
    };
  } {
    const cp1 = this.getCheckpoint(agentId, checkpointId1);
    const cp2 = this.getCheckpoint(agentId, checkpointId2);

    if (!cp1 || !cp2) {
      throw new Error('One or both checkpoints not found');
    }

    return {
      checkpoint1: cp1,
      checkpoint2: cp2,
      differences: this.calculateStateChanges(cp1.state, cp2.state),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StateManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): StateManagerConfig {
    return { ...this.config };
  }

  /**
   * Get statistics about checkpoints
   */
  getStatistics(): {
    totalAgents: number;
    totalCheckpoints: number;
    averageCheckpointsPerAgent: number;
    totalRollbacks: number;
    oldestCheckpoint: Date | null;
    newestCheckpoint: Date | null;
  } {
    let totalCheckpoints = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;

    for (const checkpoints of this.checkpoints.values()) {
      totalCheckpoints += checkpoints.length;

      for (const cp of checkpoints) {
        if (!oldestDate || cp.createdAt < oldestDate) {
          oldestDate = cp.createdAt;
        }
        if (!newestDate || cp.createdAt > newestDate) {
          newestDate = cp.createdAt;
        }
      }
    }

    return {
      totalAgents: this.checkpoints.size,
      totalCheckpoints,
      averageCheckpointsPerAgent:
        this.checkpoints.size > 0 ? totalCheckpoints / this.checkpoints.size : 0,
      totalRollbacks: this.rollbackHistory.length,
      oldestCheckpoint: oldestDate,
      newestCheckpoint: newestDate,
    };
  }

  // --- Private Helper Methods ---

  /**
   * Deep clone supported state values while preserving object identity for
   * circular/shared references.
   */
  private deepCloneValue<T>(value: T, seen = new WeakMap<object, unknown>()): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return new Date(value.getTime()) as T;
    }

    if (seen.has(value)) {
      return seen.get(value) as T;
    }

    if (Array.isArray(value)) {
      const clonedArray: unknown[] = [];
      seen.set(value, clonedArray);

      for (const item of value) {
        clonedArray.push(this.deepCloneValue(item, seen));
      }

      return clonedArray as T;
    }

    if (value instanceof Map) {
      const clonedMap = new Map<unknown, unknown>();
      seen.set(value, clonedMap);

      for (const [mapKey, mapValue] of value.entries()) {
        clonedMap.set(
          this.deepCloneValue(mapKey, seen),
          this.deepCloneValue(mapValue, seen)
        );
      }

      return clonedMap as T;
    }

    if (value instanceof Set) {
      const clonedSet = new Set<unknown>();
      seen.set(value, clonedSet);

      for (const item of value.values()) {
        clonedSet.add(this.deepCloneValue(item, seen));
      }

      return clonedSet as T;
    }

    const clonedObject: Record<string, unknown> = {};
    seen.set(value, clonedObject);

    for (const [objectKey, objectValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      clonedObject[objectKey] = this.deepCloneValue(objectValue, seen);
    }

    return clonedObject as T;
  }

  /**
   * Deep clone state object
   */
  private cloneState(state: AgentState['state']): AgentState['state'] {
    if (typeof structuredClone === 'function') {
      return structuredClone(state);
    }

    return this.deepCloneValue(state);
  }

  /**
   * Calculate differences between two states
   */
  private calculateStateChanges(
    oldState: AgentState['state'],
    newState: AgentState['state']
  ): {
    added: string[];
    modified: string[];
    removed: string[];
  } {
    const added: string[] = [];
    const modified: string[] = [];
    const removed: string[] = [];

    const allKeys = new Set([
      ...Object.keys(oldState.memory || {}),
      ...Object.keys(newState.memory || {}),
      ...Object.keys(oldState.context || {}),
      ...Object.keys(newState.context || {}),
      ...Object.keys(oldState.variables || {}),
      ...Object.keys(newState.variables || {}),
    ]);

    for (const key of allKeys) {
      const oldValue = this.getNestedValue(oldState, key);
      const newValue = this.getNestedValue(newState, key);

      if (oldValue === undefined && newValue !== undefined) {
        added.push(key);
      } else if (oldValue !== undefined && newValue === undefined) {
        removed.push(key);
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        modified.push(key);
      }
    }

    return { added, modified, removed };
  }

  /**
   * Get nested value from state
   */
  private getNestedValue(
    state: AgentState['state'],
    key: string
  ): unknown {
    if (Object.prototype.hasOwnProperty.call(state.memory, key)) {
      return state.memory[key];
    }

    if (Object.prototype.hasOwnProperty.call(state.context, key)) {
      return state.context[key];
    }

    if (Object.prototype.hasOwnProperty.call(state.variables, key)) {
      return state.variables[key];
    }

    return undefined;
  }

  /**
   * Clean up expired checkpoints
   */
  private cleanupExpiredCheckpoints(agentId: string): void {
    const agentCheckpoints = this.checkpoints.get(agentId);
    if (!agentCheckpoints) return;

    const now = new Date();
    const expirationDate = new Date(
      now.getTime() - this.config.checkpointRetentionDays * 24 * 60 * 60 * 1000
    );

    const validCheckpoints = agentCheckpoints.filter(
      (cp) => cp.createdAt >= expirationDate
    );

    if (validCheckpoints.length < agentCheckpoints.length) {
      this.checkpoints.set(agentId, validCheckpoints);
    }
  }
}

// Singleton instance
export const stateManager = new StateManager();

// Named exports for types and main instance
export { StateManager };
export default stateManager;
