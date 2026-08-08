import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

// Request interceptor to automatically add the token
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem('supabase.auth.token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper for securely downloading files that require authentication
export const downloadSecureFile = async (url, filename) => {
  try {
    const fullUrl = url.startsWith('/') ? url : `/${url}`;
    const response = await api.get(fullUrl, { responseType: 'blob' });
    
    // Create blob link to download
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename || 'downloaded_file');
    
    // Append to html link element page
    document.body.appendChild(link);
    link.click();
    
    // Clean up and remove the link
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Failed to download file:', err);
    alert('Failed to download file securely.');
  }
};

export default api;
