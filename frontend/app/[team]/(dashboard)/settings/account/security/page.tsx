'use client';

import { Session } from '@/types';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  faChrome,
  faFirefoxBrowser,
  faOpera,
  faSafari,
  faEdge,
  faInternetExplorer,
} from '@fortawesome/free-brands-svg-icons';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { useState } from 'react';
import Divider from '@/components/ui/divider';
import { handleLogout, revokeAllSessions, revokeSession } from './actions';

const queryClient = new QueryClient();

function getBrowserIcon(device: string) {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes('chrome')) return faChrome;
  if (deviceLower.includes('firefox')) return faFirefoxBrowser;
  if (deviceLower.includes('opera')) return faOpera;
  if (deviceLower.includes('safari')) return faSafari;
  if (deviceLower.includes('edge')) return faEdge;
  if (deviceLower.includes('internet explorer')) return faInternetExplorer;
  return faGlobe;
}

function SecurityPageContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  // fetch active sessions and current session id
  const { data } = useQuery<{
    sessions: Session[];
    current_session_id: string;
  }>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/auth/sessions');
      return {
        sessions: res.data.data.sessions,
        current_session_id: res.data.data.current_session_id,
      };
    },
  });

  const sessions = data?.sessions;
  const currentSessionId = data?.current_session_id;

  const currentSession = sessions?.find((s) => s.id === currentSessionId);
  const otherSessions = sessions
    ?.filter((s) => s.id !== currentSessionId)
    ?.sort(
      (a, b) =>
        new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
    );

  return (
    <>
      <h1>Security & Access</h1>

      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-bold text-typography-strong">
            Sessions
          </span>
          <p>Devices currently logged in to your account</p>
        </div>

        {currentSession && (
          <Button
            variant="unstyled"
            key={currentSession.id}
            className="group flex flex-col gap-2 rounded-lg border border-stroke-weak bg-fill p-4 hover:bg-secondary-fill"
            handleClick={() => {
              setSelectedSession(currentSession);
              setIsOpen(true);
            }}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-fill">
                  <FontAwesomeIcon
                    icon={getBrowserIcon(currentSession.device)}
                    className="h-5 w-5 text-typography-muted"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currentSession.device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm text-typography-weak">
                        Current session
                      </span>
                    </div>

                    {currentSession.last_location && (
                      <>
                        <div className="h-1 w-1 rounded-full bg-typography-muted"></div>
                        <span className="text-sm text-typography-muted">
                          {currentSession.last_location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="unstyled"
                className="btn-small btn hidden text-sm hover:bg-accent group-hover:block"
                handleClick={async (e) => {
                  e.stopPropagation();
                  await handleLogout();
                }}
              >
                Log out
              </Button>
            </div>
          </Button>
        )}

        {otherSessions && otherSessions.length > 0 && (
          <div className="flex flex-col rounded-lg border border-stroke-weak bg-fill">
            <div className="flex w-full items-center justify-between border-b border-stroke-weak p-4">
              <span className="text-sm font-medium text-typography-strong">
                {otherSessions.length} other session
                {otherSessions.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="unstyled"
                className="btn btn-small rounded-md px-2 py-1 text-sm hover:bg-secondary-fill"
                handleClick={async (e) => {
                  e.stopPropagation();
                  const res = await revokeAllSessions();
                  if (!res.error) {
                    queryClient.setQueryData(['sessions'], (oldData: any) => ({
                      ...oldData,
                      sessions: oldData.sessions.filter(
                        (s: Session) => s.id === currentSessionId,
                      ),
                    }));
                    setSelectedSession(null);
                    setIsOpen(false);
                  } else {
                    console.error(res.code);
                  }
                }}
              >
                Revoke all
              </Button>
            </div>

            <div className="flex flex-col">
              {otherSessions.map((session) => (
                <Button
                  variant="unstyled"
                  key={session.id}
                  className="group flex flex-col gap-2 p-4 hover:bg-secondary-fill"
                  handleClick={() => {
                    setSelectedSession(session);
                    setIsOpen(true);
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-fill">
                        <FontAwesomeIcon
                          icon={getBrowserIcon(session.device)}
                          className="h-5 w-5 text-typography-muted"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.device}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {session.last_location && (
                            <span className="text-sm text-typography-muted">
                              {session.last_location}
                            </span>
                          )}

                          {session.last_seen_at && (
                            <span className="text-sm text-typography-muted">
                              {(() => {
                                const lastSeen = new Date(session.last_seen_at);
                                const now = new Date();
                                const diffMinutes = Math.floor(
                                  (now.getTime() - lastSeen.getTime()) /
                                    (1000 * 60),
                                );
                                const diffHours = Math.floor(diffMinutes / 60);
                                const diffDays = Math.floor(diffHours / 24);
                                const diffWeeks = Math.floor(diffDays / 7);

                                if (diffWeeks > 0) {
                                  return `Last seen ${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
                                }
                                if (diffDays > 0) {
                                  return `Last seen ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                                }
                                if (diffHours > 0) {
                                  return `Last seen ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                                }
                                if (diffMinutes > 0) {
                                  return `Last seen ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
                                }
                                return 'Last seen moments ago';
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-1">
                      <Button
                        variant="unstyled"
                        className="btn btn-small hidden text-sm hover:bg-accent group-hover:block"
                        handleClick={async (e) => {
                          e.stopPropagation();
                          const res = await revokeSession(session.id);
                          if (!res.error) {
                            queryClient.setQueryData(
                              ['sessions'],
                              (oldData: any) => ({
                                ...oldData,
                                sessions: oldData.sessions.filter(
                                  (s: Session) => s.id !== session.id,
                                ),
                              }),
                            );
                            setSelectedSession(null);
                            setIsOpen(false);
                          } else {
                            console.error(res.code);
                          }
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSelectedSession(null);
        }}
        title="Session"
        className="w-full max-w-xl"
      >
        {selectedSession && (
          <div className="flex flex-col items-end gap-8">
            <div className="mt-6 flex w-full flex-col gap-4">
              <div className="flex justify-between">
                <span className="text-typography-strong">Device</span>
                <span className="text-typography-strong">
                  {selectedSession.device}
                </span>
              </div>
              <Divider />

              <div className="flex justify-between">
                <span className="text-typography-strong">IP address</span>
                <span className="text-typography-strong">
                  {selectedSession.ip_address}
                </span>
              </div>
              <Divider />

              <div className="flex justify-between">
                <span className="text-typography-strong">Last location</span>
                {selectedSession.last_location ? (
                  <span className="text-typography-strong">
                    {selectedSession.last_location}
                  </span>
                ) : (
                  <span className="text-typography-muted">Unknown</span>
                )}
              </div>
              <Divider />
              <div className="flex justify-between">
                <span className="text-typography-strong">Original sign in</span>
                <span className="text-typography-strong">
                  {new Date(
                    selectedSession.original_sign_in_at,
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    timeZoneName: 'short',
                  })}
                </span>
              </div>
              <Divider />

              <div className="flex justify-between">
                <span className="text-typography-strong">Method</span>
                {selectedSession.auth_method ? (
                  <span className="text-typography-strong">
                    {selectedSession.auth_method}
                  </span>
                ) : (
                  <span className="text-typography-muted">Unknown</span>
                )}
              </div>
            </div>
            <div>
              <Button
                variant="destructive"
                className="btn-small"
                handleClick={async (e) => {
                  e.stopPropagation();
                  const res = await revokeSession(selectedSession.id);
                  if (!res.error) {
                    queryClient.setQueryData(['sessions'], (oldData: any) => ({
                      ...oldData,
                      sessions: oldData?.sessions?.filter(
                        (s: Session) => s.id !== selectedSession.id,
                      ),
                    }));
                    setSelectedSession(null);
                    setIsOpen(false);
                  } else {
                    console.error(res.code);
                  }
                }}
              >
                {selectedSession.id === currentSessionId
                  ? 'Log out of this device'
                  : 'Revoke session'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function SecurityPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityPageContent />
    </QueryClientProvider>
  );
}
