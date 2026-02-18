const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'postman', 'admin.postman_collection.json');

const defaultMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 120,
  totalPages: 6,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  query: '',
  filters: {}
};

const sampleIds = {
  adminId: '64b27a2f8e9f4c1234567000',
  userId: '64b27a2f8e9f4c1234567890',
  subscriptionId: '64b27a2f8e9f4c1234567801',
  transactionId: '64b27a2f8e9f4c1234567701',
  categoryId: '64b27a2f8e9f4c1234567601',
  adId: '64b27a2f8e9f4c1234567501',
  engagementId: '64b27a2f8e9f4c1234567401',
  creatorId: '64b27a2f8e9f4c1234567301',
  reportId: '64b27a2f8e9f4c1234567201',
  notificationId: '64b27a2f8e9f4c1234567101',
  conversationId: '64b27a2f8e9f4c1234567001',
  messageId: '64b27a2f8e9f4c1234567002'
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const buildUrl = (pathStr, query = []) => {
  const cleanPath = pathStr.replace(/^\//, '');
  const pathSegments = cleanPath.length ? cleanPath.split('/') : [];
  const url = {
    raw: `{{baseUrl}}${pathStr}`,
    host: ['{{baseUrl}}'],
    path: pathSegments
  };
  if (query.length) {
    url.query = query;
  }
  return url;
};

const buildHeaders = (authRequired = true) => {
  const headers = [];
  if (authRequired) {
    headers.push({
      key: 'Authorization',
      value: 'Bearer {{admin_token}}'
    });
  }
  headers.push({
    key: 'Content-Type',
    value: 'application/json'
  });
  return headers;
};

const buildBody = (definition) => {
  if (!definition) {
    return undefined;
  }

  if (definition.mode === 'raw') {
    return {
      mode: 'raw',
      raw: JSON.stringify(definition.payload, null, 2),
      options: {
        raw: {
          language: 'json'
        }
      }
    };
  }

  if (definition.mode === 'formdata') {
    return {
      mode: 'formdata',
      formdata: definition.formdata
    };
  }

  return undefined;
};

const responseHeaders = [
  {
    key: 'Content-Type',
    value: 'application/json'
  }
];

const buildSuccessResponse = ({ request, message, data, meta }) => ({
  name: '200 Success',
  originalRequest: clone(request),
  status: 'OK',
  code: 200,
  _postman_previewlanguage: 'json',
  header: responseHeaders,
  cookie: [],
  body: JSON.stringify(
    {
      success: true,
      message,
      data,
      meta: meta ?? null
    },
    null,
    2
  )
});

const buildErrorResponse = ({ request, message, code = 400, status = 'Bad Request' }) => ({
  name: `${code} Error`,
  originalRequest: clone(request),
  status,
  code,
  _postman_previewlanguage: 'json',
  header: responseHeaders,
  cookie: [],
  body: JSON.stringify(
    {
      success: false,
      message,
      data: null,
      meta: null
    },
    null,
    2
  )
});

const loginTestScript = {
  listen: 'test',
  script: {
    exec: [
      'const res = pm.response.json();',
      'if (res?.data?.accessToken) {',
      '    pm.collectionVariables.set("admin_token", res.data.accessToken);',
      '}'
    ],
    type: 'text/javascript'
  }
};

const paginationQuery = [
  {
    key: 'page',
    value: '1',
    description: 'Page number'
  },
  {
    key: 'pageSize',
    value: '20',
    description: 'Items per page'
  },
  {
    key: 'query',
    value: '',
    description: 'Search keyword'
  },
  {
    key: 'sortBy',
    value: 'createdAt',
    description: 'Sort field'
  },
  {
    key: 'sortOrder',
    value: 'desc',
    description: 'Sort order (asc|desc)'
  },
  {
    key: 'filters',
    value: '{}',
    description: 'JSON encoded filters'
  }
];

const modules = [];

const addRequest = (group, def) => {
  const request = {
    method: def.method,
    header: buildHeaders(def.auth !== false),
    url: buildUrl(def.path, def.query),
    description: def.description
  };

  if (def.body) {
    request.body = buildBody(def.body);
  }

  const item = {
    name: def.name,
    request,
    response: [
      buildSuccessResponse({
        request,
        message: def.successMessage,
        data: def.successData,
        meta: def.meta
      }),
      buildErrorResponse({
        request,
        message: def.errorMessage
      })
    ],
    description: def.description
  };

  if (def.events?.length) {
    item.event = def.events;
  }

  group.item.push(item);
};

const addModule = (name, description) => {
  const module = { name, description, item: [] };
  modules.push(module);
  return module;
};

// Build modules and requests below.

const adminAuthModule = addModule(
  'Admin Auth',
  'Authentication and profile management endpoints for admin users.'
);

addRequest(adminAuthModule, {
  name: 'POST /admin/login',
  method: 'POST',
  path: '/admin/login',
  auth: false,
  description: 'Authenticate an admin using email/password and receive access/refresh tokens.',
  body: {
    mode: 'raw',
    payload: {
      email: 'admin@stoneacademy.dev',
      password: 'AdminStrongPass!23',
      deviceId: 'admin-console-01'
    }
  },
  events: [loginTestScript],
  successMessage: 'Admin authenticated successfully.',
  successData: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'c9a27ab9-0ff2-467a-9b37-70a1d0b1be78',
    admin: {
      id: sampleIds.adminId,
      fullName: 'Stone Admin',
      email: 'admin@stoneacademy.dev',
      role: 'super_admin',
      status: 'active',
      lastLoginAt: '2026-02-18T10:21:00.000Z'
    }
  },
  meta: null,
  errorMessage: 'Invalid admin credentials.'
});

addRequest(adminAuthModule, {
  name: 'POST /admin/logout',
  method: 'POST',
  path: '/admin/logout',
  description: 'Invalidate the current session refresh token and revoke access.',
  body: {
    mode: 'raw',
    payload: {
      refreshToken: 'c9a27ab9-0ff2-467a-9b37-70a1d0b1be78',
      deviceId: 'admin-console-01'
    }
  },
  successMessage: 'Admin logged out successfully.',
  successData: {
    revokedSessions: 1
  },
  meta: null,
  errorMessage: 'Unable to logout with the provided token.'
});

addRequest(adminAuthModule, {
  name: 'POST /admin/logout-all',
  method: 'POST',
  path: '/admin/logout-all',
  description: 'Revoke all active sessions for the authenticated admin.',
  body: {
    mode: 'raw',
    payload: {
      deviceId: 'admin-console-01'
    }
  },
  successMessage: 'All admin sessions were revoked.',
  successData: {
    revokedSessions: 4
  },
  meta: null,
  errorMessage: 'Failed to revoke all sessions.'
});

addRequest(adminAuthModule, {
  name: 'GET /admin/profile',
  method: 'GET',
  path: '/admin/profile',
  description: 'Retrieve the authenticated admin profile.',
  successMessage: 'Admin profile retrieved.',
  successData: {
    id: sampleIds.adminId,
    fullName: 'Stone Admin',
    email: 'admin@stoneacademy.dev',
    role: 'super_admin',
    status: 'active',
    lastLoginAt: '2026-02-18T10:21:00.000Z',
    createdAt: '2024-01-10T08:00:00.000Z',
    updatedAt: '2026-02-18T10:21:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to fetch admin profile.'
});

addRequest(adminAuthModule, {
  name: 'PUT /admin/profile',
  method: 'PUT',
  path: '/admin/profile',
  description: 'Update profile attributes for the authenticated admin.',
  body: {
    mode: 'raw',
    payload: {
      fullName: 'Stone Admin',
      phoneNumber: '+1-415-555-0112',
      avatarUrl: 'https://cdn.stoneacademy.dev/avatars/admin.png'
    }
  },
  successMessage: 'Admin profile updated.',
  successData: {
    id: sampleIds.adminId,
    fullName: 'Stone Admin',
    phoneNumber: '+1-415-555-0112',
    avatarUrl: 'https://cdn.stoneacademy.dev/avatars/admin.png',
    updatedAt: '2026-02-18T10:35:12.000Z'
  },
  meta: null,
  errorMessage: 'Failed to update admin profile.'
});

addRequest(adminAuthModule, {
  name: 'PUT /admin/password',
  method: 'PUT',
  path: '/admin/password',
  description: 'Change the admin password.',
  body: {
    mode: 'raw',
    payload: {
      currentPassword: 'AdminStrongPass!23',
      newPassword: 'NewAdminStrongPass!45'
    }
  },
  successMessage: 'Admin password updated.',
  successData: {
    requiresReLogin: true
  },
  meta: null,
  errorMessage: 'Current password is invalid.'
});

const dashboardModule = addModule(
  'Dashboard',
  'Aggregated dashboard metrics and previews.'
);

addRequest(dashboardModule, {
  name: 'GET /admin/dashboard/metrics',
  method: 'GET',
  path: '/admin/dashboard/metrics',
  description: 'Get high-level metrics for the admin dashboard.',
  successMessage: 'Dashboard metrics retrieved.',
  successData: {
    totalUsers: 48210,
    totalRevenue: 1289430,
    totalEvents: 231,
    totalActivities: 412,
    totalCreators: 58,
    activeSubscriptions: 32840,
    growth: {
      monthOverMonth: 0.12,
      weekOverWeek: 0.04
    },
    revenueLast12Months: [
      {
        month: '2025-03',
        amount: 92000
      },
      {
        month: '2025-12',
        amount: 131000
      },
      {
        month: '2026-01',
        amount: 142500
      }
    ]
  },
  meta: null,
  errorMessage: 'Unable to load dashboard metrics.'
});

addRequest(dashboardModule, {
  name: 'GET /admin/dashboard/recent-users',
  method: 'GET',
  path: '/admin/dashboard/recent-users',
  description: 'Retrieve the recently joined users for table preview.',
  query: paginationQuery,
  successMessage: 'Recent users retrieved.',
  successData: [
    {
      sid: 'SU-1001',
      fullName: 'Olivia Patel',
      email: 'olivia.patel@example.com',
      joinedDate: '2026-02-16T12:00:00.000Z',
      status: 'active',
      actionsAllowed: ['view', 'block']
    },
    {
      sid: 'SU-1002',
      fullName: 'Marcus Reed',
      email: 'marcus.reed@example.com',
      joinedDate: '2026-02-15T09:15:00.000Z',
      status: 'blocked',
      actionsAllowed: ['view', 'unblock']
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to fetch recent users.'
});

addRequest(dashboardModule, {
  name: 'GET /admin/dashboard/notifications/preview',
  method: 'GET',
  path: '/admin/dashboard/notifications/preview',
  description: 'Fetch the latest four platform notifications for dashboard cards.',
  successMessage: 'Notification preview retrieved.',
  successData: [
    {
      id: sampleIds.notificationId,
      title: 'New verification request',
      message: 'Creator NovaFit submitted verification documents.',
      type: 'verification',
      timestamp: '2026-02-18T09:22:00.000Z',
      read: false
    }
  ],
  meta: null,
  errorMessage: 'Failed to load notification preview.'
});

const usersModule = addModule('Users', 'Admin user management flows.');

const usersQuery = [
  ...paginationQuery,
  { key: 'status', value: 'active', description: 'Filter by status' },
  { key: 'joinedAfter', value: '2025-12-01', description: 'ISO start date' },
  { key: 'joinedBefore', value: '2026-02-20', description: 'ISO end date' }
];

addRequest(usersModule, {
  name: 'GET /admin/users',
  method: 'GET',
  path: '/admin/users',
  description: 'List users with pagination, filters, and search.',
  query: usersQuery,
  successMessage: 'User list retrieved.',
  successData: [
    {
      sid: 'SU-2041',
      fullName: 'Naomi Briggs',
      email: 'naomi.briggs@example.com',
      joinedDate: '2025-12-20T18:12:00.000Z',
      status: 'active'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list users.'
});

addRequest(usersModule, {
  name: 'GET /admin/users/blocked',
  method: 'GET',
  path: '/admin/users/blocked',
  description: 'Retrieve blocked users with the same pagination standard.',
  query: paginationQuery,
  successMessage: 'Blocked users retrieved.',
  successData: [
    {
      sid: 'SU-2099',
      fullName: 'Victor Calder',
      email: 'victor.calder@example.com',
      joinedDate: '2025-11-10T14:32:00.000Z',
      status: 'blocked'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to fetch blocked users.'
});

addRequest(usersModule, {
  name: 'GET /admin/users/:id',
  method: 'GET',
  path: `/admin/users/${sampleIds.userId}`,
  description: 'Fetch a single user profile and summary by ID.',
  successMessage: 'User details retrieved.',
  successData: {
    id: sampleIds.userId,
    fullName: 'Naomi Briggs',
    email: 'naomi.briggs@example.com',
    status: 'active',
    joinedDate: '2025-12-20T18:12:00.000Z',
    notes: [
      {
        id: 'NOTE-1',
        adminId: sampleIds.adminId,
        text: 'Verified student enrollment documents.',
        createdAt: '2026-02-10T10:05:00.000Z'
      }
    ]
  },
  meta: null,
  errorMessage: 'User not found.'
});

addRequest(usersModule, {
  name: 'POST /admin/users/:id/block',
  method: 'POST',
  path: `/admin/users/${sampleIds.userId}/block`,
  description: 'Block a user account.',
  body: {
    mode: 'raw',
    payload: {
      reason: 'Chargeback detected on last transaction.',
      notifyUser: true
    }
  },
  successMessage: 'User blocked successfully.',
  successData: {
    id: sampleIds.userId,
    status: 'blocked',
    blockedAt: '2026-02-18T10:45:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to block user.'
});

addRequest(usersModule, {
  name: 'POST /admin/users/:id/unblock',
  method: 'POST',
  path: `/admin/users/${sampleIds.userId}/unblock`,
  description: 'Unblock a user account.',
  body: {
    mode: 'raw',
    payload: {
      reason: 'Issue resolved after billing verification.',
      notifyUser: true
    }
  },
  successMessage: 'User unblocked successfully.',
  successData: {
    id: sampleIds.userId,
    status: 'active',
    unblockedAt: '2026-02-18T11:05:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to unblock user.'
});

addRequest(usersModule, {
  name: 'POST /admin/users/:id/notes',
  method: 'POST',
  path: `/admin/users/${sampleIds.userId}/notes`,
  description: 'Append an internal admin note for the user.',
  body: {
    mode: 'raw',
    payload: {
      note: 'Confirmed scholarship paperwork on call.',
      visibility: 'internal'
    }
  },
  successMessage: 'User note added.',
  successData: {
    id: 'NOTE-2',
    userId: sampleIds.userId,
    adminId: sampleIds.adminId,
    note: 'Confirmed scholarship paperwork on call.',
    createdAt: '2026-02-18T11:20:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to add user note.'
});

const subscriptionsModule = addModule(
  'Subscriptions',
  'Subscription fees management and subscription records.'
);

const subscriptionQuery = [
  ...paginationQuery,
  { key: 'status', value: 'paid', description: 'paid | expired' },
  { key: 'plan', value: 'yearly', description: 'Plan code filter' }
];

addRequest(subscriptionsModule, {
  name: 'GET /admin/subscriptions/fees',
  method: 'GET',
  path: '/admin/subscriptions/fees',
  description: 'Retrieve the active subscription fee configuration.',
  successMessage: 'Subscription fees retrieved.',
  successData: {
    monthly: 39,
    sixMonth: 199,
    yearly: 349,
    currency: 'USD',
    updatedAt: '2026-02-15T09:00:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to load subscription fees.'
});

addRequest(subscriptionsModule, {
  name: 'PUT /admin/subscriptions/fees',
  method: 'PUT',
  path: '/admin/subscriptions/fees',
  description: 'Update subscription pricing tiers.',
  body: {
    mode: 'raw',
    payload: {
      monthly: 42,
      sixMonth: 215,
      yearly: 365,
      currency: 'USD'
    }
  },
  successMessage: 'Subscription fees updated.',
  successData: {
    monthly: 42,
    sixMonth: 215,
    yearly: 365,
    currency: 'USD',
    updatedBy: sampleIds.adminId,
    updatedAt: '2026-02-18T09:55:00.000Z'
  },
  meta: null,
  errorMessage: 'Failed to update subscription fees.'
});

addRequest(subscriptionsModule, {
  name: 'GET /admin/subscriptions',
  method: 'GET',
  path: '/admin/subscriptions',
  description: 'List subscriptions with pagination and filters.',
  query: subscriptionQuery,
  successMessage: 'Subscriptions retrieved.',
  successData: [
    {
      sid: 'SUB-1001',
      userName: 'Naomi Briggs',
      email: 'naomi.briggs@example.com',
      status: 'paid',
      plan: 'yearly',
      price: 365,
      expirationDate: '2027-02-18T00:00:00.000Z',
      lastRenewedAt: '2026-02-18T00:00:00.000Z'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list subscriptions.'
});

addRequest(subscriptionsModule, {
  name: 'GET /admin/subscriptions/:id',
  method: 'GET',
  path: `/admin/subscriptions/${sampleIds.subscriptionId}`,
  description: 'Retrieve a single subscription record by ID.',
  successMessage: 'Subscription details retrieved.',
  successData: {
    id: sampleIds.subscriptionId,
    userId: sampleIds.userId,
    plan: 'yearly',
    price: 365,
    status: 'paid',
    startedAt: '2026-02-18T00:00:00.000Z',
    expirationDate: '2027-02-18T00:00:00.000Z',
    paymentMethod: 'stripe',
    transactions: [
      {
        transactionId: sampleIds.transactionId,
        amount: 365,
        status: 'completed',
        processedAt: '2026-02-18T00:00:00.000Z'
      }
    ]
  },
  meta: null,
  errorMessage: 'Subscription not found.'
});

addRequest(subscriptionsModule, {
  name: 'POST /admin/subscriptions/search',
  method: 'POST',
  path: '/admin/subscriptions/search',
  description: 'Advanced subscription search by keyword and filters.',
  body: {
    mode: 'raw',
    payload: {
      query: 'naomi',
      filters: {
        status: 'paid',
        plan: 'yearly'
      }
    }
  },
  successMessage: 'Subscription search completed.',
  successData: [
    {
      id: sampleIds.subscriptionId,
      userName: 'Naomi Briggs',
      email: 'naomi.briggs@example.com',
      status: 'paid',
      plan: 'yearly',
      price: 365
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Search query invalid.'
});

const earningsModule = addModule(
  'Earnings',
  'Revenue transactions and invoice generation.'
);

const earningsQuery = [
  ...paginationQuery,
  { key: 'plan', value: 'yearly', description: 'Filter by plan' },
  { key: 'status', value: 'completed', description: 'Payment status' },
  { key: 'dateFrom', value: '2026-01-01', description: 'Start date (ISO)' },
  { key: 'dateTo', value: '2026-02-18', description: 'End date (ISO)' }
];

addRequest(earningsModule, {
  name: 'GET /admin/earnings/transactions',
  method: 'GET',
  path: '/admin/earnings/transactions',
  description: 'List earnings transactions.',
  query: earningsQuery,
  successMessage: 'Transactions retrieved.',
  successData: [
    {
      id: sampleIds.transactionId,
      userName: 'Naomi Briggs',
      avatar: 'https://cdn.stoneacademy.dev/avatars/naomi.png',
      trxId: 'TRX-934312',
      plan: 'yearly',
      price: 365,
      date: '2026-02-18T00:00:00.000Z',
      email: 'naomi.briggs@example.com',
      status: 'completed'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list transactions.'
});

addRequest(earningsModule, {
  name: 'GET /admin/earnings/transactions/:id',
  method: 'GET',
  path: `/admin/earnings/transactions/${sampleIds.transactionId}`,
  description: 'Retrieve a single earnings transaction.',
  successMessage: 'Transaction details retrieved.',
  successData: {
    id: sampleIds.transactionId,
    userId: sampleIds.userId,
    plan: 'yearly',
    amount: 365,
    status: 'completed',
    paymentProvider: 'stripe',
    reference: 'pi_3OYZ7uL0',
    invoiceUrl: 'https://files.stoneacademy.dev/invoices/TRX-934312.pdf',
    createdAt: '2026-02-18T00:00:00.000Z'
  },
  meta: null,
  errorMessage: 'Transaction not found.'
});

addRequest(earningsModule, {
  name: 'POST /admin/earnings/transactions/:id/invoice',
  method: 'POST',
  path: `/admin/earnings/transactions/${sampleIds.transactionId}/invoice`,
  description: 'Generate and email/download an invoice for the transaction.',
  body: {
    mode: 'raw',
    payload: {
      delivery: 'email',
      recipientEmail: 'finance@stoneacademy.dev',
      includeBreakdown: true
    }
  },
  successMessage: 'Invoice generated successfully.',
  successData: {
    transactionId: sampleIds.transactionId,
    invoiceUrl: 'https://files.stoneacademy.dev/invoices/TRX-934312.pdf',
    deliveredTo: 'finance@stoneacademy.dev'
  },
  meta: null,
  errorMessage: 'Unable to generate invoice.'
});

const categoriesModule = addModule(
  'Categories',
  'CRUD operations for activity/event categories.'
);

addRequest(categoriesModule, {
  name: 'POST /admin/categories',
  method: 'POST',
  path: '/admin/categories',
  description: 'Create a new category.',
  body: {
    mode: 'raw',
    payload: {
      name: 'Wellness'
    }
  },
  successMessage: 'Category created.',
  successData: {
    id: sampleIds.categoryId,
    name: 'Wellness',
    assignedActivitiesCount: 0
  },
  meta: null,
  errorMessage: 'Unable to create category.'
});

addRequest(categoriesModule, {
  name: 'GET /admin/categories',
  method: 'GET',
  path: '/admin/categories',
  description: 'List categories with pagination and search.',
  query: paginationQuery,
  successMessage: 'Categories retrieved.',
  successData: [
    {
      sid: 'CAT-01',
      name: 'Wellness',
      assignedActivitiesCount: 14
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list categories.'
});

addRequest(categoriesModule, {
  name: 'PUT /admin/categories/:id',
  method: 'PUT',
  path: `/admin/categories/${sampleIds.categoryId}`,
  description: 'Update a category name.',
  body: {
    mode: 'raw',
    payload: {
      name: 'Wellness & Recovery'
    }
  },
  successMessage: 'Category updated.',
  successData: {
    id: sampleIds.categoryId,
    name: 'Wellness & Recovery',
    updatedAt: '2026-02-18T11:45:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to update category.'
});

addRequest(categoriesModule, {
  name: 'DELETE /admin/categories/:id',
  method: 'DELETE',
  path: `/admin/categories/${sampleIds.categoryId}`,
  description: 'Soft delete a category.',
  successMessage: 'Category deleted.',
  successData: {
    id: sampleIds.categoryId,
    isDeleted: true,
    deletedAt: '2026-02-18T12:00:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to delete category.'
});

const adsModule = addModule('Ads', 'Admin ad inventory management.');

const adsQuery = [
  ...paginationQuery,
  { key: 'categoryId', value: sampleIds.categoryId, description: 'Filter by category ID' },
  { key: 'status', value: 'active', description: 'Ad status' }
];

addRequest(adsModule, {
  name: 'GET /admin/ads',
  method: 'GET',
  path: '/admin/ads',
  description: 'List ads with filters.',
  query: adsQuery,
  successMessage: 'Ads retrieved.',
  successData: [
    {
      id: sampleIds.adId,
      categoryId: sampleIds.categoryId,
      productName: 'Pro Writing Masterclass',
      price: 129,
      status: 'active',
      clicks: 1280,
      impressions: 55200
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list ads.'
});

addRequest(adsModule, {
  name: 'POST /admin/ads',
  method: 'POST',
  path: '/admin/ads',
  description: 'Create a new ad record.',
  body: {
    mode: 'raw',
    payload: {
      categoryId: sampleIds.categoryId,
      productName: 'Mindful Leadership Summit',
      description: 'Promoted annual summit for creative leaders.',
      price: 499,
      destinationUrl: 'https://stoneacademy.dev/summits/mindful-leadership',
      status: 'active',
      image: 'https://cdn.stoneacademy.dev/ads/mindful-leadership.png'
    }
  },
  successMessage: 'Ad created.',
  successData: {
    id: sampleIds.adId,
    productName: 'Mindful Leadership Summit',
    status: 'active',
    metrics: {
      clicks: 0,
      impressions: 0
    }
  },
  meta: null,
  errorMessage: 'Unable to create ad.'
});

addRequest(adsModule, {
  name: 'PUT /admin/ads/:id',
  method: 'PUT',
  path: `/admin/ads/${sampleIds.adId}`,
  description: 'Update ad details and creative.',
  body: {
    mode: 'raw',
    payload: {
      description: 'Updated creative copy.',
      price: 549,
      destinationUrl: 'https://stoneacademy.dev/summits/mindful-leadership-2026',
      status: 'active'
    }
  },
  successMessage: 'Ad updated.',
  successData: {
    id: sampleIds.adId,
    status: 'active',
    price: 549,
    updatedAt: '2026-02-18T12:15:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to update ad.'
});

addRequest(adsModule, {
  name: 'DELETE /admin/ads/:id',
  method: 'DELETE',
  path: `/admin/ads/${sampleIds.adId}`,
  description: 'Soft delete an ad.',
  successMessage: 'Ad deleted.',
  successData: {
    id: sampleIds.adId,
    isDeleted: true,
    deletedAt: '2026-02-18T12:30:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to delete ad.'
});

addRequest(adsModule, {
  name: 'PATCH /admin/ads/:id/status',
  method: 'PATCH',
  path: `/admin/ads/${sampleIds.adId}/status`,
  description: 'Toggle ad status quickly.',
  body: {
    mode: 'raw',
    payload: {
      status: 'paused'
    }
  },
  successMessage: 'Ad status updated.',
  successData: {
    id: sampleIds.adId,
    status: 'paused',
    updatedAt: '2026-02-18T12:45:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to update ad status.'
});

const activitiesModule = addModule(
  'Activities & Events',
  'Unified engagement moderation endpoints.'
);

const activitiesQuery = [
  ...paginationQuery,
  { key: 'status', value: 'pendingApproval', description: 'Filter by status' },
  { key: 'type', value: 'event', description: 'activity | event' },
  { key: 'categoryId', value: sampleIds.categoryId, description: 'Category filter' },
  { key: 'hostId', value: sampleIds.creatorId, description: 'Host ID filter' },
  { key: 'startDate', value: '2026-02-01', description: 'Start date (ISO)' },
  { key: 'endDate', value: '2026-02-28', description: 'End date (ISO)' }
];

addRequest(activitiesModule, {
  name: 'GET /admin/activities',
  method: 'GET',
  path: '/admin/activities',
  description: 'List activities/events with filters.',
  query: activitiesQuery,
  successMessage: 'Activities retrieved.',
  successData: [
    {
      sid: 'ACT-1001',
      title: 'Studio Lighting Mastery',
      type: 'event',
      hostName: 'Nova Creators Guild',
      status: 'pendingApproval',
      category: 'Production',
      participantLimit: 120,
      participantsJoined: 58
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list activities.'
});

addRequest(activitiesModule, {
  name: 'GET /admin/activities/:id',
  method: 'GET',
  path: `/admin/activities/${sampleIds.engagementId}`,
  description: 'Retrieve a single activity/event.',
  successMessage: 'Activity detail retrieved.',
  successData: {
    id: sampleIds.engagementId,
    title: 'Studio Lighting Mastery',
    type: 'event',
    host: {
      id: sampleIds.creatorId,
      name: 'Nova Creators Guild'
    },
    description: 'Two-day advanced workshop.',
    date: '2026-03-05',
    time: '09:00',
    location: 'Stone Academy Main Hall',
    participantLimit: 120,
    participantsJoined: 58,
    category: 'Production',
    media: ['https://cdn.stoneacademy.dev/events/studio-lighting.png'],
    status: 'pendingApproval'
  },
  meta: null,
  errorMessage: 'Activity not found.'
});

addRequest(activitiesModule, {
  name: 'POST /admin/activities/:id/approve',
  method: 'POST',
  path: `/admin/activities/${sampleIds.engagementId}/approve`,
  description: 'Approve a pending activity/event.',
  body: {
    mode: 'raw',
    payload: {
      notes: 'All compliance checks passed.'
    }
  },
  successMessage: 'Activity approved.',
  successData: {
    id: sampleIds.engagementId,
    status: 'upcoming',
    approvedAt: '2026-02-18T13:00:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to approve activity.'
});

addRequest(activitiesModule, {
  name: 'POST /admin/activities/:id/cancel',
  method: 'POST',
  path: `/admin/activities/${sampleIds.engagementId}/cancel`,
  description: 'Cancel an activity/event.',
  body: {
    mode: 'raw',
    payload: {
      reason: 'Venue unavailable due to maintenance.',
      notifyHost: true
    }
  },
  successMessage: 'Activity cancelled.',
  successData: {
    id: sampleIds.engagementId,
    status: 'canceled',
    canceledAt: '2026-02-18T13:10:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to cancel activity.'
});

addRequest(activitiesModule, {
  name: 'DELETE /admin/activities/:id',
  method: 'DELETE',
  path: `/admin/activities/${sampleIds.engagementId}`,
  description: 'Soft delete an activity/event.',
  successMessage: 'Activity deleted.',
  successData: {
    id: sampleIds.engagementId,
    isDeleted: true,
    deletedAt: '2026-02-18T13:20:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to delete activity.'
});

addRequest(activitiesModule, {
  name: 'GET /admin/activities/search',
  method: 'GET',
  path: '/admin/activities/search',
  description: 'Search activities/events quickly.',
  query: [
    { key: 'query', value: 'studio', description: 'Search text' },
    { key: 'type', value: 'event', description: 'Filter by type' }
  ],
  successMessage: 'Activities search completed.',
  successData: [
    {
      id: sampleIds.engagementId,
      title: 'Studio Lighting Mastery',
      type: 'event',
      status: 'upcoming'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Invalid search parameters.'
});

const creatorsModule = addModule(
  'Event Creators',
  'Creator management and payout flows.'
);

addRequest(creatorsModule, {
  name: 'GET /admin/event-creators',
  method: 'GET',
  path: '/admin/event-creators',
  description: 'List event creators.',
  query: paginationQuery,
  successMessage: 'Event creators retrieved.',
  successData: [
    {
      id: sampleIds.creatorId,
      name: 'Nova Creators Guild',
      handle: '@novacreators',
      totalEvents: 24,
      ticketsSold: 1820,
      totalEarnings: 94200,
      paymentStatus: 'pending'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list event creators.'
});

addRequest(creatorsModule, {
  name: 'GET /admin/event-creators/:id',
  method: 'GET',
  path: `/admin/event-creators/${sampleIds.creatorId}`,
  description: 'Retrieve detailed information about an event creator.',
  successMessage: 'Event creator detail retrieved.',
  successData: {
    profile: {
      id: sampleIds.creatorId,
      name: 'Nova Creators Guild',
      handle: '@novacreators',
      bio: 'Specialists in premium creative events.'
    },
    events: [
      {
        id: sampleIds.engagementId,
        title: 'Studio Lighting Mastery',
        revenue: 26800
      }
    ],
    payoutHistory: [
      {
        payoutId: 'PO-1001',
        amount: 8200,
        status: 'completed',
        processedAt: '2026-01-28T15:00:00.000Z'
      }
    ]
  },
  meta: null,
  errorMessage: 'Event creator not found.'
});

addRequest(creatorsModule, {
  name: 'POST /admin/event-creators/:id/payout',
  method: 'POST',
  path: `/admin/event-creators/${sampleIds.creatorId}/payout`,
  description: 'Trigger a payout for a creator using a Mongo transaction.',
  body: {
    mode: 'raw',
    payload: {
      amount: 12500,
      currency: 'USD',
      method: 'bank_transfer',
      reference: 'PO-1088',
      notes: 'March advance payout'
    }
  },
  successMessage: 'Creator payout initiated.',
  successData: {
    payoutId: 'PO-1088',
    creatorId: sampleIds.creatorId,
    amount: 12500,
    status: 'pending',
    createdAt: '2026-02-18T13:45:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to create payout.'
});

const reportsModule = addModule('Reports', 'User report review flows.');

addRequest(reportsModule, {
  name: 'GET /admin/reports',
  method: 'GET',
  path: '/admin/reports',
  description: 'List user-generated reports.',
  query: paginationQuery,
  successMessage: 'Reports retrieved.',
  successData: [
    {
      sid: 'REP-1091',
      reportFrom: 'Olivia Patel',
      reportReason: 'Improper conduct in chat',
      reportTo: 'Victor Calder',
      timestamp: '2026-02-17T14:00:00.000Z',
      status: 'pending'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list reports.'
});

addRequest(reportsModule, {
  name: 'POST /admin/reports/:id/resolve',
  method: 'POST',
  path: `/admin/reports/${sampleIds.reportId}/resolve`,
  description: 'Resolve a report and optionally notify parties.',
  body: {
    mode: 'raw',
    payload: {
      resolutionNotes: 'Issue addressed with warning.'
    }
  },
  successMessage: 'Report resolved.',
  successData: {
    id: sampleIds.reportId,
    status: 'resolved',
    resolvedAt: '2026-02-18T14:05:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to resolve report.'
});

addRequest(reportsModule, {
  name: 'POST /admin/reports/:id/dismiss',
  method: 'POST',
  path: `/admin/reports/${sampleIds.reportId}/dismiss`,
  description: 'Dismiss a report as invalid.',
  body: {
    mode: 'raw',
    payload: {
      dismissalReason: 'Insufficient evidence.'
    }
  },
  successMessage: 'Report dismissed.',
  successData: {
    id: sampleIds.reportId,
    status: 'dismissed',
    dismissedAt: '2026-02-18T14:10:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to dismiss report.'
});

const notificationsModule = addModule(
  'Notifications',
  'Admin notification center endpoints.'
);

addRequest(notificationsModule, {
  name: 'GET /admin/notifications?context=preview',
  method: 'GET',
  path: '/admin/notifications',
  description: 'Retrieve the latest four notifications by using context=preview.',
  query: [{ key: 'context', value: 'preview', description: 'preview | full' }],
  successMessage: 'Notification preview retrieved.',
  successData: [
    {
      id: sampleIds.notificationId,
      title: 'New report submitted',
      message: 'User Olivia filed a report on Victor.',
      type: 'report',
      timestamp: '2026-02-18T09:22:00.000Z',
      read: false
    }
  ],
  meta: null,
  errorMessage: 'Unable to load notification preview.'
});

addRequest(notificationsModule, {
  name: 'GET /admin/notifications?context=full',
  method: 'GET',
  path: '/admin/notifications',
  description: 'Retrieve paginated notifications using context=full.',
  query: [...paginationQuery, { key: 'context', value: 'full', description: 'preview | full' }],
  successMessage: 'Notifications retrieved.',
  successData: [
    {
      id: sampleIds.notificationId,
      title: 'New verification request',
      message: 'Creator NovaFit submitted documents.',
      type: 'verification',
      timestamp: '2026-02-18T09:22:00.000Z',
      read: false
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list notifications.'
});

addRequest(notificationsModule, {
  name: 'POST /admin/notifications/read',
  method: 'POST',
  path: '/admin/notifications/read',
  description: 'Mark notifications as read.',
  body: {
    mode: 'raw',
    payload: {
      ids: [sampleIds.notificationId],
      markAll: false
    }
  },
  successMessage: 'Notifications marked as read.',
  successData: {
    updatedCount: 1
  },
  meta: null,
  errorMessage: 'Unable to mark notifications as read.'
});

const settingsModule = addModule('Settings', 'Admin profile/settings management.');

addRequest(settingsModule, {
  name: 'GET /admin/settings/profile',
  method: 'GET',
  path: '/admin/settings/profile',
  description: 'Retrieve admin profile settings.',
  successMessage: 'Profile settings retrieved.',
  successData: {
    id: sampleIds.adminId,
    fullName: 'Stone Admin',
    language: 'en',
    notificationPreferences: {
      email: true,
      push: true
    }
  },
  meta: null,
  errorMessage: 'Unable to load profile settings.'
});

addRequest(settingsModule, {
  name: 'PUT /admin/settings/profile',
  method: 'PUT',
  path: '/admin/settings/profile',
  description: 'Update admin profile settings.',
  body: {
    mode: 'raw',
    payload: {
      fullName: 'Stone Admin',
      language: 'en',
      notificationPreferences: {
        email: true,
        push: false
      }
    }
  },
  successMessage: 'Profile settings updated.',
  successData: {
    id: sampleIds.adminId,
    fullName: 'Stone Admin',
    language: 'en',
    notificationPreferences: {
      email: true,
      push: false
    },
    updatedAt: '2026-02-18T14:30:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to update profile settings.'
});

addRequest(settingsModule, {
  name: 'GET /admin/settings/security',
  method: 'GET',
  path: '/admin/settings/security',
  description: 'Retrieve admin security preferences.',
  successMessage: 'Security settings retrieved.',
  successData: {
    mfaEnabled: true,
    lastPasswordChangeAt: '2025-11-01T10:00:00.000Z',
    loginAlerts: true
  },
  meta: null,
  errorMessage: 'Unable to load security settings.'
});

addRequest(settingsModule, {
  name: 'PUT /admin/settings/security',
  method: 'PUT',
  path: '/admin/settings/security',
  description: 'Update admin security settings including password changes.',
  body: {
    mode: 'raw',
    payload: {
      passwordChange: {
        currentPassword: 'AdminStrongPass!23',
        newPassword: 'NewAdminStrongPass!45'
      },
      loginAlerts: true,
      mfaEnabled: true
    }
  },
  successMessage: 'Security settings updated.',
  successData: {
    mfaEnabled: true,
    loginAlerts: true,
    lastPasswordChangeAt: '2026-02-18T14:40:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to update security settings.'
});

const chatModule = addModule(
  'Admin Chat',
  'Admin real-time chat REST fallbacks.'
);

addRequest(chatModule, {
  name: 'GET /admin/chat/conversations',
  method: 'GET',
  path: '/admin/chat/conversations',
  description: 'List admin chat conversations.',
  query: paginationQuery,
  successMessage: 'Chat conversations retrieved.',
  successData: [
    {
      id: sampleIds.conversationId,
      subject: 'Support escalation',
      participants: [
        { id: sampleIds.adminId, name: 'Stone Admin' },
        { id: sampleIds.userId, name: 'Naomi Briggs' }
      ],
      lastMessageAt: '2026-02-18T14:50:00.000Z',
      unreadCount: 2
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to list chat conversations.'
});

addRequest(chatModule, {
  name: 'GET /admin/chat/messages',
  method: 'GET',
  path: '/admin/chat/messages',
  description: 'Retrieve messages for a conversation.',
  query: [
    { key: 'conversationId', value: sampleIds.conversationId, description: 'Conversation ID' },
    ...paginationQuery
  ],
  successMessage: 'Chat messages retrieved.',
  successData: [
    {
      id: sampleIds.messageId,
      conversationId: sampleIds.conversationId,
      senderId: sampleIds.adminId,
      senderName: 'Stone Admin',
      text: 'Please share the receipt.',
      attachments: [],
      createdAt: '2026-02-18T14:52:00.000Z',
      status: 'delivered'
    }
  ],
  meta: defaultMeta,
  errorMessage: 'Unable to load chat messages.'
});

addRequest(chatModule, {
  name: 'POST /admin/chat/messages',
  method: 'POST',
  path: '/admin/chat/messages',
  description: 'Send a new admin chat message (supports attachments metadata).',
  body: {
    mode: 'raw',
    payload: {
      conversationId: sampleIds.conversationId,
      text: 'Sharing the moderation report with you.',
      attachments: [
        {
          fileName: 'moderation-report.pdf',
          fileType: 'application/pdf',
          fileUrl: 'https://files.stoneacademy.dev/chat/moderation-report.pdf'
        }
      ]
    }
  },
  successMessage: 'Chat message sent.',
  successData: {
    id: sampleIds.messageId,
    conversationId: sampleIds.conversationId,
    status: 'sent',
    createdAt: '2026-02-18T14:55:00.000Z'
  },
  meta: null,
  errorMessage: 'Unable to send chat message.'
});

const collection = {
  info: {
    _postman_id: 'cad5c8c2-aa06-4139-b45e-c04753ac373b',
    name: 'Stone Academy Admin Backend – Admin APIs',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'Postman collection for the Stone Academy Admin Backend covering all protected admin modules.'
  },
  item: modules,
  variable: [
    {
      key: 'baseUrl',
      value: 'http://localhost:4000/api/v1',
      type: 'string'
    },
    {
      key: 'admin_token',
      value: '',
      type: 'string'
    }
  ]
};

fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
console.log(`Postman collection written to ${outputPath}`);
