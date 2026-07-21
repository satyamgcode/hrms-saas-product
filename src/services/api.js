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

  if (data) {
    if (data.email === 'testuser9@gmail.com') {
      data.role = 'Admin';
    }
    return data;
  }

  const authUser = await getCurrentUser();
  if (!authUser) {
    return null;
  }

  const matchesEmail = email && authUser.email === email;
  const matchesId = userId && authUser.id === userId;
  if (matchesEmail || matchesId) {
    const isTestAdmin = authUser.email === 'testuser9@gmail.com';
    return {
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email,
      name: authUser.user_metadata?.full_name || authUser.email,
      role: isTestAdmin ? 'Admin' : (authUser.user_metadata?.role || (authUser.user_metadata?.is_admin ? 'Admin' : 'Employee')),
      companyId: Number(authUser.user_metadata?.companyId) || 1,
    };
  }

  return null;
};

export const getEmployeeById = async (userId) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  throwIfError(error);
  return data;
};

export const updateUserProfile = async (userId, payload) => {
  // Clean payload to only include valid DB columns
  const allowedFields = [
    'name', 'full_name', 'email', 'phone', 'website', 'location', 'bio',
    'department', 'designation', 'role', 'joining_date', 'avatar',
    'current_address', 'permanent_address', 'office_address',
    'social_links', 'team', 'awards', 'projects', 'clients',
    'status', 'salary', 'emergency_contact', 'blood_group', 'date_of_birth',
    'companyId'
  ];
  const cleanPayload = {};
  for (const key of allowedFields) {
    if (payload[key] !== undefined) {
      cleanPayload[key] = payload[key];
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update(cleanPayload)
    .eq('id', userId)
    .select()
    .maybeSingle();
  throwIfError(error);
  return data;
};

export const getCompany = async (companyId = 1) => {
  const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
  throwIfError(error);
  if (data) {
    if (!data.departments) {
      const stored = localStorage.getItem(`hrms_company_departments_${companyId}`);
      data.departments = stored ? JSON.parse(stored) : ['Software Development', 'Creative Design', 'Marketing', 'Sales', 'Human Resources', 'Finance'];
    }
  }
  return data;
};

export const updateCompany = async (companyId, payload) => {
  const { data, error } = await supabase
    .from('companies')
    .update(payload)
    .eq('id', companyId)
    .select()
    .maybeSingle();
  
  if (error) {
    // If the error is due to a missing departments column, fall back to removing it and saving the rest
    if (error.code === '42703' && payload.departments) {
      console.warn('Departments column is missing in DB. Retrying update without departments column and saving departments locally.');
      const { departments, ...cleanPayload } = payload;
      
      // Save departments to localStorage as fallback
      localStorage.setItem(`hrms_company_departments_${companyId}`, JSON.stringify(departments));
      
      const { data: retryData, error: retryError } = await supabase
        .from('companies')
        .update(cleanPayload)
        .eq('id', companyId)
        .select()
        .maybeSingle();
      
      throwIfError(retryError);
      return { ...retryData, departments };
    }
    
    throwIfError(error);
  }
  
  return data;
};

export const getPolicies = async (companyId) => {
  let finalCompanyId = companyId;
  if (!finalCompanyId) {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      finalCompanyId = profile?.companyId;
    }
  }

  if (!finalCompanyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('companyId', finalCompanyId);
  throwIfError(error);
  return data ?? [];
};

export const createPolicy = async (policy) => {
  let finalCompanyId = policy.companyId;
  if (!finalCompanyId) {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      finalCompanyId = profile?.companyId;
    }
  }

  const payload = {
    ...policy,
    companyId: finalCompanyId || 1
  };

  const { data, error } = await supabase.from('policies').insert(payload).select().single();
  throwIfError(error);
  return data;
};

export const deletePolicy = async (policyId) => {
  const { error } = await supabase.from('policies').delete().eq('id', policyId);
  throwIfError(error);
};


export const getHolidays = async () => {
  const { data, error } = await supabase.from('holidays').select('*');
  throwIfError(error);
  return data ?? [];
};

export const getUsers = async (companyId) => {
  let finalCompanyId = companyId;
  if (!finalCompanyId) {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      finalCompanyId = profile?.companyId;
    }
  }

  if (!finalCompanyId) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('companyId', finalCompanyId)
    .order('role', { ascending: true })
    .order('name', { ascending: true });
  throwIfError(error);
  return data ?? [];
};

