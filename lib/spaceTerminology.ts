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
 * Supports FLATSHARE, FAMILY, OFFICE, and NEUTRAL spaces.
 */
export function getSpaceTerminology(spaceType: KitchenSpaceType = "FLATSHARE"): SpaceTerminology {
  const wording = getSpaceWording(spaceType as SpaceType);
  switch (spaceType) {
    case "FAMILY":
      return {
        spaceType: "FAMILY",
        spaceLabel: "Family",
        memberLabel: "Family Member",
        memberLabelPlural: "Family Members",
        activeMembersTitle: "Active Family Members",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: "Items staged for purchase by family.",
        cartAttributionFallback: "Family",
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
        spaceLabel: "Office",
        memberLabel: "Team Member",
        memberLabelPlural: "Team Members",
        activeMembersTitle: "Active Team Members",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: "Items staged for purchase by teammates.",
        cartAttributionFallback: "Teammate",
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
        spaceLabel: "Neutral",
        memberLabel: "Member",
        memberLabelPlural: "Members",
        activeMembersTitle: "Active Members",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: "Items staged for purchase by members.",
        cartAttributionFallback: "Member",
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
        spaceLabel: "Flatshare",
        memberLabel: "Roommate",
        memberLabelPlural: "Roommates",
        activeMembersTitle: "Active Roommates",
        kitchenMembersTitle: wording.membersHeading,
        inviteCardTitle: wording.inviteAction,
        inviteCardDescription: wording.inviteDescription,
        namePlaceholder: wording.invitePlaceholder,
        cartRoommateDescription: "Items staged for purchase by roommates.",
        cartAttributionFallback: "Roommate",
        memberTab: wording.memberTab,
        membersHeading: wording.membersHeading,
        stagedByOthers: wording.stagedByOthers,
        inviteAction: wording.inviteAction,
        inviteDescription: wording.inviteDescription,
        badgeLabel: wording.badgeLabel,
      };
  }
}
