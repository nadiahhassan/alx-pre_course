// Who can do what. Checked in every server action (see requireAbility in
// src/lib/auth.ts) and used to hide controls people can't use.

export type Ability =
  | "manage-users" // add people, change roles
  | "manage-programme" // programme settings, focus areas, budgets
  | "edit-data" // initiatives, parameters, entries, snapshots
  | "edit-campaigns" // campaigns and their metrics
  | "edit-evidence" // quotes, case studies, links
  | "approve-ai" // approve AI-generated items for stakeholder views
  | "share" // create and revoke read-only links
  | "edit-operations"; // spend, responsibilities, risks, decisions

export interface Actor {
  role: string;
  team: string;
}

export function can(user: Actor | null | undefined, ability: Ability): boolean {
  if (!user) return false;
  switch (user.role) {
    case "admin":
      return true;
    case "programme":
      return ability !== "manage-users" && ability !== "manage-programme";
    case "partner":
      if (ability === "edit-evidence" || ability === "share") return true;
      if (ability === "edit-campaigns") return user.team === "marketing";
      return false;
    default:
      return false;
  }
}

/** Partners can update the status of responsibilities assigned to their own team. */
export function canUpdateResponsibility(user: Actor | null | undefined, responsibilityTeam: string): boolean {
  if (can(user, "edit-operations")) return true;
  return !!user && user.role === "partner" && user.team === responsibilityTeam;
}
