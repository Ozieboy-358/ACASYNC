import { useState } from "react";
import { useAcademic } from "@/lib/context";
import { Class, AcademicEvent } from "@/lib/types";
import { formatUrl } from "@/lib/utils";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { classes, events, updateEvent, updateClass, objectives, toggleObjectiveStep, icalFeeds, syncAllICalFeeds, lastGlobalSync } = useAcademic();
  const [hypotheticalGrades, setHypotheticalGrades] = useState<Record<string, number>>({});
  const [targetGPA, setTargetGPA] = useState<string>("3.5");

  const getClassProjectedGradeData = (classId: string) => {
    const classEvents = events.filter(e => e.classId === classId && e.type !== 'material');
    if (classEvents.length === 0) return { percent: null, letter: "N/A", points: null };
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    classEvents.forEach(a => {
      if (a.weight !== undefined) {
        if (a.score !== undefined && a.totalScore !== undefined) {
          totalWeightedScore += (a.score / a.totalScore) * a.weight;
          totalWeight += a.weight;
        } else {
          const sliderVal = hypotheticalGrades[a.id] !== undefined ? hypotheticalGrades[a.id] : 85;
          totalWeightedScore += (sliderVal / 100) * a.weight;
          totalWeight += a.weight;
        }
      }
    });
    
    if (totalWeight === 0) return { percent: null, letter: "N/A", points: null };
    const percent = (totalWeightedScore / totalWeight) * 100;
    
    let points = 0.0;
    let letter = "F";
    if (percent >= 93) { points = 4.0; letter = "A"; }
    else if (percent >= 90) { points = 3.7; letter = "A-"; }
    else if (percent >= 87) { points = 3.3; letter = "B+"; }
    else if (percent >= 83) { points = 3.0; letter = "B"; }
    else if (percent >= 80) { points = 2.7; letter = "B-"; }
    else if (percent >= 77) { points = 2.3; letter = "C+"; }
    else if (percent >= 73) { points = 2.0; letter = "C"; }
    else if (percent >= 70) { points = 1.7; letter = "C-"; }
    else if (percent >= 67) { points = 1.3; letter = "D+"; }
    else if (percent >= 60) { points = 1.0; letter = "D"; }
    
    return { percent, letter, points };
  };

  const getGpaGoalRecommendation = () => {
    const targetVal = parseFloat(targetGPA);
    if (isNaN(targetVal) || targetVal < 0 || targetVal > 4.0) return "Please enter a valid target GPA between 0.0 and 4.0";
    
    let gradedCredits = 0;
    let gradedPointsSum = 0;
    let totalCreditsSum = 0;
    
    classes.forEach(cls => {
      const credits = cls.credits !== undefined ? cls.credits : 3;
      totalCreditsSum += credits;
      const actualGrade = getClassGradeData(cls.id);
      if (actualGrade.points !== null) {
        gradedCredits += credits;
        gradedPointsSum += actualGrade.points * credits;
      }
    });

    const currentGPA = gradedCredits > 0 ? (gradedPointsSum / gradedCredits) : 0;
    const remainingCredits = totalCreditsSum - gradedCredits;

    if (totalCreditsSum === 0) return "Add classes and credits to estimate.";
    
    if (remainingCredits === 0) {
      if (currentGPA >= targetVal) {
        return `Congratulations! Your current GPA of ${currentGPA.toFixed(2)} meets your target of ${targetVal.toFixed(2)}.`;
      } else {
        return `Your current GPA is ${currentGPA.toFixed(2)}, which is below your target of ${targetVal.toFixed(2)}. Add more classes to raise your GPA.`;
      }
    }

    const neededPoints = (targetVal * totalCreditsSum) - gradedPointsSum;
    const requiredAvgGpa = neededPoints / remainingCredits;

    if (requiredAvgGpa <= 0) {
      return `You've already secured enough grade points! You can average 0.0 (F) in your remaining ${remainingCredits} credits and still meet your target of ${targetVal.toFixed(2)}.`;
    }

    if (requiredAvgGpa > 4.0) {
      return `Mathematically impossible. To reach a ${targetVal.toFixed(2)} GPA, you would need a ${requiredAvgGpa.toFixed(2)} average in your remaining ${remainingCredits} credits. Consider lowering your target or taking more credits.`;
    }

    let recommendedLetter = "A";
    if (requiredAvgGpa <= 1.0) recommendedLetter = "D";
    else if (requiredAvgGpa <= 1.3) recommendedLetter = "D+";
    else if (requiredAvgGpa <= 1.7) recommendedLetter = "C-";
    else if (requiredAvgGpa <= 2.0) recommendedLetter = "C";
    else if (requiredAvgGpa <= 2.3) recommendedLetter = "C+";
    else if (requiredAvgGpa <= 2.7) recommendedLetter = "B-";
    else if (requiredAvgGpa <= 3.0) recommendedLetter = "B";
    else if (requiredAvgGpa <= 3.3) recommendedLetter = "B+";
    else if (requiredAvgGpa <= 3.7) recommendedLetter = "A-";

    return `To hit your target of ${targetVal.toFixed(2)}, you need to average at least a **${requiredAvgGpa.toFixed(2)} (${recommendedLetter})** in your remaining **${remainingCredits}** credits.`;
  };

  const getClassGradeData = (classId: string) => {
    const classEvents = events.filter(e => e.classId === classId && e.score !== undefined);
    if (classEvents.length === 0) return { percent: null, letter: "N/A", points: null, weightGraded: 0 };
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    classEvents.forEach(a => {
      if (a.score !== undefined && a.totalScore !== undefined && a.weight !== undefined) {
        totalWeightedScore += (a.score / a.totalScore) * a.weight;
        totalWeight += a.weight;
      }
    });
    
    if (totalWeight === 0) return { percent: null, letter: "N/A", points: null, weightGraded: 0 };
    const percent = (totalWeightedScore / totalWeight) * 100;
    
    let points = 0.0;
    let letter = "F";
    if (percent >= 93) { points = 4.0; letter = "A"; }
    else if (percent >= 90) { points = 3.7; letter = "A-"; }
    else if (percent >= 87) { points = 3.3; letter = "B+"; }
    else if (percent >= 83) { points = 3.0; letter = "B"; }
    else if (percent >= 80) { points = 2.7; letter = "B-"; }
    else if (percent >= 77) { points = 2.3; letter = "C+"; }
    else if (percent >= 73) { points = 2.0; letter = "C"; }
    else if (percent >= 70) { points = 1.7; letter = "C-"; }
    else if (percent >= 67) { points = 1.3; letter = "D+"; }
    else if (percent >= 60) { points = 1.0; letter = "D"; }
    
    return { percent, letter, points, weightGraded: totalWeight };
  };

  // Projected GPA
  let totalGradePoints = 0;
  let totalCredits = 0;
  
  classes.forEach(cls => {
    const { points } = getClassGradeData(cls.id);
    if (points !== null) {
      const credits = cls.credits !== undefined ? cls.credits : 3;
      totalGradePoints += points * credits;
      totalCredits += credits;
    }
  });
  
  const projectedGPA = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "N/A";

  // Study session statistics
  const studySessions = events.filter(e => 
    e.title.toLowerCase().includes("study session") || 
    (e.description && e.description.toLowerCase().includes("prepare for upcoming"))
  );
  const completedStudy = studySessions.filter(e => e.completed).length;
  const totalStudy = studySessions.length;

  // General tasks completion
  const totalTasks = events.filter(e => e.type !== 'material');
  const completedTasks = totalTasks.filter(e => e.completed).length;
  const taskCompletionRate = totalTasks.length > 0 ? Math.round((completedTasks / totalTasks.length) * 100) : 0;

  // Next upcoming tasks (excluding completed and study materials)
  const outstandingTasks = events
    .filter(e => e.type !== 'material' && !e.completed)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const handleCreditChange = (cls: Class, val: string) => {
    const credits = parseFloat(val);
    if (!isNaN(credits) && credits >= 0) {
      updateClass({
        ...cls,
        credits: credits
      });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Academic Dashboard</h1>
        <p>Real-time projections, course progression, and deliverables.</p>
      </header>

      {/* Analytics stats row */}
      <section className={styles.statsRow}>
        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: 'var(--accent)' }}>🎓</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{projectedGPA}</span>
            <span className={styles.statLabel}>Projected GPA</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: '#3b82f6' }}>🎯</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>
              {objectives.filter(o => o.completed).length} / {objectives.length}
            </span>
            <span className={styles.statLabel}>Core Objectives</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: '#fda4af' }}>📓</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{completedStudy} / {totalStudy}</span>
            <span className={styles.statLabel}>Study Sessions</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: '#10b981' }}>✓</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{taskCompletionRate}%</span>
            <span className={styles.statLabel}>Task Progress</span>
          </div>
        </div>
      </section>

      {/* Main split grid */}
      <div className={styles.mainGrid}>
        {/* Classes progression grid */}
        <section>
          <h2 className={styles.sectionTitle}>📚 Class Progression</h2>
          {classes.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📓</span>
              <p className={styles.emptyText}>Add some classes in the sidebar to start tracking grades!</p>
            </div>
          ) : (
            <div className={styles.classesGrid}>
              {classes.map(cls => {
                const gradeData = getClassGradeData(cls.id);
                const upcomingForClass = events
                  .filter(e => e.classId === cls.id && e.type !== 'material' && !e.completed)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 2);

                return (
                  <div key={cls.id} className={`${styles.classCard} glass`}>
                    <div className={styles.classHeader}>
                      <span className={styles.className} style={{ color: cls.color }}>{cls.name}</span>
                      <div className={styles.classCredits}>
                        <span>Credits:</span>
                        <input 
                          type="number" 
                          className={styles.creditsInput} 
                          value={cls.credits !== undefined ? cls.credits : 3} 
                          onChange={(e) => handleCreditChange(cls, e.target.value)}
                          min="0"
                          max="6"
                        />
                      </div>
                    </div>

                    <div className={styles.gradeContainer}>
                      <span className={styles.gradeValue}>
                        {gradeData.percent !== null ? `${Math.round(gradeData.percent)}%` : "—"}
                      </span>
                      <span className={styles.gradeLabel}>
                        Current Grade ({gradeData.letter})
                      </span>
                    </div>

                    {/* Syllabus progress weight indicator */}
                    <div className={styles.progressContainer}>
                      <div className={styles.progressLabelRow}>
                        <span>Grades Graded</span>
                        <span>{gradeData.weightGraded}% Weight</span>
                      </div>
                      <div className={styles.progressBarOuter}>
                        <div 
                          className={styles.progressBarInner} 
                          style={{ 
                            width: `${Math.min(gradeData.weightGraded, 100)}%`,
                            backgroundColor: cls.color 
                          }}
                        />
                      </div>
                    </div>

                    {/* Upcoming tasks specific to this class */}
                    <div className={styles.upcomingEventsList}>
                      <span className={styles.upcomingTitle}>Upcoming Tasks</span>
                      {upcomingForClass.map(event => (
                        <div key={event.id} className={styles.upcomingItem}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '170px' }}>
                            <span className={styles.upcomingName}>{event.title}</span>
                            {event.materialUrl && (
                              <a 
                                href={formatUrl(event.materialUrl)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ color: 'var(--accent, #38bdf8)', fontSize: '11px', textDecoration: 'none' }}
                                title="Open homework page"
                              >
                                🔗
                              </a>
                            )}
                          </div>
                          <span className={styles.upcomingDate}>
                            {new Date(event.date + "T12:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                      {upcomingForClass.length === 0 && (
                        <p className={styles.emptyMsg} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          No upcoming tasks.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Deliverables checklist section */}
        <section className={`${styles.feedPanel} glass`}>
          <h2 className={styles.sectionTitle}>📋 Priority Deliverables</h2>
          {outstandingTasks.length === 0 ? (
            <div className={styles.emptyState} style={{ border: 'none', padding: '20px' }}>
              <span className={styles.emptyIcon}>🎉</span>
              <p className={styles.emptyText}>All assignments are completed!</p>
            </div>
          ) : (
            <div className={styles.checklist}>
              {outstandingTasks.map(event => {
                const cls = classes.find(c => c.id === event.classId);
                return (
                  <div key={event.id} className={styles.checkItem}>
                    <input 
                      type="checkbox" 
                      className={styles.checkCheckbox} 
                      checked={!!event.completed}
                      onChange={(e) => {
                        updateEvent({
                          ...event,
                          completed: e.target.checked
                        });
                      }}
                    />
                    <div className={styles.checkTextContainer} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span className={styles.checkTitle}>{event.title}</span>
                        {event.materialUrl && (
                          <a 
                            href={formatUrl(event.materialUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.deliverableLink}
                            title="Open homework page"
                          >
                            🔗 Homework ↗
                          </a>
                        )}
                      </div>
                      <span className={styles.checkClass} style={{ color: cls?.color || "var(--accent)" }}>
                        {cls?.name || "D2L Sync"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Core Objectives & Completion Guides Roadmap */}
      <section className={`${styles.whatIfSection} glass`} style={{ marginBottom: '30px' }}>
        <h2 className={styles.sectionTitle}>🎯 Core Objectives & Completion Guides Roadmap</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '-10px', marginBottom: '15px' }}>
          Actionable step-by-step guides for mastering class goals and completing key assignments.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {objectives.slice(0, 6).map(obj => {
            const completedSteps = obj.guides.filter(g => g.completed).length;
            const totalSteps = obj.guides.length;
            const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            const cls = classes.find(c => c.id === obj.classId);

            return (
              <div key={obj.id} className="glass" style={{ padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${cls?.color || 'var(--accent)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: cls?.color || 'var(--accent)' }}>
                    {cls?.name || 'General'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {pct}% Complete
                  </span>
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: obj.completed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: obj.completed ? 'line-through' : 'none' }}>
                  {obj.title}
                </h4>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
                </div>
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
        </div>
      </section>

      {/* What-If GPA Calculator & Goal Planner */}
      <section className={`${styles.whatIfSection} glass`}>
        <h2 className={styles.sectionTitle}>🔮 What-If Calculator & GPA Planner</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '-10px', marginBottom: '15px' }}>
          Simulate future assignment grades to project course outcomes and plan your target GPA pathways.
        </p>

        <div className={styles.whatIfGrid}>
          {/* Left Column: Course Sliders */}
          <div className={styles.whatIfCol}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>Course Grade Simulators</h3>
            {classes.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Add some classes to simulate grades.</p>
            ) : (
              classes.map(cls => {
                const ungradedEvents = events.filter(e => e.classId === cls.id && e.type !== 'material' && e.score === undefined);
                const actualGrade = getClassGradeData(cls.id);
                const projectedGrade = getClassProjectedGradeData(cls.id);

                return (
                  <div key={cls.id} className={styles.whatIfClassCard}>
                    <div className={styles.whatIfHeader}>
                      <span className={styles.whatIfClassTitle} style={{ color: cls.color }}>{cls.name}</span>
                      <span className={styles.whatIfClassGrade}>
                        {actualGrade.percent !== null ? `${Math.round(actualGrade.percent)}%` : "—"} 
                        {projectedGrade.percent !== null && Math.round(projectedGrade.percent) !== Math.round(actualGrade.percent || 0) && (
                          <span style={{ color: 'var(--accent)', fontSize: '13px', marginLeft: '6px' }}>
                            ➔ Projected: {Math.round(projectedGrade.percent)}% ({projectedGrade.letter})
                          </span>
                        )}
                      </span>
                    </div>

                    {ungradedEvents.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No upcoming ungraded tasks for this class.</p>
                    ) : (
                      <div className={styles.sliderList}>
                        {ungradedEvents.map(event => {
                          const value = hypotheticalGrades[event.id] !== undefined ? hypotheticalGrades[event.id] : 85;
                          return (
                            <div key={event.id} className={styles.sliderItem}>
                              <div className={styles.sliderLabelRow}>
                                <span>{event.title} ({event.weight}% weight)</span>
                                <span>{value}%</span>
                              </div>
                              <div className={styles.sliderInputRow}>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={value}
                                  onChange={(e) => {
                                    setHypotheticalGrades(prev => ({
                                      ...prev,
                                      [event.id]: parseInt(e.target.value)
                                    }));
                                  }}
                                  className={styles.sliderRange}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: GPA Goal Planner */}
          <div className={styles.whatIfCol}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '5px' }}>GPA Goal Planner</h3>
            <div className={styles.gpaPlannerBox}>
              <div className={styles.plannerInputRow}>
                <div className={styles.plannerInputBox}>
                  <span className={styles.plannerInputLabel}>Current GPA</span>
                  <div className={styles.plannerInput} style={{ background: 'rgba(255,255,255,0.02)', border: 'none', display: 'flex', alignItems: 'center' }}>
                    {projectedGPA}
                  </div>
                </div>
                <div className={styles.plannerInputBox}>
                  <span className={styles.plannerInputLabel}>Target GPA Goal</span>
                  <input 
                    type="number" 
                    step="0.05" 
                    min="0.0" 
                    max="4.0" 
                    value={targetGPA} 
                    onChange={(e) => setTargetGPA(e.target.value)}
                    className={styles.plannerInput}
                  />
                </div>
              </div>

              <div className={styles.plannerResultBox}>
                <h4>AI Recommendation Pathway</h4>
                <div dangerouslySetInnerHTML={{ 
                  __html: getGpaGoalRecommendation()
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
