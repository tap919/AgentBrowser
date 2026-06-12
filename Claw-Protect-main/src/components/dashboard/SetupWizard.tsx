/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wand2,
  Shield,
  Users,
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '@/components/brand/BrandLogo';

interface SetupWizardProps {
  onComplete: (config: any) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    profile: '',
    modules: {
      promptInjection: true,
      behavioralMonitoring: true,
      secretsScanning: true,
      dataExfiltration: true,
      identityVerification: true,
      supplyChain: true,
      uptimeMonitoring: true,
    },
    autoMode: true,
    notifications: {
      email: true,
      slack: false,
      sms: false,
    },
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const profiles = [
    {
      id: 'home',
      name: 'Home User',
      icon: Users,
      description: 'Personal AI agents and experiments',
      recommended: ['promptInjection', 'secretsScanning', 'autoMode'],
    },
    {
      id: 'developer',
      name: 'Developer',
      icon: Sparkles,
      description: 'Building with OpenClaw/Hermes',
      recommended: ['promptInjection', 'behavioralMonitoring', 'secretsScanning', 'dataExfiltration'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Building2,
      description: 'Production deployments at scale',
      recommended: ['all'],
    },
  ];

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete(config);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const selectProfile = (profileId: string) => {
    setConfig({ ...config, profile: profileId });
  };

  const toggleModule = (module: string) => {
    setConfig({
      ...config,
      modules: { ...config.modules, [module]: !config.modules[module as keyof typeof config.modules] },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl bg-card/80 backdrop-blur-lg border-border/50">
          <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <BrandLogo size="sm" subtitle="Rapid Deployment" />
              <CardTitle className="text-3xl flex items-center gap-3">
                <Wand2 className="w-8 h-8 text-primary" />
                Setup Wizard
              </CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono w-fit">
              Step {step} of {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="min-h-[500px] relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-5">
                    <BrandLogo size="md" align="center" subtitle="Cybersecurity SaaS" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to Claw Protect!</h2>
                  <p className="text-muted-foreground">
                    Launch a secure AI workspace in under two minutes. Choose the profile that matches your operating environment:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {profiles.map((profile) => (
                    <ProfileCard
                      key={profile.id}
                      profile={profile}
                      selected={config.profile === profile.id}
                      onSelect={() => selectProfile(profile.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Configure Security Modules</h2>
                  <p className="text-muted-foreground">
                    Fine-tune which protection systems to enable
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModuleToggle
                    name="Prompt Injection Detection"
                    description="Blocks malicious prompts and jailbreaks"
                    enabled={config.modules.promptInjection}
                    onToggle={() => toggleModule('promptInjection')}
                    recommended
                  />
                  <ModuleToggle
                    name="Behavioral Monitoring"
                    description="Detects agent drift and anomalies"
                    enabled={config.modules.behavioralMonitoring}
                    onToggle={() => toggleModule('behavioralMonitoring')}
                    recommended
                  />
                  <ModuleToggle
                    name="Secrets Scanning"
                    description="Finds exposed API keys and credentials"
                    enabled={config.modules.secretsScanning}
                    onToggle={() => toggleModule('secretsScanning')}
                    recommended
                  />
                  <ModuleToggle
                    name="Data Exfiltration Monitor"
                    description="Tracks suspicious data transfers"
                    enabled={config.modules.dataExfiltration}
                    onToggle={() => toggleModule('dataExfiltration')}
                  />
                  <ModuleToggle
                    name="Identity Verification"
                    description="Agent-to-agent authentication"
                    enabled={config.modules.identityVerification}
                    onToggle={() => toggleModule('identityVerification')}
                  />
                  <ModuleToggle
                    name="Supply Chain Verification"
                    description="Verifies tool sources and dependencies"
                    enabled={config.modules.supplyChain}
                    onToggle={() => toggleModule('supplyChain')}
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">Auto Mode</h2>
                  <p className="text-muted-foreground">
                    Enable set-it-and-forget-it protection with smart defaults
                  </p>
                </div>

                <Card className="bg-muted/20 border-border/30">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Enable Auto Mode</h3>
                        <p className="text-sm text-muted-foreground">
                          Automatically blocks threats and adapts to agent behavior
                        </p>
                      </div>
                      <Switch
                        checked={config.autoMode}
                        onCheckedChange={(checked) => setConfig({ ...config, autoMode: checked })}
                      />
                    </div>

                    {config.autoMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t border-border/30"
                      >
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Automatic Threat Blocking</p>
                            <p className="text-xs text-muted-foreground">
                              High-severity threats blocked instantly
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Adaptive Baselines</p>
                            <p className="text-xs text-muted-foreground">
                              Learns normal agent behavior over time
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">Daily Signature Updates</p>
                            <p className="text-xs text-muted-foreground">
                              Latest threat patterns automatically applied
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <Shield className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
                  <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
                  <p className="text-muted-foreground">
                    Claw Protect is ready to secure your AI agents
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-muted/20 border-border/30">
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Your Configuration</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Profile</span>
                          <span className="font-mono">{config.profile || 'Custom'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Active Modules</span>
                          <span className="font-mono">
                            {Object.values(config.modules).filter(Boolean).length}/7
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Auto Mode</span>
                          <Badge variant={config.autoMode ? 'default' : 'secondary'}>
                            {config.autoMode ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Next Steps</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <span>Visit Command Center for full control</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <span>Check Analytics for insights</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <span>Scan GitHub for integrations</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button onClick={nextStep}>
              {step === totalSteps ? 'Complete Setup' : 'Next'}
              {step < totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileCard({ profile, selected, onSelect }: any) {
  const Icon = profile.icon;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? 'bg-primary/10 border-primary shadow-lg scale-105'
          : 'bg-card/50 border-border/50 hover:border-primary/30 hover:scale-[1.02]'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6 text-center space-y-4">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
          selected ? 'bg-primary/20' : 'bg-muted/50'
        }`}>
          <Icon className={`w-8 h-8 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <h3 className="font-semibold mb-1">{profile.name}</h3>
          <p className="text-xs text-muted-foreground">{profile.description}</p>
        </div>
        {selected && (
          <Badge variant="default" className="animate-pulse">
            <Check className="w-3 h-3 mr-1" />
            Selected
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function ModuleToggle({ name, description, enabled, onToggle, recommended = false }: any) {
  return (
    <Card className={`cursor-pointer transition-all ${
      enabled ? 'bg-primary/5 border-primary/30' : 'bg-card/50 border-border/50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">{name}</h3>
              {recommended && (
                <Badge variant="secondary" className="text-[9px]">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardContent>
    </Card>
  );
}
