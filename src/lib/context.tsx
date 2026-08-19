"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Class, AcademicEvent, NotebookSource, Flashcard, CoreObjective, CompletionStep, SavedICalFeed } from './types';
import { formatLocalDate, getTodayDateStr } from './utils';
import axios from 'axios';

// Helper to generate realistic default core objectives & guides for classes
const generateDefaultObjectives = (classId: string, className: string): CoreObjective[] => {
  const name = className.toLowerCase();
  const now = new Date().toISOString();

  if (name.includes('phys')) {
    return [
      {
        id: `${classId}-obj1`,
        classId,
        title: "Master Kinematics & Newton's Laws of Motion",
        description: "Understand 1D/2D displacement, velocity vectors, constant acceleration, and application of F = m*a in friction/incline problems.",
        category: "exam",
        targetDate: "2026-10-14",
        completed: false,
        createdAt: now,
        guides: [
          { id: "step-1", title: "Review Lecture 1 notes on Kinematic equations (v = v0 + at)", completed: true, notes: "Formulas memorized" },
          { id: "step-2", title: "Draw Free Body Diagrams (FBD) for all 5 homework friction problems", completed: false },
          { id: "step-3", title: "Solve Midterm practice exam Chapter 1-3 questions", completed: false },
          { id: "step-4", title: "Verify lab experiment 2 vectors worksheet calculations on D2L", completed: false }
        ]
      },
      {
        id: `${classId}-obj2`,
        classId,
        title: "Complete Centripetal Force & Work-Energy Theorem Lab",
        description: "Calculate circular motion dynamics (a_c = v^2/r) and perform work-energy balance analysis for lab report submission.",
        category: "assignment",
        targetDate: "2026-09-28",
        completed: false,
        createdAt: now,
        guides: [
          { id: "step-1", title: "Collect velocity and radius telemetry from physics lab sensor app", completed: true },
          { id: "step-2", title: "Compute Kinetic Energy (0.5 * m * v^2) vs Potential Energy (m * g * h)", completed: false },
          { id: "step-3", title: "Draft lab report discussion & submit PDF upload to D2L drop box", completed: false }
        ]
      }
    ];
  } else if (name.includes('computer') || name.includes('cs') || name.includes('algorithm') || name.includes('code')) {
    return [
      {
        id: `${classId}-obj1`,
        classId,
        title: "Implement Binary Search Trees & Recursive Operations",
        description: "Construct balanced BST node traversal algorithms (In-order, Pre-order, Post-order) and prove O(log n) time complexity.",
        category: "project",
        targetDate: "2026-10-18",
        completed: false,
        createdAt: now,
        guides: [
          { id: "step-1", title: "Review Big-O complexity tiers & recursive call stack overhead", completed: true },
          { id: "step-2", title: "Write Java code for TreeNode insertion, deletion, and rotation logic", completed: false },
          { id: "step-3", title: "Run JUnit unit test suite and verify edge cases (empty tree, duplicate keys)", completed: false },
          { id: "step-4", title: "Submit code repository ZIP file to D2L portal before 11:59 PM deadline", completed: false }
        ]
      },
      {
        id: `${classId}-obj2`,
        classId,
        title: "Ace Data Structures Midterm Examination",
        description: "Master Big-O analysis, Stacks/Queues LIFO vs FIFO, Linked Lists vs Arrays, and BST balancing.",
        category: "exam",
        targetDate: "2026-10-22",
        completed: false,
        createdAt: now,
        guides: [
          { id: "step-1", title: "Review flashcards on O(1) vs O(log n) vs O(n) algorithm complexities", completed: false },
          { id: "step-2", title: "Solve 10 sample midterm questions on Mergesort vs Quicksort space bounds", completed: false },
          { id: "step-3", title: "Attend instructor office hours on Wed 10:00 AM for graph traversal review", completed: false }
        ]
      }
    ];
  }
  return [
    {
      id: `${classId}-obj1`,
      classId,
      title: `Achieve Mastery in ${className}`,
      description: `Complete all required modules, assignments, and exam prep for ${className} according to course syllabus.`,
      category: "course",
      targetDate: "2026-12-15",
      completed: false,
      createdAt: now,
      guides: [
        { id: "step-1", title: "Review course syllabus & add key exam dates to AcaSync Calendar", completed: true },
        { id: "step-2", title: "Sync D2L iCal feed to automatically track assignment due dates", completed: false },
        { id: "step-3", title: "Upload course materials to NotebookLM for AI study guide generation", completed: false }
      ]
    }
  ];
};

