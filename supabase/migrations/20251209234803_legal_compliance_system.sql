/*
  # Legal Compliance and Consent Tracking System

  1. New Tables
    - `legal_consents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `terms_version` (text) - version of terms accepted
      - `privacy_version` (text) - version of privacy policy accepted
      - `medical_disclaimer_accepted` (boolean)
      - `accepted_at` (timestamptz)
      - `ip_address` (text) - for legal record keeping
      - `user_agent` (text) - device/browser info
      - `consent_type` (text) - 'initial', 'updated', 'reaccepted'
    
    - `disclaimer_acknowledgments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `screen_name` (text) - which screen disclaimer was shown
      - `acknowledged_at` (timestamptz)
      - `session_id` (text) - to track within app session
    
    - `legal_documents`
      - `id` (uuid, primary key)
      - `document_type` (text) - 'terms', 'privacy', 'disclaimer'
      - `version` (text)
      - `content` (text)
      - `effective_date` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only read their own consent records
    - Only authenticated users can create consent records
*/

-- Create legal_consents table
CREATE TABLE IF NOT EXISTS legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_version text NOT NULL DEFAULT '1.0',
  privacy_version text NOT NULL DEFAULT '1.0',
  medical_disclaimer_accepted boolean DEFAULT false,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  consent_type text DEFAULT 'initial' CHECK (consent_type IN ('initial', 'updated', 'reaccepted')),
  created_at timestamptz DEFAULT now()
);

-- Create disclaimer_acknowledgments table
CREATE TABLE IF NOT EXISTS disclaimer_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  screen_name text NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Create legal_documents table
CREATE TABLE IF NOT EXISTS legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy', 'disclaimer', 'waiver')),
  version text NOT NULL,
  content text NOT NULL,
  effective_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_type, version)
);

-- Enable Row Level Security
ALTER TABLE legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disclaimer_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- Policies for legal_consents
CREATE POLICY "Users can view own consent records"
  ON legal_consents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own consent records"
  ON legal_consents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot update consent records"
  ON legal_consents FOR UPDATE
  TO authenticated
  USING (false);

-- Policies for disclaimer_acknowledgments
CREATE POLICY "Users can view own acknowledgments"
  ON disclaimer_acknowledgments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create acknowledgments"
  ON disclaimer_acknowledgments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for legal_documents
CREATE POLICY "Anyone can view legal documents"
  ON legal_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only service role can manage legal documents"
  ON legal_documents FOR ALL
  USING (false);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_consents_user_id ON legal_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_consents_accepted_at ON legal_consents(accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_disclaimer_acks_user_id ON disclaimer_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_disclaimer_acks_screen ON disclaimer_acknowledgments(screen_name);
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_documents(document_type, version);

-- Insert initial legal document versions
INSERT INTO legal_documents (document_type, version, content, effective_date) VALUES
('terms', '1.0', 'Terms of Service - Version 1.0 - See app for full text', now()),
('privacy', '1.0', 'Privacy Policy - Version 1.0 - See app for full text', now()),
('disclaimer', '1.0', 'Medical Disclaimer - This app is for educational purposes only. Always consult your healthcare provider.', now())
ON CONFLICT (document_type, version) DO NOTHING;
