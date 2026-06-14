"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Class, AcademicEvent, NotebookSource, Flashcard } from './types';

// Helper to generate realistic sample study sources when a class is loaded or created
const generateDefaultSources = (classId: string, className: string): NotebookSource[] => {
  const name = className.toLowerCase();
  
  if (name.includes('phys')) {
    return [
      {
        id: `${classId}-syllabus`,
        classId,
        title: 'Physics 101 Syllabus',
        type: 'syllabus',
        content: `Advanced Physics (PHYS 101) Course Syllabus

Grading Weights & Breakdown:
- Midterm Examination: 30% of total grade.
- Final Examination: 45% of total grade.
- Lab Experiments (8 sessions): 15% of total grade.
- Weekly Homework & Worksheets: 10% of total grade.

Key Class Deadlines & Events:
- Midterm Exam is scheduled for October 14th in the Main Hall. It covers Chapters 1 through 5: Kinematics, Newton's Laws, Vectors, Work, and Mechanical Energy.
- Final Exam is scheduled for December 15th in Lecture Hall B. It is a cumulative exam covering Chapters 1 to 12.
- Lab Worksheets are due every Friday by 11:59 PM submitted online.

Course Policies & Office Hours:
- Office hours are held on Tuesday and Thursday from 2:00 PM to 4:00 PM in the Physics Building, Room 304.
- Late homework policy: 10% deduction per day, up to a maximum of 3 days. No credit given after 3 days.`,
        wordCount: 165,
        addedAt: new Date().toISOString()
      },
      {
        id: `${classId}-lecture1`,
        classId,
        title: 'Lecture 1: Kinematics & Forces',
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
        id: `${classId}-guide`,
        classId,
        title: 'Physics Midterm Study Sheet',
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
        title: 'CS 201: Data Structures Syllabus',
        type: 'syllabus',
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
        title: `${className} Course Syllabus`,
        type: 'syllabus',
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
        title: 'Lecture 1: Introductory Outline',
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
  const todayStr = new Date().toISOString().split('T')[0];
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
  addClass: (cls: Omit<Class, 'id'>) => string;
  addEvent: (event: Omit<AcademicEvent, 'id'>) => void;
  updateEvent: (event: AcademicEvent) => void;
  deleteEvent: (id: string) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  addSource: (source: Omit<NotebookSource, 'id' | 'addedAt'>) => void;
  deleteSource: (id: string) => void;
  addFlashcard: (fc: Omit<Flashcard, 'id'>) => void;
  updateFlashcard: (fc: Flashcard) => void;
  deleteFlashcard: (id: string) => void;
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
  const [currentView, setCurrentView] = useState<'calendar' | 'dashboard' | 'notebook'>('calendar');
  const [theme, setTheme] = useState<string>('midnight');
  const [geminiKey, setGeminiKey] = useState<string>('');

  useEffect(() => {
    const savedClasses = localStorage.getItem('aca_classes');
    const savedEvents = localStorage.getItem('aca_events');
    const savedSources = localStorage.getItem('aca_sources');
    const savedFlashcards = localStorage.getItem('aca_flashcards');
    const savedTheme = localStorage.getItem('aca_theme') || 'midnight';
    const savedKey = localStorage.getItem('aca_gemini_key') || '';
    
    if (savedClasses) setClasses(JSON.parse(savedClasses));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedSources) setSources(JSON.parse(savedSources));
    if (savedFlashcards) setFlashcards(JSON.parse(savedFlashcards));
    if (savedKey) setGeminiKey(savedKey);
    
    setTheme(savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
  }, []);

  // Sync state to local storage
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
    localStorage.setItem('aca_theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('aca_gemini_key', geminiKey);
  }, [geminiKey]);

  // Onboarding effect: Auto-generate default notebook sources and flashcards for existing classes
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

  const addClass = (cls: Omit<Class, 'id'>): string => {
    const classId = Math.random().toString(36).substr(2, 9);
    const newClass = { ...cls, id: classId };
    setClasses([...classes, newClass]);
    
    // Auto-generate default sources & flashcards for new classes
    const defaultSources = generateDefaultSources(classId, cls.name);
    setSources(prev => [...prev, ...defaultSources]);

    const defaultFCs = generateDefaultFlashcards(classId, cls.name);
    setFlashcards(prev => [...prev, ...defaultFCs]);
    return classId;
  };

  const addEvent = (event: Omit<AcademicEvent, 'id'>) => {
    const newEvent = { ...event, id: Math.random().toString(36).substr(2, 9) };
    setEvents([...events, newEvent]);
  };

  const updateEvent = (updated: AcademicEvent) => {
    setEvents(events.map(e => e.id === updated.id ? updated : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const updateClass = (updated: Class) => {
    setClasses(classes.map(c => c.id === updated.id ? updated : c));
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    setEvents(events.filter(e => e.classId !== id)); // Clean up events for deleted class
    setSources(prev => prev.filter(s => s.classId !== id)); // Clean up sources for deleted class
    setFlashcards(prev => prev.filter(f => f.classId !== id)); // Clean up flashcards for deleted class
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

  return (
    <AcademicContext.Provider value={{ 
      classes, 
      events, 
      sources,
      flashcards,
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

