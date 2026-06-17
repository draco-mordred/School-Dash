import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sample = [
  { id: "a1", title: "Math Homework 1", due: "2026-06-12", class: "Grade 10" },
  { id: "a2", title: "History Essay", due: "2026-06-15", class: "Grade 11" },
];

const Assignments = () => {
  return (
    <div id="page-lms-assignments" className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <Button onClick={() => alert("Create assignment (not yet implemented)")}>New Assignment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sample.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{s.class}</div>
              <div className="text-sm">Due: {s.due}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Assignments;
