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
    <div className="h-screen flex flex-col bg-slate-50 font-sans">
      <DashboardHeader title="Model Checkpoint Registry" />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
          
          <div>
            <div className="soft-badge mb-2">CHECKPOINT REGISTRY</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Model Checkpoint Registry
            </h1>
            <p className="font-sans text-xs text-slate-500 mt-1">
              Upload open-weight Safetensors / PyTorch files or import HuggingFace model identifiers.
            </p>
          </div>

          <div
            className={`soft-card p-12 text-center cursor-pointer transition-all ${dragOver ? "bg-indigo-50/50 border-indigo-300" : "bg-white"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
            onClick={handleUpload}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="font-sans font-bold text-sm text-slate-900">Parsing Safetensors & Validating GPU Specs...</div>
                <div className="w-64 mx-auto h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full bg-indigo-600 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="font-mono text-xs font-semibold text-indigo-600">{progress}%</div>
              </div>
            ) : (
              <>
                <Upload size={36} className="text-indigo-600 mx-auto mb-3" />
                <div className="font-sans font-bold text-sm text-slate-900 mb-1">Drop Safetensors file here or click to browse</div>
                <div className="font-sans text-xs text-slate-500">Supports .safetensors · .bin · HuggingFace repo identifiers</div>
              </>
            )}
          </div>

          <div className="soft-card overflow-hidden bg-white">
            <div className="p-4 bg-slate-950 text-white font-sans text-xs font-bold uppercase flex justify-between items-center">
              <span>REGISTERED CHECKPOINTS</span>
              <span>{models.length} MODELS ACTIVE</span>
            </div>

            <div className="divide-y divide-slate-200 font-sans text-xs">
              <div className="grid grid-cols-6 p-3.5 bg-slate-50 font-semibold text-slate-500">
                <div className="col-span-2">MODEL NAME</div>
                <div>ARCHITECTURE</div>
                <div className="text-center">PARAMS</div>
                <div className="text-center">FORMAT</div>
                <div className="text-center">STATUS</div>
              </div>

              {models.map((m) => (
                <div key={m.name} className="grid grid-cols-6 p-4 items-center hover:bg-slate-50">
                  <div className="col-span-2 font-bold text-slate-900">{m.name}</div>
                  <div className="text-slate-600 font-medium">{m.arch}</div>
                  <div className="text-center font-semibold text-slate-900">{m.params}</div>
                  <div className="text-center font-semibold text-slate-500">{m.format}</div>
                  <div className="text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
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
