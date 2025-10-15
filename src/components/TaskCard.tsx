import { useState } from "react";
import { Trash2, Edit2, Check, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

export interface Task {
  id: string;
  title: string;
  category: string;
  color: string;
  deadline?: string;
  completed: boolean;
  points_reward?: number;
  assigned_by?: string;
  assigned_to?: string;
  teacher_comment?: string;
}

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}

export const TaskCard = ({ task, onToggle, onDelete, onEdit }: TaskCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = () => {
    if (editTitle.trim()) {
      onEdit(task.id, editTitle);
      setIsEditing(false);
    }
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;
  const isUrgent = task.deadline && new Date(task.deadline) < new Date(Date.now() + 24 * 60 * 60 * 1000) && !task.completed;

  return (
    <Card 
      className={cn(
        "p-4 transition-all duration-300 hover:shadow-soft border-2 animate-bounce-in",
        task.completed && "opacity-70"
      )}
      style={{ borderColor: task.color }}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task.id)}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleSave} variant="default">
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div>
              <h3 
                className={cn(
                  "font-semibold text-foreground break-words",
                  task.completed && "line-through opacity-60"
                )}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span 
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ 
                    backgroundColor: `${task.color}20`,
                    color: task.color
                  }}
                >
                  {task.category}
                </span>
                {task.deadline && (
                  <span className={cn(
                    "text-xs flex items-center gap-1 px-2 py-1 rounded-full",
                    isOverdue ? "bg-destructive/20 text-destructive" :
                    isUrgent ? "bg-accent/20 text-accent-foreground" :
                    "bg-muted text-muted-foreground"
                  )}>
                    <Clock className="w-3 h-3" />
                    {new Date(task.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            disabled={task.completed}
            className="hover:bg-primary/10"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
