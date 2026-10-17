const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('coldchain_token');
}

export function setToken(token: string): void {
  localStorage.setItem('coldchain_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('coldchain_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      data?.message || data?.error || `Request failed with status ${response.status}`,
      response.status,
      data?.details
    );
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Organizations
  getOrganizations: (params = '') => request<any>(`/organizations${params}`),
  getOrganization: (id: string) => request<any>(`/organizations/${id}`),
  createOrganization: (data: any) =>
    request<any>('/organizations', { method: 'POST', body: JSON.stringify(data) }),

  // Products
  getProducts: (params = '') => request<any>(`/products${params}`),
  getProduct: (id: string) => request<any>(`/products/${id}`),
  createProduct: (data: any) =>
    request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),

  // Batches
  getBatches: (params = '') => request<any>(`/batches${params}`),
  getBatch: (id: string) => request<{ batch: any }>(`/batches/${id}`),
  getPublicBatch: (batchNumber: string) => request<any>(`/batches/public/${batchNumber}`),
  createBatch: (data: any) =>
    request<any>('/batches', { method: 'POST', body: JSON.stringify(data) }),
  updateBatchStatus: (id: string, status: string) =>
    request<any>(`/batches/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Events
  getEventsByBatch: (batchId: string) => request<{ events: any[] }>(`/events/batch/${batchId}`),
  createEvent: (data: any) =>
    request<any>('/events', { method: 'POST', body: JSON.stringify(data) }),

  // Devices
  getDevices: (params = '') => request<any>(`/devices${params}`),
  getDevice: (id: string) => request<{ device: any }>(`/devices/${id}`),
  createDevice: (data: any) =>
    request<any>('/devices', { method: 'POST', body: JSON.stringify(data) }),

  // Sensors & Telemetry
  getSensorReadings: (batchId: string, params = '') =>
    request<any>(`/sensors/batch/${batchId}${params}`),
  ingestTelemetry: (data: any) =>
    request<any>('/sensors/telemetry', { method: 'POST', body: JSON.stringify(data) }),

  // Alerts
  getAlerts: (params = '') => request<any>(`/alerts${params}`),
  getAlert: (id: string) => request<{ alert: any }>(`/alerts/${id}`),
  acknowledgeAlert: (id: string) =>
    request<any>(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  resolveAlert: (id: string, resolutionNotes: string) =>
    request<any>(`/alerts/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolutionNotes }),
    }),

  // Anchors
  getAnchorsByBatch: (batchId: string) => request<{ anchors: any[] }>(`/anchors/batch/${batchId}`),
  createAnchor: (data: any) =>
    request<any>('/anchors', { method: 'POST', body: JSON.stringify(data) }),
  verifyBatchAnchors: (batchId: string) => request<any>(`/anchors/verify/${batchId}`),

  // Users
  getUsers: (params = '') => request<any>(`/users${params}`),
  updateUser: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
