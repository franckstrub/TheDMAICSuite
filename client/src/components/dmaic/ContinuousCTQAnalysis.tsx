import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Table2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContinuousCTQAnalysisProps {
  projectId: number;
  ctqId: number;
  onSave?: (data: string) => void;
}

export default function ContinuousCTQAnalysis({ projectId, ctqId, onSave }: ContinuousCTQAnalysisProps) {
  return (
    <div className="w-full mt-4">
        <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="h-5 w-5" />
          Continuous CTQ Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Continuous CTQ Analysis
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Root Cause</th>
                <th className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th className="px-0 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            //onClick={addCharacteristic}
            className="flex items-center space-x-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Root Cause</span>
          </Button>
          
          <Button
            //onClick={handleSave}
            //disabled={saveMutation.isPending}
          >
            {/*{saveMutation.isPending ? "Saving..." : "Save Root Causes Prioritization table"}*/}
          </Button>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>• Root Causes must be defined by User from Fishbone diagram</p>
        </div>

        {/* CTQ Deletion Confirmation Dialog */}
        <AlertDialog 
        /*open={deletingCtqIndex !== null} onOpenChange={() => setDeletingCtqIndex(null)}*/
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Delete CTQ - Data Loss Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  {/*You are about to delete the Root Cause "{deletingRootIndex !== null ? RootCause[deletingCtqIndex]?.ctq : ''}" */}
                  and all its associated data.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="font-medium text-red-800 mb-2">This action will permanently delete:</p>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• All ......... for this CTQ</li>
                    
                  </ul>
                </div>
                <p className="font-medium">
                  This action cannot be undone. Are you sure you want to continue?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {/*<AlertDialogCancel
              onClick={handleCancelDelete}>
                Cancel
              </AlertDialogCancel>
              
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteCTQMutation.isPending}
              >
                {deleteCTQMutation.isPending ? "Deleting..." : "Delete Root Cause & All Data"}
              </AlertDialogAction>
              */}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
    </div>
      
  );
}