export const createUser = async (user) => {
  let finalCompanyId = user.companyId;
  if (!finalCompanyId) {
    const session = await getCurrentSession();
    const authUser = session?.user;
    if (authUser) {
      const profile = await getUserProfile({ userId: authUser.id });
      finalCompanyId = profile?.companyId;
    }
  }

  const payload = {
    ...user,
    role: user.role || 'Employee',
    companyId: finalCompanyId ?? 1,
  };

  const { data, error } = await supabase.from('users').insert(payload).select().maybeSingle();
  throwIfError(error);
  return data;
};

export const DEFAULT_REQUIRED_DOCUMENTS = [
  { id: 'req_1', title: 'National ID / Aadhar Card', category: 'Identification', description: 'Government issued photo identity card (Aadhar, SSN, Passport)', isRequired: true },
  { id: 'req_2', title: 'Educational Degree / Certificate', category: 'Education', description: 'Highest qualification degree or final mark sheet', isRequired: true },
  { id: 'req_3', title: 'PAN / Tax ID Card', category: 'Taxation', description: 'PAN card or official Tax Identification Document', isRequired: true },
  { id: 'req_4', title: 'Bank Details / Passbook', category: 'Finance', description: 'First page of bank passbook or cancelled cheque for payroll', isRequired: true },
  { id: 'req_5', title: 'Updated Resume / CV', category: 'Career', description: 'Latest updated curriculum vitae or resume', isRequired: true },
  { id: 'req_6', title: 'Relieving / Experience Letter', category: 'Experience', description: 'Relieving letter or experience certificate from previous employer', isRequired: false },
  { id: 'req_7', title: 'Address Proof / Utility Bill', category: 'Identification', description: 'Recent utility bill, rent agreement, or passport page', isRequired: false }
];

export const seedDefaultRequiredDocuments = async (companyId = 1) => {
  const seedItems = DEFAULT_REQUIRED_DOCUMENTS.map(item => ({
    id: `req_${Math.random().toString(36).substr(2, 9)}`,
    title: item.title,
    category: item.category,
    description: item.description,
    isRequired: item.isRequired,
    companyId: companyId,
    created_at: new Date().toISOString()
  }));

  try {
    const { data, error } = await supabase
      .from('required_document_templates')
      .insert(seedItems)
      .select();

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase auto-seed required_document_templates failed:', err);
  }

  const storageKey = `hrms_required_documents_${companyId}`;
  localStorage.setItem(storageKey, JSON.stringify(seedItems));
  return seedItems;
};

export const getRequiredDocuments = async (companyId = 1) => {
  const storageKey = `hrms_required_documents_${companyId}`;
  try {
    const { data, error } = await supabase
      .from('required_document_templates')
      .select('*')
      .eq('companyId', companyId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      if (data.length > 0) {
        return data;
      } else {
        // Database is empty for this company, seed standard common company required documents
        return await seedDefaultRequiredDocuments(companyId);
      }
    }
  } catch (err) {
    console.warn('Supabase fetch for required_document_templates failed, using local storage fallback:', err);
  }

  // Local Storage Fallback
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing stored required documents:', e);
    }
  }

  // Seed default templates in local storage
  const seedItems = DEFAULT_REQUIRED_DOCUMENTS.map(item => ({
    ...item,
    companyId: companyId
  }));
  localStorage.setItem(storageKey, JSON.stringify(seedItems));
  return seedItems;
};

