"use client";

import { useEffect, useState } from "react";
import {
  COURSE_STORAGE_KEY,
  moveCourseStop,
  readCourse,
  type CourseStop,
} from "../course";

const empty: CourseStop[] = [];

/** Own the course's visit order and restore it on the same browser. */
export function useCourse() {
  const [stored, setStops] = useState<CourseStop[] | null>(null);
  useEffect(() => {
    let initial = empty;
    try {
      initial = readCourse(localStorage.getItem(COURSE_STORAGE_KEY));
    } catch {
      // Browsers can disable storage. The course is still editable this session.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser storage after hydration.
    setStops(initial);
  }, []);

  function update(edit: (stops: CourseStop[]) => CourseStop[]) {
    const current = stored ?? empty;
    const next = edit(current);
    if (next === current) return;
    setStops(next);
    try {
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the edit in memory when the browser denies persistent storage.
    }
  }

  function add(stop: CourseStop) {
    const { id, name, koreanName, area, category, image, lat, lng } = stop;
    update((stops) =>
      stops.some((entry) => entry.id === id)
        ? stops
        : [...stops, { id, name, koreanName, area, category, image, lat, lng }],
    );
  }

  return {
    stops: stored ?? empty,
    add,
    remove: (id: string) =>
      update((stops) => stops.filter((stop) => stop.id !== id)),
    move: (id: string, offset: -1 | 1) =>
      update((stops) => moveCourseStop(stops, id, offset)),
  };
}