// Helper to generate realistic sample study sources when a class is loaded or created
const generateDefaultSources = (classId: string, className: string): NotebookSource[] => {
  const name = className.toLowerCase();
  
  if (name.includes('physic') || name.includes('phys')) {
    return [
      {
        id: `${classId}-syllabus`,
        classId,
        title: 'PHYS 101: Course Syllabus & Policies.pdf',
        type: 'pdf',
        url: 'https://d2l.university.edu/content/phys101/syllabus_2026.pdf',
        content: `Advanced Physics (PHYS 101) Course Syllabus

Grading Weights & Breakdown:
- Midterm Examination: 30% of total grade.
- Final Examination: 45% of total grade.
- Lab Experiments (8 sessions): 15% of total grade.
- Weekly Homework & Worksheets: 10% of total grade.

Key Class Deadlines & Events:
- Midterm Exam is scheduled for October 14th in the Main Hall. It covers Chapters 1 through 5: Kinematics, Newton's Laws, Vectors, Work, and Mechanical Energy.
- Final Exam is scheduled for December 15th in Lecture Hall B. It is a cumulative exam covering Chapters 1 to 12.
- Lab Worksheets are due every Friday by 11:59 PM submitted online on D2L.

Course Policies & Office Hours:
- Office hours are held on Tuesday and Thursday from 2:00 PM to 4:00 PM in the Physics Building, Room 304.
- Late homework policy: 10% deduction per day, up to a maximum of 3 days. No credit given after 3 days.`,
        wordCount: 165,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-lab-manual`,
        classId,
        title: 'Physics Lab Manual: Projectile & Newton Mechanics.pdf',
        type: 'pdf',
        url: 'https://d2l.university.edu/content/phys101/lab_manual_projectile.pdf',
        content: `PHYS 101 - Lab Manual Experiment 2: 2D Projectile Motion and Ballistic Trajectory

Objective: Measure projectile range vs launch angle theta, calculate velocity using photogates, and verify theoretical range formula R = (v0^2 / g) * sin(2*theta).

Equipment Required:
- Spring-loaded ball launcher with protractor mount
- Photogate timer accurate to 0.1 milliseconds
- Carbon paper and meter scale for landing point measurement
- Steel spheres (mass = 45g ± 0.5g)

Procedure & Calculations:
1. Fire 5 trials at angles 30°, 45°, and 60°.
2. Tabulate mean landing distance and calculate percent error against theoretical predictions.
3. Submit full lab report with error analysis on D2L by Friday midnight.`,
        wordCount: 125,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-lecture1`,
        classId,
        title: 'Lecture 1: Kinematics & Forces Notes',
        type: 'note',
        content: `PHYS 101 - Lecture 1 Notes: Kinematics and Forces

1. Kinematics Basics:
- Position (x) is the location. Velocity (v = dx/dt) is the rate of change of position. Acceleration (a = dv/dt) is the rate of change of velocity.
- The three Kinematic Equations for constant acceleration:
  1) Final velocity: v = v0 + a * t
  2) Position: x = x0 + v0 * t + 0.5 * a * t^2
  3) Velocity squared: v^2 = v0^2 + 2 * a * (x - x0)

2. Newton's Three Laws of Motion:
- First Law (Inertia): An object remains at rest or in a state of uniform motion in a straight line unless acted upon by a net external force.
- Second Law (F = m * a): The net force applied on an object is directly proportional to its mass and acceleration vector. Force is measured in Newtons (1 N = 1 kg*m/s^2).
- Third Law (Action-Reaction): For every action force, there is an equal and opposite reaction force. (Force of A on B equals negative Force of B on A).

3. Circular Motion & Centripetal Force:
- Any object moving in a circle experiences a centripetal acceleration a_c = v^2 / r directed toward the center.
- The corresponding Centripetal Force is F_c = m * v^2 / r, which is not a new force but rather supplied by gravity, tension, or friction.`,
        wordCount: 228,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-webassign-link`,
        classId,
        title: 'WebAssign Problem Sets Portal',
        type: 'link',
        url: 'https://webassign.net/wa-auth/login',
        content: `WebAssign online portal for weekly Physics 101 problem sets and automatic grading. Submissions close every Sunday 11:59 PM.`,
        wordCount: 19,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-guide`,
        classId,
        title: 'Physics Midterm Formula & Study Sheet',
        type: 'note',
        content: `PHYS 101 Midterm Review Guide - Study Tips & Core Concepts

Vectors & 2D Motion:
- Break vectors into components: x-component is magnitude * cos(theta), y-component is magnitude * sin(theta).
- For Projectile Motion, separate horizontal and vertical variables. Horizontal speed is constant (ax = 0). Vertical motion experiences gravity (ay = -g = -9.8 m/s^2).
- Flight time is determined by vertical height and initial vertical velocity.

Force Analysis & Friction:
- Always draw a Free Body Diagram (FBD) containing all acting forces (gravity, normal force, tension, friction).
- Static friction resists the start of movement: f_s <= mu_s * Normal Force.
- Kinetic friction opposes active sliding motion: f_k = mu_k * Normal Force.

Work & Mechanical Energy:
- Work done by a force: W = Force * displacement * cos(theta).
- Kinetic Energy (KE) formula: KE = 0.5 * m * v^2.
- Potential Energy (PE) near earth's surface: PE = m * g * h.
- Work-Energy Theorem states that Net Work done on a system equals its change in Kinetic Energy.`,
        wordCount: 174,
        addedAt: new Date().toISOString()
      }
    ];
  } else if (name.includes('computer') || name.includes('cs') || name.includes('algorithm') || name.includes('code')) {
    return [
      {
        id: `${classId}-syllabus`,
        classId,
        title: 'CS 201: Data Structures Syllabus.pdf',
        type: 'pdf',
        url: 'https://d2l.university.edu/content/cs201/syllabus.pdf',
        content: `CS 201 - Data Structures and Algorithms Course Syllabus

Grading Policy:
- Programming Assignments (4 projects): 40% of grade.
- Midterm Exam: 25% of grade.
- Final Exam: 30% of grade.
- Quizzes & Recitation: 5% of grade.

Project Deadlines & Syllabus Schedule:
- Project 1 (Linked Lists & Nodes): Due September 20th at 11:59 PM.
- Project 2 (BSTs & Recursion Trees): Due October 18th at 11:59 PM.
- Midterm Exam: October 22nd in Computer Lab Room A (covers linear lists, analysis, BSTs).
- Project 3 (Hashing & Graphs): Due November 15th at 11:59 PM.
- Project 4 (Sorting Algorithms & Analysis): Due December 5th at 11:59 PM.
- Final Exam is cumulative and scheduled for December 16th.

Development Standards:
- Programming language is Java 17. Use VS Code, IntelliJ, or Eclipse. Code must compile without errors.
- Office hours: Mon/Wed 10:00 AM - 12:00 PM in Technology Hall, Room 402.`,
        wordCount: 168,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-cheatsheet`,
        classId,
        title: 'Big-O & Data Structures Reference Sheet.pdf',
        type: 'pdf',
        url: 'https://github.com/cs201/resources/blob/main/big_o_cheatsheet.pdf',
        content: `CS 201 - Big-O Complexity & Data Structures Cheat Sheet

Operation Complexities Summary:
- Array: Access O(1), Search O(n), Insertion O(n), Deletion O(n)
- Singly Linked List: Access O(n), Search O(n), Insert Head O(1), Delete Head O(1)
- Binary Search Tree (Balanced): Search O(log n), Insert O(log n), Delete O(log n)
- Hash Map: Search O(1) avg, Insert O(1) avg, Delete O(1) avg. Worst case O(n) on heavy hash collisions.
- Heap / Priority Queue: Find Min O(1), Insert O(log n), Extract Min O(log n)

Graph Algorithms:
- Breadth-First Search (BFS): O(V + E) using Queue. Finds shortest unweighted path.
- Depth-First Search (DFS): O(V + E) using Stack/Recursion. Cycle detection and topological sort.
- Dijkstra's Algorithm: O((V + E) log V) with Min-Heap for single-source shortest path with positive weights.`,
        wordCount: 135,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-lecture1`,
        classId,
        title: 'Lecture 1: Complexity & Big-O Notation',
        type: 'note',
        content: `CS 201 - Lecture 1 Notes: Algorithm Complexity & Lists

1. Big-O Complexity:
- Big-O analysis measures the upper bound of execution time (or memory space) required by an algorithm relative to input size (n).
- Common complexity tiers (ordered fastest to slowest):
  - O(1) Constant: Accessing an array index or checking a boolean.
  - O(log n) Logarithmic: Binary search on a sorted structure.
  - O(n) Linear: Linear search in an unsorted list.
  - O(n log n) Linearithmic: Optimal comparison sorts (Mergesort, Quicksort average).
  - O(n^2) Quadratic: Bubble sort, Selection sort (nested loops).
  - O(2^n) Exponential: Naive recursive calculations (e.g. Fibonacci).

2. Space Complexity:
- Indicates the auxiliary memory scale. Mergesort requires O(n) temporary space. Quicksort runs in-place but requires O(log n) call-stack space.

3. Array vs Linked List:
- Array: Contiguous memory. Fast random access O(1). Slow insertion/deletion O(n) because values must shift.
- Linked List: Nodes connected by pointers. Slow random access O(n) since we must traverse. Fast insertion/deletion O(1) once node is located.`,
        wordCount: 182,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-gradescope-link`,
        classId,
        title: 'Gradescope Autograder & Starter Code',
        type: 'link',
        url: 'https://gradescope.com/courses/cs201',
        content: `Gradescope autograder platform for unit testing and test coverage evaluations for all 4 semester programming projects.`,
        wordCount: 18,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-guide`,
        classId,
        title: 'Data Structures Midterm Study Guide',
        type: 'note',
        content: `CS 201 Midterm Study Guide - Linear & Hierarchical Structures

Linear Collections:
- Stacks: LIFO (Last In First Out) structure. Main operations: Push (add) and Pop (remove) in O(1) time. Used in call stacks and backtracking.
- Queues: FIFO (First In First Out) structure. Main operations: Enqueue (add to back) and Dequeue (remove from front) in O(1) time. Used in printers and BFS.

Trees and Binary Search Trees (BST):
- BST Rule: For any node, all left children are smaller, and all right children are larger.
- Search, Insertion, and Deletion are O(log n) in a balanced tree, but degrade to O(n) if the tree is completely unbalanced (skewed).
- Balanced Trees (like AVL or Red-Black trees) perform rotations during inserts and deletes to keep tree height bounded to O(log n).

Sorting Comparison:
- Bubble & Selection Sort: O(n^2) time complexity.
- Insertion Sort: O(n^2) time, but O(n) if the array is already nearly sorted.
- Mergesort: O(n log n) time. Uses divide-and-conquer. It is stable but requires O(n) auxiliary space.
- Quicksort: O(n log n) average time, O(n^2) worst case if pivots are chosen poorly on sorted data. It is an in-place sort.`,
        wordCount: 198,
        addedAt: new Date().toISOString()
      }
    ];
  } else {
    return [
      {
        id: `${classId}-syllabus`,
        classId,
        title: `${className} Course Syllabus.pdf`,
        type: 'pdf',
        url: 'https://d2l.university.edu/content/syllabus.pdf',
        content: `Syllabus Overview for ${className}

Grading Policy:
- Written Assessments: 40% of final grade.
- Midterm Assessment: 30% of final grade.
- Class Participation: 10% of final grade.
- Final Term Project: 20% of final grade.

Key Deliverables:
- Homework Assignment 1: Due in Week 3.
- Midterm Exam: Scheduled in Week 8.
- Final Deliverable Submission: Due on the last calendar day of the semester.

Additional Details:
- Make sure to review the online syllabus documents regularly. Office hours are available by emailing the course instructor.`,
        wordCount: 96,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-lecture1`,
        classId,
        title: 'Lecture 1: Introductory Outline & Reading List',
        type: 'note',
        content: `Lecture Notes - Introduction to ${className}

Core Study Areas:
- Course Overview: Exploring the foundational definitions, modern applications, and structural outline of ${className}.
- Key Terms: Review definitions of primary concepts and models discussed in the reading list.
- Next Steps: Download the study syllabus, sync the class calendar milestones, and read the introductory chapter in preparation for next week's discussion.`,
        wordCount: 71,
        addedAt: new Date().toISOString()
      }
    ];
  }
};

