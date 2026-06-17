import { supabase } from '../utils/supabase';

const throwIfError = (error) => {
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  throwIfError(error);
  return data.session;
};

export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
};

export const getUserProfile = async ({ userId, email } = {}) => {
  let query = supabase.from('users').select('*').maybeSingle();
  if (userId) {
    query = query.eq('id', userId);
  }
  if (email) {
    query = query.eq('email', email);
  }

  const { data, error } = await query;
  throwIfError(error);
  return data;
};

export const updateUserProfile = async (userId, payload) => {
  const { data, error } = await supabase.from('users').update(payload).eq('id', userId).select().maybeSingle();
  throwIfError(error);
  return data;
};

export const getCompany = async (companyId = 1) => {
  const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
  throwIfError(error);
  return data;
};

export const getPolicies = async () => {
  const { data, error } = await supabase.from('policies').select('*');
  throwIfError(error);
  return data ?? [];
};

export const createPolicy = async (policy) => {
  const { data, error } = await supabase.from('policies').insert(policy).select().single();
  throwIfError(error);
  return data;
};

export const getHolidays = async () => {
  const { data, error } = await supabase.from('holidays').select('*');
  throwIfError(error);
  return data ?? [];
};

export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  throwIfError(error);
  return data ?? [];
};

export const getUserDocuments = async (userId) => {
  const { data, error } = await supabase.from('user_documents').select('*').eq('userId', userId);
  throwIfError(error);
  return data ?? [];
};

export const createDocument = async (document) => {
  const { data, error } = await supabase.from('user_documents').insert(document).select().single();
  throwIfError(error);
  return data;
};

export const updateDocument = async (documentId, payload) => {
  const { data, error } = await supabase.from('user_documents').update(payload).eq('id', documentId).select().single();
  throwIfError(error);
  return data;
};

export const deleteDocument = async (documentId) => {
  const { error } = await supabase.from('user_documents').delete().eq('id', documentId);
  throwIfError(error);
};
