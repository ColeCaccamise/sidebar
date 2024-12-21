'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';
import Spinner from '@/components/ui/spinner';
import Image from 'next/image';
import Button from '@/components/ui/button';
import Logo from '@/components/ui/logo';

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLinkText, setButtonLinkText] = useState('');

  const onboardingCopy = [
    {
      heading: 'Welcome to the dashboard!',
      description: 'Here is where you and your team get shit done.',
      buttonText: 'Continue',
      buttonLinkText: '',
    },
    {
      heading: 'Invite your team',
      description:
        'Collaborate with your team members by inviting them to join your workspace.',
      buttonText: 'Invite team members',
      buttonLinkText: 'Skip for now',
    },
    {
      heading: 'Your plan',
      description:
        'Your team is on a 14-day free trial — no credit card required. You can upgrade after the trial ends (or anytime before).',
      buttonText: 'Upgrade now',
      buttonLinkText: 'Take me to the dashboard',
    },
  ];

  function getOnboardingCopy(step: number) {
    const copy = onboardingCopy[step];
    if (copy) {
      setHeading(copy.heading);
      setDescription(copy.description);
      setButtonText(copy.buttonText);
      setButtonLinkText(copy.buttonLinkText);
    }
  }

  // get team slug from url params
  const teamSlug = params.team as string;

  // get team
  useEffect(() => {
    const getTeam = () => {
      api
        .get(`/teams/${teamSlug}`, {
          withCredentials: true,
        })
        .then((res) => {
          setTeam(res.data.data.team);
          setLoading(false);
        })
        .catch((err) => {
          setTeam(null);
        })
        .finally(() => {
          setLoading(false);
        });
    };
    getTeam();
  }, [teamSlug]);

  useEffect(() => {
    getOnboardingCopy(onboardingStep);
  }, [onboardingStep]);

  const updateStep = (step: number) => {
    setOnboardingStep(step);
  };

  if (loading) {
    return <Spinner />;
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  return (
    <div className="flex max-w-md flex-col items-center gap-8 text-center">
      <div className="flex w-full justify-start">
        <div className="flex flex-grow gap-4">
          {onboardingCopy.map((_, index) => (
            <div
              key={index + 1}
              className={`h-2 flex-1 rounded-full ${onboardingStep === index + 1 ? 'bg-brand' : 'bg-brand-secondary'}`}
            ></div>
          ))}
        </div>
      </div>
      <Logo />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p>{description}</p>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <Button
          className="btn-brand-secondary w-full"
          handleClick={() => updateStep(onboardingStep + 1)}
        >
          {buttonText}
        </Button>
        <Button variant="unstyled" className="">
          {buttonLinkText}
        </Button>
      </div>

      <div className="mt-10 flex w-full justify-start">
        {onboardingStep > 0 && (
          <Button
            handleClick={() => updateStep(onboardingStep - 1)}
            variant="unstyled"
            className="text-sm"
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
