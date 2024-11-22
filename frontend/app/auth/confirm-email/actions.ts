'use server';

import axios from 'axios';
import { cookies } from 'next/headers';

export async function handleResendEmail() {
	'use server';
	const cookieStore = cookies();
	const authToken = cookieStore.get('auth-token')?.value;
	console.log(`auth-token=${authToken}`);

	try {
		const response = await axios.post(
			`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-email`,
			{},
			{
				withCredentials: true,
				headers: {
					Cookie: `auth-token=${cookies().get('auth-token')?.value}`,
				},
			}
		);
		return response.data;
	} catch (error) {
		throw error;
	}
}
