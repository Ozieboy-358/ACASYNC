"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Class, AcademicEvent } from './types';

interface AcademicContextType {
  classes: Class[];
  events: AcademicEvent[];
  addClass: (cls: Omit<Class, 'id'>) => void;
  addEvent: (event: Omit<AcademicEvent, 'id'>) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);

  useEffect(() => {
    const savedClasses = localStorage.getItem('aca_classes');
    const savedEvents = localStorage.getItem('aca_events');
    if (savedClasses) setClasses(JSON.parse(savedClasses));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
  }, []);

  useEffect(() => {
    localStorage.setItem('aca_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('aca_events', JSON.stringify(events));
  }, [events]);

  const addClass = (cls: Omit<Class, 'id'>) => {
    const newClass = { ...cls, id: Math.random().toString(36).substr(2, 9) };
    setClasses([...classes, newClass]);
  };

  const addEvent = (event: Omit<AcademicEvent, 'id'>) => {
    const newEvent = { ...event, id: Math.random().toString(36).substr(2, 9) };
    setEvents([...events, newEvent]);
  };

  return (
    <AcademicContext.Provider value={{ classes, events, addClass, addEvent }}>
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
