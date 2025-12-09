import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface LegalConsentContextType {
  hasAcceptedLegal: boolean;
  isLoading: boolean;
  checkConsent: () => Promise<boolean>;
  recordConsent: () => Promise<void>;
}

const LegalConsentContext = createContext<LegalConsentContextType | undefined>(undefined);

interface LegalConsentProviderProps {
  children: ReactNode;
}

export function LegalConsentProvider({ children }: LegalConsentProviderProps) {
  const { user, isGuest } = useAuth();
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !isGuest) {
      checkConsent();
    } else {
      setIsLoading(false);
      setHasAcceptedLegal(false);
    }
  }, [user, isGuest]);

  const checkConsent = async (): Promise<boolean> => {
    if (!user) {
      setHasAcceptedLegal(false);
      setIsLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('legal_consents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking consent:', error);
        setHasAcceptedLegal(false);
        setIsLoading(false);
        return false;
      }

      const hasConsent = !!data;
      setHasAcceptedLegal(hasConsent);
      setIsLoading(false);
      return hasConsent;
    } catch (error) {
      console.error('Error checking consent:', error);
      setHasAcceptedLegal(false);
      setIsLoading(false);
      return false;
    }
  };

  const recordConsent = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('legal_consents').insert({
        user_id: user.id,
        terms_version: '1.0',
        privacy_version: '1.0',
        medical_disclaimer_accepted: true,
        consent_type: 'initial',
      });

      if (error) {
        console.error('Error recording consent:', error);
        throw error;
      }

      setHasAcceptedLegal(true);
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  };

  return (
    <LegalConsentContext.Provider
      value={{
        hasAcceptedLegal,
        isLoading,
        checkConsent,
        recordConsent,
      }}
    >
      {children}
    </LegalConsentContext.Provider>
  );
}

export function useLegalConsent() {
  const context = useContext(LegalConsentContext);
  if (context === undefined) {
    throw new Error('useLegalConsent must be used within a LegalConsentProvider');
  }
  return context;
}
