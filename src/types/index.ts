export interface Match {
    id: string;
    teamA: string;
    teamB: string;
    venue: string;
    date: string;   
    time: string; 
    status: string;  // “Live” | “Upcoming” | “Completed”
  }
  
  export interface PointsEntry {
    position: number;
    team: string;
    played: number;
    wins: number;
    losses: number;
    noResult: number;
    netRunRate: number;
    points: number;
    for: string;
    against: string;
    performanceHistory: Array<"W" | "L" | "N">;
  }
  
  export interface TeamStatus {
    runs?: number;
    score?: string;
    overs: string;
    wickets: number;
  }
  
  export interface ScheduleEntry {
    id: string;
    matchNumber?: number;
    matchType: string;
    dateTime: string;
    teamA: string;
    teamAStatus?: TeamStatus;
    teamB: string;
    teamBStatus?: TeamStatus;
    venue: string;
    matchReportUrl?: string;
    matchHighlightsUrl?: string;
    matchCenterUrl?: string;
    verdict?: string; // Optional verdict for completed matches
  }
  
  export interface MatchSchedule {
    [matchType: string]: ScheduleEntry[];  // Key is the match type 
  }
  
