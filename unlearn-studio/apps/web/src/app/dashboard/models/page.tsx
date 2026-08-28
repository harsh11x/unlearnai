"use client";

import { useState } from "react";
import { DashboardHeader, DashboardSidebar } from "../page";
import { Upload, CheckCircle2, FileCode2, Database, Shield } from "lucide-react";

export default function ModelsPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [models, setModels] = useState([
    { name: "codegen-350M-multi", arch: "CodeGenForCausalLM", params: "304.1M", format: "safetensors", size: "760 MB", hash: "f8d24b7b9e1a" },
    { name: "Llama-2-7b-chat-hf", arch: "LlamaForCausalLM", params: "6.74B", format: "safetensors", size: "13.5 GB", hash: "a91b4c8d0e2f" },
  ]);

  const handleUpload = async () => {
    setUploading(true);
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 40));
      setProgress(i);
    }
    setModels([
      ...models,
      { name: "Mistral-7B-v0.1-custom", arch: "MistralForCausalLM", params: "7.24B", format: "safetensors", size: "14.2 GB", hash: "e3f4a5b6c7d8" }
    ]);
    setUploading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-[#f7f6f2] font-sans">
      <DashboardHeader title="Model Registry & Checkpoint Manager" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          
          <div>
            <div className="brutalist-badge mb-2">STEP 01 // CHECKPOINT REGISTRY</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase font-sans tracking-tight">
              Model Checkpoint Registry
            </h1>
            <p className="font-mono text-xs text-[#52525b] mt-1">
              Upload open-weight Safetensors / PyTorch files or import HuggingFace model identifiers.
            </p>
          </div>

          {/* Upload Box */}
          <div
            className={`brutalist-card p-12 text-center cursor-pointer transition-all ${dragOver ? "bg-[#f7f6f2]" : "bg-white"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
            onClick={handleUpload}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="font-mono font-extrabold text-base uppercase">Parsing Safetensors & Validating GPU Specs...</div>
                <div className="w-64 mx-auto h-3 bg-[#f7f6f2] border-2 border-[#09090b] overflow-hidden">
                  <div className="h-full bg-[#09090b] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="font-mono text-xs font-bold">{progress}%</div>
              </div>
            ) : (
              <>
                <Upload size={40} className="text-[#09090b] mx-auto mb-4" />
                <div className="font-mono font-extrabold text-base uppercase mb-1">Drop Safetensors file here or click to browse</div>
                <div className="font-mono text-xs text-[#52525b]">Supports .safetensors · .bin · HuggingFace repo identifiers</div>
              </>
            )}
          </div>

          {/* Models Table */}
          <div className="brutalist-card overflow-hidden bg-white">
            <div className="p-4 bg-[#09090b] text-white font-mono text-xs font-extrabold uppercase flex justify-between items-center">
              <span>REGISTERED CHECKPOINTS</span>
              <span>{models.length} MODELS ACTIVE</span>
            </div>

            <div className="divide-y-2 divide-[#09090b] font-mono text-xs">
              <div className="grid grid-cols-6 p-3.5 bg-[#f7f6f2] font-extrabold text-[#71717a]">
                <div className="col-span-2">MODEL NAME</div>
                <div>ARCHITECTURE</div>
                <div className="text-center">PARAMS</div>
                <div className="text-center">FORMAT</div>
                <div className="text-center">STATUS</div>
              </div>

              {models.map((m) => (
                <div key={m.name} className="grid grid-cols-6 p-4 items-center hover:bg-[#f7f6f2]">
                  <div className="col-span-2 font-extrabold text-[#09090b]">{m.name}</div>
                  <div className="font-semibold text-[#52525b]">{m.arch}</div>
                  <div className="text-center font-bold text-[#09090b]">{m.params}</div>
                  <div className="text-center font-bold text-[#52525b]">{m.format}</div>
                  <div className="text-center font-extrabold">
                    <span className="bg-[#09090b] text-white px-2 py-0.5 border border-[#09090b]">
                      READY
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
