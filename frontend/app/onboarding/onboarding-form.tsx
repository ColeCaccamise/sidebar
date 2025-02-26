'use client';

import { User, Workspace } from '@/types';
import api from '@/lib/axios';
import { useState, useEffect } from 'react';
import { getErrorMessage, getResponseMessage } from '@/messages';
import toast from '@/lib/toast';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import Spinner from '@/components/ui/spinner';
import Input from '@/components/ui/input';
import router from 'next/router';

interface OnboardingFormProps {
  user: User;
  workspace?: Workspace;
}

export default function OnboardingForm({
  user,
  workspace,
}: OnboardingFormProps) {
  const [userData, setUserData] = useState(user);
  const [workspaceData, setWorkspaceData] = useState(workspace);

  const termsAccepted = userData.terms_accepted;
  const workspaceCreatedOrJoined = userData.workspace_created_or_joined;

  if (!termsAccepted) {
    return <TermsForm user={userData} setUser={setUserData} />;
  }

  if (!workspaceCreatedOrJoined) {
    return <WorkspaceForm user={userData} setUser={setUserData} />;
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1>Onboarding</h1>
    </div>
  );
}

interface TermsFormProps {
  user: User;
  setUser: (user: User) => void;
}

function TermsForm({ user, setUser }: TermsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleAgree() {
    setAgreed(true);
    setIsLoading(true);

    await api
      .post(
        '/users/accept-terms',
        {
          terms_accepted: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        toast({
          message: getResponseMessage(res?.data?.code),
          mode: 'success',
        });
        setUser({ ...user, terms_accepted: true });
      })
      .catch((err) => {
        setAgreed(false);
        toast({
          message: getErrorMessage(err.response?.data?.code),
          mode: 'error',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <div className="flex max-w-md flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1>Terms of Service & Privacy Policy</h1>
        <p>
          By clicking below and continuing you agree that you&apos;e read and
          accepted our <Link href="/legal/terms">Terms of Service</Link> &{' '}
          <Link href="/legal/privacy">Privacy Policy</Link>.
        </p>
      </div>
      <Button
        className="w-full"
        onClick={handleAgree}
        disabled={isLoading || agreed}
      >
        <div className="flex items-center gap-2">
          {isLoading && <Spinner variant="light" />}
          {isLoading ? 'Agreeing...' : agreed ? 'Agreed' : 'Agree and continue'}
        </div>
      </Button>

      <p>{JSON.stringify(user)}</p>
    </div>
  );
}

interface WorkspaceFormProps {
  user: User;
  setUser: (user: User) => void;
}

function WorkspaceForm({ user, setUser }: WorkspaceFormProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreateWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (workspaceName.length < 3) {
      toast({
        message: 'Workspace name must be at least 3 characters long',
        mode: 'error',
      });
      return;
    } else if (workspaceName.length > 32) {
      toast({
        message: 'Workspace name must be at most 32 characters long',
        mode: 'error',
      });
      return;
    }

    setLoading(true);

    await api
      .post(
        '/teams',
        {
          name: workspaceName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        toast({
          message: getResponseMessage(res.data.code),
          mode: 'success',
        });
        setUser({
          ...user,
          workspace_created_or_joined: true,
          onboarded: true,
        });

        const orgId = res.data.data.org_id;

        api.get(`/auth/refresh?org_id=${orgId}`);

        router.push(`/${workspaceName}/onboarding`);
      })
      .catch((err) => {
        toast({
          message: getErrorMessage(err.response.data.code),
          mode: 'error',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1>Create Workspace</h1>
          <p>
            Create a new workspace to get started. This is where everything
            happens.
          </p>
        </div>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleCreateWorkspace}>
        <Input
          label="Workspace name"
          placeholder='E.g. "Your company"'
          value={workspaceName}
          handleChange={(e) => setWorkspaceName(e.target.value)}
          type="text"
        />

        <Button
          type="submit"
          disabled={!workspaceName || loading}
          className="w-full"
        >
          {loading ? (
            <p className="flex items-center gap-2">
              <Spinner variant="dark" />
              <span className="text-background">Creating...</span>
            </p>
          ) : (
            'Create'
          )}
        </Button>
      </form>
    </div>
  );
}
