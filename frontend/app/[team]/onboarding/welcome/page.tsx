'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';
import Spinner from '@/components/ui/spinner';
import Button from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import { Team } from '@/types';

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [heading, setHeading] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>('');
  const [buttonLinkText, setButtonLinkText] = useState<string>('');

  function completeOnboarding() {
    api
      .post(`/teams/${teamSlug}/onboarding`, {}, { withCredentials: true })
      .then(() => {
        router.push(`/${teamSlug}`);
      })
      .catch((err) => {
        console.error('Failed to complete onboarding:', err);
      });
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
        .catch(() => {
          setTeam(null);
        })
        .finally(() => {
          setLoading(false);
        });
    };
    getTeam();
  }, [teamSlug, setLoading]);

  useEffect(() => {
    function getOnboardingCopy(step: number) {
      const copy = onboardingCopy[step];
      if (copy) {
        setHeading(copy.heading);
        setDescription(copy.description);
        setButtonText(copy.buttonText);
        setButtonLinkText(copy.buttonLinkText);
      }
    }

    const onboardingCopy = [
      {
        heading: 'Welcome to the dashboard!',
        description: 'Here is where you and your team get shit done.',
        buttonText: 'Continue',
        buttonLinkText: '',
      },
    ];

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
        {onboardingStep > 0 && (
          <div className="flex flex-grow gap-4">
            {onboardingCopy.map((_, index) => (
              <div
                key={index + 1}
                className={`h-2 flex-1 rounded-full ${onboardingStep === index + 1 ? 'bg-brand' : 'bg-brand-secondary'}`}
              ></div>
            ))}
          </div>
        )}
      </div>
      <Logo />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <p>{description}</p>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <Button
          className="btn-brand-secondary w-full"
          handleClick={() => {
            if (onboardingStep + 1 === onboardingCopy.length) {
              completeOnboarding();
            } else {
              updateStep(onboardingStep + 1);
            }
          }}
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
            handleClick={() => {
              updateStep(onboardingStep - 1);
            }}
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
