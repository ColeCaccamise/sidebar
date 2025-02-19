import { User } from '@/types';
import { getRedis, setRedis } from './redis';
import { parseJwt } from './jwt';
import { cookies } from 'next/headers';

interface Workspace {
  id?: string;
  name?: string;
  slug?: string;
  deleted?: boolean;
  subscriptionTier?: string | null;
  subscriptionId?: string;
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

export async function getCurrentWorkspace(): Promise<{
  success: boolean;
  error?: string;
  workspace?: Workspace;
}> {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  if (!authToken) {
    return { success: false, error: 'No auth token found' };
  }
  const access = parseJwt(authToken);
  const orgId = access.org_id;

  const { data, success, error } = await getRedis({
    key: `workspace:${orgId}`,
  });
  if (!success) {
    return { success: false, error };
  }
  return { success: true, workspace: data as Workspace };
}
