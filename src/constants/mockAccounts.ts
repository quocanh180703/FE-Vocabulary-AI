import type { User } from '../api';

export interface MockTestAccount {
  id: 'student' | 'instructor' | 'admin';
  label: string;
  roleBadge: string;
  description: string;
  password: string;
  landingRoute: string;
  user: User;
}

/**
 * 3 tài khoản Mock cho 3 role (STUDENT / INSTRUCTOR / ADMIN)
 * Dùng để test UI trực tiếp không cần bật Backend.
 */
export const MOCK_TEST_ACCOUNTS: MockTestAccount[] = [
  {
    id: 'student',
    label: 'Học viên',
    roleBadge: 'STUDENT',
    description: 'Không gian học: Dashboard, SRS, Quiz, Speaking, States Lab',
    password: '123456',
    landingRoute: '/dashboard',
    user: {
      id: 101,
      email: 'student@vocab.ai',
      username: 'student_demo',
      fullName: 'Minh Anh (Học viên)',
      role: 'STUDENT',
      status: 'ACTIVE',
      emailRemindersEnabled: true,
      createdAt: '2026-01-15T08:00:00Z',
      provider: 'MOCK',
    },
  },
  {
    id: 'instructor',
    label: 'Giảng viên',
    roleBadge: 'INSTRUCTOR',
    description: 'Cổng Giảng viên: Báo cáo, Kho từ, Quiz, Duyệt nội dung',
    password: '123456',
    landingRoute: '/admin/reports',
    user: {
      id: 202,
      email: 'instructor@vocab.ai',
      username: 'instructor_demo',
      fullName: 'Cô Lan (Giảng viên)',
      role: 'INSTRUCTOR',
      status: 'ACTIVE',
      emailRemindersEnabled: true,
      createdAt: '2025-11-01T08:00:00Z',
      provider: 'MOCK',
    },
  },
  {
    id: 'admin',
    label: 'Quản trị viên',
    roleBadge: 'ADMIN',
    description: 'Toàn quyền Admin Portal: Tổng quan, Đơn PayOS, AI Admin',
    password: '123456',
    landingRoute: '/admin',
    user: {
      id: 303,
      email: 'admin@vocab.ai',
      username: 'admin_demo',
      fullName: 'Nguyễn Quản Trị (Admin)',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailRemindersEnabled: true,
      createdAt: '2025-09-01T08:00:00Z',
      provider: 'MOCK',
    },
  },
];

export function findMockAccount(emailOrUsername: string, password: string): MockTestAccount | undefined {
  const key = emailOrUsername.trim().toLowerCase();
  if (!key) return undefined;
  return MOCK_TEST_ACCOUNTS.find(
    (acc) =>
      (acc.user.email.toLowerCase() === key || acc.user.username.toLowerCase() === key) &&
      password === acc.password
  );
}
