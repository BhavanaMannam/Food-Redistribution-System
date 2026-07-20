const API_BASE_URL = "http://localhost:8000/api/v1";
const BARCODE_BASE_URL = "http://localhost:8000/api";

async function request(url, options = {}) {
  const headers = options.headers || {};
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: { ...headers },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Something went wrong");
  }
  return response.json();
}

async function barcodeRequest(url, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  // Only set Content-Type for requests that have a body
  const headers = rest.body
    ? { 'Content-Type': 'application/json', ...extraHeaders }
    : { ...extraHeaders };
  const response = await fetch(`${BARCODE_BASE_URL}${url}`, { ...rest, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Something went wrong');
  }
  // DELETE returns {message} not a full object — still parse it
  return response.json();
}

export const api = {
  auth: {
    getTenants: () => request("/auth/tenants"),
    login: (username, password) =>
      request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }),
    register: (data) =>
      request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  },

  inventory: {
    getItems: (tenantId) => request(`/inventory?tenant_id=${tenantId}`),
    getAllBusiness: () => request(`/inventory/all-business`),
    createItem: (tenantId, itemData) =>
      request(`/inventory?tenant_id=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
      }),
    updateItem: (itemId, tenantId, quantity, status) => {
      let url = `/inventory/${itemId}?tenant_id=${tenantId}`;
      if (quantity !== undefined && quantity !== null) url += `&quantity=${quantity}`;
      if (status) url += `&status=${status}`;
      return request(url, { method: "PUT" });
    },
    deleteItem: (itemId, tenantId) =>
      request(`/inventory/${itemId}?tenant_id=${tenantId}`, { method: "DELETE" }),
    uploadCSV: (tenantId, file) => {
      const formData = new FormData();
      formData.append("tenant_id", tenantId);
      formData.append("file", file);
      return request("/inventory/upload-csv", {
        method: "POST",
        body: formData,
      });
    },
    syncPOS: (tenantId, payload) =>
      request(`/pos/sync?tenant_id=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  },

  predict: {
    getWasteRisk: (tenantId) => request(`/predict/risk?tenant_id=${tenantId}`),
    getReorders: (tenantId) => request(`/predict/reorder?tenant_id=${tenantId}`),
  },

  marketplace: {
    getListings: (tenantId) => request(`/marketplace/listings?tenant_id=${tenantId}`),
    createListing: (tenantId, listingData) =>
      request(`/marketplace/listings?tenant_id=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listingData),
      }),
    getBookings: (tenantId) => request(`/marketplace/bookings?tenant_id=${tenantId}`),
    createBooking: (ngoId, bookingData) =>
      request(`/marketplace/bookings?ngo_id=${ngoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      }),
    updateBookingStatus: (bookingId, tenantId, status) =>
      request(`/marketplace/bookings/${bookingId}?tenant_id=${tenantId}&status=${status}`, {
        method: "PUT",
      }),
    getMatchingNGOs: (listingId) =>
      request(`/marketplace/listings/${listingId}/matching-ngos`),
    getMatchedListings: (ngoId) =>
      request(`/marketplace/listings/matched-for-ngo/${ngoId}`),
    requestDonation: (ngoId, inventoryItemId, quantity, pickupTime) =>
      request(`/marketplace/request?ngo_id=${ngoId}&inventory_item_id=${inventoryItemId}&quantity=${quantity}&pickup_time=${encodeURIComponent(pickupTime)}`, {
        method: "POST",
      }),
    getIncomingDonations: (ngoId) => request(`/marketplace/incoming-donations?ngo_id=${ngoId}`),
    donate: (donorId, ngoId, data) =>
      request(`/marketplace/donate?donor_id=${donorId}${ngoId ? `&ngo_id=${ngoId}` : ''}&food_name=${encodeURIComponent(data.food_name)}&category=${data.category}&quantity=${data.quantity}&unit=${data.unit}&notes=${encodeURIComponent(data.notes || '')}&pickup_hours=${data.pickup_hours}`, {
        method: 'POST',
      }),
    getMyDonations: (donorId) => request(`/marketplace/my-donations?donor_id=${donorId}`),
    getNGORequests: (donorId) => request(`/marketplace/ngo-requests?donor_id=${donorId}`),
  },

  history: {
    get: (tenantId) => request(`/history?tenant_id=${tenantId}`),
  },

  tenants: {
    update: (tenantId, data) => {
      const params = new URLSearchParams();
      if (data.name) params.append('name', data.name);
      if (data.address) params.append('address', data.address);
      if (data.contact_phone) params.append('contact_phone', data.contact_phone);
      if (data.contact_email) params.append('contact_email', data.contact_email);
      if (data.latitude != null) params.append('latitude', data.latitude);
      if (data.longitude != null) params.append('longitude', data.longitude);
      if (data.is_public != null) params.append('is_public', data.is_public);
      return request(`/tenants/${tenantId}?${params.toString()}`, { method: 'PUT' });
    },
    getNGOs: (tenantId) => request(`/tenants/ngos?tenant_id=${tenantId}`),
    getNearby: (tenantId) => request(`/tenants/nearby?tenant_id=${tenantId}`),
  },

  analytics: {
    getImpact: (tenantId) => {
      const query = tenantId ? `?tenant_id=${tenantId}` : "";
      return request(`/analytics/impact${query}`);
    },
  },

  barcodes: {
    getAll: () => barcodeRequest('/barcodes'),
    getByBarcode: (barcode) => barcodeRequest(`/barcodes/lookup/${encodeURIComponent(barcode)}`),
    lookupOFF: (barcode) => request(`/barcode/lookup/${encodeURIComponent(barcode)}`),
    create: (data) => barcodeRequest('/barcodes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => barcodeRequest(`/barcodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => barcodeRequest(`/barcodes/${id}`, { method: 'DELETE' }),
  },
};
