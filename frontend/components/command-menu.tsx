import { CommandEmpty, CommandInput } from './ui/command-menu';

import {
  CommandDialog,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from './ui/command-menu';

export default function CommandMenu(props: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <CommandDialog open={props.open} onOpenChange={props.setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            Calendar <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem>Search</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>

        <CommandGroup heading="Billing">
          <CommandItem>Upgrade plan</CommandItem>
          <CommandItem>Billing</CommandItem>
          <CommandItem>Help and support</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
