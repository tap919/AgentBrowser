import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: any | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAuthReady: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeData = onSnapshot(userRef, (doc) => {
        setUserData(doc.data() || null);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      });

      return () => unsubscribeData();
    }
    return undefined;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

// Simple Error Display Component
export function FirebaseErrorDisplay({ errorInfo }: { errorInfo: any }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-destructive/50 p-8 rounded-2xl space-y-6 text-center shadow-2xl shadow-destructive/10">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Security System Error</h2>
          <p className="text-sm text-muted-foreground">
            {errorInfo?.error || "An unexpected security exception occurred."}
          </p>
        </div>
        {errorInfo?.operationType && (
          <div className="bg-muted/50 p-3 rounded-lg font-mono text-[10px] text-left space-y-1">
            <p><span className="text-primary font-bold">OP:</span> {errorInfo.operationType}</p>
            <p><span className="text-primary font-bold">PATH:</span> {errorInfo.path}</p>
          </div>
        )}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Restart System
        </Button>
      </div>
    </div>
  );
}


