(function () {
  "use strict";
  const MOCK_LEADS = Object.freeze([
    Object.freeze({ firstName: "Sample", lastName: "Youth Parent", email: "parent@example.test", phone: "(555) 010-0101", leadType: "youth-athlete", submissionType: "lead", submittedAt: "2026-08-08T14:00:00Z", status: "New", followUpStatus: "Not started" }),
    Object.freeze({ firstName: "Sample", lastName: "Adult Client", email: "adult@example.test", phone: "(555) 010-0102", leadType: "adult-personal-training", submissionType: "lead", submittedAt: "2026-08-07T18:30:00Z", status: "Contacted", followUpStatus: "Awaiting reply" }),
    Object.freeze({ firstName: "Sample", lastName: "Local Business", email: "owner@example.test", phone: "", leadType: "business-website", submissionType: "website-service-inquiry", submittedAt: "2026-08-06T12:15:00Z", status: "New", followUpStatus: "Not started" })
  ]);
  const DEMO_ATHLETE = Object.freeze({
    label: "Fictional demo athlete",
    firstName: "Jordan",
    initials: "JR",
    trainingFocus: "Speed & strength",
    currentWorkout: Object.freeze({
      id: "demo-lower-power-01",
      title: "Lower Body Power",
      schedule: "Today · 4:30 PM",
      duration: "45 min",
      progress: "0 of 5 exercises",
      coachNote: "Move with intent. Rest fully between power sets.",
      exercises: Object.freeze([
        "Box Jump · 4 × 3",
        "Trap Bar Deadlift · 4 × 5",
        "Rear-Foot Elevated Split Squat · 3 × 8/side",
        "Sled Push · 5 × 20 yd",
        "Front Plank · 3 × 40 sec"
      ])
    }),
    lastWorkout: Object.freeze({ title: "Lower Body Power", date: "Monday", result: "Completed 5 of 5", highlight: "Trap bar: 185 lb × 5" }),
    upcoming: Object.freeze([
      Object.freeze({ day: "Wed", date: "Aug 19", title: "Speed Mechanics", detail: "35 min · Field" }),
      Object.freeze({ day: "Fri", date: "Aug 21", title: "Upper Body Strength", detail: "45 min · Gym" })
    ]),
    personalRecords: Object.freeze([
      Object.freeze({ metric: "Trap Bar Deadlift", value: "185 lb × 5", change: "+10 lb" }),
      Object.freeze({ metric: "10-yard sprint", value: "1.78 sec", change: "0.06 sec faster" })
    ])
  });
  window.F4F_DATA = Object.freeze({ mockLeads: MOCK_LEADS, demoAthlete: DEMO_ATHLETE });
})();
