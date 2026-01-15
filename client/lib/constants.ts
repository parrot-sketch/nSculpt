// Application Constants
export const APP_NAME = 'Nairobi Sculpt';
export const APP_SUBTITLE = 'Surgical EHR & Inventory System';

// Brand Colors
export const COLORS = {
  primary: '#17a2b8',
  primaryDark: '#138496',
  primaryLight: '#1fc8e3',
  accent: '#c59f22',
  accentDark: '#a0821a',
  accentLight: '#e0b84d',
  gold: '#ffd700',
  white: '#ffffff',
} as const;

// Roles (from backend)
export const ROLES = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  SURGEON: 'SURGEON',
  NURSE: 'NURSE',
  THEATER_MANAGER: 'THEATER_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  BILLING: 'BILLING',
  FRONT_DESK: 'FRONT_DESK',
  PATIENT: 'PATIENT',
} as const;

// Permission Domains
export const PERMISSION_DOMAINS = {
  MEDICAL_RECORDS: 'medical_records',
  PATIENTS: 'patients',
  THEATER: 'theater',
  INVENTORY: 'inventory',
  BILLING: 'billing',
  CONSENT: 'consent',
  AUDIT: 'audit',
} as const;

// Permission Actions
export const PERMISSION_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  APPROVE: 'approve',
  BOOK: 'book',
  MANAGE: 'manage',
} as const;

// Routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PATIENTS: '/patients',
  THEATER: '/theater',
  INVENTORY: '/inventory',
  BILLING: '/billing',
  CONSENT: '/consent',
  SETTINGS: '/settings',
  DOCTOR_DASHBOARD: '/doctor',
  // Department Dashboards
  FRONT_DESK_DASHBOARD: '/frontdesk',
  NURSING_DASHBOARD: '/nursing',
  THEATER_DASHBOARD: '/theater-manager',
  CLEANING_DASHBOARD: '/cleaning',

  // Admin routes
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_PERMISSIONS: '/admin/permissions',
  // System Configuration
  ADMIN_DEPARTMENTS: '/admin/system-config/departments',
  ADMIN_THEATERS: '/admin/system-config/theaters',
  ADMIN_CATEGORIES: '/admin/system-config/categories',
  ADMIN_VENDORS: '/admin/system-config/vendors',
  ADMIN_BILLING_CODES: '/admin/system-config/billing-codes',
  ADMIN_INSURANCE_PROVIDERS: '/admin/system-config/insurance-providers',
  ADMIN_FEE_SCHEDULES: '/admin/system-config/fee-schedules',
  ADMIN_CONSENT_TEMPLATES: '/admin/system-config/consent-templates',
  // Audit & Compliance
  ADMIN_ACCESS_LOGS: '/admin/audit/access-logs',
  ADMIN_DOMAIN_EVENTS: '/admin/audit/domain-events',
  ADMIN_SESSIONS: '/admin/audit/sessions',
  ADMIN_HIPAA_REPORTS: '/admin/audit/hipaa-reports',
  // Cross-Domain Admin
  ADMIN_MERGE_RECORDS: '/admin/medical-records/merge',
  ADMIN_SYSTEM_HEALTH: '/admin/system-health',
  // Reports
  ADMIN_USER_ACTIVITY_REPORT: '/admin/reports/user-activity',
  ADMIN_PERMISSION_USAGE_REPORT: '/admin/reports/permission-usage',
} as const;

// Storage Keys (use sessionStorage for security)
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

