/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// AI-Assisted SOC (Security Operations Center) - Addresses 2026 Trend: Workforce & Skills Gap
// LLM-powered threat analysis, automated playbook generation, natural language security queries

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'false-positive';
  detectedAt: Date;
  assignedTo?: string;
  indicators: string[];
  affectedAssets: string[];
  recommendedActions: string[];
  timeline: IncidentTimelineEntry[];
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  actor: 'system' | 'analyst' | 'ai-assistant';
  details: string;
}

export interface ThreatIntelligence {
  id: string;
  threatType: string;
  description: string;
  indicators: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  publishedAt: Date;
  relevanceScore: number; // 0-100
}

export interface AIThreatAnalysis {
  incidentId: string;
  analysis: string;
  confidence: number; // 0-100
  attackVector: string;
  likelyAttacker: string;
  impactAssessment: string;
  recommendedResponse: string[];
  relatedThreats: string[];
  generatedAt: Date;
}

export interface AutomatedPlaybook {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  steps: SOCPlaybookStep[];
  createdAt: Date;
  createdBy: 'system' | 'analyst' | 'ai-generated';
  executionCount: number;
  successRate: number; // 0-100
}

export interface SOCPlaybookStep {
  stepNumber: number;
  action: string;
  automation: 'fully-automated' | 'semi-automated' | 'manual';
  description: string;
  expectedOutcome: string;
  requiresApproval: boolean;
}

export interface NaturalLanguageQuery {
  id: string;
  query: string;
  intent: 'threat-search' | 'incident-lookup' | 'vulnerability-check' | 'recommendation' | 'status-check';
  response: string;
  sources: string[];
  confidence: number; // 0-100
  timestamp: Date;
}

export interface SkillGapCompensation {
  task: string;
  requiredSkillLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
  aiAssistanceLevel: 'low' | 'medium' | 'high';
  compensationFeatures: string[];
  guidanceProvided: string[];
}

export interface ThreatIntelFeed {
  id: string;
  name: string;
  type: 'STIX' | 'TAXII' | 'CSV' | 'JSON' | 'RSS';
  url: string;
  apiKey?: string;
  enabled: boolean;
  lastSync: Date;
  itemCount: number;
  reliability: number; // 0-100
}

export interface EnrichedThreatData {
  originalIndicator: string;
  enrichedData: {
    threatType: string;
    malwareFamily?: string;
    attackCampaign?: string;
    threatActorGroup?: string;
    geolocation?: string;
    firstSeen: Date;
    lastSeen: Date;
    prevalence: number; // 0-100
    confidence: number; // 0-100
  };
  sources: string[];
  tags: string[];
}

class AIAssistedSOC {
  private incidents: Map<string, SecurityIncident> = new Map();
  private threatIntelligence: ThreatIntelligence[] = [];
  private threatFeeds: Map<string, ThreatIntelFeed> = new Map();
  private enrichedThreats: Map<string, EnrichedThreatData> = new Map();
  private aiAnalyses: Map<string, AIThreatAnalysis> = new Map();
  private playbooks: Map<string, AutomatedPlaybook> = new Map();
  private queryHistory: NaturalLanguageQuery[] = [];
  private readonly MAX_ENRICHED_CACHE_SIZE = 10000; // Max cached enriched threats

