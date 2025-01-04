'use client';

import axios from 'axios';
import { useParams } from 'next/navigation';
import Logo from '@/components/ui/logo';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CopyIcon,
  Cross2Icon,
  PlusIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Modal from '@/components/ui/modal';
import Divider from '@/components/ui/divider';
import toast from '@/lib/toast';
import api from '@/lib/axios';
import { getErrorMessage } from '@/messages';
import { useRouter } from 'next/navigation';
import { Team } from '@/types';
import Spinner from '@/components/ui/spinner';

const MAX_INVITES = 10;

export default function OnboardingInvitePage() {
  const params = useParams();
  const teamSlug = params.team as string;
  const [inviteLoading, setInviteLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>(['']);
  const [copySuccess, setCopySuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isRotating, setIsRotating] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [hasShownSubmitHint, setHasShownSubmitHint] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize the refs array when emails change
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, emails.length);
  }, [emails.length]);

  // Focus the input when focusIndex changes
  useEffect(() => {
    if (focusIndex !== null && inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]?.focus();
    }
  }, [focusIndex]);

  useEffect(() => {
    // get the current team invite link
    function getInviteLink() {
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSlug}/invite-link`,
          {
            withCredentials: true,
          },
        )
        .then((res) => {
          setInviteLink(res.data.data.inviteLink);
        })
        .catch((err) => {
          console.error('Failed to get invite link:', err);
        });
    }

    getInviteLink();
  }, [teamSlug]);

  const router = useRouter();

  const addEmail = useCallback(() => {
    if (emails.length >= MAX_INVITES) return;
    setEmails((prevEmails) => [...prevEmails, '']);
    setFocusIndex(emails.length);
  }, [emails.length]);

  const removeEmail = useCallback((index: number) => {
    setEmails((prevEmails) => {
      const newEmails = prevEmails.filter((_, i) => i !== index);
      if (newEmails.length === 0) {
        return [''];
      }
      return newEmails;
    });
    // Focus the input above when removing an email
    setFocusIndex(Math.max(0, index - 1));
  }, []);

  const updateEmail = useCallback((index: number, value: string) => {
    setEmails((prevEmails) => {
      const newEmails = [...prevEmails];
      newEmails[index] = value.replace(/\s+/g, '');
      return newEmails;
    });
  }, []);

  const copyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  }, [inviteLink]);

  const refreshInviteLink = useCallback(() => {
    setIsRotating(true);

    // refresh the invite link
    api
      .post(
        `/teams/${teamSlug}/invite-link`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        setInviteLink(res.data.data.inviteLink);
      })
      .catch((err) => {
        console.error('Failed to refresh invite link:', err);
        toast({
          message: 'Failed to refresh invite link.',
          mode: 'error',
        });
      });

    setShowResetDialog(false);
    setTimeout(() => setIsRotating(false), 500);
  }, [teamSlug]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/teams/${teamSlug}`,
          {
            withCredentials: true,
          },
        );
        setTeam(response.data.data);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch team:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [teamSlug]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const validEmails = emails.filter((email) => email.trim());

      setInviteLoading(true);

      await api
        .post(
          `/teams/${teamSlug}/invite`,
          { emails: validEmails, skip_onboarding: false },
          {
            withCredentials: true,
          },
        )
        .then((res) => {
          router.push(res.data.data.redirect_url);
        })
        .catch((err) => {
          toast({
            message: getErrorMessage(err.response.data.code),
            mode: 'error',
          });
        });

      setInviteLoading(false);
    },
    [emails, router, teamSlug],
  );

  const handleEmailChange = useCallback(
    (
      index: number,
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const value = e.target.value;
      const emailList = value.split(/[\s,;]+/).filter(Boolean);

      if (emailList.length > 1) {
        // Handle pasting multiple emails
        setEmails((prevEmails) => {
          const validEmails = emailList.slice(0, MAX_INVITES - index);
          const newEmails = [
            ...prevEmails.slice(0, index),
            ...validEmails,
            ...prevEmails.slice(index + 1),
          ];

          if (newEmails.length < MAX_INVITES) {
            newEmails.push('');
          }

          return newEmails.slice(0, MAX_INVITES);
        });
        setFocusIndex(index + emailList.length);
      } else {
        updateEmail(index, value);
      }
    },
    [updateEmail],
  );

  async function skipOnboarding() {
    await api
      .post(
        `/teams/${teamSlug}/invite`,
        {
          emails: [],
          skip_onboarding: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        },
      )
      .then((res) => {
        router.push(res.data.data.redirect_url);
      })
      .catch((err) => {
        console.error('Failed to skip onboarding:', err);
      });
  }

  const hasEmptyInputs = useCallback(() => {
    // Check all emails except the last one
    return emails.slice(0, -1).some((email) => !email.trim());
  }, [emails]);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if ((e.metaKey || e.ctrlKey) && !hasEmptyInputs() && emails[0]) {
          // Submit form on cmd/ctrl + enter
          const form = e.currentTarget.form;
          if (form) form.requestSubmit();
          return;
        }
        if (!hasShownSubmitHint) {
          const isMac = navigator.platform.toLowerCase().includes('mac');
          toast({
            message: `Tip: Press ${isMac ? '⌘' : 'Ctrl'} + Enter to submit, or Backspace to remove an email.`,
            mode: 'info',
          });
          setHasShownSubmitHint(true);
        }
        if (index === emails.length - 1 && emails.length < MAX_INVITES) {
          addEmail();
        }
      } else if (e.key === ' ' || e.key === ',') {
        e.preventDefault();
        const currentValue = emails[index].trim();
        if (currentValue) {
          if (index === emails.length - 1 && emails.length < MAX_INVITES) {
            setEmails((prevEmails) => {
              const newEmails = [...prevEmails];
              newEmails[index] = currentValue;
              newEmails.push('');
              return newEmails;
            });
            setFocusIndex(index + 1);
          } else if (index < emails.length - 1) {
            setFocusIndex(index + 1);
          }
        }
      } else if (e.key === 'Backspace' && !emails[index]) {
        e.preventDefault();
        if (index === 0 && emails.length > 1 && emails[1].trim()) {
          // If first input is empty and second has content, replace first with second
          setEmails((prevEmails) => {
            const newEmails = [...prevEmails];
            newEmails[0] = newEmails[1];
            return newEmails.filter((_, i) => i !== 1);
          });
          setFocusIndex(0);
        } else if (index > 0) {
          removeEmail(index);
        }
      }
    },
    [addEmail, emails, removeEmail, hasEmptyInputs, hasShownSubmitHint],
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading team</div>;
  if (!team) return <div>Team not found</div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Logo />
        <h1>Invite teammates</h1>
        <p>
          Add your teammates&apos; email addresses to invite them to
          collaborate. You can paste multiple addresses separated by commas or
          spaces.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {emails.map((email, index) => (
            <div key={index} className="flex items-center justify-center gap-2">
              <Input
                ref={(el) => {
                  if (el) {
                    inputRefs.current[index] = el;
                  }
                }}
                placeholder="teammate@company.com"
                type="email"
                value={email}
                handleChange={(e) =>
                  handleEmailChange(
                    index,
                    e as React.ChangeEvent<HTMLInputElement>,
                  )
                }
                handleKeyDown={(e) => handleKeyDown(index, e)}
                autoFocus={focusIndex === index}
              />
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="unstyled"
                  handleClick={() => removeEmail(index)}
                  className="p-0"
                >
                  <Cross2Icon width={16} height={16} />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="unstyled"
          handleClick={addEmail}
          disabled={emails.length >= MAX_INVITES}
          className="flex items-center justify-start gap-2 p-0 text-sm"
        >
          <PlusIcon width={18} height={18} />
          <span>Add another</span>
        </Button>

        <div className="flex flex-col items-start gap-2">
          <Button
            type="submit"
            disabled={!emails[0] || hasEmptyInputs() || inviteLoading}
            className="w-full flex-1"
          >
            {inviteLoading ? (
              <p className="flex items-center justify-center gap-2">
                <Spinner variant="dark" />
                <span className="text-background">Inviting...</span>
              </p>
            ) : emails[0].trim() !== '' ? (
              `Send invites (${emails.length}/${MAX_INVITES})`
            ) : (
              'Enter some emails'
            )}
          </Button>
          <p className="text-center text-xs text-typography-weak">
            {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'ctrl'} +
            enter
          </p>
        </div>
      </form>

      <Divider />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-2 text-left">
          <h2 className="text-lg">Or share invite link</h2>
          <p className="text-sm text-typography-weak">
            Share this link with anyone you want to join your team.
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Input
                    value={inviteLink}
                    readOnly
                    type="text"
                    className="font-mono text-sm"
                    handleClick={(e) => {
                      const input = e.target as HTMLInputElement;
                      input.select();
                      copyInviteLink();
                    }}
                    icon={
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="hover:opacity-70"
                              onClick={() => setShowResetDialog(true)}
                            >
                              <ReloadIcon
                                width={16}
                                height={16}
                                className={`transition-all duration-500 ${isRotating ? 'rotate-[360deg]' : ''}`}
                              />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reset invite link</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[300px] break-all text-xs"
              >
                <p>{inviteLink}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            type="button"
            variant="unstyled"
            handleClick={copyInviteLink}
            className="btn-small btn-brand-secondary flex w-full items-center gap-2 md:w-fit"
          >
            <CopyIcon width={16} height={16} />
            {copySuccess ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="mt-20 flex justify-center">
        <Button
          handleClick={skipOnboarding}
          variant="unstyled"
          className="text-sm"
        >
          Skip for now
        </Button>
      </div>

      <Modal
        open={showResetDialog}
        setOpen={setShowResetDialog}
        title="Reset invite link?"
        showCloseButton={false}
        className="flex flex-col gap-4"
      >
        <p>
          This will expire the current invite link and generate a new one.
          Anyone with the old link won&apos;t be able to join anymore.
        </p>

        <div className="flex gap-4">
          <Button
            className="btn-small btn-brand-secondary text-sm"
            variant="unstyled"
            type="button"
            handleClick={() => setShowResetDialog(false)}
          >
            Cancel
          </Button>
          <Button
            className="btn-small btn-brand text-sm"
            variant="unstyled"
            type="button"
            handleClick={refreshInviteLink}
          >
            Reset Link
          </Button>
        </div>
      </Modal>
    </div>
  );
}