const generateDefaultFlashcards = (classId: string, className: string): Flashcard[] => {
  const name = className.toLowerCase();
  const todayStr = getTodayDateStr();
  if (name.includes('phys')) {
    return [
      {
        id: `${classId}-fc1`,
        classId,
        question: "What is Newton's Second Law of Motion?",
        answer: "F = m * a. The net force on an object is directly proportional to its mass and acceleration.",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr
      },
      {
        id: `${classId}-fc2`,
        classId,
        question: "What is the formula for centripetal acceleration?",
        answer: "a_c = v^2 / r, directed towards the center of the circular path.",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr
      }
    ];
  } else if (name.includes('computer') || name.includes('cs') || name.includes('algorithm') || name.includes('code')) {
    return [
      {
        id: `${classId}-fc1`,
        classId,
        question: "What is the time complexity of Binary Search?",
        answer: "O(log n) because the search space is halved in each step.",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr
      },
      {
        id: `${classId}-fc2`,
        classId,
        question: "What is the difference between a Stack and a Queue?",
        answer: "Stack is LIFO (Last In First Out) whereas Queue is FIFO (First In First Out).",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        nextReviewDate: todayStr
      }
    ];
  }
  return [
    {
      id: `${classId}-fc1`,
      classId,
      question: `What is the core focus of ${className}?`,
      answer: "Refer to the syllabus overview and key terms in the introductory lecture.",
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReviewDate: todayStr
    }
  ];
};