  /**
   * Create security incident
   */
  createIncident(incident: Omit<SecurityIncident, 'id' | 'detectedAt' | 'status' | 'timeline'>): SecurityIncident {
    const fullIncident: SecurityIncident = {
      ...incident,
      id: `incident_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
      detectedAt: new Date(),
      status: 'open',
      timeline: [
        {
          timestamp: new Date(),
          action: 'Incident created',
          actor: 'system',
          details: `Incident detected: ${incident.title}`,
        },
      ],
    };

    this.incidents.set(fullIncident.id, fullIncident);

    // Automatically generate AI analysis for high/critical incidents
    if (incident.severity === 'high' || incident.severity === 'critical') {
      this.generateAIAnalysis(fullIncident.id);
    }

    // Find and suggest relevant playbook
    const relevantPlaybook = this.findRelevantPlaybook(incident.title, incident.description);
    if (relevantPlaybook) {
      this.addToTimeline(fullIncident.id, 'system', 'AI assistant', 
        `Suggested playbook: ${relevantPlaybook.name}`);
    }

    return fullIncident;
  }

  /**
   * Generate AI-powered threat analysis
   */
  generateAIAnalysis(incidentId: string): AIThreatAnalysis | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    // In production, this would use an LLM (Gemini, GPT, Claude) for analysis
    // Here we simulate intelligent analysis based on incident data
    
    const analysis = this.simulateAIAnalysis(incident);
    this.aiAnalyses.set(incidentId, analysis);

    // Add to incident timeline
    this.addToTimeline(incidentId, 'ai-assistant', 'AI threat analysis',
      `AI analysis completed with ${analysis.confidence}% confidence`);

    // Update incident with AI recommendations
    incident.recommendedActions = analysis.recommendedResponse;
    this.incidents.set(incidentId, incident);

    return analysis;
  }

  /**
   * Simulate AI analysis (in production, use real LLM)
   */
  private simulateAIAnalysis(incident: SecurityIncident): AIThreatAnalysis {
    // Analyze incident indicators and description
    const indicators = incident.indicators.join(' ').toLowerCase();
    const description = incident.description.toLowerCase();
    const combined = `${indicators} ${description}`;

    // Determine attack vector
    let attackVector = 'Unknown';
    let confidence = 70;

    if (combined.includes('phishing') || combined.includes('email')) {
      attackVector = 'Phishing/Social Engineering';
      confidence = 85;
    } else if (combined.includes('malware') || combined.includes('ransomware')) {
      attackVector = 'Malware/Ransomware';
      confidence = 90;
    } else if (combined.includes('injection') || combined.includes('sql')) {
      attackVector = 'Injection Attack';
      confidence = 80;
    } else if (combined.includes('brute') || combined.includes('password')) {
      attackVector = 'Credential Attack';
      confidence = 85;
    } else if (combined.includes('ddos') || combined.includes('dos')) {
      attackVector = 'Denial of Service';
      confidence = 90;
    }

    // Determine likely attacker
    let likelyAttacker = 'Unknown threat actor';
    if (incident.severity === 'critical') {
      likelyAttacker = 'Sophisticated threat actor or nation-state';
      confidence += 5;
    } else if (combined.includes('ransomware')) {
      likelyAttacker = 'Ransomware group (possibly RaaS operator)';
      confidence += 5;
    } else {
      likelyAttacker = 'Opportunistic attacker or script kiddie';
    }

    // Impact assessment
    const impactAssessment = incident.severity === 'critical'
      ? 'SEVERE: Potential for significant data loss, operational disruption, or financial impact'
      : incident.severity === 'high'
      ? 'HIGH: Risk of data compromise or service disruption'
      : incident.severity === 'medium'
      ? 'MEDIUM: Limited impact, but requires investigation'
      : 'LOW: Minimal impact, monitoring recommended';

    // Generate response recommendations
    const recommendedResponse: string[] = [];
    
    if (attackVector.includes('Phishing')) {
      recommendedResponse.push('1. Quarantine suspicious emails');
      recommendedResponse.push('2. Reset credentials for affected users');
      recommendedResponse.push('3. Conduct security awareness training');
    } else if (attackVector.includes('Ransomware')) {
      recommendedResponse.push('1. ISOLATE: Disconnect affected systems immediately');
      recommendedResponse.push('2. PRESERVE: Maintain system state for forensics');
      recommendedResponse.push('3. RESTORE: Verify backups and restore from clean state');
      recommendedResponse.push('4. INVESTIGATE: Determine initial access vector');
    } else if (attackVector.includes('Injection')) {
      recommendedResponse.push('1. Patch vulnerable application immediately');
      recommendedResponse.push('2. Review and sanitize all user inputs');
      recommendedResponse.push('3. Audit database for unauthorized changes');
    } else {
      recommendedResponse.push('1. Investigate indicators of compromise');
      recommendedResponse.push('2. Contain affected systems if necessary');
      recommendedResponse.push('3. Monitor for further suspicious activity');
    }

    // Find related threats
    const relatedThreats = this.threatIntelligence
      .filter(ti => {
        const tiText = `${ti.description} ${ti.threatType}`.toLowerCase();
        return tiText.includes(attackVector.split('/')[0].toLowerCase());
      })
      .map(ti => ti.id)
      .slice(0, 3);

    return {
      incidentId: incident.id,
      analysis: `This appears to be a ${attackVector} attack. ${
        incident.severity === 'critical' 
          ? 'The sophisticated nature and critical severity suggest an advanced threat actor.'
          : 'The attack pattern is consistent with common threat actor methodologies.'
      }`,
      confidence,
      attackVector,
      likelyAttacker,
      impactAssessment,
      recommendedResponse,
      relatedThreats,
      generatedAt: new Date(),
    };
  }

  /**
   * Process natural language security query
   */
  processNaturalLanguageQuery(query: string): NaturalLanguageQuery {
    // Determine query intent
    const intent = this.determineQueryIntent(query);
    
    // Generate response based on intent
    const response = this.generateQueryResponse(query, intent);
    
    const nlQuery: NaturalLanguageQuery = {
      id: `query_${Date.now()}`,
      query,
      intent,
      response: response.text,
      sources: response.sources,
      confidence: response.confidence,
      timestamp: new Date(),
    };

    this.queryHistory.push(nlQuery);

    // Limit query history
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }

    return nlQuery;
  }

  /**
   * Determine intent of natural language query
   */
  private determineQueryIntent(query: string): NaturalLanguageQuery['intent'] {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('threat') || lowerQuery.includes('attack') || lowerQuery.includes('malware')) {
      return 'threat-search';
    }
    if (lowerQuery.includes('incident') || lowerQuery.includes('alert')) {
      return 'incident-lookup';
    }
    if (lowerQuery.includes('vulnerable') || lowerQuery.includes('cve') || lowerQuery.includes('patch')) {
      return 'vulnerability-check';
    }
    if (lowerQuery.includes('how') || lowerQuery.includes('what should') || lowerQuery.includes('recommend')) {
      return 'recommendation';
    }
    
    return 'status-check';
  }

  /**
   * Generate response to query
   */
  private generateQueryResponse(query: string, intent: NaturalLanguageQuery['intent']): {
    text: string;
    sources: string[];
    confidence: number;
  } {
    const sources: string[] = [];
    let text = '';
    let confidence = 70;

    switch (intent) {
      case 'threat-search':
        const recentThreats = this.threatIntelligence.slice(-5);
        if (recentThreats.length > 0) {
          text = `Found ${recentThreats.length} recent threats:\n`;
          recentThreats.forEach(threat => {
            text += `- ${threat.threatType}: ${threat.description.substring(0, 100)}...\n`;
            sources.push(threat.source);
          });
          confidence = 85;
        } else {
          text = 'No matching threats found in current intelligence database.';
        }
        break;

      case 'incident-lookup':
        const openIncidents = Array.from(this.incidents.values()).filter(
          i => i.status === 'open' || i.status === 'investigating'
        );
        if (openIncidents.length > 0) {
          text = `There are ${openIncidents.length} active incidents:\n`;
          openIncidents.forEach(incident => {
            text += `- [${incident.severity.toUpperCase()}] ${incident.title} (${incident.status})\n`;
            sources.push(`Incident ${incident.id}`);
          });
          confidence = 90;
        } else {
          text = 'No active incidents at this time.';
          confidence = 95;
        }
        break;

      case 'recommendation':
        text = `Based on current threat landscape and system state:\n`;
        text += `1. Ensure all systems are patched to latest security updates\n`;
        text += `2. Monitor for indicators of compromise from recent threat intelligence\n`;
        text += `3. Conduct regular security awareness training\n`;
        text += `4. Review and update incident response playbooks\n`;
        text += `5. Test backup and recovery procedures`;
        sources.push('AI Security Recommendations');
        confidence = 75;
        break;

      case 'vulnerability-check':
        text = 'Vulnerability assessment functionality would integrate with CVE databases and vulnerability scanners.';
        confidence = 70;
        break;

      case 'status-check':
      default:
        const stats = this.getStatistics();
        text = `Security Operations Status:\n`;
        text += `- Active Incidents: ${stats.activeIncidents}\n`;
        text += `- Critical Incidents: ${stats.criticalIncidents}\n`;
        text += `- Threat Intelligence Items: ${stats.threatIntelligenceCount}\n`;
        text += `- Available Playbooks: ${stats.playbookCount}`;
        sources.push('SOC Dashboard');
        confidence = 95;
        break;
    }

    return { text, sources, confidence };
  }

  /**
   * Generate automated response playbook from threat intelligence
   */
  generatePlaybookFromThreat(threatId: string): AutomatedPlaybook | null {
    const threat = this.threatIntelligence.find(ti => ti.id === threatId);
    if (!threat) return null;

    const steps: SOCPlaybookStep[] = [];
    let stepNumber = 1;

    // Detection step
    steps.push({
      stepNumber: stepNumber++,
      action: 'Detection',
      automation: 'fully-automated',
      description: `Monitor for indicators: ${threat.indicators.join(', ')}`,
      expectedOutcome: 'Alert triggered when indicators detected',
      requiresApproval: false,
    });

    // Containment steps
    if (threat.severity === 'critical' || threat.severity === 'high') {
      steps.push({
        stepNumber: stepNumber++,
        action: 'Containment',
        automation: 'semi-automated',
        description: 'Isolate affected systems from network',
        expectedOutcome: 'Prevent lateral movement',
        requiresApproval: true,
      });
    }

    // Investigation step
    steps.push({
      stepNumber: stepNumber++,
      action: 'Investigation',
      automation: 'manual',
      description: `Analyze logs and system state for ${threat.threatType}`,
      expectedOutcome: 'Determine scope and impact',
      requiresApproval: false,
    });

    // Eradication step
    steps.push({
      stepNumber: stepNumber++,
      action: 'Eradication',
      automation: 'manual',
      description: 'Remove threat and restore systems to secure state',
      expectedOutcome: 'Threat eliminated',
      requiresApproval: true,
    });

    // Recovery step
    steps.push({
      stepNumber: stepNumber++,
      action: 'Recovery',
      automation: 'semi-automated',
      description: 'Restore services and monitor for recurrence',
      expectedOutcome: 'Normal operations resumed',
      requiresApproval: false,
    });

    const playbook: AutomatedPlaybook = {
      id: `playbook_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
      name: `Response to ${threat.threatType}`,
      description: `Automated response playbook for ${threat.description}`,
      triggerConditions: threat.indicators,
      steps,
      createdAt: new Date(),
      createdBy: 'ai-generated',
      executionCount: 0,
      successRate: 0,
    };

    this.playbooks.set(playbook.id, playbook);
    return playbook;
  }

