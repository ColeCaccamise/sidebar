import Modal from '@/components/ui/modal';
import { User } from '@/types';
import Input from '@/components/ui/input';
import { useState } from 'react';
import Button from '@/components/ui/button';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
};

export default function UpdateNameModal({ isOpen, onClose, user }: Props) {
  const [values, setValues] = useState({
    initial: {
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
    },
    current: {
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
    },
    error: {
      firstName: '',
      lastName: '',
    },
    isLoading: false,
  });

  const isLoading = values.isLoading;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      current: {
        ...prev.current,
        [name]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(values);
  };

  const nameChanged =
    values.current.firstName === values.initial.firstName &&
    values.current.lastName === values.initial.lastName;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Update Name"
      className="w-full max-w-lg"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          value={values.current.firstName}
          handleChange={handleChange}
          placeholder="First Name"
          name="firstName"
        />
        <Input
          value={values.current.lastName}
          handleChange={handleChange}
          placeholder="Last Name"
          name="lastName"
        />

        <Button
          className="w-full"
          type="submit"
          disabled={nameChanged || isLoading}
        >
          Update Name
        </Button>
      </form>
    </Modal>
  );
}
