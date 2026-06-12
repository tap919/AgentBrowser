import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Seed default autonomous settings
  await db.autonomousSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      enabled: false,
      policyLevel: 'conservative',
      autoConfigure: true,
      autoUpgradeSafe: true,
      resumeOnRestart: true,
    },
  });

  console.log('Seeded default autonomous settings');

  // Seed preset autonomous agents
  const presets = [
    {
      id: 'target-tracker',
      name: 'Target Tracker',
      description: 'Monitors competitor websites and tracks changes',
      cronExpression: '0 6 * * 1',
      skills: ['web-scraping', 'diff-analysis', 'reporting'],
      config: { maxTargets: 10, interval: 'weekly' },
    },
    {
      id: 'content-machine',
      name: 'Content Machine',
      description: 'Generates and publishes content automatically',
      cronExpression: '0 8 * * 3',
      skills: ['llm-generation', 'content-publishing', 'seo-analysis'],
      config: { maxPosts: 5, tone: 'professional' },
    },
    {
      id: 'market-intel',
      name: 'Market Intelligence',
      description: 'Researches market trends and produces reports',
      cronExpression: '0 7 1 * *',
      skills: ['web-research', 'data-analysis', 'report-generation'],
      config: { sources: ['news', 'social', 'analyst-reports'] },
    },
  ];

  for (const preset of presets) {
    await db.autonomousAgent.upsert({
      where: { id: preset.id },
      update: { name: preset.name, description: preset.description },
      create: {
        ...preset,
        status: 'idle',
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        enabled: false,
      },
    });
  }

  console.log(`Seeded ${presets.length} autonomous agents`);

  // Seed example DAG pipelines demonstrating agent chaining
  const examplePipelines = [
    {
      name: 'Market Intelligence → Business Routine',
      schedule: '0 8 * * 1',
      definition: JSON.stringify({
        nodes: [
          {
            id: 'market-scan',
            type: 'business-skill',
            dependsOn: [],
            config: {
              skill: 'market-research',
              action: 'scan-trends',
              params: { industry: 'music-tech' },
            },
            inputMap: {},
          },
          {
            id: 'store-insight',
            type: 'memory-write',
            dependsOn: ['market-scan'],
            config: {
              namespace: 'pipeline',
              key: 'latest-market-insight',
              agentId: 'orchestrator',
            },
            inputMap: {
              value: 'nodes[market-scan].output.output',
            },
          },
          {
            id: 'daily-routine',
            type: 'business-skill',
            dependsOn: ['store-insight'],
            config: {},
            inputMap: {
              skill: 'nodes[store-insight].output.skill',
              action: 'nodes[store-insight].output.action',
              params: 'nodes[store-insight].output.params',
            },
          },
        ],
      }),
    },
    {
      name: 'Content Discovery → Save',
      schedule: null,
      definition: JSON.stringify({
        nodes: [
          {
            id: 'research',
            type: 'agent',
            dependsOn: [],
            config: { agentId: 'market-intel' },
            inputMap: {},
          },
          {
            id: 'save-findings',
            type: 'memory-write',
            dependsOn: ['research'],
            config: {
              namespace: 'research',
              key: 'latest-findings',
              agentId: 'orchestrator',
              ttl: 86400,
            },
            inputMap: {
              value: 'nodes[research].output.output',
            },
          },
        ],
      }),
    },
  ];

  for (const pipeline of examplePipelines) {
    const existing = await db.agentPipeline.findFirst({
      where: { name: pipeline.name },
    });
    if (!existing) {
      await db.agentPipeline.create({
        data: {
          name: pipeline.name,
          definition: pipeline.definition,
          schedule: pipeline.schedule,
          enabled: false,
        },
      });
      console.log(`Seeded pipeline: ${pipeline.name}`);
    }
  }

  console.log(`Seeded ${examplePipelines.length} example pipelines`);
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
