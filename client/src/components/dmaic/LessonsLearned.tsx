import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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

interface LessonsLearnedProps {
  projectId: number;
}

export default function LessonsLearned({ projectId }: LessonsLearnedProps) {
  const { toast } = useToast();
  
   // Lessons Learned state
  const [lessonsLearned, setLessonsLearned] = useState([
    {
      lessonLearned: "Lesson #1: Importance of early stakeholder engagement.",
      comments: "Engaging stakeholders early helped in gathering requirements effectively."
    },
    {
      lessonLearned: "Lesson #2: Thorough testing of solutions before implementation.",
      comments: "Comprehensive testing identified potential issues that were resolved prior to rollout."
    },
  ]);

  // Update lessons learned
  const updateLessonsLearned = (index: number, field: string, value: string) => {
    const newLesson = [...lessonsLearned];
    newLesson[index] = { ...newLesson[index], [field]: value };
    setLessonsLearned(newLesson);
  };

  // Add lessons learned
  const addLessonsLearned = () => {
    if (lessonsLearned[lessonsLearned.length - 1].lessonLearned.trim() !== "") {
      setLessonsLearned([
        ...lessonsLearned,
        {
          lessonLearned: "",
          comments: ""
        }
      ]);
    }
  };

  // Remove standard document
  const removeLessonsLearned = (index: number) => {
    const newLesson = [...lessonsLearned];
    newLesson.splice(index, 1);
    setLessonsLearned(newLesson);
  };

  const handleSaveDocs = () => {
    toast({
      title: "Success",
      description: "Lessons Learned have been saved successfully",
    });
  };

  return (
    <div className="space-y-6">
            {/* Work Instructions and Standardization Documents */}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessonsLearned.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.lessonLearned}
                        onChange={(e) => updateLessonsLearned(index, "lesson", e.target.value)}
                        placeholder={index === lessonsLearned.length - 1 ? "Add new lesson..." : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={doc.comments}
                        onChange={(e) => updateLessonsLearned(index, "comments", e.target.value)}
                        placeholder="Comments"
                      />
                    </TableCell>
                    <TableCell>
                      {index === lessonsLearned.length - 1 && doc.lessonLearned ? (
                        <Button variant="ghost" size="sm" onClick={addLessonsLearned}>
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : index === lessonsLearned.length - 1 ? (
                        <Button variant="ghost" size="sm" disabled className="text-gray-400">
                          <i className="fas fa-plus"></i>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => removeLessonsLearned(index)} className="text-red-500 hover:text-red-700">
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4">
            <Button onClick={handleSaveDocs}>
              Save Lesson Learned
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