interface AcademicContextType {
  classes: Class[];
  events: AcademicEvent[];
  sources: NotebookSource[];
  flashcards: Flashcard[];
  objectives: CoreObjective[];
  icalFeeds: SavedICalFeed[];
  lastGlobalSync: string | null;
  isAutoSyncing: boolean;

  addClass: (cls: Omit<Class, 'id'>) => string;
  addEvent: (event: Omit<AcademicEvent, 'id'>) => string;
  updateEvent: (event: AcademicEvent) => void;
  deleteEvent: (id: string) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  addSource: (source: Omit<NotebookSource, 'id' | 'addedAt'>) => void;
  deleteSource: (id: string) => void;
  addFlashcard: (fc: Omit<Flashcard, 'id'>) => void;
  updateFlashcard: (fc: Flashcard) => void;
  deleteFlashcard: (id: string) => void;

  // Objectives & Guides methods
  addObjective: (obj: Omit<CoreObjective, 'id' | 'createdAt'>) => string;
  updateObjective: (obj: CoreObjective) => void;
  deleteObjective: (id: string) => void;
  toggleObjectiveStep: (objectiveId: string, stepId: string) => void;
  generateObjectiveForAssignment: (event: AcademicEvent) => string;

  // Saved iCal Feeds & Auto Sync methods
  addICalFeed: (feed: Omit<SavedICalFeed, 'id'>) => SavedICalFeed;
  updateICalFeed: (feed: SavedICalFeed) => void;
  deleteICalFeed: (id: string) => void;
  syncAllICalFeeds: () => Promise<{ success: boolean; syncedEvents: number; errors: string[] }>;
  syncSingleICalFeed: (feedOrId: string | SavedICalFeed) => Promise<{ success: boolean; eventCount: number }>;

  currentView: 'calendar' | 'dashboard' | 'notebook';
  setCurrentView: (view: 'calendar' | 'dashboard' | 'notebook') => void;
  theme: string;
  setTheme: (theme: string) => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [objectives, setObjectives] = useState<CoreObjective[]>([]);
  const [icalFeeds, setIcalFeeds] = useState<SavedICalFeed[]>([]);
  const [lastGlobalSync, setLastGlobalSync] = useState<string | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<'calendar' | 'dashboard' | 'notebook'>('calendar');
  const [theme, setTheme] = useState<string>('midnight');
  const [geminiKey, setGeminiKey] = useState<string>('');

