'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploadZoneProps {
  sessionId: string;
}

interface UploadedDocument {
  id: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
}

export function DocumentUploadZone({ sessionId }: DocumentUploadZoneProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const docId = Math.random().toString(36).substr(2, 9);
      
      setDocuments(prev => [...prev, {
        id: docId,
        fileName: file.name,
        status: 'uploading',
        progress: 0
      }]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionId);

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        setDocuments(prev => prev.map(doc => 
          doc.id === docId 
            ? { ...doc, status: 'processing', progress: 50 }
            : doc
        ));

        setTimeout(() => {
          setDocuments(prev => prev.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'completed', progress: 100 }
              : doc
          ));
        }, 3000);

      } catch (error) {
        setDocuments(prev => prev.map(doc => 
          doc.id === docId 
            ? { ...doc, status: 'error', progress: 0 }
            : doc
        ));
      }
    }
  }, [sessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag & drop tax documents here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, Images, and Word documents
              </p>
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Uploaded Documents</h4>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(doc.status)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{doc.fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={doc.progress} className="h-2 flex-1" />
                    <span className="text-xs text-gray-500">
                      {doc.status === 'uploading' && 'Uploading...'}
                      {doc.status === 'processing' && 'Processing...'}
                      {doc.status === 'completed' && 'Complete'}
                      {doc.status === 'error' && 'Error'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