  /**
   * Find relevant playbook for incident
   */
  private findRelevantPlaybook(title: string, description: string): AutomatedPlaybook | null {
    const text = `${title} ${description}`.toLowerCase();
    const playbooks = Array.from(this.playbooks.values());

    for (const playbook of playbooks) {
      const matchScore = playbook.triggerConditions.filter(condition =>
        text.includes(condition.toLowerCase())
      ).length;

      if (matchScore > 0) {
        return playbook;
      }
    }

    return null;
  }

  /**
   * Add entry to incident timeline
   */
  private addToTimeline(incidentId: string, actor: IncidentTimelineEntry['actor'], action: string, details: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.timeline.push({
      timestamp: new Date(),
      action,
      actor,
      details,
    });

    this.incidents.set(incidentId, incident);
  }

  /**
   * Provide skill-gap compensation guidance
   */
  provideSkillGuidance(task: string, analystLevel: 'junior' | 'intermediate' | 'senior' | 'expert'): SkillGapCompensation {
    // Determine required skill level for task
    let requiredSkillLevel: SkillGapCompensation['requiredSkillLevel'] = 'intermediate';
    if (task.includes('forensic') || task.includes('malware analysis')) {
      requiredSkillLevel = 'expert';
    } else if (task.includes('incident response') || task.includes('threat hunting')) {
      requiredSkillLevel = 'senior';
    }

    // Calculate AI assistance level needed
    const skillGap = ['junior', 'intermediate', 'senior', 'expert'].indexOf(requiredSkillLevel) -
                    ['junior', 'intermediate', 'senior', 'expert'].indexOf(analystLevel);
    
    let aiAssistanceLevel: SkillGapCompensation['aiAssistanceLevel'] = 'low';
    if (skillGap > 1) {
      aiAssistanceLevel = 'high';
    } else if (skillGap === 1) {
      aiAssistanceLevel = 'medium';
    }

    // Generate compensation features
    const compensationFeatures: string[] = [];
    const guidanceProvided: string[] = [];

    if (aiAssistanceLevel === 'high') {
      compensationFeatures.push('Step-by-step guidance with explanations');
      compensationFeatures.push('Automated initial analysis');
      compensationFeatures.push('Suggested response actions');
      compensationFeatures.push('Real-time validation of decisions');
      
      guidanceProvided.push('AI will provide detailed walkthroughs for complex procedures');
      guidanceProvided.push('Automated tools will handle routine analysis tasks');
      guidanceProvided.push('Expert recommendations will be provided at each decision point');
    } else if (aiAssistanceLevel === 'medium') {
      compensationFeatures.push('Contextual assistance');
      compensationFeatures.push('Best practice recommendations');
      
      guidanceProvided.push('AI will provide guidance when requested');
      guidanceProvided.push('Best practices will be highlighted during investigation');
    } else {
      compensationFeatures.push('Reference materials available');
      
      guidanceProvided.push('Documentation and references accessible on demand');
    }

    return {
      task,
      requiredSkillLevel,
      aiAssistanceLevel,
      compensationFeatures,
      guidanceProvided,
    };
  }

