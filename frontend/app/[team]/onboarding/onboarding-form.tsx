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
  workspace?: Workspace;
}

export default function OnboardingForm({ workspace }: OnboardingFormProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1>Onboarding</h1>
    </div>
  );
}
