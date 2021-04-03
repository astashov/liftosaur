Users

- id: string;
- tempUserId: string;
- email: string;
- createdAt: timestamp;
- setting: Settings;
- currentProgramId: string | null;
- version: string;
- helps: string[];

GoogleAuthKeys

- userId: string;
- googleId: string;
- accessToken: string;

HistoryRecords

- userId: string;
- date: t.string,
- programId: t.string,
- programName: t.string,
- day: t.number,
- dayName: t.string,
- entries: t.array(THistoryEntry),
- startTime: t.number
- endTime: t.number

- likes: [ {userId, timestamp } ]
- comments: [ {
  userId,
  text,
  timestamp
  } ]

Stats

- userId: string
- timestamp: number
- type: string
- value: number
- unit: string

Programs

- id: string
- name: string
- description: string
- url: string
- author: string
- data: string

Friendships

- oneUserId
- twoUserId
- status
