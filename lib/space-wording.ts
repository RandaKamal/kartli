export type SpaceType = 'FLATSHARE' | 'FAMILY' | 'OFFICE' | 'NEUTRAL';

export function getSpaceWording(spaceType: SpaceType = 'FLATSHARE', lang: 'en' | 'de' = 'en') {
  if (lang === 'de') {
    switch (spaceType) {
      case 'FAMILY':
        return {
          key: 'FAMILY',
          badgeLabel: 'Familien-Haushalt',
          memberTab: 'Familie',
          membersHeading: 'Familienmitglieder',
          emptyListHeading: 'Vorratskammer ist voll!',
          emptyListSub: 'Artikel oben eintragen, wenn etwas im Haushalt ausgeht.',
          stagedByOthers: 'Von der Familie eingepackt',
          inviteAction: 'Familienmitglied einladen',
          inviteDescription: 'Teile den Zugriff mit deinen Kindern, Partner oder Eltern.',
          invitePlaceholder: 'z. B. Mama, Leo, Sarah',
        };
      case 'OFFICE':
        return {
          key: 'OFFICE',
          badgeLabel: 'Büro / Studio',
          memberTab: 'Team',
          membersHeading: 'Teammitglieder',
          emptyListHeading: 'Bürokantine ist voll!',
          emptyListSub: 'Snacks, Milch oder Kaffee-Nachschub oben eintragen.',
          stagedByOthers: 'Vom Team eingepackt',
          inviteAction: 'Teammitglied einladen',
          inviteDescription: 'Erstelle einen Küchen-Pass für Kollegen oder Mitarbeiter.',
          invitePlaceholder: 'z. B. Alex (Design), Empfang',
        };
      case 'NEUTRAL':
        return {
          key: 'NEUTRAL',
          badgeLabel: 'Gemeinsamer Raum',
          memberTab: 'Mitglieder',
          membersHeading: 'Küchenmitglieder',
          emptyListHeading: 'Alles vorrätig',
          emptyListSub: 'Artikel erscheinen hier, wenn sie als leer markiert oder hinzugefügt werden.',
          stagedByOthers: 'Von Mitgliedern eingepackt',
          inviteAction: 'Mitglied einladen',
          inviteDescription: 'Füge ein Mitglied hinzu, um einen Einladungslink zu erstellen.',
          invitePlaceholder: 'z. B. Name des Mitglieds',
        };
      case 'FLATSHARE':
      default:
        return {
          key: 'FLATSHARE',
          badgeLabel: 'WG-Haushalt',
          memberTab: 'Mitbewohner',
          membersHeading: 'WG-Mitglieder',
          emptyListHeading: 'Alles vorrätig!',
          emptyListSub: 'Leere Grundvorräte markieren oder Snack-Wünsche oben eintragen.',
          stagedByOthers: 'Von Mitbewohnern eingepackt',
          inviteAction: 'Neuen Mitbewohner hinzufügen',
          inviteDescription: 'Erstelle einen schnellen Einladungslink für deinen nächsten Mitbewohner.',
          invitePlaceholder: 'z. B. Lisa, Finn, Sam',
        };
    }
  }

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
