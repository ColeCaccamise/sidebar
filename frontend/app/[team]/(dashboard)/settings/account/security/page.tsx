'use client';

import { Session } from '@/types';
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
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

  return (
    <>
      <h1>Security & Access</h1>

      <span className="text-lg font-bold">Sessions</span>
      <p>Devices currently logged in to your account</p>

      <div className="flex justify-end">
        <Button variant="unstyled">Log out of all devices</Button>
      </div>

      {sessions?.map((session) => (
        <Button
          variant="unstyled"
          key={session.ip_address}
          className="group flex flex-col gap-2 rounded-lg border border-stroke-weak bg-fill p-4 hover:bg-secondary-fill"
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
                  {session.id === currentSessionId ? (
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm text-typography-weak">
                        Current session
                      </span>
                    </div>
                  ) : null}

                  {session.last_location ? (
                    <>
                      <div className="h-1 w-1 rounded-full bg-typography-muted"></div>
                      <span className="text-sm text-typography-muted">
                        {session.last_location}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end justify-center gap-1">
              <Button
                variant="unstyled"
                className="btn btn-small hidden hover:bg-accent group-hover:block"
              >
                Log out
              </Button>
            </div>
          </div>
        </Button>
      ))}

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
              <Button variant="destructive" className="btn-small">
                Revoke session
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
