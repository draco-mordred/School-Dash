const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const COURSE_TOKEN_MAP = {
    PAE: ["PAE", "PEDIATRICS"],
    OBG: ["OBG", "OBSTETRICS", "OBSTETRICSANDGYNECOLOGY"],
    COM: ["COM", "COMMUNITY MEDICINE"],
    OPH: ["OPH", "OPHTHALMOLOGY"],
    ANE: ["ANE", "ANAESTHESIOLOGY", "ANAESTHESIA"],
    ORL: ["ORL", "ENT", "EAR NOSE AND THROAT"],
    RAD: ["RAD", "RADIOLOGY"],
    PSY: ["PSY", "PSYCHIATRY"],
};
function normalize(value) {
    return String(value ?? "").trim().toUpperCase();
}
function findCourseForCode(courses, code) {
    const target = normalize(code);
    return courses.find((course) => normalize(course.code) === target) ?? null;
}
function findCourseForName(courses, keywords) {
    const normalizedKeywords = keywords.map(normalize);
    return (courses.find((course) => {
        const name = normalize(course.name);
        return normalizedKeywords.some((keyword) => name.includes(keyword));
    }) ?? null);
}
export function resolve500LevelCourse(courses, code) {
    const exact = findCourseForCode(courses, code);
    if (exact)
        return exact;
    const fallback = findCourseForName(courses, COURSE_TOKEN_MAP[code] ?? []);
    return fallback ?? null;
}
function makePeriod(kind, startTime, endTime, courseCode = null, options = {}) {
    return {
        kind,
        startTime,
        endTime,
        courseCode,
        ...options,
    };
}
export function build500LevelTimetablePlan(clockPhase, courses = []) {
    const phase = (clockPhase || "phase1").toLowerCase();
    const buildPhase1 = () => DAYS.map((day) => {
        if (day === "Friday") {
            return {
                day,
                periods: [
                    makePeriod("course", "08:00", "10:00", "COM"), // 8am - 10am: COM
                    makePeriod("empty", "10:00", "12:00"), // 10am - 12pm: Break
                    makePeriod("empty", "12:00", "13:00"), // 12pm - 1pm: Blank
                    makePeriod("course", "13:00", "15:00", "OBG"), // 1pm - 3pm: OBG
                ],
            };
        }
        // Mon-Thurs
        return {
            day,
            periods: [
                makePeriod("course", "08:00", "10:00", "PAE"), // 8am - 10am: PAE
                makePeriod("clinical", "10:00", "13:00"), // 10am - 1pm: CLINICAL
                makePeriod("empty", "13:00", "13:30"), // 1pm - 1:30pm: Break
                makePeriod("course", "13:30", "15:00", "OBG"), // 1:30pm - 3pm: OBG
            ],
        };
    });
    const buildPhase2 = () => DAYS.map((day, index) => {
        const specialtyCode = ["OPH", "ANE", "ORL", "RAD", "PSY"][index] ?? "OPH";
        return {
            day,
            periods: [
                makePeriod("course", "08:00", "10:00", specialtyCode), // 8am - 10am: Specialty rotating
                makePeriod("clinical", "10:00", "12:00"), // 10am - 12pm: CLINICAL
                makePeriod("optional", "12:00", "15:00", null, { isOptional: true, displayLabel: "Tutorials/Presentations" }),
                makePeriod("optional", "15:00", "18:00", null, { isOptional: true, displayLabel: "Call Duty/Tutorials" }),
            ],
        };
    });
    const buildPhase3 = () => DAYS.map((day) => {
        if (day === "Friday") {
            return {
                day,
                periods: [
                    makePeriod("course", "08:00", "10:00", "COM"), // 8am - 10am: COM
                    makePeriod("empty", "10:00", "12:00"), // 10am - 12pm: Break
                    makePeriod("empty", "12:00", "13:00"), // 12pm - 1pm: Blank
                    makePeriod("course", "13:00", "15:00", "OBG"), // 1pm - 3pm: OBG
                ],
            };
        }
        // Mon-Thurs: Morning meetings instead of lectures
        return {
            day,
            periods: [
                makePeriod("empty", "08:00", "10:00"), // 8am - 10am: Morning meetings (empty period)
                makePeriod("clinical", "10:00", "13:00"), // 10am - 1pm: CLINICAL
                makePeriod("empty", "13:00", "13:30"), // 1pm - 1:30pm: Break
                makePeriod("course", "13:30", "15:00", "OBG"), // 1:30pm - 3pm: OBG
            ],
        };
    });
    const buildPhase4 = () => DAYS.map((day) => ({
        day,
        periods: [
            makePeriod("empty", "08:00", "10:00"),
            makePeriod("empty", "10:00", "12:00"),
            makePeriod("empty", "12:00", "15:00"),
        ],
    }));
    if (phase === "phase2")
        return buildPhase2();
    if (phase === "phase3")
        return buildPhase3();
    if (phase === "phase4")
        return buildPhase4();
    return buildPhase1();
}
