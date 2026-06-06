import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const materials = [
  { id: "m1", title: "Chapter 1 - Algebra", link: "#" },
  { id: "m2", title: "Lecture Notes - World History", link: "#" },
];

const StudyMaterials = () => {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Study Materials</h1>
        <Button onClick={() => alert("Upload material (not yet implemented)")}>Upload</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle>{m.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <a href={m.link} className="text-sm text-primary">Open</a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudyMaterials;
