import type { KitchenSpaceType } from "@/types";

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
}

/**
 * Returns dynamic contextual terminology based on the household/space type.
 * Supports FLATSHARE, FAMILY, and NEUTRAL spaces.
 */
export function getSpaceTerminology(spaceType: KitchenSpaceType = "FLATSHARE"): SpaceTerminology {
  switch (spaceType) {
    case "FAMILY":
      return {
        spaceType: "FAMILY",
        spaceLabel: "Family",
        memberLabel: "Family Member",
        memberLabelPlural: "Family Members",
        activeMembersTitle: "Active Family Members",
        kitchenMembersTitle: "Family Members",
        inviteCardTitle: "Invite Family Member",
        inviteCardDescription: "Add a family member slot and generate an instant access link.",
        namePlaceholder: "e.g. Mom, Dad, Leo",
        cartRoommateDescription: "Items staged for purchase by family.",
        cartAttributionFallback: "Family",
      };
    case "NEUTRAL":
      return {
        spaceType: "NEUTRAL",
        spaceLabel: "Neutral",
        memberLabel: "Member",
        memberLabelPlural: "Members",
        activeMembersTitle: "Active Members",
        kitchenMembersTitle: "Kitchen Members",
        inviteCardTitle: "Invite New Member",
        inviteCardDescription: "Add a member slot and generate an instant access link.",
        namePlaceholder: "e.g. Alex or Taylor",
        cartRoommateDescription: "Items staged for purchase by members.",
        cartAttributionFallback: "Member",
      };
    case "FLATSHARE":
    default:
      return {
        spaceType: "FLATSHARE",
        spaceLabel: "Flatshare",
        memberLabel: "Roommate",
        memberLabelPlural: "Roommates",
        activeMembersTitle: "Active Roommates",
        kitchenMembersTitle: "Kitchen Roommates",
        inviteCardTitle: "Invite New Roommate",
        inviteCardDescription: "Add a roommate slot and generate an instant access link.",
        namePlaceholder: "e.g. Mia or Daniel",
        cartRoommateDescription: "Items staged for purchase by roommates.",
        cartAttributionFallback: "Roommate",
      };
  }
}