  /**
   * Add threat intelligence
   */
  addThreatIntelligence(threat: Omit<ThreatIntelligence, 'id'>): ThreatIntelligence {
    const fullThreat: ThreatIntelligence = {
      ...threat,
      id: `threat_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
    };

    this.threatIntelligence.push(fullThreat);

    // Auto-generate playbook for high-severity threats
    if (threat.severity === 'critical' || threat.severity === 'high') {
      this.generatePlaybookFromThreat(fullThreat.id);
    }

    return fullThreat;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const incidents = Array.from(this.incidents.values());
    const activeIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');

    return {
      totalIncidents: incidents.length,
      activeIncidents: activeIncidents.length,
      criticalIncidents: activeIncidents.filter(i => i.severity === 'critical').length,
      threatIntelligenceCount: this.threatIntelligence.length,
      aiAnalysesGenerated: this.aiAnalyses.size,
      playbookCount: this.playbooks.size,
      queriesProcessed: this.queryHistory.length,
      threatFeedCount: this.threatFeeds.size,
      enrichedThreatCount: this.enrichedThreats.size,
    };
  }

  // ─── Threat Intelligence Feed Integration ─────────────────────────────────────

  /**
   * Register a threat intelligence feed (STIX/TAXII/etc.)
   */
  registerThreatFeed(feed: Omit<ThreatIntelFeed, 'id' | 'lastSync' | 'itemCount'>): ThreatIntelFeed {
    const fullFeed: ThreatIntelFeed = {
      ...feed,
      id: `feed_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
      lastSync: new Date(0), // Never synced
      itemCount: 0,
    };

    this.threatFeeds.set(fullFeed.id, fullFeed);
    return fullFeed;
  }

