'use client';

import { useState, useCallback } from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, RefreshCw, Lock, Unlock, X } from 'lucide-react';

interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = 'ab_passwords';

export default function PasswordManager() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [showPassword, setShowPassword] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ site: '', username: '', password: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generatePassword = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
      password += chars[array[i] % chars.length];
    }
    setNewEntry(prev => ({ ...prev, password }));
  }, []);

  const encryptAndSave = useCallback(async (entries: PasswordEntry[], password: string) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(entries));
      const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode('ab_salt'), iterations: 100000, hash: 'SHA-256' }, key, 256);
      const cryptoKey = await crypto.subtle.importKey('raw', derivedBits, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      localStorage.setItem(STORAGE_KEY, btoa(String.fromCharCode(...combined)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const decryptAndLoad = useCallback(async (password: string): Promise<PasswordEntry[]> => {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEY);
      if (!encrypted) return [];
      const combined = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
      const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode('ab_salt'), iterations: 100000, hash: 'SHA-256' }, key, 256);
      const cryptoKey = await crypto.subtle.importKey('raw', derivedBits, 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      throw new Error('Invalid master password');
    }
  }, []);

  const handleUnlock = async () => {
    setError(null);
    try {
      const decrypted = await decryptAndLoad(masterPassword);
      setEntries(decrypted);
      setIsUnlocked(true);
    } catch {
      setError('Invalid master password');
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setMasterPassword('');
    setEntries([]);
  };

  const handleAddEntry = async () => {
    if (!newEntry.site || !newEntry.username || !newEntry.password) return;
    const entry: PasswordEntry = { id: crypto.randomUUID(), ...newEntry, createdAt: new Date().toISOString() };
    const updated = [...entries, entry];
    setEntries(updated);
    await encryptAndSave(updated, masterPassword);
    setShowModal(false);
    setNewEntry({ site: '', username: '', password: '', notes: '' });
  };

  const handleDelete = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    if (masterPassword) await encryptAndSave(updated, masterPassword);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasStoredPasswords = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY);

  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Password Manager</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full p-4 rounded-lg border border-border/30 bg-background/20 space-y-3">
            <div className="text-center">
              <Key className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {hasStoredPasswords ? 'Enter master password' : 'Create a master password'}
              </p>
            </div>
            <input
              type="password"
              value={masterPassword}
              onChange={e => setMasterPassword(e.target.value)}
              placeholder="Master password"
              className="w-full px-3 py-2 rounded-lg border border-border/30 bg-background/40 text-xs focus:outline-none focus:border-primary/40"
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            />
            {error && <p className="text-[10px] text-red-400">{error}</p>}
            <button onClick={handleUnlock} disabled={!masterPassword} className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
              {hasStoredPasswords ? 'Unlock' : 'Create Vault'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Unlock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">Password Vault</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowModal(true)} className="p-1.5 rounded hover:bg-muted/30 text-[10px] text-primary flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
          <button onClick={handleLock} className="p-1.5 rounded hover:bg-muted/30">
            <Lock className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-4">
            <Key className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">No passwords saved</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="p-2 rounded-lg border border-border/20 bg-background/10">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-foreground truncate">{entry.site}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{entry.username}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => togglePasswordVisibility(entry.id)} className="p-1 rounded hover:bg-muted/30">
                    {showPassword.has(entry.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button onClick={() => copyToClipboard(entry.password, entry.id)} className="p-1 rounded hover:bg-muted/30">
                    {copiedId === entry.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button onClick={() => handleDelete(entry.id)} className="p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {showPassword.has(entry.id) && (
                <div className="mt-1 px-2 py-1 rounded bg-muted/20">
                  <code className="text-[9px] font-mono text-foreground truncate">{entry.password}</code>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-xs p-3 rounded-xl border border-border/30 bg-background shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground">Add Password</span>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-muted/30"><X className="w-3 h-3" /></button>
            </div>
            <div className="space-y-2">
              <input type="text" value={newEntry.site} onChange={e => setNewEntry(prev => ({ ...prev, site: e.target.value }))} placeholder="Website" className="w-full px-2 py-1.5 text-xs rounded border border-border/30 bg-background/40 focus:outline-none" />
              <input type="text" value={newEntry.username} onChange={e => setNewEntry(prev => ({ ...prev, username: e.target.value }))} placeholder="Username" className="w-full px-2 py-1.5 text-xs rounded border border-border/30 bg-background/40 focus:outline-none" />
              <div className="flex gap-1">
                <input type="password" value={newEntry.password} onChange={e => setNewEntry(prev => ({ ...prev, password: e.target.value }))} placeholder="Password" className="flex-1 px-2 py-1.5 text-xs rounded border border-border/30 bg-background/40 focus:outline-none" />
                <button onClick={generatePassword} className="p-1.5 rounded border border-border/30 hover:bg-muted/30"><RefreshCw className="w-3 h-3" /></button>
              </div>
            </div>
            <button onClick={handleAddEntry} disabled={!newEntry.site || !newEntry.username || !newEntry.password} className="w-full mt-3 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
