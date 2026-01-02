import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import type { LessonLearned } from "@shared/schema";

interface LessonsLearnedProps {
  projectId: number;
}

interface LocalLesson {
  id?: number;
  lesson: string;
  comments: string;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function LessonsLearned({ projectId }: LessonsLearnedProps) {
  const { toast } = useToast();
  
  const [localLessons, setLocalLessons] = useState<LocalLesson[]>([]);
  
  const { data: lessonsData, isLoading } = useQuery<{ lessons: LessonLearned[] }>({
    queryKey: [`/api/projects/${projectId}/lessons-learned`],
  });

  useEffect(() => {
    if (lessonsData?.lessons) {
      const lessons: LocalLesson[] = lessonsData.lessons.map(l => ({
        id: l.id,
        lesson: l.lesson || "",
        comments: l.comments || "",
        isNew: false,
        isDirty: false,
      }));
      
      if (lessons.length === 0) {
        lessons.push({
          lesson: "",
          comments: "",
          isNew: true,
          isDirty: false,
        });
      }
      
      setLocalLessons(lessons);
    } else if (!isLoading) {
      setLocalLessons([{
        lesson: "",
        comments: "",
        isNew: true,
        isDirty: false,
      }]);
    }
  }, [lessonsData, isLoading]);

  const createMutation = useMutation({
    mutationFn: async (lesson: LocalLesson) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/lessons-learned`, {
        lesson: lesson.lesson,
        comments: lesson.comments,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lessons-learned`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, lesson }: { id: number; lesson: LocalLesson }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}/lessons-learned/${id}`, {
        lesson: lesson.lesson,
        comments: lesson.comments,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lessons-learned`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/lessons-learned/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/lessons-learned`] });
      toast({
        title: "Deleted",
        description: "Lesson learned has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete lesson learned",
        variant: "destructive",
      });
    },
  });

  const updateLocalLesson = (index: number, field: string, value: string) => {
    const newLessons = [...localLessons];
    newLessons[index] = { 
      ...newLessons[index], 
      [field]: value,
      isDirty: true,
    };
    setLocalLessons(newLessons);
  };

  const addNewRow = () => {
    setLocalLessons([
      ...localLessons,
      {
        lesson: "",
        comments: "",
        isNew: true,
        isDirty: false,
      }
    ]);
  };

  const removeLesson = (index: number) => {
    const lesson = localLessons[index];
    
    if (localLessons.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one lesson learned row must remain",
        variant: "destructive",
      });
      return;
    }
    
    if (lesson.id) {
      deleteMutation.mutate(lesson.id);
    } else {
      const newLessons = [...localLessons];
      newLessons.splice(index, 1);
      setLocalLessons(newLessons);
    }
  };

  const handleSaveAll = async () => {
    try {
      let saveCount = 0;
      
      for (let i = 0; i < localLessons.length; i++) {
        const lesson = localLessons[i];
        
        const hasContent = lesson.lesson.trim() || lesson.comments.trim();
        
        if (lesson.isNew && hasContent) {
          await createMutation.mutateAsync(lesson);
          saveCount++;
        } else if (lesson.id && lesson.isDirty) {
          await updateMutation.mutateAsync({ id: lesson.id, lesson });
          saveCount++;
        }
      }
      
      if (saveCount > 0) {
        toast({
          title: "Success",
          description: `Lessons learned have been saved (${saveCount} item${saveCount > 1 ? 's' : ''} updated)`,
        });
      } else {
        toast({
          title: "No Changes",
          description: "No changes to save",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save lessons learned",
        variant: "destructive",
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lessons Learned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading lessons learned...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lessons Learned</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Track lessons learned from the project.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson Learned</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localLessons.map((lesson, index) => (
                  <TableRow key={lesson.id || `new-${index}`}>
                    <TableCell>
                      <Input
                        type="text"
                        value={lesson.lesson}
                        onChange={(e) => updateLocalLesson(index, "lesson", e.target.value)}
                        placeholder="Describe the lesson learned..."
                        data-testid={`input-lesson-learned-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={lesson.comments}
                        onChange={(e) => updateLocalLesson(index, "comments", e.target.value)}
                        placeholder="Additional comments..."
                        data-testid={`input-lesson-comments-${index}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLesson(index)}
                        disabled={localLessons.length === 1 || deleteMutation.isPending}
                        className={localLessons.length === 1 ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:text-red-700"}
                        data-testid={`button-delete-lesson-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              variant="outline" 
              onClick={addNewRow}
              data-testid="button-add-lesson-row"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            <Button 
              onClick={handleSaveAll}
              disabled={isSaving}
              data-testid="button-save-lessons-learned"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Lessons Learned
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