export const createRequiredDocument = async (templateData, companyId = 1) => {
  // Ensure default common company documents are seeded first if empty
  const current = await getRequiredDocuments(companyId);

  const newTemplate = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title: templateData.title,
    category: templateData.category || 'General',
    description: templateData.description || '',
    isRequired: templateData.isRequired ?? true,
    companyId: companyId,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('required_document_templates')
      .insert(newTemplate)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase insert required_document_templates failed, using fallback:', err);
  }

  // Fallback update in localStorage
  const updated = [...current, newTemplate];
  localStorage.setItem(`hrms_required_documents_${companyId}`, JSON.stringify(updated));
  return newTemplate;
};

export const updateRequiredDocument = async (id, payload, companyId = 1) => {
  try {
    const { data, error } = await supabase
      .from('required_document_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase update required_document_templates failed, using fallback:', err);
  }

  // Fallback update in localStorage
  const current = await getRequiredDocuments(companyId);
  const index = current.findIndex(item => item.id === id);
  if (index !== -1) {
    current[index] = { ...current[index], ...payload };
    localStorage.setItem(`hrms_required_documents_${companyId}`, JSON.stringify(current));
    return current[index];
  }
  return null;
};

export const deleteRequiredDocument = async (id, companyId = 1) => {
  try {
    const { error } = await supabase
      .from('required_document_templates')
      .delete()
      .eq('id', id);

    if (!error) {
      // also update localStorage
    }
  } catch (err) {
    console.warn('Supabase delete required_document_templates failed:', err);
  }

  const current = await getRequiredDocuments(companyId);
  const filtered = current.filter(item => item.id !== id);
  localStorage.setItem(`hrms_required_documents_${companyId}`, JSON.stringify(filtered));
  return true;
};

export const getUserDocuments = async (userId) => {
  let docs = [];
  try {
    const { data, error } = await supabase.from('user_documents').select('*').eq('userId', userId);
    if (!error && data) {
      docs = data;
    }
  } catch (err) {
    console.warn('Supabase fetch for user_documents failed:', err);
  }

  // Also check local storage fallback for user docs
  const localKey = `hrms_user_docs_${userId}`;
  const localStored = localStorage.getItem(localKey);
  const localDocs = localStored ? JSON.parse(localStored) : [];

  // Merge items unique by id
  const map = new Map();
  docs.forEach(d => map.set(d.id, d));
  localDocs.forEach(d => {
    if (!map.has(d.id)) {
      map.set(d.id, d);
    }
  });

  return Array.from(map.values()).sort((a, b) => new Date(b.created_at || b.lastModified || 0) - new Date(a.created_at || a.lastModified || 0));
};

export const createDocument = async (document) => {
  const payload = {
    id: document.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId: document.userId,
    type: document.type,
    name: document.name,
    url: document.url,
    status: document.status || 'Pending',
    rejectionReason: document.rejectionReason || '',
    requestStatus: document.requestStatus || null,
    requestReason: document.requestReason || '',
    uploadedBy: document.uploadedBy || 'Employee',
    lastModified: document.lastModified || new Date().toLocaleDateString(),
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('user_documents').insert(payload).select().maybeSingle();
    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase create user_documents failed, saving to localStorage:', err);
  }

  // Local storage fallback
  const localKey = `hrms_user_docs_${payload.userId}`;
  const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
  existing.unshift(payload);
  localStorage.setItem(localKey, JSON.stringify(existing));
  return payload;
};

export const requestDocumentAction = async (documentId, actionType, reason, userId) => {
  const payload = {
    requestStatus: actionType === 'delete' ? 'Delete_Requested' : 'Update_Requested',
    requestReason: reason || '',
    userId,
    lastModified: new Date().toLocaleDateString()
  };

  return await updateDocument(documentId, payload);
};

