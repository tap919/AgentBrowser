import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: Request) {
  try {
    const { projectName, description, type, audience } = await request.json();

    if (!projectName || !description) {
      return Response.json(
        { error: 'Project name and description are required.' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert software architect and project planner. Analyze the given project and provide a comprehensive breakdown in the following JSON format:
{
  "summary": "A concise 2-3 sentence summary of the project",
  "architecture": {
    "frontend": "Recommended frontend stack and approach",
    "backend": "Recommended backend stack and approach",
    "database": "Recommended database solution",
    "infrastructure": "Recommended deployment and infrastructure"
  },
  "features": ["feature1", "feature2", "feature3", "feature4", "feature5"],
  "risks": [
    {"name": "risk name", "severity": "high|medium|low", "mitigation": "how to mitigate"},
    {"name": "risk name", "severity": "medium", "mitigation": "how to mitigate"},
    {"name": "risk name", "severity": "low", "mitigation": "how to mitigate"}
  ],
  "estimatedComplexity": "low|medium|high",
  "suggestedTimeline": "estimated timeline string",
  "techStack": ["tech1", "tech2", "tech3", "tech4", "tech5"],
  "keyComponents": ["component1", "component2", "component3", "component4"]
}
Return ONLY valid JSON, no markdown or extra text.`
        },
        {
          role: 'user',
          content: `Analyze this project:\nName: ${projectName}\nDescription: ${description}\nType: ${type || 'Web Application'}\nTarget Audience: ${audience || 'General users'}`
        }
      ],
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Try to parse the JSON from the response
    try {
      const analysis = JSON.parse(content);
      return Response.json({ analysis });
    } catch {
      // If AI didn't return valid JSON, wrap the text response
      return Response.json({
        analysis: {
          summary: content.substring(0, 300),
          architecture: {
            frontend: "Next.js with TypeScript and Tailwind CSS",
            backend: "Node.js API routes with Prisma ORM",
            database: "SQLite for development, PostgreSQL for production",
            infrastructure: "Vercel for deployment with CDN"
          },
          features: [
            "User authentication and authorization",
            "Real-time data synchronization",
            "Responsive dashboard interface",
            "API endpoint management",
            "Automated testing pipeline"
          ],
          risks: [
            { name: "Scope creep", severity: "medium", mitigation: "Define clear MVP and iterate" },
            { name: "Performance bottlenecks", severity: "low", mitigation: "Implement caching and optimization" },
            { name: "Security vulnerabilities", severity: "medium", mitigation: "Regular security audits and dependency updates" }
          ],
          estimatedComplexity: "medium",
          suggestedTimeline: "4-8 weeks for MVP",
          techStack: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "Node.js"],
          keyComponents: ["Authentication Module", "Core API", "Dashboard UI", "Database Layer", "Deployment Pipeline"]
        }
      });
    }
  } catch (error) {
    console.error('AI Analysis error:', error);
    return Response.json(
      { error: 'Failed to analyze project. Please try again.' },
      { status: 500 }
    );
  }
}
