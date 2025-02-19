import { cookies } from 'next/headers';
import { getRedis, setRedis } from './redis';
import { parseJwt } from './jwt';
import { WorkspaceMember } from '@/types';
interface User {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  onboarded?: boolean;
  teamCreatedOrJoined?: boolean;
  termsAccepted?: boolean;
  deleted?: boolean;
}

export async function getUser(userId: string): Promise<User> {
  const { data, success, error } = await getRedis({ key: `user:${userId}` });
  if (!success) {
    throw new Error(error);
  }
  return data as User;
}

export async function createUser(userId: string, opts: User): Promise<User> {
  const { data, success, error } = await setRedis({
    key: `user:${userId}`,
    value: opts,
  });
  if (!success) {
    throw new Error(error);
  }
  return data as User;
}

export async function updateUser(userId: string, opts: User): Promise<User> {
  const { data, success, error } = await setRedis({
    key: `user:${userId}`,
    value: opts,
  });
  if (!success) {
    throw new Error(error);
  }
  return data as User;
}

export async function getCurrentUser(): Promise<{
  success: boolean;
  error?: string;
  user?: User;
}> {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  if (!authToken) {
    return { success: false, error: 'No auth token found' };
  }
  const access = parseJwt(authToken);
  const userId = access.sub;

  const { data, success, error } = await getRedis({
    key: `user:${userId}`,
  });
  if (!success) {
    return { success: false, error };
  }
  return { success: true, user: data as User };
}

export async function getCurrentMember(): Promise<{
  success: boolean;
  error?: string;
  member?: WorkspaceMember;
}> {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  if (!authToken) {
    return { success: false, error: 'No auth token found' };
  }
  const access = parseJwt(authToken);
  const userId = access.sub;
  const orgId = access.org_id;
  const { data, success, error } = await getRedis({
    key: `member:${userId}:${orgId}`,
  });
  if (!success) {
    return { success: false, error };
  }
  return { success: true, member: data as WorkspaceMember };
}
