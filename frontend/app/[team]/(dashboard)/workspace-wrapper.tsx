import { notFound } from 'next/navigation';
import WorkspaceContainer from './workspace-container';
import { getCurrentWorkspace } from '@/lib/workspace';
import { Workspace } from '@/types';

export default async function WorkspaceWrapper({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { team: string };
}) {
  const { workspace, success } = await getCurrentWorkspace();
  if (!success) {
    notFound();
  }

  return (
    <WorkspaceContainer slug={params.team} workspace={workspace as Workspace}>
      {children}
    </WorkspaceContainer>
  );
}
