import type { KitchenSpaceType } from "@/types";
import { getSpaceWording, SpaceType } from "./space-wording";

export interface SpaceTerminology {
  spaceType: KitchenSpaceType;
  spaceLabel: string;
  memberLabel: string;
  memberLabelPlural: string;
  activeMembersTitle: string;
  kitchenMembersTitle: string;
  inviteCardTitle: string;
  inviteCardDescription: string;
  namePlaceholder: string;
  cartRoommateDescription: string;
  cartAttributionFallback: string;
  memberTab: string;
  membersHeading: string;
  stagedByOthers: string;
  inviteAction: string;
  inviteDescription: string;
  badgeLabel: string;
}

/**
 * Returns dynamic contextual terminology based on the household/space type.
 * Supports FLATSHARE, FAMILY, OFFICE, and NEUTRAL spaces in English and German.
 */
export function getSpaceTerminology(spaceType: KitchenSpaceType = "FLATSHARE", lang: "en" | "de" = "en"): SpaceTerminology {
  const wording = getSpaceWording(spaceType as SpaceType, lang);
  const isDe = lang === "de";

  switch (spaceType) {
    case "FAMILY":
      return {
        spaceType: "FAMILY",
        spaceLabel: isDe ? "Familie" : "Family",
        memberLabel: isDe ? "Familienmitglied" : "Family Member",
        memberLabelPlural: isDe ? "Familienmitglieder" : "Family Members",
        activeMembersTitle: isDe ? "Aktive Familienmitglieder" : "Active Family Members",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: isDe ? "Von der Familie zum Kauf vorgemerkt." : "Items staged for purchase by family.",
        cartAttributionFallback: isDe ? "Familie" : "Family",
        memberTab: wording.memberTab,
        membersHeading: wording.membersHeading,
        stagedByOthers: wording.stagedByOthers,
        inviteAction: wording.inviteAction,
        inviteDescription: wording.inviteDescription,
        badgeLabel: wording.badgeLabel,
      };
    case "OFFICE":
      return {
        spaceType: "OFFICE",
        spaceLabel: isDe ? "Büro / Studio" : "Office",
        memberLabel: isDe ? "Teammitglied" : "Team Member",
        memberLabelPlural: isDe ? "Teammitglieder" : "Team Members",
        activeMembersTitle: isDe ? "Aktive Teammitglieder" : "Active Team Members",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: isDe ? "Von Teammitgliedern zum Kauf vorgemerkt." : "Items staged for purchase by teammates.",
        cartAttributionFallback: isDe ? "Teammitglied" : "Teammate",
        memberTab: wording.memberTab,
        membersHeading: wording.membersHeading,
        stagedByOthers: wording.stagedByOthers,
        inviteAction: wording.inviteAction,
        inviteDescription: wording.inviteDescription,
        badgeLabel: wording.badgeLabel,
      };
    case "NEUTRAL":
      return {
        spaceType: "NEUTRAL",
        spaceLabel: isDe ? "Gemeinschaft" : "Neutral",
        memberLabel: isDe ? "Mitglied" : "Member",
        memberLabelPlural: isDe ? "Mitglieder" : "Members",
        activeMembersTitle: isDe ? "Aktive Mitglieder" : "Active Members",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: isDe ? "Von Mitgliedern zum Kauf vorgemerkt." : "Items staged for purchase by members.",
        cartAttributionFallback: isDe ? "Mitglied" : "Member",
        memberTab: wording.memberTab,
        membersHeading: wording.membersHeading,
        stagedByOthers: wording.stagedByOthers,
        inviteAction: wording.inviteAction,
        inviteDescription: wording.inviteDescription,
        badgeLabel: wording.badgeLabel,
      };
    case "FLATSHARE":
    default:
      return {
        spaceType: "FLATSHARE",
        spaceLabel: isDe ? "WG-Haushalt" : "Flatshare",
        memberLabel: isDe ? "Mitbewohner" : "Roommate",
        memberLabelPlural: isDe ? "Mitbewohner" : "Roommates",
        activeMembersTitle: isDe ? "Aktive Mitbewohner" : "Active Roommates",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: isDe ? "Von Mitbewohnern zum Kauf vorgemerkt." : "Items staged for purchase by roommates.",
        cartAttributionFallback: isDe ? "Mitbewohner" : "Roommate",
        memberTab: wording.memberTab,
        membersHeading: wording.membersHeading,
        stagedByOthers: wording.stagedByOthers,
        inviteAction: wording.inviteAction,
        inviteDescription: wording.inviteDescription,
        badgeLabel: wording.badgeLabel,
      };
  }
}
