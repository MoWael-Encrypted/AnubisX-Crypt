import React from 'react';
import { Download, Loader2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface FileResult {
    filename: string;
    status: 'pending' | 'success' | 'error';
    engine?: string;
    time?: number;
    throughput?: number;
    downloadUrl?: string;
    details?: string;
}

interface FileListProps {
    files: File[];
    results: FileResult[];
    loading: boolean;
}

const FileList: React.FC<FileListProps> = ({ files, results, loading }) => {
    if (files.length === 0) return null;

    return (
        <div className="w-full space-y-3">
            <h3 className="text-zinc-400 text-sm font-mono uppercase tracking-wider mb-2">Operation Queue</h3>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg overflow-hidden backdrop-blur-sm">
                {files.map((file, idx) => {
                    // Find result if it exists
                    const result = results.find(r => r.filename === file.name);
                    const isDone = !!result;
                    const isError = result?.status === 'error';

                    return (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-3 border-b border-zinc-800/50 last:border-0 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-zinc-500" />
                                <div>
                                    <div className="text-sm font-medium text-zinc-200">{file.name}</div>
                                    <div className="text-xs text-zinc-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Status Indicator */}
                                {!isDone && loading && (
                                    <div className="flex items-center text-yellow-500 text-xs font-mono">
                                        <Loader2 className="w-3 h-3 mr-2 animate-spin" /> PROCESSING
                                    </div>
                                )}
                                {!isDone && !loading && !result && ( // Pending/Ready state
                                    <span className="text-zinc-600 text-xs font-mono">READY</span>
                                )}

                                {isDone && !isError && (
                                    <div className="text-right">
                                        <div className="flex items-center text-green-500 text-xs font-mono font-bold mb-0.5">
                                            <CheckCircle className="w-3 h-3 mr-1" /> COMPLETED ({result.engine})
                                        </div>
                                        <div className="text-[10px] text-zinc-400 font-mono">
                                            {result.time?.toFixed(3)}s | {result.throughput?.toFixed(1)} MB/s
                                        </div>
                                    </div>
                                )}

                                {isError && (
                                    <div className="flex items-center text-red-500 text-xs font-mono font-bold">
                                        <XCircle className="w-3 h-3 mr-2" /> ERROR
                                    </div>
                                )}

                                {/* Actions */}
                                {isDone && !isError && result.downloadUrl && (
                                    <Button asChild size="sm" variant="outline" className="h-8 bg-zinc-800 border-zinc-700 hover:bg-green-600 hover:text-white hover:border-green-500 text-zinc-300">
                                        <a href={result.downloadUrl} download>
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FileList;
