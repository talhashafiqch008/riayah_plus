import { client } from './client';

export async function setPasswordFromInvite(email: string, token: string, password: string) {
  const { data } = await client.post<{
    message: string;
    redirectPath?: string;
    role?: string;
  }>('/set-password', { email, token, password });
  return data;
}
