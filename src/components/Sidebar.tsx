"use client";

import { useState, useEffect, useMemo } from "react";
import { useAcademic } from "@/lib/context";
import Modal from "./Modal";
import styles from "./Sidebar.module.css";
import { syncToGoogle, initGoogleApi } from "@/lib/googleApi";
import { Class, NotebookSource } from "@/lib/types";
import { formatUrl, getDomainFromUrl, renderTextWithLinks, formatLocalDate } from "@/lib/utils";
import axios from "axios";

export default function Sidebar() {
  const { 
    classes, 
    addClass, 
    updateClass, 
    deleteClass, 
    events, 
    addEvent, 
    objectives, 
    toggleObjectiveStep,
    addObjective, 
    deleteObjective,
    icalFeeds, 
    addICalFeed, 
    deleteICalFeed,
    syncAllICalFeeds,
    syncSingleICalFeed,
    isAutoSyncing,
    lastGlobalSync,
    sources,
    addSource,
    deleteSource,
    currentView, 
    setCurrentView,
    theme, 
    setTheme,
    geminiKey,
    isLoaded,
    resetToDefaultData,
    exportBackupData,
    importBackupData
  } = useAcademic();

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isD2LModalOpen, setIsD2LModalOpen] = useState(false);
  const [isFeedsModalOpen, setIsFeedsModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'objectives' | 'grades' | 'notebook'>('objectives');
  const [syllabusText, setSyllabusText] = useState("");
  const [isParsingSyllabus, setIsParsingSyllabus] = useState(false);

  // Materials & Document Viewer states
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");
  const [newMaterialType, setNewMaterialType] = useState<"pdf" | "note" | "syllabus" | "link">("pdf");
  const [newMaterialUrl, setNewMaterialUrl] = useState("");
  const [newMaterialContent, setNewMaterialContent] = useState("");
  const [materialFilter, setMaterialFilter] = useState<"all" | "pdf" | "note" | "syllabus" | "link">("all");
  const [activeReaderSource, setActiveReaderSource] = useState<NotebookSource | null>(null);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
  const [readerSearchQuery, setReaderSearchQuery] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Class add form state
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#8b5cf6");
  const [newNotebookUrl, setNewNotebookUrl] = useState("");
  const [newClassCredits, setNewClassCredits] = useState(3);
  const [newIcalUrl, setNewIcalUrl] = useState("");

  // Class edit form state
  const [editClassName, setEditClassName] = useState("");
  const [editClassColor, setEditClassColor] = useState("#8b5cf6");
  const [editNotebookUrl, setEditNotebookUrl] = useState("");
  const [editClassCredits, setEditClassCredits] = useState(3);
  const [editIcalUrl, setEditIcalUrl] = useState("");

  // D2L / iCal Feed form state
  const [d2lUrl, setD2lUrl] = useState("");
  const [d2lFeedName, setD2lFeedName] = useState("");
  const [d2lClassId, setD2lClassId] = useState("");
  const [d2lClassColor, setD2lClassColor] = useState("#38bdf8");
  const [d2lCredits, setD2lCredits] = useState(3);
  const [d2lInstructor, setD2lInstructor] = useState("");
  const [d2lAutoSync, setD2lAutoSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingClassFeed, setIsSyncingClassFeed] = useState(false);

  // Keep selectedClass synchronized with classes array
  useEffect(() => {
    if (selectedClass) {
      const refreshed = classes.find(c => c.id === selectedClass.id);
      if (refreshed && (refreshed.name !== selectedClass.name || refreshed.color !== selectedClass.color || refreshed.icalUrl !== selectedClass.icalUrl || refreshed.credits !== selectedClass.credits || refreshed.notebookUrl !== selectedClass.notebookUrl)) {
        setSelectedClass(refreshed);
      }
    }
  }, [classes, selectedClass]);

  // Objective form state inside class view
  const [isAddObjectiveOpen, setIsAddObjectiveOpen] = useState(false);
  const [newObjTitle, setNewObjTitle] = useState("");
  const [newObjDesc, setNewObjDesc] = useState("");
  const [newObjGuideSteps, setNewObjGuideSteps] = useState("");

  useEffect(() => {
    initGoogleApi();
  }, []);

  const handleSyncGoogle = async () => {
    await syncToGoogle(events);
  };

  const handleD2LSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d2lUrl.trim()) return;

    setIsSyncing(true);
    try {
      const feedName = d2lFeedName.trim() || "D2L Course Feed";
      const trimmedUrl = d2lUrl.trim();
      
      let targetClassId = d2lClassId;

      if (d2lClassId) {
        const targetCls = classes.find(c => c.id === d2lClassId);
        if (targetCls) {
          updateClass({ 
            ...targetCls, 
            icalUrl: trimmedUrl,
            color: d2lClassColor || targetCls.color,
            credits: d2lCredits || targetCls.credits,
            instructor: d2lInstructor.trim() || targetCls.instructor
          });
        }
      } else {
        // Create new class with the user's customized settings
        targetClassId = addClass({
          name: feedName,
          color: d2lClassColor || "#38bdf8",
          credits: d2lCredits || 3,
          instructor: d2lInstructor.trim() || undefined,
          icalUrl: trimmedUrl
        });
      }

      // Save iCal Feed so it automatically updates & saves import data
      const newFeed = addICalFeed({
        name: feedName,
        url: trimmedUrl,
        classId: targetClassId || undefined,
        autoSync: d2lAutoSync,
        lastSyncedAt: new Date().toISOString()
      });

      const res = await syncSingleICalFeed(newFeed);

      if (res.success) {
        setD2lUrl("");
        setD2lFeedName("");
        setD2lClassId("");
        setD2lClassColor("#38bdf8");
        setD2lCredits(3);
        setD2lInstructor("");
        setD2lAutoSync(true);
        setIsD2LModalOpen(false);
        alert(`✨ Successfully saved feed "${feedName}" & imported ${res.eventCount} assignments/materials!`);
      } else {
        alert("Saved feed, but failed to fetch initial data. Check the URL.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync D2L iCal feed. Please verify the link.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyllabusSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusText.trim()) return;

    setIsParsingSyllabus(true);
    try {
      if (geminiKey) {
        const prompt = `You are an academic syllabus parser. Analyze the syllabus text below and extract:
1. Course Name (e.g. "Linear Algebra", "Introduction to Biology")
2. Course Credits (as a number, e.g. 3 or 4. If not found, guess 3)
3. Course Color (a hexadecimal color code, e.g. "#8b5cf6", "#3b82f6", "#10b981", "#ff8c00")
4. All assignments, exams, quizzes, or materials, with their respective dates (YYYY-MM-DD format, default year 2026).
5. Core Learning Objectives & Step-by-step Guides to completion for each objective.

Format your reply strictly as a JSON object of this structure:
{
  "className": "...",
  "credits": 3,
  "color": "#...",
  "events": [
    {
      "title": "Assignment 1",
      "type": "assignment",
      "date": "2026-09-20",
      "startTime": "23:59",
      "weight": 5,
      "totalScore": 100,
      "description": "..."
    }
  ],
  "objectives": [
    {
      "title": "...",
      "description": "...",
      "guides": ["Step 1...", "Step 2..."]
    }
  ]
}

No markdown tags outside the JSON block.

Syllabus Text:
${syllabusText}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("Gemini API call failed");
        
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        const classId = addClass({
          name: parsed.className || "Syllabus Import",
          color: parsed.color || "#8b5cf6",
          credits: parsed.credits || 3
        });

        if (parsed.events && Array.isArray(parsed.events)) {
          parsed.events.forEach((ev: any) => {
            addEvent({
              classId,
              title: ev.title,
              date: ev.date,
              type: ev.type || "assignment",
              description: ev.description || "",
              weight: ev.weight || 5,
              totalScore: ev.totalScore || 100,
              startTime: ev.startTime || undefined,
              endTime: ev.endTime || undefined,
              completed: false
            });
          });
        }

        if (parsed.objectives && Array.isArray(parsed.objectives)) {
          parsed.objectives.forEach((obj: any) => {
            addObjective({
              classId,
              title: obj.title,
              description: obj.description || '',
              completed: false,
              guides: (obj.guides || []).map((stepText: string, idx: number) => ({
                id: `step-${idx}`,
                title: stepText,
                completed: false
              }))
            });
          });
        }

        alert(`Successfully imported "${parsed.className}" with ${parsed.events?.length || 0} events and core objectives!`);
        setIsSyllabusModalOpen(false);
        setSyllabusText("");
      } else {
        alert("Using smart offline generator for syllabus import.");
        
        const classId = addClass({
          name: "Syllabus Class (Offline)",
          color: "#0ea5e9",
          credits: 3
        });

        const today = new Date();
        const dates = [7, 14, 21, 30];
        const types: Array<'assignment'|'exam'|'quiz'> = ['assignment', 'quiz', 'assignment', 'exam'];
        const titles = ["Homework 1", "Syllabus Quiz", "Homework 2", "Midterm Exam"];
        const weights = [5, 10, 5, 25];

        dates.forEach((dOffset, idx) => {
          const date = new Date();
          date.setDate(today.getDate() + dOffset);
          addEvent({
            classId,
            title: titles[idx],
            date: formatLocalDate(date),
            type: types[idx],
            weight: weights[idx],
            totalScore: 100,
            completed: false
          });
        });

        alert("Successfully imported mock class with calendar schedule!");
        setIsSyllabusModalOpen(false);
        setSyllabusText("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse syllabus. Please verify text format.");
    } finally {
      setIsParsingSyllabus(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSyllabusText(text);
    };
    reader.readAsText(file);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      addClass({ 
        name: newClassName.trim(), 
        color: newClassColor,
        notebookUrl: newNotebookUrl.trim() || undefined,
        credits: newClassCredits,
        icalUrl: newIcalUrl.trim() || undefined
      });
      setNewClassName("");
      setNewNotebookUrl("");
      setNewIcalUrl("");
      setNewClassCredits(3);
      setIsClassModalOpen(false);
    }
  };

  const handleEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass && editClassName.trim()) {
      const updatedClass: Class = {
        ...selectedClass,
        name: editClassName.trim(),
        color: editClassColor,
        notebookUrl: editNotebookUrl.trim() || undefined,
        credits: editClassCredits,
        icalUrl: editIcalUrl.trim() || undefined
      };
      updateClass(updatedClass);
      setSelectedClass(updatedClass);
      setIsEditClassModalOpen(false);
    }
  };

  const handleCreateObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass && newObjTitle.trim()) {
      const stepsArray = newObjGuideSteps
        .split("\n")
        .filter(s => s.trim().length > 0)
        .map((s, idx) => ({
          id: `step-custom-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: s.trim(),
          completed: false
        }));

      addObjective({
        classId: selectedClass.id,
        title: newObjTitle.trim(),
        description: newObjDesc.trim(),
        completed: false,
        guides: stepsArray.length > 0 ? stepsArray : [
          { id: "s1", title: "Review lecture notes & D2L materials", completed: false },
          { id: "s2", title: "Draft solution & submit on D2L", completed: false }
        ]
      });

      setNewObjTitle("");
      setNewObjDesc("");
      setNewObjGuideSteps("");
      setIsAddObjectiveOpen(false);
    }
  };

  const handleMaterialFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;

    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const title = newMaterialTitle.trim() || fileNameWithoutExt;
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const type = isPdf ? 'pdf' : file.name.toLowerCase().endsWith('.docx') ? 'pdf' : 'note';

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const content = text.trim() || `${title} (Uploaded File)\nFilename: ${file.name}`;
      const wordCount = content.split(/\s+/).filter(Boolean).length;

      addSource({
        classId: selectedClass.id,
        title,
        type,
        content,
        url: newMaterialUrl.trim() || undefined,
        wordCount: wordCount > 0 ? wordCount : 50
      });

      // Clear state and close modal
      setNewMaterialTitle("");
      setNewMaterialType("pdf");
      setNewMaterialUrl("");
      setNewMaterialContent("");
      setIsAddMaterialOpen(false);
      alert(`✨ Successfully uploaded and added "${title}" to ${selectedClass.name} materials!`);
    };
    reader.readAsText(file);
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !newMaterialTitle.trim()) return;

    const content = newMaterialContent.trim() || `${newMaterialTitle}\n${newMaterialUrl ? `Link: ${newMaterialUrl}` : ''}`;
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    addSource({
      classId: selectedClass.id,
      title: newMaterialTitle.trim(),
      type: newMaterialType,
      content,
      url: newMaterialUrl.trim() || undefined,
      wordCount: wordCount > 0 ? wordCount : 20
    });

    setNewMaterialTitle("");
    setNewMaterialType("pdf");
    setNewMaterialUrl("");
    setNewMaterialContent("");
    setIsAddMaterialOpen(false);
  };

  // Class materials and sources
  const classSources = useMemo(() => {
    if (!selectedClass) return [];
    return sources.filter(s => s.classId === selectedClass.id);
  }, [sources, selectedClass]);

  const allMaterialsCount = classSources.length;
  const pdfCount = classSources.filter(s => s.type === 'pdf').length;
  const noteCount = classSources.filter(s => s.type === 'note').length;
  const syllabusCount = classSources.filter(s => s.type === 'syllabus').length;
  const linkCount = classSources.filter(s => s.type === 'link' || s.type === 'd2l_material').length;

  const filteredMaterials = useMemo(() => {
    return classSources.filter(s => {
      if (materialFilter === 'all') return true;
      if (materialFilter === 'link') return s.type === 'link' || s.type === 'd2l_material';
      return s.type === materialFilter;
    });
  }, [classSources, materialFilter]);

  const classAssignments = events.filter(e => e.classId === selectedClass?.id && e.score !== undefined);
  const classObjectives = objectives.filter(o => o.classId === selectedClass?.id);

  const calculateGrade = () => {
    if (classAssignments.length === 0) return "N/A";
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    classAssignments.forEach(a => {
      if (a.score !== undefined && a.totalScore !== undefined && a.weight !== undefined) {
        totalWeightedScore += (a.score / a.totalScore) * a.weight;
        totalWeight += a.weight;
      }
    });

    if (totalWeight === 0) return "N/A";
    return Math.round((totalWeightedScore / totalWeight) * 100) + "%";
  };

  const getRelativeTimeString = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `${diffDays} days left`;
    if (diffDays === -1) return "Yesterday";
    return `${Math.abs(diffDays)} days ago`;
  };

  return (
    <>
      <aside className={`${styles.sidebar} glass`}>
        {selectedClass ? (
          <div className={styles.detailView}>
            <header className={styles.detailHeader}>
              <button className={styles.backBtn} onClick={() => setSelectedClass(null)}>&larr;</button>
              <h2 style={{ color: selectedClass.color }}>{selectedClass.name}</h2>
              <div className={styles.classActions}>
                <button 
                  className={styles.actionIconBtn} 
                  title="Edit Class" 
                  onClick={() => {
                    setEditClassName(selectedClass.name);
                    setEditClassColor(selectedClass.color);
                    setEditNotebookUrl(selectedClass.notebookUrl || "");
                    setEditClassCredits(selectedClass.credits || 3);
                    setEditIcalUrl(selectedClass.icalUrl || "");
                    setIsEditClassModalOpen(true);
                  }}
                >
                  ✏️
                </button>
                <button 
                  className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`} 
                  title="Delete Class" 
                  onClick={() => {
                    if (confirm(`Delete "${selectedClass.name}" and all its tasks/grades/objectives?`)) {
                      deleteClass(selectedClass.id);
                      setSelectedClass(null);
                    }
                  }}
                >
                  🗑️
                </button>
              </div>
            </header>

            {/* iCal Feed Status Banner */}
            <div className="glass" style={{ padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{selectedClass.icalUrl ? '📡' : '🔗'}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: selectedClass.icalUrl ? '#38bdf8' : 'var(--text-secondary)' }}>
                    {selectedClass.icalUrl ? 'iCal Auto-Sync Feed' : 'No iCal Feed Connected'}
                  </span>
                </div>
                {selectedClass.icalUrl ? (
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }} title={selectedClass.icalUrl}>
                    {getDomainFromUrl(selectedClass.icalUrl)} • {icalFeeds.find(f => f.classId === selectedClass.id || f.url === selectedClass.icalUrl)?.lastSyncedAt ? `Synced ${new Date(icalFeeds.find(f => f.classId === selectedClass.id || f.url === selectedClass.icalUrl)!.lastSyncedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to sync'}
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Connect D2L / Canvas feed to auto-sync tasks
                  </span>
                )}
              </div>
              {selectedClass.icalUrl ? (
                <button
                  onClick={async () => {
                    const feed = icalFeeds.find(f => f.classId === selectedClass.id || f.url === selectedClass.icalUrl);
                    setIsSyncingClassFeed(true);
                    if (feed) {
                      const res = await syncSingleICalFeed(feed);
                      setIsSyncingClassFeed(false);
                      alert(res.success ? `Synced ${res.eventCount} assignments for ${selectedClass.name}!` : "Failed to sync feed. Please check URL.");
                    } else {
                      const newFeed = addICalFeed({
                        name: `${selectedClass.name} Feed`,
                        url: selectedClass.icalUrl!,
                        classId: selectedClass.id,
                        autoSync: true
                      });
                      const res = await syncSingleICalFeed(newFeed);
                      setIsSyncingClassFeed(false);
                      alert(res.success ? `Synced ${res.eventCount} assignments for ${selectedClass.name}!` : "Failed to sync feed.");
                    }
                  }}
                  disabled={isSyncingClassFeed}
                  style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {isSyncingClassFeed ? 'Syncing...' : '🔄 Sync'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditClassName(selectedClass.name);
                    setEditClassColor(selectedClass.color);
                    setEditNotebookUrl(selectedClass.notebookUrl || "");
                    setEditClassCredits(selectedClass.credits || 3);
                    setEditIcalUrl(selectedClass.icalUrl || "");
                    setIsEditClassModalOpen(true);
                  }}
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Connect
                </button>
              )}
            </div>

            <div className={styles.tabs} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              <button 
                className={`${styles.tab} ${activeTab === 'objectives' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('objectives')}
                style={{ padding: '8px 4px', fontSize: '11px' }}
              >
                Objectives
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'materials' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('materials')}
                style={{ padding: '8px 4px', fontSize: '11px' }}
              >
                Materials
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'grades' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('grades')}
                style={{ padding: '8px 4px', fontSize: '11px' }}
              >
                Grades
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'notebook' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('notebook')}
                style={{ padding: '8px 4px', fontSize: '11px' }}
              >
                Notebook
              </button>
            </div>

            {/* Core Objectives & Completion Guides */}
            {activeTab === 'objectives' && (
              <div className={styles.objectivesView} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    CORE OBJECTIVES & GUIDES
                  </span>
                  <button 
                    onClick={() => setIsAddObjectiveOpen(true)}
                    style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + Add Objective
                  </button>
                </div>

                {classObjectives.map(obj => {
                  const completedSteps = obj.guides.filter(g => g.completed).length;
                  const totalSteps = obj.guides.length;
                  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                  return (
                    <div key={obj.id} className="glass" style={{ padding: '14px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: obj.completed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: obj.completed ? 'line-through' : 'none' }}>
                          {obj.title}
                        </h4>
                        <button 
                          onClick={() => deleteObjective(obj.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', padding: '0 4px' }}
                          title="Delete objective"
                        >
                          ✕
                        </button>
                      </div>

                      {obj.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.4 }}>
                          {obj.description}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          <span>Completion Guide</span>
                          <span>{percent}%</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
                        </div>
                      </div>

                      {/* Guide Steps checklist */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {obj.guides.map(g => (
                          <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: g.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                            <input 
                              type="checkbox"
                              checked={g.completed}
                              onChange={() => toggleObjectiveStep(obj.id, g.id)}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <span style={{ textDecoration: g.completed ? 'line-through' : 'none' }}>{g.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {classObjectives.length === 0 && (
                  <p className={styles.emptyMsg}>No core objectives added for this class yet. Click "+ Add Objective" above.</p>
                )}
              </div>
            )}

            {activeTab === 'materials' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className={styles.materialsHeaderRow}>
                  <span className={styles.materialsTitle}>Course Materials & Files</span>
                  <button 
                    onClick={() => setIsAddMaterialOpen(true)}
                    className={styles.addMaterialBtn}
                  >
                    + Add Material
                  </button>
                </div>

                {/* Filter pills */}
                <div className={styles.materialFilterRow}>
                  <button 
                    className={`${styles.materialFilterPill} ${materialFilter === 'all' ? styles.materialFilterPillActive : ''}`}
                    onClick={() => setMaterialFilter('all')}
                  >
                    All ({allMaterialsCount})
                  </button>
                  <button 
                    className={`${styles.materialFilterPill} ${materialFilter === 'pdf' ? styles.materialFilterPillActive : ''}`}
                    onClick={() => setMaterialFilter('pdf')}
                  >
                    📄 PDFs ({pdfCount})
                  </button>
                  <button 
                    className={`${styles.materialFilterPill} ${materialFilter === 'note' ? styles.materialFilterPillActive : ''}`}
                    onClick={() => setMaterialFilter('note')}
                  >
                    📝 Notes ({noteCount})
                  </button>
                  <button 
                    className={`${styles.materialFilterPill} ${materialFilter === 'syllabus' ? styles.materialFilterPillActive : ''}`}
                    onClick={() => setMaterialFilter('syllabus')}
                  >
                    📜 Syllabus ({syllabusCount})
                  </button>
                  <button 
                    className={`${styles.materialFilterPill} ${materialFilter === 'link' ? styles.materialFilterPillActive : ''}`}
                    onClick={() => setMaterialFilter('link')}
                  >
                    🌐 Links ({linkCount})
                  </button>
                </div>

                {/* Material Cards */}
                <div className={styles.materialsList}>
                  {filteredMaterials.map(m => {
                    const isPdf = m.type === 'pdf';
                    const isSyllabus = m.type === 'syllabus';
                    const isLink = m.type === 'link' || m.type === 'd2l_material';
                    const isNote = m.type === 'note';

                    const iconClass = isPdf ? styles.iconPdf : isNote ? styles.iconNote : isSyllabus ? styles.iconSyllabus : styles.iconLink;
                    const iconEmoji = isPdf ? '📄' : isNote ? '📝' : isSyllabus ? '📜' : '🌐';
                    const badgeLabel = isPdf ? 'PDF DOC' : isNote ? 'LECTURE NOTE' : isSyllabus ? 'SYLLABUS' : 'WEB LINK';

                    return (
                      <div key={m.id} className={`${styles.materialCard} glass`}>
                        <div className={styles.materialHeader}>
                          <div className={`${styles.materialIconBox} ${iconClass}`}>
                            {iconEmoji}
                          </div>
                          <div className={styles.materialInfo}>
                            <div className={styles.materialTitleRow}>
                              <h4 className={styles.materialName}>{m.title}</h4>
                              <span className={`${styles.materialBadge} ${iconClass}`}>
                                {badgeLabel}
                              </span>
                            </div>
                            <div className={styles.materialMeta}>
                              <span>{m.wordCount} words</span>
                              <span>•</span>
                              <span>~{Math.max(1, Math.ceil(m.wordCount / 280))} pg(s)</span>
                              {m.url && (
                                <>
                                  <span>•</span>
                                  <span title={m.url}>🔗 {getDomainFromUrl(m.url)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {m.content && (
                          <p className={styles.materialSnippet}>
                            {m.content.slice(0, 140)}...
                          </p>
                        )}

                        <div className={styles.materialActions}>
                          <button 
                            onClick={() => {
                              setActiveReaderSource(m);
                              setReaderSearchQuery("");
                              setIsReaderModalOpen(true);
                            }}
                            className={`${styles.actionBtnSmall} ${styles.btnReadDoc}`}
                            title="Read full document text"
                          >
                            👁️ View Doc
                          </button>

                          {m.url && (
                            <a 
                              href={formatUrl(m.url)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={`${styles.actionBtnSmall} ${styles.btnOpenUrl}`}
                              title="Open URL or external PDF in new tab"
                            >
                              {isPdf ? '📄 Open PDF ↗' : '🔗 Open Link ↗'}
                            </a>
                          )}

                          <button 
                            onClick={() => {
                              localStorage.setItem('aca_notebook_class_id', selectedClass.id);
                              setCurrentView('notebook');
                            }}
                            className={`${styles.actionBtnSmall} ${styles.btnAskAi}`}
                            title="Ask AI questions on this document"
                          >
                            ✨ Ask AI
                          </button>

                          <button 
                            onClick={() => deleteSource(m.id)}
                            className={styles.btnDeleteMaterial}
                            title="Delete Material"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredMaterials.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)' }}>
                      <p style={{ fontSize: '13px', marginBottom: '8px' }}>No materials matching "{materialFilter}" filter.</p>
                      <button 
                        onClick={() => setIsAddMaterialOpen(true)}
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 14px' }}
                      >
                        + Upload or Add File
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'grades' && (
              <div className={styles.gradeView}>
                <div className={`${styles.gradeInfo} glass`}>
                  <p className={styles.gradeLabel}>Current Grade</p>
                  <h3 className={styles.gradeValue}>{calculateGrade()}</h3>
                  <p className={styles.emptyMsg} style={{ fontSize: '11px', marginTop: '4px' }}>
                    Credits: {selectedClass.credits || 3}
                  </p>
                </div>
                <div className={styles.eventList} style={{ marginTop: '20px' }}>
                  {classAssignments.map(a => (
                    <div key={a.id} className={styles.eventItem} style={{ opacity: a.completed ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <span className={styles.eventDate}>
                          {a.score}/{a.totalScore} {a.completed && "✓"}
                        </span>
                        <p className={styles.eventTitle} style={{ textDecoration: a.completed ? 'line-through' : 'none' }}>
                          {a.title} ({a.weight}%)
                        </p>
                      </div>
                      {a.materialUrl && (
                        <a 
                          href={formatUrl(a.materialUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={styles.materialLink}
                          style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                          title="Open homework page"
                        >
                          🔗 Link ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notebook' && (
              <div className={styles.notebookView}>
                <div className={`${styles.notebookInfo} glass`}>
                  <div className={styles.notebookIcon}>📓</div>
                  <p className={styles.notebookText}>
                    Analyze your syllabus, D2L materials, and lecture notes for <strong>{selectedClass.name}</strong> using NotebookLM.
                  </p>
                  <button 
                    onClick={() => {
                      localStorage.setItem('aca_notebook_class_id', selectedClass.id);
                      setCurrentView('notebook');
                    }}
                    className="btn-primary"
                    style={{ marginTop: '16px', display: 'block', width: '100%', cursor: 'pointer' }}
                  >
                    Enter Class NotebookLM
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.logo}>
                <span className={styles.logoIcon}>A</span>
                <h1>AcaSync</h1>
              </div>
              <button 
                className={styles.mobileMenuToggle} 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>

            {/* View switcher buttons */}
            <div className={styles.viewSelector}>
              <button 
                className={`${styles.viewTab} ${currentView === 'calendar' ? styles.viewTabActive : ""}`} 
                onClick={() => {
                  setCurrentView('calendar');
                  setIsMobileMenuOpen(false);
                }}
              >
                📅 Calendar
              </button>
              <button 
                className={`${styles.viewTab} ${currentView === 'dashboard' ? styles.viewTabActive : ""}`} 
                onClick={() => {
                  setCurrentView('dashboard');
                  setIsMobileMenuOpen(false);
                }}
              >
                📊 Dashboard
              </button>
              <button 
                className={`${styles.viewTab} ${currentView === 'notebook' ? styles.viewTabActive : ""}`} 
                onClick={() => {
                  setCurrentView('notebook');
                  setIsMobileMenuOpen(false);
                }}
              >
                📓 NotebookLM
              </button>
            </div>

            <div className={`${styles.sidebarContent} ${isMobileMenuOpen ? styles.mobileOpen : ""}`}>
              <nav className={styles.nav}>
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Classes</h2>
                  <div className={styles.classList}>
                    {classes.map((cls) => (
                      <button 
                        key={cls.id} 
                        className={`${styles.classItem} glass-interactive`}
                        onClick={() => {
                          setSelectedClass(cls);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <span className={styles.classColor} style={{ backgroundColor: cls.color }}></span>
                        {cls.name}
                      </button>
                    ))}
                    {classes.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '12px 4px' }}>
                        <p className={styles.emptyMsg} style={{ marginBottom: '8px' }}>No classes currently loaded.</p>
                        <button 
                          type="button"
                          className="btn-primary"
                          onClick={resetToDefaultData}
                          style={{ fontSize: '11px', padding: '5px 12px', width: '100%', cursor: 'pointer' }}
                        >
                          ✨ Restore Demo Classes
                        </button>
                      </div>
                    )}
                  </div>
                  <button className={styles.addBtn} onClick={() => setIsClassModalOpen(true)}>
                    + Add Class
                  </button>
                </div>

                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Upcoming Assignments</h2>
                  <div className={styles.eventList}>
                    {events
                      .filter(e => e.type !== 'material' && !e.completed)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 5)
                      .map((event) => {
                        const relTime = getRelativeTimeString(event.date);
                        const isUrgent = relTime === "Today" || relTime === "Tomorrow" || relTime.includes("1 days left");
                        return (
                          <div key={event.id} className={styles.eventItem}>
                            <span className={styles.eventDate}>
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                            <p className={styles.eventTitle}>{event.title}</p>
                            <span className={`${styles.countdownBadge} ${isUrgent ? styles.countdownBadgeUrgent : ""}`}>
                              {relTime}
                            </span>
                          </div>
                        );
                      })}
                    {events.filter(e => e.type !== 'material' && !e.completed).length === 0 && (
                      <p className={styles.emptyMsg}>No upcoming assignments.</p>
                    )}
                  </div>
                </div>
              </nav>

              <div className={styles.footer}>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={() => setIsSyllabusModalOpen(true)} style={{ marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  AI Syllabus & Guide Import
                </button>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={() => setIsD2LModalOpen(true)} style={{ marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20m10-10H2" />
                  </svg>
                  Import D2L / iCal Feed
                </button>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={() => setIsFeedsModalOpen(true)} style={{ marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 11a9 9 0 0 1 9 9" />
                    <path d="M4 4a16 16 0 0 1 16 16" />
                    <circle cx="5" cy="19" r="1" />
                  </svg>
                  Manage iCal Feeds ({icalFeeds.length})
                </button>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={() => setIsBackupModalOpen(true)} style={{ marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Data Backup & Restore
                </button>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={handleSyncGoogle} style={{ marginBottom: '16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                  </svg>
                  Sync Google Cal
                </button>

                {/* Theme selector dots */}
                <div className={styles.themeContainer}>
                  <span className={styles.themeLabel}>Theme Accent</span>
                  <div className={styles.themeSelector}>
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotMidnight} ${theme === 'midnight' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('midnight')}
                      title="Midnight Purple"
                    />
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotCyberpunk} ${theme === 'cyberpunk' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('cyberpunk')}
                      title="Neon Cyberpunk"
                    />
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotSakura} ${theme === 'sakura' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('sakura')}
                      title="Sakura Rose"
                    />
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotOcean} ${theme === 'ocean' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('ocean')}
                      title="Deep Ocean"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Add Objective Modal inside Class View */}
      <Modal
        isOpen={isAddObjectiveOpen}
        onClose={() => setIsAddObjectiveOpen(false)}
        title="Add Core Objective & Guide"
      >
        <form onSubmit={handleCreateObjective} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Objective Title</label>
            <input 
              type="text"
              value={newObjTitle}
              onChange={(e) => setNewObjTitle(e.target.value)}
              placeholder="e.g. Master Binary Search Trees & Recursion"
              className={styles.input}
              required
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Description / Target Goal</label>
            <input 
              type="text"
              value={newObjDesc}
              onChange={(e) => setNewObjDesc(e.target.value)}
              placeholder="e.g. Prepare for midterm exam and programming project 2"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Completion Guide Steps (One step per line)</label>
            <textarea
              value={newObjGuideSteps}
              onChange={(e) => setNewObjGuideSteps(e.target.value)}
              placeholder={"Step 1: Read Chapter 3 notes on BST balancing\nStep 2: Solve practice problem set on D2L\nStep 3: Submit code repository"}
              className={styles.input}
              style={{ minHeight: '120px', resize: 'vertical' }}
            />
          </div>
          <button type="submit" className="btn-primary">Save Core Objective</button>
        </form>
      </Modal>

      {/* AI Syllabus Modal */}
      <Modal 
        isOpen={isSyllabusModalOpen} 
        onClose={() => setIsSyllabusModalOpen(false)} 
        title="AI Syllabus Scheduler & Objective Builder"
      >
        <form onSubmit={handleSyllabusSync} className={styles.form}>
          <p className={styles.instructionText}>
            Upload a syllabus document or paste its text. Gemini will extract the course, configure grade weights, schedule tests/assignments on your calendar, and create Core Objectives with Completion Guides!
          </p>
          <div className={styles.formGroup}>
            <label>Upload Syllabus file (.txt, .md)</label>
            <input 
              type="file" 
              accept=".txt,.md,.html" 
              onChange={handleFileUpload}
              className={styles.input}
              style={{ padding: '8px 0' }}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Or Paste Syllabus Text</label>
            <textarea 
              value={syllabusText} 
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste syllabus outline, schedule, and grade breakdown..."
              className={styles.input}
              style={{ minHeight: '180px', resize: 'vertical', fontFamily: 'inherit', padding: '10px' }}
              required
            />
          </div>
          <div className={styles.modalActions} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              className={styles.cancelBtn} 
              onClick={() => setIsSyllabusModalOpen(false)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'none', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isParsingSyllabus || !syllabusText.trim()}
              style={{ flex: 1 }}
            >
              {isParsingSyllabus ? "Processing via AI..." : "Build Schedule & Guides"}
            </button>
          </div>
        </form>
      </Modal>

      {/* D2L iCal Feed Sync & Auto-Save Modal */}
      <Modal 
        isOpen={isD2LModalOpen} 
        onClose={() => setIsD2LModalOpen(false)} 
        title="Import & Save D2L / iCal Subscription"
      >
        <form onSubmit={handleD2LSync} className={styles.form}>
          <p className={styles.instructionText}>
            Paste your D2L or Canvas iCal subscription URL below. Customize course color, credits, and auto-sync options before saving.
          </p>
          <div className={styles.formGroup}>
            <label>Course / Feed Name</label>
            <input 
              type="text" 
              value={d2lFeedName} 
              onChange={(e) => setD2lFeedName(e.target.value)}
              placeholder="e.g. CS 201: Data Structures"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>iCal Feed URL (webcal:// or https://)</label>
            <input 
              type="url" 
              value={d2lUrl} 
              onChange={(e) => setD2lUrl(e.target.value)}
              placeholder="https://.../feed.ics"
              className={styles.input}
              required
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Link to Existing Class (Optional)</label>
            <select 
              value={d2lClassId} 
              onChange={(e) => {
                const cid = e.target.value;
                setD2lClassId(cid);
                if (cid) {
                  const match = classes.find(c => c.id === cid);
                  if (match) {
                    setD2lFeedName(match.name);
                    setD2lClassColor(match.color);
                    setD2lCredits(match.credits || 3);
                    setD2lInstructor(match.instructor || "");
                  }
                }
              }}
              className={styles.input}
            >
              <option value="">Create new class from this feed</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Customization Options */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '14px', borderRadius: '10px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🎨 Course & Sync Customization
            </span>
            
            <div className={styles.row}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label>Course Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="color" 
                    value={d2lClassColor} 
                    onChange={(e) => setD2lClassColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {['#38bdf8', '#4ade80', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c', '#e879f9'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setD2lClassColor(c)}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: c,
                          border: d2lClassColor === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.formGroup} style={{ width: '90px' }}>
                <label>Credits (GPA)</label>
                <input 
                  type="number" 
                  value={d2lCredits} 
                  min={0}
                  max={6}
                  onChange={(e) => setD2lCredits(parseFloat(e.target.value) || 0)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Instructor / Professor (Optional)</label>
              <input 
                type="text" 
                value={d2lInstructor} 
                onChange={(e) => setD2lInstructor(e.target.value)}
                placeholder="e.g. Dr. Alan Turing"
                className={styles.input}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>
              <input 
                type="checkbox" 
                checked={d2lAutoSync} 
                onChange={(e) => setD2lAutoSync(e.target.checked)} 
              />
              <span>Enable automatic background synchronization</span>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isSyncing} style={{ marginTop: '8px' }}>
            {isSyncing ? "Saving & Syncing Feed..." : "Save Feed & Sync Course"}
          </button>
        </form>
      </Modal>

      {/* Manage iCal Feeds Modal */}
      <Modal
        isOpen={isFeedsModalOpen}
        onClose={() => setIsFeedsModalOpen(false)}
        title="Saved iCal & D2L Feeds"
      >
        <div className={styles.form}>
          <p className={styles.instructionText}>
            These subscription feeds automatically save and update your assignments every time you launch AcaSync.
          </p>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button 
              className="btn-primary" 
              onClick={async () => {
                const res = await syncAllICalFeeds();
                alert(`Refreshed ${icalFeeds.length} saved feeds! Total events synced: ${res.syncedEvents}`);
              }}
              disabled={isAutoSyncing || icalFeeds.length === 0}
              style={{ flex: 1 }}
            >
              {isAutoSyncing ? "Refreshing All Feeds..." : "Refresh All Feeds Now"}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
            {icalFeeds.map(feed => {
              const linkedClass = classes.find(c => c.id === feed.classId || (c.icalUrl && c.icalUrl === feed.url));
              return (
                <div key={feed.id} className="glass" style={{ padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{feed.name}</h4>
                    {linkedClass ? (
                      <p style={{ fontSize: '11px', color: linkedClass.color, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: linkedClass.color }}></span>
                        Class: <strong>{linkedClass.name}</strong>
                      </p>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        No class linked
                      </p>
                    )}
                    <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {feed.lastSyncedAt ? `Last synced: ${new Date(feed.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => syncSingleICalFeed(feed.id)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Sync
                    </button>
                    <button 
                      onClick={() => deleteICalFeed(feed.id)}
                      style={{ background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {icalFeeds.length === 0 && (
              <p className={styles.emptyMsg}>No saved iCal feeds yet. Click "Import D2L / iCal Feed" to add one.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Backup & Restore Modal */}
      <Modal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        title="Backup & Restore Academic Data"
      >
        <div className={styles.form}>
          <p className={styles.instructionText}>
            Safeguard your classes, assignments, guides, and study notes as a JSON backup, or restore data anytime.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="glass" style={{ padding: '14px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>📥 Export Full Backup</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Download a complete .json file containing all {classes.length} classes, {events.length} assignments, and notebook materials.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportBackupData());
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `acasync-backup-${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                style={{ fontSize: '12px', padding: '8px 14px' }}
              >
                ⬇️ Download Backup JSON
              </button>
            </div>

            <div className="glass" style={{ padding: '14px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>📤 Import Data Backup</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Upload a previously exported .json file to restore all your academic data.
              </p>
              <label className="glass-interactive" style={{ display: 'inline-block', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--card-border)' }}>
                📁 Choose Backup File (.json)
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      if (text) {
                        const success = importBackupData(text);
                        if (success) {
                          alert("Academic data restored successfully!");
                          setIsBackupModalOpen(false);
                        } else {
                          alert("Failed to parse backup file. Please make sure it is a valid AcaSync JSON backup.");
                        }
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>

            <div className="glass" style={{ padding: '14px', borderRadius: '10px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>🔄 Reset / Restore Sample Demo Classes</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Reload Physics 101 and CS 201 with full demo syllabi, schedules, guides, and flashcards.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset to default demo classes? This will replace current coursework with default sample classes.")) {
                    resetToDefaultData();
                    setIsBackupModalOpen(false);
                  }
                }}
                className="glass-interactive"
                style={{ fontSize: '12px', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
              >
                ✨ Reset to Demo Classes
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        title="Add New Class"
      >
        <form onSubmit={handleAddClass} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Class Name</label>
            <input 
              type="text" 
              value={newClassName} 
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Advanced Physics"
              className={styles.input}
              required
              autoFocus
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Credits (GPA)</label>
              <input 
                type="number" 
                value={newClassCredits} 
                min={0}
                max={6}
                onChange={(e) => setNewClassCredits(parseFloat(e.target.value) || 0)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Color</label>
              <input 
                type="color" 
                value={newClassColor} 
                onChange={(e) => setNewClassColor(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>iCal / D2L Feed URL (Optional)</label>
            <input 
              type="url" 
              value={newIcalUrl} 
              onChange={(e) => setNewIcalUrl(e.target.value)}
              placeholder="webcal://... or https://.../feed.ics"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>NotebookLM URL (Optional)</label>
            <input 
              type="url" 
              value={newNotebookUrl} 
              onChange={(e) => setNewNotebookUrl(e.target.value)}
              placeholder="Link to your specific notebook"
              className={styles.input}
            />
          </div>
          <button type="submit" className="btn-primary">Add Class</button>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditClassModalOpen} 
        onClose={() => setIsEditClassModalOpen(false)} 
        title="Edit Class Details"
      >
        <form onSubmit={handleEditClass} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Class Name</label>
            <input 
              type="text" 
              value={editClassName} 
              onChange={(e) => setEditClassName(e.target.value)}
              className={styles.input}
              required
              autoFocus
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Credits (GPA)</label>
              <input 
                type="number" 
                value={editClassCredits} 
                min={0}
                max={6}
                onChange={(e) => setEditClassCredits(parseFloat(e.target.value) || 0)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Color</label>
              <input 
                type="color" 
                value={editClassColor} 
                onChange={(e) => setEditClassColor(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>iCal / D2L Feed URL (Optional)</label>
            <input 
              type="url" 
              value={editIcalUrl} 
              onChange={(e) => setEditIcalUrl(e.target.value)}
              placeholder="webcal://... or https://.../feed.ics"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>NotebookLM URL (Optional)</label>
            <input 
              type="url" 
              value={editNotebookUrl} 
              onChange={(e) => setEditNotebookUrl(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </Modal>

      {/* Add Material Modal */}
      <Modal
        isOpen={isAddMaterialOpen}
        onClose={() => setIsAddMaterialOpen(false)}
        title={`Add Material to ${selectedClass?.name || 'Class'}`}
      >
        <form onSubmit={handleCreateMaterial} className={styles.form}>
          {/* Dropzone for local file upload */}
          <label className={styles.fileDropzone}>
            <input 
              type="file" 
              accept=".pdf,.txt,.md,.doc,.docx,.json,.csv"
              onChange={handleMaterialFileUpload}
              style={{ display: 'none' }}
            />
            <span className={styles.dropzoneIcon}>📁</span>
            <span className={styles.dropzoneText}>Click to upload file (.pdf, .txt, .md, .docx)</span>
            <span className={styles.dropzoneSubtext}>Auto-populates title and extracts document text</span>
          </label>

          <div className={styles.formGroup}>
            <label>Document Title</label>
            <input 
              type="text" 
              value={newMaterialTitle}
              onChange={(e) => setNewMaterialTitle(e.target.value)}
              placeholder="e.g. Physics Lab Manual 2.pdf, Lecture 1 Notes"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Material Type</label>
              <select 
                value={newMaterialType}
                onChange={(e: any) => setNewMaterialType(e.target.value)}
                className={styles.input}
              >
                <option value="pdf">📄 PDF Document</option>
                <option value="note">📝 Lecture Note / Doc</option>
                <option value="syllabus">📜 Course Syllabus</option>
                <option value="link">🌐 Web / D2L Link</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label>File / Web Link URL (Optional)</label>
              <input 
                type="url" 
                value={newMaterialUrl}
                onChange={(e) => setNewMaterialUrl(e.target.value)}
                placeholder="https://... D2L PDF link or web URL"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Document Content / Notes (for AI query & search)</label>
            <textarea 
              value={newMaterialContent}
              onChange={(e) => setNewMaterialContent(e.target.value)}
              placeholder="Paste or write the text contents of the document here. NotebookLM will index and query this text."
              className={styles.input}
              style={{ minHeight: '90px', resize: 'vertical' }}
            />
          </div>

          <button type="submit" className="btn-primary">Save Material</button>
        </form>
      </Modal>

      {/* Document Viewer Modal */}
      <Modal
        isOpen={isReaderModalOpen}
        onClose={() => {
          setIsReaderModalOpen(false);
          setActiveReaderSource(null);
        }}
        title={activeReaderSource ? `${activeReaderSource.title}` : "Document Viewer"}
      >
        {activeReaderSource && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header info */}
            <div className="glass" style={{ padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>
                  {activeReaderSource.type === 'pdf' ? '📄' : activeReaderSource.type === 'note' ? '📝' : activeReaderSource.type === 'syllabus' ? '📜' : '🌐'}
                </span>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                    {activeReaderSource.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    {activeReaderSource.wordCount} words • ~{Math.max(1, Math.ceil(activeReaderSource.wordCount / 280))} page(s)
                  </span>
                </div>
              </div>
              {activeReaderSource.url && (
                <a 
                  href={formatUrl(activeReaderSource.url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'underline' }}
                >
                  Open External Link ↗
                </a>
              )}
            </div>

            {/* In-doc search */}
            <input 
              type="text"
              value={readerSearchQuery}
              onChange={(e) => setReaderSearchQuery(e.target.value)}
              placeholder="🔍 Search inside document..."
              className={styles.input}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />

            {/* Content view */}
            <div 
              className="scroll-thin"
              style={{
                maxHeight: '360px',
                overflowY: 'auto',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
                lineHeight: 1.6,
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit'
              }}
            >
              {activeReaderSource.content ? (
                readerSearchQuery.trim() ? (
                  activeReaderSource.content.split(new RegExp(`(${readerSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((chunk, idx) => {
                    const isMatch = chunk.toLowerCase() === readerSearchQuery.toLowerCase();
                    return isMatch ? (
                      <mark key={idx} style={{ background: '#f59e0b', color: '#000', borderRadius: '2px', padding: '1px 3px' }}>
                        {chunk}
                      </mark>
                    ) : (
                      <span key={idx}>{chunk}</span>
                    );
                  })
                ) : (
                  renderTextWithLinks(activeReaderSource.content)
                )
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No preview text available for this document.</p>
              )}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText(activeReaderSource.content || '');
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className="glass-interactive"
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
              >
                {copySuccess ? '✓ Copied!' : '📋 Copy Text'}
              </button>

              <button 
                type="button"
                onClick={() => {
                  if (selectedClass) {
                    localStorage.setItem('aca_notebook_class_id', selectedClass.id);
                  }
                  setIsReaderModalOpen(false);
                  setCurrentView('notebook');
                }}
                className="btn-primary"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                ✨ Query in NotebookLM
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
