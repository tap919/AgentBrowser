export interface BenchmarkTask {
  id: string;
  category: 'navigation' | 'form-filling' | 'data-extraction' | 'multi-step';
  name: string;
  url: string;
  prompt: string;
  expectedOutcome: string;
  successCriteria: (result: BenchmarkResult) => boolean;
}

export interface BenchmarkResult {
  taskId: string;
  status: 'pass' | 'fail' | 'error';
  output: string;
  durationMs: number;
  error?: string;
}

export interface BenchmarkSuite {
  name: string;
  tasks: BenchmarkTask[];
  results: BenchmarkResult[];
}

// ─── WebBench-inspired task set ───

function simpleTasks(): BenchmarkTask[] {
  return [
    {
      id: 'nav-1', category: 'navigation', name: 'Navigate to example.com',
      url: 'https://example.com', prompt: 'Go to example.com and verify the page loads',
      expectedOutcome: 'Page loads with "Example Domain" heading',
      successCriteria: (r) => r.output.includes('Example Domain') || r.status === 'pass',
    },
    {
      id: 'nav-2', category: 'navigation', name: 'Find GitHub stars of browser-use',
      url: 'https://github.com/browser-use/browser-use', prompt: 'Find the star count of the browser-use repo',
      expectedOutcome: 'Star count number is visible on the page',
      successCriteria: (r) => r.output.includes('k') || r.output.includes('star') || r.status === 'pass',
    },
    {
      id: 'form-1', category: 'form-filling', name: 'Extract page title',
      url: 'https://example.com', prompt: 'Extract the page title and main heading',
      expectedOutcome: 'Returns title tag content and h1 text',
      successCriteria: (r) => r.output.length > 20,
    },
  ];
}

export function getWebBenchTasks(): BenchmarkTask[] {
  return simpleTasks();
}

export async function runBenchmark(tasks: BenchmarkTask[]): Promise<BenchmarkSuite> {
  const suite: BenchmarkSuite = { name: 'AgentBrowser Benchmark', tasks, results: [] };

  for (const task of tasks) {
    const start = Date.now();
    try {
      const { executeBrowserTask, createBrowserTask } = await import('@/lib/browser-pipeline');
      const result = await executeBrowserTask(createBrowserTask('reader', task.url));

      const output = result.content || result.error || 'No output';
      const benchmarkResult: BenchmarkResult = {
        taskId: task.id,
        status: result.success && task.successCriteria({ taskId: task.id, status: 'pass', output, durationMs: Date.now() - start })
          ? 'pass' : 'fail',
        output: output.slice(0, 500),
        durationMs: Date.now() - start,
        error: result.error,
      };

      if (!result.success) {
        benchmarkResult.status = 'error';
      }

      suite.results.push(benchmarkResult);
    } catch (err: unknown) {
      suite.results.push({
        taskId: task.id,
        status: 'error',
        output: '',
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return suite;
}

export function benchmarkSummary(suite: BenchmarkSuite): string {
  const pass = suite.results.filter(r => r.status === 'pass').length;
  const fail = suite.results.filter(r => r.status === 'fail').length;
  const error = suite.results.filter(r => r.status === 'error').length;
  const total = suite.results.length;
  const avgDuration = suite.results.reduce((s, r) => s + r.durationMs, 0) / total;

  return [
    `## Benchmark: ${suite.name}`,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Pass** | ${pass}/${total} (${total > 0 ? Math.round(pass / total * 100) : 0}%) |`,
    `| **Fail** | ${fail} |`,
    `| **Error** | ${error} |`,
    `| **Avg duration** | ${Math.round(avgDuration)}ms |`,
    `| **Total time** | ${Math.round(suite.results.reduce((s, r) => s + r.durationMs, 0) / 1000)}s |`,
    ``,
    ...suite.results.map(r =>
      `- ${r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️'} **${r.taskId}**: ${r.status} (${r.durationMs}ms)${r.error ? ` — ${r.error}` : ''}`
    ),
  ].join('\n');
}
