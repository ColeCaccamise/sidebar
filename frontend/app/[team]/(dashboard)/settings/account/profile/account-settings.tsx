'use client';

import Input from '@/components/ui/input';
import SettingsBox from '@/components/ui/settings-box';
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { User } from '@/types';
import Spinner from '@/components/ui/spinner';
import {
  resendUpdateEmailConfirmation,
  updateUser,
  updateUserEmail,
  verifyPassword,
  uploadAvatar,
  deleteAvatar,
  deleteAccount,
} from './actions';
import { Button } from '@/components/ui/button';
import toast from '@/lib/toast';
import Modal from '@/components/ui/modal';
import AvatarUploader from '@/components/ui/avatar-uploader';
import { useSearchParams } from 'next/navigation';
import { getErrorMessage, getResponseMessage } from '@/messages';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AsteriskIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatar, setAvatar] = useState<File | undefined>(undefined);
  const [editingEmail, setEditingEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerifyLoading, setPasswordVerifyLoading] = useState(false);
  const [canUpdateEmail, setCanUpdateEmail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const emailForm = useRef<HTMLFormElement>(null);

  const [userValues, setUserValues] = useState<{
    firstName?: { initial: string; current: string };
    lastName?: { initial: string; current: string };
    email?: { initial: string; current: string };
    updatedEmail?: string;
    avatar?: { initial: string; current: string };
  }>({});

  const [deleteAccountValues, setDeleteAccountValues] = useState<{
    reason: string;
    otherReason: string;
    step: number;
    email: string;
    submitText: string;
    cancelText: string;
    isLoading: boolean;
  }>({
    reason: '',
    otherReason: '',
    step: 0,
    email: '',
    submitText: 'Continue with deletion',
    cancelText: 'Keep account',
    isLoading: false,
  });

  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const router = useRouter();

  const getUser = useCallback(async () => {
    console.log('get user 76');
    const userResponse: User | null = await axios
      .get(`${apiUrl}/auth/identity`, {
        withCredentials: true,
      })
      .then((response) => {
        return response.data.data.user;
      })
      .catch((error) => console.error(error));

    setUser(userResponse);

    console.log(userResponse);

    setUserValues({
      firstName: {
        initial: userResponse?.first_name || '',
        current: userResponse?.first_name || '',
      },
      lastName: {
        initial: userResponse?.last_name || '',
        current: userResponse?.last_name || '',
      },
      email: {
        initial: userResponse?.email || '',
        current: userResponse?.email || '',
      },
      updatedEmail: userResponse?.updated_email || '',
      avatar: {
        initial: userResponse?.avatar_url || '',
        current: userResponse?.avatar_url || '',
      },
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getUser().then(() => {
      setIsLoading(false);
    });
  }, [getUser]);

  useEffect(() => {
    if (!editingEmail) {
      setUserValues((prev) => ({
        ...prev,
        email: {
          initial: prev.email?.initial || '',
          current: prev.email?.initial || '',
        },
      }));
    }
  }, [editingEmail]);

  useEffect(() => {
    if (message) {
      toast({
        message: getResponseMessage(message),
        mode: 'success',
      });

      // Remove message query param
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url);
    }
  }, [message]);

  async function updateEmail() {
    try {
      const res = await updateUserEmail({
        user,
        email: userValues.email?.current || '',
      }).then((res) => res);

      console.log(res);

      if (res.error) {
        setUserValues((prev) => ({
          ...prev,
          email: {
            initial: prev.email?.initial || '',
            current: prev.email?.initial || '',
          },
        }));

        toast({
          message: getErrorMessage(res.code) || 'Something went wrong',
          mode: 'error',
        });
        return;
      }

      setCanUpdateEmail(false);

      setUserValues((prev) => ({
        ...prev,
        updatedEmail: res.data.updated_email || '',
        email: {
          initial: res.data.email || '',
          current: res.data.email || '',
        },
      }));

      toast({
        message: 'Email updated',
        description: 'Please check your email for a confirmation link.',
        mode: 'success',
      });
    } catch (error) {
      console.error('Error updating email:', error);
      setCanUpdateEmail(false);
      toast({
        message: 'Something went wrong',
        mode: 'error',
      });
    }
  }

  if (isLoading) return <Spinner />;

  return (
    <>
      <h1>Profile</h1>
      <div className="flex w-full flex-col items-center gap-8 pb-8">
        <SettingsBox
          title="Your Name"
          description="This will be your display name in the dashboard."
          note="Max 32 characters."
          onSettingSubmit={async () => {
            const { data, success } = await updateUser({
              user,
              firstName: userValues.firstName?.current,
              lastName: userValues.lastName?.current,
            });

            if (!success) {
              toast({
                message: 'Something went wrong',
                mode: 'error',
              });
              return;
            }

            type UserData = {
              first_name: string;
              last_name: string;
            };

            setUserValues((prev) => ({
              ...prev,
              firstName: {
                initial: (data as UserData).first_name || '',
                current: (data as UserData).first_name || '',
              },
              lastName: {
                initial: (data as UserData).last_name || '',
                current: (data as UserData).last_name || '',
              },
            }));

            toast({
              message: 'Profile updated',
              mode: 'success',
            });
          }}
          disabled={
            userValues.firstName?.initial === userValues.firstName?.current &&
            userValues.lastName?.initial === userValues.lastName?.current
          }
        >
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="First Name"
              value={userValues.firstName?.current}
              handleChange={(e) =>
                setUserValues((prev) => ({
                  ...prev,
                  firstName: {
                    initial: prev.firstName?.initial || '',
                    current: e.target.value,
                  },
                }))
              }
            />
            <Input
              type="text"
              placeholder="Last Name"
              value={userValues.lastName?.current}
              handleChange={(e) =>
                setUserValues((prev) => ({
                  ...prev,
                  lastName: {
                    initial: prev.lastName?.initial || '',
                    current: e.target.value,
                  },
                }))
              }
            />
          </div>
        </SettingsBox>
        <SettingsBox
          title="Your Email"
          description="This will be the email you use to log in to your dashboard and receive notifications."
          ref={emailForm}
          showSubmitButton={false}
          onSettingSubmit={async () => {
            if (canUpdateEmail) {
              await updateEmail();
            } else {
              if (editingEmail) {
                setEditingEmail(false);
              } else {
                setEditingEmail(true);
              }
            }
          }}
          note={
            userValues.updatedEmail &&
            userValues.email?.initial !== userValues.updatedEmail ? (
              <span className="text-sm">
                To update your email, click the confirmation link we sent to{' '}
                <strong>{userValues.updatedEmail}</strong>.{' '}
                <Button
                  className="underline"
                  variant="link"
                  onClick={() =>
                    resendUpdateEmailConfirmation({ user }).then(() => {
                      toast({
                        message: 'Email sent',
                        description:
                          'Please check your email for a confirmation link.',
                        mode: 'success',
                      });
                    })
                  }
                >
                  Resend
                </Button>
              </span>
            ) : (
              <span>
                If you&apos;d like to change your email,{' '}
                <Link href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}>
                  contact us
                </Link>
              </span>
            )
          }
          disabled={
            userValues.email?.initial === userValues.email?.current ||
            userValues.email?.current === userValues.updatedEmail
          }
        >
          <Modal
            title="Confirm your password"
            open={editingEmail}
            setOpen={setEditingEmail}
            onClose={() => {
              setEditingEmail(false);
              setPassword('');
            }}
          >
            <p className="text-sm">
              Before you can update your email, please type in your password.
            </p>
            <form
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setPasswordVerifyLoading(true);

                try {
                  const res = await verifyPassword({
                    password: password || '',
                  });

                  if (res.error) {
                    setPassword('');
                    toast({ message: 'Invalid password', mode: 'error' });
                    setCanUpdateEmail(false);
                    return;
                  }

                  setEditingEmail(false);
                  setPassword('');
                  setCanUpdateEmail(true);

                  await updateEmail();
                } catch (error) {
                  console.log(error);
                  setPassword('');
                  toast({
                    message: 'An error occurred verifying your password',
                    mode: 'error',
                  });
                } finally {
                  setPasswordVerifyLoading(false);
                }
              }}
            >
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                handleChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={password.length === 0 || passwordVerifyLoading}
                loading={passwordVerifyLoading}
              >
                Confirm
              </Button>
            </form>
          </Modal>
          <Input
            type="email"
            placeholder="Email"
            disabled
            value={userValues.email?.current}
            handleChange={(e) =>
              setUserValues((prev) => ({
                ...prev,
                email: {
                  initial: prev.email?.initial || '',
                  current: e.target.value,
                },
              }))
            }
          />
        </SettingsBox>
        <SettingsBox
          title="Your Avatar"
          description="This is your avatar in the dashboard."
          onSettingSubmit={async () => {
            const formData = new FormData();
            formData.append('avatar', avatar || '');
            const { data, success, code } = await uploadAvatar({
              user,
              formData,
            });

            if (!success) {
              toast({
                message: code
                  ? getErrorMessage(code)
                  : 'There was a problem updating your avatar.',
                mode: 'error',
              });
              return;
            }

            setUserValues((prev) => ({
              ...prev,
              avatar: {
                initial: data?.location,
                current: data?.location,
              },
            }));

            toast({
              message: 'Avatar updated.',
              mode: 'success',
            });
          }}
          disabled={
            !avatar || userValues.avatar?.initial === userValues.avatar?.current
          }
          note="Square image recommended. Accepted file types: .png, .jpg. Max file size: 2MB."
        >
          <div className="flex pt-2">
            <AvatarUploader
              handleChange={(e) => {
                setAvatar(e);
                setUserValues((prev) => ({
                  ...prev,
                  avatar: {
                    initial: prev.avatar?.initial || '',
                    current: URL.createObjectURL(e),
                  },
                }));
              }}
              initialAvatar={userValues.avatar?.initial || ''}
              handleDelete={async () => {
                if (userValues.avatar?.initial) {
                  await deleteAvatar()
                    .then((res) => {
                      if (res == null) {
                        toast({ message: 'Avatar deleted.', mode: 'success' });

                        setUserValues((prev) => ({
                          ...prev,
                          avatar: {
                            initial: '',
                            current: '',
                          },
                        }));
                      } else {
                        toast({
                          message: 'There was a problem deleting your avatar.',
                          mode: 'error',
                        });
                      }
                    })
                    .catch(() => {
                      toast({
                        message: 'There was a problem deleting your avatar.',
                        mode: 'error',
                      });
                    });
                } else {
                  setUserValues((prev) => ({
                    ...prev,
                    avatar: {
                      initial: '',
                      current: '',
                    },
                  }));
                }
              }}
            />
          </div>
        </SettingsBox>

        <SettingsBox
          submitText="Delete Account"
          disabled={false}
          variant="destructive"
          title="Delete Account"
          description="Permanently delete your account and all associated data. This action cannot be undone - please proceed with caution."
          onSettingSubmit={async () => {
            setShowDeleteModal(true);
          }}
        >
          <Modal
            title="Delete your account?"
            submitText={deleteAccountValues.submitText}
            cancelText={deleteAccountValues.cancelText}
            open={showDeleteModal}
            setOpen={setShowDeleteModal}
            isLoading={deleteAccountValues.isLoading}
            onClose={() => {
              setShowDeleteModal(false);
              setDeleteAccountValues((prev) => ({
                ...prev,
                reason: '',
                otherReason: '',
                step: 0,
                email: '',
              }));
            }}
            handleSubmit={() => {
              setDeleteAccountValues((prev) => ({
                ...prev,
                step: prev.step + 1,
              }));
            }}
            className="w-full max-w-2xl"
            currentStep={deleteAccountValues.step}
            steps={[
              {
                title: 'Delete your account?',
                children: (
                  <p>
                    This action will result in the immediate loss of access to
                    the Dashboard and the permanent removal of your account data
                    across all workspaces or organizations you are associated
                    with. There will be no option for recovery.
                  </p>
                ),
                handleSubmit: () => {
                  setDeleteAccountValues((prev) => ({
                    ...prev,
                    step: 1,
                  }));
                },
              },
              {
                title: 'Delete your account?',
                children: (
                  <div className="flex flex-col gap-4">
                    <p className="flex items-center gap-1 text-sm">
                      Please share why you are deleting your account{' '}
                      <AsteriskIcon className="h-3 w-3 text-error" />
                    </p>
                    <RadioGroup
                      value={deleteAccountValues.reason}
                      onValueChange={(value) =>
                        setDeleteAccountValues((prev) => ({
                          ...prev,
                          reason: value,
                        }))
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no-data" id="no-data" />
                        <Label htmlFor="no-data">
                          I no longer want Dashboard to have my data
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="start-over" id="start-over" />
                        <Label htmlFor="start-over">
                          I want to clear my data and start over
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="better-tool" id="better-tool" />
                        <Label htmlFor="better-tool">
                          I found another tool that better suits my needs
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="no-longer-using"
                          id="no-longer-using"
                        />
                        <Label htmlFor="no-longer-using">
                          I am no longer using Dashboard
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="too-expensive"
                          id="too-expensive"
                        />
                        <Label htmlFor="too-expensive">
                          The features I need are too expensive
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="missing-features"
                          id="missing-features"
                        />
                        <Label htmlFor="missing-features">
                          Dashboard lacks certain features I need
                        </Label>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="other" id="other" />
                          <Label htmlFor="other">Other</Label>
                        </div>
                        {deleteAccountValues.reason === 'other' && (
                          <div className="py-2 pl-6">
                            <Input
                              variant="textarea"
                              type="textarea"
                              placeholder="Please tell us more..."
                              value={deleteAccountValues.otherReason}
                              handleChange={(e) =>
                                setDeleteAccountValues((prev) => ({
                                  ...prev,
                                  otherReason: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                ),
                handleSubmit: () => {
                  setDeleteAccountValues((prev) => ({
                    ...prev,
                    step: prev.step + 1,
                    submitText: 'Delete account',
                  }));
                },
                handleBack: () => {
                  setDeleteAccountValues((prev) => ({
                    ...prev,
                    step: 0,
                  }));
                },
                disabled:
                  deleteAccountValues.reason === '' ||
                  (deleteAccountValues.reason === 'other' &&
                    deleteAccountValues.otherReason === ''),
              },
              {
                title: 'Delete your account?',
                handleSubmit: async () => {
                  setDeleteAccountValues((prev) => ({
                    ...prev,
                    isLoading: true,
                    submitText: 'Deleting account...',
                  }));
                  const resp = await deleteAccount({
                    email: deleteAccountValues.email,
                    reason: deleteAccountValues.reason,
                    otherReason: deleteAccountValues.otherReason,
                  });

                  setDeleteAccountValues((prev) => ({
                    ...prev,
                    isLoading: false,
                    submitText: 'Delete account',
                  }));

                  if (resp.error) {
                    toast({
                      message:
                        getErrorMessage(resp.code || '') ||
                        'Something went wrong',
                      mode: 'error',
                    });
                  }
                },
                disabled:
                  deleteAccountValues.email !== userValues.email?.current,
                handleBack: () => {
                  setDeleteAccountValues((prev) => ({
                    ...prev,
                    step: 1,
                  }));
                },
                children: (
                  <form
                    className="flex flex-col gap-4"
                    onSubmit={async (e) => {
                      e.preventDefault();

                      const resp = await deleteAccount({
                        email: deleteAccountValues.email,
                        reason: deleteAccountValues.reason,
                        otherReason: deleteAccountValues.otherReason,
                      });

                      if (resp.error) {
                        toast({
                          message:
                            getErrorMessage(resp.code || '') ||
                            'Something went wrong',
                          mode: 'error',
                        });
                      } else {
                        router.push('/');
                      }
                    }}
                  >
                    <p>
                      Deleting your account is permanent and cannot be undone.
                      You will permanently lose data for all teams you are
                      associated with.
                    </p>
                    <p>To delete your account, type your email.</p>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={deleteAccountValues.email}
                      handleChange={(e) =>
                        setDeleteAccountValues((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </form>
                ),
              },
            ]}
          >
            <form
              className="flex flex-col gap-4 py-2"
              onSubmit={async (e) => {
                e.preventDefault();

                const resp = await deleteAccount({
                  email: deleteAccountValues.email,
                  reason: deleteAccountValues.reason,
                  otherReason: deleteAccountValues.otherReason,
                });

                if (resp.error) {
                  toast({
                    message:
                      getErrorMessage(resp.code || '') ||
                      'Something went wrong',
                    mode: 'error',
                  });
                }
              }}
            >
              <p>
                This will permanently delete your account and all associated
                data. This action cannot be undone.
              </p>
              <Input
                type="password"
                placeholder="Enter your password"
                label="Confirm password"
                value={deletePassword}
                handleChange={(e) => setDeletePassword(e.target.value)}
              />
              <Button
                disabled={deletePassword.length === 0}
                type="submit"
                className="w-full"
                variant="destructive"
              >
                Request Permanent Account Deletion
              </Button>
              <span className="text-low-contrast-text text-sm">
                This will delete your account and all associated data.
              </span>
            </form>
          </Modal>
        </SettingsBox>
      </div>
    </>
  );
}
