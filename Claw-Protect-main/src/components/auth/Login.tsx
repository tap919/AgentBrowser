import React from 'react';
import { Shield, Fingerprint, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { signInWithGoogle } from '@/lib/firebase';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/brand/BrandLogo';

interface LoginProps {
  onOpenSetup?: () => void;
}

export function Login({ onOpenSetup }: LoginProps) {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="technical-grid absolute inset-0 opacity-10"></div>
      <div className="scanline"></div>
      
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full relative z-10"
        >
          <Card className="bg-card/50 border-border/50 backdrop-blur-xl shadow-2xl shadow-primary/10">
            <CardContent className="p-10 text-center space-y-8">
              <div className="space-y-4">
                <div className="flex justify-center">
                  <BrandLogo
                    size="lg"
                    align="center"
                    subtitle="Research-Grade Visibility"
                  />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Mission control for AI agents, endpoints, and sensitive workflows with production-ready guardrails inspired by modern cyber operations platforms.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 py-4">
                <FeatureIcon icon={Fingerprint} label="Identity & Authentication" />
                  <FeatureIcon icon={Lock} label="Guardrails" />
                  <FeatureIcon icon={Shield} label="Telemetry" />
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-12 gap-3 text-base font-semibold group"
                onClick={handleLogin}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white p-0.5 rounded-full" alt="Google" />
                Sign in with Google
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>

              {onOpenSetup && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12"
                  onClick={onOpenSetup}
                >
                  Launch Setup Wizard
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                Community Intelligence • Enterprise Guardrails • v1.4.2
              </p>
            </CardContent>
          </Card>
        </motion.div>
    </div>
  );
}

function FeatureIcon({ icon: Icon, label }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className="text-[10px] font-mono uppercase text-muted-foreground">{label}</span>
    </div>
  );
}
