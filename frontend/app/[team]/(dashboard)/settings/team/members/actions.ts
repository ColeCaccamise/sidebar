'use server';

import api from '@/lib/api';
import { handleApiError } from '@/lib/error';
import { ApiResponse, RawApiResponse } from '@/types';

export async function inviteMembers({
  teamSlug,
  emails,
  role,
}: {
  teamSlug: string;
  emails: string[];
  role: string;
}): Promise<ApiResponse> {
  try {
    const {
      data: { data, code },
    } = await api.post<RawApiResponse>(`/teams/${teamSlug}/invite`, {
      emails,
      role,
    });

    return {
      success: true,
      data,
      code,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function cancelInvites({
  teamSlug,
  teamMemberId,
}: {
  teamSlug: string;
  teamMemberId: string;
}): Promise<ApiResponse> {
  try {
    const {
      data: { data, code },
    } = await api.post<RawApiResponse>(
      `/teams/${teamSlug}/invite/${teamMemberId}/cancel`,
    );

    return {
      success: true,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function resendInvite({
  teamSlug,
  teamMemberId,
}: {
  teamSlug: string;
  teamMemberId: string;
}): Promise<ApiResponse> {
  if (!teamMemberId) {
    return {
      success: false,
      message: 'Team member ID is required',
    };
  }

  try {
    const {
      data: { data, code },
    } = await api.post<RawApiResponse>(
      `/teams/${teamSlug}/invite/${teamMemberId}/resend`,
    );

    return {
      success: true,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function removeMember({
  teamSlug,
  teamMemberId,
}: {
  teamSlug: string;
  teamMemberId: string;
}): Promise<ApiResponse> {
  try {
    const {
      data: { data, code },
    } = await api.delete<RawApiResponse>(
      `/teams/${teamSlug}/members/${teamMemberId}`,
    );

    return {
      success: true,
      data,
      code,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function updateRole({
  teamSlug,
  teamMemberId,
  role,
}: {
  teamSlug: string;
  teamMemberId: string;
  role: string;
}): Promise<ApiResponse> {
  try {
    const {
      data: { data, code },
    } = await api.put<RawApiResponse>(
      `/teams/${teamSlug}/members/${teamMemberId}/role`,
      { role },
    );

    return {
      success: true,
      data,
      code,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function leaveTeam({
  teamSlug,
}: {
  teamSlug: string;
}): Promise<ApiResponse> {
  try {
    const {
      data: { data, code },
    } = await api.delete<RawApiResponse>(`/teams/${teamSlug}/leave`);

    return {
      success: true,
      data,
      code,
    };
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
