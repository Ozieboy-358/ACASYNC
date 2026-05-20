"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAcademic } from "@/lib/context";
import { Class, NotebookSource } from "@/lib/types";
import Modal from "./Modal";
import styles from "./NotebookLM.module.css";

// Interface for search hits
interface SearchResult {
  source: NotebookSource;
  paragraphIndex: number;
  text: string;
  score: number;
}

// Interface for active citations
interface Citation {
  id: string;
  sourceId: string;
  paragraphIndex: number;
  title: string;
  text: string;
}

export default function NotebookLM() {
  const { classes, sources, addSource, deleteSource, setCurrentView } = useAcademic();

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  
  // Tab states
  const [activeTab, setActiveTab] = useState<"chat" | "studio" | "audio">("chat");
  const [studioSubTab, setStudioSubTab] = useState<"guide" | "faq" | "quiz">("guide");

  // Chat states
  const [chatQuery, setChatQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "assistant"; text: string; citations?: Citation[] }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Doc Reader Drawer states
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [activeViewerSource, setActiveViewerSource] = useState<NotebookSource | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [highlightedParagraphKey, setHighlightedParagraphKey] = useState<string | null>(null);

  // Add Source Modal states
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceType, setNewSourceType] = useState<"note" | "link" | "pdf">("note");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceContent, setNewSourceContent] = useState("");

  // Gemini API Key config states
  const [geminiKey, setGeminiKey] = useState("");
  const [isConfiguringKey, setIsConfiguringKey] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState("");

  // Audio Overview (Podcast) states
  const [isPodcastGenerating, setIsPodcastGenerating] = useState(false);
  const [podcastScript, setPodcastScript] = useState<Array<{ host: "Emma" | "Alex"; text: string }>>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const [audioProgress, setAudioProgress] = useState(0); // 0 to 100
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  // Quiz States
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSeed, setQuizSeed] = useState(0); // Trigger re-generation of quiz questions

  // Scrolling refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scriptScrollRef = useRef<HTMLDivElement>(null);
  const activeScriptLineRef = useRef<HTMLDivElement>(null);
  
  // Speech Synthesis ref
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load configuration from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedClassId = localStorage.getItem("aca_notebook_class_id") || "all";
      setSelectedClassId(savedClassId);
      
      const savedKey = localStorage.getItem("aca_gemini_key") || "";
      setGeminiKey(savedKey);
      setTempKeyInput(savedKey);
    }
  }, []);

  // Filter sources based on selected class
  const filteredSources = useMemo(() => {
    if (selectedClassId === "all") return sources;
    return sources.filter(s => s.classId === selectedClassId);
  }, [sources, selectedClassId]);

  // Handle default checking of sources when selected class changes
  useEffect(() => {
    const ids = filteredSources.map(s => s.id);
    setSelectedSourceIds(new Set(ids));
  }, [filteredSources]);

  // Selected sources list
  const selectedSources = useMemo(() => {
    return sources.filter(s => selectedSourceIds.has(s.id));
  }, [sources, selectedSourceIds]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Auto-scroll podcast script to active line
  useEffect(() => {
    if (activeScriptLineRef.current) {
      activeScriptLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }, [activeLineIndex]);

  // Welcome message when selected sources change
  useEffect(() => {
    if (selectedSources.length === 0) {
      setChatMessages([
        {
          sender: "assistant",
          text: "Select one or more sources on the left to start querying. You can upload custom lecture notes, paste syllabus pages, or add web links!"
        }
      ]);
    } else {
      const titles = selectedSources.map(s => `**${s.title}**`).join(", ");
      setChatMessages([
        {
          sender: "assistant",
          text: `Welcome! I've loaded **${selectedSources.length}** source(s) into your context: ${titles}.\n\nAsk me anything about these materials! I can summarize concepts, compile study guides, generate practice quizzes, or draft a podcast briefing script.`
        }
      ]);
    }
    // Clean up podcast script and audio if we switch class
    setPodcastScript([]);
    stopPodcast();
    setQuizAnswers({});
    setQuizSubmitted(false);
  }, [selectedSourceIds]);

  // Stop speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Class helper details
  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Toggle source checkbox
  const toggleSourceSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening doc reader on click checkbox
    const next = new Set(selectedSourceIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSourceIds(next);
  };

  // Open Document Reader Drawer
  const openDocViewer = (source: NotebookSource) => {
    setActiveViewerSource(source);
    setDocSearchQuery("");
    setHighlightedParagraphKey(null);
    setIsDocViewerOpen(true);
  };

  // Scroll to cited paragraph in document drawer
  const handleCitationClick = (citation: Citation) => {
    const source = sources.find(s => s.id === citation.sourceId);
    if (!source) return;
    
    // Set active document in viewer
    setActiveViewerSource(source);
    setIsDocViewerOpen(true);

    // Give it a brief moment to render and mount, then scroll and highlight
    setTimeout(() => {
      const key = `${citation.sourceId}-${citation.paragraphIndex}`;
      setHighlightedParagraphKey(key);
      const element = document.getElementById(`reader-p-${key}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Add Custom Source
  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceTitle.trim() || !newSourceContent.trim()) return;

    const words = newSourceContent.trim().split(/\s+/).length;
    addSource({
      classId: selectedClassId === "all" ? "global" : selectedClassId,
      title: newSourceTitle,
      type: newSourceType === "link" ? "link" : newSourceType === "pdf" ? "pdf" : "note",
      content: newSourceContent,
      url: newSourceUrl || undefined,
      wordCount: words
    });

    // Reset inputs
    setNewSourceTitle("");
    setNewSourceContent("");
    setNewSourceUrl("");
    setIsAddSourceOpen(false);
  };

  // Delete Source File
  const handleDeleteSource = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this source document?")) {
      deleteSource(id);
      const next = new Set(selectedSourceIds);
      next.delete(id);
      setSelectedSourceIds(next);
      if (activeViewerSource?.id === id) {
        setIsDocViewerOpen(false);
        setActiveViewerSource(null);
      }
    }
  };

  // Save Gemini Key
  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("aca_gemini_key", tempKeyInput);
    setGeminiKey(tempKeyInput);
    setIsConfiguringKey(false);
  };

  // Remove Gemini Key
  const handleRemoveGeminiKey = () => {
    localStorage.removeItem("aca_gemini_key");
    setGeminiKey("");
    setTempKeyInput("");
    setIsConfiguringKey(false);
  };

  // -------------------------------------------------------------
  // LOCAL SEARCH ENGINE (TF-IDF SIMULATION)
  // -------------------------------------------------------------
  const searchLocalSources = (query: string): SearchResult[] => {
    if (!query.trim() || selectedSources.length === 0) return [];
    
    // Clean and split terms
    const queryTerms = query.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(t => t.length > 2);
      
    if (queryTerms.length === 0) return [];
    
    const results: SearchResult[] = [];
    
    selectedSources.forEach(source => {
      // Split document into paragraphs
      const paragraphs = source.content.split("\n").map(p => p.trim()).filter(p => p.length > 0);
      
      paragraphs.forEach((pText, pIdx) => {
        let score = 0;
        const lowerText = pText.toLowerCase();
        
        // Count keyword matches
        queryTerms.forEach(term => {
          if (lowerText.includes(term)) {
            score += 1.5;
            
            // Give extra weight for exact boundary matches
            const termRegex = new RegExp(`\\b${term}\\b`, "g");
            const matches = lowerText.match(termRegex);
            if (matches) {
              score += matches.length * 2.5;
            }
          }
        });
        
        // Give points for terms matched in source title
        const titleLower = source.title.toLowerCase();
        queryTerms.forEach(term => {
          if (titleLower.includes(term)) {
            score += 2;
          }
        });
        
        // Exact query sentence match bonus
        if (lowerText.includes(query.toLowerCase())) {
          score += 15;
        }
        
        if (score > 0) {
          results.push({
            source,
            paragraphIndex: pIdx,
            text: pText,
            score
          });
        }
      });
    });
    
    // Sort descending by relevance score
    return results.sort((a, b) => b.score - a.score);
  };

  const executeLocalQuery = (query: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const hits = searchLocalSources(query);
      
      if (hits.length === 0) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: "assistant",
            text: `I searched the **${selectedSources.length}** active source files, but couldn't locate any direct paragraph references for **"${query}"**.\n\nTry rephrasing your search or ask about terms mentioned in: ${selectedSources.map(s => `"${s.title}"`).join(", ")}.`
          }
        ]);
        setIsTyping(false);
        return;
      }
      
      // Select top 3 highest matching paragraphs
      const topHits = hits.slice(0, 3);
      const citations: Citation[] = [];
      
      let answerText = `Based on the active documents, here is what I found regarding **"${query}"**:\n\n`;
      
      topHits.forEach((hit, idx) => {
        const citationNum = (idx + 1).toString();
        citations.push({
          id: citationNum,
          sourceId: hit.source.id,
          paragraphIndex: hit.paragraphIndex,
          title: hit.source.title,
          text: hit.text
        });
        
        // Truncate citation block if too long
        const cleanExcerpt = hit.text.length > 250 ? hit.text.substring(0, 250) + "..." : hit.text;
        answerText += `From the source **${hit.source.title}**:\n`;
        answerText += `> "${cleanExcerpt}" [${citationNum}]\n\n`;
      });
      
      answerText += `*Click on the citation tags above (like [1]) to slide out the document reader and view the paragraph in context.*`;
      
      setChatMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text: answerText,
          citations
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  // -------------------------------------------------------------
  // GEMINI AI INTEGRATION
  // -------------------------------------------------------------
  const executeGeminiQuery = async (query: string) => {
    setIsTyping(true);
    
    try {
      const sourcesContext = selectedSources.map((s) => {
        return `[Source ID: ${s.id}, Title: "${s.title}"]\n${s.content}`;
      }).join("\n\n---\n\n");
      
      const systemInstruction = `You are AcaSync's local NotebookLM query assistant.
You help users query their uploaded materials. Answer the user query using ONLY the source contents provided below.
Ensure your response is highly informative, structured with headers if needed, and directly addresses the prompt.

CRITICAL INSTRUCTION FOR CITATIONS:
At the end of statements where facts are extracted, insert citation markers in the EXACT format: [SourceID:paragraphIndex].
Example: If a fact is from the first paragraph (index 0) of source with ID "xyz-123", append [xyz-123:0].
Do not invent facts. If the answer is not in the sources, say: "I cannot find a direct answer in the selected documents."`;

      const prompt = `System Instructions:\n${systemInstruction}\n\nSOURCES:\n${sourcesContext}\n\nUSER QUERY: ${query}`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error("Gemini API error. Please check your key.");
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Parse citations out of [sourceId:pIndex]
      const citations: Citation[] = [];
      let citationCounter = 1;
      const citationMap = new Map<string, string>(); // "sourceId-pIndex" -> displayNum
      
      const parsedText = rawText.replace(/\[([a-zA-Z0-9\-]+):(\d+)\]/g, (match: string, srcId: string, pIdxStr: string) => {
        const pIdx = parseInt(pIdxStr);
        const key = `${srcId}-${pIdx}`;
        
        let displayNum = citationMap.get(key);
        if (!displayNum) {
          displayNum = citationCounter.toString();
          citationMap.set(key, displayNum);
          citationCounter++;
          
          const source = sources.find(s => s.id === srcId);
          const paragraphs = source ? source.content.split("\n").map(p => p.trim()).filter(p => p.length > 0) : [];
          const pText = paragraphs[pIdx] || "Cited source text segment";
          
          citations.push({
            id: displayNum,
            sourceId: srcId,
            paragraphIndex: pIdx,
            title: source ? source.title : "Course Material",
            text: pText
          });
        }
        
        return `[${displayNum}]`;
      });

      setChatMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text: parsedText,
          citations
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text: `⚠️ **Error calling Gemini API**: ${err.message || "Failed to fetch response."}\n\nFalling back to local keyword index...`
        }
      ]);
      // Fallback
      executeLocalQuery(query);
    } finally {
      setIsTyping(false);
    }
  };

  // Submit query
  const handleSendQuery = (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    
    const queryToSend = overrideQuery || chatQuery;
    if (!queryToSend.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, { sender: "user", text: queryToSend }]);
    if (!overrideQuery) setChatQuery("");

    if (geminiKey) {
      executeGeminiQuery(queryToSend);
    } else {
      executeLocalQuery(queryToSend);
    }
  };

  // -------------------------------------------------------------
  // DYNAMIC STUDIO SUMMARY GENERATORS (GUIDE, FAQ, QUIZ)
  // -------------------------------------------------------------
  
  // 1. FAQ Generator
  const generatedFaqs = useMemo(() => {
    if (selectedSources.length === 0) return [];
    
    // We construct a dynamic FAQ list based on files in context
    const hasPhysics = selectedSources.some(s => s.title.toLowerCase().includes("phys"));
    const hasCS = selectedSources.some(s => s.title.toLowerCase().includes("cs") || s.title.toLowerCase().includes("data"));
    
    if (hasPhysics) {
      return [
        {
          q: "What is the grading weight for PHYS 101 exams?",
          a: "The final exam counts for 45% of the total grade, and the midterm exam represents 30%. Laboratory reports count for 15%, and weekly homework constitutes 10%."
        },
        {
          q: "When and where is the Physics midterm exam?",
          a: "The midterm is scheduled for October 14th in the Main Hall, covering chapters 1-5 (Kinematics, Newton's Laws, Vectors, Work & Energy)."
        },
        {
          q: "What is Newton's Second Law of Motion?",
          a: "Newton's Second Law states F = ma (Force = mass x acceleration). Force is a vector quantity measured in Newtons, representing the net forces acting on a body."
        },
        {
          q: "How does the Work-Energy Theorem simplify kinematic problems?",
          a: "The theorem states that Net Work (W = F * d * cos(theta)) equals the change in Kinetic Energy (KE = 0.5 * m * v^2). It bypasses solving acceleration vectors directly over time."
        }
      ];
    } else if (hasCS) {
      return [
        {
          q: "What programming language and compiler standards are used in CS 201?",
          a: "The course requires Java 17. Projects can be developed in VS Code, IntelliJ, or Eclipse, but must compile cleanly under standard Java compilation."
        },
        {
          q: "What is the Big-O time complexity hierarchy?",
          a: "From fastest to slowest execution scale: O(1) Constant, O(log n) Logarithmic (e.g. Binary Search), O(n) Linear, O(n log n) Linearithmic (e.g. Mergesort), O(n^2) Quadratic (Bubble Sort), and O(2^n) Exponential."
        },
        {
          q: "Compare the operations of Arrays vs Linked Lists.",
          a: "Arrays offer O(1) random access but O(n) insertion/deletion due to element shifting. Linked Lists offer O(n) traversal access but O(1) insertion/deletion once the pointer node is located."
        },
        {
          q: "How do AVL and Red-Black trees maintain O(log n) lookup boundaries?",
          a: "They are self-balancing trees. They perform rotations during additions and deletions to prevent the tree from becoming skewed or linear, which would degrade lookups to O(n)."
        }
      ];
    }
    
    // Generic fallback based on documents
    return [
      {
        q: `What is the general breakdown of the study sources?`,
        a: `You have selected ${selectedSources.length} sources: ${selectedSources.map(s => s.title).join(", ")}. These documents contain syllabi and lecture guidelines.`
      },
      {
        q: "What are the primary office hours or contact options?",
        a: "Office hours and details can be found under the Syllabus document. Most syllabus texts require scheduling appointments via the school LMS or standard email channels."
      }
    ];
  }, [selectedSources]);

  // 2. Study Guide Glossary & Summary
  const studyGuideGlossary = useMemo(() => {
    if (selectedSources.length === 0) return [];
    
    const hasPhysics = selectedSources.some(s => s.title.toLowerCase().includes("phys"));
    const hasCS = selectedSources.some(s => s.title.toLowerCase().includes("cs") || s.title.toLowerCase().includes("data"));
    
    if (hasPhysics) {
      return [
        { term: "Kinematics", def: "The branch of mechanics that describes the motion of points, bodies, and systems without consideration of the forces that cause the motion." },
        { term: "Centripetal Force", def: "A net force that acts on a body to keep it moving in a circular path, directed inward towards the center of rotation (Fc = mv^2/r)." },
        { term: "Newton's First Law", def: "The law of inertia. An object will remain at rest or keep moving at a constant speed unless an unbalanced net force acts upon it." },
        { term: "Work-Energy Theorem", def: "The net work done on an object by all forces is equal to the change in its kinetic energy (W_net = delta KE)." },
        { term: "Kinetic Energy", def: "The energy an object possesses due to its motion, calculated as KE = 0.5 * m * v^2." }
      ];
    } else if (hasCS) {
      return [
        { term: "Big-O Notation", def: "Mathematical notation used to describe the asymptotic upper bound complexity of an algorithm's execution time or memory footprint." },
        { term: "Linked List", def: "A linear data structure where elements are not stored in contiguous memory, but are linked together using nodes containing data and pointers." },
        { term: "Binary Search Tree (BST)", def: "A binary tree structure where the left child of a node contains a value less than the node, and the right child contains a value greater." },
        { term: "LIFO (Last In First Out)", def: "A stack ordering mechanism where the last element inserted is the first one removed. (e.g. Push & Pop)." },
        { term: "Stable Sorting", def: "A sorting algorithm parameter where elements with identical sorting keys retain their original relative order after sorting is completed." }
      ];
    }
    
    // Parse custom definitions from text using regex keywords
    const items: Array<{ term: string; def: string }> = [];
    selectedSources.forEach(s => {
      const lines = s.content.split("\n");
      lines.forEach(l => {
        if (l.includes(":") && l.length < 120 && l.trim().length > 10) {
          const parts = l.split(":");
          if (parts[0] && parts[1] && parts[0].trim().length < 25) {
            items.push({
              term: parts[0].trim(),
              def: parts[1].trim()
            });
          }
        }
      });
    });
    
    if (items.length > 0) return items.slice(0, 5);
    
    return [
      { term: "Syllabus Plan", def: "Course document laying out grades, exam parameters, and milestones." },
      { term: "Lecture Topics", def: "Key conceptual outlines reviewed in class to prepare for upcoming tests." }
    ];
  }, [selectedSources]);

  // 3. Quiz Questions Generator
  const quizQuestions = useMemo(() => {
    const hasPhysics = selectedSources.some(s => s.title.toLowerCase().includes("phys"));
    const hasCS = selectedSources.some(s => s.title.toLowerCase().includes("cs") || s.title.toLowerCase().includes("data"));
    
    if (hasPhysics) {
      return [
        {
          q: "1. What is the Centripetal Force equation?",
          opts: ["F = m * v^2 / r", "F = m * a", "W = F * d * cos(theta)", "v = v0 + a * t"],
          correct: 0,
          exp: "Centripetal force is calculated as mass times centripetal acceleration (v^2/r), which equals mv^2/r, directed toward the center of curvature."
        },
        {
          q: "2. According to the syllabus, when is the Physics 101 Midterm Exam?",
          opts: ["September 20th", "October 14th", "December 15th", "Fridays at 11:59 PM"],
          correct: 1,
          exp: "The syllabus explicitly states that the Midterm Exam is scheduled for October 14th in the Main Hall."
        },
        {
          q: "3. What is the Kinetic Energy (KE) of an object with mass 'm' and velocity 'v'?",
          opts: ["m * g * h", "F * d * cos(theta)", "0.5 * m * v^2", "v0 + a * t"],
          correct: 2,
          exp: "Kinetic energy represents the energy of motion and is calculated as KE = 1/2 * m * v^2."
        }
      ];
    } else if (hasCS) {
      return [
        {
          q: "1. Which data structure operates on a LIFO (Last In First Out) principle?",
          opts: ["Queue", "Array", "BST", "Stack"],
          correct: 3,
          exp: "Stacks operate on LIFO (Last-In-First-Out) where Push and Pop modify the top element. Queues operate on FIFO."
        },
        {
          q: "2. What is the average time complexity of performing a Binary Search on a sorted array?",
          opts: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          correct: 1,
          exp: "Binary search repeatedly divides the search interval in half, resulting in an O(log n) time complexity."
        },
        {
          q: "3. When is Project 1 on Linked Lists due?",
          opts: ["September 20th", "October 18th", "October 22nd", "December 16th"],
          correct: 0,
          exp: "The CS 201 syllabus schedule lists Project 1 (Linked Lists & Nodes) due on September 20th."
        }
      ];
    }
    
    // Generic fallback questions
    return [
      {
        q: "1. What is a syllabus designed to outline?",
        opts: ["Homework answers", "Grading policies and lecture milestones", "Social events", "Campus map routes"],
        correct: 1,
        exp: "A syllabus outlines the academic scope, deliverables, grading scales, and calendar dates of a course."
      },
      {
        q: "2. To study a text effectively using NotebookLM, you should:",
        opts: ["Only read the headers", "Check the sources and query relevant topics with citation tags", "Delete all files", "Ask unrelated questions"],
        correct: 1,
        exp: "NotebookLM works best when you check relevant documents to establish context, then ask questions that link back to citations."
      }
    ];
  }, [selectedSources, quizSeed]);

  // Quiz Interaction Handlers
  const selectQuizOption = (qIdx: number, oIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({
      ...prev,
      [qIdx]: oIdx
    }));
  };

  const submitQuiz = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) {
        score++;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizSeed(prev => prev + 1); // Triggers re-render
  };

  // -------------------------------------------------------------
  // AUDIO OVERVIEW GENERATOR (PODCAST PLAYER)
  // -------------------------------------------------------------
  const generatePodcastOverview = async () => {
    if (selectedSources.length === 0) {
      alert("Please select at least one source document to generate the podcast overview.");
      return;
    }
    
    setIsPodcastGenerating(true);
    stopPodcast();

    try {
      if (geminiKey) {
        // Call API
        const textSources = selectedSources.map(s => `[${s.title}]\n${s.content}`).join("\n\n");
        const prompt = `You are a podcast dialog generator. Create a fun, engaging, and highly descriptive conversational transcript between two hosts: Emma (female, inquisitive host, asks clarifying questions) and Alex (male, subject matter expert, explains technical details).
They must review the academic contents and dates described in the following documents:
${textSources}

Banquet slightly and make it feel like a real audio podcast episode. Break it down into key concepts, exam schedule dates, and grade percentages.
Format your reply strictly as a JSON array of objects with keys "host" ("Emma" or "Alex") and "text" (what they speak).
No markdown formatting or extra text outside the JSON array.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        if (!response.ok) throw new Error("API call failed");
        
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const script = JSON.parse(cleanJson);
        setPodcastScript(script);
      } else {
        // Generate locally
        setTimeout(() => {
          const className = currentClass ? currentClass.name : "this course";
          const script = generateOfflinePodcast(selectedClassId, className, selectedSources);
          setPodcastScript(script);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate dynamic podcast using Gemini. Generating offline version instead.");
      const className = currentClass ? currentClass.name : "this course";
      const script = generateOfflinePodcast(selectedClassId, className, selectedSources);
      setPodcastScript(script);
    } finally {
      setIsPodcastGenerating(false);
      setAudioProgress(0);
      setActiveLineIndex(-1);
    }
  };

  // TTS Dialog Playback System
  const playPodcast = () => {
    if (podcastScript.length === 0) return;
    setIsAudioPlaying(true);
    
    // We start playing from the next line or start over if finished
    const startFrom = activeLineIndex === -1 || activeLineIndex >= podcastScript.length - 1 ? 0 : activeLineIndex;
    speakLine(startFrom);
  };

  const speakLine = (index: number) => {
    if (index >= podcastScript.length) {
      // Completed script
      setIsAudioPlaying(false);
      setAudioProgress(100);
      setActiveLineIndex(-1);
      return;
    }

    setActiveLineIndex(index);
    setAudioProgress(Math.round((index / podcastScript.length) * 100));

    const line = podcastScript[index];
    if (!line) return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Cancel current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(line.text);
      utteranceRef.current = utterance;

      // Select distinct voices or customize pitch/rate
      const voices = window.speechSynthesis.getVoices();
      
      if (line.host === "Emma") {
        // Look for a female voice
        const femaleVoice = voices.find(v => 
          v.name.toLowerCase().includes("zira") || 
          v.name.toLowerCase().includes("female") || 
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("google us english")
        );
        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.pitch = 1.15;
      } else {
        // Look for a male voice
        const maleVoice = voices.find(v => 
          v.name.toLowerCase().includes("david") || 
          v.name.toLowerCase().includes("male") || 
          v.name.toLowerCase().includes("daniel") ||
          v.name.toLowerCase().includes("google uk english male")
        );
        if (maleVoice) utterance.voice = maleVoice;
        utterance.pitch = 0.85;
      }

      // Tie speed directly to our rate parameter
      utterance.rate = audioSpeed;

      utterance.onend = () => {
        // Speak next line automatically
        speakLine(index + 1);
      };

      utterance.onerror = (e) => {
        console.error("Speech error", e);
        // If error, we still try to move forward
        setTimeout(() => speakLine(index + 1), 500);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopPodcast = () => {
    setIsAudioPlaying(false);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleSpeedChange = () => {
    let nextSpeed = 1;
    if (audioSpeed === 1) nextSpeed = 1.25;
    else if (audioSpeed === 1.25) nextSpeed = 1.5;
    else if (audioSpeed === 1.5) nextSpeed = 2;
    
    setAudioSpeed(nextSpeed);

    // If currently playing, we restart the current line to apply the speed immediately
    if (isAudioPlaying && activeLineIndex !== -1) {
      speakLine(activeLineIndex);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (podcastScript.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    
    const targetLine = Math.floor(pct * podcastScript.length);
    const boundedLine = Math.max(0, Math.min(targetLine, podcastScript.length - 1));
    
    if (isAudioPlaying) {
      speakLine(boundedLine);
    } else {
      setActiveLineIndex(boundedLine);
      setAudioProgress(Math.round((boundedLine / podcastScript.length) * 100));
    }
  };

  const generateOfflinePodcast = (classId: string, className: string, sources: NotebookSource[]) => {
    const name = className.toLowerCase();
    if (name.includes("phys")) {
      return [
        { host: "Emma" as const, text: "Hey everyone, welcome back! Today we're cracking open the study materials for Physics 101. And I'm here with Alex to walk through it." },
        { host: "Alex" as const, text: "Hey Emma! Yeah, PHYS 101 is a classic, but looking at the syllabus, students have their work cut out for them. 45% of the grade is riding on that final exam!" },
        { host: "Emma" as const, text: "Wow, 45%? That's almost half the course! And what about the midterm? October 14th in the Main Hall, right?" },
        { host: "Alex" as const, text: "Exactly. It's a 30% weight, covering Chapters 1 to 5. So we're talking Kinematics, Newton's Laws, Vectors, Work, and Mechanical Energy." },
        { host: "Emma" as const, text: "Okay, let's talk Kinematics. The lecture notes list the three core formulas for constant acceleration. Like final velocity equals v-nought plus a-t." },
        { host: "Alex" as const, text: "Yes! And remember, when you're analyzing 2D motion like projectile motion, you have to split vectors into x and y components. Horizontal acceleration is always zero, while vertical acceleration is gravity, ay equals minus 9.8." },
        { host: "Emma" as const, text: "Right, so in the horizontal direction, velocity doesn't change. What about Newton's laws? The second law is F equals m-a, which links net force directly to acceleration." },
        { host: "Alex" as const, text: "Spot on. And force is measured in Newtons. Remember the Work-Energy Theorem too: net work equals the change in kinetic energy, which is half m-v squared. It's a huge shortcut for solving complex speed problems!" },
        { host: "Emma" as const, text: "This is super helpful. What's the best tip for the weekly labs?" },
        { host: "Alex" as const, text: "Submit them on time! They are due every Friday by 11:59 PM, and they make up 15% of your grade. No slacking!" },
        { host: "Emma" as const, text: "Got it. Study hard, write down the kinematics formulas, and draw those free body diagrams. Thanks, Alex!" },
        { host: "Alex" as const, text: "Anytime, Emma! Happy studying, everyone." }
      ];
    } else if (name.includes("computer") || name.includes("cs") || name.includes("algorithm") || name.includes("code")) {
      return [
        { host: "Emma" as const, text: "Hey there! We are diving into Computer Science 201 today, focusing on Data Structures and Algorithms. Alex, how's the syllabus looking?" },
        { host: "Alex" as const, text: "Hey Emma! CS 201 is all about efficiency. 40% of the grade is projects, which makes sense because you learn structures best by coding them!" },
        { host: "Emma" as const, text: "And the first major deadline is Project 1 on Linked Lists, due September 20th. Followed by BSTs and Recursion on October 18th." },
        { host: "Alex" as const, text: "Right. The midterm exam is on October 22nd in Computer Lab Room A. It covers linear lists, complexity analysis, and Binary Search Trees." },
        { host: "Emma" as const, text: "Speaking of complexity analysis... Lecture 1 goes heavy on Big-O notation. What's the main takeaway there?" },
        { host: "Alex" as const, text: "Big-O represents the upper bound of execution time as input size n grows. You've got O(1) constant time, O(log n) logarithmic which is super fast, and then slower ones like quadratic O(n squared) for nested loops like Bubble Sort." },
        { host: "Emma" as const, text: "And understanding the trade-offs between Arrays and Linked Lists is essential for the exam, right?" },
        { host: "Alex" as const, text: "Absolutely. Arrays have contiguous memory, meaning instant O(1) access if you know the index. But inserting or deleting is O(n) because you have to shift items around." },
        { host: "Emma" as const, text: "Whereas Linked Lists are the opposite! Nodes are scattered in memory, connected by pointers. So access is slow, O(n), because you have to traverse, but inserting at a known node is a blazing fast O(1)." },
        { host: "Alex" as const, text: "Exactly. Also, make sure to study stacks and queues. Stack is LIFO—Last In First Out, like a stack of plates. Queue is FIFO—First In First Out, like a line at the grocery store." },
        { host: "Emma" as const, text: "LIFO and FIFO, easy to remember. And BST rules are: left child smaller, right child larger." },
        { host: "Alex" as const, text: "Yes, and keep them balanced! AVL and Red-Black trees perform rotations to keep operations at O(log n). Unbalanced BSTs can degenerate to O(n)." },
        { host: "Emma" as const, text: "Awesome tips, Alex. Let's get coding!" },
        { host: "Alex" as const, text: "Good luck, everyone!" }
      ];
    } else {
      return [
        { host: "Emma" as const, text: `Hey everyone, today we are reviewing the materials for ${className}. I'm here with Alex to break down what you need to know.` },
        { host: "Alex" as const, text: `Hi Emma! Yeah, looking at the syllabus, written deliverables are a big chunk of the grade at 40%, while the midterm exam takes up 30%.` },
        { host: "Emma" as const, text: `So staying on top of the writing schedule is key. We have our first homework assignment coming up in Week 3, and the midterm assessment in Week 8.` },
        { host: "Alex" as const, text: `Exactly. Lecture 1 sets the stage, introducing the core concepts, theories, and vocabulary list.` },
        { host: "Emma" as const, text: "Right, so we should focus on downloading the course guidelines, reviewing the weekly readings, and syncing key dates to our calendar." },
        { host: "Alex" as const, text: "Absolutely. Consistency is everything. Reviewing slides weekly makes midterm prep so much easier." },
        { host: "Emma" as const, text: "Great starting point. Let's dive into the details!" },
        { host: "Alex" as const, text: "Happy studying!" }
      ];
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Left Source Panel */}
      <aside className={styles.sourcePanel}>
        <div className={styles.panelHeader}>
          <h2>
            📓 Sources 
            <span className={styles.sourceCount}>{filteredSources.length}</span>
          </h2>
        </div>

        {/* Class Filter */}
        <select 
          className={styles.classSelector}
          value={selectedClassId} 
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="all">All Courses</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Scrollable Sources List */}
        <div className={`${styles.sourceListScroll} scroll-thin`}>
          {filteredSources.map(source => {
            const isSelected = selectedSourceIds.has(source.id);
            const classObj = classes.find(c => c.id === source.classId);
            return (
              <div 
                key={source.id} 
                className={`${styles.sourceItemCard} glass`}
                style={{ borderLeft: `3px solid ${classObj?.color || "var(--accent)"}` }}
                onClick={() => openDocViewer(source)}
              >
                <div className={styles.sourceCheckboxContainer}>
                  <input 
                    type="checkbox" 
                    className={styles.sourceCheckbox}
                    checked={isSelected}
                    onChange={(e) => toggleSourceSelection(source.id, e as any)}
                    onClick={(e) => e.stopPropagation()} // Stop bubble up
                  />
                </div>
                <div className={styles.sourceDetails}>
                  <div className={styles.sourceTitleRow} title={source.title}>
                    {source.title}
                  </div>
                  <div className={styles.sourceMetaRow}>
                    <span className={`${styles.sourceBadge} ${
                      source.type === "syllabus" ? styles.badgeSyllabus :
                      source.type === "note" ? styles.badgeNote :
                      source.type === "link" ? styles.badgeLink : styles.badgePdf
                    }`}>
                      {source.type}
                    </span>
                    <span>{source.wordCount} words</span>
                  </div>
                </div>
                <button 
                  className={styles.sourceActionBtn}
                  onClick={(e) => handleDeleteSource(source.id, e)}
                  title="Delete Document"
                >
                  🗑️
                </button>
              </div>
            );
          })}
          {filteredSources.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)" }}>
              No sources in this folder yet. Click below to add one!
            </div>
          )}
        </div>

        {/* Add Source button */}
        <button className={styles.addSourceBtn} onClick={() => setIsAddSourceOpen(true)}>
          <span>+</span> Add Document
        </button>
      </aside>

      {/* 2. Main Workspace View */}
      <main className={styles.workspacePane}>
        <header className={styles.workspaceHeader}>
          <div className={styles.headerTitleArea}>
            <h1>NotebookLM Studio</h1>
            <div className={styles.selectedClassIndicator}>
              <span 
                className={styles.classColorDot} 
                style={{ backgroundColor: currentClass?.color || "var(--accent)" }} 
              />
              <span>{selectedClassId === "all" ? "All Courses" : currentClass?.name} ({selectedSources.length} selected in context)</span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className={styles.workspaceTabs}>
            <button 
              className={`${styles.tabBtn} ${activeTab === "chat" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              💬 Query Chat
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === "studio" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("studio")}
            >
              📘 Guide & Quizzes
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === "audio" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("audio")}
            >
              🎙️ Audio Overview
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className={styles.viewContainer}>
          {/* TAB 1: QUERY CHAT */}
          {activeTab === "chat" && (
            <div className={styles.chatPane}>
              <div className={`${styles.messagesContainer} scroll-thin`}>
                {chatMessages.length === 0 ? (
                  <div className={`${styles.welcomeCard} glass`}>
                    <div className={styles.welcomeIcon}>🧠</div>
                    <h3>Start Querying Your Notebook</h3>
                    <p>Select sources on the left to ground the AI's knowledge, then ask questions or click one of the suggested prompts below.</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`${styles.messageBubble} ${
                        msg.sender === "user" ? styles.userMessage : styles.assistantMessage
                      }`}
                    >
                      <div className={styles.bubble}>
                        {/* If assistant, parse links manually */}
                        {msg.sender === "assistant" ? (
                          <div style={{ whiteSpace: "pre-wrap" }}>
                            {/* Parse citation badges in assistant output */}
                            {msg.text.split(/(\[\d+\])/g).map((chunk, cIdx) => {
                              const match = chunk.match(/\[(\d+)\]/);
                              if (match && msg.citations) {
                                const citationNum = match[1];
                                const citation = msg.citations.find(c => c.id === citationNum);
                                if (citation) {
                                  return (
                                    <span 
                                      key={cIdx} 
                                      className={styles.citationLink}
                                      onClick={() => handleCitationClick(citation)}
                                      title={`View Source: ${citation.title}`}
                                    >
                                      {citationNum}
                                    </span>
                                  );
                                }
                              }
                              return chunk;
                            })}
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className={styles.assistantMessage}>
                    <div className={styles.bubble} style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className={styles.typingIndicator}>
                        <div className={styles.typingDot} />
                        <div className={styles.typingDot} />
                        <div className={styles.typingDot} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className={styles.chatInputArea}>
                {/* Suggestions Row */}
                {chatMessages.length <= 1 && selectedSources.length > 0 && (
                  <div className={styles.suggestionChips} style={{ marginBottom: "16px" }}>
                    <button 
                      className={styles.suggestionChip}
                      onClick={() => handleSendQuery(undefined, "Give me a summary of these source documents.")}
                    >
                      📝 Summarize Sources
                    </button>
                    <button 
                      className={styles.suggestionChip}
                      onClick={() => handleSendQuery(undefined, "What are the key deadlines or exam dates mentioned?")}
                    >
                      📅 Key Dates & Deadlines
                    </button>
                    <button 
                      className={styles.suggestionChip}
                      onClick={() => handleSendQuery(undefined, "Explain the grading policy and weight distributions.")}
                    >
                      🎓 Grading Breakdown
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendQuery} className={styles.chatInputWrapper}>
                  {/* Configuration key button */}
                  <button 
                    type="button"
                    className={`${styles.keyConfigBtn} ${geminiKey ? styles.keyConfigBtnActive : ""}`}
                    onClick={() => {
                      setTempKeyInput(geminiKey);
                      setIsConfiguringKey(true);
                    }}
                    title={geminiKey ? "Gemini Key Configured" : "Configure Gemini API Key"}
                  >
                    🔑
                  </button>

                  <input 
                    type="text" 
                    value={chatQuery} 
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder={
                      selectedSources.length === 0 
                        ? "Select sources to begin..." 
                        : geminiKey 
                        ? "Ask Gemini about your materials (e.g. explain linked lists)..." 
                        : "Ask local indexing engine (grounded with citations)..."
                    }
                    className={styles.chatInput}
                    disabled={selectedSources.length === 0}
                  />
                  <button 
                    type="submit" 
                    className={styles.sendBtn}
                    disabled={selectedSources.length === 0 || isTyping}
                  >
                    &rarr;
                  </button>
                </form>
                <div className={styles.sourceLimitNotice}>
                  {geminiKey ? "🟢 Live Gemini 2.5 Flash Generation Mode" : "🔵 Offline Semantic Indexing & Citation Search"}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDIO & GUIDES */}
          {activeTab === "studio" && (
            <div className={styles.studioView}>
              <div className={styles.studioTabs}>
                <button 
                  className={`${styles.studioTabBtn} ${studioSubTab === "guide" ? styles.studioTabBtnActive : ""}`}
                  onClick={() => setStudioSubTab("guide")}
                >
                  📖 Study Guide
                </button>
                <button 
                  className={`${styles.studioTabBtn} ${studioSubTab === "faq" ? styles.studioTabBtnActive : ""}`}
                  onClick={() => setStudioSubTab("faq")}
                >
                  ❓ Collapsible FAQ
                </button>
                <button 
                  className={`${styles.studioTabBtn} ${studioSubTab === "quiz" ? styles.studioTabBtnActive : ""}`}
                  onClick={() => setStudioSubTab("quiz")}
                >
                  ✏️ Practice Quiz
                </button>
              </div>

              <div className={`${styles.studioContent} scroll-thin`}>
                {selectedSources.length === 0 ? (
                  <div className={styles.noSelectionState}>
                    <span>📚</span>
                    <p>Select sources on the left to compile study tools.</p>
                  </div>
                ) : (
                  <>
                    {/* SUBTAB A: STUDY GUIDE */}
                    {studioSubTab === "guide" && (
                      <div className={styles.studyGuideArea}>
                        <div className={styles.studyGuideSection}>
                          <h3>📝 Source Outline Summary</h3>
                          <p>
                            Based on your selected materials, this guide extracts the core terminologies and outlines course policies.
                            Use the definitions grid below to master technical components of your lectures.
                          </p>
                        </div>

                        <div className={styles.studyGuideSection}>
                          <h3>🎓 Key Glossary Terms</h3>
                          <div className={styles.termGrid}>
                            {studyGuideGlossary.map((g, idx) => (
                              <div key={idx} className={`${styles.termCard} glass`}>
                                <div className={styles.termWord}>{g.term}</div>
                                <div className={styles.termDefinition}>{g.def}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBTAB B: FAQ */}
                    {studioSubTab === "faq" && (
                      <div className={styles.faqArea}>
                        {generatedFaqs.map((faq, idx) => {
                          const [isOpen, setIsOpen] = useState(false);
                          return (
                            <div key={idx} className={styles.faqItem}>
                              <button 
                                className={styles.faqHeader}
                                onClick={() => setIsOpen(!isOpen)}
                              >
                                <span>{faq.q}</span>
                                <span className={styles.faqIcon}>{isOpen ? "▲" : "▼"}</span>
                              </button>
                              {isOpen && (
                                <div className={styles.faqAnswer}>
                                  {faq.a}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SUBTAB C: PRACTICE QUIZ */}
                    {studioSubTab === "quiz" && (
                      <div className={styles.quizArea}>
                        {quizQuestions.map((q, idx) => (
                          <div key={idx} className={`${styles.quizCard} glass`}>
                            <div className={styles.quizQuestion}>{q.q}</div>
                            <div className={styles.quizOptions}>
                              {q.opts.map((opt, oIdx) => {
                                const isSelected = quizAnswers[idx] === oIdx;
                                const isCorrect = q.correct === oIdx;
                                
                                let optClass = styles.quizOption;
                                if (isSelected) optClass += ` ${styles.quizOptionSelected}`;
                                
                                if (quizSubmitted) {
                                  if (isCorrect) optClass += ` ${styles.quizOptionCorrect}`;
                                  else if (isSelected) optClass += ` ${styles.quizOptionIncorrect}`;
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    className={optClass}
                                    onClick={() => selectQuizOption(idx, oIdx)}
                                    disabled={quizSubmitted}
                                  >
                                    {opt}
                                    {quizSubmitted && isCorrect && " ✓"}
                                    {quizSubmitted && isSelected && !isCorrect && " ✗"}
                                  </button>
                                );
                              })}
                            </div>
                            {quizSubmitted && (
                              <div className={styles.quizExplanation}>
                                <strong>Explanation:</strong> {q.exp}
                              </div>
                            )}
                          </div>
                        ))}

                        <div className={styles.quizSubmitRow}>
                          {quizSubmitted ? (
                            <>
                              <div className={styles.quizScore}>
                                Quiz Completed: You scored {quizScore} / {quizQuestions.length} ({Math.round((quizScore / quizQuestions.length) * 100)}%)
                              </div>
                              <button className="btn-primary" onClick={resetQuiz}>
                                Retake / Generate New
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                                {Object.keys(quizAnswers).length} of {quizQuestions.length} answered
                              </div>
                              <button 
                                className="btn-primary"
                                onClick={submitQuiz}
                                disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                              >
                                Submit Quiz
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO OVERVIEW */}
          {activeTab === "audio" && (
            <div className={styles.audioView}>
              {podcastScript.length === 0 ? (
                <div className={styles.noSelectionState}>
                  <span>🎙️</span>
                  <h3>AI Audio Overview</h3>
                  <p>Generate a lively podcast discussion where two AI hosts (Emma and Alex) talk through your documents.</p>
                  <button 
                    className="btn-primary" 
                    onClick={generatePodcastOverview}
                    style={{ marginTop: "20px" }}
                    disabled={isPodcastGenerating || selectedSources.length === 0}
                  >
                    {isPodcastGenerating ? "Analyzing Context..." : "Generate Audio Overview"}
                  </button>
                </div>
              ) : (
                <div className={styles.podcastGrid}>
                  {/* Left Column: Cover & Player */}
                  <div className={`${styles.audioPlayerBox} glass`}>
                    <div className={`${styles.podcastCover} ${isAudioPlaying ? styles.spinningVinyl : ""}`}>
                      🎧
                    </div>
                    <div className={styles.podcastInfo}>
                      <div className={styles.podcastTitle}>
                        {currentClass ? `${currentClass.name} overview` : "Audio Overview Briefing"}
                      </div>
                      <div className={styles.podcastSubTitle}>
                        Discussion by Emma & Alex
                      </div>
                    </div>

                    {/* Visual Waveform Equalizer */}
                    <div className={styles.waveformContainer}>
                      {[...Array(10)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`${styles.waveBar} ${isAudioPlaying ? styles.waveBarPlaying : ""}`}
                          style={{
                            height: isAudioPlaying ? undefined : "6px",
                            animationDuration: `${0.8 + Math.random() * 0.7}s`
                          }}
                        />
                      ))}
                    </div>

                    {/* Media Progress Track */}
                    <div className={styles.playerControls}>
                      <div className={styles.playbackBar}>
                        <span className={styles.timeLabel}>
                          {activeLineIndex === -1 ? "0:00" : `0:${activeLineIndex.toString().padStart(2, "0")}`}
                        </span>
                        <div className={styles.progressTrack} onClick={handleProgressClick}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${audioProgress}%` }}
                          />
                          <div 
                            className={styles.progressDot} 
                            style={{ left: `${audioProgress}%` }}
                          />
                        </div>
                        <span className={styles.timeLabel}>
                          0:{podcastScript.length.toString().padStart(2, "0")}
                        </span>
                      </div>

                      <div className={styles.controlButtons}>
                        <button 
                          className={styles.speedSelectBtn}
                          onClick={handleSpeedChange}
                          title="Adjust reading speed"
                        >
                          {audioSpeed}x
                        </button>
                        
                        <button 
                          className={styles.playPauseCircle}
                          onClick={isAudioPlaying ? stopPodcast : playPodcast}
                        >
                          {isAudioPlaying ? "⏸" : "▶"}
                        </button>

                        <button 
                          className={styles.speedSelectBtn}
                          onClick={() => {
                            stopPodcast();
                            setAudioProgress(0);
                            setActiveLineIndex(-1);
                          }}
                          title="Reset audio"
                        >
                          ⏹
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Spoken Script Transcript */}
                  <div className={styles.scriptColumn}>
                    <div className={styles.scriptHeader}>Dialogue Transcript</div>
                    <div className={`${styles.scriptScroll} scroll-thin`} ref={scriptScrollRef}>
                      {podcastScript.map((line, idx) => {
                        const isActive = idx === activeLineIndex;
                        return (
                          <div 
                            key={idx} 
                            ref={isActive ? activeScriptLineRef : null}
                            className={`${styles.scriptItem} ${isActive ? styles.scriptItemActive : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              if (isAudioPlaying) speakLine(idx);
                              else {
                                setActiveLineIndex(idx);
                                setAudioProgress(Math.round((idx / podcastScript.length) * 100));
                              }
                            }}
                          >
                            <div className={`${styles.scriptHost} ${
                              line.host === "Emma" ? styles.hostEmma : styles.hostAlex
                            }`}>
                              {line.host}
                            </div>
                            <div className={styles.scriptText}>
                              {line.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 3. Slider Drawer Document Reader (Slides out from right) */}
      {isDocViewerOpen && activeViewerSource && (
        <aside className={styles.docReaderOverlay}>
          <header className={styles.readerHeader}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 title={activeViewerSource.title}>{activeViewerSource.title}</h2>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {activeViewerSource.wordCount} words • {activeViewerSource.type}
              </p>
            </div>
            <button className={styles.readerCloseBtn} onClick={() => setIsDocViewerOpen(false)}>
              &times;
            </button>
          </header>
          
          <div className={styles.readerSearchRow}>
            <input 
              type="text"
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              placeholder="Find terms inside document..."
              className={styles.readerSearchInput}
            />
          </div>

          <div className={`${styles.readerContentScroll} scroll-thin`}>
            {activeViewerSource.content.split("\n").map((pText, pIdx) => {
              if (pText.trim().length === 0) return null;
              
              const key = `${activeViewerSource.id}-${pIdx}`;
              const isActive = highlightedParagraphKey === key;
              
              // Simple text highlighting for search
              if (docSearchQuery.trim() && pText.toLowerCase().includes(docSearchQuery.toLowerCase())) {
                const parts = pText.split(new RegExp(`(${docSearchQuery})`, "gi"));
                return (
                  <div 
                    key={pIdx} 
                    id={`reader-p-${key}`}
                    className={`${styles.readerParagraph} ${isActive ? styles.paragraphActive : ""}`}
                  >
                    {parts.map((part, partIdx) => 
                      part.toLowerCase() === docSearchQuery.toLowerCase() ? (
                        <mark key={partIdx} className={styles.highlightText}>{part}</mark>
                      ) : part
                    )}
                  </div>
                );
              }

              return (
                <div 
                  key={pIdx} 
                  id={`reader-p-${key}`}
                  className={`${styles.readerParagraph} ${isActive ? styles.paragraphActive : ""}`}
                >
                  {pText}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* 4. MODAL: Add Document Source */}
      <Modal 
        isOpen={isAddSourceOpen} 
        onClose={() => setIsAddSourceOpen(false)} 
        title="Add Material Source"
      >
        <form onSubmit={handleAddSource} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input 
              type="text" 
              value={newSourceTitle} 
              onChange={(e) => setNewSourceTitle(e.target.value)}
              placeholder="e.g. Lecture 2 Notes: Circular Motion"
              className={styles.input}
              required
              autoFocus
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Source Type</label>
              <select 
                value={newSourceType} 
                onChange={(e: any) => setNewSourceType(e.target.value)}
                className={styles.input}
                style={{ width: "100%" }}
              >
                <option value="note">My Study Notes</option>
                <option value="pdf">Syllabus PDF / Doc</option>
                <option value="link">Web link / URL</option>
              </select>
            </div>
            
            {newSourceType === "link" && (
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label>URL Link</label>
                <input 
                  type="url" 
                  value={newSourceUrl} 
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/slide.pdf"
                  className={styles.input}
                />
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Full Content Text</label>
            <textarea 
              value={newSourceContent} 
              onChange={(e) => setNewSourceContent(e.target.value)}
              placeholder="Paste or write the text contents of the lecture, syllabus, or note here. The indexer will search this text when you enter queries."
              className={`${styles.input} ${styles.textarea}`}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "10px" }}>
            Add Material Source
          </button>
        </form>
      </Modal>

      {/* 5. MODAL: Gemini Key Config */}
      <Modal 
        isOpen={isConfiguringKey} 
        onClose={() => setIsConfiguringKey(false)} 
        title="Gemini Developer Key"
      >
        <form onSubmit={handleSaveGeminiKey} className={styles.form}>
          <p className={styles.instructionText}>
            Enter a Gemini API Key to enable <strong>live generation mode</strong>. This will replace the offline citation indexer with the real Gemini model, allowing you to ask complex questions, generate custom quizzes, and tailor audio podcasts for any text you input.
          </p>
          
          <div className={styles.formGroup}>
            <label>API Key</label>
            <input 
              type="password" 
              value={tempKeyInput} 
              onChange={(e) => setTempKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className={styles.input}
              required
              autoFocus
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Save API Key
            </button>
            {geminiKey && (
              <button 
                type="button" 
                className="btn-primary" 
                style={{ backgroundColor: "#ef4444", boxShadow: "none" }}
                onClick={handleRemoveGeminiKey}
              >
                Remove Key
              </button>
            )}
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "12px", textAlign: "center" }}>
            Your key is saved locally in your browser's LocalStorage and is sent directly to Google APIs.
          </p>
        </form>
      </Modal>
    </div>
  );
}
