// ── Zod schemas — domain models ──────────────────────────

export {
  BranchSchema,
  EmployeeSchema,
  CustomerSchema,
  MenuProductSchema,
  OrderSchema,
  AttendanceSchema,
  AgentTaskSchema,
  parse,
} from './src/schemas';

export type {
  Branch,
  Employee,
  Customer,
  MenuProduct,
  Order,
  Attendance,
  AgentTask,
} from './src/schemas';

// ── Simple validators — return { valid: boolean, error: string | null } ──

interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function isEmail(value: string): ValidationResult;
export function isPhone(value: string): ValidationResult;
export function isTime(value: string): ValidationResult;
export function isValidTimeRange(start: string, end: string): ValidationResult;
export function isLatitude(value: string): ValidationResult;
export function isLongitude(value: string): ValidationResult;
export function isPositiveNumber(value: string | number, label?: string): ValidationResult;
export function isNonNegativeNumber(value: string | number, label?: string): ValidationResult;
export function isPositiveInt(value: string | number, label?: string): ValidationResult;
export function isRequired(value: string, label?: string): ValidationResult;
export function isDNI(value: string): ValidationResult;
export function isFutureDate(dateStr: string, label?: string): ValidationResult;
