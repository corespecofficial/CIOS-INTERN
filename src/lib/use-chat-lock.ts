"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "cios-chat-lock-v1";
const UNLOCK_SESSION_KEY = "cios-chat-lock-session";

export interface ChatLockConfig {
  enabled: boolean;
  pinHash: string | null;      // sha-256 hex
  pinSalt: string | null;
  useBiometric: boolean;
  webauthnCredentialId: string | null;
  autoLockMinutes: number;      // 0 = never auto-lock, else minutes
}

const DEFAULT_CONFIG: ChatLockConfig = {
  enabled: false,
  pinHash: null,
  pinSalt: null,
  useBiometric: false,
  webauthnCredentialId: null,
  autoLockMinutes: 5,
};

function loadConfig(): ChatLockConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<ChatLockConfig>) };
  } catch { return DEFAULT_CONFIG; }
}

function saveConfig(cfg: ChatLockConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
}

function saveSessionUnlock() {
  try { sessionStorage.setItem(UNLOCK_SESSION_KEY, Date.now().toString()); } catch {}
}

function getSessionUnlockAt(): number | null {
  try {
    const s = sessionStorage.getItem(UNLOCK_SESSION_KEY);
    return s ? parseInt(s, 10) : null;
  } catch { return null; }
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isWebAuthnAvailable(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

export function useChatLock() {
  const [config, setConfig] = useState<ChatLockConfig>(DEFAULT_CONFIG);
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load config on mount, determine initial lock state
  useEffect(() => {
    const cfg = loadConfig();
    setConfig(cfg);
    if (cfg.enabled) {
      const unlockedAt = getSessionUnlockAt();
      if (unlockedAt === null) {
        setLocked(true);
      } else if (cfg.autoLockMinutes > 0 && Date.now() - unlockedAt > cfg.autoLockMinutes * 60000) {
        setLocked(true);
      } else {
        setLocked(false);
      }
    }
    setHydrated(true);
  }, []);

  // Auto-lock after inactivity
  useEffect(() => {
    if (!config.enabled || config.autoLockMinutes === 0 || locked) return;
    let lastActivity = Date.now();
    const onActivity = () => { lastActivity = Date.now(); saveSessionUnlock(); };
    const check = setInterval(() => {
      if (Date.now() - lastActivity > config.autoLockMinutes * 60000) {
        setLocked(true);
      }
    }, 30000);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      clearInterval(check);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [config.enabled, config.autoLockMinutes, locked]);

  const updateConfig = useCallback((patch: Partial<ChatLockConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  const setPin = useCallback(async (pin: string) => {
    if (!pin || pin.length < 4) throw new Error("PIN must be at least 4 digits");
    const salt = randomSalt();
    const hash = await sha256Hex(salt + pin);
    updateConfig({ pinHash: hash, pinSalt: salt, enabled: true });
    saveSessionUnlock();
    setLocked(false);
  }, [updateConfig]);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const cfg = loadConfig();
    if (!cfg.pinHash || !cfg.pinSalt) return false;
    const hash = await sha256Hex(cfg.pinSalt + pin);
    const ok = hash === cfg.pinHash;
    if (ok) { saveSessionUnlock(); setLocked(false); }
    return ok;
  }, []);

  const removePin = useCallback(() => {
    updateConfig({ enabled: false, pinHash: null, pinSalt: null, useBiometric: false, webauthnCredentialId: null });
    saveSessionUnlock();
    setLocked(false);
  }, [updateConfig]);

  const registerBiometric = useCallback(async (userId: string, displayName: string): Promise<boolean> => {
    if (!isWebAuthnAvailable()) throw new Error("Biometric auth not supported on this device");
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userIdBytes = new TextEncoder().encode(userId);
    try {
      const cred = (await navigator.credentials.create({
        publicKey: {
          rp: { name: "CIOS Platform" },
          user: { id: userIdBytes, name: displayName, displayName },
          challenge,
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },  // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return false;
      const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      updateConfig({ useBiometric: true, webauthnCredentialId: credIdBase64, enabled: true });
      saveSessionUnlock();
      setLocked(false);
      return true;
    } catch (e) {
      console.error("[webauthn] register failed:", e);
      return false;
    }
  }, [updateConfig]);

  const authenticateBiometric = useCallback(async (): Promise<boolean> => {
    const cfg = loadConfig();
    if (!cfg.webauthnCredentialId) return false;
    if (!isWebAuthnAvailable()) return false;
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const credIdBytes = Uint8Array.from(atob(cfg.webauthnCredentialId), (c) => c.charCodeAt(0));
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: credIdBytes, type: "public-key", transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      if (assertion) { saveSessionUnlock(); setLocked(false); return true; }
      return false;
    } catch (e) {
      console.error("[webauthn] auth failed:", e);
      return false;
    }
  }, []);

  const lock = useCallback(() => {
    try { sessionStorage.removeItem(UNLOCK_SESSION_KEY); } catch {}
    setLocked(true);
  }, []);

  return {
    config, locked, hydrated,
    updateConfig, setPin, verifyPin, removePin,
    registerBiometric, authenticateBiometric,
    lock,
  };
}
