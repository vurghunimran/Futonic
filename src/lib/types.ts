export type WorkStatus = "Unassigned" | "Assigned" | "In Progress" | "Ready for Review" | "Completed" | "Cancelled";
export type Priority = "Low" | "Medium" | "High" | "Urgent";

export type AgendaItem = {
  id: string;
  kind: "fixture" | "manual";
  title: string;
  startsAt: string;
  deadlineAt?: string;
  home?: string;
  away?: string;
  homeCode?: string;
  awayCode?: string;
  competition?: string;
  venue?: string;
  round?: string;
  selectedPlayer?: string;
  externalFixtureId?: string;
  homeLogo?: string;
  awayLogo?: string;
  competitionLogo?: string;
  fixtureStatus?: string;
  status: WorkStatus;
  priority: Priority;
  worker?: string;
  notes?: string;
  notified?: boolean;
};

export type FootballEntity = {
  id: string;
  type: "club" | "player";
  name: string;
  subtitle: string;
  crest: string;
  club?: string;
  externalId?: string;
  teamId?: string;
  provider?: string;
  image?: string;
};
