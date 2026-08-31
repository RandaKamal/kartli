export type SpaceType = 'FLATSHARE' | 'FAMILY' | 'OFFICE' | 'NEUTRAL';

export function getSpaceWording(spaceType: SpaceType = 'FLATSHARE') {
  switch (spaceType) {
    case 'FAMILY':
      return {
        key: 'FAMILY',
        badgeLabel: 'Family Space',
        memberTab: 'Family',
        membersHeading: 'Family Members',
        emptyListHeading: 'Pantry is all stocked!',
        emptyListSub: 'Add items above whenever the home is running low.',
        stagedByOthers: 'Picked up by Family',
        inviteAction: 'Invite Family Member',
        inviteDescription: 'Share access with your kids, partner, or parents.',
        invitePlaceholder: 'e.g. Mom, Leo, Sarah',
      };
    case 'OFFICE':
      return {
        key: 'OFFICE',
        badgeLabel: 'Office / Studio',
        memberTab: 'Team',
        membersHeading: 'Team Members',
        emptyListHeading: 'Office kitchen is fully stocked',
        emptyListSub: 'Request snacks, milk, or coffee supplies above.',
        stagedByOthers: 'Staged by Teammates',
        inviteAction: 'Invite Team Member',
        inviteDescription: 'Generate a kitchen pass for coworkers or staff.',
        invitePlaceholder: 'e.g. Alex (Design), Reception',
      };
    case 'NEUTRAL':
      return {
        key: 'NEUTRAL',
        badgeLabel: 'Shared Space',
        memberTab: 'Members',
        membersHeading: 'Kitchen Members',
        emptyListHeading: 'All stocked up',
        emptyListSub: 'Items will appear here when marked empty or added above.',
        stagedByOthers: 'Staged by Members',
        inviteAction: 'Invite Member',
        inviteDescription: 'Add a household member to generate a claim link.',
        invitePlaceholder: 'e.g. Member name',
      };
    case 'FLATSHARE':
    default:
      return {
        key: 'FLATSHARE',
        badgeLabel: 'Flatshare Space',
        memberTab: 'Roommates',
        membersHeading: 'Flatshare Roomies',
        emptyListHeading: 'Everything’s stocked up!',
        emptyListSub: 'Mark empty staples or drop ad-hoc snack requests above.',
        stagedByOthers: 'Grabbed by Roomies',
        inviteAction: 'Add New Roomie',
        inviteDescription: 'Generate a quick claim link for your next flatmate.',
        invitePlaceholder: 'e.g. Lisa, Finn, Sam',
      };
  }
}
