import React from "react";
import { ElectionController } from "@/components/dashboard/ElectionController";

interface ElectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ElectionPage({ params }: ElectionPageProps) {
  const { id } = await params;
  
  return (
    <div className="max-w-6xl mx-auto py-4">
      <ElectionController electionId={id} />
    </div>
  );
}