  // Load state from localStorage on initial render
  useEffect(() => {
    const savedClasses = localStorage.getItem('aca_classes');
    const savedEvents = localStorage.getItem('aca_events');
    const savedSources = localStorage.getItem('aca_sources');
    const savedFlashcards = localStorage.getItem('aca_flashcards');
    const savedObjectives = localStorage.getItem('aca_objectives');
    const savedFeeds = localStorage.getItem('aca_ical_feeds');
    const savedLastSync = localStorage.getItem('aca_last_sync');
    const savedTheme = localStorage.getItem('aca_theme') || 'midnight';
    const savedKey = localStorage.getItem('aca_gemini_key') || '';
    
    let initialClasses: Class[] = [];
    if (savedClasses) {
      initialClasses = JSON.parse(savedClasses);
      setClasses(initialClasses);
    } else {
      const defaultClasses: Class[] = [
        { id: "phys-101", name: "Physics 101: Mechanics", color: "#38bdf8", credits: 4, code: "PHYS 101", instructor: "Dr. Henderson" },
        { id: "cs-201", name: "CS 201: Data Structures", color: "#8b5cf6", credits: 4, code: "CS 201", instructor: "Prof. Alan Turing" }
      ];
      initialClasses = defaultClasses;
      setClasses(defaultClasses);
    }

    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    } else {
      const today = new Date();
      const formatDay = (offset: number) => {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        return formatLocalDate(d);
      };

      const defaultEvents: AcademicEvent[] = [
        {
          id: "ev-1",
          classId: "phys-101",
          title: "Homework 1: Kinematics & Vector Math",
          date: formatDay(2),
          type: "assignment",
          weight: 5,
          totalScore: 100,
          startTime: "17:00",
          endTime: "18:00",
          materialUrl: "https://d2l.university.edu/d2l/lms/dropbox/user/folder_submit.d2l?db=84920",
          description: "Complete all 6 problems from Chapter 2 in the Physics Workbook. Submit your PDF work on the D2L portal before 11:59 PM.",
          completed: false
        },
        {
          id: "ev-2",
          classId: "cs-201",
          title: "Project 1: Linked Lists & Node Pointers",
          date: formatDay(5),
          type: "assignment",
          weight: 10,
          totalScore: 100,
          startTime: "23:59",
          materialUrl: "https://github.com/classroom/assignment-linked-lists",
          description: "Implement doubly-linked list with add, remove, and reverse operations in Java. Run test suite with JUnit.",
          completed: false
        },
        {
          id: "ev-3",
          classId: "phys-101",
          title: "Lab 2: Newton's Second Law & Incline Friction",
          date: formatDay(8),
          type: "assignment",
          weight: 5,
          totalScore: 50,
          materialUrl: "https://webassign.net/physics/newtons-laws-lab",
          description: "Perform sensor calibration and calculate acceleration on varying incline angles.",
          completed: false
        },
        {
          id: "ev-4",
          classId: "cs-201",
          title: "Quiz 1: Big-O & Complexity Analysis",
          date: formatDay(11),
          type: "quiz",
          weight: 5,
          totalScore: 25,
          startTime: "10:00",
          endTime: "10:50",
          materialUrl: "https://gradescope.com/courses/cs201/quizzes/quiz1",
          description: "Timed 50-minute quiz covering constant vs logarithmic vs linear time complexities.",
          completed: false
        }
      ];
      setEvents(defaultEvents);
    }

    if (savedSources) setSources(JSON.parse(savedSources));
    if (savedFlashcards) setFlashcards(JSON.parse(savedFlashcards));
    if (savedObjectives) setObjectives(JSON.parse(savedObjectives));
    
    // Ensure all feeds and classes with icalUrl are aligned
    let loadedFeeds: SavedICalFeed[] = savedFeeds ? JSON.parse(savedFeeds) : [];
    let feedsUpdated = false;

    // Check if any class has icalUrl but is missing from savedFeeds
    initialClasses.forEach(cls => {
      if (cls.icalUrl && cls.icalUrl.trim()) {
        const existing = loadedFeeds.find(f => f.classId === cls.id || f.url === cls.icalUrl);
        if (!existing) {
          loadedFeeds.push({
            id: Math.random().toString(36).substr(2, 9),
            name: `${cls.name} Feed`,
            url: cls.icalUrl.trim(),
            classId: cls.id,
            autoSync: true
          });
          feedsUpdated = true;
        } else if (!existing.classId) {
          existing.classId = cls.id;
          feedsUpdated = true;
        }
      }
    });

    setIcalFeeds(loadedFeeds);
    if (feedsUpdated) {
      localStorage.setItem('aca_ical_feeds', JSON.stringify(loadedFeeds));
    }

    if (savedLastSync) setLastGlobalSync(savedLastSync);
    if (savedKey) setGeminiKey(savedKey);
    
    setTheme(savedTheme);
    document.body.setAttribute('data-theme', savedTheme);

    // Initial background auto-sync for saved feeds
    if (loadedFeeds.length > 0) {
      setTimeout(() => {
        loadedFeeds.forEach(feed => {
          if (feed.autoSync) {
            axios.get(`/api/d2l?url=${encodeURIComponent(feed.url)}`).then(res => {
              const fetchedEvents = res.data.events || [];
              if (fetchedEvents.length > 0) {
                setEvents(prevEvents => {
                  const newEvs: AcademicEvent[] = [];
                  fetchedEvents.forEach((ev: any) => {
                    const exists = prevEvents.some(e => 
                      (e.title.toLowerCase() === ev.title.toLowerCase() && e.date === ev.date) ||
                      (ev.id && e.id === `ev-ical-${ev.id}`)
                    );
                    if (!exists) {
                      newEvs.push({
                        id: `ev-ical-${ev.id || Math.random().toString(36).substr(2, 9)}`,
                        title: ev.title,
                        classId: feed.classId || 'phys-101',
                        date: ev.date,
                        type: ev.title.toLowerCase().includes('quiz') ? 'quiz' : (ev.title.toLowerCase().includes('exam') || ev.title.toLowerCase().includes('test')) ? 'exam' : ev.type || 'assignment',
                        description: ev.description || '',
                        materialUrl: ev.location || undefined,
                        weight: 10,
                        totalScore: 100,
                        completed: false,
                        icalFeedId: feed.id
                      });
                    }
                  });
                  return newEvs.length > 0 ? [...prevEvents, ...newEvs] : prevEvents;
                });
              }
            }).catch(err => {
              console.error("Auto sync on load failed for feed:", feed.name, err);
            });
          }
        });
      }, 1000);
    }
  }, []);

  // Sync state to localStorage automatically
  useEffect(() => {
    localStorage.setItem('aca_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('aca_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('aca_sources', JSON.stringify(sources));
  }, [sources]);

  useEffect(() => {
    localStorage.setItem('aca_flashcards', JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    localStorage.setItem('aca_objectives', JSON.stringify(objectives));
  }, [objectives]);

  useEffect(() => {
    localStorage.setItem('aca_ical_feeds', JSON.stringify(icalFeeds));
  }, [icalFeeds]);

  useEffect(() => {
    if (lastGlobalSync) {
      localStorage.setItem('aca_last_sync', lastGlobalSync);
    }
  }, [lastGlobalSync]);

  useEffect(() => {
    localStorage.setItem('aca_theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('aca_gemini_key', geminiKey);
  }, [geminiKey]);

  // Default initializers for demo data if user opens fresh app
  useEffect(() => {
    if (classes.length > 0 && sources.length === 0) {
      let defaultSources: NotebookSource[] = [];
      classes.forEach(c => {
        defaultSources = [...defaultSources, ...generateDefaultSources(c.id, c.name)];
      });
      setSources(defaultSources);
    }
  }, [classes, sources]);

  useEffect(() => {
    if (classes.length > 0 && flashcards.length === 0) {
      let defaultFCs: Flashcard[] = [];
      classes.forEach(c => {
        defaultFCs = [...defaultFCs, ...generateDefaultFlashcards(c.id, c.name)];
      });
      setFlashcards(defaultFCs);
    }
  }, [classes, flashcards]);

  useEffect(() => {
    if (classes.length > 0 && objectives.length === 0) {
      let defaultObjs: CoreObjective[] = [];
      classes.forEach(c => {
        defaultObjs = [...defaultObjs, ...generateDefaultObjectives(c.id, c.name)];
      });
      setObjectives(defaultObjs);
    }
  }, [classes, objectives]);

  // Helper to ensure D2L materials & descriptions automatically convert into NotebookLM sources
  const syncEventToNotebookSource = useCallback((event: AcademicEvent) => {
    if (!event.classId) return;

    // If event has description or materialUrl, ensure NotebookSource exists
    if ((event.description && event.description.length > 10) || event.materialUrl) {
      const sourceId = `source-${event.id}`;
      setSources(prev => {
        const existingIdx = prev.findIndex(s => s.id === sourceId || (s.classId === event.classId && s.title === event.title));
        const newSourceContent = `${event.title} (${event.type.toUpperCase()})\nDue Date: ${event.date}\n${event.description || ''}\n${event.materialUrl ? `Link: ${event.materialUrl}` : ''}`;

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            content: newSourceContent,
            wordCount: newSourceContent.trim().split(/\s+/).length
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: sourceId,
              classId: event.classId,
              title: `${event.title} [D2L Item]`,
              type: event.materialUrl ? 'link' : 'd2l_material',
              content: newSourceContent,
              url: event.materialUrl,
              wordCount: newSourceContent.trim().split(/\s+/).length,
              addedAt: new Date().toISOString()
            }
          ];
        }
      });
    }
  }, []);

  const addClass = (cls: Omit<Class, 'id'>): string => {
    const classId = Math.random().toString(36).substr(2, 9);
    const newClass: Class = { ...cls, id: classId };
    setClasses(prev => [...prev, newClass]);
    
    // Auto-generate default sources, flashcards & objectives for new classes
    const defaultSources = generateDefaultSources(classId, cls.name);
    setSources(prev => [...prev, ...defaultSources]);

    const defaultFCs = generateDefaultFlashcards(classId, cls.name);
    setFlashcards(prev => [...prev, ...defaultFCs]);

    const defaultObjs = generateDefaultObjectives(classId, cls.name);
    setObjectives(prev => [...prev, ...defaultObjs]);

    // If icalUrl was provided, create/link SavedICalFeed and sync
    if (cls.icalUrl && cls.icalUrl.trim()) {
      const trimmedUrl = cls.icalUrl.trim();
      const feedId = Math.random().toString(36).substr(2, 9);
      const newFeed: SavedICalFeed = {
        id: feedId,
        name: `${cls.name} Feed`,
        url: trimmedUrl,
        classId: classId,
        autoSync: true
      };
      setIcalFeeds(prev => [...prev, newFeed]);
      setTimeout(() => {
        syncSingleICalFeed(newFeed).catch(err => console.error("Error initial syncing class feed:", err));
      }, 50);
    }

    return classId;
  };

  const addEvent = (event: Omit<AcademicEvent, 'id'>): string => {
    const eventId = Math.random().toString(36).substr(2, 9);
    const newEvent: AcademicEvent = { ...event, id: eventId };
    setEvents(prev => [...prev, newEvent]);

    // Auto-sync D2L / assignment materials into NotebookLM
    syncEventToNotebookSource(newEvent);

    return eventId;
  };

  const updateEvent = (updated: AcademicEvent) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
    syncEventToNotebookSource(updated);
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateClass = (updated: Class) => {
    setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));

    const trimmedUrl = updated.icalUrl?.trim();
    if (trimmedUrl) {
      setIcalFeeds(prev => {
        const existingIdx = prev.findIndex(f => f.classId === updated.id || f.url === trimmedUrl);
        if (existingIdx >= 0) {
          const newFeeds = [...prev];
          const prevFeed = newFeeds[existingIdx];
          const urlChanged = prevFeed.url !== trimmedUrl;
          newFeeds[existingIdx] = {
            ...prevFeed,
            name: `${updated.name} Feed`,
            url: trimmedUrl,
            classId: updated.id
          };
          if (urlChanged) {
            setTimeout(() => {
              syncSingleICalFeed(newFeeds[existingIdx]).catch(e => console.error(e));
            }, 50);
          }
          return newFeeds;
        } else {
          const newFeed: SavedICalFeed = {
            id: Math.random().toString(36).substr(2, 9),
            name: `${updated.name} Feed`,
            url: trimmedUrl,
            classId: updated.id,
            autoSync: true
          };
          setTimeout(() => {
            syncSingleICalFeed(newFeed).catch(e => console.error(e));
          }, 50);
          return [...prev, newFeed];
        }
      });
    } else {
      // If icalUrl was removed from class, update linked feeds
      setIcalFeeds(prev => prev.filter(f => f.classId !== updated.id));
    }
  };

  const deleteClass = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setEvents(prev => prev.filter(e => e.classId !== id)); 
    setSources(prev => prev.filter(s => s.classId !== id)); 
    setFlashcards(prev => prev.filter(f => f.classId !== id)); 
    setObjectives(prev => prev.filter(o => o.classId !== id));
    setIcalFeeds(prev => prev.filter(f => f.classId !== id));
  };

  const addSource = (source: Omit<NotebookSource, 'id' | 'addedAt'>) => {
    const newSource: NotebookSource = {
      ...source,
      id: Math.random().toString(36).substr(2, 9),
      addedAt: new Date().toISOString()
    };
    setSources(prev => [...prev, newSource]);
  };

  const deleteSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const addFlashcard = (fc: Omit<Flashcard, 'id'>) => {
    const newFC: Flashcard = {
      ...fc,
      id: Math.random().toString(36).substr(2, 9)
    };
    setFlashcards(prev => [...prev, newFC]);
  };

  const updateFlashcard = (updated: Flashcard) => {
    setFlashcards(prev => prev.map(f => f.id === updated.id ? updated : f));
  };

  const deleteFlashcard = (id: string) => {
    setFlashcards(prev => prev.filter(f => f.id !== id));
  };

  // Objectives & Guides methods
  const addObjective = (obj: Omit<CoreObjective, 'id' | 'createdAt'>): string => {
    const objId = Math.random().toString(36).substr(2, 9);
    const newObj: CoreObjective = {
      ...obj,
      id: objId,
      createdAt: new Date().toISOString()
    };
    setObjectives(prev => [...prev, newObj]);
    return objId;
  };

  const updateObjective = (updated: CoreObjective) => {
    setObjectives(prev => prev.map(o => o.id === updated.id ? updated : o));
  };

  const deleteObjective = (id: string) => {
    setObjectives(prev => prev.filter(o => o.id !== id));
  };

  const toggleObjectiveStep = (objectiveId: string, stepId: string) => {
    setObjectives(prev => prev.map(obj => {
      if (obj.id !== objectiveId) return obj;
      const updatedGuides = obj.guides.map(g => g.id === stepId ? { ...g, completed: !g.completed } : g);
      const allCompleted = updatedGuides.length > 0 && updatedGuides.every(g => g.completed);
      return {
        ...obj,
        guides: updatedGuides,
        completed: allCompleted
      };
    }));
  };

  const generateObjectiveForAssignment = (event: AcademicEvent): string => {
    const defaultSteps: CompletionStep[] = [
      { id: "s-1", title: `Read problem statement & D2L guidelines for ${event.title}`, completed: false },
      { id: "s-2", title: `Review related lecture notes and NotebookLM sources`, completed: false },
      { id: "s-3", title: `Draft initial solution & verify calculations/code`, completed: false },
      { id: "s-4", title: `Upload final deliverable PDF/ZIP to D2L drop box before ${event.date}`, completed: false }
    ];

    const objId = Math.random().toString(36).substr(2, 9);
    const newObj: CoreObjective = {
      id: objId,
      classId: event.classId,
      title: `Complete ${event.title} (${event.type.toUpperCase()})`,
      description: event.description || `Required ${event.type} for grade weight (${event.weight || 10}%). Target due date: ${event.date}.`,
      category: event.type === 'exam' || event.type === 'quiz' ? 'exam' : 'assignment',
      targetDate: event.date,
      completed: false,
      guides: defaultSteps,
      createdAt: new Date().toISOString()
    };

    setObjectives(prev => [...prev, newObj]);
    return objId;
  };

  // iCal / D2L Saved Feeds methods
  const addICalFeed = (feed: Omit<SavedICalFeed, 'id'>): SavedICalFeed => {
    const feedId = Math.random().toString(36).substr(2, 9);
    const newFeed: SavedICalFeed = { ...feed, id: feedId };
    setIcalFeeds(prev => [...prev, newFeed]);

    if (feed.classId && feed.url) {
      setClasses(clsPrev => clsPrev.map(c => c.id === feed.classId ? { ...c, icalUrl: feed.url } : c));
    }

    return newFeed;
  };

  const updateICalFeed = (updated: SavedICalFeed) => {
    setIcalFeeds(prev => prev.map(f => f.id === updated.id ? updated : f));
    if (updated.classId && updated.url) {
      setClasses(clsPrev => clsPrev.map(c => c.id === updated.classId ? { ...c, icalUrl: updated.url } : c));
    }
  };

  const deleteICalFeed = (id: string) => {
    setIcalFeeds(prev => {
      const targetFeed = prev.find(f => f.id === id);
      if (targetFeed && targetFeed.classId) {
        setClasses(clsPrev => clsPrev.map(c => c.id === targetFeed.classId ? { ...c, icalUrl: undefined } : c));
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const syncSingleICalFeed = async (feedOrId: string | SavedICalFeed): Promise<{ success: boolean; eventCount: number }> => {
    let feed: SavedICalFeed | undefined;
    if (typeof feedOrId === 'string') {
      feed = icalFeeds.find(f => f.id === feedOrId);
      if (!feed) {
        try {
          const raw = localStorage.getItem('aca_ical_feeds');
          if (raw) {
            const list: SavedICalFeed[] = JSON.parse(raw);
            feed = list.find(f => f.id === feedOrId);
          }
        } catch {}
      }
    } else {
      feed = feedOrId;
    }
    if (!feed) return { success: false, eventCount: 0 };

    try {
      const res = await axios.get(`/api/d2l?url=${encodeURIComponent(feed.url)}`);
      const fetchedEvents = res.data.events || [];
      
      let targetClassId = feed.classId;
      if (!targetClassId) {
        const matchingClass = classes.find(c => c.name.toLowerCase() === feed!.name.toLowerCase() || (c.icalUrl && c.icalUrl === feed!.url));
        if (!matchingClass) {
          targetClassId = addClass({ name: feed.name, color: '#ff8c00', credits: 3, icalUrl: feed.url });
        } else {
          targetClassId = matchingClass.id;
          if (matchingClass.icalUrl !== feed.url) {
            setClasses(prev => prev.map(c => c.id === matchingClass.id ? { ...c, icalUrl: feed!.url } : c));
          }
        }
      } else {
        // Ensure the linked class stores icalUrl
        setClasses(prev => prev.map(c => c.id === targetClassId ? { ...c, icalUrl: feed!.url } : c));
      }

      let addedCount = 0;
      const newEventsToAdd: AcademicEvent[] = [];

      setEvents(prevEvents => {
        fetchedEvents.forEach((ev: any) => {
          const exists = prevEvents.some(e => 
            (e.title.toLowerCase() === ev.title.toLowerCase() && e.date === ev.date) ||
            (ev.id && e.id === `ev-ical-${ev.id}`)
          );
          if (!exists) {
            const newEv: AcademicEvent = {
              id: `ev-ical-${ev.id || Math.random().toString(36).substr(2, 9)}`,
              title: ev.title,
              classId: targetClassId!,
              date: ev.date,
              type: ev.title.toLowerCase().includes('quiz') ? 'quiz' : (ev.title.toLowerCase().includes('exam') || ev.title.toLowerCase().includes('test') || ev.title.toLowerCase().includes('midterm')) ? 'exam' : ev.type || 'assignment',
              description: ev.description || '',
              materialUrl: ev.location || undefined,
              weight: 10,
              totalScore: 100,
              completed: false,
              icalFeedId: feed!.id
            };
            newEventsToAdd.push(newEv);
            addedCount++;
          }
        });
        return newEventsToAdd.length > 0 ? [...prevEvents, ...newEventsToAdd] : prevEvents;
      });

      // Synchronize added events to notebook sources
      newEventsToAdd.forEach(ev => {
        syncEventToNotebookSource(ev);
      });

      const nowStr = new Date().toISOString();
      const updatedFeed: SavedICalFeed = {
        ...feed,
        classId: targetClassId,
        lastSyncedAt: nowStr,
        eventCount: (feed.eventCount || 0) + addedCount
      };
      
      setIcalFeeds(prev => prev.map(f => f.id === updatedFeed.id ? updatedFeed : f));

      return { success: true, eventCount: fetchedEvents.length };
    } catch (err) {
      console.error(`Error syncing feed ${feed.name}:`, err);
      return { success: false, eventCount: 0 };
    }
  };

  const syncAllICalFeeds = async (): Promise<{ success: boolean; syncedEvents: number; errors: string[] }> => {
    if (icalFeeds.length === 0) return { success: true, syncedEvents: 0, errors: [] };

    setIsAutoSyncing(true);
    let totalEvents = 0;
    const errors: string[] = [];

    for (const feed of icalFeeds) {
      if (!feed.autoSync && feed.lastSyncedAt) continue;
      const res = await syncSingleICalFeed(feed.id);
      if (res.success) {
        totalEvents += res.eventCount;
      } else {
        errors.push(`Failed feed: ${feed.name}`);
      }
    }

    const nowStr = new Date().toISOString();
    setLastGlobalSync(nowStr);
    setIsAutoSyncing(false);
    return { success: errors.length === 0, syncedEvents: totalEvents, errors };
  };

  return (
    <AcademicContext.Provider value={{ 
      classes, 
      events, 
      sources,
      flashcards,
      objectives,
      icalFeeds,
      lastGlobalSync,
      isAutoSyncing,

      addClass, 
      addEvent,
      updateEvent,
      deleteEvent,
      updateClass,
      deleteClass,
      addSource,
      deleteSource,
      addFlashcard,
      updateFlashcard,
      deleteFlashcard,

      addObjective,
      updateObjective,
      deleteObjective,
      toggleObjectiveStep,
      generateObjectiveForAssignment,

      addICalFeed,
      updateICalFeed,
      deleteICalFeed,
      syncAllICalFeeds,
      syncSingleICalFeed,

      currentView,
      setCurrentView,
      theme,
      setTheme,
      geminiKey,
      setGeminiKey
    }}>
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (context === undefined) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
}
