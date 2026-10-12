"use client";

import { useState } from "react";

import { JobMarkdown } from "@/components/jobs/job-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  const [tab, setTab] = useState("write");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList variant="line" aria-label="Description editor">
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" className="mt-3">
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          rows={12}
          placeholder="Describe the work, team, and what makes this role useful."
          aria-invalid={invalid}
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-3 min-h-64 rounded-lg border border-border p-4">
        {value.trim() ? <JobMarkdown source={value} /> : <p className="text-sm text-fg-muted">Your formatted description will appear here.</p>}
      </TabsContent>
    </Tabs>
  );
}
