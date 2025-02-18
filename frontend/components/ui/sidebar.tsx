import Dropdown from './dropdown';
import Link from 'next/link';
import LogoLink from './logo-link';
import Divider from './divider';
import UpsellCard from './upsell-card';

export default function Sidebar({
  teamName,
  upsell,
  menuItems,
  sidebarItems,
  secondarySidebarItems,
  dropdownContent,
  header,
}: {
  teamName?: string;
  upsell?: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
    closeable: boolean;
  };
  menuItems?: {
    icon?: React.ReactNode;
    divider?: boolean;
    id?: string;
    label?: string;
    kbd?: string;
    href?: string;
    handleClick?: () => void;
  }[];
  sidebarItems?: {
    active?: boolean;
    icon?: React.ReactNode;
    id?: string;
    label?: string;
    href?: string;
    heading?: string;
    topMargin?: boolean;
  }[];
  secondarySidebarItems?: {
    active?: boolean;
    icon?: React.ReactNode;
    id?: string;
    label?: string;
    href?: string;
  }[];
  dropdownContent?: React.ReactNode;
  header?: React.ReactNode;
}) {
  return (
    <div className="bg-sidebar-fill flex max-h-screen w-64 min-w-64 max-w-64 flex-col justify-between gap-12 overflow-y-auto bg-sidebar px-4 py-12">
      <div className="flex flex-col gap-8">
        {header ? (
          header
        ) : (
          <div className="px-2">
            <LogoLink />
          </div>
        )}

        <div className="flex items-center gap-2">
          {sidebarItems && (
            <div className="flex w-full flex-col gap-2 rounded-md">
              {sidebarItems.map((item) =>
                item.heading ? (
                  <span
                    key={item.heading}
                    className={`text-xs font-medium text-typography-strong ${
                      item?.topMargin ? 'mt-4' : ''
                    }`}
                  >
                    {item.heading}
                  </span>
                ) : (
                  <Link
                    className={`flex items-center gap-2 rounded-md p-2 text-sm no-underline hover:bg-fill ${
                      item?.active ? 'bg-fill text-typography-strong' : ''
                    }`}
                    key={item.id}
                    href={item.href || ''}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {upsell && (
          <UpsellCard
            title={upsell.title}
            description={upsell.description}
            buttonText={upsell.buttonText}
            buttonLink={upsell.buttonLink}
            closeable={upsell.closeable}
          />
        )}

        {secondarySidebarItems && (
          <div className="flex w-full flex-col gap-2 rounded-md">
            {secondarySidebarItems.map((item) => (
              <Link
                className={`flex items-center gap-2 rounded-md p-2 text-sm no-underline hover:bg-fill ${
                  item?.active ? 'bg-fill text-typography-strong' : ''
                }`}
                key={item.id}
                href={item.href || ''}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
        {teamName && (
          <>
            <Divider />
            <Dropdown
              position="left"
              menuItems={menuItems}
              top={false}
              dropdownContent={dropdownContent}
            >
              <div className="flex w-full items-center gap-2 p-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fill text-sm font-bold text-typography-strong">
                  {teamName?.slice(0, 2)?.toUpperCase() || 'T'}
                </div>
                <span className="text-sm font-medium">
                  {teamName ? teamName : 'My Team'}
                </span>
              </div>
            </Dropdown>
          </>
        )}
      </div>
    </div>
  );
}
