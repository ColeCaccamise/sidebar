import Modal from '@/components/ui/modal';
import { useState } from 'react';
import { TeamMemberResponse } from '@/types';
import { inviteMembers } from '../actions';
import { getErrorMessage } from '@/messages';
import toast from '@/lib/toast';
import { isValidEmail } from '@/lib/validation';
import Input from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function InviteMemberModal({
  isOpen,
  onClose,
  teamSlug,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  teamSlug: string;
  onSuccess: (newMembers: TeamMemberResponse[]) => void;
}) {
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('member');

  async function handleSubmit() {
    const emailsArray = emails.split(/[\s,]+/);
    const validEmails = emailsArray.filter((email) => email.trim().length > 0);

    if (validEmails.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    const invalidEmails = validEmails.filter((email) => !isValidEmail(email));

    if (invalidEmails.length > 0) {
      setError(
        `Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`,
      );
      return;
    }

    setError('');
    onClose();

    const resp = await inviteMembers({
      teamSlug,
      emails: validEmails,
      role,
    });

    if (resp?.success) {
      onSuccess(resp.data.invites);

      toast({
        message: 'Invites sent.',
        mode: 'success',
      });
    } else {
      toast({
        message: getErrorMessage(resp.code || ''),
        mode: 'error',
      });
    }

    setEmails('');
    setRole('member');
    setError('');
    onClose();
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Invite to your team"
      handleSubmit={handleSubmit}
      submitText="Send invites"
      className="w-full max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <p>
          Enter email addresses, separated by commas or spaces, to invite team
          members
        </p>
        <Input
          variant="textarea"
          placeholder="email1@company.com, email2@company.com, email3@company.com"
          value={emails}
          handleChange={(e) => setEmails(e.target.value)}
        />
        {error && <p className="text-error">{error}</p>}
        <Select value={role} onValueChange={(value) => setRole(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Modal>
  );
}