export const updateDocument = async (documentId, payload) => {
  try {
    const { data, error } = await supabase
      .from('user_documents')
      .update(payload)
      .eq('id', documentId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase update user_documents failed:', err);
  }

  // Fallback in localStorage if user doc was stored locally
  if (payload.userId) {
    const localKey = `hrms_user_docs_${payload.userId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = existing.findIndex(d => d.id === documentId);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...payload };
      localStorage.setItem(localKey, JSON.stringify(existing));
      return existing[idx];
    }
  }
  return { id: documentId, ...payload };
};

export const deleteDocument = async (documentId, userId) => {
  try {
    await supabase.from('user_documents').delete().eq('id', documentId);
  } catch (err) {
    console.warn('Supabase delete user_documents failed:', err);
  }

  if (userId) {
    const localKey = `hrms_user_docs_${userId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter(d => d.id !== documentId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  }
};

export const uploadFile = async (bucket, folder, file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const randomId = Math.random().toString(36).substring(2, 11);
    const fileName = `${randomId}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn('Supabase storage upload failed, falling back to Base64:', err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
};

export const getLeaves = async ({ userId, companyId } = {}) => {
  let query = supabase.from('leaves').select('*, user:users(name, full_name, avatar, email)');
  if (userId) {
    query = query.eq('userId', userId);
  }
  if (companyId) {
    query = query.eq('companyId', companyId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  throwIfError(error);
  return data ?? [];
};

export const createLeave = async (leave) => {
  const { data, error } = await supabase.from('leaves').insert(leave).select().single();
  throwIfError(error);
  return data;
};

export const updateLeaveStatus = async (leaveId, { status, comments }) => {
  const { data, error } = await supabase
    .from('leaves')
    .update({ status, comments, updated_at: new Date().toISOString() })
    .eq('id', leaveId)
    .select()
    .single();
  throwIfError(error);
  return data;
};

export const deleteLeave = async (leaveId) => {
  const { error } = await supabase.from('leaves').delete().eq('id', leaveId);
  throwIfError(error);
};

export const createNotification = async (notification) => {
  const payload = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userId: notification.userId,
    companyId: notification.companyId || 1,
    title: notification.title,
    message: notification.message,
    type: notification.type || 'info',
    read: false,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase.from('notifications').insert(payload).select().maybeSingle();
    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase create notification failed, falling back to localStorage:', err);
  }

  // Fallback
  const key = `hrms_notifications_${payload.companyId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.unshift(payload);
  localStorage.setItem(key, JSON.stringify(existing));
  return payload;
};

export const getNotifications = async (userId, companyId = 1, isAdmin = false) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('companyId', companyId);

    if (!error && data) {
      return data.filter(n => {
        if (n.userId === userId) return true;
        if (n.userId === 'all') return true;
        if (n.userId === 'admin' && isAdmin) return true;
        return false;
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  } catch (err) {
    console.warn('Supabase fetch notifications failed, using fallback:', err);
  }

  // Fallback
  const key = `hrms_notifications_${companyId}`;
  const local = JSON.parse(localStorage.getItem(key) || '[]');
  return local.filter(n => {
    if (n.userId === userId) return true;
    if (n.userId === 'all') return true;
    if (n.userId === 'admin' && isAdmin) return true;
    return false;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const markNotificationAsRead = async (id, companyId = 1) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (err) {
    console.warn('Supabase update notification failed, using fallback:', err);
  }

  // Fallback
  const key = `hrms_notifications_${companyId}`;
  const local = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = local.findIndex(n => n.id === id);
  if (idx !== -1) {
    local[idx].read = true;
    localStorage.setItem(key, JSON.stringify(local));
    return local[idx];
  }
  return null;
};

export const markAllNotificationsAsRead = async (userId, companyId = 1) => {
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('companyId', companyId)
      .or(`userId.eq.${userId},userId.eq.admin,userId.eq.all`);
  } catch (err) {
    console.warn('Supabase mark all read failed, using fallback:', err);
  }

  // Fallback
  const key = `hrms_notifications_${companyId}`;
  const local = JSON.parse(localStorage.getItem(key) || '[]');
  local.forEach(n => {
    if (n.userId === userId || n.userId === 'admin' || n.userId === 'all') {
      n.read = true;
    }
  });
  localStorage.setItem(key, JSON.stringify(local));
  return true;
};

