/**
 * API Service Configuration
 * Centralized location for handling API requests and base URLs
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * Helper to build full API URLs
 * @param {string} endpoint - The endpoint path (e.g., '/users' or 'companies/1')
 * @returns {string} - The full URL
 */
export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Standard fetch wrapper for consistent error handling and future flexibility
 * (e.g., adding auth headers, logging, etc.)
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Fetch Error [${url}]:`, error);
    throw error;
  }
};