  /**
   * Sync threat intelligence from external feeds
   * In production, this would make HTTP requests to STIX/TAXII servers
   */
  async syncThreatFeeds(): Promise<{
    synced: number;
    failed: number;
    newThreats: number;
  }> {
    let synced = 0;
    let failed = 0;
    let newThreats = 0;

    for (const feed of this.threatFeeds.values()) {
      if (!feed.enabled) continue;

      try {
        // In production: fetch from feed.url with feed.apiKey
        // Here we simulate feed sync
        const threats = await this.simulateFeedSync(feed);
        
        // Add new threats to intelligence database
        for (const threat of threats) {
          const existing = this.threatIntelligence.find(
            t => t.indicators.some(i => threat.indicators.includes(i))
          );

          if (!existing) {
            this.addThreatIntelligence(threat);
            newThreats++;
          }
        }

        // Update feed metadata
        feed.lastSync = new Date();
        feed.itemCount = threats.length;
        this.threatFeeds.set(feed.id, feed);
        synced++;

      } catch (error) {
        // Redact sensitive details before logging
        const safeError = error instanceof Error 
          ? `${error.name}: ${error.message}` 
          : 'Unknown error';
        console.error(`Failed to sync feed ${feed.name}: ${safeError}`);
        failed++;
      }
    }

    return { synced, failed, newThreats };
  }

