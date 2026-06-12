/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Star,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { githubScanner, type SecurityTool, type GitHubRepo } from '@/lib/githubScanner';

export function GitHubIntegration() {
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<SecurityTool[]>([]);

  useEffect(() => {
    performScan();
  }, []);

  const performScan = async () => {
    setLoading(true);
    try {
      const result = await githubScanner.performFullScan();
      setLastScan(result);
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <GitBranch className="w-10 h-10 text-primary" />
            GitHub Security Scanner
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover integrations from Awesome Cybersecurity and trending repositories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={performScan} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning...' : 'Scan Now'}
          </Button>
        </div>
      </div>

      {/* Scan Status */}
      {lastScan && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <div>
                  <p className="font-semibold">Last Scan Completed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(lastScan.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold">{lastScan.awesomeList.length}</p>
                  <p className="text-muted-foreground">Awesome Tools</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{lastScan.trending.length}</p>
                  <p className="text-muted-foreground">Trending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{lastScan.recommendations.length}</p>
                  <p className="text-muted-foreground">Recommended</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">
            <Zap className="w-4 h-4 mr-2" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="awesome">
            <Star className="w-4 h-4 mr-2" />
            Awesome List
          </TabsTrigger>
          <TabsTrigger value="trending">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendations.map((tool) => (
              <div key={tool.repo.fullName}>
                <ToolCard tool={tool} showIntegration />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="awesome" className="mt-6">
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
              {lastScan?.awesomeList.map((tool: SecurityTool) => (
                <div key={tool.repo.fullName}>
                  <ToolCard tool={tool} />
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="trending" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lastScan?.trending.map((repo: GitHubRepo) => (
              <div key={repo.fullName}>
                <RepoCard repo={repo} />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToolCard({ tool, showIntegration = false }: { tool: SecurityTool; showIntegration?: boolean }) {
  const { repo, category, integration_difficulty, recommended, reason } = tool;
  const isIntegrated = githubScanner.isToolIntegrated(repo.name);

  const difficultyColors = {
    easy: 'text-emerald-500',
    medium: 'text-yellow-500',
    hard: 'text-red-500',
  };

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {repo.name}
              {recommended && (
                <Badge variant="secondary" className="text-[10px]">
                  <Star className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              )}
              {isIntegrated && (
                <Badge variant="default" className="text-[10px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Integrated
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">{repo.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            <GitBranch className="w-3 h-3 mr-1" />
            {category}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            ⭐ {repo.stars.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {repo.language}
          </Badge>
        </div>

        {showIntegration && (
          <>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
              <p className="text-xs text-muted-foreground mb-1">Integration Reason:</p>
              <p className="text-sm">{reason}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Difficulty:</span>
                <span className={`text-xs font-semibold ${difficultyColors[integration_difficulty]}`}>
                  {integration_difficulty.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Relevance:</span>
                <Progress value={repo.relevanceScore} className="w-20 h-2" />
                <span className="text-xs font-mono">{repo.relevanceScore}%</span>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href={repo.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-2" />
              View on GitHub
            </a>
          </Button>
          {!isIntegrated && showIntegration && (
            <Button size="sm" className="flex-1">
              <Download className="w-3 h-3 mr-2" />
              Integrate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {repo.name}
              <Badge variant="secondary" className="text-[10px]">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">{repo.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {repo.topics.slice(0, 3).map((topic) => (
            <span key={topic}>
              <Badge variant="outline" className="text-[10px]">
                {topic}
              </Badge>
            </span>
          ))}
          {repo.topics.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{repo.topics.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {repo.stars.toLocaleString()}
            </span>
            <span className="text-muted-foreground">{repo.language}</span>
          </div>
          <span className="text-xs text-muted-foreground">Updated {repo.lastUpdated}</span>
        </div>

        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href={repo.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-2" />
            View Repository
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
