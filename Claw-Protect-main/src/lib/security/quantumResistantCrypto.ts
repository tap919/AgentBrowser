/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Post-Quantum Cryptography Module - Addresses 2026 Trend: Post-Quantum Cryptography
// Implements quantum-resistant encryption using NIST-approved algorithms
// Protects against "harvest now, decrypt later" attacks

/**
 * Runtime-agnostic base64 encoding helper
 */
function toBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('No base64 encoder available in this runtime');
}

/**
 * Runtime-agnostic base64 decoding helper
 */
function fromBase64(base64: string): string {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  throw new Error('No base64 decoder available in this runtime');
}

export interface QuantumResistantKeyPair {
  algorithm: 'ML-KEM-512' | 'ML-KEM-768' | 'ML-KEM-1024' | 'ML-DSA-44' | 'ML-DSA-65' | 'ML-DSA-87' | 'SLH-DSA-SHA2-128s' | 'SLH-DSA-SHA2-256s';
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface EncryptedData {
  algorithm: string;
  ciphertext: string;
  encapsulatedKey?: string; // For KEM algorithms
  nonce?: string;
  timestamp: Date;
}

export interface SignedData {
  algorithm: string;
  data: string;
  signature: string;
  publicKey: string;
  timestamp: Date;
}

export interface CryptoAgility {
  currentAlgorithm: string;
  supportedAlgorithms: string[];
  migrationPath: string[];
  lastMigration?: Date;
  nextRecommendedMigration?: Date;
}

export interface HarvestAttackIndicator {
  id: string;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicatorType: 'bulk-data-exfiltration' | 'encrypted-data-theft' | 'key-material-access' | 'suspicious-crypto-analysis';
  description: string;
  affectedData: string[];
  recommendedAction: string;
}

class QuantumResistantCrypto {
  private keyPairs: Map<string, QuantumResistantKeyPair> = new Map();
  private encryptionLog: EncryptedData[] = [];
  private signatureLog: SignedData[] = [];
  private harvestAttackIndicators: HarvestAttackIndicator[] = [];
  
  // NIST Post-Quantum Cryptography Standards (approved August 2024)
  private readonly SUPPORTED_ALGORITHMS = {
    // ML-KEM (Module-Lattice-Based Key Encapsulation Mechanism) - formerly Kyber
    'ML-KEM-512': { type: 'KEM', securityLevel: 1, keySize: 800 },
    'ML-KEM-768': { type: 'KEM', securityLevel: 3, keySize: 1184 },
    'ML-KEM-1024': { type: 'KEM', securityLevel: 5, keySize: 1568 },
    
    // ML-DSA (Module-Lattice-Based Digital Signature Algorithm) - formerly Dilithium
    'ML-DSA-44': { type: 'Signature', securityLevel: 2, keySize: 1312 },
    'ML-DSA-65': { type: 'Signature', securityLevel: 3, keySize: 1952 },
    'ML-DSA-87': { type: 'Signature', securityLevel: 5, keySize: 2592 },
    
    // SLH-DSA (Stateless Hash-Based Digital Signature Algorithm) - formerly SPHINCS+
    'SLH-DSA-SHA2-128s': { type: 'Signature', securityLevel: 1, keySize: 32 },
    'SLH-DSA-SHA2-256s': { type: 'Signature', securityLevel: 5, keySize: 64 },
  };

  private cryptoAgility: CryptoAgility = {
    currentAlgorithm: 'ML-KEM-768', // Default to NIST security level 3
    supportedAlgorithms: Object.keys(this.SUPPORTED_ALGORITHMS),
    migrationPath: ['ML-KEM-768', 'ML-KEM-1024'], // Progressive security enhancement
  };

