// Fixed permission registry — not admin-editable. Derived from all existing route guards,
// checklist logic, recipe/cert logic, inventory logic, training logic, and complaint/CX logic.

export const EMPLOYEE_PERMISSIONS = {
  // ── Checklists ─────────────────────────────────────────────────────────────
  'checklist.view':     'View checklist templates and own submissions',
  'checklist.complete': 'Submit and update checklist completions',
  'checklist.approve':  'Approve checklist submissions (elevated employee roles)',

  // ── Recipes / Store Ops ────────────────────────────────────────────────────
  'recipe.view':        'View store recipes and build procedures',
  'recipe.log_prep':    'Log recipe prep times for performance tracking',

  // ── Playbooks ──────────────────────────────────────────────────────────────
  'playbook.view':        'View operational playbooks and SOPs',
  'playbook.acknowledge': 'Mark playbooks as read and acknowledge receipt',

  // ── Performance ────────────────────────────────────────────────────────────
  'performance.view_own': 'View own performance profile and JavaRista score',

  // ── Training / Academy ─────────────────────────────────────────────────────
  'training.view':   'View academy courses and training content',
  'training.enroll': 'Enroll in and progress through courses',
  'training.manage': 'Facilitate training for others (Store Trainer role)',

  // ── Cash Handling ──────────────────────────────────────────────────────────
  'cash.manage': 'Access cash handling procedures and perform cash logs',

  // ── Inventory ──────────────────────────────────────────────────────────────
  'inventory.view':   'View inventory levels and par reports',
  'inventory.manage': 'Submit inventory counts and manage stock',

  // ── Store Operations (General) ─────────────────────────────────────────────
  'store_ops.view': 'Access general store operations dashboard',

  // ── Organisation ───────────────────────────────────────────────────────────
  'org.view': 'View org hierarchy and team structure',
} as const;

export type EmployeePermissionKey = keyof typeof EMPLOYEE_PERMISSIONS;

export const ALL_PERMISSION_KEYS: EmployeePermissionKey[] = Object.keys(
  EMPLOYEE_PERMISSIONS
) as EmployeePermissionKey[];

export const PERMISSION_GROUPS: Record<string, EmployeePermissionKey[]> = {
  Checklists:         ['checklist.view', 'checklist.complete', 'checklist.approve'],
  Recipes:            ['recipe.view', 'recipe.log_prep'],
  Playbooks:          ['playbook.view', 'playbook.acknowledge'],
  Performance:        ['performance.view_own'],
  Training:           ['training.view', 'training.enroll', 'training.manage'],
  Cash:               ['cash.manage'],
  Inventory:          ['inventory.view', 'inventory.manage'],
  'Store Operations': ['store_ops.view'],
  Organisation:       ['org.view'],
};
