import { MatchSchedule } from '@/types';

// Mock data for upcoming matches (dates after July 17, 2025)
export const mockUpcomingMatches: MatchSchedule = {
  "League": [
    {
      id: "upcoming-match-1",
      matchType: "League",
      dateTime: "2025-07-18T19:30:00.000Z",
      teamA: "Mumbai Indians",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Chennai Super Kings", 
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Wankhede Stadium, Mumbai",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    },
    {
      id: "upcoming-match-2",
      matchType: "League", 
      dateTime: "2025-07-19T15:30:00.000Z",
      teamA: "Royal Challengers Bangalore",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Kolkata Knight Riders",
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "M. Chinnaswamy Stadium, Bangalore",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    },
    {
      id: "upcoming-match-3",
      matchType: "League",
      dateTime: "2025-07-20T19:30:00.000Z", 
      teamA: "Delhi Capitals",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Punjab Kings",
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Arun Jaitley Stadium, Delhi",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    },
    {
      id: "upcoming-match-4", 
      matchType: "League",
      dateTime: "2025-07-21T15:30:00.000Z",
      teamA: "Rajasthan Royals",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Sunrisers Hyderabad",
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Sawai Mansingh Stadium, Jaipur",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    },
    {
      id: "upcoming-match-5",
      matchType: "League",
      dateTime: "2025-07-22T19:30:00.000Z",
      teamA: "Gujarat Titans",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Lucknow Super Giants", 
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Narendra Modi Stadium, Ahmedabad",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    }
  ],
  "Qualifier 1": [
    {
      id: "upcoming-qualifier-1",
      matchType: "Qualifier 1",
      dateTime: "2025-07-25T19:30:00.000Z",
      teamA: "Mumbai Indians",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Chennai Super Kings",
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Eden Gardens, Kolkata",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    }
  ],
  "Eliminator": [
    {
      id: "upcoming-eliminator",
      matchType: "Eliminator", 
      dateTime: "2025-07-26T19:30:00.000Z",
      teamA: "Royal Challengers Bangalore",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Delhi Capitals",
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "M. A. Chidambaram Stadium, Chennai",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    }
  ],
  "Qualifier 2": [
    {
      id: "upcoming-qualifier-2",
      matchType: "Qualifier 2",
      dateTime: "2025-07-27T19:30:00.000Z",
      teamA: "Kolkata Knight Riders",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Royal Challengers Bangalore", 
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Wankhede Stadium, Mumbai",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    }
  ],
  "Final": [
    {
      id: "upcoming-final",
      matchType: "Final",
      dateTime: "2025-07-28T19:30:00.000Z",
      teamA: "Mumbai Indians",
      teamAStatus: { runs: 0, overs: "0.0", wickets: 0 },
      teamB: "Kolkata Knight Riders",
      teamBStatus: { runs: 0, overs: "0.0", wickets: 0 },
      venue: "Narendra Modi Stadium, Ahmedabad",
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: ""
    }
  ]
};

// Mock data for live matches (currently happening - 1 hour ago)
export const mockLiveMatches: MatchSchedule = {
  "League": [
    {
      id: "live-match-1",
      matchType: "League",
      dateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      teamA: "Mumbai Indians",
      teamAStatus: { runs: 156, overs: "16.2", wickets: 4 },
      teamB: "Chennai Super Kings",
      teamBStatus: { runs: 155, overs: "20.0", wickets: 8 },
      venue: "Wankhede Stadium, Mumbai", 
      matchReportUrl: "",
      matchHighlightsUrl: "",
      matchCenterUrl: "",
      verdict: "" // No verdict indicates live match
    }
  ]
};

// Mock data for completed matches (past dates)
export const mockCompletedMatches: MatchSchedule = {
  "League": [
    {
      id: "completed-match-1", 
      matchType: "League",
      dateTime: "2025-07-15T19:30:00.000Z",
      teamA: "Royal Challengers Bangalore   RCB   190/6   (20.0 OV)",
      teamAStatus: { runs: 190, overs: "20.0", wickets: 6 },
      teamB: "Kolkata Knight Riders   KKR   185/9   (20.0 OV)",
      teamBStatus: { runs: 185, overs: "20.0", wickets: 9 },
      venue: "M. Chinnaswamy Stadium, Bangalore",
      matchReportUrl: "https://www.iplt20.com/match-report/rcb-vs-kkr",
      matchHighlightsUrl: "https://www.iplt20.com/highlights/rcb-vs-kkr", 
      matchCenterUrl: "https://www.iplt20.com/match-center/rcb-vs-kkr",
      verdict: "Royal Challengers Bangalore won by 5 runs"
    },
    {
      id: "completed-match-2",
      matchType: "League", 
      dateTime: "2025-07-14T15:30:00.000Z",
      teamA: "Delhi Capitals   DC   178/7   (20.0 OV)",
      teamAStatus: { runs: 178, overs: "20.0", wickets: 7 },
      teamB: "Punjab Kings   PBKS   174/6   (20.0 OV)",
      teamBStatus: { runs: 174, overs: "20.0", wickets: 6 },
      venue: "Arun Jaitley Stadium, Delhi",
      matchReportUrl: "https://www.iplt20.com/match-report/dc-vs-pbks",
      matchHighlightsUrl: "https://www.iplt20.com/highlights/dc-vs-pbks",
      matchCenterUrl: "https://www.iplt20.com/match-center/dc-vs-pbks", 
      verdict: "Delhi Capitals won by 4 runs"
    },
    {
      id: "completed-match-3",
      matchType: "League",
      dateTime: "2025-07-13T19:30:00.000Z",
      teamA: "Rajasthan Royals   RR   165/8   (20.0 OV)",
      teamAStatus: { runs: 165, overs: "20.0", wickets: 8 },
      teamB: "Sunrisers Hyderabad   SRH   167/3   (18.4 OV)",
      teamBStatus: { runs: 167, overs: "18.4", wickets: 3 },
      venue: "Sawai Mansingh Stadium, Jaipur",
      matchReportUrl: "https://www.iplt20.com/match-report/rr-vs-srh",
      matchHighlightsUrl: "https://www.iplt20.com/highlights/rr-vs-srh",
      matchCenterUrl: "https://www.iplt20.com/match-center/rr-vs-srh",
      verdict: "Sunrisers Hyderabad won by 7 wickets"
    },
    {
      id: "completed-match-4",
      matchType: "League",
      dateTime: "2025-07-12T15:30:00.000Z", 
      teamA: "Gujarat Titans   GT   201/4   (20.0 OV)",
      teamAStatus: { runs: 201, overs: "20.0", wickets: 4 },
      teamB: "Lucknow Super Giants   LSG   198/6   (20.0 OV)",
      teamBStatus: { runs: 198, overs: "20.0", wickets: 6 },
      venue: "Narendra Modi Stadium, Ahmedabad",
      matchReportUrl: "https://www.iplt20.com/match-report/gt-vs-lsg",
      matchHighlightsUrl: "https://www.iplt20.com/highlights/gt-vs-lsg",
      matchCenterUrl: "https://www.iplt20.com/match-center/gt-vs-lsg",
      verdict: "Gujarat Titans won by 3 runs"
    }
  ]
};