  /**
   * Simulate threat feed sync (in production, replace with real API calls)
   */
  private async simulateFeedSync(feed: ThreatIntelFeed): Promise<Omit<ThreatIntelligence, 'id'>[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return mock threat data
    const threats: Omit<ThreatIntelligence, 'id'>[] = [];

    if (feed.type === 'STIX' || feed.type === 'TAXII') {
      threats.push({
        threatType: 'Phishing Campaign',
        description: 'Large-scale credential harvesting campaign targeting enterprise users',
        indicators: ['phish-domain.xyz', '192.0.2.1', 'malicious-sender@example.com'],
        severity: 'high',
        source: feed.name,
        publishedAt: new Date(),
        relevanceScore: 85,
      });

      threats.push({
        threatType: 'Ransomware Group',
        description: 'LockBit 3.0 variant detected in the wild',
        indicators: ['lockbit.exe', 'C2: 198.51.100.1', 'ransom.note.txt'],
        severity: 'critical',
        source: feed.name,
        publishedAt: new Date(),
        relevanceScore: 95,
      });
    }

    return threats;
  }

  /**
   * Enrich threat indicator with external intelligence
   */
  async enrichThreatIndicator(indicator: string): Promise<EnrichedThreatData> {
    // Check cache first
    if (this.enrichedThreats.has(indicator)) {
      return this.enrichedThreats.get(indicator)!;
    }

    // In production: query threat intel APIs (VirusTotal, AbuseIPDB, etc.)
    // Here we simulate enrichment
    const enrichedData = await this.simulateThreatEnrichment(indicator);
    
    // Apply LRU eviction: if cache is full, remove oldest entry (first in Map)
    if (this.enrichedThreats.size >= this.MAX_ENRICHED_CACHE_SIZE) {
      const firstKey = this.enrichedThreats.keys().next().value;
      if (firstKey) {
        this.enrichedThreats.delete(firstKey);
      }
    }
    
    this.enrichedThreats.set(indicator, enrichedData);
    return enrichedData;
  }

  /**
   * Simulate threat enrichment (replace with real API calls in production)
   */
  private async simulateThreatEnrichment(indicator: string): Promise<EnrichedThreatData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Determine indicator type
    const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(indicator);
    const isDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(indicator);
    const isHash = /^[a-f0-9]{32,64}$/i.test(indicator);

    let threatType = 'Unknown';
    let tags: string[] = [];

    if (isIP) {
      threatType = 'Malicious IP';
      tags = ['botnet', 'c2-server', 'scanning'];
    } else if (isDomain) {
      threatType = 'Malicious Domain';
      tags = ['phishing', 'malware-delivery', 'c2'];
    } else if (isHash) {
      threatType = 'Malware Hash';
      tags = ['trojan', 'ransomware', 'backdoor'];
    }

    return {
      originalIndicator: indicator,
      enrichedData: {
        threatType,
        malwareFamily: isHash ? 'LockBit' : undefined,
        attackCampaign: 'Campaign-2026-Q2',
        threatActorGroup: 'APT-29',
        geolocation: isIP ? 'RU' : undefined,
        firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        lastSeen: new Date(),
        prevalence: Math.floor(Math.random() * 100),
        confidence: 85,
      },
      sources: ['VirusTotal', 'AbuseIPDB', 'ThreatConnect'],
      tags,
    };
  }

  /**
   * Get all threat feeds
   */
  getThreatFeeds(): ThreatIntelFeed[] {
    return Array.from(this.threatFeeds.values());
  }

  /**
   * Enable/disable threat feed
   */
  updateThreatFeed(feedId: string, updates: Partial<ThreatIntelFeed>): boolean {
    const feed = this.threatFeeds.get(feedId);
    if (!feed) return false;

    Object.assign(feed, updates);
    this.threatFeeds.set(feedId, feed);
    return true;
  }

  /**
   * Get enriched threat data for indicator
   */
  getEnrichedThreat(indicator: string): EnrichedThreatData | undefined {
    return this.enrichedThreats.get(indicator);
  }

  /**
   * Clear enriched threat cache (useful for long-running processes)
   */
  clearEnrichedThreatCache(): number {
    const count = this.enrichedThreats.size;
    this.enrichedThreats.clear();
    return count;
  }
}

// Export singleton instance
export const aiAssistedSOC = new AIAssistedSOC();