  /**
   * Generate quantum-resistant key pair
   */
  generateKeyPair(algorithm: QuantumResistantKeyPair['algorithm'], expiryDays?: number): QuantumResistantKeyPair {
    const algInfo = this.SUPPORTED_ALGORITHMS[algorithm];
    
    if (!algInfo) {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    // In production, this would use actual PQC libraries like liboqs, pqcrypto, or NIST implementations
    // For now, we simulate key generation with proper structure
    const keyPair: QuantumResistantKeyPair = {
      algorithm,
      publicKey: this.generateSimulatedKey(algInfo.keySize, 'public'),
      privateKey: this.generateSimulatedKey(algInfo.keySize, 'private'),
      createdAt: new Date(),
      expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined,
    };

    const keyId = `${algorithm}_${Date.now()}`;
    this.keyPairs.set(keyId, keyPair);

    return keyPair;
  }

  /**
   * Simulate key generation (in production, use liboqs or similar)
   * 
   * NOTE: Now using crypto.getRandomValues() for secure random generation.
   * Production implementations should use specialized post-quantum cryptography libraries
   * like liboqs for actual ML-KEM key generation.
   */
  private generateSimulatedKey(keySize: number, type: 'public' | 'private'): string {
    // Generate cryptographically secure random bytes in a single allocation/call
    const randomBytes = new Uint8Array(keySize);
    crypto.getRandomValues(randomBytes);
    return `${type}_key_${toBase64(randomBytes).substring(0, 64)}`;
  }

  /**
   * Encrypt data using quantum-resistant KEM (Key Encapsulation Mechanism)
   * 
   * ⚠️ WARNING: This is a SIMULATION for demonstration purposes only!
   * This method does NOT provide real encryption - data is only base64-encoded.
   * Production implementations MUST use real encryption (e.g., WebCrypto AES-GCM)
   * combined with actual post-quantum KEM from libraries like liboqs.
   */
  encryptData(data: string, recipientPublicKey: string, algorithm: 'ML-KEM-512' | 'ML-KEM-768' | 'ML-KEM-1024' = 'ML-KEM-768'): EncryptedData {
    const algInfo = this.SUPPORTED_ALGORITHMS[algorithm];
    
    if (algInfo.type !== 'KEM') {
      throw new Error(`${algorithm} is not a KEM algorithm`);
    }

    // In production, this would:
    // 1. Generate a random symmetric key
    // 2. Encapsulate the key using the recipient's public key (ML-KEM)
    // 3. Encrypt the data with the symmetric key (AES-256-GCM)
    // 4. Return both the ciphertext and encapsulated key
    
    // WARNING: Simulated encryption only - just base64 encoding for demonstration
    const dataBytes = new TextEncoder().encode(data);
    
    const encryptedData: EncryptedData = {
      algorithm,
      ciphertext: toBase64(dataBytes), // Simulated encryption (NOT SECURE)
      encapsulatedKey: this.generateSimulatedKey(algInfo.keySize, 'public'),
      nonce: this.generateNonce(),
      timestamp: new Date(),
    };

    this.encryptionLog.push(encryptedData);
    
    // Check for potential harvest attacks
    this.detectHarvestAttacks();

    return encryptedData;
  }

  /**
   * Decrypt data using quantum-resistant KEM
   * 
   * ⚠️ WARNING: This is a SIMULATION - matches the simulated encryption above.
   */
  decryptData(encryptedData: EncryptedData, privateKey: string): string {
    // In production, this would:
    // 1. Decapsulate the symmetric key using the private key (ML-KEM)
    // 2. Decrypt the ciphertext with the symmetric key
    
    // Simulated decryption
    const decrypted = fromBase64(encryptedData.ciphertext);
    return decrypted;
  }

  /**
   * Sign data using quantum-resistant digital signature
   */
  signData(data: string, privateKey: string, algorithm: 'ML-DSA-44' | 'ML-DSA-65' | 'ML-DSA-87' | 'SLH-DSA-SHA2-128s' | 'SLH-DSA-SHA2-256s' = 'ML-DSA-65'): SignedData {
    const algInfo = this.SUPPORTED_ALGORITHMS[algorithm];
    
    if (algInfo.type !== 'Signature') {
      throw new Error(`${algorithm} is not a signature algorithm`);
    }

    // In production, this would use ML-DSA or SLH-DSA signing
    const signature = this.generateSimulatedKey(algInfo.keySize, 'private');
    
    const signedData: SignedData = {
      algorithm,
      data,
      signature,
      publicKey: privateKey.replace('private', 'public'), // Simulated
      timestamp: new Date(),
    };

    this.signatureLog.push(signedData);

    return signedData;
  }

  /**
   * Verify quantum-resistant digital signature
   */
  verifySignature(signedData: SignedData): boolean {
    // In production, this would use ML-DSA or SLH-DSA verification
    
    // Simulated verification - check if signature format is valid
    const isValid = signedData.signature.length > 50 && 
                   signedData.publicKey.includes('public_key');
    
    return isValid;
  }

  /**
   * Detect "harvest now, decrypt later" attack patterns
   */
  private detectHarvestAttacks(): void {
    const recentEncryptions = this.encryptionLog.filter(
      e => Date.now() - e.timestamp.getTime() < 60 * 1000 // Last minute
    );

    // Check for bulk data exfiltration (many encryptions in short time)
    if (recentEncryptions.length > 50) {
      this.harvestAttackIndicators.push({
        id: `harvest_${Date.now()}`,
        detectedAt: new Date(),
        severity: 'high',
        indicatorType: 'bulk-data-exfiltration',
        description: `Detected ${recentEncryptions.length} encryption operations in the last minute`,
        affectedData: recentEncryptions.map(e => e.ciphertext.substring(0, 20)),
        recommendedAction: 'Investigate for potential harvest attack. Consider immediate key rotation.',
      });
    }

    // Check for suspicious patterns in encryption log
    const last24Hours = this.encryptionLog.filter(
      e => Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    // Unusual spike in encryption activity
    if (last24Hours.length > 1000) {
      this.harvestAttackIndicators.push({
        id: `harvest_${Date.now()}`,
        detectedAt: new Date(),
        severity: 'medium',
        indicatorType: 'suspicious-crypto-analysis',
        description: `Unusually high encryption activity: ${last24Hours.length} operations in 24 hours`,
        affectedData: [],
        recommendedAction: 'Monitor for data theft attempts. Review encryption patterns.',
      });
    }

    // Limit stored indicators
    if (this.harvestAttackIndicators.length > 1000) {
      this.harvestAttackIndicators = this.harvestAttackIndicators.slice(-1000);
    }
  }

  /**
   * Get harvest attack indicators
   */
  getHarvestAttackIndicators(severity?: HarvestAttackIndicator['severity']): HarvestAttackIndicator[] {
    if (severity) {
      return this.harvestAttackIndicators.filter(i => i.severity === severity);
    }
    return this.harvestAttackIndicators;
  }

  /**
   * Migrate to new quantum-resistant algorithm (crypto agility)
   */
  migrateAlgorithm(newAlgorithm: string): boolean {
    if (!this.SUPPORTED_ALGORITHMS[newAlgorithm as keyof typeof this.SUPPORTED_ALGORITHMS]) {
      throw new Error(`Unsupported algorithm: ${newAlgorithm}`);
    }

    const oldAlgorithm = this.cryptoAgility.currentAlgorithm;
    this.cryptoAgility.currentAlgorithm = newAlgorithm;
    this.cryptoAgility.lastMigration = new Date();

    // In production, this would:
    // 1. Generate new keys with the new algorithm
    // 2. Re-encrypt sensitive data
    // 3. Update all systems to use new algorithm
    // 4. Deprecate old keys after grace period

    return true;
  }

  /**
   * Get recommended algorithm based on security requirements
   */
  getRecommendedAlgorithm(securityLevel: 1 | 2 | 3 | 4 | 5, type: 'KEM' | 'Signature'): string {
    const algorithms = Object.entries(this.SUPPORTED_ALGORITHMS)
      .filter(([_, info]) => info.type === type && info.securityLevel >= securityLevel)
      .sort((a, b) => a[1].securityLevel - b[1].securityLevel);

    return algorithms[0]?.[0] || (type === 'KEM' ? 'ML-KEM-768' : 'ML-DSA-65');
  }

  /**
   * Check if current cryptography is quantum-resistant
   */
  isQuantumResistant(algorithm?: string): boolean {
    const alg = algorithm || this.cryptoAgility.currentAlgorithm;
    return alg in this.SUPPORTED_ALGORITHMS;
  }

  /**
   * Generate nonce for encryption using cryptographically secure random generation
   */
  private generateNonce(): string {
    return Array.from({ length: 12 }, () => 
      crypto.getRandomValues(new Uint8Array(1))[0].toString(16).padStart(2, '0')
    ).join('');
  }

  /**
   * Get crypto agility status
   */
  getCryptoAgility(): CryptoAgility {
    return { ...this.cryptoAgility };
  }

  /**
   * Get algorithm information
   */
  getAlgorithmInfo(algorithm: string) {
    return this.SUPPORTED_ALGORITHMS[algorithm as keyof typeof this.SUPPORTED_ALGORITHMS] || null;
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics() {
    const recentEncryptions = this.encryptionLog.filter(
      e => Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
    );
    
    const recentSignatures = this.signatureLog.filter(
      s => Date.now() - s.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const recentIndicators = this.harvestAttackIndicators.filter(
      i => Date.now() - i.detectedAt.getTime() < 24 * 60 * 60 * 1000
    );

    return {
      totalKeyPairs: this.keyPairs.size,
      encryptionsLast24h: recentEncryptions.length,
      signaturesLast24h: recentSignatures.length,
      harvestIndicatorsLast24h: recentIndicators.length,
      criticalIndicators: recentIndicators.filter(i => i.severity === 'critical').length,
      currentAlgorithm: this.cryptoAgility.currentAlgorithm,
      isQuantumResistant: this.isQuantumResistant(),
      supportedAlgorithms: this.cryptoAgility.supportedAlgorithms.length,
    };
  }

  /**
   * Hybrid encryption: Use both classical and post-quantum for transition period
   */
  hybridEncrypt(data: string, classicalPublicKey: string, pqPublicKey: string): { classical: EncryptedData; postQuantum: EncryptedData } {
    // In production, this would use both RSA/ECC and PQC for defense in depth
    const dataBytes = new TextEncoder().encode(data);
    const classical: EncryptedData = {
      algorithm: 'RSA-4096',
      ciphertext: toBase64(dataBytes),
      timestamp: new Date(),
    };

    const postQuantum = this.encryptData(data, pqPublicKey);

    return { classical, postQuantum };
  }

  /**
   * Assess quantum threat level based on data sensitivity and time horizon
   */
  assessQuantumThreat(dataSensitivity: 'public' | 'internal' | 'confidential' | 'secret' | 'top-secret', timeHorizon: number): {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
    urgency: string;
  } {
    // NIST estimates quantum computers capable of breaking RSA could exist by 2030-2035
    const yearsToQuantumThreat = 5; // Conservative estimate
    
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendation = '';
    let urgency = '';

    if (timeHorizon > yearsToQuantumThreat) {
      // Data needs protection beyond quantum threat horizon
      if (dataSensitivity === 'top-secret' || dataSensitivity === 'secret') {
        threatLevel = 'critical';
        recommendation = 'Immediate migration to post-quantum cryptography required. Data is vulnerable to harvest attacks.';
        urgency = 'URGENT - Migrate within 30 days';
      } else if (dataSensitivity === 'confidential') {
        threatLevel = 'high';
        recommendation = 'Begin post-quantum migration planning. Use hybrid encryption.';
        urgency = 'HIGH - Migrate within 90 days';
      } else {
        threatLevel = 'medium';
        recommendation = 'Consider post-quantum cryptography for future-proofing.';
        urgency = 'MEDIUM - Migrate within 180 days';
      }
    } else {
      // Data protection needed for shorter period
      if (dataSensitivity === 'top-secret' || dataSensitivity === 'secret') {
        threatLevel = 'medium';
        recommendation = 'Monitor quantum computing developments. Plan migration.';
        urgency = 'MEDIUM - Migrate within 180 days';
      } else {
        threatLevel = 'low';
        recommendation = 'Current cryptography sufficient for time horizon.';
        urgency = 'LOW - Migrate within 1 year';
      }
    }

    return { threatLevel, recommendation, urgency };
  }
}

// Export singleton instance
export const quantumResistantCrypto = new QuantumResistantCrypto();
